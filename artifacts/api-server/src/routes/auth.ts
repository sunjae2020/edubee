import { Router } from "express";
import { db, staticDb } from "@workspace/db";
import { users, refreshTokens, accounts, authLogs, tenantInvitations, organisations } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { authenticate } from "../middleware/authenticate.js";
import { sendWelcomeEmail, sendPasswordResetEmail } from "../services/emailService.js";
import { provisionTenantSchema, migrateTenantDataFromPublic } from "../seeds/provision-tenant.js";
import { onboardTenant } from "../services/onboardingService.js";
import { runWithTenantSchema } from "@workspace/db/tenant-context";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "edubee-camp-secret-key-change-in-production";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "edubee-camp-refresh-secret-change-in-production";
const ACCESS_TOKEN_EXPIRY = "8h";
const PORTAL_TOKEN_EXPIRY = "24h";
const REFRESH_TOKEN_EXPIRY = "7d";
const MAX_FAILED = 5;
const LOCK_MINUTES = 30;

async function writeAuthLog(
  userType: string,
  userId: string | undefined,
  email: string,
  action: string,
  ip: string,
  ua: string
) {
  try {
    await db.insert(authLogs).values({ userType, userId, email, action, ipAddress: ip, userAgent: ua });
  } catch (e) {
    console.error("[auth log]", e);
  }
}

function generateStaffTokens(user: { id: string; email: string; role: string; fullName: string; staffRole?: string | null; organisationId?: string | null }) {
  // Platform super admins must NOT have an organisationId in their JWT
  // so that superAdminOnly middleware can identify them correctly.
  const orgId = user.role === "super_admin" ? null : (user.organisationId ?? null);
  const accessToken = jwt.sign(
    {
      userType: "staff",
      id: user.id,
      email: user.email,
      role: user.role,
      staffRole: user.staffRole ?? user.role,
      fullName: user.fullName,
      organisationId: orgId,
    },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
  const refreshToken = jwt.sign(
    { id: user.id, userType: "staff", jti: crypto.randomUUID() },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
  return { accessToken, refreshToken };
}

function generatePortalTokens(account: { id: string; name: string; portalEmail: string | null; portalRole: string | null }) {
  const accessToken = jwt.sign(
    {
      userType: "portal",
      accountId: account.id,
      email: account.portalEmail,
      portalRole: account.portalRole,
      accountName: account.name,
    },
    JWT_SECRET,
    { expiresIn: PORTAL_TOKEN_EXPIRY }
  );
  const refreshToken = jwt.sign(
    { id: account.id, userType: "portal", jti: crypto.randomUUID() },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
  return { accessToken, refreshToken };
}

// POST /api/auth/login — staff + portal unified login
router.post("/login", async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };
  const ip = (req.ip ?? req.socket?.remoteAddress ?? "").replace("::ffff:", "");
  const ua = req.headers["user-agent"] ?? "";

  if (!email || !password) {
    return res.status(400).json({ error: "Bad Request", message: "Email and password required" });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // ── STEP 1: Internal staff
  // Staff accounts always live in public.users — use staticDb so tenant schema
  // context (runWithTenantSchema) does NOT redirect this query to a tenant schema.
  const [staffUser] = await staticDb.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);

  if (staffUser) {
    if (staffUser.status === "inactive" || staffUser.status === "Inactive") {
      return res.status(403).json({ error: "Forbidden", message: "Account is inactive. Contact your administrator." });
    }

    if (staffUser.lockedUntil && new Date(staffUser.lockedUntil) > new Date()) {
      const remaining = Math.ceil((new Date(staffUser.lockedUntil).getTime() - Date.now()) / 60000);
      return res.status(429).json({ error: "Locked", message: `Account locked. Try again in ${remaining} minute(s).` });
    }

    if (!staffUser.passwordHash) {
      return res.status(401).json({ error: "Unauthorized", message: "Password not set. Check your invitation email." });
    }

    const valid = await bcrypt.compare(password, staffUser.passwordHash);
    if (!valid) {
      const attempts = (staffUser.failedLoginAttempts ?? 0) + 1;
      const lockData = attempts >= MAX_FAILED ? { lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) } : {};
      await staticDb.update(users).set({ failedLoginAttempts: attempts, ...lockData }).where(eq(users.id, staffUser.id));
      await writeAuthLog("staff", staffUser.id, normalizedEmail, "login_fail", ip, ua);
      return res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" });
    }

    // Success
    await staticDb.update(users).set({ failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() }).where(eq(users.id, staffUser.id));
    await writeAuthLog("staff", staffUser.id, normalizedEmail, "login_success", ip, ua);

    const { accessToken, refreshToken } = generateStaffTokens(staffUser);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await staticDb.insert(refreshTokens).values({ userId: staffUser.id, token: refreshToken, expiresAt });

    const { passwordHash: _, ...userWithoutPw } = staffUser;
    return res.json({
      accessToken,
      refreshToken,
      userType: "staff",
      redirectTo: "/dashboard",
      user: userWithoutPw,
    });
  }

  // ── STEP 2: External portal partner
  // The tenantResolver sets req.tenantId (org UUID) from X-Organisation-Id header.
  // If a tenant is identified, scope portal accounts to that tenant only.
  const requestingTenantId = (req as any).tenantId as string | undefined;

  // Use staticDb (always public schema) — portal accounts live in public.accounts
  // Try portal_email first, fall back to email column for accounts where portal_email was not set
  let portalAccount = await staticDb.select().from(accounts)
    .where(
      requestingTenantId
        ? and(eq(accounts.portalEmail as any, normalizedEmail), eq(accounts.organisationId as any, requestingTenantId))
        : eq(accounts.portalEmail as any, normalizedEmail)
    )
    .limit(1)
    .then(r => r[0] ?? null);

  if (!portalAccount) {
    // Fallback: match by email column, but only for accounts that have portal_role set
    const [fallback] = await staticDb.select().from(accounts)
      .where(
        requestingTenantId
          ? and(
              eq(accounts.email as any, normalizedEmail),
              sql`portal_role IS NOT NULL`,
              eq(accounts.organisationId as any, requestingTenantId)
            )
          : and(eq(accounts.email as any, normalizedEmail), sql`portal_role IS NOT NULL`)
      )
      .limit(1);
    portalAccount = fallback ?? null;
  }

  if (!portalAccount) {
    return res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" });
  }

  if (!portalAccount.portalAccess) {
    return res.status(401).json({ error: "Unauthorized", message: "Portal access is not enabled for this account." });
  }

  if (portalAccount.status !== "Active") {
    return res.status(403).json({ error: "Forbidden", message: "Account is inactive." });
  }

  if (portalAccount.portalLockedUntil && new Date(portalAccount.portalLockedUntil) > new Date()) {
    const remaining = Math.ceil((new Date(portalAccount.portalLockedUntil).getTime() - Date.now()) / 60000);
    return res.status(429).json({ error: "Locked", message: `Account locked. Try again in ${remaining} minute(s).` });
  }

  // Check temp password FIRST (before requiring a permanent hash)
  let isTemp = false;
  if (portalAccount.portalTempPassword) {
    const tempExpired = portalAccount.portalTempPwExpires && new Date(portalAccount.portalTempPwExpires) < new Date();
    if (!tempExpired && password === portalAccount.portalTempPassword) {
      isTemp = true;
    }
  }

  // If no temp match, require a permanent password hash
  if (!isTemp && !portalAccount.portalPasswordHash) {
    return res.status(401).json({ error: "Unauthorized", message: "Portal password not set. Contact your administrator." });
  }

  const valid = isTemp || await bcrypt.compare(password, portalAccount.portalPasswordHash!);
  if (!valid) {
    const attempts = (portalAccount.portalFailedAttempts ?? 0) + 1;
    const lockData = attempts >= MAX_FAILED ? { portalLockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) } : {};
    await staticDb.update(accounts).set({ portalFailedAttempts: attempts, ...lockData } as any).where(eq(accounts.id, portalAccount.id));
    await writeAuthLog("portal", portalAccount.id, normalizedEmail, "login_fail", ip, ua);
    return res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" });
  }

  // Success
  await staticDb.update(accounts).set({
    portalFailedAttempts: 0,
    portalLockedUntil: null,
    portalLastLoginAt: new Date(),
    ...(isTemp ? { portalMustChangePw: true } : {}),
  } as any).where(eq(accounts.id, portalAccount.id));
  await writeAuthLog("portal", portalAccount.id, normalizedEmail, "login_success", ip, ua);

  const { accessToken, refreshToken } = generatePortalTokens(portalAccount);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  return res.json({
    accessToken,
    refreshToken,
    userType: "portal",
    mustChangePassword: isTemp || portalAccount.portalMustChangePw,
    redirectTo: "/portal/dashboard",
    user: {
      accountId: portalAccount.id,
      accountName: portalAccount.name,
      email: portalAccount.portalEmail,
      portalRole: portalAccount.portalRole,
    },
  });
});

// POST /api/auth/refresh
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: "Bad Request", message: "Refresh token required" });
    }

    let decoded: { id: string; userType?: string };
    try {
      decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { id: string; userType?: string };
    } catch {
      return res.status(401).json({ error: "Unauthorized", message: "Invalid refresh token" });
    }

    const [storedToken] = await db.select().from(refreshTokens).where(eq(refreshTokens.token, refreshToken)).limit(1);
    if (!storedToken || storedToken.expiresAt < new Date()) {
      return res.status(401).json({ error: "Unauthorized", message: "Refresh token expired" });
    }

    const [user] = await db.select().from(users).where(eq(users.id, decoded.id)).limit(1);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized", message: "User not found" });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateStaffTokens(user);
    await db.delete(refreshTokens).where(eq(refreshTokens.token, refreshToken));
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await db.insert(refreshTokens).values({ userId: user.id, token: newRefreshToken, expiresAt });

    const { passwordHash: _, ...userWithoutPw } = user;
    return res.json({ accessToken, refreshToken: newRefreshToken, user: userWithoutPw });
  } catch (err) {
    console.error("Refresh error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/auth/logout
router.post("/logout", authenticate, async (req, res) => {
  try {
    const { refreshToken } = req.body ?? {};
    if (refreshToken) {
      await db.delete(refreshTokens).where(eq(refreshTokens.token, refreshToken));
    }
    return res.json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    console.error("Logout error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/auth/me
router.get("/me", authenticate, async (req, res) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.user!.id)).limit(1);
    if (!user) {
      return res.status(404).json({ error: "Not Found" });
    }
    const { passwordHash: _, ...userWithoutPw } = user;
    return res.json(userWithoutPw);
  } catch (err) {
    console.error("Get me error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/auth/check-email?email=xxx
router.get("/check-email", async (req, res) => {
  const email = ((req.query.email as string) || "").toLowerCase().trim();
  if (!email) {
    return res.status(400).json({ available: false, message: "Email is required." });
  }
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    return res.json({ available: false, message: "This email is already registered." });
  }
  return res.json({ available: true });
});

// Generate a URL-safe subdomain from an org name + random suffix for uniqueness
function generateSubdomain(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 24);
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { organisation, user, account, service_modules } = req.body as {
      organisation: { name: string; phone_number?: string; organization_url?: string; address_line_1?: string };
      user: { first_name: string; last_name: string; email: string; password: string };
      account: { account_type: string; plan: string };
      service_modules: string[];
    };

    if (!organisation?.name || !user?.first_name || !user?.last_name || !user?.email || !user?.password) {
      return res.status(400).json({ success: false, error: "VALIDATION_ERROR", message: "Required fields are missing." });
    }
    if (user.password.length < 8) {
      return res.status(400).json({ success: false, error: "VALIDATION_ERROR", message: "Password must be at least 8 characters." });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(user.email)) {
      return res.status(400).json({ success: false, error: "VALIDATION_ERROR", message: "Invalid email format." });
    }

    const normalizedEmail = user.email.toLowerCase().trim();

    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, normalizedEmail)).limit(1);
    if (existing) {
      return res.status(409).json({ success: false, error: "EMAIL_ALREADY_EXISTS", message: "This email is already registered." });
    }

    const passwordHash = await bcrypt.hash(user.password, 10);
    const subdomain = generateSubdomain(organisation.name);

    const result = await db.transaction(async (tx) => {
      // 1. Create the tenant organisation record
      const [newOrg] = await tx.insert(organisations).values({
        name: organisation.name,
        subdomain,
        status: "Active",
        ownerEmail: normalizedEmail,
        phone: organisation.phone_number || null,
        websiteUrl: organisation.organization_url || null,
        address: organisation.address_line_1 || null,
        hasAbn: false,
        planType: account?.plan || "lite",
        planStatus: "trial",
      } as any).returning();

      // 2. Create the admin user linked to this organisation
      const [newUser] = await tx.insert(users).values({
        email: normalizedEmail,
        passwordHash,
        role: "Admin",
        fullName: `${user.first_name} ${user.last_name}`,
        firstName: user.first_name,
        lastName: user.last_name,
        status: "active",
        organisationId: newOrg.id,
      } as any).returning();

      // 3. Also create an accounts profile for CRM use (backward-compat)
      const [newAccount] = await tx.insert(accounts).values({
        name: organisation.name,
        accountType: account?.account_type || "Agent",
        ownerId: newUser.id,
        email: normalizedEmail,
        phoneNumber: organisation.phone_number || null,
        website: organisation.organization_url || null,
        address: organisation.address_line_1 || null,
        status: "Active",
        manualInput: false,
        firstName: user.first_name,
        lastName: user.last_name,
        organisationId: newOrg.id,
      } as any).returning();

      return { newUser, newOrg, newAccount };
    });

    // Provision tenant schema + seed master data (non-fatal if fails)
    const { newOrg } = result;
    if (newOrg.subdomain) {
      try {
        await provisionTenantSchema(newOrg.subdomain);
        console.log(`[Register] Provisioned schema "${newOrg.subdomain}" for org ${newOrg.id}`);

        await migrateTenantDataFromPublic(newOrg.subdomain, newOrg.id);
        console.log(`[Register] Migrated initial data to schema "${newOrg.subdomain}"`);

        await runWithTenantSchema(newOrg.subdomain, () => onboardTenant(newOrg.id));
        console.log(`[Register] Onboarded tenant "${newOrg.subdomain}"`);
      } catch (provErr) {
        console.warn("[Register] Schema provision/onboard failed (non-fatal):", provErr);
      }
    }

    // Send welcome email (non-blocking)
    try {
      await sendWelcomeEmail({
        toEmail: normalizedEmail,
        userName: `${user.first_name} ${user.last_name}`,
        companyName: organisation.name,
        loginUrl: `https://crm.edubee.co/login`,
      });
    } catch (emailErr) {
      console.error("Welcome email failed (non-critical):", emailErr);
    }

    return res.json({
      success: true,
      message: "Account created successfully. Please sign in.",
      userId: result.newUser.id,
      organisationId: result.newOrg.id,
      subdomain: result.newOrg.subdomain,
    });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ success: false, error: "SERVER_ERROR", message: "An unexpected error occurred. Please try again." });
  }
});

// POST /api/auth/forgot-password
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email) {
    return res.status(400).json({ success: false, message: "Email is required." });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    // Staff users always live in public.users — use staticDb to bypass tenant schema context
    const [user] = await staticDb.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);

    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await staticDb.update(users)
        .set({ passwordResetToken: token, passwordResetExpires: expires })
        .where(eq(users.id, user.id));

      // Resolve reset URL: tenant subdomain → https://{subdomain}.edubee.co/admin/reset-password?token=...
      // Fallback: APP_URL env or the request origin header
      let baseUrl = process.env.APP_URL ?? "";
      if (user.organisationId) {
        const [org] = await staticDb
          .select({ subdomain: organisations.subdomain, name: organisations.name })
          .from(organisations)
          .where(eq(organisations.id, user.organisationId))
          .limit(1);
        if (org?.subdomain) {
          baseUrl = `https://${org.subdomain}.edubee.co`;
        }
      }
      // Fallback: derive from request origin
      if (!baseUrl) {
        const origin = req.get("origin") ?? req.get("referer") ?? "";
        if (origin) {
          try { baseUrl = new URL(origin).origin; } catch {}
        }
      }

      const resetUrl = `${baseUrl}/admin/reset-password?token=${token}`;
      console.log(`[PasswordReset] Reset link for ${normalizedEmail}: ${resetUrl}`);

      // Look up org name for email subject
      let orgName = "Edubee CRM";
      if (user.organisationId) {
        const [org] = await staticDb
          .select({ name: organisations.name })
          .from(organisations)
          .where(eq(organisations.id, user.organisationId))
          .limit(1);
        if (org?.name) orgName = org.name;
      }

      // Fire-and-forget: email send failure should not block the success response
      sendPasswordResetEmail({
        toEmail:  normalizedEmail,
        fullName: user.fullName ?? normalizedEmail,
        resetUrl,
        orgName,
      }).catch(err => console.error("[PasswordReset] Email send failed:", err));
    }

    return res.json({ success: true, message: "If this email is registered, you will receive a password reset link." });
  } catch (err) {
    console.error("Forgot password error:", err);
    return res.status(500).json({ success: false, message: "An unexpected error occurred. Please try again." });
  }
});

// POST /api/auth/reset-password
router.post("/reset-password", async (req, res) => {
  const { token, password } = req.body as { token?: string; password?: string };

  if (!token || !password) {
    return res.status(400).json({ success: false, error: "INVALID_TOKEN", message: "Token and password are required." });
  }
  if (password.length < 8) {
    return res.status(400).json({ success: false, message: "Password must be at least 8 characters." });
  }

  try {
    // Staff users always live in public.users — use staticDb to bypass tenant schema context
    const [user] = await staticDb.select().from(users).where(eq(users.passwordResetToken, token)).limit(1);

    if (!user || !user.passwordResetExpires || new Date(user.passwordResetExpires) < new Date()) {
      return res.status(400).json({ success: false, error: "INVALID_TOKEN", message: "Invalid or expired reset link. Please request a new one." });
    }

    const hash = await bcrypt.hash(password, 10);
    await staticDb.update(users)
      .set({ passwordHash: hash, passwordResetToken: null, passwordResetExpires: null, failedLoginAttempts: 0, lockedUntil: null })
      .where(eq(users.id, user.id));

    return res.json({ success: true, message: "Password reset successfully. You can now log in." });
  } catch (err) {
    console.error("Reset password error:", err);
    return res.status(500).json({ success: false, message: "An unexpected error occurred. Please try again." });
  }
});

// POST /api/auth/change-password — logged-in user changes own password
router.post("/change-password", authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword: string };
  const authUser = req.user!;
  const ip = (req.ip ?? "").replace("::ffff:", "");
  const ua = req.headers["user-agent"] ?? "";

  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ success: false, error: "Password must be at least 8 characters." });
  }

  const [user] = await db.select().from(users).where(eq(users.id, authUser.id)).limit(1);
  if (!user) return res.status(404).json({ success: false, error: "User not found" });

  if (user.passwordHash && currentPassword) {
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return res.status(401).json({ success: false, error: "Current password is incorrect." });
  }

  const hash = await bcrypt.hash(newPassword, 12);
  await db.update(users).set({ passwordHash: hash }).where(eq(users.id, authUser.id));
  await writeAuthLog("staff", authUser.id, authUser.email, "password_change", ip, ua);

  return res.json({ success: true, message: "Password changed successfully." });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/accept-invite — Create account from invitation token
// ─────────────────────────────────────────────────────────────────────────────
router.post("/accept-invite", async (req, res) => {
  try {
    const { token, password, firstName, lastName } = req.body as {
      token: string; password: string; firstName: string; lastName: string;
    };

    if (!token || !password || !firstName || !lastName) {
      return res.status(400).json({ message: "token, password, firstName and lastName are required." });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters." });
    }

    // 1. Look up token
    const [invite] = await db
      .select().from(tenantInvitations)
      .where(
        and(
          eq(tenantInvitations.token, token),
          eq(tenantInvitations.status, "Pending")
        )
      ).limit(1);

    if (!invite) {
      return res.status(400).json({ message: "Invalid or already-used invitation link." });
    }

    // 2. Check expiry
    if (new Date() > invite.expiresAt) {
      await db.update(tenantInvitations)
        .set({ status: "Expired" })
        .where(eq(tenantInvitations.id, invite.id));
      return res.status(400).json({ message: "Invitation link has expired." });
    }

    // 3. Check if user with this email already exists
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, invite.email))
      .limit(1);

    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    // 4. Create user account
    const passwordHash = await bcrypt.hash(password, 12);

    await db.insert(users).values({
      fullName:       `${firstName} ${lastName}`.trim(),
      email:          invite.email,
      passwordHash,
      role:           invite.role as any,
      status:         "active",
      organisationId: invite.organisationId,
    } as any);

    // 5. Mark invitation as accepted
    await db.update(tenantInvitations)
      .set({ status: "Accepted", acceptedAt: new Date() })
      .where(eq(tenantInvitations.id, invite.id));

    // 6. Send welcome email (non-blocking)
    const [org] = await db.select().from(organisations)
      .where(eq(organisations.id, invite.organisationId)).limit(1);

    sendWelcomeEmail({
      toEmail:     invite.email,
      userName:    `${firstName} ${lastName}`,
      companyName: org?.name ?? 'Edubee CRM',
      loginUrl:    `https://${org?.subdomain ?? 'app'}.edubee.co/login`,
    }).catch(err => console.error('[EMAIL] Welcome email failed:', err));

    return res.json({
      success: true,
      message: "Account created successfully. Please sign in.",
    });
  } catch (err) {
    console.error("[POST /accept-invite]", err);
    return res.status(500).json({ message: "Server error." });
  }
});

export default router;
