import { describe, expect, it } from 'vitest';
import {
  computeCheckDigit,
  isValidEan13,
  isValidEan8,
  isValidGtin14,
  isValidUpcA,
  normalizeBarcode,
} from '@domain/barcodes/normalizeBarcode';

describe('barcode / normalizeBarcode', () => {
  it('computes the correct UPC-A check digit for 012345678905', () => {
    // 0-1-2-3-4-5-6-7-8-9-0 is a well-known UPC-A body; the canonical check digit is 5.
    expect(computeCheckDigit('01234567890')).toBe(5);
  });

  it('validates a known-good UPC-A (012345678905)', () => {
    expect(isValidUpcA('012345678905')).toBe(true);
  });

  it('rejects a known-bad UPC-A', () => {
    expect(isValidUpcA('012345678900')).toBe(false);
  });

  it('validates EAN-13', () => {
    expect(isValidEan13('4006381333931')).toBe(true);
    expect(isValidEan13('4006381333930')).toBe(false);
  });

  it('validates EAN-8', () => {
    expect(isValidEan8('73513537')).toBe(true);
    expect(isValidEan8('73513530')).toBe(false);
  });

  it('validates GTIN-14', () => {
    expect(isValidGtin14('10012345678902')).toBe(true);
    expect(isValidGtin14('10012345678900')).toBe(false);
  });

  it('normalizes UPC-A to EAN-13 (left-pad 0)', () => {
    const n = normalizeBarcode('012345678905');
    expect(n.kind).toBe('UPC_A');
    expect(n.checkDigitValid).toBe(true);
    expect(n.value).toBe('0012345678905');
  });

  it('normalizes EAN-13 keeping length', () => {
    const n = normalizeBarcode('4006381333931');
    expect(n.kind).toBe('EAN_13');
    expect(n.checkDigitValid).toBe(true);
    expect(n.value).toBe('4006381333931');
  });

  it('normalizes EAN-8 keeping length', () => {
    const n = normalizeBarcode('73513537');
    expect(n.kind).toBe('EAN_8');
    expect(n.checkDigitValid).toBe(true);
    expect(n.value).toBe('73513537');
  });

  it('returns empty value when check digit is wrong but still identifies the kind', () => {
    const n = normalizeBarcode('012345678900');
    expect(n.kind).toBe('UPC_A');
    expect(n.checkDigitValid).toBe(false);
    expect(n.value).toBe('');
  });

  it('passes through Costco item numbers without forcing them to be a barcode', () => {
    const n = normalizeBarcode('1234567');
    expect(n.kind).toBe('UNKNOWN');
    expect(n.value).toBe('1234567');
    expect(n.checkDigitValid).toBe(false);
  });

  it('strips spaces and dashes from the input', () => {
    const n = normalizeBarcode('0 12345 67890 5');
    expect(n.kind).toBe('UPC_A');
    expect(n.checkDigitValid).toBe(true);
    expect(n.value).toBe('0012345678905');
    expect(n.display).toBe('0 12345 67890 5');
  });
});
