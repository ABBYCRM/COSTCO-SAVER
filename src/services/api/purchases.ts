import { apiFetch } from './client';

export interface PurchaseRow {
  id: string;
  product_id: string;
  warehouse_id: string;
  unit_price_cents: number;
  quantity: number;
  discount_cents: number;
  total_cents: number;
  currency: string;
  purchase_date: string;
  source: 'receipt' | 'manual' | 'imported';
  receipt_id: string | null;
  canonical_name?: string;
  brand?: string | null;
  warehouse_name?: string;
}

export interface CreatePurchaseInput {
  productId: string;
  warehouseId: string;
  unitPriceCents: number;
  quantity: number;
  purchaseDate: string;
  source?: 'manual' | 'receipt' | 'imported';
  receiptId?: string | null;
}

export async function listPurchases(): Promise<PurchaseRow[]> {
  const result = await apiFetch<{ purchases: PurchaseRow[] }>('/api/v1/purchases');
  return result.purchases;
}

export async function createPurchase(input: CreatePurchaseInput): Promise<PurchaseRow> {
  const result = await apiFetch<{ purchase: PurchaseRow }>('/api/v1/purchases', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return result.purchase;
}

export async function deletePurchase(id: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/api/v1/purchases/${id}`, { method: 'DELETE' });
}
