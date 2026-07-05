/**
 * Paste UI — handles clipboard paste and file drop for image-based
 * barcode scanning. Listens for Ctrl+V / Cmd+V and drag-and-drop.
 */

import { scanImageBlob } from '../core/image-scanner';
import { playBeep } from '../core/audio';
import { scanStore } from '../state/scan-store';
import type { DomRefs } from './dom-refs';
import { showToast } from './toast';

/** Initialize all paste/drop event listeners. */
export function initPasteUI(refs: DomRefs): void {
  const dropZone = document.getElementById('pasteZone');
  const fileInput = document.getElementById('fileInput') as HTMLInputElement | null;
  const previewImg = document.getElementById('pastePreview') as HTMLImageElement | null;

  // Global paste (Ctrl+V)
  document.addEventListener('paste', (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const blob = item.getAsFile();
        if (blob) handleImageBlob(blob, refs, previewImg);
        return;
      }
    }
  });

  if (!dropZone) return;

  // Drag & drop
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-active');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-active');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-active');

    const file = e.dataTransfer?.files[0];
    if (file?.type.startsWith('image/')) {
      handleImageBlob(file, refs, previewImg);
    } else {
      showToast('⚠️ 請拖放圖片檔案（PNG、JPG 等）');
    }
  });

  // Click to select file
  dropZone.addEventListener('click', () => fileInput?.click());

  fileInput?.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) handleImageBlob(file, refs, previewImg);
    fileInput.value = '';
  });
}

/* ---- Internal ---- */

async function handleImageBlob(
  blob: Blob,
  refs: DomRefs,
  previewImg: HTMLImageElement | null,
): Promise<void> {
  // Show preview
  if (previewImg) {
    const url = URL.createObjectURL(blob);
    previewImg.src = url;
    previewImg.style.display = 'block';
    previewImg.onload = () => URL.revokeObjectURL(url);
  }

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
  }
}
