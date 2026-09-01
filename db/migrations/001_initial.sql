CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext NOT NULL UNIQUE,
  password_hash text NOT NULL,
  display_name text,
  role text NOT NULL DEFAULT 'shopper' CHECK (role IN ('shopper','moderator','admin')),
  email_verified_at timestamptz,
  disabled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  user_agent text,
  ip_address inet,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id, expires_at DESC);

CREATE TABLE IF NOT EXISTS warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  retailer text NOT NULL DEFAULT 'costco',
  retailer_warehouse_id text,
  name text NOT NULL,
  address_1 text NOT NULL,
  address_2 text,
  city text NOT NULL,
  state text NOT NULL,
  postal_code text NOT NULL,
  country char(2) NOT NULL DEFAULT 'US',
  latitude numeric(9,6),
  longitude numeric(9,6),
  timezone text NOT NULL,
  verification_status text NOT NULL DEFAULT 'verified' CHECK (verification_status IN ('pending','verified','inactive')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (retailer, retailer_warehouse_id)
);
CREATE INDEX IF NOT EXISTS idx_warehouses_location ON warehouses(country,state,city);
CREATE TRIGGER warehouses_updated_at BEFORE UPDATE ON warehouses
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS user_warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, warehouse_id)
);

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  slug citext UNIQUE NOT NULL,
  display_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name text NOT NULL,
  brand text,
  description text,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  size_value numeric,
  size_unit text,
  image_url text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','provisional','merged','hidden','retired')),
  merged_into_id uuid REFERENCES products(id) ON DELETE SET NULL,
  created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin(canonical_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_brand_trgm ON products USING gin(brand gin_trgm_ops);
CREATE TRIGGER products_updated_at BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS product_identifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  identifier_type text NOT NULL CHECK (identifier_type IN ('UPC_A','UPC_E','EAN_8','EAN_13','GTIN_14','COSTCO_ITEM_NUMBER','INTERNAL')),
  normalized_value citext NOT NULL,
  display_value text,
  source text NOT NULL CHECK (source IN ('costco_saver_db','licensed_primary','licensed_secondary','community','admin')),
  confidence integer NOT NULL DEFAULT 100 CHECK (confidence BETWEEN 0 AND 100),
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(identifier_type, normalized_value)
);
CREATE INDEX IF NOT EXISTS idx_identifiers_product ON product_identifiers(product_id);
CREATE INDEX IF NOT EXISTS idx_identifiers_value ON product_identifiers(normalized_value);

CREATE TABLE IF NOT EXISTS evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('shelf_photo','receipt_image','receipt_pdf','product_photo','other')),
  storage_key text NOT NULL,
  content_hash text,
  byte_size integer,
  moderation_state text NOT NULL DEFAULT 'pending' CHECK (moderation_state IN ('pending','approved','rejected','quarantined')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS price_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  price_cents bigint NOT NULL CHECK (price_cents >= 0),
  currency char(3) NOT NULL DEFAULT 'USD',
  observed_at timestamptz NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  source_type text NOT NULL CHECK (source_type IN ('shelf_scan','manual_shelf_entry','receipt','confirmation','correction','authorized_external_provider','administrator_verified')),
  markdown_class text NOT NULL CHECK (markdown_class IN ('clearance','manager_markdown','regular_signal','unclassified')),
  price_ending char(2) NOT NULL,
  has_asterisk boolean NOT NULL DEFAULT false,
  evidence_id uuid REFERENCES evidence(id) ON DELETE SET NULL,
  submitter_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  verification_status text NOT NULL DEFAULT 'verified' CHECK (verification_status IN ('pending','verified','rejected','flagged')),
  idempotency_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_observations_product_warehouse_time
  ON price_observations(product_id, warehouse_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_observations_warehouse_time
  ON price_observations(warehouse_id, observed_at DESC);

CREATE TABLE IF NOT EXISTS observation_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  observation_id uuid NOT NULL REFERENCES price_observations(id) ON DELETE CASCADE,
  confirmer_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  confirmed_price_cents bigint NOT NULL CHECK (confirmed_price_cents >= 0),
  conflict boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(observation_id, confirmer_user_id)
);

CREATE TABLE IF NOT EXISTS warehouse_product_state (
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  consensus_price_cents bigint CHECK (consensus_price_cents IS NULL OR consensus_price_cents >= 0),
  currency char(3) NOT NULL DEFAULT 'USD',
  markdown_class text,
  has_asterisk boolean NOT NULL DEFAULT false,
  first_seen_at timestamptz,
  last_verified_at timestamptz,
  latest_observation_id uuid REFERENCES price_observations(id) ON DELETE SET NULL,
  independent_confirmation_count integer NOT NULL DEFAULT 0,
  evidence_count integer NOT NULL DEFAULT 0,
  conflicting_report_count integer NOT NULL DEFAULT 0,
  confidence_score integer NOT NULL DEFAULT 0 CHECK (confidence_score BETWEEN 0 AND 100),
  freshness_class text NOT NULL DEFAULT 'HISTORICAL' CHECK (freshness_class IN ('LIVE','FRESH','RECENT','AGING','HISTORICAL')),
  availability_signal text NOT NULL DEFAULT 'unknown' CHECK (availability_signal IN ('in_stock','low_stock','out_of_stock','unknown')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(product_id, warehouse_id)
);
CREATE INDEX IF NOT EXISTS idx_state_warehouse ON warehouse_product_state(warehouse_id, confidence_score DESC, last_verified_at DESC);

CREATE TABLE IF NOT EXISTS price_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  observation_id uuid REFERENCES price_observations(id) ON DELETE SET NULL,
  old_price_cents bigint,
  new_price_cents bigint NOT NULL CHECK (new_price_cents >= 0),
  change_cents bigint,
  change_percent numeric(8,2),
  event_type text NOT NULL CHECK (event_type IN ('price_drop','price_increase','clearance_detected','manager_markdown_detected','returned_to_regular','first_observation')),
  confidence integer NOT NULL DEFAULT 0 CHECK (confidence BETWEEN 0 AND 100),
  effective_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_price_events_warehouse_time ON price_events(warehouse_id, effective_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_events_product_time ON price_events(product_id, effective_at DESC);

CREATE TABLE IF NOT EXISTS receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  warehouse_id uuid REFERENCES warehouses(id) ON DELETE SET NULL,
  purchase_date timestamptz NOT NULL,
  evidence_id uuid REFERENCES evidence(id) ON DELETE SET NULL,
  total_cents bigint CHECK (total_cents IS NULL OR total_cents >= 0),
  currency char(3) NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER receipts_updated_at BEFORE UPDATE ON receipts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS receipt_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  raw_description text,
  costco_item_number citext,
  quantity numeric(10,3) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price_cents bigint CHECK (unit_price_cents IS NULL OR unit_price_cents >= 0),
  discount_cents bigint NOT NULL DEFAULT 0,
  total_cents bigint NOT NULL CHECK (total_cents >= 0),
  currency char(3) NOT NULL DEFAULT 'USD',
  line_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  purchase_date timestamptz NOT NULL,
  unit_price_cents bigint NOT NULL CHECK (unit_price_cents >= 0),
  quantity numeric(10,3) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  discount_cents bigint NOT NULL DEFAULT 0,
  total_cents bigint NOT NULL CHECK (total_cents >= 0),
  currency char(3) NOT NULL DEFAULT 'USD',
  source text NOT NULL CHECK (source IN ('receipt','manual','imported')),
  receipt_id uuid REFERENCES receipts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_purchases_user_date ON purchases(user_id, purchase_date DESC);
CREATE TRIGGER purchases_updated_at BEFORE UPDATE ON purchases
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS watches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id uuid REFERENCES warehouses(id) ON DELETE CASCADE,
  target_price_cents bigint CHECK (target_price_cents IS NULL OR target_price_cents >= 0),
  target_percent numeric(5,2) CHECK (target_percent IS NULL OR target_percent BETWEEN 0 AND 100),
  notify_any_drop boolean NOT NULL DEFAULT false,
  notify_clearance boolean NOT NULL DEFAULT false,
  notify_manager_markdown boolean NOT NULL DEFAULT false,
  notify_asterisk boolean NOT NULL DEFAULT false,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_watches_user ON watches(user_id, created_at DESC);
CREATE TRIGGER watches_updated_at BEFORE UPDATE ON watches
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS saved_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  saved_price_cents bigint CHECK (saved_price_cents IS NULL OR saved_price_cents >= 0),
  saved_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id, warehouse_id)
);
CREATE INDEX IF NOT EXISTS idx_saved_deals_user ON saved_deals(user_id, saved_at DESC);

CREATE TABLE IF NOT EXISTS adjustment_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purchase_id uuid NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  price_event_id uuid REFERENCES price_events(id) ON DELETE SET NULL,
  purchase_price_cents bigint NOT NULL,
  new_price_cents bigint NOT NULL,
  quantity numeric(10,3) NOT NULL,
  potential_savings_cents bigint NOT NULL,
  purchase_date timestamptz NOT NULL,
  price_drop_date timestamptz,
  window_end timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'tracking' CHECK (status IN ('tracking','opportunity','claimed','denied','expired','dismissed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(purchase_id, price_event_id)
);
CREATE INDEX IF NOT EXISTS idx_adjustments_user_status ON adjustment_candidates(user_id, status, window_end);
CREATE TRIGGER adjustments_updated_at BEFORE UPDATE ON adjustment_candidates
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  warehouse_id uuid REFERENCES warehouses(id) ON DELETE SET NULL,
  price_event_id uuid REFERENCES price_events(id) ON DELETE SET NULL,
  adjustment_id uuid REFERENCES adjustment_candidates(id) ON DELETE SET NULL,
  notification_type text NOT NULL CHECK (notification_type IN ('price_drop','price_increase','clearance','manager_markdown','asterisk','watch_match','adjustment_opportunity','adjustment_expiring')),
  title text NOT NULL,
  body text NOT NULL,
  deep_link text,
  read_at timestamptz,
  delivered_at timestamptz,
  push_attempts integer NOT NULL DEFAULT 0,
  last_push_error text,
  next_push_attempt_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_notification_event
  ON notifications(user_id, price_event_id, notification_type)
  WHERE price_event_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('ios','android','web')),
  token text NOT NULL,
  app_version text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(platform, token)
);

CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewing','resolved','dismissed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER reports_updated_at BEFORE UPDATE ON reports
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS moderation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  moderator_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_created ON moderation_actions(created_at DESC);

CREATE TABLE IF NOT EXISTS shopping_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity numeric(10,3) NOT NULL DEFAULT 1 CHECK(quantity > 0),
  note text,
  preferred_warehouse_id uuid REFERENCES warehouses(id) ON DELETE SET NULL,
  checked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_shopping_list_user ON shopping_list_items(user_id, checked, created_at);
CREATE TRIGGER shopping_list_updated_at BEFORE UPDATE ON shopping_list_items
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Database defense-in-depth for private rows. The API sets app.user_id per transaction.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'user_warehouses','receipts','purchases','watches','saved_deals','shopping_list_items','adjustment_candidates',
    'notifications','device_tokens'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY %I_owner ON %I USING (current_setting(''app.internal'', true) = ''true'' OR user_id = nullif(current_setting(''app.user_id'', true), '''')::uuid) WITH CHECK (current_setting(''app.internal'', true) = ''true'' OR user_id = nullif(current_setting(''app.user_id'', true), '''')::uuid)',
      table_name, table_name
    );
  END LOOP;
END $$;

ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens FORCE ROW LEVEL SECURITY;
CREATE POLICY refresh_tokens_owner ON refresh_tokens
USING (current_setting('app.internal', true) = 'true' OR user_id = nullif(current_setting('app.user_id', true), '')::uuid)
WITH CHECK (current_setting('app.internal', true) = 'true' OR user_id = nullif(current_setting('app.user_id', true), '')::uuid);

ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence FORCE ROW LEVEL SECURITY;
CREATE POLICY evidence_owner ON evidence
USING (current_setting('app.internal', true) = 'true' OR owner_user_id = nullif(current_setting('app.user_id', true), '')::uuid)
WITH CHECK (current_setting('app.internal', true) = 'true' OR owner_user_id = nullif(current_setting('app.user_id', true), '')::uuid);

ALTER TABLE receipt_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_lines FORCE ROW LEVEL SECURITY;
CREATE POLICY receipt_lines_owner ON receipt_lines
USING (
  current_setting('app.internal', true) = 'true'
  OR EXISTS (
    SELECT 1 FROM receipts r
    WHERE r.id = receipt_lines.receipt_id
      AND r.user_id = nullif(current_setting('app.user_id', true), '')::uuid
  )
)
WITH CHECK (
  current_setting('app.internal', true) = 'true'
  OR EXISTS (
    SELECT 1 FROM receipts r
    WHERE r.id = receipt_lines.receipt_id
      AND r.user_id = nullif(current_setting('app.user_id', true), '')::uuid
  )
);
