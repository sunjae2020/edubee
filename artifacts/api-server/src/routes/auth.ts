import { Router } from "express";
import { db } from "@workspace/db";
import { users, refreshTokens, accounts, authLogs } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { authenticate } from "../middleware/authenticate.js";

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

function generateStaffTokens(user: { id: string; email: string; role: string; fullName: string; staffRole?: string | null }) {
  const accessToken = jwt.sign(
    {
      userType: "staff",
      id: user.id,
      email: user.email,
      role: user.role,
      staffRole: user.staffRole ?? user.role,
      fullName: user.fullName,
    },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
  const refreshToken = jwt.sign(
    { id: user.id, userType: "staff" },
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
    { id: account.id, userType: "portal" },
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
  const [staffUser] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);

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
      await db.update(users).set({ failedLoginAttempts: attempts, ...lockData }).where(eq(users.id, staffUser.id));
      await writeAuthLog("staff", staffUser.id, normalizedEmail, "login_fail", ip, ua);
      return res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" });
    }

    // Success
    await db.update(users).set({ failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() }).where(eq(users.id, staffUser.id));
    await writeAuthLog("staff", staffUser.id, normalizedEmail, "login_success", ip, ua);

    const { accessToken, refreshToken } = generateStaffTokens(staffUser);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await db.insert(refreshTokens).values({ userId: staffUser.id, token: refreshToken, expiresAt });

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
  const [portalAccount] = await db.select().from(accounts).where(eq(accounts.portalEmail as any, normalizedEmail)).limit(1);

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

  if (!portalAccount.portalPasswordHash) {
    return res.status(401).json({ error: "Unauthorized", message: "Portal password not set. Contact your administrator." });
  }

  // Check temp password (plaintext, one-time)
  let isTemp = false;
  if (portalAccount.portalTempPassword) {
    if (portalAccount.portalTempPwExpires && new Date(portalAccount.portalTempPwExpires) < new Date()) {
      // Temp expired — fall through to regular check
    } else if (password === portalAccount.portalTempPassword) {
      isTemp = true;
    }
  }

  const valid = isTemp || await bcrypt.compare(password, portalAccount.portalPasswordHash);
  if (!valid) {
    const attempts = (portalAccount.portalFailedAttempts ?? 0) + 1;
    const lockData = attempts >= MAX_FAILED ? { portalLockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) } : {};
    await db.update(accounts).set({ portalFailedAttempts: attempts, ...lockData } as any).where(eq(accounts.id, portalAccount.id));
    await writeAuthLog("portal", portalAccount.id, normalizedEmail, "login_fail", ip, ua);
    return res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" });
  }

  // Success
  await db.update(accounts).set({
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
    const { refreshToken } = req.body;
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

export default router;
