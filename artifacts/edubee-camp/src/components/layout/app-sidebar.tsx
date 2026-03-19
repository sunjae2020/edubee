import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useViewAs, ROLE_HIERARCHY } from "@/hooks/use-view-as";
import logoImg from "@assets/edubee_logo_800x310b_1773796715563.png";
import {
  ChevronLeft, ChevronRight,
  LayoutDashboard, Layers, Package, ShoppingBag, ListChecks,
  Target, ClipboardList, FileText,
  GraduationCap, Building2, Car, Map, CalendarCheck, Banknote,
  Receipt, Building, Handshake, FileCheck, ArrowLeftRight, RefreshCw,
  Wallet, BarChart2, BarChart3,
  Users, Settings, Lock, Grid2x2, FileSearch, UserSearch,
  Ticket,
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
        { icon: ListChecks, label: "Enrollment Spots", href: "/admin/enrollment-spots" },
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

  if (isSAorAD || isCC || isPartner || isEA || isParent) {
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
    serviceItems.push({ icon: Ticket, label: "Tasks / CS", href: "/admin/services/tasks" });
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

  return (
    <aside
      className="flex flex-col shrink-0 h-full overflow-hidden transition-all duration-200"
      style={{
        width: collapsed ? 64 : 240,
        background: "#FAFAF9",
        borderRight: "1px solid #E8E6E2",
      }}
    >
      {/* Logo header — matches top nav 56px height */}
      <div
        className="flex items-center h-14 shrink-0 px-3 gap-2"
        style={{ borderBottom: "1px solid #E8E6E2" }}
      >
        {!collapsed && (
          <Link href="/" className="flex-1 min-w-0 flex items-center">
            <img
              src={logoImg}
              alt="Edubee Camp"
              className="h-[39px] w-auto object-contain"
            />
          </Link>
        )}
        <button
          onClick={onToggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0 text-[#A8A29E] hover:bg-[#F4F3F1] hover:text-[#57534E]"
          style={{ marginLeft: collapsed ? "auto" : undefined, marginRight: collapsed ? "auto" : undefined }}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {nav.map((group) => (
          <div key={group.label} className="mb-1">
            {!collapsed && (
              <div
                className="px-2 pt-3 pb-1 text-[11px] font-medium uppercase tracking-[0.08em] select-none"
                style={{ color: "#A8A29E" }}
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
          style={{ borderTop: "1px solid #E8E6E2" }}
        >
          {collapsed ? (
            <div
              className="w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center mx-auto"
              style={{ background: "#FEF0E3", color: "#F5821F" }}
              title={user.fullName}
            >
              {user.fullName.substring(0, 2).toUpperCase()}
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0"
                style={{ background: "#FEF0E3", color: "#F5821F" }}
              >
                {user.fullName.substring(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold truncate" style={{ color: "#1C1917" }}>{user.fullName}</div>
                <div className="text-[10px] truncate" style={{ color: "#A8A29E" }}>{user.email}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

function SidebarNavItem({
  icon: Icon, label, isActive, collapsed,
}: { icon: LucideIcon; label: string; isActive: boolean; collapsed: boolean }) {
  return (
    <div
      title={collapsed ? label : undefined}
      className="flex items-center gap-2.5 px-2 h-10 rounded-lg text-sm cursor-pointer transition-all duration-150 select-none group/item"
      style={{
        background: isActive ? "#FEF0E3" : "transparent",
        color: isActive ? "#F5821F" : "#57534E",
        fontWeight: isActive ? 600 : 400,
        justifyContent: collapsed ? "center" : undefined,
      }}
      onMouseEnter={e => {
        if (!isActive) {
          (e.currentTarget as HTMLDivElement).style.background = "#F4F3F1";
          (e.currentTarget as HTMLDivElement).style.color = "#1C1917";
        }
      }}
      onMouseLeave={e => {
        if (!isActive) {
          (e.currentTarget as HTMLDivElement).style.background = "transparent";
          (e.currentTarget as HTMLDivElement).style.color = "#57534E";
        }
      }}
    >
      <Icon
        className="shrink-0"
        size={16}
        strokeWidth={isActive ? 2.2 : 1.8}
        style={{ color: isActive ? "#F5821F" : "#A8A29E" }}
      />
      {!collapsed && <span className="truncate">{label}</span>}
    </div>
  );
}
