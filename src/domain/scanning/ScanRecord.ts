import { BarcodeData } from './BarcodeData';

/**
 * Entity representing a single, verified scan event.
 * It has a unique identity (id) and a lifecycle.
 */
export class ScanRecord {
  public readonly id: string;
  public readonly timestamp: Date;
  public readonly barcode: BarcodeData;

  constructor(
    barcode: BarcodeData,
    id?: string,
    timestamp?: Date,
  ) {
    this.barcode = barcode;
    this.id = id ?? crypto.randomUUID();
    this.timestamp = timestamp ?? new Date();
  }
}
