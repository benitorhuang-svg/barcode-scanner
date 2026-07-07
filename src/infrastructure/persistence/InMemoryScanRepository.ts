import { ScanHistory } from '@/domain/scanning/ScanHistory';
import { ScanRecord } from '@/domain/scanning/ScanRecord';
import type { ScanRepositoryPort } from '@/application/scanning/ports/ScanRepositoryPort';

/**
 * Infrastructure implementation of a Scan Repository.
 * Currently uses an in-memory store.
 */
export class InMemoryScanRepository implements ScanRepositoryPort {
  private history: ScanHistory;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.history = new ScanHistory();
  }

  async init(): Promise<void> {
    // In-memory doesn't need async initialization, but conforms to interface
    return Promise.resolve();
  }

  save(record: ScanRecord): void {
    this.history.addRecord(record);
    this.notifyListeners();
  }

  getAll(): ReadonlyArray<ScanRecord> {
    return this.history.getAll();
  }

  clear(): void {
    this.history.clear();
    this.notifyListeners();
  }

  get count(): number {
    return this.history.count;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }
}

// Singleton instance for the application
export const scanRepository = new InMemoryScanRepository();
