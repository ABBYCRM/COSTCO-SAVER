import { supabase } from '@services/supabase/client';

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
}

export async function listAdjustments(): Promise<AdjustmentRow[]> {
  const { data, error } = await supabase()
    .from('adjustment_candidates')
    .select('id, purchase_id, product_id, warehouse_id, purchase_price_cents, new_price_cents, quantity, potential_savings_cents, purchase_date, price_drop_date, window_end, days_remaining, status')
    .order('window_end', { ascending: true });
  if (error) throw error;
  return (data ?? []) as AdjustmentRow[];
}

export async function setAdjustmentStatus(id: string, status: AdjustmentRow['status']): Promise<void> {
  const { error } = await supabase().from('adjustment_candidates').update({ status }).eq('id', id);
  if (error) throw error;
}
