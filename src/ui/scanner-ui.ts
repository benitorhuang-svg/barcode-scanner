/**
 * Scanner UI — manages webcam lifecycle, scan overlay,
 * and coordinates between ScannerEngine and UI state.
 */

import { ScannerEngine, type ScanResult } from '../core/scanner-engine';
import { playBeep } from '../core/audio';
import { isScanTextFragment } from '../core/scan-result-filter';
import { scanStore } from '../state/scan-store';
import type { DomRefs } from './dom-refs';
import { showToast } from './toast';
import { updateLastScanBanner } from './ui-helpers';

const DEBOUNCE_MS = 2000;
const DUPLICATE_COOLDOWN_MS = 5000;
const STABLE_SCAN_WINDOW_MS = 1200;
const STABLE_SCAN_REQUIRED_HITS = 2;

let stream: MediaStream | null = null;
let engine: ScannerEngine | null = null;
let lastScanText = '';
let lastScanTime = 0;
let pendingScanText = '';
let pendingScanFormat = '';
let pendingScanHits = 0;
let pendingScanLastSeen = 0;
let isStarting = false;
let shouldRun = false;

export async function startScanner(refs: DomRefs): Promise<void> {
  if (engine?.isActive() || isStarting) return;

  isStarting = true;
  shouldRun = true;

  try {
    refs.btnStart.disabled = true;

    const newStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });

    // Check if stopScanner was called while waiting for permission
    if (!shouldRun) {
      newStream.getTracks().forEach((t) => t.stop());
      refs.btnStart.disabled = false;
      return;
    }

    stream = newStream;
    refs.video.srcObject = stream;
    refs.video.style.display = 'block';
    refs.videoPlaceholder.style.display = 'none';
    refs.scanOverlay.style.display = 'flex';

    await refs.video.play();

    refs.btnStop.disabled = false;

    engine = new ScannerEngine(refs.video, (result) =>
      handleScanResult(result, refs),
    );
    await engine.start();
  } catch (err) {
    stopScanner(refs);
    handleCameraError(err);
  } finally {
    isStarting = false;
  }
}

export function stopScanner(refs: DomRefs): void {
  shouldRun = false;
  resetPendingScan();
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
}

/* ---- Internal ---- */

function handleScanResult(result: ScanResult, refs: DomRefs): void {
  const now = Date.now();
  const stableResult = getStableScanResult(result, now);
  if (!stableResult) return;

  const { text, format } = stableResult;

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
  updateLastScanBanner(refs, text, format);
}

function getStableScanResult(
  result: ScanResult,
  now: number,
): ScanResult | null {
  const text = result.text.trim();
  if (!text) return null;

  const isExpired = now - pendingScanLastSeen > STABLE_SCAN_WINDOW_MS;

  if (!pendingScanText || isExpired) {
    setPendingScan(result.format, text, now);
    return null;
  }

  if (text === pendingScanText) {
    pendingScanHits += 1;
    pendingScanLastSeen = now;

    if (pendingScanHits < STABLE_SCAN_REQUIRED_HITS) return null;

    return {
      text: pendingScanText,
      format: pendingScanFormat,
    };
  }

  if (isScanTextFragment(pendingScanText, text)) {
    setPendingScan(result.format, text, now);
    return null;
  }

  if (isScanTextFragment(text, pendingScanText)) {
    pendingScanLastSeen = now;
    return null;
  }

  setPendingScan(result.format, text, now);
  return null;
}

function setPendingScan(format: string, text: string, now: number): void {
  pendingScanText = text;
  pendingScanFormat = format;
  pendingScanHits = 1;
  pendingScanLastSeen = now;
}

function resetPendingScan(): void {
  pendingScanText = '';
  pendingScanFormat = '';
  pendingScanHits = 0;
  pendingScanLastSeen = 0;
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
