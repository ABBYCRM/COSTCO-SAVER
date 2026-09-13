import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WarehouseRow } from '@services/api/warehouses';

interface WarehouseState {
  selected: WarehouseRow | null;
  setSelected: (w: WarehouseRow | null) => void;
}

/**
 * Persisted "remembered warehouse" (spec §10). Stored in localStorage on web
 * and in Capacitor's secure storage on native.
 */
export const useWarehouse = create<WarehouseState>()(
  persist(
    (set) => ({
      selected: null,
      setSelected: (w) => set({ selected: w }),
    }),
    { name: 'costco-saver.warehouse' },
  ),
);
