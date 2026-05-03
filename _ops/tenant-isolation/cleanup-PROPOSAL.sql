-- ═════════════════════════════════════════════════════════════════════════
--  CROSS-TENANT LEAK CLEANUP — PROPOSAL ONLY (DO NOT RUN AUTO)
--  Generated 2026-04-30 by Edubee tenant isolation audit
--
--  ⚠️  STOP & READ:
--    1. Wrap in transaction
--    2. Run on STAGING/DEV first (after Tier-3 dev DB separation)
--    3. Take a DB snapshot in Supabase BEFORE applying
--    4. Each block has a SELECT version — run that first to verify counts
-- ═════════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────────────
-- BLOCK A — Quarantine the 24 leaked contracts in timest.contracts
--
-- These rows have organisation_id = 24fafb4c-... (foreign tenant) AND
-- account_id that doesn't exist in timest.accounts (orphaned).
-- They were imported on 2026-04-26 03:35-03:36 (12-second burst) — likely
-- an aborted bulk import that was never rolled back.
-- ──────────────────────────────────────────────────────────────────────────

-- A1. Verify count (read-only)
SELECT count(*) AS will_be_quarantined
FROM timest.contracts
WHERE organisation_id = '24fafb4c-92d6-4818-9e4d-eef2355199e8';
-- Expected: 24

-- A2. Move to quarantine (recommended over DELETE)
BEGIN;
  CREATE TABLE IF NOT EXISTS public._quarantine_contracts_2026_04_30 (LIKE timest.contracts INCLUDING ALL);

  INSERT INTO public._quarantine_contracts_2026_04_30
  SELECT * FROM timest.contracts
  WHERE organisation_id = '24fafb4c-92d6-4818-9e4d-eef2355199e8';

  DELETE FROM timest.contracts
  WHERE organisation_id = '24fafb4c-92d6-4818-9e4d-eef2355199e8';

  -- Verify
  SELECT 'quarantined', count(*) FROM public._quarantine_contracts_2026_04_30
  UNION ALL
  SELECT 'remaining_leak_in_timest', count(*) FROM timest.contracts
    WHERE organisation_id = '24fafb4c-92d6-4818-9e4d-eef2355199e8';
  -- Expected: quarantined=24, remaining_leak_in_timest=0
COMMIT;

-- ──────────────────────────────────────────────────────────────────────────
-- BLOCK B — Decision required: myagency schema strategy
--
-- myagency has 285 contacts, 310 contracts, 385 accounts mixing 3 org_ids.
-- This is the LEGACY shared schema. timest schema (per-tenant) was added later.
--
-- Three architectural options:
--
--   Option 1: SUNSET myagency — migrate timest data to timest schema, drop rest
--   Option 2: KEEP myagency as canonical, drop per-tenant schemas
--   Option 3: HYBRID — myagency = platform schema (no tenant data), per-tenant
--             schemas = canonical for tenant data. Move all tenant-tagged
--             rows from myagency into respective per-tenant schemas.
--
-- 👉 RECOMMENDED: Option 3 (matches PLATFORM_SUBDOMAIN=myagency intent)
--
-- Implementation (DRAFT — review carefully):
--
-- For each tenant (timest, …):
--   For each tagged table in myagency:
--     INSERT INTO <tenant>.<table>
--     SELECT * FROM myagency.<table>
--     WHERE organisation_id = <tenant_org_id>
--     ON CONFLICT (id) DO NOTHING;     -- preserve existing per-tenant
--
--     DELETE FROM myagency.<table>
--     WHERE organisation_id = <tenant_org_id>;
--
-- Then for ghost org_ids (24fafb4c, a1b2c3d4):
--   Move to public._quarantine_<table>_2026_04_30
--   Investigate origin (which tenant subdomain was being onboarded?)
--   Either reassign to correct tenant or DELETE
-- ──────────────────────────────────────────────────────────────────────────

-- B1. PRE-CHECK — confirm which rows in myagency duplicate timest schema (id collision)
SELECT 'accounts'  AS tbl, count(*) FROM myagency.accounts ma
  JOIN timest.accounts ta ON ta.id = ma.id WHERE ma.organisation_id='7374edd3-bb70-4207-a82b-d9ced66e3cfc'
UNION ALL
SELECT 'contacts',  count(*) FROM myagency.contacts ma
  JOIN timest.contacts ta ON ta.id = ma.id WHERE ma.organisation_id='7374edd3-bb70-4207-a82b-d9ced66e3cfc'
UNION ALL
SELECT 'contracts', count(*) FROM myagency.contracts ma
  JOIN timest.contracts ta ON ta.id = ma.id WHERE ma.organisation_id='7374edd3-bb70-4207-a82b-d9ced66e3cfc';
-- Run this to see how much overlap exists. High overlap = safer to delete from myagency.
-- Low overlap = data divergence; need manual review on which version is canonical.

-- ──────────────────────────────────────────────────────────────────────────
-- BLOCK C — Quarantine all ghost org_ids from every schema (safe op)
-- ──────────────────────────────────────────────────────────────────────────

-- C1. Identify all rows tagged with the ghost org_id
SELECT 'myagency.contacts',  count(*) FROM myagency.contacts  WHERE organisation_id='a1b2c3d4-e5f6-7890-abcd-ef1234567890'
UNION ALL
SELECT 'myagency.contracts', count(*) FROM myagency.contracts WHERE organisation_id='a1b2c3d4-e5f6-7890-abcd-ef1234567890';
-- Expected: contacts=38, contracts=1

-- C2. Move ghosts to quarantine
BEGIN;
  CREATE TABLE IF NOT EXISTS public._quarantine_ghost_contacts  (LIKE myagency.contacts  INCLUDING ALL);
  CREATE TABLE IF NOT EXISTS public._quarantine_ghost_contracts (LIKE myagency.contracts INCLUDING ALL);

  INSERT INTO public._quarantine_ghost_contacts
    SELECT * FROM myagency.contacts WHERE organisation_id='a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  INSERT INTO public._quarantine_ghost_contracts
    SELECT * FROM myagency.contracts WHERE organisation_id='a1b2c3d4-e5f6-7890-abcd-ef1234567890';

  DELETE FROM myagency.contacts  WHERE organisation_id='a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  DELETE FROM myagency.contracts WHERE organisation_id='a1b2c3d4-e5f6-7890-abcd-ef1234567890';
COMMIT;
