import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

/**
 * Guard for the Edubee platform admin area only.
 *
 * Allowed: role === "super_admin" + not on a tenant subdomain
 *
 * Blocked:
 *   - Tenant subdomain (tsh.edubee.co etc.) → redirect to /admin/dashboard
 *   - Regular admin/coordinator/consultant → redirect to /admin/dashboard
 *   - Not logged in → redirect to /login
 */
export default function SuperAdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  // Block super admin access on tenant subdomains
  const NON_TENANT_SUBS_GUARD = new Set(["www", "app", "admin", "api", "mail"]);
  const guardHostParts = window.location.hostname.split(".");
  const guardSub = guardHostParts.length >= 3 ? guardHostParts[0].toLowerCase() : null;
  const isOnTenantSubdomainGuard = !!guardSub && !NON_TENANT_SUBS_GUARD.has(guardSub);

  const isPlatformAdmin = user?.role === "super_admin" && !isOnTenantSubdomainGuard;

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
