import type { GeneratorConfig } from '@/domain/generation/barcode-generation';

export interface GeneratedBarcodeDownloadPort {
  downloadCanvas(canvas: HTMLCanvasElement, config: GeneratorConfig): void;
  downloadSvg(svgContent: string, config: GeneratorConfig): void;
}
