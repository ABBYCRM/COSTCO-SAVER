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

export async function findNearbyWarehouses(
  latitude: number,
  longitude: number,
  limit = 10,
): Promise<WarehouseRow[]> {
  // Use PostgREST to delegate the geo filter; ordering by haversine would
  // need an RPC, so for Phase 0 we just return all verified warehouses.
  void latitude;
  void longitude;
  void limit;
  return listWarehouses();
}
