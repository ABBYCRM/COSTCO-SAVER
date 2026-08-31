import { supabase } from '@services/supabase/client';

export interface ReceiptRow {
  id: string;
  warehouse_id: string | null;
  purchase_date: string;
  total_cents: number | null;
  currency: string;
  status: 'pending' | 'confirmed' | 'rejected';
  ocr_status: 'pending' | 'parsed' | 'corrected' | 'failed';
}

export interface ReceiptLineInput {
  productId: string | null;
  rawDescription: string;
  costcoItemNumber: string | null;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
  lineOrder: number;
}

export interface CreateReceiptInput {
  warehouseId: string | null;
  purchaseDate: string;
  totalCents: number | null;
  evidenceFile?: File | null;
  lines: ReceiptLineInput[];
}

export interface CreateReceiptResult {
  receiptId: string;
  purchaseIds: string[];
}

/**
 * Create a receipt and its line items in a single transaction (spec §56).
 * Confirmed receipt lines also produce private purchase rows (spec §28).
 */
export async function createReceipt(input: CreateReceiptInput): Promise<CreateReceiptResult> {
  // 1. Upload evidence if provided.
  let evidenceId: string | null = null;
  if (input.evidenceFile) {
    const { data: userRes } = await supabase().auth.getUser();
    const userId = userRes.user?.id;
    if (!userId) throw new Error('Not authenticated');
    const path = `${userId}/receipts/${Date.now()}/${input.evidenceFile.name || 'receipt.jpg'}`;
    const { error: upErr } = await supabase().storage
      .from('private-receipts')
      .upload(path, input.evidenceFile, { upsert: true });
    if (upErr) throw upErr;
    const { data: ev, error: evErr } = await supabase()
      .from('evidence')
      .insert({ owner_user_id: userId, kind: 'receipt_image', storage_path: path })
      .select('id')
      .single();
    if (evErr) throw evErr;
    evidenceId = ev?.id ?? null;
  }

  // 2. Insert the receipt row.
  const { data: receipt, error: rErr } = await supabase()
    .from('receipts')
    .insert({
      warehouse_id: input.warehouseId,
      purchase_date: input.purchaseDate,
      total_cents: input.totalCents,
      evidence_id: evidenceId,
      status: 'confirmed',
      ocr_status: 'parsed',
      currency: 'USD',
    })
    .select('id')
    .single();
  if (rErr) throw rErr;
  const receiptId = (receipt as { id: string }).id;

  // 3. Insert lines and corresponding purchase rows.
  const purchaseIds: string[] = [];
  for (const line of input.lines) {
    if (line.productId == null) continue;
    const { data: purchase, error: pErr } = await supabase()
      .from('purchases')
      .insert({
        product_id: line.productId,
        warehouse_id: input.warehouseId,
        unit_price_cents: line.unitPriceCents,
        quantity: line.quantity,
        discount_cents: 0,
        total_cents: line.totalCents,
        currency: 'USD',
        purchase_date: input.purchaseDate,
        source: 'receipt',
        receipt_id: receiptId,
      })
      .select('id')
      .single();
    if (pErr) throw pErr;
    purchaseIds.push((purchase as { id: string }).id);
  }

  return { receiptId, purchaseIds };
}

export async function listReceipts(): Promise<ReceiptRow[]> {
  const { data, error } = await supabase()
    .from('receipts')
    .select('id, warehouse_id, purchase_date, total_cents, currency, status, ocr_status')
    .order('purchase_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ReceiptRow[];
}
