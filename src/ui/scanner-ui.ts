/**
 * Scanner UI — manages webcam lifecycle, scan overlay,
 * and coordinates between ScannerEngine and UI state.
 */

import { ScannerEngine, type ScanResult } from '../core/scanner-engine';
import { playBeep } from '../core/audio';
import { scanStore } from '../state/scan-store';
import type { DomRefs } from './dom-refs';
import { setStatusActive, setStatusIdle } from './status-ui';
import { showToast } from './toast';

const DEBOUNCE_MS = 2000;
const DUPLICATE_COOLDOWN_MS = 5000;

let stream: MediaStream | null = null;
let engine: ScannerEngine | null = null;
let lastScanText = '';
let lastScanTime = 0;

export async function startScanner(refs: DomRefs): Promise<void> {
  if (engine?.isActive()) return;

  try {
    refs.btnStart.disabled = true;

    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });

    refs.video.srcObject = stream;
    refs.video.style.display = 'block';
    refs.videoPlaceholder.style.display = 'none';
    refs.scanOverlay.style.display = 'flex';

    await refs.video.play();

    refs.btnStop.disabled = false;
    setStatusActive(refs);

    engine = new ScannerEngine(refs.video, (result) =>
      handleScanResult(result, refs),
    );
    await engine.start();
  } catch (err) {
    stopScanner(refs);
    handleCameraError(err);
  }
}

export function stopScanner(refs: DomRefs): void {
  engine?.stop();
  engine = null;

  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }

  refs.video.pause();
  refs.video.srcObject = null;
  refs.video.style.display = 'none';
  refs.videoPlaceholder.style.display = 'flex';
  refs.scanOverlay.style.display = 'none';
  refs.btnStart.disabled = false;
  refs.btnStop.disabled = true;
  setStatusIdle(refs);
}

/* ---- Internal ---- */

function handleScanResult(result: ScanResult, refs: DomRefs): void {
  const { text, format } = result;
  if (!text) return;

  const now = Date.now();

  // Debounce repeated scans of the same barcode
  if (text === lastScanText && now - lastScanTime < DEBOUNCE_MS) return;

  // Duplicate filter
  if (refs.chkDuplicate.checked && scanStore.hasDuplicate(text)) {
    if (text === lastScanText && now - lastScanTime < DUPLICATE_COOLDOWN_MS)
      return;
    lastScanTime = now;
    lastScanText = text;
    showToast(`⚠️ 已過濾重複條碼：${text}`);
    return;
  }

  lastScanTime = now;
  lastScanText = text;

  // Visual flash
  refs.videoContainer.classList.remove('flash');
  void refs.videoContainer.offsetWidth; // force reflow
  refs.videoContainer.classList.add('flash');

  // Audio feedback
  if (refs.chkSound.checked) playBeep();

  // Persist result
  scanStore.add(format, text);

  // Update last-scan banner
  refs.lastScanValue.textContent = text;
  refs.lastScanFormat.textContent = format;
  refs.lastScan.style.display = 'block';
  refs.lastScan.style.animation = 'none';
  void refs.lastScan.offsetWidth;
  refs.lastScan.style.animation = '';
}

function handleCameraError(err: unknown): void {
  const error = err as { name?: string; message?: string };
  if (error.name === 'NotAllowedError') {
    showToast('❌ 攝影機權限被拒絕，請在瀏覽器設定中允許');
  } else if (error.name === 'NotFoundError') {
    showToast('❌ 找不到攝影機裝置');
  } else {
    showToast(`❌ 無法開啟攝影機：${error.message ?? '未知錯誤'}`);
  }
}
