import type { DomRefs } from './dom-refs';
import { showToast } from './toast';
import { getCheckedRadioValue, getCheckedRadioLabel } from './ui-helpers';

let debounceTimer: ReturnType<typeof setTimeout>;
let currentLogoData: HTMLImageElement | null = null;

/** Cached dynamic import of QRCode module to avoid repeated resolution. */
let qrCodePromise: Promise<typeof import('qrcode')> | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let jsBarcodePromise: Promise<any> | null = null;

function getQRCode(): Promise<typeof import('qrcode')> {
  qrCodePromise ??= import('qrcode');
  return qrCodePromise;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getJsBarcode(): Promise<any> {
  jsBarcodePromise ??= import('jsbarcode').then(m => m.default || m);
  return jsBarcodePromise;
}

/** Read all generator configuration from current DOM state. */
interface GeneratorConfig {
  format: string;
  fgColor: string;
  bgColor: string;
  margin: number;
  errorCorrection: 'L' | 'M' | 'Q' | 'H';
  dlFormat: string;
  dlSize: number;
}

function readGeneratorConfig(refs: DomRefs): GeneratorConfig {
  return {
    format: getCheckedRadioValue(refs.formatRadios) ?? 'QR',
    fgColor: refs.fgColor.value,
    bgColor: refs.bgColor.value,
    margin: parseInt(refs.marginInput.value, 10),
    errorCorrection: (getCheckedRadioValue(refs.errorCorrectionRadios) ?? 'M') as GeneratorConfig['errorCorrection'],
    dlFormat: getCheckedRadioValue(refs.dlFormatRadios) ?? 'png',
    dlSize: parseInt(getCheckedRadioValue(refs.dlSizeRadios) ?? '1', 10) || 1,
  };
}

export function initGeneratorUI(refs: DomRefs): void {
  // Margin Stepper
  const updateMargin = (delta: number) => {
    let val = parseInt(refs.marginInput.value, 10);
    val = Math.max(0, Math.min(10, val + delta));
    refs.marginInput.value = val.toString();
    refs.marginValue.textContent = val.toString();
    triggerGenerate(refs);
  };
  refs.btnMarginDec.addEventListener('click', () => updateMargin(-1));
  refs.btnMarginInc.addEventListener('click', () => updateMargin(1));

  // Generic Toggle Setup
  const setupToggle = (radios: NodeListOf<HTMLInputElement>, onChange?: (val: string) => void) => {
    radios.forEach((radio) => {
      radio.addEventListener('change', (e) => {
        radios.forEach(r => r.parentElement?.classList.remove('active'));
        const target = e.target as HTMLInputElement;
        target.parentElement?.classList.add('active');
        if (onChange) onChange(target.value);
        else triggerGenerate(refs);
      });
    });
  };

  setupToggle(refs.formatRadios, (val) => {
    if (val === 'QR') {
      refs.qrSettings.style.display = 'block';
    } else {
      refs.qrSettings.style.display = 'none';
    }
    triggerGenerate(refs);
  });
  
  setupToggle(refs.errorCorrectionRadios, () => triggerGenerate(refs));
  setupToggle(refs.dlFormatRadios, () => triggerGenerate(refs));
  setupToggle(refs.dlSizeRadios, () => triggerGenerate(refs));

  // Visual feedback for drag and drop
  refs.logoInput.addEventListener('dragover', () => {
    refs.logoUploadZone.classList.add('dragover');
  });

  refs.logoInput.addEventListener('dragleave', () => {
    refs.logoUploadZone.classList.remove('dragover');
  });
  
  refs.logoInput.addEventListener('drop', () => {
    refs.logoUploadZone.classList.remove('dragover');
  });

  // Handle Logo Upload Processing
  refs.logoInput.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          currentLogoData = img;
          refs.logoPreviewImg.src = img.src;
          refs.logoUploadPrompt.style.display = 'none';
          refs.logoPreviewWrap.style.display = 'flex';
          refs.logoInput.style.display = 'none'; // Hide input to allow remove button clicking
          
          // Force error correction to H if logo is uploaded
          const radioH = Array.from(refs.errorCorrectionRadios).find(r => r.value === 'H');
          if (radioH) {
            radioH.checked = true;
            refs.errorCorrectionRadios.forEach(r => r.parentElement?.classList.remove('active'));
            radioH.parentElement?.classList.add('active');
          }
          triggerGenerate(refs);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  });

  // Handle Logo Removal
  refs.btnRemoveLogo.addEventListener('click', (e) => {
    e.stopPropagation();
    currentLogoData = null;
    refs.logoInput.value = '';
    refs.logoPreviewImg.src = '';
    refs.logoPreviewWrap.style.display = 'none';
    refs.logoUploadPrompt.style.display = 'flex';
    refs.logoInput.style.display = 'block'; // Restore input area
    triggerGenerate(refs);
  });

  // Bind all other inputs
  refs.qrInput.addEventListener('input', () => triggerGenerate(refs));
  refs.fgColor.addEventListener('input', () => triggerGenerate(refs));
  refs.bgColor.addEventListener('input', () => triggerGenerate(refs));

  // Download
  refs.btnDownloadQR.addEventListener('click', () => downloadBarcode(refs));

  // Initialize appearance summaries and dummy preview
  updateAppearanceSummary(refs);
  updateAppearancePreview(refs);
}

function triggerGenerate(refs: DomRefs): void {
  // Update summaries
  refs.summaryFormat.textContent = getCheckedRadioLabel(refs.formatRadios, 'QR Code');

  // Build appearance summary using DOM API (avoids innerHTML XSS risk)
  updateAppearanceSummary(refs);
  updateAppearancePreview(refs);

  const errLabel = getCheckedRadioLabel(refs.errorCorrectionRadios, 'M (15%)');
  const logoStr = currentLogoData ? '有 Logo' : '無 Logo';
  refs.summaryQR.textContent = `${errLabel}, ${logoStr}`;

  refs.summaryDownload.textContent = `${getCheckedRadioLabel(refs.dlFormatRadios, 'PNG')}, ${getCheckedRadioLabel(refs.dlSizeRadios, '原尺寸')}`;

  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    generateBarcode(refs);
  }, 300);
}

/** Build the appearance summary using safe DOM APIs instead of innerHTML. */
function updateAppearanceSummary(refs: DomRefs): void {
  const fgColor = refs.fgColor.value;
  const bgColor = refs.bgColor.value;
  const marginVal = refs.marginInput.value;

  const container = document.createElement('span');
  container.style.cssText = 'display:inline-flex; align-items:center; gap:4px;';

  const fgDot = document.createElement('span');
  fgDot.style.cssText = `display:inline-block; width:12px; height:12px; border-radius:50%; background:${fgColor}; border:1px solid rgba(255,255,255,0.3);`;

  const bgDot = document.createElement('span');
  bgDot.style.cssText = `display:inline-block; width:12px; height:12px; border-radius:50%; background:${bgColor}; border:1px solid rgba(255,255,255,0.3); margin-left:4px;`;

  const marginSpan = document.createElement('span');
  marginSpan.style.marginLeft = '4px';
  marginSpan.textContent = `邊距: ${marginVal}`;

  container.append(fgDot, document.createTextNode(`${fgColor}, `), bgDot, document.createTextNode(`${bgColor}, `), marginSpan);

  refs.summaryAppearance.replaceChildren(container);
}

async function updateAppearancePreview(refs: DomRefs): Promise<void> {
  const config = readGeneratorConfig(refs);
  try {
    if (config.format === 'QR') {
      const QRCode = await getQRCode();
      await QRCode.toCanvas(refs.appearancePreviewCanvas, 'PREVIEW', {
        width: 120,
        margin: config.margin,
        color: {
          dark: config.fgColor,
          light: config.bgColor,
        },
      });
    } else {
      const jsBarcode = await getJsBarcode();
      const text = config.format === 'EAN13' ? '123456789012' : (config.format === 'UPC' ? '12345678901' : 'PREVIEW');
      jsBarcode(refs.appearancePreviewCanvas, text, {
        format: config.format,
        lineColor: config.fgColor,
        background: config.bgColor,
        margin: config.margin * 3,
        displayValue: false,
        height: 50,
      });
    }
  } catch {
    // Ignore preview errors (e.g. if code128 string contains unsupported chars, though 'PREVIEW' is supported)
  }
}

async function generateBarcode(refs: DomRefs): Promise<void> {
  const text = refs.qrInput.value.trim();
  if (!text) {
    refs.qrPreviewWrap.style.display = 'none';
    refs.qrEmptyState.style.display = 'flex';
    refs.downloadSection.style.display = 'none';
    return;
  }

  const config = readGeneratorConfig(refs);

  try {
    if (config.format === 'QR') {
      const QRCode = await getQRCode();

      await QRCode.toCanvas(refs.qrCanvas, text, {
        width: 250,
        margin: config.margin,
        errorCorrectionLevel: config.errorCorrection,
        color: {
          dark: config.fgColor,
          light: config.bgColor,
        },
      });

      // Draw Logo if exists
      if (currentLogoData) {
        const ctx = refs.qrCanvas.getContext('2d');
        if (ctx) {
          const canvasSize = refs.qrCanvas.width;
          const logoSize = canvasSize * 0.25;
          const x = (canvasSize - logoSize) / 2;
          const y = (canvasSize - logoSize) / 2;
          
          ctx.fillStyle = config.bgColor;
          ctx.fillRect(x - 2, y - 2, logoSize + 4, logoSize + 4);
          ctx.drawImage(currentLogoData, x, y, logoSize, logoSize);
        }
      }
    } else {
      const jsBarcode = await getJsBarcode();
      jsBarcode(refs.qrCanvas, text, {
        format: config.format,
        lineColor: config.fgColor,
        background: config.bgColor,
        margin: config.margin * 5, 
        displayValue: true,
      });
    }

    refs.qrPreviewWrap.style.display = 'flex';
    refs.qrEmptyState.style.display = 'none';
    refs.downloadSection.style.display = 'block';
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error('Barcode generation failed:', err);
    }
    // Show user-friendly error in production
    const error = err as Error;
    showToast(`⚠️ 條碼產生失敗：${error.message ?? '格式不支援此內容'}`);

    refs.qrPreviewWrap.style.display = 'none';
    refs.qrEmptyState.style.display = 'flex';
    refs.downloadSection.style.display = 'none';
  }
}

async function downloadBarcode(refs: DomRefs): Promise<void> {
  const text = refs.qrInput.value.trim();
  const config = readGeneratorConfig(refs);

  if (config.dlFormat === 'svg') {
    let svgContent = '';

    if (config.format === 'QR') {
      const QRCode = await getQRCode();
      svgContent = await QRCode.toString(text, {
        type: 'svg',
        margin: config.margin,
        errorCorrectionLevel: config.errorCorrection,
        color: { dark: config.fgColor, light: config.bgColor }
      });
    } else {
      const jsBarcode = await getJsBarcode();
      const svgNode = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      jsBarcode(svgNode, text, {
        format: config.format,
        lineColor: config.fgColor,
        background: config.bgColor,
        margin: config.margin * 5,
        displayValue: true,
      });
      svgContent = new XMLSerializer().serializeToString(svgNode);
    }

    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, `barcode_${Date.now()}.svg`);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return;
  }

  // PNG or JPEG
  const canvas = refs.qrCanvas;
  const mimeType = config.dlFormat === 'jpeg' ? 'image/jpeg' : 'image/png';
  
  if (config.dlSize === 1) {
    const url = canvas.toDataURL(mimeType);
    triggerDownload(url, `barcode_${Date.now()}.${config.dlFormat}`);
  } else {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width * config.dlSize;
    tempCanvas.height = canvas.height * config.dlSize;
    const ctx = tempCanvas.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = false;
      ctx.scale(config.dlSize, config.dlSize);
      ctx.drawImage(canvas, 0, 0);
      const url = tempCanvas.toDataURL(mimeType);
      triggerDownload(url, `barcode_${Date.now()}.${config.dlFormat}`);
    }
  }
}

function triggerDownload(url: string, filename: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
}
