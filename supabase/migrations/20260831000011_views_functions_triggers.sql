-- COSTCO-SAVER — functions, triggers, materialized views
-- Spec §11 (consensus cache is updated by the consensus job).
-- This migration wires the SQL side of consensus + freshness.

-- ============================================================
-- Markdown classification: deterministic (spec §17)
-- ============================================================
CREATE OR REPLACE FUNCTION public.classify_markdown(price_cents bigint, has_asterisk boolean DEFAULT false)
RETURNS TABLE (ending text, classification text, signals text[])
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_ending text;
  v_class  text;
  v_signals text[] := ARRAY[]::text[];
BEGIN
  -- Cents portion: e.g. 1997 -> 97
  v_ending := lpad((price_cents % 100)::text, 2, '0');

  IF v_ending = '97' THEN
    v_class := 'clearance';
    v_signals := array_append(v_signals, 'ending_97');
  ELSIF v_ending IN ('00', '88') THEN
    v_class := 'manager_markdown';
    v_signals := array_append(v_signals, 'ending_' || v_ending);
  ELSIF v_ending = '99' THEN
    v_class := 'regular_signal';
    v_signals := array_append(v_signals, 'ending_99');
  ELSE
    v_class := 'unclassified';
  END IF;

  IF has_asterisk THEN
    v_signals := array_append(v_signals, 'has_asterisk');
  END IF;

  RETURN QUERY SELECT v_ending, v_class, v_signals;
END;
$$;

-- ============================================================
-- Freshness bucket (spec §14)
-- ============================================================
CREATE OR REPLACE FUNCTION public.freshness_for(last_verified_at timestamptz)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  age_hours numeric;
BEGIN
  IF last_verified_at IS NULL THEN
    RETURN 'HISTORICAL';
  END IF;
  age_hours := EXTRACT(EPOCH FROM (now() - last_verified_at)) / 3600.0;
  IF age_hours <= 6 THEN
    RETURN 'LIVE';
  ELSIF age_hours <= 24 THEN
    RETURN 'FRESH';
  ELSIF age_hours <= 72 THEN
    RETURN 'RECENT';
  ELSIF age_hours <= 168 THEN
    RETURN 'AGING';
  ELSE
    RETURN 'HISTORICAL';
  END IF;
END;
$$;

-- ============================================================
-- Save observation: writes row + updates state in one transaction
-- ============================================================
CREATE OR REPLACE FUNCTION public.record_price_observation(
  p_product_id        uuid,
  p_warehouse_id      uuid,
  p_price_cents       bigint,
  p_currency          char(3),
  p_observed_at       timestamptz,
  p_source_type       text,
  p_has_asterisk      boolean,
  p_evidence_id       uuid,
  p_idempotency_key   citext,
  p_device_session_hash bytea
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_ending text;
  v_class  text;
  v_signals text[];
BEGIN
  -- The SECURITY DEFINER runs as table owner so we can write the state row.
  -- The actual mutating privilege for clients is via INSERT policy on
  -- price_observations; this function performs the state update.
  SELECT ending, classification, signals
    INTO v_ending, v_class, v_signals
  FROM public.classify_markdown(p_price_cents, p_has_asterisk);

  INSERT INTO public.price_observations (
    product_id, warehouse_id, price_cents, currency, observed_at,
    source_type, markdown_class, price_ending, has_asterisk,
    evidence_id, submitter_user_id, idempotency_key, device_session_hash
  ) VALUES (
    p_product_id, p_warehouse_id, p_price_cents, p_currency, p_observed_at,
    p_source_type, v_class, v_ending, p_has_asterisk,
    p_evidence_id, auth.uid(), p_idempotency_key, p_device_session_hash
  )
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    -- Idempotent: re-use the existing observation id.
    SELECT id INTO v_id FROM public.price_observations WHERE idempotency_key = p_idempotency_key;
    RETURN v_id;
  END IF;

  INSERT INTO public.warehouse_product_state (
    product_id, warehouse_id, consensus_price_cents, currency, markdown_class,
    first_seen_at, last_verified_at, latest_observation_id,
    evidence_count, freshness_class, updated_at
  ) VALUES (
    p_product_id, p_warehouse_id, p_price_cents, p_currency, v_class,
    p_observed_at, p_observed_at, v_id,
    1, public.freshness_for(p_observed_at), now()
  )
  ON CONFLICT (product_id, warehouse_id) DO UPDATE SET
    consensus_price_cents = EXCLUDED.consensus_price_cents,
    currency = EXCLUDED.currency,
    markdown_class = EXCLUDED.markdown_class,
    last_verified_at = EXCLUDED.last_verified_at,
    latest_observation_id = EXCLUDED.latest_observation_id,
    evidence_count = public.warehouse_product_state.evidence_count + 1,
    freshness_class = EXCLUDED.freshness_class,
    updated_at = now();

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_price_observation(uuid, uuid, bigint, char, timestamptz, text, boolean, uuid, citext, bytea) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_price_observation(uuid, uuid, bigint, char, timestamptz, text, boolean, uuid, citext, bytea) TO authenticated;

-- ============================================================
-- Confirm observation (spec §5)
-- ============================================================
CREATE OR REPLACE FUNCTION public.confirm_price_observation(
  p_observation_id uuid,
  p_confirmed_price_cents bigint,
  p_device_session_hash bytea
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.observation_confirmations (
    observation_id, confirmer_user_id, confirmed_price_cents, device_session_hash
  ) VALUES (
    p_observation_id, auth.uid(), p_confirmed_price_cents, p_device_session_hash
  )
  ON CONFLICT (observation_id, confirmer_user_id) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    -- Already confirmed; return the existing row.
    SELECT id INTO v_id FROM public.observation_confirmations
    WHERE observation_id = p_observation_id AND confirmer_user_id = auth.uid();
    RETURN v_id;
  END IF;

  -- Update state counter if the confirmation matches the current consensus.
  UPDATE public.warehouse_product_state s
  SET independent_confirmation_count = s.independent_confirmation_count + 1,
      last_verified_at = now(),
      freshness_class = public.freshness_for(now()),
      updated_at = now()
  FROM public.price_observations o
  WHERE o.id = p_observation_id
    AND s.product_id = o.product_id
    AND s.warehouse_id = o.warehouse_id
    AND p_confirmed_price_cents = s.consensus_price_cents;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_price_observation(uuid, bigint, bytea) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_price_observation(uuid, bigint, bytea) TO authenticated;

-- ============================================================
-- Refresh freshness on every state read (or scheduled)
-- ============================================================
CREATE OR REPLACE FUNCTION public.refresh_state_freshness()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.warehouse_product_state
  SET freshness_class = public.freshness_for(last_verified_at),
      updated_at = now();
$$;

REVOKE ALL ON FUNCTION public.refresh_state_freshness() FROM PUBLIC;
-- Service role only.

-- ============================================================
-- Materialized view: deal feed base (spec §43)
-- Spec says we don't fabricate. This view only includes rows that
-- actually have observations, and exposes freshness + confidence.
-- ============================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS public.deal_feed AS
SELECT
  s.product_id,
  s.warehouse_id,
  p.canonical_name,
  p.brand,
  s.consensus_price_cents,
  s.markdown_class,
  s.freshness_class,
  s.confidence_score,
  s.evidence_count,
  s.independent_confirmation_count,
  s.last_verified_at
FROM public.warehouse_product_state s
JOIN public.products p ON p.id = s.product_id
WHERE s.consensus_price_cents IS NOT NULL
  AND p.status = 'active';

CREATE UNIQUE INDEX IF NOT EXISTS uq_deal_feed_pk
  ON public.deal_feed (product_id, warehouse_id);
CREATE INDEX IF NOT EXISTS idx_deal_feed_freshness
  ON public.deal_feed (warehouse_id, freshness_class, confidence_score DESC, consensus_price_cents);

-- Service role refreshes this on a schedule.
