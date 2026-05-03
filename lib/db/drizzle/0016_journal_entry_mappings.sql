-- ============================================================
-- 0016: Journal Entry Mappings (DR/CR Rules → DB)
-- Single source of truth for paymentType × splitType → DR/CR.
-- Replaces in-code DR_CR_MAP in services/journalEntryService.ts.
-- See FINANCE_SYSTEM_GUIDE.md §4.2.
-- ============================================================

CREATE TABLE IF NOT EXISTS journal_entry_mappings (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_type  varchar(50)   NOT NULL,
  split_type    varchar(50)   NOT NULL DEFAULT '*',
  debit_coa     varchar(10)   NOT NULL REFERENCES chart_of_accounts(code),
  credit_coa    varchar(10)   NOT NULL REFERENCES chart_of_accounts(code),
  entry_type    varchar(50)   NOT NULL,
  description   text,
  is_active     boolean       NOT NULL DEFAULT true,
  created_on    timestamp     NOT NULL DEFAULT now(),
  modified_on   timestamp     NOT NULL DEFAULT now(),
  created_by    uuid          REFERENCES users(id),
  CONSTRAINT journal_entry_mappings_key UNIQUE (payment_type, split_type)
);

CREATE INDEX IF NOT EXISTS idx_jem_active ON journal_entry_mappings(is_active);

-- ── Seed: mirror current DR_CR_MAP exactly ──────────────────
INSERT INTO journal_entry_mappings (payment_type, split_type, debit_coa, credit_coa, entry_type, description) VALUES
  ('trust_receipt',  'tuition',       '1200', '2100', 'trust_receipt',       'Student tuition deposit to trust'),
  ('trust_receipt',  'accommodation', '1200', '2300', 'trust_receipt',       'Student accommodation deposit to trust'),
  ('trust_receipt',  'pickup',        '1200', '2400', 'trust_receipt',       'Student pickup deposit to trust'),
  ('trust_receipt',  'insurance',     '1200', '2200', 'trust_receipt',       'Student insurance/visa deposit to trust'),
  ('direct',         'service_fee',   '1100', '3400', 'service_fee',         'Direct service fee receipt'),
  ('direct',         'visa_fee',      '1100', '3400', 'service_fee',         'Direct visa fee receipt'),
  ('trust_transfer', '*',             '2100', '1200', 'school_transfer',     'Trust → school remittance'),
  ('commission',     'pre_deduct',    '1200', '3100', 'commission_received', 'Commission via NET (pre-deduct)'),
  ('commission',     'invoice',       '1100', '1300', 'commission_received', 'Commission via GROSS (invoice)'),
  ('cost_payment',   'sub_agent',     '4100', '1100', 'cost_payment',        'Sub-agent commission paid'),
  ('cost_payment',   'super_agent',   '4200', '1100', 'cost_payment',        'Super-agent commission paid'),
  ('cost_payment',   'referral',      '4300', '1100', 'cost_payment',        'Referral fee paid'),
  ('cost_payment',   'salary',        '5200', '1100', 'cost_payment',        'Staff salary paid'),
  ('cost_payment',   'incentive',     '5300', '1100', 'cost_payment',        'Staff incentive paid')
ON CONFLICT (payment_type, split_type) DO NOTHING;
