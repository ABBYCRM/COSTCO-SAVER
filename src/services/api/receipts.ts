import { apiFetch } from './client';
import { createPurchase } from './purchases';

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
  totalCents: number;
  lineOrder: number;
}

export interface CreateReceiptInput {
  warehouseId: string | null;
  purchaseDate: string;
  totalCents: number | null;
  lines: ReceiptLineInput[];
}

export interface CreateReceiptResult {
  receiptId: string;
  purchaseIds: string[];
}

export async function createReceipt(input: CreateReceiptInput): Promise<CreateReceiptResult> {
  const result = await apiFetch<{ receipt: ReceiptRow }>('/api/v1/receipts', {
    method: 'POST',
    body: JSON.stringify({
      warehouseId: input.warehouseId,
      purchaseDate: input.purchaseDate,
      totalCents: input.totalCents,
    }),
  });
  const purchaseIds: string[] = [];
  if (input.warehouseId) {
    for (const line of input.lines) {
      if (!line.productId) continue;
      const purchase = await createPurchase({
        productId: line.productId,
        warehouseId: input.warehouseId,
        unitPriceCents: line.unitPriceCents,
        quantity: line.quantity,
        purchaseDate: input.purchaseDate,
        source: 'receipt',
        receiptId: result.receipt.id,
      });
      purchaseIds.push(purchase.id);
    }
  }
  return { receiptId: result.receipt.id, purchaseIds };
}

export async function listReceipts(): Promise<ReceiptRow[]> {
  const result = await apiFetch<{ receipts: ReceiptRow[] }>('/api/v1/receipts');
  return result.receipts;
}
