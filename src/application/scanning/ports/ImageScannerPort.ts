import type { ScanResult } from '@/domain/scanning/scan-result';

export interface ImageScannerPort {
  scanImage(blob: Blob): Promise<ScanResult[]>;
}
