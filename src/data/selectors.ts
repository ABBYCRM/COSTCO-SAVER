/**
 * Derived selectors for the COSTCO-SAVER app state.
 *
 * Centralized so screens stay presentational — they pull these helpers
 * off the store and render.
 */

import { useApp } from './store';
import type {
  MarkdownClass,
  Observation,
  Product,
  Warehouse,
} from './types';
import { markdownClassColor, freshnessColor } from './store';

/** Active warehouse (returns null if not set) */
export function useSelectedWarehouse(): Warehouse | null {
  const id = useApp((s) => s.selectedWarehouseId);
  const warehouses = useApp((s) => s.warehouses);
  return warehouses.find((w) => w.id === id) ?? warehouses[0] ?? null;
}

/** Get the latest observation for a product at the active warehouse */
export function latestObservationFor(
  observations: Observation[],
  productId: string,
  warehouseId: string,
): Observation | null {
  return (
    observations
      .filter((o) => o.product_id === productId && o.warehouse_id === warehouseId)
      .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at))[0] ?? null
  );
}

/** Get the latest observation across all warehouses (for cross-warehouse compare) */
export function latestPerWarehouse(
  observations: Observation[],
  productId: string,
): Array<Observation & { warehouse: Warehouse | undefined }> {
  const warehouses = useApp.getState().warehouses;
  return warehouses
    .map((w) => {
      const o = latestObservationFor(observations, productId, w.id);
      return o ? { ...o, warehouse: w } : null;
    })
    .filter((x): x is Observation & { warehouse: Warehouse } => x !== null);
}

/** Get all products that have a markdown at the active warehouse */
export function activeDrops(): Array<{
  product: Product;
  observation: Observation;
}> {
  const { products, observations, selectedWarehouseId } = useApp.getState();
  if (!selectedWarehouseId) return [];
  return observations
    .filter(
      (o) =>
        o.warehouse_id === selectedWarehouseId && o.markdown_class !== 'none',
    )
    .map((o) => ({
      product: products.find((p) => p.id === o.product_id)!,
      observation: o,
    }))
    .filter((x) => x.product)
    .sort((a, b) => {
      // Freshest first, then lowest confidence last (more interesting)
      if (a.observation.freshness_class !== b.observation.freshness_class) {
        const order = { fresh: 0, recent: 1, aging: 2, stale: 3, expired: 4 } as const;
        return order[a.observation.freshness_class] - order[b.observation.freshness_class];
      }
      return a.observation.price_cents - b.observation.price_cents;
    });
}

/** All deals across all warehouses (for the Deals tab) */
export function allDeals(): Array<{ product: Product; observation: Observation; warehouse: Warehouse }> {
  const { products, observations, warehouses } = useApp.getState();
  return observations
    .filter((o) => o.markdown_class !== 'none')
    .map((o) => ({
      product: products.find((p) => p.id === o.product_id)!,
      observation: o,
      warehouse: warehouses.find((w) => w.id === o.warehouse_id)!,
    }))
    .filter((x) => x.product && x.warehouse);
}

/** Filter deals by markdown class */
export function dealsByMarkdown(filter: MarkdownClass | 'all'): Array<{
  product: Product;
  observation: Observation;
  warehouse: Warehouse;
}> {
  const deals = allDeals();
  if (filter === 'all') return deals;
  return deals.filter((d) => d.observation.markdown_class === filter);
}

/** Format cents as $X.XX */
export function formatCents(cents: number): string {
  const dollars = Math.floor(cents / 100);
  const remainder = cents % 100;
  return `$${dollars.toLocaleString('en-US')}.${remainder.toString().padStart(2, '0')}`;
}

/** Format cents compactly ($1.2K, $3.5K) */
export function formatCentsCompact(cents: number): string {
  if (cents < 10000) return formatCents(cents);
  const dollars = cents / 100;
  if (dollars < 1000) return `$${dollars.toFixed(2)}`;
  return `$${(dollars / 1000).toFixed(1)}K`;
}

/** Get markdown badge string */
export function markdownBadge(m: MarkdownClass): string {
  switch (m) {
    case 'asterisk':
      return '*';
    case 'manager_special':
      return 'MGR';
    case 'clearance':
      return 'CLR';
    case 'fresh_cut':
      return 'FRESH';
    case 'none':
      return '';
  }
}

/** Get markdown badge color */
export function markdownBadgeColor(m: MarkdownClass): string {
  return markdownClassColor(m);
}

/** Get freshness dot color */
export function freshnessDotColor(f: Observation['freshness_class']): string {
  return freshnessColor(f);
}

/** Build a 14-day price sparkline for a product at the active warehouse */
export function priceHistory(
  observations: Observation[],
  productId: string,
  warehouseId: string,
): Array<{ day: number; priceCents: number; markdown: MarkdownClass }> {
  const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const filtered = observations
    .filter(
      (o) =>
        o.product_id === productId &&
        o.warehouse_id === warehouseId &&
        new Date(o.submitted_at).getTime() >= cutoff,
    )
    .sort((a, b) => a.submitted_at.localeCompare(b.submitted_at));
  // Synthesize a 14-point sparkline if we have fewer
  if (filtered.length === 0) {
    return Array.from({ length: 14 }, (_, i) => ({
      day: i,
      priceCents: 0,
      markdown: 'none' as MarkdownClass,
    }));
  }
  // Bucket by day
  const buckets: Map<number, Observation> = new Map();
  for (const o of filtered) {
    const day = Math.floor((Date.now() - new Date(o.submitted_at).getTime()) / (24 * 60 * 60 * 1000));
    if (!buckets.has(day)) buckets.set(day, o);
  }
  const arr: Array<{ day: number; priceCents: number; markdown: MarkdownClass }> = [];
  for (let i = 13; i >= 0; i--) {
    const o = buckets.get(i);
    if (o) {
      arr.push({ day: i, priceCents: o.price_cents, markdown: o.markdown_class });
    } else {
      // forward-fill from nearest prior bucket
      const prior = Array.from(buckets.entries())
        .filter(([d]) => d < i)
        .sort((a, b) => b[0] - a[0])[0];
      if (prior) {
        arr.push({ day: i, priceCents: prior[1].price_cents, markdown: prior[1].markdown_class });
      } else {
        arr.push({ day: i, priceCents: 0, markdown: 'none' });
      }
    }
  }
  return arr;
}

/** Calculate distance in miles between two warehouses (haversine) */
export function distanceMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 3958.8; // mi
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Sum receipt totals in cents */
export function totalSpentCents(): number {
  return useApp.getState().receipts.reduce((s, r) => s + r.total_cents, 0);
}

/** Count observations the user submitted (in offline mode we use all) */
export function observationCount(): number {
  return useApp.getState().observations.length;
}

/** Estimated savings from watchlist hits */
export function watchlistSavingsCents(): number {
  const { watches } = useApp.getState();
  let total = 0;
  for (const w of watches) {
    if (w.triggered) total += w.current_cents - w.target_cents;
  }
  return Math.max(0, total);
}
