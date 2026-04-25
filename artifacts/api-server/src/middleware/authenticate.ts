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
