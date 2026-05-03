-- ============================================================
-- 0020: Tenant isolation — chart_of_accounts + journal_entry_mappings
--
-- Phase 3 of tenant separation. Replicates existing platform-wide
-- masters to each of 7 tenants, then enforces per-tenant uniqueness
-- and composite FKs (organisation_id, code).
--
-- Existing data:
--   chart_of_accounts: 34 rows (assigned to myagency, then cloned to 6 others)
--   journal_entry_mappings: 14 rows (same pattern)
--   product_cost_lines: 0 rows (safe to add NOT NULL)
--
-- After this migration each tenant has their own editable copy.
-- ============================================================

-- ── 1. Add organisation_id columns (nullable, backfill, then NOT NULL) ──
ALTER TABLE chart_of_accounts
  ADD COLUMN IF NOT EXISTS organisation_id uuid REFERENCES organisations(id) ON DELETE RESTRICT;

ALTER TABLE journal_entry_mappings
  ADD COLUMN IF NOT EXISTS organisation_id uuid REFERENCES organisations(id) ON DELETE RESTRICT;

ALTER TABLE product_cost_lines
  ADD COLUMN IF NOT EXISTS organisation_id uuid REFERENCES organisations(id) ON DELETE RESTRICT;

-- ── 2. Backfill existing rows to myagency (Edubee HQ) ──
DO $$
DECLARE
  myagency_id uuid;
BEGIN
  SELECT id INTO myagency_id FROM organisations WHERE subdomain = 'myagency' LIMIT 1;
  IF myagency_id IS NULL THEN
    RAISE EXCEPTION 'myagency organisation not found — abort';
  END IF;

  UPDATE chart_of_accounts        SET organisation_id = myagency_id WHERE organisation_id IS NULL;
  UPDATE journal_entry_mappings   SET organisation_id = myagency_id WHERE organisation_id IS NULL;
  -- product_cost_lines is empty; nothing to backfill.
END $$;

ALTER TABLE chart_of_accounts        ALTER COLUMN organisation_id SET NOT NULL;
ALTER TABLE journal_entry_mappings   ALTER COLUMN organisation_id SET NOT NULL;
-- product_cost_lines stays nullable for now (0 rows, will be enforced at insert)

CREATE INDEX IF NOT EXISTS idx_coa_org ON chart_of_accounts(organisation_id);
CREATE INDEX IF NOT EXISTS idx_jem_org ON journal_entry_mappings(organisation_id);
CREATE INDEX IF NOT EXISTS idx_pcl_org ON product_cost_lines(organisation_id);

-- ── 3. Drop FKs that reference chart_of_accounts(code) ──
ALTER TABLE journal_entries        DROP CONSTRAINT IF EXISTS journal_entries_debit_coa_chart_of_accounts_code_fk;
ALTER TABLE journal_entries        DROP CONSTRAINT IF EXISTS journal_entries_credit_coa_chart_of_accounts_code_fk;
ALTER TABLE journal_entry_mappings DROP CONSTRAINT IF EXISTS journal_entry_mappings_debit_coa_fkey;
ALTER TABLE journal_entry_mappings DROP CONSTRAINT IF EXISTS journal_entry_mappings_credit_coa_fkey;
ALTER TABLE payment_lines          DROP CONSTRAINT IF EXISTS payment_lines_coa_code_chart_of_accounts_code_fk;
ALTER TABLE product_cost_lines     DROP CONSTRAINT IF EXISTS product_cost_lines_coa_code_chart_of_accounts_code_fk;
ALTER TABLE transactions           DROP CONSTRAINT IF EXISTS transactions_cost_center_code_fkey;

-- ── 4. Drop the global UNIQUE on chart_of_accounts.code ──
ALTER TABLE chart_of_accounts
  DROP CONSTRAINT IF EXISTS chart_of_accounts_code_key;
ALTER TABLE chart_of_accounts
  DROP CONSTRAINT IF EXISTS chart_of_accounts_code_unique;

-- ── 5. Drop the global UNIQUE on journal_entry_mappings(payment_type, split_type) ──
ALTER TABLE journal_entry_mappings
  DROP CONSTRAINT IF EXISTS journal_entry_mappings_key;

-- ── 6. Add composite UNIQUE constraints (org-scoped) ──
ALTER TABLE chart_of_accounts
  ADD CONSTRAINT chart_of_accounts_org_code_unique UNIQUE (organisation_id, code);

ALTER TABLE journal_entry_mappings
  ADD CONSTRAINT journal_entry_mappings_org_key UNIQUE (organisation_id, payment_type, split_type);

-- ── 7. Replicate seed rows to other 6 tenants ──
DO $$
DECLARE
  myagency_id uuid;
BEGIN
  SELECT id INTO myagency_id FROM organisations WHERE subdomain = 'myagency' LIMIT 1;

  -- chart_of_accounts: clone every myagency row into every other Active tenant
  INSERT INTO chart_of_accounts (organisation_id, code, name, account_type, description, parent_code, is_active, created_on, modified_on)
  SELECT o.id, coa.code, coa.name, coa.account_type, coa.description, coa.parent_code, coa.is_active, NOW(), NOW()
  FROM chart_of_accounts coa
  CROSS JOIN organisations o
  WHERE coa.organisation_id = myagency_id
    AND o.id != myagency_id
    AND o.status = 'Active'
  ON CONFLICT (organisation_id, code) DO NOTHING;

  -- journal_entry_mappings: same pattern
  INSERT INTO journal_entry_mappings (organisation_id, payment_type, split_type, debit_coa, credit_coa, entry_type, description, is_active, created_on, modified_on)
  SELECT o.id, jem.payment_type, jem.split_type, jem.debit_coa, jem.credit_coa, jem.entry_type, jem.description, jem.is_active, NOW(), NOW()
  FROM journal_entry_mappings jem
  CROSS JOIN organisations o
  WHERE jem.organisation_id = myagency_id
    AND o.id != myagency_id
    AND o.status = 'Active'
  ON CONFLICT (organisation_id, payment_type, split_type) DO NOTHING;
END $$;

-- ── 8. Re-add composite FKs (organisation_id, code) on referencing tables ──
-- All tables below already have organisation_id (added in 0019 or earlier).
-- product_cost_lines: organisation_id is nullable (0 rows); FK uses MATCH SIMPLE which allows
-- partial NULL — still safe.

ALTER TABLE journal_entries
  ADD CONSTRAINT journal_entries_debit_coa_org_fk
  FOREIGN KEY (organisation_id, debit_coa)
  REFERENCES chart_of_accounts(organisation_id, code)
  ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE journal_entries
  ADD CONSTRAINT journal_entries_credit_coa_org_fk
  FOREIGN KEY (organisation_id, credit_coa)
  REFERENCES chart_of_accounts(organisation_id, code)
  ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE journal_entry_mappings
  ADD CONSTRAINT journal_entry_mappings_debit_coa_org_fk
  FOREIGN KEY (organisation_id, debit_coa)
  REFERENCES chart_of_accounts(organisation_id, code)
  ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE journal_entry_mappings
  ADD CONSTRAINT journal_entry_mappings_credit_coa_org_fk
  FOREIGN KEY (organisation_id, credit_coa)
  REFERENCES chart_of_accounts(organisation_id, code)
  ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE payment_lines
  ADD CONSTRAINT payment_lines_coa_code_org_fk
  FOREIGN KEY (organisation_id, coa_code)
  REFERENCES chart_of_accounts(organisation_id, code)
  ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE product_cost_lines
  ADD CONSTRAINT product_cost_lines_coa_code_org_fk
  FOREIGN KEY (organisation_id, coa_code)
  REFERENCES chart_of_accounts(organisation_id, code)
  ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE transactions
  ADD CONSTRAINT transactions_cost_center_code_org_fk
  FOREIGN KEY (organisation_id, cost_center_code)
  REFERENCES chart_of_accounts(organisation_id, code)
  ON UPDATE CASCADE ON DELETE RESTRICT;
