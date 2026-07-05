/**
 * Paste UI — handles clipboard paste and file drop for image-based
 * barcode scanning. Listens for Ctrl+V / Cmd+V and drag-and-drop.
 */

import { scanImageBlob } from '../core/image-scanner';
import { playBeep } from '../core/audio';
import { scanStore } from '../state/scan-store';
import type { DomRefs } from './dom-refs';
import { showToast } from './toast';

let isImageScanBusy = false;

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
  refs.pastePreview.style.display = 'block';
  refs.pastePreview.onload = () => URL.revokeObjectURL(url);
  refs.pastePreview.onerror = () => URL.revokeObjectURL(url);

  try {
    const results = await scanImageBlob(blob);

    if (results.length === 0) {
      showToast('⚠️ 圖片中未偵測到任何條碼');
      return;
    }

    let addedCount = 0;
    for (const r of results) {
      const isDup =
        refs.chkDuplicate.checked && scanStore.hasDuplicate(r.text);
      if (!isDup) {
        scanStore.add(r.format, r.text);
        addedCount++;
      }
    }

    if (refs.chkSound.checked) playBeep();

    // Update last-scan banner with first result
    const first = results[0];
    refs.lastScanValue.textContent = first.text;
    refs.lastScanFormat.textContent = first.format;
    refs.lastScan.style.display = 'block';
    refs.lastScan.style.animation = 'none';
    void refs.lastScan.offsetWidth;
    refs.lastScan.style.animation = '';

    const dupCount = results.length - addedCount;
    const msg =
      dupCount > 0
        ? `✅ 偵測到 ${results.length} 組條碼（${dupCount} 組重複已過濾）`
        : `✅ 成功掃描 ${results.length} 組條碼`;
    showToast(msg);
  } catch (err) {
    const error = err as Error;
    showToast(`❌ ${error.message}`);
  } finally {
    isImageScanBusy = false;
  }
}
