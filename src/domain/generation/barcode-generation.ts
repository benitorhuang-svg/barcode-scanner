export type BarcodeFormat = 'QR' | 'CODE128' | 'CODE39' | 'EAN13' | 'UPC';
export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';
export type DownloadFormat = 'png' | 'jpeg' | 'svg';

export interface GeneratorConfig {
  format: BarcodeFormat;
  fgColor: string;
  bgColor: string;
  margin: number;
  errorCorrection: ErrorCorrectionLevel;
  dlFormat: DownloadFormat;
  dlSize: number;
}

const DEFAULT_GENERATOR_CONFIG: GeneratorConfig = {
  format: 'QR',
  fgColor: '#0f172a',
  bgColor: '#ffffff',
  margin: 2,
  errorCorrection: 'M',
  dlFormat: 'png',
  dlSize: 1,
};

const MIN_MARGIN = 0;
const MAX_MARGIN = 10;
const ALLOWED_FORMATS = new Set<BarcodeFormat>([
  'QR',
  'CODE128',
  'CODE39',
  'EAN13',
  'UPC',
]);
const ALLOWED_ERROR_CORRECTION = new Set<ErrorCorrectionLevel>([
  'L',
  'M',
  'Q',
  'H',
]);
const ALLOWED_DOWNLOAD_FORMATS = new Set<DownloadFormat>([
  'png',
  'jpeg',
  'svg',
]);
const ALLOWED_DOWNLOAD_SIZES = new Set([1, 2, 4]);

export function isQrFormat(format: BarcodeFormat): boolean {
  return format === 'QR';
}

export function clampMargin(value: number): number {
  return Math.max(MIN_MARGIN, Math.min(MAX_MARGIN, value));
}

export function normalizeGeneratorConfig(
  input: Partial<GeneratorConfig>,
): GeneratorConfig {
  const margin = Number.isFinite(input.margin)
    ? clampMargin(input.margin ?? DEFAULT_GENERATOR_CONFIG.margin)
    : DEFAULT_GENERATOR_CONFIG.margin;
  const dlSize = ALLOWED_DOWNLOAD_SIZES.has(input.dlSize ?? 0)
    ? input.dlSize
    : DEFAULT_GENERATOR_CONFIG.dlSize;

  return {
    format:
      input.format && ALLOWED_FORMATS.has(input.format)
        ? input.format
        : DEFAULT_GENERATOR_CONFIG.format,
    fgColor: input.fgColor || DEFAULT_GENERATOR_CONFIG.fgColor,
    bgColor: input.bgColor || DEFAULT_GENERATOR_CONFIG.bgColor,
    margin,
    errorCorrection:
      input.errorCorrection &&
      ALLOWED_ERROR_CORRECTION.has(input.errorCorrection)
        ? input.errorCorrection
        : DEFAULT_GENERATOR_CONFIG.errorCorrection,
    dlFormat:
      input.dlFormat && ALLOWED_DOWNLOAD_FORMATS.has(input.dlFormat)
        ? input.dlFormat
        : DEFAULT_GENERATOR_CONFIG.dlFormat,
    dlSize: dlSize ?? DEFAULT_GENERATOR_CONFIG.dlSize,
  };
}

export function previewTextForFormat(format: BarcodeFormat): string {
  if (format === 'EAN13') return '123456789012';
  if (format === 'UPC') return '12345678901';
  return 'PREVIEW';
}

export function downloadMimeType(format: DownloadFormat): string {
  if (format === 'jpeg') return 'image/jpeg';
  if (format === 'svg') return 'image/svg+xml;charset=utf-8';
  return 'image/png';
}

export function barcodeDownloadFilename(
  format: DownloadFormat,
  timestamp = Date.now(),
): string {
  return `barcode_${timestamp}.${format}`;
}
