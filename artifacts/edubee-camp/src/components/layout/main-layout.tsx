import { useState, useEffect } from "react";
import { AppSidebar } from "./app-sidebar";
import { Header } from "./header";
import { AdminChatWidget } from "./AdminChatWidget";
import { useAuth } from "@/hooks/use-auth";
import { Redirect, useLocation } from "wouter";
import { useDateFormatLoader } from "@/hooks/use-date-format";
import { useQueryClient } from "@tanstack/react-query";

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
  const orgId     = sessionStorage.getItem("edubee_impersonate_org_id");
  const orgName   = sessionStorage.getItem("edubee_impersonate_org_name") ?? "Unknown Tenant";
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
          sessionStorage.removeItem("edubee_impersonate_org_id");
          sessionStorage.removeItem("edubee_impersonate_org_name");
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
          <div className="w-8 h-8 border-2 border-[--e-orange] border-t-transparent rounded-full animate-spin" />
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
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8" style={{ background: "var(--e-bg-page)" }}>
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>

      <AdminChatWidget />
    </div>
  );
}
