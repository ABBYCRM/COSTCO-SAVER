import { apiFetch } from './client';

export interface PriceEvent {
  id: string;
  product_id: string;
  warehouse_id: string;
  old_price_cents: number | null;
  new_price_cents: number;
  change_cents: number | null;
  change_percent: number | null;
  event_type: string;
  confidence: number;
  effective_at: string;
  product_name: string;
  brand: string | null;
  warehouse_name: string;
}

export async function listPriceEvents(
  warehouseId: string,
  type?: string,
): Promise<PriceEvent[]> {
  const params = new URLSearchParams({ warehouseId });
  if (type) params.set('type', type);
  const result = await apiFetch<{ events: PriceEvent[] }>(
    `/api/v1/price-events?${params.toString()}`,
  );
  return result.events;
}
