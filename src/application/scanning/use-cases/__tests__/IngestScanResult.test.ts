import { describe, expect, it } from 'vitest';
import type { ClockPort } from '@/application/shared/ports/ClockPort';
import type { ScanRepositoryPort } from '@/application/scanning/ports/ScanRepositoryPort';
import { BarcodeData } from '@/domain/scanning/BarcodeData';
import { ScanRecord } from '@/domain/scanning/ScanRecord';
import { IngestScanResultUseCase } from '../IngestScanResult';

class FixedClock implements ClockPort {
  private value: Date;

  constructor(value: Date) {
    this.value = value;
  }

  now(): Date {
    return this.value;
  }
}

class FakeScanRepository implements ScanRepositoryPort {
  private records: ScanRecord[];

  constructor(records: ScanRecord[] = []) {
    this.records = [...records];
  }

  init(): Promise<void> {
    return Promise.resolve();
  }

  save(record: ScanRecord): void {
    this.records.unshift(record);
  }

  getAll(): ReadonlyArray<ScanRecord> {
    return [...this.records];
  }

  clear(): void {
    this.records = [];
  }

  subscribe(): () => void {
    return () => undefined;
  }

  get count(): number {
    return this.records.length;
  }
}

describe('IngestScanResultUseCase', () => {
  it('normalizes candidate text and saves accepted records', () => {
    const repository = new FakeScanRepository();
    const useCase = new IngestScanResultUseCase(
      repository,
      new FixedClock(new Date('2026-07-07T01:00:00.000Z')),
    );

    const result = useCase.execute({
      candidates: [{ text: '  ABC-123  ', format: 'QR' }],
      duplicateFilter: { enabled: true, cooldownMs: 5000 },
    });

    expect(result.acceptedCount).toBe(1);
    expect(result.duplicateCount).toBe(0);
    expect(repository.getAll()[0].barcode.text).toBe('ABC-123');
  });

  it('filters duplicate candidates against the latest accepted record', () => {
    const latest = new ScanRecord(
      new BarcodeData('ABC-123', 'QR'),
      'latest',
      new Date('2026-07-07T01:00:00.000Z'),
    );
    const repository = new FakeScanRepository([latest]);
    const useCase = new IngestScanResultUseCase(
      repository,
      new FixedClock(new Date('2026-07-07T01:00:03.000Z')),
    );

    const result = useCase.execute({
      candidates: [{ text: 'ABC-123', format: 'QR' }],
      duplicateFilter: { enabled: true, cooldownMs: 5000 },
    });

    expect(result.acceptedCount).toBe(0);
    expect(result.duplicateCount).toBe(1);
    expect(repository.count).toBe(1);
  });

  it('accepts duplicate text after the cooldown period', () => {
    const latest = new ScanRecord(
      new BarcodeData('ABC-123', 'QR'),
      'latest',
      new Date('2026-07-07T01:00:00.000Z'),
    );
    const repository = new FakeScanRepository([latest]);
    const useCase = new IngestScanResultUseCase(
      repository,
      new FixedClock(new Date('2026-07-07T01:00:06.000Z')),
    );

    const result = useCase.execute({
      candidates: [{ text: 'ABC-123', format: 'QR' }],
      duplicateFilter: { enabled: true, cooldownMs: 5000 },
    });

    expect(result.acceptedCount).toBe(1);
    expect(result.duplicateCount).toBe(0);
    expect(repository.count).toBe(2);
  });

  it('filters duplicates within the same ingestion batch', () => {
    const repository = new FakeScanRepository();
    const useCase = new IngestScanResultUseCase(
      repository,
      new FixedClock(new Date('2026-07-07T01:00:00.000Z')),
    );

    const result = useCase.execute({
      candidates: [
        { text: 'ABC-123', format: 'QR' },
        { text: 'ABC-123', format: 'QR' },
        { text: 'XYZ-999', format: 'CODE128' },
      ],
      duplicateFilter: { enabled: true, cooldownMs: 5000 },
    });

    expect(result.acceptedCount).toBe(2);
    expect(result.duplicateCount).toBe(1);
    expect(repository.getAll().map(record => record.barcode.text)).toEqual([
      'XYZ-999',
      'ABC-123',
    ]);
  });
});
