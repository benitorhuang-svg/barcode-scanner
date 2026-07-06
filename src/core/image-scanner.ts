/**
 * Image Scanner — decode barcodes from static images (Blob / File).
 * Uses a canvas-based preprocessing pipeline for better detection
 * of low-resolution or clipboard-pasted images.
 */

import type { BarcodeDetector } from 'barcode-detector/pure';
import {
  compactScanResults,
  type ScanResult,
} from '../domain/scanning/scan-result';
import { SUPPORTED_BARCODE_FORMATS } from './barcode-formats';
import { getFormatName } from './format-map';

const MIN_SCAN_SIZE = 800;
const MAX_SCAN_SIZE = 1800;

let detectorPromise: Promise<BarcodeDetector> | null = null;

function getDetector(): Promise<BarcodeDetector> {
  detectorPromise ??= import('barcode-detector/pure').then(
    ({ BarcodeDetector: Detector }) =>
      new Detector({ formats: [...SUPPORTED_BARCODE_FORMATS] }),
  );
  return detectorPromise;
}

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('圖片載入失敗'));
    };
    img.src = URL.createObjectURL(blob);
  });
}

async function loadImageSource(
  blob: Blob,
): Promise<{ source: HTMLImageElement | ImageBitmap; cleanup: () => void }> {
  if ('createImageBitmap' in window) {
    const bitmap = await createImageBitmap(blob);
    return { source: bitmap, cleanup: () => bitmap.close() };
  }

  return { source: await loadImage(blob), cleanup: () => undefined };
}

function renderToCanvas(
  source: HTMLImageElement | ImageBitmap,
): HTMLCanvasElement {
  const largestSide = Math.max(source.width, source.height);
  const scale =
    largestSide < MIN_SCAN_SIZE
      ? MIN_SCAN_SIZE / largestSide
      : Math.min(1, MAX_SCAN_SIZE / largestSide);

  const width = Math.round(source.width * scale);
  const height = Math.round(source.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('無法建立圖片解析畫布');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(source, 0, 0, width, height);
  return canvas;
}

/**
 * Attempt to decode all barcodes found in the given image blob.
 * Pipeline: Blob -> ImageBitmap/Image -> Canvas -> BarcodeDetector
 */
export async function scanImageBlob(blob: Blob): Promise<ScanResult[]> {
  const [detector, image] = await Promise.all([
    getDetector(),
    loadImageSource(blob),
  ]);

  try {
    const canvas = renderToCanvas(image.source);
    const barcodes = await detector.detect(canvas);
    return compactScanResults(
      barcodes.map((barcode) => ({
        text: barcode.rawValue,
        format: getFormatName(barcode.format),
      })),
    );
  } finally {
    image.cleanup();
  }
}
