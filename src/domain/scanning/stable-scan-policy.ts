import {
  isScanTextFragment,
  normalizeScanText,
  type ScanResult,
} from './scan-result';

interface StableScanPolicyOptions {
  stableWindowMs: number;
  stableRequiredHits: number;
  repeatedScanDebounceMs: number;
  duplicateNoticeCooldownMs: number;
}

export class StableScanPolicy {
  private readonly options: StableScanPolicyOptions;
  private pendingScanText = '';
  private pendingScanFormat = '';
  private pendingScanHits = 0;
  private pendingScanLastSeen = 0;
  private lastScanText = '';
  private lastScanTime = 0;

  constructor(options: StableScanPolicyOptions) {
    this.options = options;
  }

  resolveStableResult(result: ScanResult, now: number): ScanResult | null {
    const text = normalizeScanText(result.text);
    if (!text) return null;

    const isExpired =
      now - this.pendingScanLastSeen > this.options.stableWindowMs;

    if (!this.pendingScanText || isExpired) {
      this.setPendingScan(result.format, text, now);
      return null;
    }

    if (text === this.pendingScanText) {
      this.pendingScanHits += 1;
      this.pendingScanLastSeen = now;

      if (this.pendingScanHits < this.options.stableRequiredHits) return null;

      return {
        text: this.pendingScanText,
        format: this.pendingScanFormat,
      };
    }

    if (isScanTextFragment(this.pendingScanText, text)) {
      this.setPendingScan(result.format, text, now);
      return null;
    }

    if (isScanTextFragment(text, this.pendingScanText)) {
      this.pendingScanLastSeen = now;
      return null;
    }

    this.setPendingScan(result.format, text, now);
    return null;
  }

  shouldSuppressRepeatedScan(text: string, now: number): boolean {
    return (
      text === this.lastScanText &&
      now - this.lastScanTime < this.options.repeatedScanDebounceMs
    );
  }

  shouldSuppressDuplicateNotice(text: string, now: number): boolean {
    if (
      text === this.lastScanText &&
      now - this.lastScanTime < this.options.duplicateNoticeCooldownMs
    ) {
      return true;
    }

    this.markAccepted(text, now);
    return false;
  }

  markAccepted(text: string, now: number): void {
    this.lastScanText = text;
    this.lastScanTime = now;
  }

  resetPending(): void {
    this.pendingScanText = '';
    this.pendingScanFormat = '';
    this.pendingScanHits = 0;
    this.pendingScanLastSeen = 0;
  }

  private setPendingScan(format: string, text: string, now: number): void {
    this.pendingScanText = text;
    this.pendingScanFormat = format;
    this.pendingScanHits = 1;
    this.pendingScanLastSeen = now;
  }
}
