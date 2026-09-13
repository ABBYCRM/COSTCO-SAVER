-- COSTCO-SAVER — audit correctness fixes
-- 1. freshness_for must be STABLE (it calls now())
-- 2. Enable RLS on retailers so the existing select policy applies
-- 3. Default user_id on private inserts
-- 4. record_price_observation: stop last-write-wins; emit price_events

CREATE OR REPLACE FUNCTION public.freshness_for(last_verified_at timestamptz)
RETURNS text
LANGUAGE plpgsql
STABLE
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

ALTER TABLE public.retailers ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.receipts ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.purchases ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.watches ALTER COLUMN user_id SET DEFAULT auth.uid();

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
  v_prev_price bigint;
  v_prev_count integer;
  v_prev_conf integer;
  v_new_consensus bigint;
  v_event_type text;
BEGIN
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
    SELECT id INTO v_id FROM public.price_observations WHERE idempotency_key = p_idempotency_key;
    RETURN v_id;
  END IF;

  SELECT consensus_price_cents, evidence_count, independent_confirmation_count
    INTO v_prev_price, v_prev_count, v_prev_conf
  FROM public.warehouse_product_state
  WHERE product_id = p_product_id AND warehouse_id = p_warehouse_id;

  IF v_prev_price IS NULL THEN
    v_new_consensus := p_price_cents;
    v_event_type := 'first_observation';
  ELSIF v_prev_price = p_price_cents THEN
    v_new_consensus := v_prev_price;
    v_event_type := NULL;
  ELSIF COALESCE(v_prev_conf, 0) = 0 AND COALESCE(v_prev_count, 0) <= 1 THEN
    v_new_consensus := p_price_cents;
    v_event_type := CASE
      WHEN p_price_cents < v_prev_price THEN 'price_drop'
      ELSE 'price_increase'
    END;
  ELSE
    v_new_consensus := v_prev_price;
    v_event_type := NULL;
  END IF;

  INSERT INTO public.warehouse_product_state (
    product_id, warehouse_id, consensus_price_cents, currency, markdown_class,
    first_seen_at, last_verified_at, latest_observation_id,
    evidence_count, conflicting_report_count, freshness_class, updated_at
  ) VALUES (
    p_product_id, p_warehouse_id, v_new_consensus, p_currency, v_class,
    p_observed_at, p_observed_at, v_id,
    1, 0, public.freshness_for(p_observed_at), now()
  )
  ON CONFLICT (product_id, warehouse_id) DO UPDATE SET
    consensus_price_cents = v_new_consensus,
    currency = EXCLUDED.currency,
    markdown_class = CASE
      WHEN v_new_consensus = p_price_cents THEN v_class
      ELSE public.warehouse_product_state.markdown_class
    END,
    last_verified_at = CASE
      WHEN v_new_consensus = p_price_cents THEN p_observed_at
      ELSE public.warehouse_product_state.last_verified_at
    END,
    latest_observation_id = v_id,
    evidence_count = public.warehouse_product_state.evidence_count + 1,
    conflicting_report_count = CASE
      WHEN v_prev_price IS DISTINCT FROM p_price_cents
        THEN public.warehouse_product_state.conflicting_report_count + 1
      ELSE public.warehouse_product_state.conflicting_report_count
    END,
    freshness_class = CASE
      WHEN v_new_consensus = p_price_cents THEN public.freshness_for(p_observed_at)
      ELSE public.warehouse_product_state.freshness_class
    END,
    updated_at = now();

  IF v_event_type IS NOT NULL THEN
    INSERT INTO public.price_events (
      product_id, warehouse_id, old_price_cents, new_price_cents,
      change_cents, event_type, confidence, effective_at
    ) VALUES (
      p_product_id, p_warehouse_id, v_prev_price, v_new_consensus,
      CASE WHEN v_prev_price IS NULL THEN NULL ELSE v_new_consensus - v_prev_price END,
      v_event_type, 50, p_observed_at
    );
  END IF;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_price_observation(uuid, uuid, bigint, char, timestamptz, text, boolean, uuid, citext, bytea) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_price_observation(uuid, uuid, bigint, char, timestamptz, text, boolean, uuid, citext, bytea) TO authenticated;
