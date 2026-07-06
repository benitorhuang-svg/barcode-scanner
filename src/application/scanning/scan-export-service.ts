import {
  createScanCsvPayload,
  createScanValuesText,
  scanCsvFilename,
  SCAN_CSV_MIME_TYPE,
} from '../../domain/scanning/scan-export';
import { scanStore } from './scan-store';

export interface ScanCopyPayload {
  text: string;
  count: number;
}

export interface ScanCsvDownload {
  content: string;
  mimeType: string;
  filename: string;
}

export function createScanCopyPayload(): ScanCopyPayload {
  const entries = scanStore.getAll();
  return {
    text: createScanValuesText(entries),
    count: entries.length,
  };
}

export function createScanCsvDownload(): ScanCsvDownload {
  const entries = scanStore.getAll();
  return {
    content: createScanCsvPayload(entries),
    mimeType: SCAN_CSV_MIME_TYPE,
    filename: scanCsvFilename(),
  };
}

export function clearScanEntries(): void {
  scanStore.clear();
}
