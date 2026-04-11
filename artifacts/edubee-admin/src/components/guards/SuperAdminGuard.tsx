import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

/**
 * Edubee 플랫폼 어드민 전용 가드.
 *
 * 허용 조건: role === "super_admin" AND organisationId가 없음(null/undefined)
 *   - superadmin@edubee.co → 허용 (Edubee 플랫폼 관리자)
 *
 * 차단 조건:
 *   - 테넌트 super_admin (organisationId 있음) → /admin/dashboard 로 이동
 *     예: sunjae@timest.com.au (ts 테넌트)
 *   - 일반 admin/coordinator/consultant → /admin/dashboard 로 이동
 *   - 비로그인 → /login 으로 이동
 */
export default function SuperAdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  const isPlatformAdmin =
    user?.role === "super_admin" && !user?.organisationId;

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      navigate("/login");
      return;
    }
    if (!isPlatformAdmin) {
      navigate("/admin/dashboard");
    }
  }, [user, isLoading, isPlatformAdmin, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#FAFAF9" }}>
        <div className="w-7 h-7 border-2 border-(--e-orange) border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !isPlatformAdmin) return null;

  return <>{children}</>;
}
