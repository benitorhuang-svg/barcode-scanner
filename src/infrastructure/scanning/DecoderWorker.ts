/// <reference lib="webworker" />

import { BarcodeDetector } from 'barcode-detector/pure';
import { compactScanResults } from '@/domain/scanning/scan-result';
import { SUPPORTED_BARCODE_FORMATS } from '@/domain/scanning/supported-barcode-formats';

const detector = new BarcodeDetector({
  formats: [...SUPPORTED_BARCODE_FORMATS],
});

self.addEventListener('message', async (event: MessageEvent) => {
  const bitmap = event.data as ImageBitmap;

  let imageSource: ImageBitmap | OffscreenCanvas = bitmap;

  // Improve detection on low-contrast camera frames before handing them to the detector.
  if (typeof OffscreenCanvas !== 'undefined') {
    try {
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.filter = 'grayscale(100%) contrast(150%)';
        ctx.drawImage(bitmap, 0, 0);
        imageSource = canvas;
      }
    } catch {
      // Fallback to original bitmap if filter is unsupported
      imageSource = bitmap;
    }
  }

  try {
    const barcodes = await detector.detect(imageSource);

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
