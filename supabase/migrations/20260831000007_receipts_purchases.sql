-- COSTCO-SAVER — receipts, purchases
-- Spec §26–§29, §47, §51.

CREATE TABLE IF NOT EXISTS public.receipts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  warehouse_id    uuid REFERENCES public.warehouses(id) ON DELETE SET NULL,
  purchase_date   timestamptz NOT NULL,
  evidence_id     uuid REFERENCES public.evidence(id) ON DELETE SET NULL,
  ocr_raw         text,
  ocr_status      text NOT NULL DEFAULT 'pending'
    CHECK (ocr_status IN ('pending', 'parsed', 'corrected', 'failed')),
  total_cents     bigint CHECK (total_cents IS NULL OR total_cents >= 0),
  currency        char(3) NOT NULL DEFAULT 'USD',
  status          text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'rejected')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_receipts_user_date ON public.receipts (user_id, purchase_date DESC);
CREATE INDEX IF NOT EXISTS idx_receipts_warehouse ON public.receipts (warehouse_id);

ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY receipts_select_own ON public.receipts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY receipts_insert_own ON public.receipts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY receipts_update_own ON public.receipts FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY receipts_delete_own ON public.receipts FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER receipts_set_updated_at
  BEFORE UPDATE ON public.receipts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Each line on the receipt. Private.
CREATE TABLE IF NOT EXISTS public.receipt_lines (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id      uuid NOT NULL REFERENCES public.receipts(id) ON DELETE CASCADE,
  product_id      uuid REFERENCES public.products(id) ON DELETE SET NULL,
  raw_description text,
  costco_item_number citext,
  quantity        numeric(10, 3) NOT NULL DEFAULT 1,
  unit_price_cents bigint CHECK (unit_price_cents IS NULL OR unit_price_cents >= 0),
  discount_cents  bigint NOT NULL DEFAULT 0,
  total_cents     bigint NOT NULL,
  currency        char(3) NOT NULL DEFAULT 'USD',
  line_order      integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_receipt_lines_receipt ON public.receipt_lines (receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipt_lines_product ON public.receipt_lines (product_id) WHERE product_id IS NOT NULL;

ALTER TABLE public.receipt_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY receipt_lines_select_own ON public.receipt_lines
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.receipts r WHERE r.id = receipt_lines.receipt_id AND r.user_id = auth.uid()));
CREATE POLICY receipt_lines_insert_own ON public.receipt_lines
  FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.receipts r WHERE r.id = receipt_lines.receipt_id AND r.user_id = auth.uid()));
CREATE POLICY receipt_lines_update_own ON public.receipt_lines
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.receipts r WHERE r.id = receipt_lines.receipt_id AND r.user_id = auth.uid()));
CREATE POLICY receipt_lines_delete_own ON public.receipt_lines
  FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.receipts r WHERE r.id = receipt_lines.receipt_id AND r.user_id = auth.uid()));

-- Private purchase ledger (spec §29). One row per confirmed purchase line.
CREATE TABLE IF NOT EXISTS public.purchases (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id      uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  warehouse_id    uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  purchase_date   timestamptz NOT NULL,
  unit_price_cents bigint NOT NULL CHECK (unit_price_cents >= 0),
  quantity        numeric(10, 3) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  discount_cents  bigint NOT NULL DEFAULT 0,
  total_cents     bigint NOT NULL CHECK (total_cents >= 0),
  currency        char(3) NOT NULL DEFAULT 'USD',
  source          text NOT NULL
    CHECK (source IN ('receipt', 'manual', 'imported')),
  receipt_id      uuid REFERENCES public.receipts(id) ON DELETE SET NULL,
  receipt_line_id uuid REFERENCES public.receipt_lines(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_purchases_user_date ON public.purchases (user_id, purchase_date DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_product_warehouse_date
  ON public.purchases (product_id, warehouse_id, purchase_date DESC);

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY purchases_select_own ON public.purchases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY purchases_insert_own ON public.purchases FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY purchases_update_own ON public.purchases FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY purchases_delete_own ON public.purchases FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER purchases_set_updated_at
  BEFORE UPDATE ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
