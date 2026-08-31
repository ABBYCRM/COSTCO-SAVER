import { describe, expect, it } from 'vitest';
import { computeDealScore } from '@domain/deals/dealScore';
import { cents } from '@domain/money/cents';

describe('deals / dealScore', () => {
  it('returns 0-100 and the rating buckets', () => {
    const r = computeDealScore({
      currentPrice: cents(1997),
      historicalRegularPrice: cents(2999),
      confidence: 80,
      freshnessClass: 'LIVE',
      currentWarehousePrice: cents(1997),
      nearbyBestPrice: cents(2099),
    });
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
    expect(['Excellent Deal', 'Great Deal', 'Good Deal', 'Fair', 'Hold']).toContain(r.rating);
  });

  it('clearance + LIVE + high confidence yields Excellent', () => {
    const r = computeDealScore({
      currentPrice: cents(1997),
      historicalRegularPrice: cents(2999),
      confidence: 95,
      freshnessClass: 'LIVE',
      currentWarehousePrice: cents(1997),
      nearbyBestPrice: cents(2099),
    });
    // 23 (33% off) + 20 (clearance) + 19 (95% conf) + 15 (LIVE) + 8 (~5% cheaper) = 85 -> Excellent
    expect(r.score).toBeGreaterThanOrEqual(85);
    expect(r.rating).toBe('Excellent Deal');
  });

  it('missing historical price gives no historical discount', () => {
    const r = computeDealScore({
      currentPrice: cents(1997),
      confidence: 80,
      freshnessClass: 'LIVE',
      currentWarehousePrice: cents(1997),
    });
    expect(r.components.historicalDiscount).toBe(0);
  });
});
