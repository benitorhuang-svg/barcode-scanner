import type { GeneratorConfig } from '@/domain/generation/barcode-generation';

export type RenderGuard = () => boolean;

export interface BarcodeRendererPort {
  renderPreview(
    canvas: HTMLCanvasElement,
    config: GeneratorConfig,
    guard?: RenderGuard,
  ): Promise<boolean>;
  renderOutput(
    canvas: HTMLCanvasElement,
    text: string,
    config: GeneratorConfig,
    guard?: RenderGuard,
  ): Promise<boolean>;
  renderSvg(text: string, config: GeneratorConfig): Promise<string>;
  drawCenteredLogo(
    canvas: HTMLCanvasElement,
    logo: HTMLImageElement,
    backgroundColor: string,
  ): void;
}
