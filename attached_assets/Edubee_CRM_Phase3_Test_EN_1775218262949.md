# 🐝 Edubee CRM — Phase 3: Test & Verification Checklist
# For Replit AI Agent
# Date: 2026-04-03 | Version: v1.0 (EN)
# Purpose: Verify all Phase 3 features are correctly implemented and functioning

---

## 📌 Instructions

**This prompt does NOT modify any code.**
Only read, verify, execute queries, and report results.

After checking each item, mark with one of:

```
✅ PASS  — Correctly implemented and working
❌ FAIL  — Not implemented or broken
⚠️ WARN  — Implemented but needs improvement
```

After all checks, output the **Final Report** in the format at the bottom of this document.

---

## 🔴 SECTION A: Task 1 — Staff Invitation Email

### A-1. File Existence

Read the project and confirm these files exist:

| File | Expected | Status |
|------|----------|--------|
| `/server/src/services/emailService.ts` | Exists | □ |
| `/server/src/routes/auth.ts` (or equivalent) | Has `accept-invite` endpoint | □ |

---

### A-2. emailService.ts — Function Exports

Read `/server/src/services/emailService.ts` and verify:

| Check | Expected | Status |
|-------|----------|--------|
| `sendInvitationEmail()` exported | ✅ | □ |
| `sendWelcomeEmail()` exported | ✅ | □ |
| `sendTenantCreatedEmail()` exported | ✅ | □ |
| `EMAIL_ENABLED` flag reads from `process.env.EMAIL_ENABLED` | ✅ | □ |
| `Resend` client uses `process.env.RESEND_API_KEY` | ✅ | □ |
| All three functions wrapped in `try/catch` | ✅ | □ |
| Email failure does **NOT** throw — returns `{ success: false }` | ✅ | □ |

---

### A-3. Invitation Email Content

Read `buildInvitationHtml()` (or equivalent template function) and verify:

| Check | Status |
|-------|--------|
| Invite URL format: `https://[subdomain].edubee.com/accept-invite?token=[token]` | □ |
| Expiry date displayed in the email body | □ |
| "Accept Invitation" CTA button present | □ |
| Fallback URL (plain text) shown below button | □ |
| Edubee Orange `#F5821F` used as header/button colour | □ |
| Company name dynamically inserted | □ |

---

### A-4. POST /api/settings/invitations — Email Dispatch

Read the route handler and verify:

| Check | Status |
|-------|--------|
| `sendInvitationEmail()` called after DB insert | □ |
| Email failure does **NOT** prevent `201` response | □ |
| Response includes `emailSent: true/false` field | □ |
| `token` = `crypto.randomUUID()` or equivalent random | □ |
| `expiresAt` set to 7 days from now | □ |
| `tenant_invitations` record created with `status: 'Pending'` | □ |

---

### A-5. POST /api/superadmin/tenants — Tenant Creation Email

Read the superadmin tenants creation handler and verify:

| Check | Status |
|-------|--------|
| `sendTenantCreatedEmail()` called after `onboardTenant()` | □ |
| Email called **after** successful `onboardTenant()` — not before | □ |
| Email failure does NOT affect `201` response | □ |
| Owner email, org name, subdomain passed correctly | □ |

---

### A-6. POST /api/auth/accept-invite — Account Creation

Read the accept-invite endpoint and verify:

| Check | Status |
|-------|--------|
| Endpoint exists at `/api/auth/accept-invite` (or equivalent path) | □ |
| Token lookup from `tenant_invitations` WHERE `status = 'Pending'` | □ |
| Expiry check: `new Date() > invite.expiresAt` → 400 error | □ |
| Expired token → `status` updated to `'Expired'` in DB | □ |
| New `users` record created on success | □ |
| `organisationId` set from invitation record | □ |
| Invitation `status` updated to `'Accepted'` | □ |
| `acceptedAt` timestamp recorded | □ |
| `sendWelcomeEmail()` called after account creation | □ |
| Welcome email failure does NOT prevent `200` response | □ |

---

### A-7. DB State Verification

Run the following SQL queries and confirm expected results:

```sql
-- Check tenant_invitations table structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'tenant_invitations'
ORDER BY ordinal_position;
```

Required columns:
| Column | Type | Status |
|--------|------|--------|
| `id` | uuid | □ |
| `organisation_id` | uuid | □ |
| `email` | varchar | □ |
| `role` | varchar | □ |
| `token` | varchar (UNIQUE) | □ |
| `invited_by` | uuid | □ |
| `accepted_at` | timestamp | □ |
| `expires_at` | timestamp | □ |
| `status` | varchar | □ |

---

### A-8. API Runtime Test

Execute the following calls and verify responses:

```
Test 1: Send invitation
POST /api/settings/invitations
Header: X-Organisation-Id: [valid UUID]
Body:   { "email": "test@example.com", "role": "staff" }
Expected: 201 { success: true, emailSent: true/false }
Status: □
```

```
Test 2: Invalid token
POST /api/auth/accept-invite
Body: { "token": "invalid-token-abc", "password": "Test1234!", "firstName": "John", "lastName": "Doe" }
Expected: 400 { message: "Invalid or already-used invitation link." }
Status: □
```

```
Test 3: Verify Resend dashboard
→ Check resend.com dashboard → Emails section
→ Invitation email should appear (even if undelivered in test mode)
Status: □
```

---

## 🟡 SECTION B: Task 2 — MEDIUM Tables organisation_id

### B-1. Column Existence

```sql
SELECT table_name
FROM information_schema.columns
WHERE column_name = 'organisation_id'
  AND table_name IN (
    'lead_activities', 'tasks', 'quote_products',
    'contract_products', 'invoice_products',
    'credits', 'debits', 'receipts'
  )
ORDER BY table_name;
```

| Table | Has organisation_id | Status |
|-------|--------------------:|--------|
| `lead_activities` | □ | □ |
| `tasks` | □ | □ |
| `quote_products` | □ | □ |
| `contract_products` | □ | □ |
| `invoice_products` | □ | □ |
| `credits` | □ | □ |
| `debits` | □ | □ |
| `receipts` | □ | □ |

> ✅ PASS condition: All 8 tables listed

---

### B-2. Null Check — No Orphaned Records

```sql
SELECT
  'lead_activities'  AS tbl, COUNT(*) AS nulls FROM lead_activities  WHERE organisation_id IS NULL
UNION ALL SELECT
  'tasks',                    COUNT(*) FROM tasks             WHERE organisation_id IS NULL
UNION ALL SELECT
  'quote_products',           COUNT(*) FROM quote_products    WHERE organisation_id IS NULL
UNION ALL SELECT
  'contract_products',        COUNT(*) FROM contract_products WHERE organisation_id IS NULL
UNION ALL SELECT
  'invoice_products',         COUNT(*) FROM invoice_products  WHERE organisation_id IS NULL
UNION ALL SELECT
  'credits',                  COUNT(*) FROM credits           WHERE organisation_id IS NULL
UNION ALL SELECT
  'debits',                   COUNT(*) FROM debits            WHERE organisation_id IS NULL
UNION ALL SELECT
  'receipts',                 COUNT(*) FROM receipts          WHERE organisation_id IS NULL;
```

> ✅ PASS condition: All `nulls` values = 0
> ❌ FAIL condition: Any value > 0 → backfill migration incomplete

---

### B-3. Core Tables Check (Phase 2 — confirm still intact)

```sql
SELECT
  'contacts'     AS tbl, COUNT(*) total, COUNT(organisation_id) with_org FROM contacts
UNION ALL SELECT 'accounts',     COUNT(*), COUNT(organisation_id) FROM accounts
UNION ALL SELECT 'leads',        COUNT(*), COUNT(organisation_id) FROM leads
UNION ALL SELECT 'contracts',    COUNT(*), COUNT(organisation_id) FROM contracts
UNION ALL SELECT 'invoices',     COUNT(*), COUNT(organisation_id) FROM invoices
UNION ALL SELECT 'transactions', COUNT(*), COUNT(organisation_id) FROM transactions;
```

> ✅ PASS: `total = with_org` for every row

---

## 🟡 SECTION C: Task 3 — Feature Flags Enforcement

### C-1. File Existence

| File | Status |
|------|--------|
| `/server/src/middleware/featureGuard.ts` | □ |
| `/client/src/hooks/useFeature.ts` | □ |

---

### C-2. featureGuard.ts — Structure

Read `/server/src/middleware/featureGuard.ts` and verify:

| Check | Status |
|-------|--------|
| `featureGuard(feature)` function exported | □ |
| Returns 403 when feature not in `req.tenant.features` | □ |
| Response includes `upgradeRequired: true` | □ |
| `DEFAULT_FEATURES` map defined for all plan types | □ |
| `getDefaultFeatures(planType)` exported | □ |

---

### C-3. DEFAULT_FEATURES — Plan Coverage

Read the `DEFAULT_FEATURES` object and confirm coverage:

| Plan | camp_module | accounting | ai_assistant | Status |
|------|:-----------:|:----------:|:------------:|--------|
| `solo` | false | false | false | □ |
| `starter` | false | false | false | □ |
| `growth` | true | true | false | □ |
| `professional` | true | true | false | □ |
| `enterprise` | true | true | true | □ |

---

### C-4. Tenant Creation — Features Auto-Set

Read `POST /api/superadmin/tenants` handler and verify:

| Check | Status |
|-------|--------|
| `getDefaultFeatures(planType)` called during INSERT | □ |
| `features` column populated on new tenant creation | □ |

Verify in DB:
```sql
SELECT name, plan_type, features
FROM organisations
WHERE status = 'Active'
ORDER BY created_on DESC
LIMIT 5;
-- features column should contain JSON, not null or {}
```

| Check | Status |
|-------|--------|
| `features` is not NULL for all active tenants | □ |
| `features` contains at least `camp_module` key | □ |

---

### C-5. useFeature.ts Hook

Read `/client/src/hooks/useFeature.ts` and verify:

| Check | Status |
|-------|--------|
| Reads `features` from `useTenantTheme()` hook | □ |
| Returns `{ enabled, disabled, upgrade }` object | □ |
| `upgrade` is `null` when feature is enabled | □ |
| `upgrade` is a non-empty string when feature is disabled | □ |

---

### C-6. CRM Sidebar — Feature Flag Applied

Read the CRM Sidebar component and verify:

| Check | Status |
|-------|--------|
| `useFeature('camp_module')` called | □ |
| Camp menu conditionally rendered based on `enabled` | □ |
| Locked state shows visual indicator (lock icon or tooltip) | □ |
| Existing menu items (Dashboard, Contacts, etc.) unchanged | □ |

---

### C-7. Feature Flag Runtime Test

```
Test 1: Starter plan tenant — Camp module locked
  → Sign in as a user of a Starter plan organisation
  → Navigate to sidebar
  Expected: Camp menu shows lock/upgrade indicator  ✅
  Status: □

Test 2: Professional plan tenant — Camp module visible
  → Sign in as a user of a Professional plan organisation
  Expected: Camp menu fully accessible  ✅
  Status: □

Test 3: Backend guard
  (Apply featureGuard('camp_module') to any camp route then test)
  GET /api/camp  (Starter plan header)
  Expected: 403 { feature: "camp_module", upgradeRequired: true }
  Status: □
```

---

## 🟡 SECTION D: Task 4 — Stripe Payment Integration

### D-1. File Existence

| File | Status |
|------|--------|
| `/server/src/services/stripeService.ts` | □ |
| `/server/src/routes/webhook.ts` | □ |

---

### D-2. Environment Variables

Confirm the following exist in Replit Secrets (do NOT print values):

| Variable | Present | Status |
|----------|---------|--------|
| `STRIPE_SECRET_KEY` | □ | □ |
| `STRIPE_WEBHOOK_SECRET` | □ | □ |
| `STRIPE_STARTER_MONTHLY` | □ | □ |
| `STRIPE_PRO_MONTHLY` | □ | □ |
| `STRIPE_ENT_MONTHLY` | □ | □ |

---

### D-3. stripeService.ts — Functions

Read `/server/src/services/stripeService.ts` and verify:

| Check | Status |
|-------|--------|
| `createCheckoutSession()` exported | □ |
| `createPortalSession()` exported | □ |
| `constructWebhookEvent()` exported | □ |
| Stripe client uses `process.env.STRIPE_SECRET_KEY` | □ |
| `PLAN_PRICE_IDS` map reads from env variables (not hardcoded) | □ |
| Error thrown if Price ID not found for given plan/cycle | □ |

---

### D-4. Billing API Endpoints

Read `/server/src/routes/settings.ts` and verify:

| Endpoint | Implemented | Auth Protected | Status |
|----------|:-----------:|:--------------:|--------|
| `POST /api/settings/billing/checkout` | □ | □ | □ |
| `POST /api/settings/billing/portal` | □ | □ | □ |

For `/billing/portal`:

| Check | Status |
|-------|--------|
| Returns 400 if `stripe_customer_id` is null | □ |
| Returns portal URL on success | □ |

---

### D-5. Webhook Handler

Read `/server/src/routes/webhook.ts` and verify:

| Check | Status |
|-------|--------|
| Route: `POST /api/webhook/stripe` | □ |
| Uses `express.raw({ type: 'application/json' })` middleware | □ |
| `constructWebhookEvent()` called for signature verification | □ |
| Returns 400 on signature failure | □ |

Webhook event handlers:

| Event | DB Update | Status |
|-------|-----------|--------|
| `checkout.session.completed` | `plan_status = 'active'`, `subscription_id`, `features` updated | □ |
| `invoice.payment_succeeded` | `plan_status = 'active'` | □ |
| `invoice.payment_failed` | `plan_status = 'suspended'` | □ |
| `customer.subscription.deleted` | `plan_status = 'cancelled'` | □ |

---

### D-6. Webhook Route Registration Order (Critical)

Read `/server/src/index.ts` and verify:

| Check | Status |
|-------|--------|
| `/api/webhook` registered **BEFORE** `express.json()` | □ |
| `express.json()` registered **AFTER** webhook route | □ |

> ❌ FAIL if `express.json()` comes before the webhook route.
> Stripe webhook will silently fail — raw body will be parsed and signature verification will break.

---

### D-7. organisations Table — Stripe Columns

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'organisations'
  AND column_name IN ('stripe_customer_id', 'stripe_price_id');
```

| Column | Present | Status |
|--------|---------|--------|
| `stripe_customer_id` | □ | □ |
| `stripe_price_id` | □ | □ |

---

### D-8. Stripe API Runtime Test

```
Test 1: Create Checkout Session
POST /api/settings/billing/checkout
Header: X-Organisation-Id: [valid UUID, non-starter plan]
Body: { "planType": "professional", "billingCycle": "monthly" }
Expected: 200 { url: "https://checkout.stripe.com/c/pay/..." }
Note: Requires STRIPE_PRO_MONTHLY price ID configured
Status: □

Test 2: Missing stripe_customer_id
POST /api/settings/billing/portal
Header: X-Organisation-Id: [UUID with no stripe_customer_id]
Expected: 400 { message: "No billing information found..." }
Status: □
```

---

### D-9. Stripe Webhook Test (using Stripe CLI)

```bash
# Run these commands in Replit terminal:
stripe listen --forward-to http://localhost:3000/api/webhook/stripe
stripe trigger checkout.session.completed
```

After triggering:
```sql
-- Confirm plan activated in DB
SELECT name, plan_type, plan_status, subscription_id, features
FROM organisations
WHERE plan_status = 'active'
ORDER BY modified_on DESC
LIMIT 3;
```

| Check | Status |
|-------|--------|
| `plan_status` = `'active'` after `checkout.session.completed` | □ |
| `subscription_id` populated | □ |
| `features` updated to match new plan | □ |

---

## 🔒 SECTION E: Cross-Cutting Concerns

### E-1. TypeScript Compilation

```bash
npx tsc --noEmit
```

| Check | Status |
|-------|--------|
| Zero TypeScript errors in all new Phase 3 files | □ |

> ⚠️ WARN if pre-existing errors in unrelated files (note file names)
> ❌ FAIL if errors exist in any Phase 3 new/modified file

---

### E-2. Server Startup

| Check | Status |
|-------|--------|
| Server starts without import errors | □ |
| No runtime errors on startup | □ |
| All Phase 3 routes registered (visible in startup logs) | □ |

---

### E-3. Email Safety — No Workflow Blocking

Read all three email functions in `emailService.ts` and verify:

| Check | Status |
|-------|--------|
| `sendInvitationEmail()` — catch block returns `{ success: false }` | □ |
| `sendWelcomeEmail()` — catch block returns `{ success: false }` | □ |
| `sendTenantCreatedEmail()` — catch block swallows error silently | □ |
| None of the three functions use `throw` in their catch blocks | □ |

---

### E-4. Secrets Not Hardcoded

Scan all Phase 3 files and confirm:

| Check | Status |
|-------|--------|
| No API keys hardcoded in source files | □ |
| No Stripe keys hardcoded | □ |
| No email addresses hardcoded (except `FROM_EMAIL` via env) | □ |

---

## 📊 Final Report Format

After completing all checks, output the following report:

```
╔══════════════════════════════════════════════════════════════╗
║   🐝 Edubee CRM — Phase 3 Test Report                        ║
║   Date: YYYY-MM-DD                                           ║
╚══════════════════════════════════════════════════════════════╝

📊 Results by Section:
  A. Task 1 — Invitation Email    : PASS N / FAIL N / WARN N
  B. Task 2 — MEDIUM Tables       : PASS N / FAIL N / WARN N
  C. Task 3 — Feature Flags       : PASS N / FAIL N / WARN N
  D. Task 4 — Stripe Payments     : PASS N / FAIL N / WARN N
  E. Cross-Cutting                 : PASS N / FAIL N / WARN N

  ──────────────────────────────────────────────────────
  Overall                          : PASS N / FAIL N / WARN N
  Completion Rate                  : N%  (PASS / Total)

🚨 FAIL Items (fix required immediately):
  1. [Section-ID] [Item]: [reason and fix direction]
  2. ...

⚠️  WARN Items (improvement recommended):
  1. [Section-ID] [Item]: [reason]
  2. ...

✅ Fully passing sections:
  - [Section name]: all checks passed

🔧 Recommended fix order (highest priority first):
  1. 🔴 [E-6] Webhook order — register before express.json() (critical)
  2. 🔴 [A-8] Invitation email — emailSent field missing in response
  3. 🟡 [C-4] Features not auto-set on tenant creation
  4. 🟡 [D-5] Webhook handler missing payment_failed case
  5. 🟢 [WARN items]

📌 Phase 4 readiness:
  ✅ Ready to proceed with Phase 4  (0 FAIL items)
  or
  ❌ Fix FAIL items before Phase 4  (N FAIL items remaining)
```

---

*Edubee CRM — Phase 3 Test & Verification Checklist v1.0 (EN) | 2026-04-03*
