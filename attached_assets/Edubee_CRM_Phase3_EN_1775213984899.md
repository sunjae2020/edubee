# 🐝 Edubee CRM — Phase 3: SaaS Feature Completion
# For Replit AI Agent
# Date: 2026-04-03 | Version: v1.0 (EN)
# Prerequisite: Phase 1 + BugFix (Fix 1~17) + Phase 2 completed
# Email: Resend.com API already connected

---

## 📌 Phase 3 Overview

Phase 2 completed **runtime data isolation**.
Phase 3 elevates **SaaS service completeness** — real email flows, billing, and plan enforcement.

| Task | Content | Key Outcome |
|------|---------|-------------|
| **Task 1** | Staff invitation email (Resend) | Admin invites staff → they click link → account created |
| **Task 2** | MEDIUM tables `organisation_id` FK | Extend data isolation to tasks, credits, receipts, etc. |
| **Task 3** | Feature Flags enforcement | Starter hides Camp module; Pro/Enterprise unlock features |
| **Task 4** | Stripe payment integration | Subscription billing automation |

**Core Principle: Never break existing working code.**

---

## 🛡️ Pre-Work Analysis (Always Required)

1. Read all relevant files in full
2. Confirm what needs changing
3. Report planned changes before touching code
4. Do **not** proceed until I say **"proceed"**
   (Exception: **"do it now"** → proceed immediately)

---

## 🛡️ Safety Rules

- Run `npx tsc --noEmit` after each Task — zero errors required
- Email failures must **never block** main workflow — always use `try/catch`
- Store all secrets in Replit Secrets tab — never hardcode in source files
- One file at a time; TypeScript check between each file

---

## ✅ Task 1: Staff Invitation Email via Resend

### 1-1. Pre-Check

```
Read these files:
  .env / Replit Secrets  → Confirm RESEND_API_KEY variable name
  /server/src/routes/settings.ts
      → Check current POST /invitations implementation
  /db/schema.ts
      → Confirm tenant_invitations columns: token, expires_at, status

Check:
  □ RESEND_API_KEY present in environment
  □ tenant_invitations table has: token, expires_at, status columns
  □ resend package installed (check package.json)
```

**If resend package is missing:**
```bash
npm install resend
```

---

### 1-2. Create Email Service File

**File path:** `/server/src/services/emailService.ts` (new file)

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Set EMAIL_ENABLED=false in Replit Secrets to disable all emails during testing
const EMAIL_ENABLED = process.env.EMAIL_ENABLED !== 'false';

const FROM_EMAIL = process.env.FROM_EMAIL ?? 'noreply@edubee.com';

// ─────────────────────────────────────────────────────────────
// Staff Invitation Email
// ─────────────────────────────────────────────────────────────
export interface SendInvitationEmailParams {
  toEmail:      string;
  inviterName:  string;
  companyName:  string;
  role:         string;
  inviteToken:  string;
  subdomain:    string | null;
  expiresAt:    Date;
}

export async function sendInvitationEmail(
  params: SendInvitationEmailParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!EMAIL_ENABLED) {
    console.log('[EMAIL DISABLED] Skipping invitation email:', params.toEmail);
    return { success: true, messageId: 'disabled' };
  }

  const { toEmail, inviterName, companyName, role, inviteToken, subdomain, expiresAt } = params;

  const baseUrl   = subdomain
    ? `https://${subdomain}.edubee.com`
    : process.env.APP_URL ?? 'https://app.edubee.com';
  const inviteUrl = `${baseUrl}/accept-invite?token=${inviteToken}`;

  const expiryDate = expiresAt.toLocaleDateString('en-AU', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  try {
    const { data, error } = await resend.emails.send({
      from:    FROM_EMAIL,
      to:      toEmail,
      subject: `[${companyName}] You've been invited to Edubee CRM`,
      html:    buildInvitationHtml({ companyName, inviterName, role, inviteUrl, expiryDate }),
    });

    if (error) {
      console.error('[RESEND ERROR] Invitation email:', error);
      return { success: false, error: error.message };
    }

    console.log('[EMAIL SENT] Invitation:', toEmail, data?.id);
    return { success: true, messageId: data?.id };
  } catch (err) {
    console.error('[EMAIL EXCEPTION]', err);
    return { success: false, error: (err as Error).message };
  }
}

// ─────────────────────────────────────────────────────────────
// Welcome / Account Activated Email
// ─────────────────────────────────────────────────────────────
export interface SendWelcomeEmailParams {
  toEmail:     string;
  userName:    string;
  companyName: string;
  loginUrl:    string;
}

export async function sendWelcomeEmail(
  params: SendWelcomeEmailParams
): Promise<{ success: boolean; error?: string }> {
  if (!EMAIL_ENABLED) return { success: true };

  const { toEmail, userName, companyName, loginUrl } = params;

  try {
    const { error } = await resend.emails.send({
      from:    FROM_EMAIL,
      to:      toEmail,
      subject: `[${companyName}] Your CRM account is ready`,
      html:    buildWelcomeHtml({ userName, companyName, loginUrl }),
    });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ─────────────────────────────────────────────────────────────
// New Tenant Created Email (to owner)
// ─────────────────────────────────────────────────────────────
export async function sendTenantCreatedEmail(params: {
  toEmail:   string;
  orgName:   string;
  subdomain: string;
  planType:  string;
}): Promise<void> {
  if (!EMAIL_ENABLED) return;

  const { toEmail, orgName, subdomain, planType } = params;
  const loginUrl = `https://${subdomain}.edubee.com/login`;

  try {
    await resend.emails.send({
      from:    FROM_EMAIL,
      to:      toEmail,
      subject: `🐝 Your Edubee CRM is ready — ${orgName}`,
      html:    buildTenantCreatedHtml({ orgName, subdomain, planType, loginUrl }),
    });
  } catch (err) {
    // Notification email failure must NOT block the main workflow
    console.error('[EMAIL] Tenant creation notification failed:', err);
  }
}

// ══════════════════════════════════════════════════════════════
// HTML Templates
// Brand: Edubee Orange #F5821F / Background #FAFAF9 / Text #1C1917
// ══════════════════════════════════════════════════════════════

function buildInvitationHtml(p: {
  companyName: string; inviterName: string; role: string;
  inviteUrl: string; expiryDate: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>CRM Invitation</title>
</head>
<body style="margin:0;padding:0;background:#FAFAF9;font-family:Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#FFFFFF;border-radius:12px;border:1px solid #E8E6E2;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:#F5821F;padding:32px;text-align:center;">
              <div style="font-size:28px;font-weight:700;color:#FFFFFF;">🐝 Edubee CRM</div>
              <div style="font-size:14px;color:rgba(255,255,255,0.85);margin-top:6px;">
                ${p.companyName}
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 48px;">
              <h2 style="margin:0 0 16px;font-size:22px;font-weight:600;color:#1C1917;">
                You've been invited to Edubee CRM
              </h2>
              <p style="margin:0 0 24px;font-size:15px;color:#57534E;line-height:1.7;">
                <strong style="color:#1C1917;">${p.inviterName}</strong> has invited you
                to join <strong style="color:#1C1917;">${p.companyName}</strong> as a
                <strong style="color:#F5821F;">${p.role}</strong>.
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
                <tr>
                  <td style="border-radius:8px;background:#F5821F;">
                    <a href="${p.inviteUrl}"
                       style="display:inline-block;padding:14px 32px;font-size:15px;
                              font-weight:600;color:#FFFFFF;text-decoration:none;">
                      Accept Invitation →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Note -->
              <div style="background:#FEF0E3;border-radius:8px;padding:16px 20px;
                          border-left:4px solid #F5821F;">
                <p style="margin:0;font-size:13px;color:#92400E;line-height:1.6;">
                  ⏰ This invitation link expires on <strong>${p.expiryDate}</strong>.<br>
                  If the link has expired, please ask the admin to resend it.
                </p>
              </div>

              <p style="margin:24px 0 0;font-size:12px;color:#A8A29E;">
                If the button doesn't work, copy this link into your browser:<br>
                <span style="color:#F5821F;word-break:break-all;">${p.inviteUrl}</span>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F4F3F1;padding:20px 48px;
                       border-top:1px solid #E8E6E2;text-align:center;">
              <p style="margin:0;font-size:12px;color:#A8A29E;">
                © 2026 Edubee CRM · This is an automated message
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildWelcomeHtml(p: {
  userName: string; companyName: string; loginUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Account Ready</title></head>
<body style="margin:0;padding:0;background:#FAFAF9;font-family:Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#FFFFFF;border-radius:12px;border:1px solid #E8E6E2;">
          <tr>
            <td style="background:#F5821F;padding:32px;text-align:center;">
              <div style="font-size:28px;font-weight:700;color:#FFFFFF;">🐝 Edubee CRM</div>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 48px;">
              <h2 style="margin:0 0 16px;font-size:22px;color:#1C1917;">
                Welcome, ${p.userName}!
              </h2>
              <p style="margin:0 0 24px;font-size:15px;color:#57534E;line-height:1.7;">
                Your <strong>${p.companyName}</strong> CRM account is now active.
                Click below to sign in.
              </p>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:8px;background:#F5821F;">
                    <a href="${p.loginUrl}"
                       style="display:inline-block;padding:14px 32px;font-size:15px;
                              font-weight:600;color:#FFFFFF;text-decoration:none;">
                      Sign In to CRM →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#F4F3F1;padding:20px 48px;
                       border-top:1px solid #E8E6E2;text-align:center;">
              <p style="margin:0;font-size:12px;color:#A8A29E;">© 2026 Edubee CRM</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildTenantCreatedHtml(p: {
  orgName: string; subdomain: string; planType: string; loginUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Your CRM is Ready</title></head>
<body style="margin:0;padding:0;background:#FAFAF9;font-family:Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#FFFFFF;border-radius:12px;border:1px solid #E8E6E2;">
          <tr>
            <td style="background:#F5821F;padding:32px;text-align:center;">
              <div style="font-size:28px;font-weight:700;color:#FFFFFF;">🐝 Edubee CRM</div>
              <div style="font-size:14px;color:rgba(255,255,255,0.85);margin-top:6px;">
                Account Created
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 48px;">
              <h2 style="margin:0 0 20px;font-size:22px;color:#1C1917;">
                ${p.orgName} CRM is ready 🎉
              </h2>
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#FAFAF9;border-radius:8px;border:1px solid #E8E6E2;
                            margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table width="100%">
                      <tr>
                        <td style="font-size:13px;color:#57534E;padding-bottom:12px;">Company</td>
                        <td style="font-size:13px;font-weight:600;color:#1C1917;
                                   text-align:right;padding-bottom:12px;">${p.orgName}</td>
                      </tr>
                      <tr>
                        <td style="font-size:13px;color:#57534E;padding-bottom:12px;">CRM URL</td>
                        <td style="font-size:13px;color:#F5821F;
                                   text-align:right;padding-bottom:12px;">
                          ${p.subdomain}.edubee.com
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size:13px;color:#57534E;">Plan</td>
                        <td style="font-size:13px;font-weight:600;color:#1C1917;
                                   text-align:right;text-transform:capitalize;">
                          ${p.planType}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:8px;background:#F5821F;">
                    <a href="${p.loginUrl}"
                       style="display:inline-block;padding:14px 32px;font-size:15px;
                              font-weight:600;color:#FFFFFF;text-decoration:none;">
                      Get Started →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#F4F3F1;padding:20px 48px;
                       border-top:1px solid #E8E6E2;text-align:center;">
              <p style="margin:0;font-size:12px;color:#A8A29E;">© 2026 Edubee CRM</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
```

---

### 1-3. Wire Email into Invitation API

Read `POST /api/settings/invitations` in `/server/src/routes/settings.ts`
and add email dispatch after the DB insert:

```typescript
import { sendInvitationEmail } from '../services/emailService';

router.post('/invitations', authenticate, async (req, res) => {
  try {
    const { email, role } = req.body;
    const organisationId  = req.tenantId;

    // 1. Create invitation record (existing logic unchanged)
    const token     = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db.insert(tenantInvitations).values({
      organisationId,
      email,
      role,
      token,
      expiresAt,
      invitedBy: req.user?.id,
      status:    'Pending',
    });

    // 2. Send invitation email (failure does NOT rollback the invitation record)
    const org = req.tenant as Record<string, unknown>;

    const emailResult = await sendInvitationEmail({
      toEmail:      email,
      inviterName:  req.user?.firstName ?? 'Admin',
      companyName:  (org?.name as string) ?? 'Edubee CRM',
      role,
      inviteToken:  token,
      subdomain:    (org?.subdomain as string) ?? null,
      expiresAt,
    });

    return res.status(201).json({
      success:    true,
      message:    'Invitation sent.',
      emailSent:  emailResult.success,
      emailError: emailResult.success ? undefined : emailResult.error,
    });
  } catch (err) {
    console.error('[POST /invitations]', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});
```

---

### 1-4. Wire Email into Tenant Creation

In `/server/src/routes/superadmin.ts`, after `onboardTenant` completes:

```typescript
import { sendTenantCreatedEmail } from '../services/emailService';

// After onboardTenant() succeeds
await sendTenantCreatedEmail({
  toEmail:   newOrg.ownerEmail ?? '',
  orgName:   newOrg.name,
  subdomain: newOrg.subdomain ?? '',
  planType:  newOrg.planType  ?? 'starter',
});
// Email wrapped in its own try/catch inside sendTenantCreatedEmail
// → 201 response is NOT affected by email failure
```

---

### 1-5. Accept Invitation API

Add to `/server/src/routes/auth.ts` (or the public routes file):

```typescript
// POST /api/auth/accept-invite — Create account from invitation token
router.post('/accept-invite', async (req, res) => {
  try {
    const { token, password, firstName, lastName } = req.body;

    // 1. Look up token
    const [invite] = await db
      .select().from(tenantInvitations)
      .where(
        and(
          eq(tenantInvitations.token, token),
          eq(tenantInvitations.status, 'Pending')
        )
      ).limit(1);

    if (!invite) {
      return res.status(400).json({ message: 'Invalid or already-used invitation link.' });
    }

    // 2. Check expiry
    if (new Date() > invite.expiresAt) {
      await db.update(tenantInvitations)
        .set({ status: 'Expired' })
        .where(eq(tenantInvitations.id, invite.id));
      return res.status(400).json({ message: 'Invitation link has expired.' });
    }

    // 3. Create user account
    // ⚠️ Use the same password hashing function already in your auth code
    const hashedPassword = await hashPassword(password);

    await db.insert(users).values({
      firstName,
      lastName,
      email:          invite.email,
      password:       hashedPassword,
      role:           invite.role,
      organisationId: invite.organisationId,
      status:         'Active',
    });

    // 4. Mark invitation as accepted
    await db.update(tenantInvitations)
      .set({ status: 'Accepted', acceptedAt: new Date() })
      .where(eq(tenantInvitations.id, invite.id));

    // 5. Send welcome email
    const [org] = await db.select().from(organisations)
      .where(eq(organisations.id, invite.organisationId)).limit(1);

    await sendWelcomeEmail({
      toEmail:     invite.email,
      userName:    `${firstName} ${lastName}`,
      companyName: org?.name ?? 'Edubee CRM',
      loginUrl:    `https://${org?.subdomain ?? 'app'}.edubee.com/login`,
    });

    return res.json({
      success: true,
      message: 'Account created. Please sign in.',
    });
  } catch (err) {
    console.error('[POST /accept-invite]', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});
```

---

### 1-6. Task 1 Verification

```bash
npx tsc --noEmit

# Test invitation flow (check Resend dashboard for delivery)
POST /api/settings/invitations
Header: X-Organisation-Id: [UUID]
body: { "email": "test@example.com", "role": "staff" }
→ Expected: 201 { emailSent: true }
```

---

## ✅ Task 2: MEDIUM Priority Tables — organisation_id FK

### Target tables (8):
```
lead_activities, tasks, quote_products, contract_products,
invoice_products, credits, debits, receipts
```

---

### 2-1. Pre-Check

```sql
SELECT table_name
FROM information_schema.columns
WHERE column_name = 'organisation_id'
  AND table_schema = 'public'
ORDER BY table_name;
-- Skip any tables already listed
```

---

### 2-2. Migration

```sql
ALTER TABLE lead_activities  ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(id);
ALTER TABLE tasks             ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(id);
ALTER TABLE quote_products    ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(id);
ALTER TABLE contract_products ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(id);
ALTER TABLE invoice_products  ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(id);
ALTER TABLE credits           ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(id);
ALTER TABLE debits            ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(id);
ALTER TABLE receipts          ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(id);
```

---

### 2-3. Backfill via Parent Table JOIN

MEDIUM tables are back-tracked through parent records:

```sql
-- lead_activities → via leads
UPDATE lead_activities la
SET organisation_id = l.organisation_id
FROM leads l
WHERE la.lead_id = l.id
  AND la.organisation_id IS NULL
  AND l.organisation_id IS NOT NULL;

-- quote_products → via quotes
UPDATE quote_products qp
SET organisation_id = q.organisation_id
FROM quotes q
WHERE qp.quote_id = q.id
  AND qp.organisation_id IS NULL;

-- contract_products → via contracts
UPDATE contract_products cp
SET organisation_id = c.organisation_id
FROM contracts c
WHERE cp.contract_id = c.id
  AND cp.organisation_id IS NULL;

-- invoice_products → via invoices
UPDATE invoice_products ip
SET organisation_id = i.organisation_id
FROM invoices i
WHERE ip.invoice_id = i.id
  AND ip.organisation_id IS NULL;

-- credits / debits / receipts → via transactions
UPDATE credits cr
SET organisation_id = t.organisation_id
FROM transactions t
WHERE cr.transaction_id = t.id
  AND cr.organisation_id IS NULL;

UPDATE debits d
SET organisation_id = t.organisation_id
FROM transactions t
WHERE d.transaction_id = t.id
  AND d.organisation_id IS NULL;

UPDATE receipts r
SET organisation_id = t.organisation_id
FROM transactions t
WHERE r.transaction_id = t.id
  AND r.organisation_id IS NULL;

-- tasks → check actual FK column (may be lead_id, contract_id, etc.)
-- Read tasks table schema first, then apply the appropriate JOIN
```

> ⚠️ Confirm actual FK column names in the schema file before running UPDATE.

---

### 2-4. Task 2 Verification

```sql
SELECT table_name
FROM information_schema.columns
WHERE column_name = 'organisation_id'
  AND table_name IN (
    'lead_activities','tasks','quote_products','contract_products',
    'invoice_products','credits','debits','receipts'
  )
ORDER BY table_name;
-- → 8 rows
```

---

## ✅ Task 3: Feature Flags Enforcement

### Concept

```
organisations.features = {
  "camp_module":  false,   ← Starter: Camp menu hidden
  "accounting":   true,    ← Professional: Accounting module available
  "ai_assistant": false    ← Enterprise only
}

Default features by plan:
  solo / starter  → camp: ❌  accounting: ❌  ai: ❌
  growth / pro    → camp: ✅  accounting: ✅  ai: ❌
  enterprise      → camp: ✅  accounting: ✅  ai: ✅
```

---

### 3-1. Backend: Feature Guard Middleware

**File path:** `/server/src/middleware/featureGuard.ts` (new file)

```typescript
import { Request, Response, NextFunction } from 'express';

type FeatureKey = 'camp_module' | 'accounting' | 'ai_assistant';

/**
 * Allows only tenants with the specified feature enabled.
 * Usage: router.get('/camp', featureGuard('camp_module'), handler)
 */
export function featureGuard(feature: FeatureKey) {
  return (req: Request, res: Response, next: NextFunction) => {
    const features = (req.tenant as Record<string, unknown>)
      ?.features as Record<string, boolean> | undefined;

    if (!features || !features[feature]) {
      return res.status(403).json({
        message:         'This feature is not available on your current plan.',
        feature,
        upgradeRequired: true,
      });
    }
    next();
  };
}

/**
 * Default feature set by plan type.
 * Used when creating a new tenant.
 */
export const DEFAULT_FEATURES: Record<string, Record<string, boolean>> = {
  solo:         { camp_module: false, accounting: false, ai_assistant: false },
  starter:      { camp_module: false, accounting: false, ai_assistant: false },
  growth:       { camp_module: true,  accounting: true,  ai_assistant: false },
  professional: { camp_module: true,  accounting: true,  ai_assistant: false },
  enterprise:   { camp_module: true,  accounting: true,  ai_assistant: true  },
};

export function getDefaultFeatures(planType: string): Record<string, boolean> {
  return DEFAULT_FEATURES[planType] ?? DEFAULT_FEATURES['starter'];
}
```

---

### 3-2. Auto-Set Features on Tenant Creation

In `/server/src/routes/superadmin.ts`, inject features when inserting a new tenant:

```typescript
import { getDefaultFeatures } from '../middleware/featureGuard';

const [newOrg] = await db.insert(organisations).values({
  name,
  subdomain,
  ownerEmail,
  planType:    planType ?? 'starter',
  planStatus:  'trial',
  trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  features:    getDefaultFeatures(planType ?? 'starter'), // ← new
  status:      'Active',
}).returning();
```

---

### 3-3. Frontend: Feature Hook

**File path:** `/client/src/hooks/useFeature.ts` (new file)

```typescript
import { useTenantTheme } from './useTenantTheme';

type FeatureKey = 'camp_module' | 'accounting' | 'ai_assistant';

/**
 * Check whether a feature is enabled for the current tenant.
 * Usage: const { enabled } = useFeature('camp_module')
 */
export function useFeature(feature: FeatureKey) {
  const { theme } = useTenantTheme();
  const features  = theme.features as Record<string, boolean> ?? {};

  return {
    enabled:  features[feature] === true,
    disabled: features[feature] !== true,
    upgrade:  features[feature] !== true
      ? 'This feature requires a higher plan.'
      : null,
  };
}
```

---

### 3-4. Apply Feature Flags to CRM Sidebar

Read the CRM Sidebar component and apply the pattern below.
Do NOT change any existing menu items — only add conditional rendering:

```tsx
import { useFeature } from '../../hooks/useFeature';

function CrmSidebar() {
  const campFeature    = useFeature('camp_module');
  const accountingFeat = useFeature('accounting');

  return (
    <nav>
      {/* Existing menu items — unchanged */}
      <NavItem to="/dashboard" icon={<LayoutDashboard />} label="Dashboard" />
      <NavItem to="/contacts"  icon={<Users />}           label="Contacts"  />
      {/* ... */}

      {/* Camp Module — Feature Flag */}
      {campFeature.enabled ? (
        <NavItem to="/camp" icon={<Tent />} label="Camp" />
      ) : (
        <NavItemLocked
          icon={<Tent />}
          label="Camp"
          tooltip="Available on Professional plan"
        />
      )}

      {/* Accounting Module — Feature Flag */}
      {accountingFeat.enabled && (
        <NavItem to="/accounting" icon={<BookOpen />} label="Accounting" />
      )}
    </nav>
  );
}
```

---

### 3-5. Task 3 Verification

```
Test 1: Starter plan tenant
  → Camp menu shows lock icon  ✅
  → GET /api/camp (with featureGuard) → 403  ✅

Test 2: Professional plan tenant
  → Camp menu visible and accessible  ✅
  → GET /api/camp → 200  ✅

Test 3: New tenant created via Super Admin
  → features column auto-populated based on planType  ✅
```

---

## ✅ Task 4: Stripe Payment Integration

### 4-1. Pre-Check

```
Verify:
  □ STRIPE_SECRET_KEY in environment (Replit Secrets)
  □ STRIPE_WEBHOOK_SECRET in environment
  □ stripe package installed (check package.json)
```

**If missing:**
```bash
npm install stripe
```

---

### 4-2. Create Stripe Service File

**File path:** `/server/src/services/stripeService.ts` (new file)

```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

// Plan → Stripe Price ID mapping
// ⚠️ Replace with actual Price IDs from your Stripe dashboard
const PLAN_PRICE_IDS: Record<string, { monthly: string; annually: string }> = {
  starter: {
    monthly:  process.env.STRIPE_STARTER_MONTHLY  ?? '',
    annually: process.env.STRIPE_STARTER_ANNUALLY ?? '',
  },
  professional: {
    monthly:  process.env.STRIPE_PRO_MONTHLY  ?? '',
    annually: process.env.STRIPE_PRO_ANNUALLY ?? '',
  },
  enterprise: {
    monthly:  process.env.STRIPE_ENT_MONTHLY  ?? '',
    annually: process.env.STRIPE_ENT_ANNUALLY ?? '',
  },
};

// Create Checkout Session (new subscription / plan upgrade)
export async function createCheckoutSession(params: {
  organisationId: string;
  planType:       string;
  billingCycle:   'monthly' | 'annually';
  successUrl:     string;
  cancelUrl:      string;
  customerEmail?: string;
}): Promise<{ url: string | null; sessionId: string }> {
  const { organisationId, planType, billingCycle,
          successUrl, cancelUrl, customerEmail } = params;

  const priceId = PLAN_PRICE_IDS[planType]?.[billingCycle];
  if (!priceId) throw new Error(`Price ID not found: ${planType}/${billingCycle}`);

  const session = await stripe.checkout.sessions.create({
    mode:                 'subscription',
    payment_method_types: ['card'],
    line_items:           [{ price: priceId, quantity: 1 }],
    success_url:          successUrl,
    cancel_url:           cancelUrl,
    customer_email:       customerEmail,
    metadata:             { organisationId, planType, billingCycle },
    subscription_data:    { metadata: { organisationId, planType } },
  });

  return { url: session.url, sessionId: session.id };
}

// Create Customer Portal session (manage billing / cancel subscription)
export async function createPortalSession(params: {
  customerId: string;
  returnUrl:  string;
}): Promise<string> {
  const session = await stripe.billingPortal.sessions.create({
    customer:   params.customerId,
    return_url: params.returnUrl,
  });
  return session.url;
}

// Verify and parse incoming Webhook event
export function constructWebhookEvent(
  payload:   Buffer | string,
  signature: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  );
}

export { stripe };
```

---

### 4-3. Add Billing Endpoints to settings.ts

```typescript
import { createCheckoutSession, createPortalSession } from '../services/stripeService';

// POST /settings/billing/checkout — Create Checkout Session
router.post('/billing/checkout', authenticate, async (req, res) => {
  try {
    const { planType, billingCycle } = req.body;
    const org     = req.tenant as Record<string, unknown>;
    const baseUrl = org?.subdomain
      ? `https://${org.subdomain}.edubee.com`
      : process.env.APP_URL ?? '';

    const { url, sessionId } = await createCheckoutSession({
      organisationId: req.tenantId!,
      planType,
      billingCycle:   billingCycle ?? 'monthly',
      successUrl:     `${baseUrl}/settings/plan?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl:      `${baseUrl}/settings/plan?cancelled=true`,
      customerEmail:  (org?.ownerEmail as string) ?? undefined,
    });

    return res.json({ url, sessionId });
  } catch (err) {
    console.error('[POST /billing/checkout]', err);
    return res.status(500).json({ message: 'Failed to create checkout session.' });
  }
});

// POST /settings/billing/portal — Open Customer Portal
router.post('/billing/portal', authenticate, async (req, res) => {
  try {
    const org        = req.tenant as Record<string, unknown>;
    const customerId = org?.stripeCustomerId as string | undefined;

    if (!customerId) {
      return res.status(400).json({
        message: 'No billing information found. Please subscribe to a plan first.',
      });
    }

    const baseUrl  = org?.subdomain
      ? `https://${org.subdomain}.edubee.com`
      : process.env.APP_URL ?? '';
    const portalUrl = await createPortalSession({
      customerId,
      returnUrl: `${baseUrl}/settings/plan`,
    });

    return res.json({ url: portalUrl });
  } catch (err) {
    console.error('[POST /billing/portal]', err);
    return res.status(500).json({ message: 'Failed to open billing portal.' });
  }
});
```

---

### 4-4. Stripe Webhook Handler

**File path:** `/server/src/routes/webhook.ts` (new file)

```typescript
import express            from 'express';
import { constructWebhookEvent } from '../services/stripeService';
import { getDefaultFeatures }    from '../middleware/featureGuard';
import { db }             from '../db';
import { organisations }  from '../db/schema';
import { eq }             from 'drizzle-orm';

const router = express.Router();

// ⚠️ Webhook requires raw body — register BEFORE express.json()
router.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'] as string;

    let event;
    try {
      event = constructWebhookEvent(req.body, signature);
    } catch (err) {
      console.error('[WEBHOOK] Signature verification failed:', err);
      return res.status(400).json({ message: 'Webhook signature failed' });
    }

    try {
      switch (event.type) {

        // Payment succeeded → activate plan
        case 'checkout.session.completed': {
          const session  = event.data.object as Record<string, unknown>;
          const meta     = session.metadata as Record<string, string>;
          const { organisationId, planType } = meta;

          if (organisationId && planType) {
            await db.update(organisations).set({
              planType,
              planStatus:     'active',
              subscriptionId: session.subscription as string,
              features:       getDefaultFeatures(planType),
              modifiedOn:     new Date(),
            }).where(eq(organisations.id, organisationId));

            console.log('[WEBHOOK] Plan activated:', organisationId, planType);
          }
          break;
        }

        // Subscription renewed
        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Record<string, unknown>;
          await db.update(organisations).set({
            planStatus: 'active', modifiedOn: new Date(),
          }).where(eq(organisations.subscriptionId, invoice.subscription as string));
          break;
        }

        // Payment failed → suspend
        case 'invoice.payment_failed': {
          const invoice = event.data.object as Record<string, unknown>;
          await db.update(organisations).set({
            planStatus: 'suspended', modifiedOn: new Date(),
          }).where(eq(organisations.subscriptionId, invoice.subscription as string));
          console.log('[WEBHOOK] Payment failed, plan suspended:', invoice.subscription);
          break;
        }

        // Subscription cancelled
        case 'customer.subscription.deleted': {
          const sub = event.data.object as Record<string, unknown>;
          await db.update(organisations).set({
            planStatus: 'cancelled', modifiedOn: new Date(),
          }).where(eq(organisations.subscriptionId, sub.id as string));
          break;
        }

        default:
          console.log('[WEBHOOK] Unhandled event type:', event.type);
      }

      return res.json({ received: true });
    } catch (err) {
      console.error('[WEBHOOK] Processing error:', err);
      return res.status(500).json({ message: 'Webhook processing failed' });
    }
  }
);

export default router;
```

---

### 4-5. Add Stripe Columns to organisations

```sql
ALTER TABLE organisations
  ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS stripe_price_id    VARCHAR(255);
```

---

### 4-6. Register Webhook Route in index.ts

```typescript
import webhookRoutes from './routes/webhook';

// ⚠️ CRITICAL: Register webhook BEFORE express.json() middleware
app.use('/api/webhook', webhookRoutes);

// Then register json middleware
app.use(express.json());
// ... rest of routes
```

---

### 4-7. Task 4 Verification

```bash
npx tsc --noEmit

# Test with Stripe CLI
stripe listen --forward-to localhost:3000/api/webhook/stripe
stripe trigger checkout.session.completed
# → Check DB: organisations.plan_status = 'active'

# API test
POST /api/settings/billing/checkout
body: { "planType": "professional", "billingCycle": "monthly" }
→ Expected: { url: "https://checkout.stripe.com/..." }
```

---

## 📋 Phase 3 Completion Checklist

```
Task 1 — Staff Invitation Email (Resend)
  □ /server/src/services/emailService.ts created
  □ sendInvitationEmail() implemented
  □ sendWelcomeEmail() implemented
  □ sendTenantCreatedEmail() implemented
  □ POST /settings/invitations — email dispatch wired
  □ POST /superadmin/tenants — tenant creation email wired
  □ POST /auth/accept-invite — account creation endpoint added
  □ Invitation email received (verified in Resend dashboard)

Task 2 — MEDIUM Tables organisation_id
  □ 8 tables: column added (nullable)
  □ Existing data backfilled via parent JOIN
  □ Zero NULL records remaining

Task 3 — Feature Flags Enforcement
  □ /server/src/middleware/featureGuard.ts created
  □ DEFAULT_FEATURES defined per plan
  □ getDefaultFeatures() used on tenant creation
  □ /client/src/hooks/useFeature.ts created
  □ CRM Sidebar: Camp module conditionally shown/locked
  □ Starter plan: Camp locked, Professional: Camp unlocked  ✅

Task 4 — Stripe Payment Integration
  □ stripe package installed
  □ STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET in Replit Secrets
  □ /server/src/services/stripeService.ts created
  □ POST /settings/billing/checkout implemented
  □ POST /settings/billing/portal implemented
  □ /server/src/routes/webhook.ts created
  □ stripe_customer_id column added to organisations
  □ Webhook route registered BEFORE express.json() in index.ts
  □ Stripe CLI webhook test passed
```

---

## ✅ Completion Report Format

```
✅ Task N Complete

Modified/Created files: [list]
Changes:                [description]

Verification:
  TypeScript:  0 errors
  Server:      started successfully
  DB queries:  [summary]
  API:         [summary]

⚠️ Next: Awaiting approval for Task N+1
```

---

## 🔮 Phase 4 Preview

```
Phase 4
  - LOW priority tables: organisation_id on products, users, teams, files
  - Student Portal (portal.abc.edubee.com)
      Students view progress, submit documents, check invoices
  - AI Assistant integration (Claude API — Enterprise plan only)
  - SSL automation (Let's Encrypt / Caddy)
  - Real-time notifications (WebSocket or Server-Sent Events)
  - Mobile app (React Native)
```

---

*Edubee CRM — Phase 3 SaaS Feature Completion Prompt v1.0 (EN) | 2026-04-03*
*Email: Resend.com API (already connected) | Payments: Stripe*
