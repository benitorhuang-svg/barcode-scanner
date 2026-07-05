/**
 * Barcode format name mapping.
 * Translates ZXing numeric codes and BarcodeDetector format strings
 * into human-readable labels.
 */

const ZXING_NUMERIC_MAP: Record<string, string> = {
  '0': 'Aztec',
  '1': 'PDF417',
  '2': 'Codabar',
  '3': 'RSS 14',
  '4': 'Data Matrix',
  '6': 'RSS Expanded',
  '9': 'ITF',
  '10': 'MaxiCode',
  '11': 'Code 39',
  '12': 'Code 93',
  '13': 'Code 128',
  '14': 'EAN-8',
  '15': 'EAN-13',
  '16': 'QR Code',
  '17': 'UPC-A',
  '18': 'UPC-E',
  '19': 'UPC/EAN',
};

interface FormatPattern {
  keyword: string;
  label: string;
}

const STRING_PATTERNS: FormatPattern[] = [
  { keyword: '128', label: 'Code 128' },
  { keyword: '39', label: 'Code 39' },
  { keyword: '93', label: 'Code 93' },
  { keyword: 'ean13', label: 'EAN-13' },
  { keyword: 'ean_13', label: 'EAN-13' },
  { keyword: 'ean-13', label: 'EAN-13' },
  { keyword: 'ean8', label: 'EAN-8' },
  { keyword: 'ean_8', label: 'EAN-8' },
  { keyword: 'qr', label: 'QR Code' },
  { keyword: 'upc_a', label: 'UPC-A' },
  { keyword: 'upca', label: 'UPC-A' },
  { keyword: 'upc_e', label: 'UPC-E' },
  { keyword: 'upce', label: 'UPC-E' },
  { keyword: 'itf', label: 'ITF' },
  { keyword: 'codabar', label: 'Codabar' },
];

export function getFormatName(format: unknown): string {
  if (!format) return 'Unknown';

  const str = String(format);

  if (ZXING_NUMERIC_MAP[str]) {
    return ZXING_NUMERIC_MAP[str];
  }

  const lower = str.toLowerCase().replace(/_/g, ' ');
  const match = STRING_PATTERNS.find((p) => lower.includes(p.keyword));

  return match?.label ?? str;
}
