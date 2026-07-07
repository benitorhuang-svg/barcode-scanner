import { describe, expect, it } from 'vitest';
import {
  createScanCsv,
  createScanCsvPayload,
  createScanValuesText,
} from '../scan-export';

describe('scan export policy', () => {
  const entries = [
    { time: '09:00:01', format: 'QR', value: 'ABC-123' },
    { time: '09:00:02', format: 'CODE128', value: 'hello, "world"' },
  ];

  it('creates newline-separated scan values for clipboard copy', () => {
    expect(createScanValuesText(entries)).toBe('ABC-123\nhello, "world"');
  });

  it('creates escaped CSV rows with localized headers', () => {
    expect(createScanCsv(entries)).toBe(
      '"序號","時間","格式","條碼內容"\n' +
        '"2","09:00:01","QR","ABC-123"\n' +
        '"1","09:00:02","CODE128","hello, ""world"""',
    );
  });

  it('prefixes CSV payloads with a UTF-8 BOM for Excel compatibility', () => {
    expect(createScanCsvPayload(entries).startsWith('\uFEFF')).toBe(true);
  });
});
