import { apiFetch } from './client';

export interface WarehouseRow {
  id: string;
  retailer: string;
  retailer_warehouse_id: string | null;
  name: string;
  address_1: string;
  address_2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  timezone: string;
  verification_status: 'pending' | 'verified' | 'inactive';
  active: boolean;
}

export async function listWarehouses(query = ''): Promise<WarehouseRow[]> {
  const suffix = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : '';
  const result = await apiFetch<{ warehouses: WarehouseRow[] }>(`/api/v1/warehouses${suffix}`);
  return result.warehouses;
}

export async function findNearbyWarehouses(
  latitude: number,
  longitude: number,
  limit = 10,
): Promise<WarehouseRow[]> {
  const rows = await listWarehouses();
  return rows
    .map((warehouse) => ({
      warehouse,
      distance:
        warehouse.latitude == null || warehouse.longitude == null
          ? Number.POSITIVE_INFINITY
          : haversine(latitude, longitude, Number(warehouse.latitude), Number(warehouse.longitude)),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map(({ warehouse }) => warehouse);
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}
