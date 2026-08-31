-- COSTCO-SAVER — categories, products, identifiers
-- Spec §19.

CREATE TABLE IF NOT EXISTS public.categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  slug        citext UNIQUE NOT NULL,
  display_name text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Trigram search on category name
CREATE INDEX IF NOT EXISTS idx_categories_name_trgm ON public.categories USING gin (display_name gin_trgm_ops);

-- Canonical product
CREATE TABLE IF NOT EXISTS public.products (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name  text NOT NULL,
  brand           text,
  description     text,
  category_id     uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  size_value      numeric,
  size_unit       text,
  image_asset_id  uuid, -- populated when an image is uploaded to public-product-evidence
  status          text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'merged', 'retired')),
  merged_into_id  uuid REFERENCES public.products(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON public.products USING gin (canonical_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_brand_trgm ON public.products USING gin (brand gin_trgm_ops) WHERE brand IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products (status);

CREATE TRIGGER products_set_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Identifiers (UPC, EAN, GTIN, Costco item number)
CREATE TABLE IF NOT EXISTS public.product_identifiers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  identifier_type text NOT NULL
    CHECK (identifier_type IN ('UPC_A', 'UPC_E', 'EAN_8', 'EAN_13', 'GTIN_14', 'COSTCO_ITEM_NUMBER', 'INTERNAL')),
  normalized_value citext NOT NULL,
  display_value    text,
  source          text NOT NULL
    CHECK (source IN ('local_cache', 'costco_saver_db', 'licensed_primary', 'licensed_secondary', 'community', 'admin')),
  source_record   text,
  confidence      integer NOT NULL DEFAULT 100 CHECK (confidence BETWEEN 0 AND 100),
  verified_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (identifier_type, normalized_value)
);

CREATE INDEX IF NOT EXISTS idx_identifiers_product ON public.product_identifiers (product_id);
CREATE INDEX IF NOT EXISTS idx_identifiers_lookup ON public.product_identifiers (identifier_type, normalized_value);

-- Product aliases (when merges happen, old product_id remains addressable)
CREATE TABLE IF NOT EXISTS public.product_aliases (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  old_product_id  uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  new_product_id  uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  reason          text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aliases_old ON public.product_aliases (old_product_id);

-- Products are public-readable so the deal feed works.
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_identifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY products_select_public ON public.products FOR SELECT USING (status <> 'retired');
CREATE POLICY identifiers_select_public ON public.product_identifiers FOR SELECT USING (true);
CREATE POLICY aliases_select_public ON public.product_aliases FOR SELECT USING (true);
CREATE POLICY categories_select_public ON public.categories FOR SELECT USING (true);

-- Mutations are service-role only (admin / Edge Functions).
