import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { LayoutDashboard, Building2, CreditCard } from "lucide-react";

const NAV = [
  { href: "/superadmin",         label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/superadmin/tenants", label: "Tenants",   icon: Building2 },
  { href: "/superadmin/plans",   label: "Plans",     icon: CreditCard },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user }   = useAuth();

  const isActive = (href: string, exact?: boolean) =>
    exact ? location === href : location.startsWith(href);

  return (
    <div className="flex h-screen bg-[#FAFAF9]">
      {/* Sidebar */}
      <aside className="w-56 flex flex-col border-r border-[#E8E6E2] bg-[#1C1917] shrink-0">
        <div className="px-4 py-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-white">🐝</span>
            <div>
              <p className="text-sm font-bold text-white leading-none">Edubee Admin</p>
              <span className="inline-flex items-center mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#F5821F] text-white tracking-wide">
                SUPER ADMIN
              </span>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(({ href, label, icon: Icon, exact }) => {
            const active = isActive(href, exact);
            return (
              <Link key={href} href={href}>
                <div
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm font-medium"
                  style={{
                    background: active ? "#F5821F" : "transparent",
                    color:      active ? "white"  : "rgba(255,255,255,0.65)",
                  }}
                >
                  <Icon size={15} strokeWidth={1.8} />
                  {label}
                </div>
              </Link>
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
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
