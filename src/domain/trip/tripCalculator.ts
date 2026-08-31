/**
 * COSTCO-SAVER — Trip Mode calculator.
 * Spec §74, §75, §76.
 *
 * For a shopping list and a candidate warehouse:
 *   - Count how many list items have a recent verified price at that warehouse
 *   - Sum the basket total using the latest consensus price
 *   - Return how many products are missing, never fabricate a price
 */

import type { Cents } from '@domain/money/cents';
import { cents, sumCents } from '@domain/money/cents';

export interface TripListItem {
  productId: string;
  quantity: number;
}

export interface WarehousePricePoint {
  productId: string;
  priceCents: Cents;
  freshness: 'LIVE' | 'FRESH' | 'RECENT' | 'AGING' | 'HISTORICAL';
  lastVerifiedAt: Date | string | null;
}

export interface TripEstimate {
  readonly itemsTotal: number; // list length
  readonly itemsPriced: number;
  readonly itemsMissing: number;
  readonly estimatedBasketCents: Cents;
  readonly pricedProductIds: readonly string[];
  readonly missingProductIds: readonly string[];
}

export function estimateTrip(
  list: readonly TripListItem[],
  prices: readonly WarehousePricePoint[],
  now: Date = new Date(),
): TripEstimate {
  const priceMap = new Map<string, WarehousePricePoint>();
  for (const p of prices) {
    // Prefer the freshest point per product at this warehouse.
    const existing = priceMap.get(p.productId);
    if (!existing) {
      priceMap.set(p.productId, p);
      continue;
    }
    const existingAge = ageOf(existing.lastVerifiedAt, now);
    const newAge = ageOf(p.lastVerifiedAt, now);
    if (newAge < existingAge) {
      priceMap.set(p.productId, p);
    }
  }

  const pricedProductIds: string[] = [];
  const missingProductIds: string[] = [];
  const basket: Cents[] = [];

  for (const item of list) {
    const point = priceMap.get(item.productId);
    if (point) {
      pricedProductIds.push(item.productId);
      const qty = Math.max(1, item.quantity);
      for (let i = 0; i < qty; i++) basket.push(point.priceCents);
    } else {
      missingProductIds.push(item.productId);
    }
  }

  return {
    itemsTotal: list.length,
    itemsPriced: pricedProductIds.length,
    itemsMissing: missingProductIds.length,
    estimatedBasketCents: sumCents(basket),
    pricedProductIds,
    missingProductIds,
  };
}

function ageOf(lastVerifiedAt: Date | string | null, now: Date): number {
  if (!lastVerifiedAt) return Number.POSITIVE_INFINITY;
  const d = typeof lastVerifiedAt === 'string' ? new Date(lastVerifiedAt) : lastVerifiedAt;
  if (Number.isNaN(d.getTime())) return Number.POSITIVE_INFINITY;
  return now.getTime() - d.getTime();
}

export function rankWarehousesByTrip(
  list: readonly TripListItem[],
  warehousePrices: ReadonlyMap<string, readonly WarehousePricePoint[]>,
  now: Date = new Date(),
): Array<{ warehouseId: string; estimate: TripEstimate }> {
  const out: Array<{ warehouseId: string; estimate: TripEstimate }> = [];
  for (const [warehouseId, prices] of warehousePrices) {
    out.push({ warehouseId, estimate: estimateTrip(list, prices, now) });
  }
  // Sort: more priced items first, then lower basket total.
  out.sort((a, b) => {
    if (a.estimate.itemsPriced !== b.estimate.itemsPriced) {
      return b.estimate.itemsPriced - a.estimate.itemsPriced;
    }
    return (a.estimate.estimatedBasketCents as number) - (b.estimate.estimatedBasketCents as number);
  });
  return out;
}

// Re-export so feature code can import from a single module if needed.
export { cents };
