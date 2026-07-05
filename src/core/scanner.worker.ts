/// <reference lib="webworker" />
import { BarcodeDetector } from 'barcode-detector/pure';

const SUPPORTED_FORMATS = [
  'code_128',
  'code_39',
  'ean_13',
  'ean_8',
  'upc_a',
  'upc_e',
  'itf',
  'codabar',
  'qr_code',
] as const;

let detector: BarcodeDetector | null = null;

// Initialize detector once
detector = new BarcodeDetector({
  formats: [...SUPPORTED_FORMATS],
});

self.addEventListener('message', async (e: MessageEvent) => {
  const bitmap = e.data as ImageBitmap;

  try {
    if (detector) {
      const barcodes = await detector.detect(bitmap);
      
      if (barcodes.length > 0) {
        const bc = barcodes[0];
        // Send back the first found barcode
        self.postMessage({
          success: true,
          rawValue: bc.rawValue,
          format: bc.format,
        });
      } else {
        self.postMessage({ success: false });
      }
    } else {
      self.postMessage({ success: false });
    }
  } catch (err) {
    self.postMessage({ success: false, error: String(err) });
  } finally {
    // IMPORTANT: Close the ImageBitmap to prevent memory leaks in the worker
    bitmap.close();
  }
});
