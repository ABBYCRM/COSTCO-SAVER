import { apiFetch } from './client';

export interface CreateWatchInput {
  productId: string;
  warehouseId?: string | null;
  targetPriceCents?: number | null;
  targetPercent?: number | null;
  notifyAnyDrop?: boolean;
  notifyClearance?: boolean;
  notifyManagerMarkdown?: boolean;
  notifyAsterisk?: boolean;
}

export interface WatchRow {
  id: string;
  product_id: string;
  warehouse_id: string | null;
  target_price_cents: number | null;
  notify_any_drop: boolean;
  notify_clearance: boolean;
  notify_manager_markdown: boolean;
  notify_asterisk: boolean;
  enabled: boolean;
  canonical_name?: string;
  brand?: string | null;
  warehouse_name?: string | null;
}

export async function createWatch(input: CreateWatchInput): Promise<WatchRow> {
  const result = await apiFetch<{ watch: WatchRow }>('/api/v1/watches', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return result.watch;
}

export async function listWatches(): Promise<WatchRow[]> {
  const result = await apiFetch<{ watches: WatchRow[] }>('/api/v1/watches');
  return result.watches;
}

export async function deleteWatch(id: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/api/v1/watches/${id}`, { method: 'DELETE' });
}
