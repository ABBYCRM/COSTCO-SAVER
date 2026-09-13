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

  const { data: obs } = await supabase()
    .from('price_observations')
    .select('product_id, warehouse_id')
    .eq('id', observationId)
    .maybeSingle();
  let consensusMatches = false;
  if (obs) {
    const row = obs as { product_id: string; warehouse_id: string };
    const { data: state } = await supabase()
      .from('warehouse_product_state')
      .select('consensus_price_cents')
      .eq('product_id', row.product_id)
      .eq('warehouse_id', row.warehouse_id)
      .maybeSingle();
    consensusMatches =
      (state as { consensus_price_cents: number | null } | null)?.consensus_price_cents ===
      confirmedPriceCents;
  }
  return { confirmationId: data as string, consensusMatches };
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    out[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return out;
}
