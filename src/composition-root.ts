import { DecoderAdapter } from '@/infrastructure/scanning/DecoderAdapter';
import { AudioAdapter } from '@/infrastructure/audio/AudioAdapter';
import { IndexedDbScanRepository } from '@/infrastructure/persistence/IndexedDbScanRepository';
import { WebcamStreamAdapter } from '@/infrastructure/scanning/WebcamStreamAdapter';
import { ImageScannerAdapter } from '@/infrastructure/scanning/ImageScannerAdapter';
import { BrowserClipboardAdapter } from '@/infrastructure/browser/BrowserClipboardAdapter';
import { BrowserDownloadAdapter } from '@/infrastructure/browser/BrowserDownloadAdapter';
import { BrowserImageFileLoaderAdapter } from '@/infrastructure/browser/BrowserImageFileLoaderAdapter';
import { SystemClock } from '@/infrastructure/browser/SystemClock';
import { BarcodeRendererAdapter } from '@/infrastructure/generation/BarcodeRendererAdapter';
import { GeneratedBarcodeDownloadAdapter } from '@/infrastructure/generation/GeneratedBarcodeDownloadAdapter';
import { WebcamScannerAppService } from '@/application/scanning/WebcamScannerAppService';
import { ImageScannerAppService } from '@/application/scanning/ImageScannerAppService';
import { ExportAppService } from '@/application/scanning/ExportAppService';
import { IngestScanResultUseCase } from '@/application/scanning/use-cases/IngestScanResult';
import { BarcodeGeneratorAppService } from '@/application/generation/BarcodeGeneratorAppService';
import type { WebcamFrameSourceFactoryPort } from '@/application/scanning/ports/WebcamFrameSourcePort';

export const scanRepository = new IndexedDbScanRepository();
export const decoderAdapter = new DecoderAdapter();
export const audioAdapter = new AudioAdapter();
export const imageScannerAdapter = new ImageScannerAdapter();
export const clipboardAdapter = new BrowserClipboardAdapter();
export const downloadAdapter = new BrowserDownloadAdapter();
export const systemClock = new SystemClock();
export const barcodeRendererAdapter = new BarcodeRendererAdapter();
export const generatedBarcodeDownloadAdapter = new GeneratedBarcodeDownloadAdapter();
export const browserImageFileLoaderAdapter = new BrowserImageFileLoaderAdapter();

export const webcamFrameSourceFactory: WebcamFrameSourceFactoryPort = {
  create(videoElement: HTMLVideoElement) {
    return new WebcamStreamAdapter(videoElement);
  },
};

export const ingestScanResult = new IngestScanResultUseCase(
  scanRepository,
  systemClock,
);

export const webcamScannerService = new WebcamScannerAppService(
  decoderAdapter,
  audioAdapter,
  webcamFrameSourceFactory,
  ingestScanResult,
);

export const imageScannerService = new ImageScannerAppService(
  imageScannerAdapter,
  audioAdapter,
  ingestScanResult,
);

export const exportService = new ExportAppService(
  scanRepository,
  clipboardAdapter,
  downloadAdapter,
);

export const barcodeGeneratorService = new BarcodeGeneratorAppService(
  barcodeRendererAdapter,
  generatedBarcodeDownloadAdapter,
  browserImageFileLoaderAdapter,
);
