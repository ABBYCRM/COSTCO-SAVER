import { supabase } from '@services/supabase/client';

export interface ConfirmationResult {
  confirmationId: string;
  consensusMatches: boolean;
}

/**
 * Confirm an existing observation (spec §5).
 * Returns the confirmation id; the SQL function checks the price against
 * the current consensus and increments the independent_confirmation_count
 * only when the price matches.
 */
export async function confirmObservation(
  observationId: string,
  confirmedPriceCents: number,
  deviceSessionHash?: string | null,
): Promise<ConfirmationResult> {
  const { data, error } = await supabase().rpc('confirm_price_observation', {
    p_observation_id: observationId,
    p_confirmed_price_cents: confirmedPriceCents,
    p_device_session_hash: deviceSessionHash ? hexToBytes(deviceSessionHash) : null,
  });
  if (error) throw error;

  // The SQL function returns the confirmation id; we don't currently
  // surface consensusMatches separately (the function bumps the counter
  // atomically only on match).
  return { confirmationId: data as string, consensusMatches: true };
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    out[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return out;
}
