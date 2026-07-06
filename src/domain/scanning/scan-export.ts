import type { ScanEntry } from './scan-result';

export const CSV_BOM = '\uFEFF';
export const SCAN_CSV_MIME_TYPE = 'text/csv;charset=utf-8;';

const CSV_HEADERS = ['序號', '時間', '格式', '條碼內容'] as const;

function toCsvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export function createScanValuesText(entries: readonly ScanEntry[]): string {
  return entries.map((entry) => entry.value).join('\n');
}

export function createScanCsv(entries: readonly ScanEntry[]): string {
  const header = CSV_HEADERS.map(toCsvCell).join(',');
  const rows = entries
    .map((entry, index) =>
      [entries.length - index, entry.time, entry.format, entry.value]
        .map(toCsvCell)
        .join(','),
    )
    .join('\n');

  return [header, rows].filter(Boolean).join('\n');
}

export function createScanCsvPayload(entries: readonly ScanEntry[]): string {
  return CSV_BOM + createScanCsv(entries);
}

export function scanCsvFilename(date = new Date()): string {
  return `barcode_scan_${date.toISOString().slice(0, 10)}.csv`;
}
