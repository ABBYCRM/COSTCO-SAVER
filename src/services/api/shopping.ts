import { apiFetch } from './client';

export interface ShoppingItem {
  id: string;
  product_id: string;
  quantity: number;
  note: string | null;
  preferred_warehouse_id: string | null;
  checked: boolean;
  canonical_name: string;
  brand: string | null;
  preferred_warehouse_name: string | null;
}

export interface TripWarehouse {
  warehouse_id: string;
  warehouse_name: string;
  list_items: number;
  priced_items: number;
  known_basket_cents: number;
  newest_price_at: string | null;
}

export async function listShoppingItems(): Promise<ShoppingItem[]> {
  const result = await apiFetch<{ items: ShoppingItem[] }>('/api/v1/shopping-list');
  return result.items;
}

export async function saveShoppingItem(input: {
  productId: string;
  quantity?: number;
  note?: string | null;
  preferredWarehouseId?: string | null;
}): Promise<ShoppingItem> {
  const result = await apiFetch<{ item: ShoppingItem }>('/api/v1/shopping-list', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return result.item;
}

export async function updateShoppingItem(
  id: string,
  input: {
    checked?: boolean;
    quantity?: number;
    note?: string | null;
  },
): Promise<ShoppingItem> {
  const result = await apiFetch<{ item: ShoppingItem }>(`/api/v1/shopping-list/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return result.item;
}

export async function deleteShoppingItem(id: string): Promise<void> {
  await apiFetch(`/api/v1/shopping-list/${id}`, { method: 'DELETE' });
}

export async function compareTrip(warehouseIds: string[]): Promise<TripWarehouse[]> {
  const params = new URLSearchParams();
  for (const id of warehouseIds) params.append('warehouseId', id);
  const result = await apiFetch<{ warehouses: TripWarehouse[] }>(
    `/api/v1/trip-comparison?${params.toString()}`,
  );
  return result.warehouses;
}
