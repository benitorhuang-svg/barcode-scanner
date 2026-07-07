import { describe, expect, it, vi } from 'vitest';
import type { GeneratorConfig } from '@/domain/generation/barcode-generation';
import type { BarcodeRendererPort } from '../ports/BarcodeRendererPort';
import type { GeneratedBarcodeDownloadPort } from '../ports/GeneratedBarcodeDownloadPort';
import type { ImageFileLoaderPort } from '../ports/ImageFileLoaderPort';
import { BarcodeGeneratorAppService } from '../BarcodeGeneratorAppService';

const qrConfig: GeneratorConfig = {
  format: 'QR',
  fgColor: '#000000',
  bgColor: '#ffffff',
  margin: 2,
  errorCorrection: 'M',
  dlFormat: 'png',
  dlSize: 1,
};

function createRenderer(): BarcodeRendererPort {
  return {
    renderPreview: vi.fn().mockResolvedValue(true),
    renderOutput: vi.fn().mockResolvedValue(true),
    renderSvg: vi.fn().mockResolvedValue('<svg></svg>'),
    drawCenteredLogo: vi.fn(),
  };
}

function createDownload(): GeneratedBarcodeDownloadPort {
  return {
    downloadCanvas: vi.fn(),
    downloadSvg: vi.fn(),
  };
}

function createImageLoader(): ImageFileLoaderPort {
  return {
    loadImageFile: vi
      .fn()
      .mockResolvedValue({ image: {} as HTMLImageElement, dataUrl: 'data:' }),
  };
}

describe('BarcodeGeneratorAppService', () => {
  it('renders barcode output and overlays a logo for QR codes', async () => {
    const renderer = createRenderer();
    const service = new BarcodeGeneratorAppService(
      renderer,
      createDownload(),
      createImageLoader(),
    );
    const canvas = {} as HTMLCanvasElement;
    const logo = {} as HTMLImageElement;

    const rendered = await service.renderBarcodeOutput(
      canvas,
      'hello',
      qrConfig,
      logo,
    );

    expect(rendered).toBe(true);
    expect(renderer.renderOutput).toHaveBeenCalledWith(
      canvas,
      'hello',
      qrConfig,
      undefined,
    );
    expect(renderer.drawCenteredLogo).toHaveBeenCalledWith(
      canvas,
      logo,
      '#ffffff',
    );
  });

  it('does not draw a logo when the renderer was superseded by a newer request', async () => {
    const renderer = createRenderer();
    vi.mocked(renderer.renderOutput).mockResolvedValue(false);
    const service = new BarcodeGeneratorAppService(
      renderer,
      createDownload(),
      createImageLoader(),
    );

    const rendered = await service.renderBarcodeOutput(
      {} as HTMLCanvasElement,
      'hello',
      qrConfig,
      {} as HTMLImageElement,
    );

    expect(rendered).toBe(false);
    expect(renderer.drawCenteredLogo).not.toHaveBeenCalled();
  });

  it('downloads SVG output through the SVG port', async () => {
    const renderer = createRenderer();
    const download = createDownload();
    const service = new BarcodeGeneratorAppService(
      renderer,
      download,
      createImageLoader(),
    );
    const config: GeneratorConfig = { ...qrConfig, dlFormat: 'svg' };

    await service.downloadBarcode({} as HTMLCanvasElement, 'hello', config);

    expect(renderer.renderSvg).toHaveBeenCalledWith('hello', config);
    expect(download.downloadSvg).toHaveBeenCalledWith('<svg></svg>', config);
    expect(download.downloadCanvas).not.toHaveBeenCalled();
  });

  it('delegates logo image loading to the image loader port', async () => {
    const imageLoader = createImageLoader();
    const service = new BarcodeGeneratorAppService(
      createRenderer(),
      createDownload(),
      imageLoader,
    );
    const file = {} as File;

    await service.loadLogoFile(file);

    expect(imageLoader.loadImageFile).toHaveBeenCalledWith(file);
  });
});
