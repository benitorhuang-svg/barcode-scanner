/**
 * Export utilities — CSV export and clipboard copy.
 */

import { exportService } from '@/composition-root';
import { showToast } from './toast';

/** Copy all scanned values to clipboard, one per line. */
export async function copyAll(): Promise<void> {
  const result = await exportService.copyAllToClipboard();
  if (result.success) {
    showToast(`📋 已複製 ${result.count} 筆條碼到剪貼簿`);
  } else {
    showToast('❌ 複製失敗，請手動選取');
  }
}

/** Export all scanned results as a UTF-8 BOM CSV file. */
export function exportCSV(): void {
  exportService.exportCSV();
  showToast('📥 已匯出 CSV 檔案');
}

/** Clear all scan results after user confirmation. */
export function clearAll(): void {
  if (!confirm('確定要清除所有掃描紀錄嗎？')) return;
  exportService.clearAll();
  showToast('🗑️ 已清除所有紀錄');
}
