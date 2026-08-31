import { describe, expect, it } from 'vitest';
import { estimateTrip, rankWarehousesByTrip, type TripListItem, type WarehousePricePoint } from '@domain/trip/tripCalculator';
import { cents } from '@domain/money/cents';

const now = new Date('2026-08-31T12:00:00Z');

describe('trip / tripCalculator', () => {
  it('counts priced and missing items without fabricating prices', () => {
    const list: TripListItem[] = [
      { productId: 'p1', quantity: 1 },
      { productId: 'p2', quantity: 2 },
      { productId: 'p3', quantity: 1 },
    ];
    const prices: WarehousePricePoint[] = [
      { productId: 'p1', priceCents: cents(1997), freshness: 'LIVE', lastVerifiedAt: now },
      { productId: 'p2', priceCents: cents(299), freshness: 'LIVE', lastVerifiedAt: now },
    ];
    const e = estimateTrip(list, prices, now);
    expect(e.itemsTotal).toBe(3);
    expect(e.itemsPriced).toBe(2);
    expect(e.itemsMissing).toBe(1);
    // 1997 + 299 + 299 = 2595
    expect(e.estimatedBasketCents).toBe(2595);
    expect(e.missingProductIds).toEqual(['p3']);
  });

  it('picks the freshest price when duplicates exist', () => {
    const list: TripListItem[] = [{ productId: 'p1', quantity: 1 }];
    const prices: WarehousePricePoint[] = [
      { productId: 'p1', priceCents: cents(1997), freshness: 'LIVE', lastVerifiedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000) },
      { productId: 'p1', priceCents: cents(2097), freshness: 'LIVE', lastVerifiedAt: new Date(now.getTime() - 30 * 60_000) },
    ];
    const e = estimateTrip(list, prices, now);
    // The 30-minute-old price wins.
    expect(e.estimatedBasketCents).toBe(2097);
  });

  it('ranks warehouses by more-priced then lower total', () => {
    const list: TripListItem[] = [
      { productId: 'p1', quantity: 1 },
      { productId: 'p2', quantity: 1 },
      { productId: 'p3', quantity: 1 },
    ];
    const map = new Map<string, WarehousePricePoint[]>([
      ['A', [
        { productId: 'p1', priceCents: cents(1997), freshness: 'LIVE', lastVerifiedAt: now },
        { productId: 'p2', priceCents: cents(2099), freshness: 'LIVE', lastVerifiedAt: now },
      ]],
      ['B', [
        { productId: 'p1', priceCents: cents(1899), freshness: 'LIVE', lastVerifiedAt: now },
        { productId: 'p2', priceCents: cents(1999), freshness: 'LIVE', lastVerifiedAt: now },
        { productId: 'p3', priceCents: cents(999),  freshness: 'LIVE', lastVerifiedAt: now },
      ]],
    ]);
    const ranked = rankWarehousesByTrip(list, map, now);
    // B has 3 priced, A has 2 priced → B first
    expect(ranked[0]?.warehouseId).toBe('B');
    expect(ranked[0]?.estimate.itemsPriced).toBe(3);
    expect(ranked[1]?.warehouseId).toBe('A');
    expect(ranked[1]?.estimate.itemsPriced).toBe(2);
  });
});
