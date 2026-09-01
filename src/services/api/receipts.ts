import { apiFetch } from './client';

export interface ReceiptRow {
  id: string;
  warehouse_id: string | null;
  purchase_date: string;
  total_cents: number | null;
  currency: string;
  status: 'pending' | 'confirmed' | 'rejected';
}

export interface ReceiptLineInput {
  productId: string | null;
  rawDescription: string;
  costcoItemNumber: string | null;
  quantity: number;
  unitPriceCents: number;
  discountCents?: number;
  totalCents: number;
  lineOrder: number;
}

export interface CreateReceiptInput {
  warehouseId: string | null;
  purchaseDate: string;
  totalCents: number | null;
  evidenceId?: string | null;
  lines: ReceiptLineInput[];
}

export interface CreateReceiptResult {
  receipt: ReceiptRow;
  purchaseIds: string[];
}

export async function createReceipt(input: CreateReceiptInput): Promise<CreateReceiptResult> {
  return apiFetch<CreateReceiptResult>('/api/v1/receipts', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function listReceipts(): Promise<ReceiptRow[]> {
  const result = await apiFetch<{ receipts: ReceiptRow[] }>('/api/v1/receipts');
  return result.receipts;
}
