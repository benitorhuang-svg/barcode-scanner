/**
 * Value Object representing the pure data of a decoded barcode.
 * It is immutable. Two BarcodeData instances with the same text and format are considered identical.
 */
export class BarcodeData {
  readonly text: string;
  readonly format: string;

  constructor(text: string, format: string) {
    if (!text) {
      throw new Error('Barcode text cannot be empty');
    }
    this.text = text;
    this.format = format;
  }

  equals(other: BarcodeData | null | undefined): boolean {
    if (!other) return false;
    return this.text === other.text && this.format === other.format;
  }
}
