/**
 * Paste UI — handles clipboard paste and file drop for image-based
 * barcode scanning. Listens for Ctrl+V / Cmd+V and drag-and-drop.
 */

import { ingestScanResults } from '../application/scanning/scan-ingestion-service';
import { playBeep } from '../core/audio';
import type { DomRefs } from './dom-refs';
import { showToast } from './toast';
import { updateLastScanBanner } from './ui-helpers';

let isImageScanBusy = false;
let imageScannerPromise: Promise<typeof import('../core/image-scanner')> | null =
  null;

function getImageScanner(): Promise<typeof import('../core/image-scanner')> {
  imageScannerPromise ??= import('../core/image-scanner').catch((error) => {
    imageScannerPromise = null;
    throw error;
  });
  return imageScannerPromise;
}

/** Initialize all paste/drop event listeners. */
export function initPasteUI(refs: DomRefs): void {
  // Global paste (Ctrl+V)
  document.addEventListener('paste', (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const blob = item.getAsFile();
        if (blob) handleImageBlob(blob, refs);
        return;
      }
    }
  });

  // Drag & drop
  refs.pasteZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    refs.pasteZone.classList.add('drag-active');
  });

  refs.pasteZone.addEventListener('dragleave', () => {
    refs.pasteZone.classList.remove('drag-active');
  });

  refs.pasteZone.addEventListener('drop', (e) => {
    e.preventDefault();
    refs.pasteZone.classList.remove('drag-active');

    const file = e.dataTransfer?.files[0];
    if (file?.type.startsWith('image/')) {
      handleImageBlob(file, refs);
    } else {
      showToast('⚠️ 請拖放圖片檔案（PNG、JPG 等）');
    }
  });

  // Click to select file
  refs.pasteZone.addEventListener('click', () => refs.fileInput.click());

  // Clear photo button
  refs.btnClearPaste.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent opening file dialog
    refs.pastePreview.src = '';
    refs.pastePreviewWrap.style.display = 'none';
    refs.pastePrompt.style.display = 'block';
    refs.fileInput.value = '';
  });

  refs.fileInput.addEventListener('change', () => {
    const file = refs.fileInput.files?.[0];
    if (file) handleImageBlob(file, refs);
    refs.fileInput.value = '';
  });
}

/* ---- Internal ---- */

async function handleImageBlob(blob: Blob, refs: DomRefs): Promise<void> {
  if (isImageScanBusy) {
    showToast('圖片解析中，請稍候');
    return;
  }

  isImageScanBusy = true;

  // Show preview
  const url = URL.createObjectURL(blob);
  refs.pastePreview.src = url;
  refs.pastePrompt.style.display = 'none';
  refs.pastePreviewWrap.style.display = 'block';
  refs.pastePreview.onload = () => URL.revokeObjectURL(url);
  refs.pastePreview.onerror = () => URL.revokeObjectURL(url);

  try {
    const { scanImageBlob } = await getImageScanner();
    const results = await scanImageBlob(blob);

    if (results.length === 0) {
      showToast('⚠️ 圖片中未偵測到任何條碼');
      return;
    }

    const ingestResult = ingestScanResults(results, {
      filterDuplicates: refs.chkDuplicate.checked,
    });

    if (refs.chkSound.checked) playBeep();

    // Update last-scan banner with first result
    if (ingestResult.firstResult) {
      updateLastScanBanner(
        refs,
        ingestResult.firstResult.text,
        ingestResult.firstResult.format,
      );
    }

    const msg =
      ingestResult.duplicateCount > 0
        ? `✅ 偵測到 ${results.length} 組條碼（${ingestResult.duplicateCount} 組重複已過濾）`
        : `✅ 成功掃描 ${ingestResult.addedCount} 組條碼`;
    showToast(msg);
  } catch (err) {
    const error = err as Error;
    showToast(`❌ ${error.message}`);
  } finally {
    isImageScanBusy = false;
  }
}
