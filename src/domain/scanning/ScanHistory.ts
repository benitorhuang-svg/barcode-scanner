import { ScanRecord } from './ScanRecord';

/**
 * Aggregate Root responsible for managing the collection of ScanRecords.
 * It enforces rules like limits or batch export logic.
 */
export class ScanHistory {
  private records: ScanRecord[] = [];

  constructor(initialRecords: ScanRecord[] = []) {
    this.records = [...initialRecords];
  }

  addRecord(record: ScanRecord): void {
    // Prevent adding identical exact record if needed, though they have unique IDs.
    this.records.unshift(record);
  }

  getAll(): ReadonlyArray<ScanRecord> {
    return Object.freeze([...this.records]);
  }

  clear(): void {
    this.records = [];
  }

  get count(): number {
    return this.records.length;
  }
}
