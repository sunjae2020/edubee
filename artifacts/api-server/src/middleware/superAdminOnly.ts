import { Request, Response, NextFunction } from "express";

/**
 * Edubee 플랫폼 어드민 전용 미들웨어.
 * role=super_admin 이면서 organisation_id가 없고, 테넌트 서브도메인 컨텍스트가 아닌 경우만 허용.
 * - superadmin@edubee.co (app.edubee.co) → 허용 (플랫폼 어드민)
 * - superadmin@edubee.co (tsh.edubee.co) → 차단 (테넌트 서브도메인에서는 슈퍼어드민 불가)
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
    !req.user.organisationId &&
    !req.tenantId; // tenantId가 설정된 경우 = 테넌트 서브도메인 → 슈퍼어드민 API 차단

  if (!isPlatformAdmin) {
    return res.status(404).json({ message: "Not Found" });
  }
  next();
}
