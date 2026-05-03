import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { staticDb } from "@workspace/db";
import { users, accounts } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  fullName: string;
  organisationId?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      tenantId?: string;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET environment variable is required but not set");

// ── DB-backed JWT revalidation ──────────────────────────────────────────────
// Why: JWT is stateless — once issued, it carries the user's organisationId/role
// until expiry. If the user is deactivated, moved to another org, or their org is
// suspended, those changes do NOT propagate until the JWT expires. This cache
// re-checks the DB every CACHE_TTL ms (default 5 min) per user.
// On mismatch (user gone / inactive / org changed) we reject with TOKEN_STALE,
// forcing the client to log in again.

type CachedUserState = {
  expiresAt: number;
  userExists: boolean;
  status: string | null;
  role: string | null;
  organisationId: string | null;
};

const REVALIDATE_TTL_MS = Number(process.env.AUTH_REVALIDATE_TTL_MS ?? 5 * 60 * 1000);
const userStateCache = new Map<string, CachedUserState>();

async function loadUserState(userId: string): Promise<CachedUserState> {
  const now = Date.now();
  const cached = userStateCache.get(userId);
  if (cached && cached.expiresAt > now) return cached;

  const [row] = await staticDb
    .select({ id: users.id, status: users.status, role: users.role, organisationId: users.organisationId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const fresh: CachedUserState = row
    ? { expiresAt: now + REVALIDATE_TTL_MS, userExists: true, status: row.status ?? null, role: row.role ?? null, organisationId: row.organisationId ?? null }
    : { expiresAt: now + REVALIDATE_TTL_MS, userExists: false, status: null, role: null, organisationId: null };

  userStateCache.set(userId, fresh);
  return fresh;
}

export function invalidateUserCache(userId: string) {
  userStateCache.delete(userId);
}

const ROLE_HIERARCHY: Record<string, number> = {
  super_admin: 100, admin: 80, finance: 70, admission: 65,
  team_manager: 60, consultant: 50, camp_coordinator: 40,
};

const ALLOWED_VIEW_AS_ROLES = new Set([
  "admin", "finance", "admission", "team_manager", "consultant", "camp_coordinator",
]);

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, code: "UNAUTHORIZED", message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  let decoded: AuthUser;
  try {
    decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
  } catch {
    return res.status(401).json({ success: false, code: "INVALID_TOKEN", message: "Invalid or expired token" });
  }

  // ── Revalidate against DB (cached 5min) ───────────────────────────────────
  // Catches: deactivated users, role changes, organisation reassignment, deleted users.
  // Portal/account tokens are validated elsewhere — only staff/admin tokens carry users.id.
  if (decoded.id && (decoded as any).userType !== "portal") {
    try {
      const fresh = await loadUserState(decoded.id);
      if (!fresh.userExists) {
        return res.status(401).json({ success: false, code: "USER_NOT_FOUND", message: "Account no longer exists. Please sign in again." });
      }
      if (fresh.status && fresh.status.toLowerCase() === "inactive") {
        return res.status(403).json({ success: false, code: "ACCOUNT_INACTIVE", message: "Account is inactive. Contact your administrator." });
      }
      if (fresh.organisationId !== (decoded.organisationId ?? null)) {
        return res.status(401).json({ success: false, code: "TOKEN_STALE", message: "Organisation membership changed. Please sign in again." });
      }
      if (fresh.role && decoded.role && fresh.role.toLowerCase() !== decoded.role.toLowerCase()) {
        return res.status(401).json({ success: false, code: "TOKEN_STALE", message: "Role changed. Please sign in again." });
      }
    } catch (err) {
      // DB transient failure — fail-open with stale token rather than locking everyone out.
      // Log loudly so we notice if this happens often.
      console.error("[authenticate] revalidate failed, falling back to JWT trust:", err);
    }
  }

  const myRole = decoded.role?.toLowerCase();
  const myLevel = ROLE_HIERARCHY[myRole] || 0;

  // ── Role-based View-As (same user/org, role only changes) ──────────────────
  // Security: only allowed if target role is STRICTLY lower than requester's role
  // and belongs to the same organisation — no cross-tenant access.
  const viewAsRole = req.headers["x-view-as-role"] as string | undefined;
  if (viewAsRole) {
    const targetRole = viewAsRole.toLowerCase();
    const targetLevel = ROLE_HIERARCHY[targetRole] || 0;
    const canViewAs = myLevel >= 60; // admin, finance, admission, team_manager, super_admin
    if (canViewAs && ALLOWED_VIEW_AS_ROLES.has(targetRole) && targetLevel < myLevel) {
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: targetRole,
        fullName: decoded.fullName,
        organisationId: decoded.organisationId,
      };
      return next();
    }
    // Invalid view-as role — fall through to own identity
  }

  // ── Account portal View-As (tenant-scoped accounts only) ──────────────────
  // Only allows switching to an account that belongs to the SAME organisation.
  const viewAsId = req.headers["x-view-as-user-id"] as string | undefined;
  const canViewAsAccount = myLevel >= 60;
  if (viewAsId && canViewAsAccount) {
    try {
      const [viewAsUser] = await staticDb
        .select({
          id: users.id,
          email: users.email,
          role: users.role,
          fullName: users.fullName,
          organisationId: users.organisationId,
        })
        .from(users)
        .where(eq(users.id, viewAsId))
        .limit(1);

      // Security: target user MUST belong to the same organisation
      if (viewAsUser && viewAsUser.organisationId === decoded.organisationId) {
        const targetLevel = ROLE_HIERARCHY[viewAsUser.role?.toLowerCase() || ""] || 0;
        if (targetLevel < myLevel) {
          req.user = {
            id: viewAsUser.id,
            email: viewAsUser.email ?? "",
            role: viewAsUser.role ?? "consultant",
            fullName: viewAsUser.fullName ?? "",
            organisationId: viewAsUser.organisationId ?? null,
          };
          return next();
        }
      }
    } catch {
      // If lookup fails, fall through to original user
    }
  }

  req.user = decoded;
  next();
}
