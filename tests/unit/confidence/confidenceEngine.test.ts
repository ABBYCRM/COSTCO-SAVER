import { describe, expect, it } from 'vitest';
import { confidenceScore, confidenceLabel } from '@domain/confidence/confidenceEngine';

describe('confidence / confidenceEngine', () => {
  const now = new Date('2026-08-31T12:00:00Z');

  it('returns 0 when no evidence', () => {
    const score = confidenceScore({
      sources: [],
      independentConfirmationCount: 0,
      lastVerifiedAt: null,
      contributorReputation: 0,
      freshConflictCount: 0,
      now,
    });
    expect(score).toBe(0);
  });

  it('adds base evidence points', () => {
    const score = confidenceScore({
      sources: ['shelf_photo', 'barcode_same_session', 'costco_item_number'],
      independentConfirmationCount: 0,
      lastVerifiedAt: now,
      contributorReputation: 0,
      freshConflictCount: 0,
      now,
    });
    // 30 + 10 + 10 + 20 (LIVE) = 70
    expect(score).toBe(70);
  });

  it('caps confirmation points at 25', () => {
    const score = confidenceScore({
      sources: ['shelf_photo'],
      independentConfirmationCount: 100,
      lastVerifiedAt: now,
      contributorReputation: 0,
      freshConflictCount: 0,
      now,
    });
    // 30 + 25 (cap) + 20 (LIVE) = 75
    expect(score).toBe(75);
  });

  it('applies recency tiers', () => {
    const cases = [
      { hoursAgo: 0, expected: 20 },
      { hoursAgo: 6, expected: 20 },
      { hoursAgo: 12, expected: 16 },
      { hoursAgo: 48, expected: 10 },
      { hoursAgo: 96, expected: 4 },
      { hoursAgo: 240, expected: 0 },
    ];
    for (const c of cases) {
      const last = new Date(now.getTime() - c.hoursAgo * 60 * 60 * 1000);
      const score = confidenceScore({
        sources: ['manual_price_only'],
        independentConfirmationCount: 0,
        lastVerifiedAt: last,
        contributorReputation: 0,
        freshConflictCount: 0,
        now,
      });
      // 5 base + recency
      expect(score).toBe(5 + c.expected);
    }
  });

  it('subtracts fresh conflicts', () => {
    const score = confidenceScore({
      sources: ['shelf_photo', 'barcode_same_session'],
      independentConfirmationCount: 0,
      lastVerifiedAt: now,
      contributorReputation: 0,
      freshConflictCount: 1,
      now,
    });
    // 30 + 10 + 20 - 20 = 40
    expect(score).toBe(40);
  });

  it('subtracts two fresh conflicts (20 + 15)', () => {
    const score = confidenceScore({
      sources: ['shelf_photo'],
      independentConfirmationCount: 0,
      lastVerifiedAt: now,
      contributorReputation: 0,
      freshConflictCount: 2,
      now,
    });
    // 30 + 20 - 20 - 15 = 15
    expect(score).toBe(15);
  });

  it('clamps to [0, 100]', () => {
    const high = confidenceScore({
      sources: ['shelf_photo', 'receipt'],
      independentConfirmationCount: 100,
      lastVerifiedAt: now,
      contributorReputation: 100,
      freshConflictCount: 0,
      now,
    });
    expect(high).toBeLessThanOrEqual(100);

    const low = confidenceScore({
      sources: [],
      independentConfirmationCount: 0,
      lastVerifiedAt: now,
      contributorReputation: 0,
      freshConflictCount: 5,
      invalidPenalty: 100,
      now,
    });
    expect(low).toBeGreaterThanOrEqual(0);
  });

  it('confidenceLabel buckets sensibly', () => {
    expect(confidenceLabel(95)).toBe('Very High');
    expect(confidenceLabel(80)).toBe('High');
    expect(confidenceLabel(60)).toBe('Medium');
    expect(confidenceLabel(30)).toBe('Low');
    expect(confidenceLabel(5)).toBe('Very Low');
  });
});
