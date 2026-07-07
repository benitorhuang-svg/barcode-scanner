import type { GeneratorConfig } from '@/domain/generation/barcode-generation';
import { isQrFormat } from '@/domain/generation/barcode-generation';
import type {
  BarcodeRendererPort,
  RenderGuard,
} from './ports/BarcodeRendererPort';
import type { GeneratedBarcodeDownloadPort } from './ports/GeneratedBarcodeDownloadPort';
import type {
  ImageFileLoaderPort,
  LoadedImageFile,
} from './ports/ImageFileLoaderPort';

export class BarcodeGeneratorAppService {
  private renderer: BarcodeRendererPort;
  private download: GeneratedBarcodeDownloadPort;
  private imageFileLoader: ImageFileLoaderPort;

  constructor(
    renderer: BarcodeRendererPort,
    download: GeneratedBarcodeDownloadPort,
    imageFileLoader: ImageFileLoaderPort,
  ) {
    this.renderer = renderer;
    this.download = download;
    this.imageFileLoader = imageFileLoader;
  }

  loadLogoFile(file: File): Promise<LoadedImageFile> {
    return this.imageFileLoader.loadImageFile(file);
  }

  renderAppearancePreview(
    canvas: HTMLCanvasElement,
    config: GeneratorConfig,
    guard?: RenderGuard,
  ): Promise<boolean> {
    return this.renderer.renderPreview(canvas, config, guard);
  }

  async renderBarcodeOutput(
    canvas: HTMLCanvasElement,
    text: string,
    config: GeneratorConfig,
    logo: HTMLImageElement | null,
    guard?: RenderGuard,
  ): Promise<boolean> {
    const rendered = await this.renderer.renderOutput(
      canvas,
      text,
      config,
      guard,
    );
    if (!rendered) return false;

    if (logo && isQrFormat(config.format)) {
      this.renderer.drawCenteredLogo(canvas, logo, config.bgColor);
    }

    return true;
  }

  async downloadBarcode(
    canvas: HTMLCanvasElement,
    text: string,
    config: GeneratorConfig,
  ): Promise<void> {
    if (config.dlFormat === 'svg') {
      this.download.downloadSvg(await this.renderer.renderSvg(text, config), config);
      return;
    }

    this.download.downloadCanvas(canvas, config);
  }
}
