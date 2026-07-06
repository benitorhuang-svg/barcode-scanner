import {
  barcodeDownloadFilename,
  downloadMimeType,
  type GeneratorConfig,
} from '../../domain/generation/barcode-generation';
import { downloadBlob, downloadDataUrl } from '../browser/download-file';

export function downloadBarcodeSvg(
  svgContent: string,
  config: GeneratorConfig,
): void {
  const blob = new Blob([svgContent], {
    type: downloadMimeType(config.dlFormat),
  });
  downloadBlob(blob, barcodeDownloadFilename(config.dlFormat));
}

export function downloadBarcodeCanvas(
  canvas: HTMLCanvasElement,
  config: GeneratorConfig,
): void {
  const dataUrl = createCanvasDownloadDataUrl(canvas, config);
  if (!dataUrl) return;

  downloadDataUrl(dataUrl, barcodeDownloadFilename(config.dlFormat));
}

function createCanvasDownloadDataUrl(
  canvas: HTMLCanvasElement,
  config: GeneratorConfig,
): string | null {
  const mimeType = downloadMimeType(config.dlFormat);

  if (config.dlSize === 1) {
    return canvas.toDataURL(mimeType);
  }

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = canvas.width * config.dlSize;
  tempCanvas.height = canvas.height * config.dlSize;

  const ctx = tempCanvas.getContext('2d');
  if (!ctx) return null;

  ctx.imageSmoothingEnabled = false;
  ctx.scale(config.dlSize, config.dlSize);
  ctx.drawImage(canvas, 0, 0);

  return tempCanvas.toDataURL(mimeType);
}
