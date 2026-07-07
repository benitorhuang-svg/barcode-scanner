import {
  type BarcodeFormat,
  type GeneratorConfig,
} from '@/domain/generation/barcode-generation';

export interface JsBarcodeOptions {
  format: BarcodeFormat;
  lineColor: string;
  background: string;
  margin: number;
  displayValue: boolean;
  height?: number;
}

export interface QrCanvasOptions {
  width?: number;
  margin: number;
  errorCorrectionLevel?: GeneratorConfig['errorCorrection'];
  color: {
    dark: string;
    light: string;
  };
}

const QR_OUTPUT_WIDTH = 250;
const QR_PREVIEW_WIDTH = 120;
const LINEAR_PREVIEW_MARGIN_MULTIPLIER = 3;
const LINEAR_OUTPUT_MARGIN_MULTIPLIER = 5;

export function createQrCanvasOptions(
  config: GeneratorConfig,
  mode: 'preview' | 'output',
): QrCanvasOptions {
  return {
    width: mode === 'preview' ? QR_PREVIEW_WIDTH : QR_OUTPUT_WIDTH,
    margin: config.margin,
    errorCorrectionLevel:
      mode === 'preview' ? undefined : config.errorCorrection,
    color: {
      dark: config.fgColor,
      light: config.bgColor,
    },
  };
}

export function createQrSvgOptions(
  config: GeneratorConfig,
): Omit<QrCanvasOptions, 'width'> {
  return {
    margin: config.margin,
    errorCorrectionLevel: config.errorCorrection,
    color: {
      dark: config.fgColor,
      light: config.bgColor,
    },
  };
}

export function createLinearBarcodeOptions(
  config: GeneratorConfig,
  mode: 'preview' | 'output',
): JsBarcodeOptions {
  return {
    format: config.format,
    lineColor: config.fgColor,
    background: config.bgColor,
    margin:
      config.margin *
      (mode === 'preview'
        ? LINEAR_PREVIEW_MARGIN_MULTIPLIER
        : LINEAR_OUTPUT_MARGIN_MULTIPLIER),
    displayValue: mode === 'output',
    height: mode === 'preview' ? 50 : undefined,
  };
}
