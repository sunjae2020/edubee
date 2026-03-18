import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useViewAs, ROLE_HIERARCHY } from "@/hooks/use-view-as";
import logoImg from "@assets/edubee_logo_800x310b_1773799222527.png";
import { ChevronLeft, ChevronRight } from "lucide-react";

type NavItem = { emoji: string; label: string; href: string };
type NavGroup = { label: string; items: NavItem[] };

function buildNav(effectiveRole: string): NavGroup[] {
  const isSA = effectiveRole === "super_admin";
  const isSAorAD = isSA || effectiveRole === "admin";
  const isCC = effectiveRole === "camp_coordinator";
  const isEA = effectiveRole === "education_agent";
  const isPartner = effectiveRole.startsWith("partner_");
  const isParent = effectiveRole === "parent_client";

  const nav: NavGroup[] = [];

  if (!isParent) {
    nav.push({ label: "Main", items: [{ emoji: "📊", label: "Dashboard", href: "/admin/dashboard" }] });
  }

  if (isSAorAD || isCC) {
    nav.push({
      label: isSAorAD ? "Programs" : "My Programs",
      items: [
        { emoji: "📦", label: "Package Groups", href: "/admin/package-groups" },
        { emoji: "🗂️", label: "Packages", href: "/admin/packages" },
        { emoji: "📦", label: "Products", href: "/admin/products" },
      ],
    });
  }

  if (isSAorAD || isCC || isEA) {
    nav.push({
      label: "Sales",
      items: [
        { emoji: "🎯", label: "Leads", href: "/admin/leads" },
        { emoji: "📋", label: "Applications", href: "/admin/applications" },
        { emoji: "📄", label: "Contracts", href: "/admin/contracts" },
      ],
    });
  }

  if (isSAorAD || isCC || isPartner) {
    const serviceItems: NavItem[] = [];
    if (isSAorAD || isCC || effectiveRole === "partner_institute")
      serviceItems.push({ emoji: "🎓", label: "Institute", href: "/admin/services/institute" });
    if (isSAorAD || isCC || effectiveRole === "partner_hotel")
      serviceItems.push({ emoji: "🏨", label: "Hotel", href: "/admin/services/hotel" });
    if (isSAorAD || isCC || effectiveRole === "partner_pickup")
      serviceItems.push({ emoji: "🚗", label: "Pickup", href: "/admin/services/pickup" });
    if (isSAorAD || isCC || effectiveRole === "partner_tour")
      serviceItems.push({ emoji: "🗺️", label: "Tour", href: "/admin/services/tour" });
    if (isSAorAD || isCC)
      serviceItems.push(
        { emoji: "🗓️", label: "Interviews", href: "/admin/services/interviews" },
        { emoji: "💵", label: "Settlement", href: "/admin/services/settlement" },
      );
    if (serviceItems.length > 0) nav.push({ label: "Services", items: serviceItems });
  }

  if (isSAorAD) {
    nav.push({
      label: "Accounting",
      items: [
        { emoji: "💰", label: "Client Invoices", href: "/admin/accounting/client-invoices" },
        { emoji: "🏢", label: "Agent Invoices", href: "/admin/accounting/agent-invoices" },
        { emoji: "🤝", label: "Partner Invoices", href: "/admin/accounting/partner-invoices" },
        { emoji: "🧾", label: "Receipts", href: "/admin/accounting/receipts" },
        { emoji: "🏦", label: "Transactions", href: "/admin/accounting/transactions" },
        { emoji: "💱", label: "Exchange Rates", href: "/admin/accounting/exchange-rates" },
      ],
    });
  }

  if (isCC || isEA || isPartner) {
    nav.push({
      label: "My Accounting",
      items: [
        { emoji: "💵", label: "My Settlements", href: "/admin/my-accounting/settlements" },
        { emoji: "🧾", label: "My Invoices", href: "/admin/my-accounting/invoices" },
        { emoji: "💰", label: "My Revenue", href: "/admin/my-accounting/revenue" },
      ],
    });
  }

  if (!isParent) {
    nav.push({ label: "Reports", items: [{ emoji: "📊", label: "Program Reports", href: "/admin/reports" }] });
  }

  if (isSAorAD) {
    nav.push({ label: "Users", items: [{ emoji: "👥", label: "Users", href: "/admin/users" }] });
  }

  if (isSA) {
    nav.push({
      label: "Settings",
      items: [
        { emoji: "⚙️", label: "General", href: "/admin/settings/general" },
        { emoji: "🔐", label: "Page Access", href: "/admin/settings/page-access" },
        { emoji: "🗂️", label: "Field Permissions", href: "/admin/settings/field-permissions" },
        { emoji: "📄", label: "Doc Permissions", href: "/admin/settings/doc-permissions" },
        { emoji: "🕵️", label: "Impersonation Logs", href: "/admin/settings/impersonation-logs" },
      ],
    });
  }

  if (isParent) {
    nav.push({ label: "My Programs", items: [{ emoji: "🎓", label: "My Programs", href: "/admin/my-programs" }] });
  }

  return nav;
}

type Props = { collapsed: boolean; onToggle: () => void };

export function AppSidebar({ collapsed, onToggle }: Props) {
  const [location] = useLocation();
  const { user } = useAuth();
  const { viewAsUser } = useViewAs();

  const effectiveRole = viewAsUser?.role ?? user?.role ?? "parent_client";
  const nav = buildNav(effectiveRole);

  return (
    <aside
      className="flex flex-col shrink-0 h-full overflow-hidden border-r border-slate-800 transition-all duration-200"
      style={{ width: collapsed ? 64 : 240, background: "#0F172A" }}
    >
      {/* Logo header */}
      <div className="flex items-center h-14 border-b border-slate-800 px-3 shrink-0">
        {!collapsed && (
          <Link href="/">
            <img src={logoImg} alt="Edubee Camp" className="h-6 w-auto object-contain brightness-0 invert opacity-90" />
          </Link>
        )}
        <button
          onClick={onToggle}
          className={`w-8 h-8 rounded-md flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-white transition-colors shrink-0 ${collapsed ? "mx-auto" : "ml-auto"}`}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-1 scrollbar-thin">
        {nav.map((group) => (
          <div key={group.label} className="mb-1">
            {!collapsed && (
              <div className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {group.label}
              </div>
            )}
            {group.items.map((item) => {
              const isActive = location === item.href || location.startsWith(item.href + "/");
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center gap-2.5 mx-2 px-2.5 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors ${
                      isActive
                        ? "bg-[#F08301]/15 text-[#F08301]"
                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                    } ${collapsed ? "justify-center" : ""}`}
                  >
                    <span className="text-base shrink-0">{item.emoji}</span>
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </div>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User footer */}
      {!collapsed && user && (
        <div className="border-t border-slate-800 p-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[#F08301]/20 text-[#F08301] text-xs font-bold flex items-center justify-center shrink-0">
              {user.fullName.substring(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white truncate">{user.fullName}</div>
              <div className="text-[10px] text-slate-500 truncate">{user.email}</div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
