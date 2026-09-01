import { apiFetch } from './client';

export interface AdjustmentRow {
  id: string;
  purchase_id: string;
  product_id: string;
  warehouse_id: string;
  purchase_price_cents: number;
  new_price_cents: number;
  quantity: number;
  potential_savings_cents: number;
  purchase_date: string;
  price_drop_date: string | null;
  window_end: string;
  days_remaining: number;
  status: 'tracking' | 'opportunity' | 'claimed' | 'denied' | 'expired' | 'dismissed';
  canonical_name?: string;
  warehouse_name?: string;
}

export async function listAdjustments(): Promise<AdjustmentRow[]> {
  const result = await apiFetch<{ adjustments: AdjustmentRow[] }>('/api/v1/adjustments');
  return result.adjustments;
}

export async function setAdjustmentStatus(id: string, status: AdjustmentRow['status']): Promise<void> {
  await apiFetch(`/api/v1/adjustments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}
