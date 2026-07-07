import type { ScanRecord } from '@/domain/scanning/ScanRecord';

export interface ScanRepositoryPort {
  init(): Promise<void>;
  save(record: ScanRecord): Promise<void> | void;
  getAll(): ReadonlyArray<ScanRecord>;
  clear(): Promise<void> | void;
  subscribe(listener: () => void): () => void;
  readonly count: number;
}
