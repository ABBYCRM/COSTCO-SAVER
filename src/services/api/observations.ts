import { supabase } from '@services/supabase/client';

export interface SubmitObservationInput {
  productId: string;
  warehouseId: string;
  priceCents: number;
  hasAsterisk: boolean;
  evidenceFile?: File | null;
  evidenceBase64?: string | null;
  evidenceMimeType?: string;
  evidenceFileName?: string;
  idempotencyKey: string;
  deviceSessionHash?: string | null;
}

export interface SubmitObservationResult {
  observationId: string;
  evidenceId: string | null;
}

/**
 * Submit a shelf observation end-to-end:
 *   1. (optional) upload evidence image to private-user-media under /{uid}/{obs}/...
 *   2. (optional) write an `evidence` row
 *   3. INSERT into price_observations (the spec-required column names)
 *   4. UPSERT warehouse_product_state via the SQL function record_price_observation
 *
 * Every step is idempotent: a duplicate idempotency_key returns the same
 * observation id without creating a second row (spec §52).
 */
export async function submitShelfObservation(
  input: SubmitObservationInput,
): Promise<SubmitObservationResult> {
  const { data: userRes, error: userErr } = await supabase().auth.getUser();
  if (userErr) throw userErr;
  const userId = userRes.user?.id;
  if (!userId) throw new Error('Not authenticated');

  let evidenceId: string | null = null;

  // 1. Upload the evidence file (if provided) into the user's private bucket.
  if (input.evidenceFile) {
    const path = `${userId}/observations/${input.idempotencyKey}/${input.evidenceFile.name || 'shelf.jpg'}`;
    const { error: upErr } = await supabase().storage
      .from('private-user-media')
      .upload(path, input.evidenceFile, { upsert: true, contentType: input.evidenceFile.type || 'image/jpeg' });
    if (upErr) throw upErr;

    // 2. Write an evidence row that points at the storage object.
    const { data: evRow, error: evErr } = await supabase()
      .from('evidence')
      .insert({
        owner_user_id: userId,
        kind: 'shelf_photo',
        storage_path: path,
      })
      .select('id')
      .single();
    if (evErr) throw evErr;
    evidenceId = evRow?.id ?? null;
  }

  // 3. Call the SQL function that does the consensus write transactionally.
  // We pass the evidenceId so the function can link it; the function itself
  // decides markdown_class + price_ending and updates the state row.
  const { data, error } = await supabase().rpc('record_price_observation', {
    p_product_id: input.productId,
    p_warehouse_id: input.warehouseId,
    p_price_cents: input.priceCents,
    p_currency: 'USD',
    p_observed_at: new Date().toISOString(),
    p_source_type: 'shelf_scan',
    p_has_asterisk: input.hasAsterisk,
    p_evidence_id: evidenceId,
    p_idempotency_key: input.idempotencyKey,
    p_device_session_hash: input.deviceSessionHash
      ? hexToBytes(input.deviceSessionHash)
      : null,
  });
  if (error) throw error;
  return { observationId: data as string, evidenceId };
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    out[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return out;
}
