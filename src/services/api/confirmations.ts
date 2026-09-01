import { apiFetch } from './client';

export interface ConfirmationResult {
  confirmationId: string;
  conflict: boolean;
}

export async function confirmObservation(
  observationId: string,
  confirmedPriceCents: number,
): Promise<ConfirmationResult> {
  const result = await apiFetch<{
    confirmation: { id: string; conflict: boolean };
  }>(`/api/v1/observations/${observationId}/confirm`, {
    method: 'POST',
    body: JSON.stringify({ confirmedPriceCents }),
  });
  return {
    confirmationId: result.confirmation.id,
    conflict: result.confirmation.conflict,
  };
}
