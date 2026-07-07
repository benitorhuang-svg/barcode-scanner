import { Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import type { AudioFeedbackPort } from '../ports/AudioFeedbackPort';
import type { BarcodeDecoderPort } from '../ports/BarcodeDecoderPort';
import type {
  WebcamFrameSourceFactoryPort,
  WebcamFrameSourcePort,
} from '../ports/WebcamFrameSourcePort';
import type { IngestScanResultUseCase } from '../use-cases/IngestScanResult';
import { WebcamScannerAppService } from '../WebcamScannerAppService';
import { BarcodeData } from '@/domain/scanning/BarcodeData';

function createAcceptedIngest() {
  return {
    execute: vi.fn().mockReturnValue({
      acceptedRecords: [],
      acceptedCount: 1,
      duplicateCount: 0,
      ignoredCount: 0,
      totalCount: 1,
      firstAcceptedRecord: null,
    }),
  } as unknown as IngestScanResultUseCase;
}

function createVideoElement() {
  return {
    srcObject: null,
    play: vi.fn().mockResolvedValue(undefined),
  } as unknown as HTMLVideoElement;
}

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('WebcamScannerAppService', () => {
  it('starts the frame pipeline and ingests decoded barcodes', async () => {
    const frames$ = new Subject<ImageBitmap>();
    const frame = {} as ImageBitmap;
    const stream = {} as MediaStream;
    const frameSource: WebcamFrameSourcePort = {
      requestStream: vi.fn().mockResolvedValue(stream),
      getFrameStream$: vi.fn(() => frames$),
      getCapabilities: vi.fn(() => ({}) as MediaTrackCapabilities),
      applyConstraint: vi.fn(),
      stop: vi.fn(),
    };
    const factory: WebcamFrameSourceFactoryPort = {
      create: vi.fn(() => frameSource),
    };
    const decoder: BarcodeDecoderPort = {
      decode: vi
        .fn()
        .mockResolvedValue({ success: true, barcode: new BarcodeData('A1', 'QR') }),
      destroy: vi.fn(),
    };
    const audio: AudioFeedbackPort = {
      playSuccessSound: vi.fn(),
    };
    const ingest = createAcceptedIngest();
    const service = new WebcamScannerAppService(
      decoder,
      audio,
      factory,
      ingest,
    );
    const video = createVideoElement();

    await service.start(video);
    frames$.next(frame);
    await flushPromises();

    expect(video.srcObject).toBe(stream);
    expect(video.play).toHaveBeenCalledTimes(1);
    expect(decoder.decode).toHaveBeenCalledWith(frame);
    expect(ingest.execute).toHaveBeenCalledWith({
      candidates: [{ text: 'A1', format: 'QR' }],
      duplicateFilter: { enabled: true, cooldownMs: 5000 },
    });
    expect(audio.playSuccessSound).toHaveBeenCalledTimes(1);
    expect(service.state$.value).toEqual({ isActive: true, error: null });

    service.stop();
    expect(frameSource.stop).toHaveBeenCalledTimes(1);
    expect(service.state$.value).toEqual({ isActive: false, error: null });
  });

  it('preserves camera permission errors in scanner state', async () => {
    const notAllowedError = new Error('blocked');
    notAllowedError.name = 'NotAllowedError';
    const frameSource: WebcamFrameSourcePort = {
      requestStream: vi.fn().mockRejectedValue(notAllowedError),
      getFrameStream$: vi.fn(() => new Subject<ImageBitmap>()),
      getCapabilities: vi.fn(() => null),
      applyConstraint: vi.fn(),
      stop: vi.fn(),
    };
    const factory: WebcamFrameSourceFactoryPort = {
      create: vi.fn(() => frameSource),
    };
    const decoder: BarcodeDecoderPort = {
      decode: vi.fn(),
      destroy: vi.fn(),
    };
    const audio: AudioFeedbackPort = {
      playSuccessSound: vi.fn(),
    };
    const service = new WebcamScannerAppService(
      decoder,
      audio,
      factory,
      createAcceptedIngest(),
    );

    await service.start(createVideoElement());

    expect(frameSource.stop).toHaveBeenCalledTimes(1);
    expect(service.state$.value).toEqual({
      isActive: false,
      error: 'Permission denied',
    });
  });

  it('destroys decoder resources when destroyed', () => {
    const decoder: BarcodeDecoderPort = {
      decode: vi.fn(),
      destroy: vi.fn(),
    };
    const service = new WebcamScannerAppService(
      decoder,
      { playSuccessSound: vi.fn() },
      {
        create: vi.fn(),
      },
      createAcceptedIngest(),
    );

    service.destroy();

    expect(decoder.destroy).toHaveBeenCalledTimes(1);
  });
});
