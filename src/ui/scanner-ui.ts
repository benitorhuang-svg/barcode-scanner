/**
 * Scanner UI — manages UI events for the scanner tab.
 * Delegates actual camera and decoding logic to WebcamScannerAppService.
 */

import { webcamScannerService } from '@/composition-root';
import type { DomRefs } from './dom-refs';
import { showToast } from './toast';

let isStarting = false;

export async function startScanner(refs: DomRefs): Promise<void> {
  if (webcamScannerService.state$.value.isActive || isStarting) return;

  isStarting = true;

  try {
    refs.btnStart.disabled = true;

    // The service handles getUserMedia, stream mapping, and RxJS pipeline internally
    await webcamScannerService.start(refs.video);
    
    // Check if the service started successfully
    if (!webcamScannerService.state$.value.isActive) {
      handleCameraError(webcamScannerService.state$.value.error);
      stopScanner(refs);
      return;
    }

    refs.video.style.display = 'block';
    refs.videoPlaceholder.style.display = 'none';
    refs.scanOverlay.style.display = 'flex';
    refs.btnStop.disabled = false;

    // Sync settings initially
    webcamScannerService.setDuplicateFilter(refs.chkDuplicate.checked);
    webcamScannerService.setSoundEnabled(refs.chkSound.checked);

    // Hardware Controls Init
    const capabilities = webcamScannerService.getCapabilities();
    if (capabilities) {
      if ('torch' in capabilities) {
        refs.btnTorchContainer.style.display = 'inline-flex';
        // Remove old listener to avoid duplicates if started multiple times
        const clone = refs.chkTorch.cloneNode(true);
        refs.chkTorch.parentNode?.replaceChild(clone, refs.chkTorch);
        refs.chkTorch = clone as HTMLInputElement;
        refs.chkTorch.checked = false;
        
        refs.chkTorch.addEventListener('change', () => {
          void webcamScannerService.toggleTorch().then(enabled => {
            refs.chkTorch.checked = enabled;
          });
        });
      } else {
        refs.btnTorchContainer.style.display = 'none';
      }

      if ('zoom' in capabilities) {
        const zoomCap = (capabilities as Record<string, unknown>).zoom as { min?: number, max?: number, step?: number } | undefined;
        if (zoomCap && typeof zoomCap.min === 'number' && typeof zoomCap.max === 'number') {
          refs.zoomContainer.style.display = 'inline-flex';
          refs.zoomSlider.min = zoomCap.min.toString();
          refs.zoomSlider.max = zoomCap.max.toString();
          refs.zoomSlider.step = zoomCap.step?.toString() ?? '0.1';
          refs.zoomSlider.value = zoomCap.min.toString();

          const clone = refs.zoomSlider.cloneNode(true);
          refs.zoomSlider.parentNode?.replaceChild(clone, refs.zoomSlider);
          refs.zoomSlider = clone as HTMLInputElement;

          refs.zoomSlider.addEventListener('input', (e) => {
            const val = parseFloat((e.target as HTMLInputElement).value);
            void webcamScannerService.setZoom(val);
          });
        }
      } else {
        refs.zoomContainer.style.display = 'none';
      }
    }

  } catch (err) {
    stopScanner(refs);
    handleCameraError(err);
  } finally {
    isStarting = false;
  }
}

export function stopScanner(refs: DomRefs): void {
  webcamScannerService.stop();

  refs.video.pause();
  refs.video.srcObject = null;
  refs.video.style.display = 'none';
  refs.videoPlaceholder.style.display = 'flex';
  refs.scanOverlay.style.display = 'none';
  refs.btnStart.disabled = false;
  refs.btnStop.disabled = true;
  refs.btnTorchContainer.style.display = 'none';
  refs.zoomContainer.style.display = 'none';
}

/* ---- Internal ---- */

function handleCameraError(err: unknown): void {
  const errorMsg = typeof err === 'string' ? err : (err as Error)?.message ?? 'Unknown error';
  
  if (errorMsg.includes('Permission denied')) {
    showToast('❌ 攝影機權限被拒絕，請在瀏覽器設定中允許');
  } else if (errorMsg.includes('NotFoundError') || errorMsg.includes('Requested device not found')) {
    showToast('❌ 找不到攝影機裝置');
  } else {
    showToast(`❌ 無法開啟攝影機：${errorMsg}`);
  }
}
