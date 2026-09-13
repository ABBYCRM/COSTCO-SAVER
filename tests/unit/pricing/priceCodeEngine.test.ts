import { describe, expect, it } from 'vitest';
import { classifyPriceCode, MARKDOWN_EXPLANATIONS } from '@domain/pricing/priceCodeEngine';

describe('pricing / priceCodeEngine', () => {
  it('classifies .97 as clearance', () => {
    const r = classifyPriceCode({ priceCents: 1997 });
    expect(r.ending).toBe('97');
    expect(r.classification).toBe('clearance');
    expect(r.signals).toContain('ending_97');
    expect(r.hasAsterisk).toBe(false);
  });

  it('classifies .00 as manager_markdown', () => {
    const r = classifyPriceCode({ priceCents: 2900 });
    expect(r.classification).toBe('manager_markdown');
    expect(r.signals).toContain('ending_00');
  });

  it('classifies .88 as manager_markdown', () => {
    const r = classifyPriceCode({ priceCents: 2588 });
    expect(r.classification).toBe('manager_markdown');
    expect(r.signals).toContain('ending_88');
  });

  it('classifies .99 as regular_signal', () => {
    const r = classifyPriceCode({ priceCents: 1999 });
    expect(r.classification).toBe('regular_signal');
    expect(r.signals).toContain('ending_99');
  });

  it('treats asterisk as an independent signal', () => {
    const r = classifyPriceCode({ priceCents: 1997, hasAsterisk: true });
    expect(r.classification).toBe('clearance');
    expect(r.hasAsterisk).toBe(true);
    expect(r.signals).toContain('has_asterisk');
    expect(r.signals).toContain('ending_97');
  });

  it('does not invent a classification for unsupported endings', () => {
    const r = classifyPriceCode({ priceCents: 1234 });
    expect(r.classification).toBe('unclassified');
    expect(r.signals).toContain('unclassified_ending');
  });

  it('rejects negative or non-integer cents', () => {
    expect(() => classifyPriceCode({ priceCents: -1 })).toThrow();
    expect(() => classifyPriceCode({ priceCents: 19.99 })).toThrow();
  });

  it('returns a static, deterministic explanation for each classification', () => {
    expect(MARKDOWN_EXPLANATIONS.clearance).toMatch(/clearance/i);
    expect(MARKDOWN_EXPLANATIONS.manager_markdown).toMatch(/manager/i);
    expect(MARKDOWN_EXPLANATIONS.regular_signal).toMatch(/regular/i);
    expect(MARKDOWN_EXPLANATIONS.unclassified).toMatch(/not a recognized/i);
  });
});
