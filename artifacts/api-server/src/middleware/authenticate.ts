import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { staticDb } from "@workspace/db";
import { users } from "@workspace/db/schema";
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
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET environment variable is required but not set");

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

  // View-As impersonation: admins can view-as another user
  // Only super_admin / admin are allowed to impersonate
  const viewAsId = req.headers["x-view-as-user-id"] as string | undefined;
  if (viewAsId && (decoded.role === "super_admin" || decoded.role === "admin")) {
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

      if (viewAsUser) {
        req.user = {
          id: viewAsUser.id,
          email: viewAsUser.email ?? "",
          role: viewAsUser.role ?? "consultant",
          fullName: viewAsUser.fullName ?? "",
          organisationId: viewAsUser.organisationId ?? null,
        };
        return next();
      }
    } catch {
      // If lookup fails, fall through to original user
    }
  }

  req.user = decoded;
  next();
}
