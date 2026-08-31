import { supabase } from '@services/supabase/client';

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
  const { data, error } = await supabase()
    .from('purchases')
    .select('id, product_id, warehouse_id, unit_price_cents, quantity, discount_cents, total_cents, currency, purchase_date, source, receipt_id')
    .order('purchase_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as PurchaseRow[];
}

export async function createPurchase(input: CreatePurchaseInput): Promise<PurchaseRow> {
  const total = Math.max(0, Math.round(input.unitPriceCents * input.quantity));
  const { data, error } = await supabase()
    .from('purchases')
    .insert({
      product_id: input.productId,
      warehouse_id: input.warehouseId,
      unit_price_cents: input.unitPriceCents,
      quantity: input.quantity,
      discount_cents: 0,
      total_cents: total,
      currency: 'USD',
      purchase_date: input.purchaseDate,
      source: input.source ?? 'manual',
      receipt_id: input.receiptId ?? null,
    })
    .select('id, product_id, warehouse_id, unit_price_cents, quantity, discount_cents, total_cents, currency, purchase_date, source, receipt_id')
    .single();
  if (error) throw error;
  return data as PurchaseRow;
}

export async function deletePurchase(id: string): Promise<void> {
  const { error } = await supabase().from('purchases').delete().eq('id', id);
  if (error) throw error;
}
