import type { BarcodeDetector } from 'barcode-detector/pure';
import { SUPPORTED_BARCODE_FORMATS } from '@/domain/scanning/supported-barcode-formats';
import {
  compactScanResults,
  type ScanResult,
} from '@/domain/scanning/scan-result';
import { getFormatName } from './barcode-format-name';

const MIN_SCAN_SIZE = 800;
const MAX_SCAN_SIZE = 1800;

type ScanImageOverride = (blob: Blob) => Promise<ScanResult[]> | ScanResult[];

declare global {
  interface Window {
    __barcodeScannerTestHooks?: {
      scanImageBlob?: ScanImageOverride;
    };
  }
}

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
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(image.src);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(image.src);
      reject(new Error('圖片載入失敗'));
    };
    image.src = URL.createObjectURL(blob);
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

  const context = canvas.getContext('2d');
  if (!context) throw new Error('無法建立圖片掃描畫布');

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(source, 0, 0, width, height);
  return canvas;
}

export async function scanImageBlob(blob: Blob): Promise<ScanResult[]> {
  const testOverride = import.meta.env.DEV
    ? window.__barcodeScannerTestHooks?.scanImageBlob
    : undefined;
  if (testOverride) {
    return testOverride(blob);
  }

  const [detector, image] = await Promise.all([
    getDetector(),
    loadImageSource(blob),
  ]);

  try {
    const canvas = renderToCanvas(image.source);
    const barcodes = await detector.detect(canvas);
    return compactScanResults(
      barcodes.map(barcode => ({
        text: barcode.rawValue,
        format: getFormatName(barcode.format),
      })),
    );
  } finally {
    image.cleanup();
  }
}
