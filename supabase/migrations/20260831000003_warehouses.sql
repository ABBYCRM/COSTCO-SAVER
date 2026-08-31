-- COSTCO-SAVER — warehouses
-- Spec §9, §36.

-- Retailer abstraction (spec §91) so future retailers can plug in.
CREATE TABLE IF NOT EXISTS public.retailers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        citext UNIQUE NOT NULL,
  display_name text NOT NULL,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.retailers (slug, display_name) VALUES
  ('costco', 'Costco')
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.warehouses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  retailer_id     uuid NOT NULL REFERENCES public.retailers(id) ON DELETE RESTRICT,
  warehouse_number text, -- Costco #321 etc; null until verified
  name            text NOT NULL,
  address_line1   text,
  city            text,
  region          text,
  postal_code     text,
  country_code    char(2) NOT NULL DEFAULT 'US',
  latitude        double precision,
  longitude       double precision,
  timezone        text NOT NULL DEFAULT 'America/New_York',
  verification_status text NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified', 'verified', 'flagged', 'retired')),
  last_verified_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- A warehouse is keyed on (retailer, number) once number is set, but
-- the same physical address may exist without a number for human verification.
CREATE UNIQUE INDEX IF NOT EXISTS uq_warehouses_retailer_number
  ON public.warehouses (retailer_id, warehouse_number)
  WHERE warehouse_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_warehouses_geo
  ON public.warehouses (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_warehouses_city
  ON public.warehouses (city, region);

-- Backfill FK on profiles
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_home_warehouse_fk
  FOREIGN KEY (home_warehouse_id) REFERENCES public.warehouses(id) ON DELETE SET NULL;

CREATE TRIGGER warehouses_set_updated_at
  BEFORE UPDATE ON public.warehouses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Warehouse directory is public (so the app can render nearby-warehouse lists)
-- but mutations are admin-only via service role.
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;

CREATE POLICY warehouses_select_public ON public.warehouses
  FOR SELECT USING (verification_status <> 'retired');

CREATE POLICY retailers_select_public ON public.retailers
  FOR SELECT USING (active = true);

-- Writes are blocked for client roles (service role bypasses RLS for admin).
-- Admin writes happen via Edge Functions (spec §48).
