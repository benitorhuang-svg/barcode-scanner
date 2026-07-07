/**
 * Paste UI - handles clipboard paste and file drop for image-based
 * barcode scanning. Listens for Ctrl+V / Cmd+V and drag-and-drop.
 */

import { imageScannerService } from '@/composition-root';
import type { IngestScanResultOutput } from '@/application/scanning/use-cases/IngestScanResult';
import type { DomRefs } from './dom-refs';
import { showToast } from './toast';

let isImageScanBusy = false;

/** Initialize all paste/drop event listeners. */
export function initPasteUI(refs: DomRefs): void {
  document.addEventListener('paste', (event) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        event.preventDefault();
        const blob = item.getAsFile();
        if (blob) void handleImageBlob(blob, refs);
        return;
      }
    }
  });

  refs.pasteZone.addEventListener('dragover', (event) => {
    event.preventDefault();
    refs.pasteZone.classList.add('drag-active');
  });

  refs.pasteZone.addEventListener('dragleave', () => {
    refs.pasteZone.classList.remove('drag-active');
  });

  refs.pasteZone.addEventListener('drop', (event) => {
    event.preventDefault();
    refs.pasteZone.classList.remove('drag-active');

    const file = event.dataTransfer?.files[0];
    if (file?.type.startsWith('image/')) {
      void handleImageBlob(file, refs);
      return;
    }

    showToast('請拖放圖片檔案（PNG、JPG 等）');
  });

  refs.pasteZone.addEventListener('click', () => refs.fileInput.click());

  refs.btnClearPaste.addEventListener('click', (event) => {
    event.stopPropagation();
    refs.pastePreview.src = '';
    refs.pastePreviewWrap.style.display = 'none';
    refs.pastePrompt.style.display = 'block';
    refs.fileInput.value = '';
  });

  refs.fileInput.addEventListener('change', () => {
    const file = refs.fileInput.files?.[0];
    if (file) void handleImageBlob(file, refs);
    refs.fileInput.value = '';
  });
}

async function handleImageBlob(blob: Blob, refs: DomRefs): Promise<void> {
  if (isImageScanBusy) {
    showToast('圖片解析中，請稍候');
    return;
  }

  isImageScanBusy = true;
  showPastePreview(blob, refs);

  try {
    const result = await imageScannerService.scanImage(blob, {
      duplicateFilterEnabled: refs.chkDuplicate.checked,
      soundEnabled: refs.chkSound.checked,
    });

    if (result.totalCount === 0) {
      showToast('圖片中未偵測到任何條碼');
      return;
    }

    showToast(createImageScanMessage(result));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showToast(`圖片解析失敗：${message}`);
  } finally {
    isImageScanBusy = false;
  }
}

function showPastePreview(blob: Blob, refs: DomRefs): void {
  const url = URL.createObjectURL(blob);
  refs.pastePreview.src = url;
  refs.pastePrompt.style.display = 'none';
  refs.pastePreviewWrap.style.display = 'block';
  refs.pastePreview.onload = () => URL.revokeObjectURL(url);
  refs.pastePreview.onerror = () => URL.revokeObjectURL(url);
}

function createImageScanMessage(result: IngestScanResultOutput): string {
  if (result.acceptedCount === 0 && result.duplicateCount > 0) {
    return `已略過 ${result.duplicateCount} 筆重複條碼`;
  }

  if (result.duplicateCount > 0) {
    return `偵測到 ${result.totalCount} 筆條碼，新增 ${result.acceptedCount} 筆，略過 ${result.duplicateCount} 筆重複`;
  }

  if (result.acceptedCount > 0) {
    return `已掃描 ${result.acceptedCount} 筆條碼`;
  }

  return '未新增任何條碼';
}
