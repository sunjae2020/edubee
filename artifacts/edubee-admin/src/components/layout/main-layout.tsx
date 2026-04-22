import { useState, useEffect } from "react";
import { AppSidebar } from "./app-sidebar";
import { Header } from "./header";
import { AdminChatWidget } from "./AdminChatWidget";
import { useAuth } from "@/hooks/use-auth";
import { Redirect, useLocation } from "wouter";
import { useDateFormatLoader } from "@/hooks/use-date-format";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import axios from "axios";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [query]);
  return matches;
}

function ImpersonationBanner() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const orgId     = sessionStorage.getItem("admin_impersonate_org_id");
  const orgName   = sessionStorage.getItem("admin_impersonate_org_name") ?? "Unknown Tenant";
  const returnPath = sessionStorage.getItem("edubee_impersonate_return") ?? "/superadmin/tenants";

  // 마운트 시 테마 재로드 트리거
  // navigate() 이후에 이 컴포넌트가 마운트되므로, 이 시점에 sessionStorage 값이 확정됨
  useEffect(() => {
    if (orgId) {
      window.dispatchEvent(new Event("edubee:impersonation-changed"));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!orgId) return null;
  return (
    <div className="flex items-center justify-between px-4 py-1.5 text-sm font-medium text-white" style={{ background: "var(--e-orange-hover)" }}>
      <span>Viewing as <strong>{orgName}</strong></span>
      <button
        onClick={() => {
          sessionStorage.removeItem("admin_impersonate_org_id");
          sessionStorage.removeItem("admin_impersonate_org_name");
          sessionStorage.removeItem("edubee_impersonate_return");
          qc.clear();
          // 임프로소네이션 종료 후 기본 테넌트 테마로 복원
          window.dispatchEvent(new Event("edubee:impersonation-changed"));
          navigate(returnPath);
        }}
        className="ml-4 px-3 py-0.5 rounded bg-white/20 hover:bg-white/30 text-white text-xs font-semibold transition-colors"
      >
        ← Back to SuperAdmin
      </button>
    </div>
  );
}

// ── DelegatedAccessBanner ────────────────────────────────────────────────
// camp_coordinator 가 위임받은 Package Group 페이지를 볼 때 표시
function DelegatedAccessBanner() {
  const { user }     = useAuth();
  const [location]   = useLocation();
  const isCC         = user?.role === "camp_coordinator";

  // delegated-packages 페이지 또는 ?delegated=1 쿼리가 붙은 package group 상세 페이지
  const isDelegatedPath = location.startsWith("/admin/delegated-packages");
  const isDelegatedDetail =
    location.startsWith("/admin/package-groups/") &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("delegated") === "1";

  const { data } = useQuery<{ success: boolean; data: { ownerOrgName: string | null; ownerLogoUrl: string | null; ownerPrimaryColor: string | null }[] }>({
    queryKey: ["my-delegated-packages"],
    queryFn: () => axios.get(`${BASE}/api/my-delegated-packages`).then(r => r.data),
    enabled: isCC && (isDelegatedPath || isDelegatedDetail),
    staleTime: 60_000,
  });

  const owner = data?.data?.[0] ?? null;
  const bannerBg = owner?.ownerPrimaryColor ?? "#F5821F";

  if (!isCC || (!isDelegatedPath && !isDelegatedDetail)) return null;

  return (
    <div
      className="flex items-center justify-between px-4 py-2 text-sm font-medium"
      style={{ background: bannerBg, color: "#fff" }}
    >
      <span className="flex items-center gap-2">
        {owner?.ownerLogoUrl ? (
          <img src={owner.ownerLogoUrl} alt={owner.ownerOrgName ?? ""} className="h-5 w-auto object-contain rounded" style={{ maxWidth: 64 }} />
        ) : (
          <span>⚠️</span>
        )}
        <strong>Delegated scope only</strong>
        {owner?.ownerOrgName ? ` · Operating on behalf of ${owner.ownerOrgName}` : ""}
      </span>
      <span className="text-xs opacity-80 font-normal">
        Hard Delete · Finalise not permitted
      </span>
    </div>
  );
}

export function MainLayout({ children, title }: { children: React.ReactNode; title?: string }) {
  const { isAuthenticated, isLoading } = useAuth();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const isTablet = useMediaQuery("(max-width: 1023px)");
  useDateFormatLoader();

  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("edubee_sidebar_collapsed") === "1"; }
    catch { return false; }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (isMobile) setMobileOpen(false);
    else if (isTablet) setCollapsed(true);
  }, [isMobile, isTablet]);

  const toggleCollapsed = () => {
    if (isMobile) {
      setMobileOpen(o => !o);
    } else {
      setCollapsed(c => {
        const next = !c;
        try { localStorage.setItem("edubee_sidebar_collapsed", next ? "1" : "0"); } catch {}
        return next;
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--e-bg-page)" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-(--e-orange) border-t-transparent rounded-full animate-spin" />
          <p className="text-sm" style={{ color: "var(--e-text-2)" }}>Loading workspace…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <Redirect to="/login" />;

  const sidebarCollapsed = isMobile ? false : collapsed;

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ background: "var(--e-bg-page)" }}>
      {/* Mobile overlay */}
      {isMobile && mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={isMobile ? `fixed inset-y-0 left-0 z-40 transition-transform duration-200 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}` : ""}>
        <AppSidebar
          collapsed={sidebarCollapsed}
          onToggle={toggleCollapsed}
          onNavClick={isMobile ? () => setMobileOpen(false) : undefined}
        />
      </div>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header collapsed={sidebarCollapsed} onToggle={toggleCollapsed} title={title} />
        <ImpersonationBanner />
        <DelegatedAccessBanner />
        <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-6 md:pb-20 lg:p-8 lg:pb-20" style={{ background: "var(--e-bg-page)" }}>
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>

      <AdminChatWidget />
    </div>
  );
}
