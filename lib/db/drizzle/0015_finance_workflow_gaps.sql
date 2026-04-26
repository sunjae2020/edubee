-- ============================================================
-- 0015: Finance Workflow Gaps
-- Gap 1:  contracts.quote_id → UNIQUE + FK
-- Gap 3:  invoice_products table (신설)
-- Gap 4:  invoices.account_id 추가
-- Gap 5:  receipts.payment_header_id 추가
-- Gap 6:  contract_products.ap_trigger + invoice_count 추가
-- Gap 7:  accommodation_mgt.billing_cycle 추가
-- ============================================================

-- ── Gap 1: contracts.quote_id ────────────────────────────────
-- Null 값을 제외하고 UNIQUE 제약 적용 (이미 data 있으면 충돌 방지)
ALTER TABLE contracts
  ADD CONSTRAINT contracts_quote_id_unique UNIQUE (quote_id);

ALTER TABLE contracts
  ADD CONSTRAINT contracts_quote_id_fkey
  FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE SET NULL;

-- ── Gap 3: invoice_products 신설 ─────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_products (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id          uuid        NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  contract_product_id uuid        REFERENCES contract_products(id) ON DELETE SET NULL,
  name                varchar(255),
  description         text,
  quantity            integer     NOT NULL DEFAULT 1,
  unit_price          decimal(12,2) NOT NULL DEFAULT 0,
  amount              decimal(12,2) NOT NULL DEFAULT 0,
  sort_index          integer     NOT NULL DEFAULT 0,
  organisation_id     uuid,
  created_at          timestamp   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ip_invoice         ON invoice_products(invoice_id);
CREATE INDEX IF NOT EXISTS idx_ip_contract_product ON invoice_products(contract_product_id);

-- ── Gap 4: invoices.account_id ───────────────────────────────
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_account_id ON invoices(account_id);

-- ── Gap 5: receipts.payment_header_id ───────────────────────
ALTER TABLE receipts
  ADD COLUMN IF NOT EXISTS payment_header_id uuid;

CREATE INDEX IF NOT EXISTS idx_receipts_payment_header ON receipts(payment_header_id);

-- ── Gap 6: contract_products 컬럼 추가 ──────────────────────
ALTER TABLE contract_products
  ADD COLUMN IF NOT EXISTS ap_trigger    varchar(30) DEFAULT 'on_ar_paid';

ALTER TABLE contract_products
  ADD COLUMN IF NOT EXISTS invoice_count integer NOT NULL DEFAULT 0;

-- ── Gap 7: accommodation_mgt.billing_cycle ───────────────────
ALTER TABLE accommodation_mgt
  ADD COLUMN IF NOT EXISTS billing_cycle varchar(20);
