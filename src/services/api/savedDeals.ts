import { apiFetch } from './client';

export interface SavedDealRow {
  id: string;
  product_id: string;
  warehouse_id: string;
  saved_price_cents: number | null;
  saved_at: string;
  canonical_name: string;
  brand: string | null;
  warehouse_name: string;
  consensus_price_cents: number | null;
  markdown_class: string | null;
  freshness_class: string | null;
  confidence_score: number | null;
  last_verified_at: string | null;
}

export async function listSavedDeals(): Promise<SavedDealRow[]> {
  const result = await apiFetch<{ savedDeals: SavedDealRow[] }>('/api/v1/saved-deals');
  return result.savedDeals;
}

export async function saveDeal(input: {
  productId: string;
  warehouseId: string;
  savedPriceCents?: number | null;
}): Promise<SavedDealRow> {
  const result = await apiFetch<{ savedDeal: SavedDealRow }>('/api/v1/saved-deals', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return result.savedDeal;
}

export async function deleteSavedDeal(id: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/api/v1/saved-deals/${id}`, { method: 'DELETE' });
}
