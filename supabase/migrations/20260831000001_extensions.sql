-- COSTCO-SAVER — migration order per spec §83.
-- This file: extensions.

-- pgcrypto: gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- pg_trgm: trigram indexes for product search (spec §45)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- citext: case-insensitive text for barcodes, item numbers, emails
CREATE EXTENSION IF NOT EXISTS "citext";

-- btree_gin / btree_gist: composite indexes
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "btree_gist";
