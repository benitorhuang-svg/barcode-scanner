/**
 * Export utilities — CSV export and clipboard copy.
 */

import {
  clearScanEntries,
  createScanCopyPayload,
  createScanCsvDownload,
} from '../application/scanning/scan-export-service';
import { downloadTextFile } from '../infrastructure/browser/download-file';
import { showToast } from './toast';

/** Copy all scanned values to clipboard, one per line. */
export function copyAll(): void {
  const payload = createScanCopyPayload();

  navigator.clipboard
    .writeText(payload.text)
    .then(() => showToast(`📋 已複製 ${payload.count} 筆條碼到剪貼簿`))
    .catch(() => showToast('❌ 複製失敗，請手動選取'));
}

/** Export all scanned results as a UTF-8 BOM CSV file. */
export function exportCSV(): void {
  const { content, mimeType, filename } = createScanCsvDownload();
  downloadTextFile(content, mimeType, filename);
  showToast('📥 已匯出 CSV 檔案');
}

/** Clear all scan results after user confirmation. */
export function clearAll(): void {
  if (!confirm('確定要清除所有掃描紀錄嗎？')) return;
  clearScanEntries();
  showToast('🗑️ 已清除所有紀錄');
}
