import { supabase } from '@services/supabase/client';

export interface CreateWatchInput {
  productId: string;
  warehouseId?: string | null;
  targetPriceCents?: number | null;
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
}

/**
 * Create a watch. The user must be authenticated; the watch is scoped to
 * their user_id and cannot be created on someone else's behalf.
 */
export async function createWatch(input: CreateWatchInput): Promise<WatchRow> {
  const { data, error } = await supabase()
    .from('watches')
    .insert({
      product_id: input.productId,
      warehouse_id: input.warehouseId ?? null,
      target_price_cents: input.targetPriceCents ?? null,
      notify_any_drop: input.notifyAnyDrop ?? false,
      notify_clearance: input.notifyClearance ?? false,
      notify_manager_markdown: input.notifyManagerMarkdown ?? false,
      notify_asterisk: input.notifyAsterisk ?? false,
      enabled: true,
    })
    .select('id, product_id, warehouse_id, target_price_cents, notify_any_drop, notify_clearance, notify_manager_markdown, notify_asterisk, enabled')
    .single();
  if (error) throw error;
  return data as WatchRow;
}

export async function listWatches(): Promise<WatchRow[]> {
  const { data, error } = await supabase()
    .from('watches')
    .select('id, product_id, warehouse_id, target_price_cents, notify_any_drop, notify_clearance, notify_manager_markdown, notify_asterisk, enabled')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as WatchRow[];
}

export async function deleteWatch(id: string): Promise<void> {
  const { error } = await supabase().from('watches').delete().eq('id', id);
  if (error) throw error;
}
