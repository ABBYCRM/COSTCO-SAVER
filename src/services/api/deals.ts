import { apiFetch } from './client';

export interface DealRow {
  product_id: string;
  warehouse_id: string;
  canonical_name: string;
  brand: string | null;
  image_url: string | null;
  consensus_price_cents: number | null;
  markdown_class: string | null;
  has_asterisk: boolean;
  freshness_class: string;
  confidence_score: number;
  last_verified_at: string | null;
}

export async function listDeals(
  warehouseId: string,
  filter: 'all' | 'clearance' | 'manager_markdown' | 'asterisk' = 'all',
): Promise<DealRow[]> {
  const result = await apiFetch<{ deals: DealRow[] }>(
    `/api/v1/deals?warehouseId=${encodeURIComponent(warehouseId)}&filter=${filter}`,
  );
  return result.deals;
}
