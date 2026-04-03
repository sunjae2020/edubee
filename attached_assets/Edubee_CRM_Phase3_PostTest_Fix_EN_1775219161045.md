# 🐝 Edubee CRM — Phase 3 Post-Test Fix Prompt
# For Replit AI Agent
# Date: 2026-04-03 | Version: v1.0 (EN)
# Source: Phase 3 Test Report — FAIL 4 / WARN 5
# Completion before fix: 94% (68/72)

---

## 📌 Context

Phase 3 test returned **4 FAIL items** and **5 WARN items**.
This prompt resolves all of them in priority order.

**Core Principle: Never break existing working code.**

---

## 🛡️ Safety Rules

- Read every relevant file before making changes
- One fix at a time — `npx tsc --noEmit` after each
- DB changes use `IF NOT EXISTS` / `UPDATE ... WHERE` — never destructive
- Report back after each fix before moving to the next

---

## 📋 Fix Summary

| Priority | ID | Item | Type | Action |
|----------|----|------|------|--------|
| 🔴 1 | C-4 | Features backfill on existing orgs | SQL | Immediate — 1 query |
| 🟡 2 | B-1 | credits / debits / invoice_products tables | Decision + Build | Create tables OR remap |
| 🟡 3 | C-6 | No lock/upgrade indicator in sidebar | Frontend | Add visual cue |
| 🟢 4 | D-2 | Stripe secrets not configured | Env setup | User action |
| 📝 5 | A-6 | `organisationId` not in users table | Accepted | No action — by design |

---

## 🔴 Fix 1 — C-4: Features Backfill on Existing Organisations

**Problem:**
All existing organisations have `features: {}` — empty JSON.
`getDefaultFeatures()` is correctly wired for new tenants,
but all previously created tenants were never backfilled.

**Impact:** Existing tenants cannot use Feature Flag enforcement — sidebar shows nothing.

### Step 1: Read current state

```sql
-- Check which orgs have empty features
SELECT id, name, plan_type, features
FROM organisations
WHERE status = 'Active'
ORDER BY created_on;
```

Report the result before proceeding.

---

### Step 2: Backfill features based on plan_type

```sql
-- Backfill features for all active organisations
-- Maps plan_type → correct feature JSON

UPDATE organisations
SET
  features = CASE plan_type
    WHEN 'solo'         THEN '{"camp_module":false,"accounting":false,"ai_assistant":false}'::jsonb
    WHEN 'starter'      THEN '{"camp_module":false,"accounting":false,"ai_assistant":false}'::jsonb
    WHEN 'growth'       THEN '{"camp_module":true,"accounting":true,"ai_assistant":false}'::jsonb
    WHEN 'professional' THEN '{"camp_module":true,"accounting":true,"ai_assistant":false}'::jsonb
    WHEN 'enterprise'   THEN '{"camp_module":true,"accounting":true,"ai_assistant":true}'::jsonb
    ELSE                     '{"camp_module":false,"accounting":false,"ai_assistant":false}'::jsonb
  END,
  modified_on = NOW()
WHERE status = 'Active'
  AND (features IS NULL OR features = '{}'::jsonb);
```

---

### Step 3: Verify

```sql
-- Confirm all orgs now have non-empty features
SELECT id, name, plan_type, features
FROM organisations
WHERE status = 'Active'
ORDER BY plan_type;

-- No org should have empty features
SELECT COUNT(*) AS still_empty
FROM organisations
WHERE (features IS NULL OR features = '{}'::jsonb)
  AND status = 'Active';
-- Expected: 0
```

---

### Step 4: Test runtime behaviour

```
Sign in as a user of:
  → Starter/Solo plan org → Camp menu hidden ✅
  → Professional/Growth plan org → Camp menu visible ✅
  → Enterprise plan org → AI Assistant feature enabled ✅
```

**Completion report:**
```
✅ Fix 1 Complete — C-4 Features Backfill
   SQL executed: UPDATE organisations SET features = ...
   Rows updated: [N]
   Verification: still_empty = 0
   Runtime test: [result]
```

---

## 🟡 Fix 2 — B-1: Missing Finance Tables

**Problem:**
`credits`, `debits`, and `invoice_products` do not exist in the DB.
The actual finance tables in this project are:
`payment_headers`, `payment_lines`, `contract_finance_items` (or equivalent).

**Decision required — choose one path:**

---

### Option A: Create credits / debits / invoice_products (matches original schema design)

Choose this if these tables were intended in the original Edubee CRM schema
and are simply not yet built.

```sql
-- Create credits table
CREATE TABLE IF NOT EXISTS credits (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  UUID        REFERENCES organisations(id),
  transaction_id   UUID,
  account_id       UUID        REFERENCES accounts(id),
  amount           DECIMAL(12,2) NOT NULL DEFAULT 0,
  credit_date      TIMESTAMP,
  reference        VARCHAR(255),
  description      TEXT,
  status           VARCHAR(20)  NOT NULL DEFAULT 'Active',
  created_on       TIMESTAMP    NOT NULL DEFAULT NOW(),
  modified_on      TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Create debits table
CREATE TABLE IF NOT EXISTS debits (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  UUID        REFERENCES organisations(id),
  transaction_id   UUID,
  account_id       UUID        REFERENCES accounts(id),
  amount           DECIMAL(12,2) NOT NULL DEFAULT 0,
  debit_date       TIMESTAMP,
  reference        VARCHAR(255),
  description      TEXT,
  status           VARCHAR(20)  NOT NULL DEFAULT 'Active',
  created_on       TIMESTAMP    NOT NULL DEFAULT NOW(),
  modified_on      TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Create invoice_products table
CREATE TABLE IF NOT EXISTS invoice_products (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  UUID        REFERENCES organisations(id),
  invoice_id       UUID        REFERENCES invoices(id),
  product_id       UUID        REFERENCES products(id),
  quantity         INTEGER      NOT NULL DEFAULT 1,
  unit_price       DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_price      DECIMAL(12,2) NOT NULL DEFAULT 0,
  description      TEXT,
  status           VARCHAR(20)  NOT NULL DEFAULT 'Active',
  created_on       TIMESTAMP    NOT NULL DEFAULT NOW(),
  modified_on      TIMESTAMP    NOT NULL DEFAULT NOW()
);
```

Also add to Drizzle schema file (`/db/schema.ts` or equivalent).

---

### Option B: Remap checklist to actual table names (no new tables)

Choose this if `payment_headers`, `payment_lines`, `contract_finance_items`
are the correct replacements and the original names were never intended.

**If Option B:** Add `organisation_id` to the actual tables instead:

```sql
ALTER TABLE payment_headers       ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(id);
ALTER TABLE payment_lines         ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(id);
ALTER TABLE contract_finance_items ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(id);
-- Add any other finance tables that exist in the actual DB
```

Then backfill via parent JOIN:

```sql
-- payment_lines → via payment_headers
UPDATE payment_lines pl
SET organisation_id = ph.organisation_id
FROM payment_headers ph
WHERE pl.payment_header_id = ph.id
  AND pl.organisation_id IS NULL
  AND ph.organisation_id IS NOT NULL;
```

---

### Step to take:

**Before writing any code:**
1. Run `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;`
2. Report the actual list of finance-related tables
3. I will confirm which option to use, then say **"proceed"**

---

**Completion report:**
```
✅ Fix 2 Complete — B-1 Finance Tables
   Option chosen: A (created 3 tables) / B (remapped to actual tables)
   Tables created/updated: [list]
   organisation_id added: [N tables]
   Backfill NULLs remaining: 0
```

---

## 🟡 Fix 3 — C-6: Add Lock/Upgrade Indicator to Sidebar

**Problem:**
When a feature is disabled, the menu item is hidden entirely.
Users on lower plans get no visual cue that an upgrade would unlock it.

**Goal:**
Add a subtle locked state — visible but clearly unavailable — with a tooltip.

---

### Step 1: Read current sidebar component

Read the CRM Sidebar component file and identify:
- Where `useFeature('camp_module')` is called
- How the menu is currently hidden (filtered, conditional render, etc.)
- Whether a shared `NavItem` or `NavItemLocked` component exists

---

### Step 2: Create NavItemLocked component (if not already exists)

Add to the sidebar component file or shared components:

```tsx
// NavItemLocked — shows a menu item as locked with upgrade tooltip
interface NavItemLockedProps {
  icon:    React.ReactNode;
  label:   string;
  tooltip: string;
}

function NavItemLocked({ icon, label, tooltip }: NavItemLockedProps) {
  return (
    <div
      title={tooltip}
      style={{
        display:     'flex',
        alignItems:  'center',
        gap:         '10px',
        padding:     '0 16px',
        height:      '40px',
        borderRadius: '8px',
        color:       '#A8A29E',   // Neutral 400 — muted
        cursor:      'default',
        userSelect:  'none',
        position:    'relative',
        fontSize:    '14px',
      }}
    >
      {/* Muted icon */}
      <span style={{ opacity: 0.4 }}>{icon}</span>

      {/* Muted label */}
      <span style={{ opacity: 0.4 }}>{label}</span>

      {/* Lock badge */}
      <span style={{
        marginLeft:     'auto',
        fontSize:       '10px',
        background:     '#F4F3F1',
        color:          '#A8A29E',
        border:         '1px solid #E8E6E2',
        borderRadius:   '4px',
        padding:        '2px 6px',
        fontWeight:     500,
        letterSpacing:  '0.03em',
      }}>
        PRO
      </span>
    </div>
  );
}
```

---

### Step 3: Apply to sidebar

Replace hidden feature sections with the locked variant:

```tsx
// Camp Module
{campFeature.enabled ? (
  <NavItem to="/camp" icon={<Tent size={16} />} label="Camp" />
) : (
  <NavItemLocked
    icon={<Tent size={16} />}
    label="Camp"
    tooltip="Available on Professional plan — click to upgrade"
  />
)}

// Accounting Module (if applicable)
{accountingFeat.enabled ? (
  <NavItem to="/accounting" icon={<BookOpen size={16} />} label="Accounting" />
) : (
  <NavItemLocked
    icon={<BookOpen size={16} />}
    label="Accounting"
    tooltip="Available on Professional plan — click to upgrade"
  />
)}
```

---

### Step 4: Optional — clicking locked item navigates to Plan & Billing

```tsx
// Enhanced version — locked item is clickable, goes to upgrade page
function NavItemLocked({ icon, label, tooltip }: NavItemLockedProps) {
  const navigate = useNavigate();

  return (
    <div
      title={tooltip}
      onClick={() => navigate('/settings/plan')}
      style={{
        // ... same styles as above
        cursor: 'pointer',
      }}
    >
      {/* ... same content */}
    </div>
  );
}
```

---

### Step 5: Verify

```
Test: Sign in as Starter plan user
  → Sidebar shows Camp and Accounting with 'PRO' badge  ✅
  → Hovering shows tooltip: "Available on Professional plan..."  ✅
  → Clicking navigates to /settings/plan  ✅

Test: Sign in as Professional plan user
  → Camp and Accounting show as normal active menu items  ✅
  → No PRO badge visible  ✅
```

**Completion report:**
```
✅ Fix 3 Complete — C-6 Lock/Upgrade Indicator
   Modified file: [sidebar component path]
   NavItemLocked component: created / already existed
   Locked items: Camp ✅, Accounting ✅
   Click-to-upgrade navigation: enabled / skipped
```

---

## 🟢 Fix 4 — D-2: Configure Stripe Secrets (User Action Required)

**This fix requires action from you — not from Replit AI.**

Add the following to **Replit Secrets** tab:

| Secret Name | Where to find it |
|-------------|-----------------|
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API Keys → Secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Developers → Webhooks → Signing secret |
| `STRIPE_STARTER_MONTHLY` | Stripe Dashboard → Products → [Starter product] → Price ID |
| `STRIPE_STARTER_ANNUALLY` | Same product, annual price ID |
| `STRIPE_PRO_MONTHLY` | Professional product, monthly price ID |
| `STRIPE_PRO_ANNUALLY` | Professional product, annual price ID |
| `STRIPE_ENT_MONTHLY` | Enterprise product, monthly price ID |
| `STRIPE_ENT_ANNUALLY` | Enterprise product, annual price ID |

**If Stripe products/prices are not created yet:**

1. Go to [dashboard.stripe.com/products](https://dashboard.stripe.com/products)
2. Create 3 products: Starter, Professional, Enterprise
3. Add monthly + annual prices to each
4. Copy the `price_xxx` IDs into Replit Secrets

**After adding secrets — ask Replit to verify:**
```
Read the STRIPE_SECRET_KEY from process.env and confirm it starts with 'sk_'.
Do NOT print the value — only confirm it is present and has the correct prefix.
```

---

## 📝 Fix 5 — A-6: organisationId Not in users Table (Accepted — No Fix)

**Decision: This is intentional architecture. No action required.**

The `users` table does not store `organisation_id` as a column.
Instead, tenant scoping for users is handled via:
- JWT session context (user belongs to a tenant via login)
- `tenant_invitations.organisation_id` linking user to org at account creation

This is a valid design pattern — do not add `organisation_id` to the `users` table
unless a multi-org user scenario is explicitly required.

**Update checklist test item A-6 to WARN (acceptable deviation), not FAIL.**

---

## ✅ Post-Fix Verification — Run After All Fixes

### DB Final State

```sql
-- Fix 1 confirmed
SELECT COUNT(*) AS empty_features FROM organisations
WHERE (features IS NULL OR features = '{}'::jsonb) AND status = 'Active';
-- Expected: 0

-- Fix 2 confirmed (adjust table names to match actual DB)
SELECT table_name, COUNT(*) AS col_count
FROM information_schema.columns
WHERE column_name = 'organisation_id'
  AND table_name IN (
    'lead_activities','tasks','quote_products','contract_products',
    'credits','debits','invoice_products',
    'payment_headers','payment_lines'   -- add actual table names
  )
GROUP BY table_name
ORDER BY table_name;
```

### TypeScript

```bash
npx tsc --noEmit
# → 0 errors in all Phase 3 files
```

### Runtime Checks

```
✅ Starter plan org → features populated, Camp locked with PRO badge
✅ Professional plan org → Camp visible, features.camp_module = true
✅ POST /invitations → emailSent in response
✅ POST /auth/accept-invite (invalid token) → 400
✅ POST /billing/checkout → returns Stripe URL
✅ Server startup → clean, no errors
```

---

## 📊 Expected Post-Fix Test Results

| Section | Before Fix | After Fix |
|---------|-----------|-----------|
| A. Invitation Email | 22P / 0F / 2W | 22P / 0F / 2W (unchanged) |
| B. MEDIUM Tables | 11P / 3F / 0W | 14P / 0F / 0W |
| C. Feature Flags | 12P / 1F / 1W | 14P / 0F / 0W |
| D. Stripe Payments | 16P / 0F / 2W | 16P / 0F / 1W (after secrets added) |
| E. Cross-Cutting | 7P / 0F / 0W | 7P / 0F / 0W |
| **Total** | **68P / 4F / 5W** | **73P / 0F / 3W** |
| **Rate** | **94%** | **100% PASS** |

---

## ✅ Completion Report Format

```
✅ Phase 3 Post-Test Fixes Complete

Fix 1 — C-4 Features Backfill:     [rows updated / verified]
Fix 2 — B-1 Finance Tables:        [option chosen / tables added]
Fix 3 — C-6 Sidebar Lock UI:       [component added / verified]
Fix 4 — D-2 Stripe Secrets:        [pending user action]
Fix 5 — A-6 users table:           [accepted — no change]

Final TypeScript: 0 errors
Final server:     running clean
Final DB check:   empty_features = 0

Phase 3 status:   ✅ Complete — ready for Phase 4
```

---

*Edubee CRM — Phase 3 Post-Test Fix Prompt v1.0 (EN) | 2026-04-03*
*Based on: Phase 3 Test Report — FAIL 4 / WARN 5 → target 0 FAIL*
