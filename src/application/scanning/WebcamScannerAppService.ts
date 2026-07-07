import { filter, throttleTime, exhaustMap, BehaviorSubject, map } from 'rxjs';
import type { SubscriptionLike } from 'rxjs';
import type { AudioFeedbackPort } from './ports/AudioFeedbackPort';
import type { BarcodeDecoderPort } from './ports/BarcodeDecoderPort';
import type {
  WebcamFrameSourceFactoryPort,
  WebcamFrameSourcePort,
} from './ports/WebcamFrameSourcePort';
import type { IngestScanResultUseCase } from './use-cases/IngestScanResult';

export interface ScannerState {
  isActive: boolean;
  error: string | null;
}

export class WebcamScannerAppService {
  private decoderAdapter: BarcodeDecoderPort;
  private streamSourceFactory: WebcamFrameSourceFactoryPort;
  private streamAdapter: WebcamFrameSourcePort | null = null;
  private audioAdapter: AudioFeedbackPort;
  private ingestScanResult: IngestScanResultUseCase;
  private duplicateFilterEnabled = true;
  private duplicateCooldownMs = 5000;

  private pipelineSubscription: SubscriptionLike | null = null;

  public readonly state$ = new BehaviorSubject<ScannerState>({ isActive: false, error: null });

  private audioEnabled = true;
  private torchEnabled = false;

  constructor(
    decoderAdapter: BarcodeDecoderPort,
    audioAdapter: AudioFeedbackPort,
    streamSourceFactory: WebcamFrameSourceFactoryPort,
    ingestScanResult: IngestScanResultUseCase,
  ) {
    this.decoderAdapter = decoderAdapter;
    this.audioAdapter = audioAdapter;
    this.streamSourceFactory = streamSourceFactory;
    this.ingestScanResult = ingestScanResult;
  }

  /**
   * Hardware Controls
   */
  public async toggleTorch(): Promise<boolean> {
    if (!this.streamAdapter) return false;
    
    this.torchEnabled = !this.torchEnabled;
    try {
      await this.streamAdapter.applyConstraint({ torch: this.torchEnabled } as unknown as MediaTrackConstraints);
      return this.torchEnabled;
    } catch (e) {
      console.warn('Torch not supported or failed', e);
      this.torchEnabled = !this.torchEnabled; // Revert on failure
      return this.torchEnabled;
    }
  }

  public async setZoom(level: number): Promise<void> {
    if (!this.streamAdapter) return;
    try {
      await this.streamAdapter.applyConstraint({ zoom: level } as unknown as MediaTrackConstraints);
    } catch (e) {
      console.warn('Zoom not supported or failed', e);
    }
  }

  public getCapabilities(): MediaTrackCapabilities | null {
    return this.streamAdapter?.getCapabilities() ?? null;
  }

  /**
   * Updates duplicate filter settings on the fly.
   */
  setDuplicateFilter(enabled: boolean): void {
    this.duplicateFilterEnabled = enabled;
  }

  setSoundEnabled(enabled: boolean): void {
    this.audioEnabled = enabled;
  }

  async start(videoElement: HTMLVideoElement): Promise<void> {
    if (this.state$.value.isActive) return;

    try {
      this.streamAdapter = this.streamSourceFactory.create(videoElement);
      const mediaStream = await this.streamAdapter.requestStream();
      videoElement.srcObject = mediaStream;
      await videoElement.play();

      this.state$.next({ isActive: true, error: null });

      // Start the RxJS Pipeline
      this.pipelineSubscription = this.streamAdapter.getFrameStream$()
        .pipe(
          // 1. Control frame parsing frequency (280ms)
          throttleTime(280),
          // 2. Offload to WebWorker
          exhaustMap(frame => this.decoderAdapter.decode(frame)),
          // 3. Filter only successful decodes
          filter(result => result.success && !!result.barcode),
          // map to ensure we have a valid barcode type for TypeScript
          map(result => result.barcode),
        )
        .subscribe({
          next: (barcode) => {
            if (!barcode) return;

            const result = this.ingestScanResult.execute({
              candidates: [{ text: barcode.text, format: barcode.format }],
              duplicateFilter: {
                enabled: this.duplicateFilterEnabled,
                cooldownMs: this.duplicateCooldownMs,
              },
            });

            if (this.audioEnabled && result.acceptedCount > 0) {
              this.audioAdapter.playSuccessSound();
            }
          },
          error: (err) => {
            console.error('Pipeline error:', err);
            this.stopStream();
            this.state$.next({ isActive: false, error: 'Pipeline crashed' });
          }
        });

    } catch (err: unknown) {
      const errorObj = err as Error;
      const errorMsg = errorObj.name === 'NotAllowedError' 
        ? 'Permission denied' 
        : errorObj.message ?? 'Unknown error';
      this.stopStream();
      this.state$.next({ isActive: false, error: errorMsg });
    }
  }

  stop(): void {
    this.stopStream();
    this.state$.next({ isActive: false, error: null });
  }

  private stopStream(): void {
    if (this.pipelineSubscription) {
      this.pipelineSubscription.unsubscribe();
      this.pipelineSubscription = null;
    }
    this.streamAdapter?.stop();
    this.streamAdapter = null;
  }

  destroy(): void {
    this.stop();
    this.decoderAdapter.destroy();
  }
}
