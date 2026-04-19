import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface PortalUser {
  userType: "portal";
  accountId: string;
  email: string | null;
  portalRole: string | null;
  accountName: string;
}

declare global {
  namespace Express {
    interface Request {
      portalUser?: PortalUser;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET environment variable is required but not set");

export function authenticatePortal(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, code: "UNAUTHORIZED", message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.userType !== "portal") {
      return res.status(403).json({ success: false, code: "FORBIDDEN", message: "Portal access only" });
    }
    req.portalUser = decoded as PortalUser;
    next();
  } catch {
    return res.status(401).json({ success: false, code: "INVALID_TOKEN", message: "Invalid or expired token" });
  }
}
