import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

/**
 * Edubee 플랫폼 어드민 전용 가드.
 *
 * 허용 조건: role === "super_admin"
 *
 * 차단 조건:
 *   - 일반 admin/coordinator/consultant → /admin/dashboard 로 이동
 *   - 비로그인 → /login 으로 이동
 */
export default function SuperAdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  const isPlatformAdmin = user?.role === "super_admin";

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
