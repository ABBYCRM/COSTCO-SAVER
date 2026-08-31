import { describe, expect, it } from 'vitest';
import {
  addCents,
  cents,
  computeSavingsCents,
  formatUSD,
  fromMajorUnits,
  mulCents,
  percentChange,
  subCents,
  sumCents,
  toMajorUnits,
} from '@domain/money/cents';

describe('money / cents', () => {
  it('rejects non-integers', () => {
    expect(() => cents(19.99)).toThrow();
    expect(() => cents(NaN)).toThrow();
  });

  it('rejects negative values', () => {
    expect(() => cents(-1)).toThrow();
  });

  it('fromMajorUnits rounds correctly', () => {
    expect(fromMajorUnits(19.99)).toBe(1999);
    expect(fromMajorUnits(0)).toBe(0);
    expect(fromMajorUnits(0.005)).toBe(1); // 0.5 rounds up
    expect(fromMajorUnits(0.004)).toBe(0);
  });

  it('adds / subtracts / multiplies without floats leaking', () => {
    const a = cents(1999);
    const b = cents(299);
    expect(addCents(a, b)).toBe(2298);
    expect(subCents(a, b)).toBe(1700);
    expect(mulCents(a, 2)).toBe(3998);
    expect(mulCents(a, 0.5)).toBe(1000);
  });

  it('sumCents returns 0 for empty', () => {
    expect(sumCents([])).toBe(0);
  });

  it('computeSavingsCents returns 0 when current is more expensive', () => {
    expect(computeSavingsCents(cents(1999), cents(2099))).toBe(0);
  });

  it('computeSavingsCents returns positive delta when current is cheaper', () => {
    expect(computeSavingsCents(cents(2999), cents(1997))).toBe(1002);
  });

  it('formatUSD produces locale-correct currency', () => {
    expect(formatUSD(cents(1997))).toBe('$19.97');
    expect(formatUSD(cents(0))).toBe('$0.00');
  });

  it('toMajorUnits', () => {
    expect(toMajorUnits(cents(1997))).toBe(19.97);
  });

  it('percentChange', () => {
    expect(percentChange(cents(2999), cents(1997))).toBeCloseTo(-33.41, 1);
    expect(percentChange(cents(0), cents(100))).toBe(0);
  });
});
