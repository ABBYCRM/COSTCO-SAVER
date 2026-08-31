-- COSTCO-SAVER — warehouse_product_state (consensus cache) and price_events
-- Spec §11, §16.

CREATE TABLE IF NOT EXISTS public.warehouse_product_state (
  product_id                     uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  warehouse_id                   uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  consensus_price_cents          bigint CHECK (consensus_price_cents IS NULL OR consensus_price_cents >= 0),
  currency                       char(3) NOT NULL DEFAULT 'USD',
  markdown_class                 text,
  first_seen_at                  timestamptz,
  last_verified_at               timestamptz,
  latest_observation_id          uuid REFERENCES public.price_observations(id) ON DELETE SET NULL,
  independent_confirmation_count integer NOT NULL DEFAULT 0,
  evidence_count                 integer NOT NULL DEFAULT 0,
  conflicting_report_count       integer NOT NULL DEFAULT 0,
  confidence_score               integer NOT NULL DEFAULT 0 CHECK (confidence_score BETWEEN 0 AND 100),
  freshness_class                text NOT NULL DEFAULT 'HISTORICAL'
    CHECK (freshness_class IN ('LIVE', 'FRESH', 'RECENT', 'AGING', 'HISTORICAL')),
  availability_signal            text NOT NULL DEFAULT 'unknown'
    CHECK (availability_signal IN ('in_stock', 'low_stock', 'out_of_stock', 'unknown')),
  updated_at                     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, warehouse_id)
);

CREATE INDEX IF NOT EXISTS idx_state_warehouse_score
  ON public.warehouse_product_state (warehouse_id, confidence_score DESC, last_verified_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_state_product ON public.warehouse_product_state (product_id);
CREATE INDEX IF NOT EXISTS idx_state_freshness ON public.warehouse_product_state (warehouse_id, freshness_class, last_verified_at DESC NULLS LAST);

-- This table is derived; writes happen via the consensus job (service role).
-- Reads are public so the deal feed / product detail screens can pull from it.
ALTER TABLE public.warehouse_product_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY state_select_public ON public.warehouse_product_state FOR SELECT USING (true);

-- Price events (spec §16)
CREATE TABLE IF NOT EXISTS public.price_events (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id          uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  warehouse_id        uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  old_price_cents     bigint,
  new_price_cents     bigint NOT NULL,
  change_cents        bigint,
  change_percent      numeric(6, 2),
  event_type          text NOT NULL
    CHECK (event_type IN ('price_drop', 'price_increase', 'clearance_detected', 'manager_markdown_detected', 'returned_to_regular', 'first_observation')),
  confidence          integer NOT NULL DEFAULT 0 CHECK (confidence BETWEEN 0 AND 100),
  effective_at        timestamptz NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_product_warehouse_time
  ON public.price_events (product_id, warehouse_id, effective_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_warehouse_time
  ON public.price_events (warehouse_id, effective_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_type ON public.price_events (event_type, effective_at DESC);

ALTER TABLE public.price_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY events_select_public ON public.price_events FOR SELECT USING (true);
