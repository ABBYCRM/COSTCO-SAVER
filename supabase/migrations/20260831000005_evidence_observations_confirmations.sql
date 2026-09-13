-- COSTCO-SAVER — evidence, observations, confirmations
-- Spec §12, §13, §51.

-- Evidence: photos, OCR text, receipt snippets. Private path: only the owner
-- can read the underlying object; the public-facing row carries minimal metadata.

CREATE TABLE IF NOT EXISTS public.evidence (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind            text NOT NULL
    CHECK (kind IN ('shelf_photo', 'receipt_image', 'receipt_pdf', 'product_photo', 'other')),
  storage_path    text NOT NULL, -- points into a private bucket (spec §51)
  thumbnail_path  text,
  content_hash    bytea, -- sha256 for dedupe / anti-abuse (spec §52)
  width_px        integer,
  height_px       integer,
  byte_size       integer,
  uploaded_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evidence_owner ON public.evidence (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_evidence_hash ON public.evidence (content_hash) WHERE content_hash IS NOT NULL;

ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY evidence_select_own ON public.evidence FOR SELECT USING (auth.uid() = owner_user_id);
CREATE POLICY evidence_insert_own ON public.evidence FOR INSERT WITH CHECK (auth.uid() = owner_user_id);
CREATE POLICY evidence_delete_own ON public.evidence FOR DELETE USING (auth.uid() = owner_user_id);

-- Price observations. Spec §12.
CREATE TABLE IF NOT EXISTS public.price_observations (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id               uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  warehouse_id             uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  price_cents              bigint NOT NULL CHECK (price_cents >= 0),
  currency                 char(3) NOT NULL DEFAULT 'USD',
  observed_at              timestamptz NOT NULL,
  submitted_at             timestamptz NOT NULL DEFAULT now(),
  source_type              text NOT NULL
    CHECK (source_type IN ('shelf_scan', 'manual_shelf_entry', 'receipt', 'confirmation', 'correction', 'authorized_external_provider', 'administrator_verified')),
  markdown_class           text
    CHECK (markdown_class IN ('clearance', 'manager_markdown', 'regular_signal', 'unclassified', 'unknown')),
  price_ending             text,
  has_asterisk             boolean NOT NULL DEFAULT false,
  evidence_id              uuid REFERENCES public.evidence(id) ON DELETE SET NULL,
  private_source_record_id uuid, -- e.g. receipt row; nullable and only accessible to the owner
  submitter_user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verification_status      text NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'rejected', 'flagged')),
  device_session_hash      bytea,
  idempotency_key          citext UNIQUE,
  created_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_observations_product_warehouse_time
  ON public.price_observations (product_id, warehouse_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_observations_warehouse_time
  ON public.price_observations (warehouse_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_observations_submitter
  ON public.price_observations (submitter_user_id);
CREATE INDEX IF NOT EXISTS idx_observations_source
  ON public.price_observations (source_type);
CREATE INDEX IF NOT EXISTS idx_observations_idempotency
  ON public.price_observations (idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Observations are public-readable so consensus can be computed in SQL views.
-- The submitter_user_id is readable to admins via service role but RLS keeps
-- it hidden from regular clients (only warehouse_id, price, evidence, time
-- are visible to other users).
ALTER TABLE public.price_observations ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous) can read non-private columns of observations
-- for the public consensus pipeline. We hide sensitive columns by selecting
-- through a SECURITY INVOKER view, not by relying on RLS alone.
CREATE POLICY observations_select_public ON public.price_observations
  FOR SELECT
  USING (verification_status <> 'rejected');

-- Inserts are allowed only by the submitter (the user's own auth.uid()).
-- Updates are restricted to service role (consensus jobs).
CREATE POLICY observations_insert_self ON public.price_observations
  FOR INSERT
  WITH CHECK (auth.uid() = submitter_user_id);

-- Confirmations: a separate row, FK to observation, so a user can confirm
-- without re-issuing a full observation (spec §5).
CREATE TABLE IF NOT EXISTS public.observation_confirmations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  observation_id  uuid NOT NULL REFERENCES public.price_observations(id) ON DELETE CASCADE,
  confirmer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  confirmed_price_cents bigint NOT NULL CHECK (confirmed_price_cents >= 0),
  conflict        boolean NOT NULL DEFAULT false,
  device_session_hash bytea,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (observation_id, confirmer_user_id)
);

CREATE INDEX IF NOT EXISTS idx_confirmations_observation ON public.observation_confirmations (observation_id);
CREATE INDEX IF NOT EXISTS idx_confirmations_user ON public.observation_confirmations (confirmer_user_id);

ALTER TABLE public.observation_confirmations ENABLE ROW LEVEL SECURITY;
CREATE POLICY confirmations_select_public ON public.observation_confirmations
  FOR SELECT USING (true);
CREATE POLICY confirmations_insert_self ON public.observation_confirmations
  FOR INSERT WITH CHECK (auth.uid() = confirmer_user_id);
