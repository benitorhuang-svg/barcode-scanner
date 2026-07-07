import { BarcodeData } from './BarcodeData';

export interface DuplicateFilterOptions {
  enabled: boolean;
  cooldownMs: number;
}

/**
 * Value Object / Domain Service defining the policy for duplicated scans.
 * It provides the logic to be used by RxJS `distinctUntilChanged` or similar operators.
 */
export class DuplicateFilterStrategy {
  private options: DuplicateFilterOptions;

  constructor(options: DuplicateFilterOptions) {
    this.options = options;
  }

  /**
   * Compares the current barcode with the previous one to determine if it should be filtered out.
   */
  isDuplicate(
    previous: { barcode: BarcodeData; timestamp: number } | null,
    current: { barcode: BarcodeData; timestamp: number },
  ): boolean {
    if (!this.options.enabled) {
      return false;
    }

    if (!previous) {
      return false;
    }

    const isSameBarcode = previous.barcode.equals(current.barcode);
    const timeElapsed = current.timestamp - previous.timestamp;

    if (isSameBarcode && timeElapsed < this.options.cooldownMs) {
      return true; // It's a duplicate and within cooldown
    }

    return false;
  }
}
