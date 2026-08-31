-- COSTCO-SAVER — storage buckets and policies
-- Spec §51.

-- Public product evidence (photos showing product/packaging, no PII)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'public-product-evidence',
  'public-product-evidence',
  true,
  10485760, -- 10 MiB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Private receipts (owner-only read)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'private-receipts',
  'private-receipts',
  false,
  20971520, -- 20 MiB (receipts can be larger)
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Private user media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'private-user-media',
  'private-user-media',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Moderation quarantine (service role only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'moderation-quarantine',
  'moderation-quarantine',
  false,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Public product evidence: anyone can read.
CREATE POLICY "public-product-evidence read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'public-product-evidence');

-- Authenticated users can upload into their own path prefix.
CREATE POLICY "public-product-evidence upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'public-product-evidence'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Private receipts: only owner can read/write.
CREATE POLICY "private-receipts owner read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'private-receipts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "private-receipts owner write"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'private-receipts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Private user media: only owner.
CREATE POLICY "private-user-media owner read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'private-user-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "private-user-media owner write"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'private-user-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
