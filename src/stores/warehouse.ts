import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WarehouseRow } from '@services/api/warehouses';

interface WarehouseState {
  selected: WarehouseRow | null;
  setSelected: (warehouse: WarehouseRow | null) => void;
}

export const useWarehouse = create<WarehouseState>()(
  persist(
    (set) => ({
      selected: null,
      setSelected: (warehouse) => set({ selected: warehouse }),
    }),
    { name: 'costco-saver.warehouse' },
  ),
);
