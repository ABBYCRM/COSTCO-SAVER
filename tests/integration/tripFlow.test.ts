import { describe, expect, it } from 'vitest';
import { estimateTrip, rankWarehousesByTrip, type TripListItem, type WarehousePricePoint } from '@domain/trip/tripCalculator';
import { cents } from '@domain/money/cents';
import { confidenceScore } from '@domain/confidence/confidenceEngine';
import { classifyPriceCode } from '@domain/pricing/priceCodeEngine';

/**
 * End-to-end Trip Mode flow.
 * Demonstrates that a shopping list with deterministic prices, a markdown
 * signal, and a confidence score produce a meaningful basket estimate and
 * a warehouse ranking.
 */
describe('integration / trip flow', () => {
  const now = new Date('2026-08-31T12:00:00Z');

  it('rank warehouses for a list using real domain logic', () => {
    const list: TripListItem[] = [
      { productId: 'paper-towels', quantity: 1 },
      { productId: 'eggs', quantity: 2 },
      { productId: 'milk', quantity: 1 },
      { productId: 'avocado-oil', quantity: 1 },
    ];

    const yonkersPrices: WarehousePricePoint[] = [
      { productId: 'paper-towels', priceCents: cents(1997), freshness: 'LIVE', lastVerifiedAt: now },
      { productId: 'eggs', priceCents: cents(499),   freshness: 'LIVE', lastVerifiedAt: now },
      { productId: 'milk', priceCents: cents(349),   freshness: 'LIVE', lastVerifiedAt: now },
    ];
    const newRochellePrices: WarehousePricePoint[] = [
      { productId: 'paper-towels', priceCents: cents(2097), freshness: 'LIVE', lastVerifiedAt: now },
      { productId: 'eggs', priceCents: cents(449),   freshness: 'LIVE', lastVerifiedAt: now },
      { productId: 'milk', priceCents: cents(349),   freshness: 'LIVE', lastVerifiedAt: now },
      { productId: 'avocado-oil', priceCents: cents(1499), freshness: 'LIVE', lastVerifiedAt: now },
    ];

    const map = new Map<string, WarehousePricePoint[]>([
      ['yonkers', yonkersPrices],
      ['new-rochelle', newRochellePrices],
    ]);

    const ranked = rankWarehousesByTrip(list, map, now);
    // New Rochelle has all 4 priced; Yonkers has 3 priced.
    expect(ranked[0]?.warehouseId).toBe('new-rochelle');
    expect(ranked[0]?.estimate.itemsPriced).toBe(4);
    expect(ranked[0]?.estimate.itemsMissing).toBe(0);
    expect(ranked[0]?.estimate.estimatedBasketCents).toBe(2097 + 449 * 2 + 349 + 1499);

    expect(ranked[1]?.warehouseId).toBe('yonkers');
    expect(ranked[1]?.estimate.itemsPriced).toBe(3);
    expect(ranked[1]?.estimate.itemsMissing).toBe(1);
    expect(ranked[1]?.estimate.estimatedBasketCents).toBe(1997 + 499 * 2 + 349);
  });

  it('markdown and confidence flow from observation to basket label', () => {
    const price = cents(1997);
    const code = classifyPriceCode({ priceCents: price, hasAsterisk: false });
    const conf = confidenceScore({
      sources: ['shelf_photo', 'barcode_same_session'],
      independentConfirmationCount: 2,
      lastVerifiedAt: now,
      contributorReputation: 60,
      freshConflictCount: 0,
      now,
    });
    // Markdown engine + confidence engine must be deterministic and agree.
    expect(code.classification).toBe('clearance');
    // 30 (shelf) + 10 (barcode) + 8 + 7 (confirmations) + 20 (LIVE) + 6 (rep) = 81
    expect(conf).toBeGreaterThanOrEqual(70);

    const list: TripListItem[] = [{ productId: 'p1', quantity: 1 }];
    const e = estimateTrip(list, [{
      productId: 'p1',
      priceCents: price,
      freshness: 'LIVE',
      lastVerifiedAt: now,
    }], now);
    expect(e.estimatedBasketCents).toBe(1997);
    expect(e.itemsPriced).toBe(1);
  });
});
