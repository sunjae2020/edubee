import { Request, Response, NextFunction } from "express";

/**
 * Edubee 플랫폼 어드민 전용 미들웨어.
 * role=super_admin 이면서 organisation_id가 없는 사용자만 허용.
 * - superadmin@edubee.co → 허용 (플랫폼 어드민)
 * - sunjae@timest.com.au (ts org) → 차단 (테넌트 슈퍼 어드민)
 */
export function superAdminOnly(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const isPlatformAdmin =
    req.user &&
    req.user.role === "super_admin" &&
    !req.user.organisationId;

  if (!isPlatformAdmin) {
    return res.status(404).json({ message: "Not Found" });
  }
  next();
}
