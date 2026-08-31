import { describe, expect, it } from 'vitest';
import { computeWarehouseHealth } from '@domain/health/warehouseHealth';

describe('health / warehouseHealth', () => {
  it('caps each component and never fabricates', () => {
    const r = computeWarehouseHealth({
      activeObservedProducts: 0,
      medianObservationAgeHours: 0,
      distinctContributorsLast30d: 0,
      conflictRatio: 0,
      evidenceRatio: 0,
      dailyVerificationVolume7d: 0,
    });
    // When no data exists, freshness is maxed (no age to penalize) but
    // coverage / contributors / volume are 0, so the score reflects "we
    // have no data yet" rather than fabricating activity.
    expect(r.label).toBe('Building coverage');
    expect(r.components.coverage).toBe(0);
    expect(r.components.contributor).toBe(0);
    expect(r.components.volume).toBe(0);
  });

  it('labels Excellent when score >= 80', () => {
    const r = computeWarehouseHealth({
      activeObservedProducts: 2000,
      medianObservationAgeHours: 1,
      distinctContributorsLast30d: 100,
      conflictRatio: 0.01,
      evidenceRatio: 1,
      dailyVerificationVolume7d: 100,
    });
    // 25 + 25 + 20 + 15 + 10 + 5 = 100 (capped)
    expect(r.score).toBeGreaterThanOrEqual(80);
    expect(r.label).toBe('Excellent coverage');
  });

  it('rewards lower conflict ratios', () => {
    const low = computeWarehouseHealth({
      activeObservedProducts: 500,
      medianObservationAgeHours: 12,
      distinctContributorsLast30d: 25,
      conflictRatio: 0,
      evidenceRatio: 0.5,
      dailyVerificationVolume7d: 25,
    });
    const high = computeWarehouseHealth({
      activeObservedProducts: 500,
      medianObservationAgeHours: 12,
      distinctContributorsLast30d: 25,
      conflictRatio: 0.2,
      evidenceRatio: 0.5,
      dailyVerificationVolume7d: 25,
    });
    expect(low.score).toBeGreaterThan(high.score);
  });
});
