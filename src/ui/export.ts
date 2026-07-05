/**
 * Export utilities — CSV export and clipboard copy.
 */

import { scanStore } from '../state/scan-store';
import { showToast } from './toast';

function toCsvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

/** Copy all scanned values to clipboard, one per line. */
export function copyAll(): void {
  const entries = scanStore.getAll();
  const text = entries.map((e) => e.value).join('\n');

  navigator.clipboard
    .writeText(text)
    .then(() => showToast(`📋 已複製 ${entries.length} 筆條碼到剪貼簿`))
    .catch(() => showToast('❌ 複製失敗，請手動選取'));
}

/** Export all scanned results as a UTF-8 BOM CSV file. */
export function exportCSV(): void {
  const entries = scanStore.getAll();
  const BOM = '\uFEFF';
  const header = ['序號', '時間', '格式', '條碼內容']
    .map(toCsvCell)
    .join(',');
  const rows = entries
    .map((e, i) =>
      [entries.length - i, e.time, e.format, e.value]
        .map(toCsvCell)
        .join(','),
    )
    .join('\n');
  const csv = [header, rows].filter(Boolean).join('\n');

  const blob = new Blob([BOM + csv], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `barcode_scan_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();

  // Defer revocation to ensure the download has started
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  showToast('📥 已匯出 CSV 檔案');
}

/** Clear all scan results after user confirmation. */
export function clearAll(): void {
  if (!confirm('確定要清除所有掃描紀錄嗎？')) return;
  scanStore.clear();
  showToast('🗑️ 已清除所有紀錄');
}
