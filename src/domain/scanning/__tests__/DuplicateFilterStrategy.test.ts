import { describe, it, expect } from 'vitest';
import { DuplicateFilterStrategy } from '../DuplicateFilterStrategy';
import { BarcodeData } from '../BarcodeData';

describe('DuplicateFilterStrategy', () => {
  it('should not filter out if strategy is disabled', () => {
    const strategy = new DuplicateFilterStrategy({ enabled: false, cooldownMs: 5000 });
    const barcode = new BarcodeData('12345', 'QR');
    
    const prev = { barcode, timestamp: 1000 };
    const current = { barcode, timestamp: 2000 }; // Same barcode, within cooldown
    
    expect(strategy.isDuplicate(prev, current)).toBe(false);
  });

  it('should not filter out if there is no previous scan', () => {
    const strategy = new DuplicateFilterStrategy({ enabled: true, cooldownMs: 5000 });
    const barcode = new BarcodeData('12345', 'QR');
    
    const current = { barcode, timestamp: 2000 };
    
    expect(strategy.isDuplicate(null, current)).toBe(false);
  });

  it('should filter out duplicate scans within cooldown period', () => {
    const strategy = new DuplicateFilterStrategy({ enabled: true, cooldownMs: 5000 });
    const barcode = new BarcodeData('12345', 'QR');
    
    const prev = { barcode, timestamp: 1000 };
    const current = { barcode, timestamp: 3000 }; // 2 seconds later
    
    expect(strategy.isDuplicate(prev, current)).toBe(true);
  });

  it('should not filter out duplicate scans after cooldown period', () => {
    const strategy = new DuplicateFilterStrategy({ enabled: true, cooldownMs: 5000 });
    const barcode = new BarcodeData('12345', 'QR');
    
    const prev = { barcode, timestamp: 1000 };
    const current = { barcode, timestamp: 7000 }; // 6 seconds later
    
    expect(strategy.isDuplicate(prev, current)).toBe(false);
  });

  it('should not filter out different barcodes even within cooldown period', () => {
    const strategy = new DuplicateFilterStrategy({ enabled: true, cooldownMs: 5000 });
    const barcode1 = new BarcodeData('12345', 'QR');
    const barcode2 = new BarcodeData('67890', 'QR');
    
    const prev = { barcode: barcode1, timestamp: 1000 };
    const current = { barcode: barcode2, timestamp: 2000 }; // 1 second later
    
    expect(strategy.isDuplicate(prev, current)).toBe(false);
  });

  it('should not filter out barcodes with same text but different formats', () => {
    const strategy = new DuplicateFilterStrategy({ enabled: true, cooldownMs: 5000 });
    const barcode1 = new BarcodeData('12345', 'QR');
    const barcode2 = new BarcodeData('12345', 'CODE128');
    
    const prev = { barcode: barcode1, timestamp: 1000 };
    const current = { barcode: barcode2, timestamp: 2000 };
    
    expect(strategy.isDuplicate(prev, current)).toBe(false);
  });
});
