import type { ImageScannerPort } from '@/application/scanning/ports/ImageScannerPort';
import type { ScanResult } from '@/domain/scanning/scan-result';
import { scanImageBlob } from './static-image-scanner';

export class ImageScannerAdapter implements ImageScannerPort {
  scanImage(blob: Blob): Promise<ScanResult[]> {
    return scanImageBlob(blob);
  }
}
