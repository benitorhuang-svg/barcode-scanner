/**
 * Image Scanner — decode barcodes from static images (Blob / File).
 * Uses a canvas-based preprocessing pipeline for better detection
 * of low-resolution or clipboard-pasted images.
 */

import { getFormatName } from './format-map';
import type { ScanResult } from './scanner-engine';

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

/** Minimum dimension to upscale small images for better scanning. */
const MIN_SCAN_WIDTH = 800;

/**
 * Load a Blob into an HTMLImageElement.
 */
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

/**
 * Render the image onto a canvas with a white background and optional
 * upscaling. This dramatically improves detection for small or
 * transparent-background images from clipboard paste.
 */
function renderToCanvas(img: HTMLImageElement): HTMLCanvasElement {
  const scale = img.width < MIN_SCAN_WIDTH
    ? MIN_SCAN_WIDTH / img.width
    : 1;

  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext('2d')!;

  // White background — fixes transparent PNGs and dark-mode screenshots
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);

  ctx.drawImage(img, 0, 0, w, h);
  return canvas;
}

/**
 * Attempt to decode all barcodes found in the given image blob.
 * Pipeline: Blob → Image → Canvas (white bg + upscale) → BarcodeDetector
 */
export async function scanImageBlob(blob: Blob): Promise<ScanResult[]> {
  const { BarcodeDetector } = await import('barcode-detector/pure');
  const detector = new BarcodeDetector({ formats: [...SUPPORTED_FORMATS] });
  const img = await loadImage(blob);
  const canvas = renderToCanvas(img);

  const barcodes = await detector.detect(canvas);
  return barcodes.map((bc) => ({
    text: bc.rawValue,
    format: getFormatName(bc.format),
  }));
}
