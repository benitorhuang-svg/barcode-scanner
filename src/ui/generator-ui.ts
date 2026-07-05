import type { DomRefs } from './dom-refs';
import { showToast } from './toast';

export function initGeneratorUI(refs: DomRefs): void {
  refs.btnGenerateQR.addEventListener('click', () => generateQR(refs));
  refs.btnDownloadQR.addEventListener('click', () => downloadQR(refs));
}

async function generateQR(refs: DomRefs): Promise<void> {
  const text = refs.qrInput.value.trim();
  if (!text) {
    showToast('⚠️ 請先輸入文字或網址');
    refs.qrInput.focus();
    return;
  }

  try {
    const QRCode = (await import('qrcode')).default;
    await QRCode.toCanvas(refs.qrCanvas, text, {
      width: 200,
      margin: 2,
      color: {
        dark: '#0f172a', // Tailwind slate-900
        light: '#ffffff',
      },
    });

    refs.qrPreviewWrap.style.display = 'flex';
    refs.btnDownloadQR.disabled = false;
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error('QR Code generation failed:', err);
    }
    showToast('❌ 產生失敗，請確認輸入內容');
  }
}

function downloadQR(refs: DomRefs): void {
  const url = refs.qrCanvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = `qrcode_${Date.now()}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
