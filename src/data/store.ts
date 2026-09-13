/**
 * Local-first zustand store for COSTCO-SAVER.
 *
 * In offline mode (no Supabase env vars), this store is the source of truth
 * and is seeded with realistic Costco data so the entire app is usable.
 *
 * Persists to localStorage on web and Capacitor Preferences on native via
 * the standard zustand/middleware persist adapter.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  BASKET_PRESETS,
  DEMO_HANDLES,
  HEALTH,
  OBSERVATIONS,
  PRODUCTS,
  RECEIPTS,
  WAREHOUSES,
  WATCHES,
} from './seed';
import type {
  BasketPreset,
  MarkdownClass,
  Observation,
  Product,
  Receipt,
  Warehouse,
  WarehouseHealth,
  Watch,
} from './types';

export interface AppState {
  // Catalog (seeded, read-only in offline mode)
  warehouses: Warehouse[];
  products: Product[];
  observations: Observation[];
  watches: Watch[];
  receipts: Receipt[];
  health: WarehouseHealth[];
  basketPresets: BasketPreset[];

  // User session
  selectedWarehouseId: string | null;
  handle: string; // anonymous community handle

  // Settings
  notifications: boolean;
  preferredCurrency: 'USD';

  // Derived selectors live in selectors.ts — store only mutates state.

  // Mutators
  setWarehouse: (id: string) => void;
  addObservation: (o: Omit<Observation, 'id' | 'submitted_at'>) => void;
  addWatch: (productId: string, targetCents: number) => void;
  removeWatch: (id: string) => void;
  toggleNotifications: () => void;
  setHandle: (h: string) => void;
  resetToSeed: () => void;
}

const now = () => new Date().toISOString();

const defaultState = {
  warehouses: WAREHOUSES,
  products: PRODUCTS,
  observations: OBSERVATIONS,
  watches: WATCHES,
  receipts: RECEIPTS,
  health: HEALTH,
  basketPresets: BASKET_PRESETS,
  selectedWarehouseId: 'wh_1115',
  handle: 'guest_' + Math.random().toString(36).slice(2, 7),
  notifications: true,
  preferredCurrency: 'USD' as const,
};

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      ...defaultState,
      setWarehouse: (id) => set({ selectedWarehouseId: id }),
      addObservation: (o) =>
        set((s) => ({
          observations: [
            ...s.observations,
            {
              ...o,
              id: `obs_local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              submitted_at: now(),
            },
          ],
        })),
      addWatch: (productId, targetCents) =>
        set((s) => {
          const current =
            s.observations
              .filter((o) => o.warehouse_id === s.selectedWarehouseId && o.product_id === productId)
              .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at))[0]?.price_cents ??
            targetCents;
          return {
            watches: [
              ...s.watches,
              {
                id: `w_local_${Date.now()}`,
                product_id: productId,
                target_cents: targetCents,
                current_cents: current,
                created_at: now(),
                triggered: false,
              },
            ],
          };
        }),
      removeWatch: (id) =>
        set((s) => ({
          watches: s.watches.filter((w) => w.id !== id),
        })),
      toggleNotifications: () =>
        set((s) => ({ notifications: !s.notifications })),
      setHandle: (h) => set({ handle: h }),
      resetToSeed: () => set({ ...defaultState }),
    }),
    {
      name: 'costco-saver.app',
      version: 2,
    },
  ),
);

/** Helper: random handle from seed pool */
export function pickRandomHandle(): string {
  return DEMO_HANDLES[Math.floor(Math.random() * DEMO_HANDLES.length)]!;
}

/** Helper: markdown → color class */
export function markdownClassLabel(c: MarkdownClass): string {
  switch (c) {
    case 'asterisk':
      return '* markdown';
    case 'manager_special':
      return 'manager cut';
    case 'clearance':
      return 'clearance';
    case 'fresh_cut':
      return 'fresh cut';
    case 'none':
      return 'regular';
  }
}

export function markdownClassColor(c: MarkdownClass): string {
  switch (c) {
    case 'asterisk':
      return '#FBBF24';
    case 'manager_special':
      return '#F472B6';
    case 'clearance':
      return '#EF4444';
    case 'fresh_cut':
      return '#34D399';
    case 'none':
      return '#6B7280';
  }
}

export function freshnessLabel(c: Observation['freshness_class']): string {
  return c[0]!.toUpperCase() + c.slice(1);
}

export function freshnessColor(c: Observation['freshness_class']): string {
  switch (c) {
    case 'fresh':
      return '#34D399';
    case 'recent':
      return '#60A5FA';
    case 'aging':
      return '#FBBF24';
    case 'stale':
      return '#F87171';
    case 'expired':
      return '#6B7280';
  }
}
