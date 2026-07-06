/// <reference lib="webworker" />

import { BarcodeDetector } from 'barcode-detector/pure';
import { compactScanResults } from '../domain/scanning/scan-result';
import { SUPPORTED_BARCODE_FORMATS } from './barcode-formats';

const detector = new BarcodeDetector({
  formats: [...SUPPORTED_BARCODE_FORMATS],
});

self.addEventListener('message', async (event: MessageEvent) => {
  const bitmap = event.data as ImageBitmap;

  try {
    const barcodes = await detector.detect(bitmap);

    const results = compactScanResults(
      barcodes.map((barcode) => ({
        text: barcode.rawValue,
        format: barcode.format,
      })),
    );

    if (results.length > 0) {
      const barcode = results[0];
      self.postMessage({
        success: true,
        rawValue: barcode.text,
        format: barcode.format,
      });
    } else {
      self.postMessage({ success: false });
    }
  } catch (error) {
    self.postMessage({ success: false, error: String(error) });
  } finally {
    bitmap.close();
  }
});
