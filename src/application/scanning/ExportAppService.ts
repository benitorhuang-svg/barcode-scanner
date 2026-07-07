import type { ClipboardPort } from './ports/ClipboardPort';
import type { DownloadPort } from './ports/DownloadPort';
import type { ScanRepositoryPort } from './ports/ScanRepositoryPort';
import {
  createScanCsvPayload,
  createScanValuesText,
  scanCsvFilename,
  SCAN_CSV_MIME_TYPE,
  type ScanExportEntry,
} from '@/domain/scanning/scan-export';

export class ExportAppService {
  private scanRepository: ScanRepositoryPort;
  private clipboard: ClipboardPort;
  private download: DownloadPort;

  constructor(
    scanRepository: ScanRepositoryPort,
    clipboard: ClipboardPort,
    download: DownloadPort,
  ) {
    this.scanRepository = scanRepository;
    this.clipboard = clipboard;
    this.download = download;
  }
  
  /** 
   * Copy all scanned values to clipboard, one per line. 
   */
  async copyAllToClipboard(): Promise<{ success: boolean; count: number }> {
    const entries = this.getExportEntries();
    const text = createScanValuesText(entries);
    
    try {
      await this.clipboard.writeText(text);
      return { success: true, count: entries.length };
    } catch {
      return { success: false, count: entries.length };
    }
  }

  /** 
   * Export all scanned results as a UTF-8 BOM CSV file. 
   */
  exportCSV(): void {
    const entries = this.getExportEntries();
    if (entries.length === 0) return;

    this.download.downloadText(
      createScanCsvPayload(entries),
      SCAN_CSV_MIME_TYPE,
      scanCsvFilename(),
    );
  }

  clearAll(): void {
    this.scanRepository.clear();
  }

  private getExportEntries(): ScanExportEntry[] {
    return this.scanRepository.getAll().map(record => ({
      time: record.timestamp.toLocaleTimeString('zh-TW', { hour12: false }),
      format: record.barcode.format,
      value: record.barcode.text,
    }));
  }
}
