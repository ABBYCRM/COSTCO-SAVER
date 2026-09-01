INSERT INTO warehouses(
  id, retailer, retailer_warehouse_id, name, address_1, city, state, postal_code, country, timezone,
  latitude, longitude, verification_status, active
) VALUES
  ('10000000-0000-4000-8000-000000000001','costco','TEST-001','Test Warehouse East','1 Test Way','New York','NY','10001','US','America/New_York',40.750000,-73.990000,'verified',true),
  ('10000000-0000-4000-8000-000000000002','costco','TEST-002','Test Warehouse West','2 Test Way','Los Angeles','CA','90001','US','America/Los_Angeles',34.050000,-118.250000,'verified',true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO products(
  id, canonical_name, brand, description, status
) VALUES
  ('20000000-0000-4000-8000-000000000001','Test Paper Towels','Test Brand','Deterministic CI fixture','active'),
  ('20000000-0000-4000-8000-000000000002','Test Coffee','Test Brand','Deterministic CI fixture','active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO product_identifiers(
  product_id, identifier_type, normalized_value, display_value, source, confidence, verified_at
) VALUES
  ('20000000-0000-4000-8000-000000000001','UPC_A','036000291452','036000291452','admin',100,now()),
  ('20000000-0000-4000-8000-000000000001','COSTCO_ITEM_NUMBER','900001','900001','admin',100,now()),
  ('20000000-0000-4000-8000-000000000002','EAN_13','4006381333931','4006381333931','admin',100,now())
ON CONFLICT (identifier_type, normalized_value) DO NOTHING;
