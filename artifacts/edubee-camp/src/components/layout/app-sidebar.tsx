import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useViewAs, ROLE_HIERARCHY } from "@/hooks/use-view-as";
import logoImg from "@assets/edubee_logo_800x310b_1773799222527.png";
import {
  ChevronLeft, ChevronRight,
  LayoutDashboard, Layers, Package, ShoppingBag,
  Target, ClipboardList, FileText,
  GraduationCap, Building2, Car, Map, CalendarCheck, Banknote,
  Receipt, Building, Handshake, FileCheck, ArrowLeftRight, RefreshCw,
  Wallet, BarChart2, BarChart3,
  Users, Settings, Lock, Grid2x2, FileSearch, UserSearch,
  LucideIcon,
} from "lucide-react";

type NavItem = { icon: LucideIcon; label: string; href: string };
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
    nav.push({ label: "Main", items: [{ icon: LayoutDashboard, label: "Dashboard", href: "/admin/dashboard" }] });
  }

  if (isSAorAD || isCC) {
    nav.push({
      label: isSAorAD ? "Programs" : "My Programs",
      items: [
        { icon: Layers, label: "Package Groups", href: "/admin/package-groups" },
        { icon: Package, label: "Packages", href: "/admin/packages" },
        { icon: ShoppingBag, label: "Products", href: "/admin/products" },
      ],
    });
  }

  if (isSAorAD || isCC || isEA) {
    nav.push({
      label: "Sales",
      items: [
        { icon: Target, label: "Leads", href: "/admin/leads" },
        { icon: ClipboardList, label: "Applications", href: "/admin/applications" },
        { icon: FileText, label: "Contracts", href: "/admin/contracts" },
      ],
    });
  }

  if (isSAorAD || isCC || isPartner) {
    const serviceItems: NavItem[] = [];
    if (isSAorAD || isCC || effectiveRole === "partner_institute")
      serviceItems.push({ icon: GraduationCap, label: "Institute", href: "/admin/services/institute" });
    if (isSAorAD || isCC || effectiveRole === "partner_hotel")
      serviceItems.push({ icon: Building2, label: "Hotel", href: "/admin/services/hotel" });
    if (isSAorAD || isCC || effectiveRole === "partner_pickup")
      serviceItems.push({ icon: Car, label: "Pickup", href: "/admin/services/pickup" });
    if (isSAorAD || isCC || effectiveRole === "partner_tour")
      serviceItems.push({ icon: Map, label: "Tour", href: "/admin/services/tour" });
    if (isSAorAD || isCC)
      serviceItems.push(
        { icon: CalendarCheck, label: "Interviews", href: "/admin/services/interviews" },
        { icon: Banknote, label: "Settlement", href: "/admin/services/settlement" },
      );
    if (serviceItems.length > 0) nav.push({ label: "Services", items: serviceItems });
  }

  if (isSAorAD) {
    nav.push({
      label: "Accounting",
      items: [
        { icon: Receipt, label: "Client Invoices", href: "/admin/accounting/client-invoices" },
        { icon: Building, label: "Agent Invoices", href: "/admin/accounting/agent-invoices" },
        { icon: Handshake, label: "Partner Invoices", href: "/admin/accounting/partner-invoices" },
        { icon: FileCheck, label: "Receipts", href: "/admin/accounting/receipts" },
        { icon: ArrowLeftRight, label: "Transactions", href: "/admin/accounting/transactions" },
        { icon: RefreshCw, label: "Exchange Rates", href: "/admin/accounting/exchange-rates" },
      ],
    });
  }

  if (isCC || isEA || isPartner) {
    nav.push({
      label: "My Accounting",
      items: [
        { icon: Wallet, label: "My Settlements", href: "/admin/my-accounting/settlements" },
        { icon: FileText, label: "My Invoices", href: "/admin/my-accounting/invoices" },
        { icon: BarChart2, label: "My Revenue", href: "/admin/my-accounting/revenue" },
      ],
    });
  }

  if (!isParent) {
    nav.push({ label: "Reports", items: [{ icon: BarChart3, label: "Program Reports", href: "/admin/reports" }] });
  }

  if (isSAorAD) {
    nav.push({ label: "Users", items: [{ icon: Users, label: "Users", href: "/admin/users" }] });
  }

  if (isSA) {
    nav.push({
      label: "Settings",
      items: [
        { icon: Settings, label: "General", href: "/admin/settings/general" },
        { icon: Lock, label: "Page Access", href: "/admin/settings/page-access" },
        { icon: Grid2x2, label: "Field Permissions", href: "/admin/settings/field-permissions" },
        { icon: FileSearch, label: "Doc Permissions", href: "/admin/settings/doc-permissions" },
        { icon: UserSearch, label: "Impersonation Logs", href: "/admin/settings/impersonation-logs" },
      ],
    });
  }

  if (isParent) {
    nav.push({ label: "My Programs", items: [{ icon: GraduationCap, label: "My Programs", href: "/admin/my-programs" }] });
  }

  return nav;
}

type Props = { collapsed: boolean; onToggle: () => void };

export function AppSidebar({ collapsed, onToggle }: Props) {
  const [location] = useLocation();
  const { user } = useAuth();
  const { viewAsUser, isImpersonating } = useViewAs();

  const effectiveRole = viewAsUser?.role ?? user?.role ?? "parent_client";
  const nav = buildNav(effectiveRole);

  const dark = isImpersonating;

  const bg          = dark ? "#0F172A"              : "#F8F7F5";
  const border      = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";
  const groupColor  = dark ? "#475569"              : "#9CA3AF";
  const toggleColor = dark ? "#64748b"              : "#9CA3AF";
  const footerNameColor  = dark ? "#e2e8f0" : "#1e293b";
  const footerEmailColor = dark ? "#64748b" : "#94a3b8";

  return (
    <aside
      className="flex flex-col shrink-0 h-full overflow-hidden transition-all duration-200"
      style={{
        width: collapsed ? 60 : 232,
        background: bg,
        borderRight: `1px solid ${border}`,
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center h-14 shrink-0 px-3"
        style={{ borderBottom: `1px solid ${border}` }}
      >
        {!collapsed && (
          <Link href="/">
            <img
              src={logoImg}
              alt="Edubee Camp"
              className={`h-6 w-auto object-contain ${dark ? "brightness-0 invert opacity-90" : ""}`}
            />
          </Link>
        )}
        <button
          onClick={onToggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0 ${collapsed ? "mx-auto" : "ml-auto"}`}
          style={{ color: toggleColor }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)";
            (e.currentTarget as HTMLButtonElement).style.color = dark ? "#e2e8f0" : "#374151";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            (e.currentTarget as HTMLButtonElement).style.color = toggleColor;
          }}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {nav.map((group) => (
          <div key={group.label} className="mb-1">
            {!collapsed && (
              <div
                className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest select-none"
                style={{ color: groupColor }}
              >
                {group.label}
              </div>
            )}
            {group.items.map((item) => {
              const isActive = location === item.href || location.startsWith(item.href + "/");
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <SidebarNavItem
                    icon={Icon}
                    label={item.label}
                    isActive={isActive}
                    collapsed={collapsed}
                    dark={dark}
                  />
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User footer */}
      {user && (
        <div
          className="p-3 shrink-0"
          style={{ borderTop: `1px solid ${border}` }}
        >
          {collapsed ? (
            <div
              className="w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center mx-auto"
              style={{ background: "rgba(240,131,1,0.15)", color: "#F08301" }}
              title={user.fullName}
            >
              {user.fullName.substring(0, 2).toUpperCase()}
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0"
                style={{ background: "rgba(240,131,1,0.15)", color: "#F08301" }}
              >
                {user.fullName.substring(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold truncate" style={{ color: footerNameColor }}>{user.fullName}</div>
                <div className="text-[10px] truncate" style={{ color: footerEmailColor }}>{user.email}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

function SidebarNavItem({
  icon: Icon, label, isActive, collapsed, dark,
}: { icon: LucideIcon; label: string; isActive: boolean; collapsed: boolean; dark: boolean }) {

  const activeBg      = dark ? "rgba(255,255,255,0.10)" : "rgba(240,131,1,0.10)";
  const activeText    = dark ? "#ffffff"                : "#c26a00";
  const inactiveText  = dark ? "#94a3b8"                : "#6B7280";
  const hoverBg       = dark ? "rgba(255,255,255,0.06)" : "rgba(240,131,1,0.06)";
  const hoverText     = dark ? "#e2e8f0"                : "#374151";
  const activeIcon    = "#F08301";
  const inactiveIcon  = dark ? undefined                : "#9CA3AF";

  return (
    <div
      title={collapsed ? label : undefined}
      className="flex items-center gap-2.5 mx-2 px-2.5 py-2 rounded-lg text-sm cursor-pointer transition-all duration-150 select-none"
      style={{
        background: isActive ? activeBg : "transparent",
        color: isActive ? activeText : inactiveText,
        fontWeight: isActive ? 600 : 500,
        justifyContent: collapsed ? "center" : undefined,
      }}
      onMouseEnter={e => {
        if (!isActive) {
          (e.currentTarget as HTMLDivElement).style.background = hoverBg;
          (e.currentTarget as HTMLDivElement).style.color = hoverText;
        }
      }}
      onMouseLeave={e => {
        if (!isActive) {
          (e.currentTarget as HTMLDivElement).style.background = "transparent";
          (e.currentTarget as HTMLDivElement).style.color = inactiveText;
        }
      }}
    >
      <Icon
        className="shrink-0 transition-colors"
        size={16}
        strokeWidth={isActive ? 2.2 : 1.8}
        style={{ color: isActive ? activeIcon : inactiveIcon }}
      />
      {!collapsed && <span className="truncate">{label}</span>}
    </div>
  );
}
