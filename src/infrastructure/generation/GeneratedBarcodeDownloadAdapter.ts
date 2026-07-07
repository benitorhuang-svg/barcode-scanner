import type { GeneratedBarcodeDownloadPort } from '@/application/generation/ports/GeneratedBarcodeDownloadPort';
import type { GeneratorConfig } from '@/domain/generation/barcode-generation';
import { downloadBarcodeCanvas, downloadBarcodeSvg } from './barcode-download';

export class GeneratedBarcodeDownloadAdapter
  implements GeneratedBarcodeDownloadPort
{
  downloadCanvas(canvas: HTMLCanvasElement, config: GeneratorConfig): void {
    downloadBarcodeCanvas(canvas, config);
  }

  downloadSvg(svgContent: string, config: GeneratorConfig): void {
    downloadBarcodeSvg(svgContent, config);
  }
}
