import { Request, Response, NextFunction } from "express";

/**
 * Middleware restricted to Edubee platform admins only.
 * Platform admin = super_admin role belonging to the edubee organisation (subdomain "myagency").
 * Blocked on tenant subdomain context (e.g. tsh.edubee.co) — platform APIs are app.edubee.co only.
 */
const EDUBEE_ORG_ID = "24fafb4c-92d6-4818-9e4d-eef2355199e8";

export function superAdminOnly(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const isPlatformAdmin =
    req.user &&
    req.user.role === "super_admin" &&
    req.user.organisationId === EDUBEE_ORG_ID &&
    (!req.tenantId || req.tenantId === EDUBEE_ORG_ID);

  if (!isPlatformAdmin) {
    return res.status(404).json({ message: "Not Found" });
  }
  next();
}
