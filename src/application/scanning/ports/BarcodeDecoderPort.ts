import type { BarcodeData } from '@/domain/scanning/BarcodeData';

export interface DecodeResult {
  success: boolean;
  barcode?: BarcodeData;
  error?: string;
}

export interface BarcodeDecoderPort {
  decode(frame: ImageBitmap): Promise<DecodeResult>;
  destroy(): void;
}
