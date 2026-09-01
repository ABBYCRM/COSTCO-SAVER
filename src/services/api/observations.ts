import { apiFetch } from './client';

export interface SubmitObservationInput {
  productId: string;
  warehouseId: string;
  priceCents: number;
  hasAsterisk: boolean;
  idempotencyKey: string;
  sourceType?: 'shelf_scan' | 'manual_shelf_entry' | 'receipt' | 'correction';
  observedAt?: string;
}

export interface SubmitObservationResult {
  observation: { id: string };
  duplicate: boolean;
  event: { id: string; event_type: string } | null;
}

export async function submitShelfObservation(
  input: SubmitObservationInput,
): Promise<SubmitObservationResult> {
  return apiFetch<SubmitObservationResult>('/api/v1/observations', {
    method: 'POST',
    body: JSON.stringify({
      ...input,
      sourceType: input.sourceType ?? 'manual_shelf_entry',
    }),
  });
}
