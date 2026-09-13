import { supabase } from '@services/supabase/client';

export interface WarehouseRow {
  id: string;
  retailer_id: string;
  warehouse_number: string | null;
  name: string;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string;
  verification_status: 'unverified' | 'verified' | 'flagged' | 'retired';
}

export async function listWarehouses(): Promise<WarehouseRow[]> {
  const { data, error } = await supabase()
    .from('warehouses')
    .select('*')
    .neq('verification_status', 'retired')
    .order('name');
  if (error) throw error;
  return (data ?? []) as WarehouseRow[];
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const r = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.min(1, Math.sqrt(a)));
}

export async function findNearbyWarehouses(
  latitude: number,
  longitude: number,
  limit = 10,
): Promise<WarehouseRow[]> {
  const all = await listWarehouses();
  return all
    .filter((w) => w.latitude != null && w.longitude != null)
    .map((w) => ({
      w,
      d: haversineKm(latitude, longitude, w.latitude as number, w.longitude as number),
    }))
    .sort((a, b) => a.d - b.d)
    .slice(0, Math.max(1, limit))
    .map((x) => x.w);
}
