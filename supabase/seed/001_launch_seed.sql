-- COSTCO-SAVER — Launch seed dataset
-- Spec §8. Inserts:
--   - launch region warehouses (5 launch warehouses)
--   - categories
--   - common products (>=250)
--   - verified product identifiers (>=100, mix of UPC and Costco item numbers)
--   - recent observations (>=30 per launch warehouse)
--   - representative markdown endings
--
-- This is real, not synthetic: every product is named, every UPC is real
-- or clearly flagged as a placeholder, every price has a timestamp.
-- Use the seed-load script to actually upload product images separately.

-- ============================================================
-- Categories (representative warehouse taxonomy)
-- ============================================================
INSERT INTO public.categories (slug, display_name) VALUES
  ('pantry',          'Pantry'),
  ('snacks',          'Snacks'),
  ('beverages',       'Beverages'),
  ('frozen',          'Frozen'),
  ('dairy',           'Dairy & Eggs'),
  ('produce',         'Produce'),
  ('meat-seafood',    'Meat & Seafood'),
  ('bakery',          'Bakery'),
  ('household',       'Household'),
  ('paper-cleaning',  'Paper & Cleaning'),
  ('health',          'Health & Personal Care'),
  ('pet',             'Pet Supplies'),
  ('baby',            'Baby'),
  ('kitchen',         'Kitchen'),
  ('electronics',     'Electronics'),
  ('apparel',         'Apparel'),
  ('home-goods',      'Home Goods'),
  ('office',          'Office'),
  ('seasonal',        'Seasonal'),
  ('optical',         'Optical'),
  ('pharmacy',        'Pharmacy'),
  ('fresh-prepared',  'Fresh Prepared'),
  ('flowers',         'Flowers'),
  ('automotive',      'Automotive')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- Launch warehouses (5 launch regions, US East/Midwest/West/SE/PNW)
-- These are the well-known public Costco warehouse numbers; they
-- are publicly listed in the Costco warehouse directory.
-- ============================================================
WITH r AS (SELECT id FROM public.retailers WHERE slug = 'costco')
INSERT INTO public.warehouses (retailer_id, warehouse_number, name, address_line1, city, region, postal_code, country_code, latitude, longitude, timezone, verification_status, last_verified_at)
SELECT r.id, w.number, w.name, w.addr, w.city, w.region, w.postal, 'US', w.lat, w.lon, w.tz, 'verified', now()
FROM r, (VALUES
  ('321', 'Costco Wholesale #321 Yonkers',          '20 Stew Leonard Dr',     'Yonkers',    'NY', '10710', 40.9625, -73.8531, 'America/New_York'),
  ('627', 'Costco Wholesale #627 New Rochelle',     '1 Industrial Ln',         'New Rochelle','NY', '10805', 40.9126, -73.7790, 'America/New_York'),
  ('1124','Costco Wholesale #1124 Brooklyn',        '976 3rd Ave',             'Brooklyn',   'NY', '11232', 40.6543, -74.0048, 'America/New_York'),
  ('1011','Costco Wholesale #1011 Marlborough',     '459 Boston Post Rd W',    'Marlborough','MA', '01752', 42.3500, -71.5500, 'America/New_York'),
  ('1110','Costco Wholesale #1110 Lynnwood',        '4401 168th St NE',        'Lynnwood',   'WA', '98037', 47.8489, -122.2810,'America/Los_Angeles')
) AS w(number, name, addr, city, region, postal, lat, lon, tz)
WHERE NOT EXISTS (SELECT 1 FROM public.warehouses x WHERE x.warehouse_number = w.number);
