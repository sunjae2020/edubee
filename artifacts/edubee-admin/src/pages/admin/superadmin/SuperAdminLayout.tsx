import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { LayoutDashboard, Building2, CreditCard, Zap, Users2, Cable, Menu, X } from "lucide-react";
import logoImg from "@assets/edubee_logo_200x200_1775194540791.png";

type NavItem = { href: string; label: string; icon: any; exact?: boolean; children?: { href: string; label: string; icon: any }[] };

const NAV: NavItem[] = [
  { href: "/superadmin",             label: "Dashboard",    icon: LayoutDashboard, exact: true },
  { href: "/superadmin/tenants",     label: "Tenants",      icon: Building2 },
  { href: "/superadmin/crm",         label: "SaaS CRM",     icon: Users2 },
  { href: "/superadmin/plans",       label: "Plans",        icon: CreditCard },
  { href: "/superadmin/integrations", label: "Integrations", icon: Cable },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user }   = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  /* 라우트 변경 시 모바일 메뉴 닫기 */
  useEffect(() => { setMobileOpen(false); }, [location]);

  /* 모바일 오픈 시 body 스크롤 잠금 */
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const isActive = (href: string, exact?: boolean) =>
    exact ? location === href : location.startsWith(href);

  const SidebarContent = () => (
    <>
      <div className="px-4 py-5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <img src={logoImg} alt="Edubee" className="w-8 h-8 object-contain" />
          <div>
            <p className="text-sm font-bold text-white leading-none">Edubee Admin</p>
            <span className="inline-flex items-center mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-(--e-orange) text-white tracking-wide">
              SUPER ADMIN
            </span>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon, exact, children }) => {
          const active    = isActive(href, exact);
          const anyChildActive = children?.some(c => isActive(c.href));
          return (
            <div key={href}>
              <Link href={href}>
                <div
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm font-medium"
                  style={{
                    background: active ? "var(--e-orange)" : "transparent",
                    color:      active ? "white" : "rgba(255,255,255,0.65)",
                  }}
                >
                  <Icon size={15} strokeWidth={1.8} />
                  {label}
                </div>
              </Link>

              {/* Sub-items — shown when parent is active or a child is active */}
              {children && (active || anyChildActive) && (
                <div className="ml-3 mt-0.5 mb-1 pl-3 border-l border-white/15 space-y-0.5">
                  {children.map(({ href: chHref, label: chLabel, icon: ChIcon }) => {
                    const chActive = isActive(chHref);
                    return (
                      <Link key={chHref} href={chHref}>
                        <div
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-md cursor-pointer transition-colors text-xs font-medium"
                          style={{
                            background: chActive ? "rgba(255,255,255,0.12)" : "transparent",
                            color:      chActive ? "white" : "rgba(255,255,255,0.5)",
                          }}
                        >
                          <ChIcon size={13} strokeWidth={1.8} />
                          {chLabel}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/10">
        <Link href="/admin/dashboard">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
            <span className="text-xs text-white/50">← Back to CRM</span>
          </div>
        </Link>
        <div className="px-3 pt-1">
          <p className="text-xs text-white/40 truncate">{user?.email ?? ""}</p>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex flex-col h-screen bg-[#FAFAF9]">
      {/* ⚠️ Super Admin 경고 배너 */}
      <div style={{
        background: "#DC2626",
        color: "#FFFFFF",
        textAlign: "center",
        padding: "5px 12px",
        fontSize: "11px",
        fontWeight: 600,
        letterSpacing: "0.06em",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        {/* 모바일 햄버거 버튼 */}
        <button
          className="md:hidden p-1 rounded text-white/80 hover:text-white transition-colors"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <Menu size={18} />
        </button>
        <span className="flex-1 text-center">⚠️ &nbsp;SUPER ADMIN MODE — Accessing all tenant data</span>
        {/* 모바일에서 여백 균형용 빈 공간 */}
        <span className="md:hidden w-7" />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* 데스크탑 사이드바 (md 이상에서만 표시) */}
        <aside className="hidden md:flex w-56 flex-col border-r border-[#E8E6E2] bg-[#1C1917] shrink-0">
          <SidebarContent />
        </aside>

        {/* 모바일 오버레이 백드롭 */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* 모바일 드로어 사이드바 */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-[#1C1917] md:hidden
            transform transition-transform duration-300 ease-in-out
            ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          `}
        >
          {/* 닫기 버튼 */}
          <div className="flex items-center justify-end px-3 pt-3 pb-1">
            <button
              onClick={() => setMobileOpen(false)}
              className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          </div>
          <SidebarContent />
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
