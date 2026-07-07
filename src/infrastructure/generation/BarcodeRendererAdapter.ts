import type {
  BarcodeRendererPort,
  RenderGuard,
} from '@/application/generation/ports/BarcodeRendererPort';
import type { GeneratorConfig } from '@/domain/generation/barcode-generation';
import {
  drawCenteredLogo,
  renderBarcodePreview,
  renderBarcodeToCanvas,
  renderBarcodeToSvg,
} from './barcode-renderer';

export class BarcodeRendererAdapter implements BarcodeRendererPort {
  renderPreview(
    canvas: HTMLCanvasElement,
    config: GeneratorConfig,
    guard?: RenderGuard,
  ): Promise<boolean> {
    return renderBarcodePreview(canvas, config, guard);
  }

  renderOutput(
    canvas: HTMLCanvasElement,
    text: string,
    config: GeneratorConfig,
    guard?: RenderGuard,
  ): Promise<boolean> {
    return renderBarcodeToCanvas(canvas, text, config, 'output', guard);
  }

  renderSvg(text: string, config: GeneratorConfig): Promise<string> {
    return renderBarcodeToSvg(text, config);
  }

  drawCenteredLogo(
    canvas: HTMLCanvasElement,
    logo: HTMLImageElement,
    backgroundColor: string,
  ): void {
    drawCenteredLogo(canvas, logo, backgroundColor);
  }
}
