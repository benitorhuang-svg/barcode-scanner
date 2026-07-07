import type { ClockPort } from '@/application/shared/ports/ClockPort';
import type { ScanRepositoryPort } from '@/application/scanning/ports/ScanRepositoryPort';
import { BarcodeData } from '@/domain/scanning/BarcodeData';
import {
  DuplicateFilterStrategy,
  type DuplicateFilterOptions,
} from '@/domain/scanning/DuplicateFilterStrategy';
import { ScanRecord } from '@/domain/scanning/ScanRecord';
import { normalizeScanText, type ScanResult } from '@/domain/scanning/scan-result';

export interface IngestScanResultInput {
  candidates: readonly ScanResult[];
  duplicateFilter: DuplicateFilterOptions;
}

export interface IngestScanResultOutput {
  acceptedRecords: readonly ScanRecord[];
  acceptedCount: number;
  duplicateCount: number;
  ignoredCount: number;
  totalCount: number;
  firstAcceptedRecord: ScanRecord | null;
}

export class IngestScanResultUseCase {
  private scanRepository: ScanRepositoryPort;
  private clock: ClockPort;

  constructor(scanRepository: ScanRepositoryPort, clock: ClockPort) {
    this.scanRepository = scanRepository;
    this.clock = clock;
  }

  execute(input: IngestScanResultInput): IngestScanResultOutput {
    const strategy = new DuplicateFilterStrategy(input.duplicateFilter);
    const acceptedRecords: ScanRecord[] = [];
    const acceptedAtMs = this.clock.now().getTime();
    const latestRecord = this.scanRepository.getAll()[0];
    let duplicateCount = 0;
    let ignoredCount = 0;
    let previous = latestRecord
      ? {
          barcode: latestRecord.barcode,
          timestamp: latestRecord.timestamp.getTime(),
        }
      : null;

    for (const candidate of input.candidates) {
      const text = normalizeScanText(candidate.text);
      if (!text) {
        ignoredCount += 1;
        continue;
      }

      const barcode = new BarcodeData(text, candidate.format);
      const current = { barcode, timestamp: acceptedAtMs };

      if (strategy.isDuplicate(previous, current)) {
        duplicateCount += 1;
        continue;
      }

      const record = new ScanRecord(barcode, undefined, new Date(acceptedAtMs));
      this.scanRepository.save(record);
      acceptedRecords.push(record);
      previous = current;
    }

    return {
      acceptedRecords,
      acceptedCount: acceptedRecords.length,
      duplicateCount,
      ignoredCount,
      totalCount: input.candidates.length,
      firstAcceptedRecord: acceptedRecords[0] ?? null,
    };
  }
}
