import { Request, Response, NextFunction } from "express";

/**
 * Middleware restricted to Edubee platform admins only.
 * Allowed only when role=super_admin with no organisation_id and not in a tenant subdomain context.
 * - superadmin@edubee.co (app.edubee.co) → allowed (platform admin)
 * - superadmin@edubee.co (tsh.edubee.co) → blocked (super admin not permitted on tenant subdomain)
 * - sunjae@timest.com.au (ts org) → blocked (tenant super admin)
 */
export function superAdminOnly(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const isPlatformAdmin =
    req.user &&
    req.user.role === "super_admin" &&
    !req.user.organisationId &&
    !req.tenantId; // tenantId is set = tenant subdomain → block super admin API

  if (!isPlatformAdmin) {
    return res.status(404).json({ message: "Not Found" });
  }
  next();
}
