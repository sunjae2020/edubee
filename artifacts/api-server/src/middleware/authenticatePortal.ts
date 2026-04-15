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

const JWT_SECRET = process.env.JWT_SECRET || "edubee-camp-secret-key-change-in-production";

export function authenticatePortal(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized", message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.userType !== "portal") {
      return res.status(403).json({ error: "Forbidden", message: "Portal access only" });
    }
    req.portalUser = decoded as PortalUser;
    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized", message: "Invalid or expired token" });
  }
}
