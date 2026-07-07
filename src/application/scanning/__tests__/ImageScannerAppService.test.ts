import { describe, expect, it, vi } from 'vitest';
import type { AudioFeedbackPort } from '../ports/AudioFeedbackPort';
import type { ImageScannerPort } from '../ports/ImageScannerPort';
import type { IngestScanResultUseCase } from '../use-cases/IngestScanResult';
import { ImageScannerAppService } from '../ImageScannerAppService';

function createIngestResult(acceptedCount: number) {
  return {
    acceptedRecords: [],
    acceptedCount,
    duplicateCount: 0,
    ignoredCount: 0,
    totalCount: acceptedCount,
    firstAcceptedRecord: null,
  };
}

describe('ImageScannerAppService', () => {
  it('scans an image, delegates ingestion, and plays audio only after accepted results', async () => {
    const imageScanner: ImageScannerPort = {
      scanImage: vi.fn().mockResolvedValue([{ text: 'ABC-123', format: 'QR' }]),
    };
    const audioFeedback: AudioFeedbackPort = {
      playSuccessSound: vi.fn(),
    };
    const ingestScanResult = {
      execute: vi.fn().mockReturnValue(createIngestResult(1)),
    } as unknown as IngestScanResultUseCase;
    const service = new ImageScannerAppService(
      imageScanner,
      audioFeedback,
      ingestScanResult,
    );
    const blob = new Blob(['image']);

    const result = await service.scanImage(blob, {
      duplicateFilterEnabled: true,
      soundEnabled: true,
      duplicateCooldownMs: 3000,
    });

    expect(imageScanner.scanImage).toHaveBeenCalledWith(blob);
    expect(ingestScanResult.execute).toHaveBeenCalledWith({
      candidates: [{ text: 'ABC-123', format: 'QR' }],
      duplicateFilter: { enabled: true, cooldownMs: 3000 },
    });
    expect(audioFeedback.playSuccessSound).toHaveBeenCalledTimes(1);
    expect(result.acceptedCount).toBe(1);
  });

  it('does not play audio when all candidates are filtered out', async () => {
    const imageScanner: ImageScannerPort = {
      scanImage: vi.fn().mockResolvedValue([{ text: 'ABC-123', format: 'QR' }]),
    };
    const audioFeedback: AudioFeedbackPort = {
      playSuccessSound: vi.fn(),
    };
    const ingestScanResult = {
      execute: vi.fn().mockReturnValue(createIngestResult(0)),
    } as unknown as IngestScanResultUseCase;
    const service = new ImageScannerAppService(
      imageScanner,
      audioFeedback,
      ingestScanResult,
    );

    await service.scanImage(new Blob(['image']), {
      duplicateFilterEnabled: true,
      soundEnabled: true,
    });

    expect(audioFeedback.playSuccessSound).not.toHaveBeenCalled();
  });
});
