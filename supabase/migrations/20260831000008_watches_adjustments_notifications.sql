-- COSTCO-SAVER — watches, adjustments, notifications, device tokens
-- Spec §30, §32, §34, §35.

CREATE TABLE IF NOT EXISTS public.watches (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id               uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  scope                    text NOT NULL DEFAULT 'any_warehouse'
    CHECK (scope IN ('any_warehouse', 'specific_warehouse')),
  warehouse_id             uuid REFERENCES public.warehouses(id) ON DELETE CASCADE,
  target_price_cents       bigint CHECK (target_price_cents IS NULL OR target_price_cents >= 0),
  target_percent           numeric(5, 2) CHECK (target_percent IS NULL OR (target_percent >= 0 AND target_percent <= 100)),
  notify_any_drop          boolean NOT NULL DEFAULT false,
  notify_clearance         boolean NOT NULL DEFAULT false,
  notify_manager_markdown  boolean NOT NULL DEFAULT false,
  notify_asterisk          boolean NOT NULL DEFAULT false,
  enabled                  boolean NOT NULL DEFAULT true,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  CHECK (scope = 'any_warehouse' OR warehouse_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_watches_user ON public.watches (user_id);
CREATE INDEX IF NOT EXISTS idx_watches_product ON public.watches (product_id);
CREATE INDEX IF NOT EXISTS idx_watches_warehouse ON public.watches (warehouse_id) WHERE warehouse_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_watches_enabled ON public.watches (enabled) WHERE enabled = true;

ALTER TABLE public.watches ENABLE ROW LEVEL SECURITY;
CREATE POLICY watches_select_own ON public.watches FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY watches_insert_own ON public.watches FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY watches_update_own ON public.watches FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY watches_delete_own ON public.watches FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER watches_set_updated_at
  BEFORE UPDATE ON public.watches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Adjustment candidates (spec §30)
CREATE TABLE IF NOT EXISTS public.adjustment_candidates (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  purchase_id             uuid NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  lower_price_event_id    uuid REFERENCES public.price_events(id) ON DELETE SET NULL,
  purchase_price_cents    bigint NOT NULL CHECK (purchase_price_cents >= 0),
  new_price_cents         bigint NOT NULL CHECK (new_price_cents >= 0),
  quantity                numeric(10, 3) NOT NULL CHECK (quantity > 0),
  potential_savings_cents bigint NOT NULL,
  purchase_date           timestamptz NOT NULL,
  price_drop_date         timestamptz,
  window_end              timestamptz NOT NULL,
  days_remaining          integer NOT NULL,
  status                  text NOT NULL DEFAULT 'tracking'
    CHECK (status IN ('tracking', 'opportunity', 'claimed', 'denied', 'expired', 'dismissed')),
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_adjustments_user_status
  ON public.adjustment_candidates (user_id, status, window_end);
CREATE INDEX IF NOT EXISTS idx_adjustments_purchase ON public.adjustment_candidates (purchase_id);

ALTER TABLE public.adjustment_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY adjustments_select_own ON public.adjustment_candidates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY adjustments_insert_own ON public.adjustment_candidates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY adjustments_update_own ON public.adjustment_candidates FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY adjustments_delete_own ON public.adjustment_candidates FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER adjustments_set_updated_at
  BEFORE UPDATE ON public.adjustment_candidates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Notifications (private, spec §33)
CREATE TABLE IF NOT EXISTS public.notifications (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id          uuid REFERENCES public.products(id) ON DELETE SET NULL,
  warehouse_id        uuid REFERENCES public.warehouses(id) ON DELETE SET NULL,
  price_event_id      uuid REFERENCES public.price_events(id) ON DELETE SET NULL,
  adjustment_id       uuid REFERENCES public.adjustment_candidates(id) ON DELETE SET NULL,
  notification_type   text NOT NULL
    CHECK (notification_type IN ('price_drop', 'price_increase', 'clearance', 'manager_markdown', 'asterisk', 'watch_match', 'adjustment_opportunity', 'adjustment_expiring')),
  title               text NOT NULL,
  body                text NOT NULL,
  deep_link           text,
  read_at             timestamptz,
  delivered_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, created_at DESC) WHERE read_at IS NULL;

-- Spec §34: unique (user, product, warehouse, price_event, type) to dedupe.
-- Implemented as a partial unique index.
CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_dedupe
  ON public.notifications (
    user_id, product_id, warehouse_id, price_event_id, notification_type
  )
  WHERE product_id IS NOT NULL
    AND warehouse_id IS NOT NULL
    AND price_event_id IS NOT NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notifications_select_own ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY notifications_insert_own ON public.notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY notifications_update_own ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY notifications_delete_own ON public.notifications FOR DELETE USING (auth.uid() = user_id);

-- Device tokens (private, spec §47)
CREATE TABLE IF NOT EXISTS public.device_tokens (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform        text NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  token           text NOT NULL,
  app_version     text,
  last_used_at    timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (platform, token)
);

CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON public.device_tokens (user_id);

ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY device_tokens_select_own ON public.device_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY device_tokens_insert_own ON public.device_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY device_tokens_delete_own ON public.device_tokens FOR DELETE USING (auth.uid() = user_id);
