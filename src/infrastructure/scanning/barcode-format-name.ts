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
  normalizedKeyword: string;
  label: string;
}

const STRING_PATTERNS: FormatPattern[] = [
  { normalizedKeyword: '128', label: 'Code 128' },
  { normalizedKeyword: '39', label: 'Code 39' },
  { normalizedKeyword: '93', label: 'Code 93' },
  { normalizedKeyword: 'ean13', label: 'EAN-13' },
  { normalizedKeyword: 'ean8', label: 'EAN-8' },
  { normalizedKeyword: 'qr', label: 'QR Code' },
  { normalizedKeyword: 'upca', label: 'UPC-A' },
  { normalizedKeyword: 'upce', label: 'UPC-E' },
  { normalizedKeyword: 'itf', label: 'ITF' },
  { normalizedKeyword: 'codabar', label: 'Codabar' },
];

export function getFormatName(format: unknown): string {
  if (!format) return 'Unknown';

  const str = String(format);

  if (ZXING_NUMERIC_MAP[str]) {
    return ZXING_NUMERIC_MAP[str];
  }

  const normalized = str.toLowerCase().replace(/[\s_-]/g, '');
  const match = STRING_PATTERNS.find(pattern =>
    normalized.includes(pattern.normalizedKeyword),
  );

  return match?.label ?? str;
}
