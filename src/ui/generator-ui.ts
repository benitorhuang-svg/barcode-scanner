import {
  clampMargin,
  isQrFormat,
  normalizeGeneratorConfig,
  type BarcodeFormat,
  type DownloadFormat,
  type ErrorCorrectionLevel,
  type GeneratorConfig,
} from '@/domain/generation/barcode-generation';
import { barcodeGeneratorService } from '@/composition-root';
import type { DomRefs } from './dom-refs';
import { showToast } from './toast';
import { getCheckedRadioValue, getCheckedRadioLabel } from './ui-helpers';

let generateTimer: ReturnType<typeof setTimeout>;
let previewTimer: ReturnType<typeof setTimeout>;
let generateRequestId = 0;
let previewRequestId = 0;
let currentLogoData: HTMLImageElement | null = null;

function readGeneratorConfig(refs: DomRefs): GeneratorConfig {
  return normalizeGeneratorConfig({
    format: (getCheckedRadioValue(refs.formatRadios) ?? 'QR') as BarcodeFormat,
    fgColor: refs.fgColor.value,
    bgColor: refs.bgColor.value,
    margin: parseInt(refs.marginInput.value, 10),
    errorCorrection: (getCheckedRadioValue(refs.errorCorrectionRadios) ?? 'M') as ErrorCorrectionLevel,
    dlFormat: (getCheckedRadioValue(refs.dlFormatRadios) ?? 'png') as DownloadFormat,
    dlSize: parseInt(getCheckedRadioValue(refs.dlSizeRadios) ?? '1', 10) || 1,
  });
}

export function initGeneratorUI(refs: DomRefs): void {
  // Margin Stepper
  const updateMargin = (delta: number) => {
    const val = clampMargin(parseInt(refs.marginInput.value, 10) + delta);
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
    if (isQrFormat(val as BarcodeFormat)) {
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
    if (!file) return;

    void loadLogoFile(file, refs);
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

  // Outer Accordion Toggle Logic
  const outerAccordion = document.getElementById('outerSettingsAccordion') as HTMLDetailsElement;
  const outerSummary = document.getElementById('outerSettingsSummary') as HTMLElement;
  const togglePills = document.querySelectorAll('.outer-settings-toggle .toggle-pill');

  if (outerSummary && outerAccordion) {
    outerSummary.addEventListener('click', (e) => {
      e.preventDefault(); // Prevent default details toggle
      
      const target = e.target as HTMLElement;
      const val = target.getAttribute('data-val');

      if (val === 'default') {
        outerAccordion.open = false;
      } else if (val === 'detail') {
        outerAccordion.open = true;
      } else {
        // Clicked somewhere else on the summary
        outerAccordion.open = !outerAccordion.open;
      }

      // Update pills
      togglePills.forEach(pill => {
        if (pill.getAttribute('data-val') === (outerAccordion.open ? 'detail' : 'default')) {
          pill.classList.add('active');
        } else {
          pill.classList.remove('active');
        }
      });
    });
  }

  // Initialize all summaries and UI state
  triggerGenerate(refs);
}

async function loadLogoFile(file: File, refs: DomRefs): Promise<void> {
  try {
    const { image, dataUrl } = await barcodeGeneratorService.loadLogoFile(file);
    currentLogoData = image;
    refs.logoPreviewImg.src = dataUrl;
    refs.logoUploadPrompt.style.display = 'none';
    refs.logoPreviewWrap.style.display = 'flex';
    refs.logoInput.style.display = 'none';

    forceHighErrorCorrection(refs);
    triggerGenerate(refs);
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error('Logo image loading failed:', err);
    }

    refs.logoInput.value = '';
    showToast('Logo 圖片讀取失敗');
  }
}

function forceHighErrorCorrection(refs: DomRefs): void {
  const radioH = Array.from(refs.errorCorrectionRadios).find(
    radio => radio.value === 'H',
  );
  if (!radioH) return;

  radioH.checked = true;
  refs.errorCorrectionRadios.forEach(radio =>
    radio.parentElement?.classList.remove('active'),
  );
  radioH.parentElement?.classList.add('active');
}

function triggerGenerate(refs: DomRefs): void {
  // Update summaries
  const formatLabel = getCheckedRadioLabel(refs.formatRadios, 'QR Code');
  refs.summaryFormat.textContent = formatLabel;

  // Build appearance summary using DOM API (avoids innerHTML XSS risk)
  updateAppearanceSummary(refs);
  scheduleAppearancePreview(refs);

  // Create independent badges for QR settings
  const errLabel = getCheckedRadioLabel(refs.errorCorrectionRadios, 'M (15%)');
  const logoStr = currentLogoData ? '有 Logo' : '無 Logo';
  renderSummaryBadges(refs.summaryQR, [errLabel, logoStr]);

  // Create independent badges for Download settings
  const dlFormat = getCheckedRadioLabel(refs.dlFormatRadios, 'PNG');
  const dlSize = getCheckedRadioLabel(refs.dlSizeRadios, '原尺寸');
  renderSummaryBadges(refs.summaryDownload, [dlFormat, dlSize]);

  // Update outer summary
  refs.summaryOuter.textContent = formatLabel;

  const requestId = ++generateRequestId;
  clearTimeout(generateTimer);
  generateTimer = setTimeout(() => {
    void generateBarcode(refs, requestId);
  }, 300);
}

function scheduleAppearancePreview(refs: DomRefs): void {
  const requestId = ++previewRequestId;
  clearTimeout(previewTimer);
  previewTimer = setTimeout(() => {
    void updateAppearancePreview(refs, requestId);
  }, 120);
}

function renderSummaryBadges(container: HTMLElement, labels: string[]): void {
  container.innerHTML = '';
  labels.forEach(label => {
    const span = document.createElement('span');
    span.className = 'summary-val';
    span.textContent = label;
    container.appendChild(span);
  });
}

/** Build the appearance summary using safe DOM APIs instead of innerHTML. */
function updateAppearanceSummary(refs: DomRefs): void {
  const fgColor = refs.fgColor.value;
  const bgColor = refs.bgColor.value;
  const marginVal = refs.marginInput.value;

  refs.summaryAppearance.innerHTML = '';

  // Badge 1: fgColor
  const fgBadge = document.createElement('span');
  fgBadge.className = 'summary-val';
  const fgDot = document.createElement('span');
  fgDot.style.cssText = `display:inline-block; width:10px; height:10px; border-radius:50%; background:${fgColor}; border:1px solid rgba(255,255,255,0.3); margin-right:6px;`;
  fgBadge.appendChild(fgDot);
  fgBadge.appendChild(document.createTextNode(fgColor));

  // Badge 2: bgColor
  const bgBadge = document.createElement('span');
  bgBadge.className = 'summary-val';
  const bgDot = document.createElement('span');
  bgDot.style.cssText = `display:inline-block; width:10px; height:10px; border-radius:50%; background:${bgColor}; border:1px solid rgba(255,255,255,0.3); margin-right:6px;`;
  bgBadge.appendChild(bgDot);
  bgBadge.appendChild(document.createTextNode(bgColor));

  // Badge 3: Margin
  const marginBadge = document.createElement('span');
  marginBadge.className = 'summary-val';
  marginBadge.textContent = `邊距: ${marginVal}`;

  refs.summaryAppearance.append(fgBadge, bgBadge, marginBadge);
}

async function updateAppearancePreview(
  refs: DomRefs,
  requestId: number,
): Promise<void> {
  const config = readGeneratorConfig(refs);
  try {
    await barcodeGeneratorService.renderAppearancePreview(
      refs.appearancePreviewCanvas,
      config,
      () => requestId === previewRequestId,
    );
  } catch {
    // Ignore preview errors (e.g. if code128 string contains unsupported chars, though 'PREVIEW' is supported)
  }
}

async function generateBarcode(
  refs: DomRefs,
  requestId: number,
): Promise<void> {
  const text = refs.qrInput.value.trim();
  if (requestId !== generateRequestId) return;

  if (!text) {
    refs.qrPreviewWrap.style.display = 'none';
    refs.qrEmptyState.style.display = 'flex';
    refs.downloadSection.style.display = 'none';
    return;
  }

  const config = readGeneratorConfig(refs);

  try {
    const rendered = await barcodeGeneratorService.renderBarcodeOutput(
      refs.qrCanvas,
      text,
      config,
      currentLogoData,
      () => requestId === generateRequestId,
    );
    if (!rendered || requestId !== generateRequestId) return;

    refs.qrPreviewWrap.style.display = 'flex';
    refs.qrEmptyState.style.display = 'none';
    refs.downloadSection.style.display = 'block';
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error('Barcode generation failed:', err);
    }
    if (requestId !== generateRequestId) return;

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

  await barcodeGeneratorService.downloadBarcode(refs.qrCanvas, text, config);
}
