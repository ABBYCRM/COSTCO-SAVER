-- COSTCO-SAVER — moderation, audit, additional indexes
-- Spec §54, §56.

-- Moderation queues (private to moderators; spec §54)
CREATE TABLE IF NOT EXISTS public.moderation_queue (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue           text NOT NULL
    CHECK (queue IN ('conflicting_prices', 'new_products', 'duplicate_products', 'reported_evidence', 'suspicious_contributors', 'missing_warehouses', 'data_corrections')),
  subject_kind    text NOT NULL, -- e.g. 'observation', 'product', 'evidence', 'user'
  subject_id      uuid NOT NULL,
  reported_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes           text,
  status          text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_review', 'resolved', 'dismissed')),
  assigned_to     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  resolved_at     timestamptz
);

CREATE INDEX IF NOT EXISTS idx_mod_queue_status ON public.moderation_queue (queue, status, created_at);
CREATE INDEX IF NOT EXISTS idx_mod_queue_subject ON public.moderation_queue (subject_kind, subject_id);

ALTER TABLE public.moderation_queue ENABLE ROW LEVEL SECURITY;
-- Only moderators (service role checks) can read. Client RLS denies everyone.
-- Admin actions go through Edge Functions.

-- Audit log for any admin/moderator action (spec §54)
CREATE TABLE IF NOT EXISTS public.audit_log (
  id              bigserial PRIMARY KEY,
  actor_user_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action          text NOT NULL,
  subject_kind    text NOT NULL,
  subject_id      uuid,
  metadata        jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_subject ON public.audit_log (subject_kind, subject_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON public.audit_log (actor_user_id, created_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
-- No client read. Service role only.

-- Verification missions (spec §7)
CREATE TABLE IF NOT EXISTS public.verification_missions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id    uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  product_id      uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  reason          text NOT NULL
    CHECK (reason IN ('stale_observation', 'clearance_focus', 'conflict_resolution', 'coverage_gap', 'launch_seed')),
  priority        integer NOT NULL DEFAULT 50,
  assigned_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_at    timestamptz,
  completed_observation_id uuid REFERENCES public.price_observations(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_missions_warehouse_active
  ON public.verification_missions (warehouse_id, created_at DESC)
  WHERE completed_at IS NULL;

ALTER TABLE public.verification_missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY missions_select_public ON public.verification_missions FOR SELECT USING (true);
CREATE POLICY missions_update_self ON public.verification_missions
  FOR UPDATE
  USING (auth.uid() = assigned_user_id OR assigned_user_id IS NULL)
  WITH CHECK (auth.uid() = assigned_user_id);

-- Shopping list + trip mode (spec §75)
CREATE TABLE IF NOT EXISTS public.shopping_lists (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            text NOT NULL DEFAULT 'My Trip',
  preferred_warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shopping_lists_user ON public.shopping_lists (user_id);

ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY shopping_lists_select_own ON public.shopping_lists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY shopping_lists_insert_own ON public.shopping_lists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY shopping_lists_update_own ON public.shopping_lists FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY shopping_lists_delete_own ON public.shopping_lists FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER shopping_lists_set_updated_at
  BEFORE UPDATE ON public.shopping_lists
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.shopping_list_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id         uuid NOT NULL REFERENCES public.shopping_lists(id) ON DELETE CASCADE,
  product_id      uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity        numeric(10, 3) NOT NULL DEFAULT 1,
  note            text,
  checked         boolean NOT NULL DEFAULT false,
  preferred_warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shopping_list_items_list ON public.shopping_list_items (list_id);

ALTER TABLE public.shopping_list_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY shopping_list_items_select_own ON public.shopping_list_items
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.shopping_lists l WHERE l.id = shopping_list_items.list_id AND l.user_id = auth.uid()));
CREATE POLICY shopping_list_items_insert_own ON public.shopping_list_items
  FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.shopping_lists l WHERE l.id = shopping_list_items.list_id AND l.user_id = auth.uid()));
CREATE POLICY shopping_list_items_update_own ON public.shopping_list_items
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.shopping_lists l WHERE l.id = shopping_list_items.list_id AND l.user_id = auth.uid()));
CREATE POLICY shopping_list_items_delete_own ON public.shopping_list_items
  FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.shopping_lists l WHERE l.id = shopping_list_items.list_id AND l.user_id = auth.uid()));

CREATE TRIGGER shopping_list_items_set_updated_at
  BEFORE UPDATE ON public.shopping_list_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Private scan history (spec §47). Useful for "recently scanned" home card.
CREATE TABLE IF NOT EXISTS public.scan_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id      uuid REFERENCES public.products(id) ON DELETE SET NULL,
  barcode_normalized citext,
  warehouse_id    uuid REFERENCES public.warehouses(id) ON DELETE SET NULL,
  occurred_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scan_history_user_time ON public.scan_history (user_id, occurred_at DESC);

ALTER TABLE public.scan_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY scan_history_select_own ON public.scan_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY scan_history_insert_own ON public.scan_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY scan_history_delete_own ON public.scan_history FOR DELETE USING (auth.uid() = user_id);

-- Data source registry (spec §92). Private/admin only.
CREATE TABLE IF NOT EXISTS public.data_sources (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text UNIQUE NOT NULL,
  source_type     text NOT NULL CHECK (source_type IN ('barcode', 'product_identity', 'pricing', 'warehouse_directory', 'media', 'other')),
  provider        text NOT NULL,
  license_reference text,
  can_store       boolean NOT NULL DEFAULT false,
  can_display     boolean NOT NULL DEFAULT true,
  can_redistribute boolean NOT NULL DEFAULT false,
  retention_rule  text,
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY data_sources_select_public ON public.data_sources FOR SELECT USING (active = true);
