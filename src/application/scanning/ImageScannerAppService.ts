import type { AudioFeedbackPort } from './ports/AudioFeedbackPort';
import type { ImageScannerPort } from './ports/ImageScannerPort';
import type {
  IngestScanResultUseCase,
  IngestScanResultOutput,
} from './use-cases/IngestScanResult';

const DEFAULT_DUPLICATE_COOLDOWN_MS = 5000;

export interface ImageScanOptions {
  duplicateFilterEnabled: boolean;
  soundEnabled: boolean;
  duplicateCooldownMs?: number;
}

export class ImageScannerAppService {
  private imageScanner: ImageScannerPort;
  private audioFeedback: AudioFeedbackPort;
  private ingestScanResult: IngestScanResultUseCase;

  constructor(
    imageScanner: ImageScannerPort,
    audioFeedback: AudioFeedbackPort,
    ingestScanResult: IngestScanResultUseCase,
  ) {
    this.imageScanner = imageScanner;
    this.audioFeedback = audioFeedback;
    this.ingestScanResult = ingestScanResult;
  }

  async scanImage(
    blob: Blob,
    options: ImageScanOptions,
  ): Promise<IngestScanResultOutput> {
    const candidates = await this.imageScanner.scanImage(blob);
    const result = this.ingestScanResult.execute({
      candidates,
      duplicateFilter: {
        enabled: options.duplicateFilterEnabled,
        cooldownMs: options.duplicateCooldownMs ?? DEFAULT_DUPLICATE_COOLDOWN_MS,
      },
    });

    if (options.soundEnabled && result.acceptedCount > 0) {
      this.audioFeedback.playSuccessSound();
    }

    return result;
  }
}
