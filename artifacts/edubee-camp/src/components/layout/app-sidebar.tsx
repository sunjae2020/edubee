import React, { useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useViewAs } from "@/hooks/use-view-as";
import logoImg from "@assets/edubee_logo_800x310b_1773796715563.png";
import { EdubeeLogo } from "@/components/shared/EdubeeLogo";
import {
  ChevronLeft, ChevronRight, ChevronDown,
  LayoutDashboard, Layers, Package, ShoppingBag, ListChecks,
  Target, ClipboardList, FileText,
  GraduationCap, Building2, Car, Map,
  Receipt, FileCheck, ArrowLeftRight, RefreshCw,
  Wallet, BarChart2,
  Users, Users2, Settings, Lock, Grid2x2, FileSearch, UserSearch,
  Ticket, FolderOpen, Bot,
  BookOpen, CreditCard, BookMarked, Briefcase, Shield, Wrench, Stamp,
  Tag, Percent, BadgeDollarSign,
  LucideIcon,
} from "lucide-react";
import { ReportSymbol } from "@/components/shared/ReportSymbol";

const ReportNavIcon = ({ size, style }: { size?: number; style?: React.CSSProperties; className?: string; strokeWidth?: number }) => (
  <ReportSymbol name="report" size={size ?? 16} color={(style?.color as string) ?? "var(--e-text-3)"} />
);

type NavItem  = { icon: LucideIcon; label: string; href: string };
type NavGroup = { key: string; label: string; catIcon: LucideIcon; items: NavItem[] };

// ── Build nav ─────────────────────────────────────────────────────────────

function buildNav(effectiveRole: string): NavGroup[] {
  const isSA      = effectiveRole === "super_admin";
  const isSAorAD  = isSA || effectiveRole === "admin";
  const isCC      = effectiveRole === "camp_coordinator";
  const isEA      = effectiveRole === "education_agent";
  const isPartner = effectiveRole.startsWith("partner_");
  const isParent  = effectiveRole === "parent_client";

  const nav: NavGroup[] = [];

  nav.push({
    key: "dashboard", label: "Dashboard", catIcon: LayoutDashboard,
    items: [{ icon: LayoutDashboard, label: "Dashboard", href: "/admin/dashboard" }],
  });

  const crmItems: NavItem[] = [];
  if (isSAorAD || isCC) {
    crmItems.push(
      { icon: Users,     label: "Contacts", href: "/admin/crm/contacts" },
      { icon: Building2, label: "Accounts", href: "/admin/crm/accounts" },
      { icon: Target,    label: "Leads",    href: "/admin/crm/leads"    },
      { icon: FileText,  label: "Quotes",     href: "/admin/crm/quotes"     },
      { icon: FileCheck, label: "Contracts",  href: "/admin/crm/contracts"  },
    );
  }
  crmItems.push({ icon: Ticket, label: "Tasks & CS", href: "/admin/services/tasks" });
  nav.push({ key: "crm", label: "CRM", catIcon: Users, items: crmItems });

  if (isSAorAD || isCC || isEA) {
    const salesItems: NavItem[] = [
      { icon: ClipboardList, label: "All Applications", href: "/admin/all-applications" },
    ];
    if (isSAorAD)
      salesItems.push({ icon: FolderOpen, label: "Documents", href: "/admin/documents" });
    nav.push({ key: "sales", label: "Sales", catIcon: ClipboardList, items: salesItems });
  }

  const campItems: NavItem[] = [];
  if (isSAorAD || isCC) {
    campItems.push(
      { icon: ListChecks, label: "Enrollment Spots", href: "/admin/enrollment-spots" },
    );
  }
  if (campItems.length > 0)
    nav.push({ key: "camp", label: "Camp", catIcon: GraduationCap, items: campItems });

  if (isSAorAD || isCC || effectiveRole === "partner_pickup" || effectiveRole === "partner_tour") {
    const serviceItems: NavItem[] = [];
    if (isSAorAD || isCC) {
      serviceItems.push(
        { icon: GraduationCap, label: "Study Abroad",      href: "/admin/services/study-abroad"  },
        { icon: Building2,     label: "Accommodation",     href: "/admin/services/accommodation"  },
        { icon: Briefcase,     label: "Internship",        href: "/admin/services/internship"     },
        { icon: Shield,        label: "Guardian",          href: "/admin/services/guardian"       },
        { icon: FileCheck,     label: "Settlement",        href: "/admin/services/settlement"     },
        { icon: Wrench,        label: "Other Services",    href: "/admin/services/other"          },
        { icon: Stamp,         label: "Visa Services",     href: "/admin/services/visa"           },
      );
    }
    if (isSAorAD || isCC || effectiveRole === "partner_pickup")
      serviceItems.push({ icon: Car,  label: "Pickup / Transfer", href: "/admin/services/pickup" });
    if (isSAorAD || isCC || effectiveRole === "partner_tour")
      serviceItems.push({ icon: Map,  label: "Tour Management",   href: "/admin/services/tour"   });
    nav.push({ key: "services", label: "Services", catIcon: Briefcase, items: serviceItems });
  }

  if (isSAorAD || isCC) {
    nav.push({
      key: "products-catalog", label: "Products", catIcon: ShoppingBag,
      items: [
        { icon: Layers,          label: "Products Group", href: "/admin/product-groups" },
        { icon: Tag,             label: "Products Type",  href: "/admin/product-types"  },
        { icon: ShoppingBag,     label: "Products",       href: "/admin/products"       },
        { icon: Percent,         label: "Promotion",      href: "/admin/promotions"     },
        { icon: BadgeDollarSign, label: "Commission",     href: "/admin/commissions"    },
        { icon: Package,         label: "Package Groups", href: "/admin/package-groups" },
        { icon: Layers,          label: "Packages",       href: "/admin/packages"       },
      ],
    });
  }

  const financeItems: NavItem[] = [];
  if (isSAorAD) {
    financeItems.push(
      { icon: Receipt,       label: "Invoices",          href: "/admin/accounting/invoices"       },
      { icon: FileCheck,     label: "Receipts",          href: "/admin/accounting/receipts"       },
      { icon: CreditCard,    label: "Payments",          href: "/admin/accounting/payments"       },
      { icon: ArrowLeftRight,label: "Transactions",      href: "/admin/accounting/transactions"   },
      { icon: ArrowLeftRight,label: "AR / AP Tracker",   href: "/admin/accounting/ar-ap"         },
      { icon: BookMarked,    label: "Journal Entries",   href: "/admin/accounting/journal"        },
      { icon: BookOpen,      label: "Chart of Accounts", href: "/admin/accounting/coa"            },
      { icon: RefreshCw,     label: "Exchange Rates",    href: "/admin/accounting/exchange-rates" },
    );
  }
  if (isCC || isEA || isPartner) {
    financeItems.push(
      { icon: Wallet,    label: "My Settlements", href: "/admin/my-accounting/settlements" },
      { icon: FileText,  label: "My Invoices",   href: "/admin/my-accounting/invoices"    },
      { icon: BarChart2, label: "My Revenue",    href: "/admin/my-accounting/revenue"     },
    );
  }
  if (financeItems.length > 0)
    nav.push({ key: "finance", label: "Finance", catIcon: Wallet, items: financeItems });

  if (!isParent) {
    nav.push({
      key: "reports", label: "Reports", catIcon: BarChart2,
      items: [{ icon: ReportNavIcon as unknown as LucideIcon, label: "Program Reports", href: "/admin/reports" }],
    });
  }

  if (isSAorAD) {
    nav.push({
      key: "ai", label: "AI Assistant", catIcon: Bot,
      items: [{ icon: Bot, label: "AI Chatbot", href: "/admin/chatbot" }],
    });
  }

  const adminItems: NavItem[] = [];
  if (isSAorAD)  adminItems.push({ icon: Users,        label: "Users",      href: "/admin/users"       });
  if (isSAorAD)  adminItems.push({ icon: Users2,       label: "Teams",         href: "/admin/teams"          });
  if (isSAorAD)  adminItems.push({ icon: BarChart2,    label: "Staff KPI",     href: "/admin/kpi/staff"      });
  if (isSAorAD)  adminItems.push({ icon: Users2,       label: "Team KPI",      href: "/admin/kpi/team"       });
  if (isSAorAD)  adminItems.push({ icon: Target,       label: "KPI Targets",   href: "/admin/kpi/targets"    });
  if (isParent)  adminItems.push({ icon: GraduationCap, label: "My Programs", href: "/admin/my-programs" });
  if (adminItems.length > 0)
    nav.push({ key: "admin", label: "Admin", catIcon: Grid2x2, items: adminItems });

  if (isSAorAD) {
    nav.push({
      key: "settings", label: "Settings", catIcon: Settings,
      items: [
        { icon: Settings,    label: "General",            href: "/admin/settings/general"            },
        { icon: Lock,        label: "Page Access",        href: "/admin/settings/page-access"        },
        { icon: Grid2x2,     label: "Field Permissions",  href: "/admin/settings/field-permissions"  },
        { icon: FileSearch,  label: "Doc Permissions",    href: "/admin/settings/doc-permissions"    },
        { icon: UserSearch,  label: "Impersonation Logs", href: "/admin/settings/impersonation-logs" },
        { icon: FolderOpen,  label: "Data Manager",       href: "/admin/settings/data-manager"       },
      ],
    });
  }

  return nav;
}

// ── Helpers ───────────────────────────────────────────────────────────────

const STORAGE_KEY = "edubee_sidebar_collapsed";

function readCollapsed(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveCollapsed(keys: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...keys]));
  } catch { /* ignore */ }
}

// ── CategoryHeader ────────────────────────────────────────────────────────

function CategoryHeader({ group, hasActive, open, onToggle }: {
  group: NavGroup; hasActive: boolean; open: boolean; onToggle: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const CatIcon = group.catIcon;
  return (
    <button
      onClick={onToggle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full flex items-center gap-1.5 px-2 pt-3 pb-1.5 rounded-md transition-all duration-150"
      style={{ background: hovered && !hasActive ? "#FFF0E0" : "transparent" }}
    >
      <CatIcon
        size={13}
        strokeWidth={hasActive || hovered ? 2.2 : 1.8}
        style={{
          color: hasActive ? "var(--e-orange)" : hovered ? "#EA580C" : "var(--e-text-3)",
          flexShrink: 0,
        }}
      />
      <span
        className="flex-1 text-left text-[11px] font-semibold uppercase tracking-[0.08em] truncate"
        style={{ color: hasActive ? "var(--e-orange)" : hovered ? "#C2410C" : "var(--e-text-3)" }}
      >
        {group.label}
      </span>
      <ChevronDown
        size={11}
        strokeWidth={1.8}
        style={{
          color: hovered ? "#EA580C" : "var(--e-text-3)",
          flexShrink: 0,
          transform: open ? "rotate(0deg)" : "rotate(-90deg)",
          transition: "transform 150ms ease",
        }}
      />
    </button>
  );
}

// ── CollapsedIconItem & FlyoutItem ───────────────────────────────────────

function CollapsedIconItem({ item, Icon, isActive, onNavClick }: {
  item: NavItem; Icon: LucideIcon; isActive: boolean; onNavClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link href={item.href} onClick={onNavClick}>
      <div
        className="w-10 h-9 flex items-center justify-center rounded-lg transition-all duration-150 cursor-pointer"
        style={{
          background: isActive ? "var(--e-orange-lt)" : hovered ? "#FFF0E0" : "transparent",
        }}
        title={item.label}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <Icon
          size={16}
          strokeWidth={isActive || hovered ? 2.2 : 1.8}
          style={{ color: isActive ? "var(--e-orange)" : hovered ? "#EA580C" : "var(--e-text-3)" }}
        />
      </div>
    </Link>
  );
}

function FlyoutItem({ item, Icon, isActive, onClose }: {
  item: NavItem; Icon: LucideIcon; isActive: boolean; onClose: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link href={item.href} onClick={onClose}>
      <div
        className="flex items-center gap-2.5 px-3 h-9 mx-1 rounded-lg text-[13px] cursor-pointer transition-all duration-150 select-none font-medium"
        style={{
          background: isActive ? "var(--e-orange-lt)" : hovered ? "#FFF0E0" : "transparent",
          color: isActive ? "var(--e-orange)" : hovered ? "#C2410C" : "var(--e-text-2)",
          fontWeight: isActive ? 600 : undefined,
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <Icon
          size={14}
          strokeWidth={isActive || hovered ? 2.2 : 1.8}
          style={{ color: isActive ? "var(--e-orange)" : hovered ? "#EA580C" : "var(--e-text-3)", flexShrink: 0 }}
        />
        <span className="truncate">{item.label}</span>
      </div>
    </Link>
  );
}

// ── CollapsedGroupFlyout ──────────────────────────────────────────────────

function CollapsedGroupFlyout({
  group, location, onNavClick,
}: { group: NavGroup; location: string; onNavClick?: () => void }) {
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasActive = group.items.some(
    item => location === item.href || location.startsWith(item.href + "/")
  );

  const show = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setOpen(true);
  };
  const hide = () => {
    timerRef.current = setTimeout(() => setOpen(false), 120);
  };

  return (
    <div className="relative mb-0.5" onMouseEnter={show} onMouseLeave={hide}>
      {/* Collapsed icon row — one icon per group */}
      <div className="flex flex-col items-center gap-0.5 py-1">
        {group.items.map(item => {
          const isActive = location === item.href || location.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <CollapsedIconItem
              key={item.href}
              item={item}
              Icon={Icon}
              isActive={isActive}
              onNavClick={onNavClick}
            />
          );
        })}
      </div>

      {/* Flyout panel */}
      {open && (
        <div
          className="absolute left-[56px] top-0 z-50 min-w-[190px] rounded-xl py-2"
          style={{
            background: "var(--e-bg-sidebar)",
            border: "1px solid var(--e-border)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          }}
          onMouseEnter={show}
          onMouseLeave={hide}
        >
          {/* Group label */}
          <div
            className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.08em]"
            style={{ color: hasActive ? "var(--e-orange)" : "var(--e-text-3)" }}
          >
            {group.label}
          </div>
          {group.items.map(item => {
            const isActive = location === item.href || location.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <FlyoutItem
                key={item.href}
                item={item}
                Icon={Icon}
                isActive={isActive}
                onClose={() => { setOpen(false); onNavClick?.(); }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── AppSidebar ────────────────────────────────────────────────────────────

type Props = { collapsed: boolean; onToggle: () => void; onNavClick?: () => void };

export function AppSidebar({ collapsed, onToggle, onNavClick }: Props) {
  const [location]                   = useLocation();
  const { user }                     = useAuth();
  const { viewAsUser, isImpersonating } = useViewAs();

  const effectiveRole = viewAsUser?.role ?? user?.role ?? "parent_client";
  const nav           = buildNav(effectiveRole);

  const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(readCollapsed);

  const isGroupOpen = (group: NavGroup): boolean => {
    if (collapsed) return true;
    const hasActive = group.items.some(
      item => location === item.href || location.startsWith(item.href + "/")
    );
    if (hasActive) return true;
    return !collapsedKeys.has(group.key);
  };

  const toggleGroup = (key: string) => {
    setCollapsedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      saveCollapsed(next);
      return next;
    });
  };

  return (
    <aside
      className="flex flex-col shrink-0 h-full overflow-hidden transition-all duration-200"
      style={{
        width: collapsed ? 64 : 240,
        background: "var(--e-bg-sidebar)",
        borderRight: "1px solid var(--e-border)",
        overflow: "visible",
      }}
    >
      {/* Logo header */}
      <div
        className="flex items-center h-14 shrink-0 px-3 gap-2"
        style={{ borderBottom: "1px solid var(--e-border)" }}
      >
        {collapsed ? (
          <div className="flex-1 flex items-center justify-center">
            <Link href="/"><EdubeeLogo variant="icon" size="sm" /></Link>
          </div>
        ) : (
          <Link href="/" className="flex-1 min-w-0 flex items-center">
            <img src={logoImg} alt="Edubee Camp" className="h-[39px] w-auto object-contain" />
          </Link>
        )}
        <button
          onClick={onToggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0
            hover:bg-[#F4F3F1] dark:hover:bg-[#242220]"
          style={{ color: "var(--e-text-3)" }}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav
        className="flex-1 overflow-y-auto py-3 px-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        style={{ overflow: collapsed ? "visible" : undefined }}
      >
        {collapsed ? (
          /* ── Collapsed: flyout per group ── */
          nav.map(group => (
            <CollapsedGroupFlyout
              key={group.key}
              group={group}
              location={location}
              onNavClick={onNavClick}
            />
          ))
        ) : (
          /* ── Expanded: normal accordion ── */
          nav.map(group => {
            const open      = isGroupOpen(group);
            const CatIcon   = group.catIcon;
            const hasActive = group.items.some(
              item => location === item.href || location.startsWith(item.href + "/")
            );

            return (
              <div key={group.key} className="mb-0.5">
                <CategoryHeader
                  group={group}
                  hasActive={hasActive}
                  open={open}
                  onToggle={() => toggleGroup(group.key)}
                />

                {open && group.items.map(item => {
                  const isActive = location === item.href || location.startsWith(item.href + "/");
                  const Icon     = item.icon;
                  return (
                    <Link key={item.href} href={item.href} onClick={onNavClick}>
                      <SidebarNavItem
                        icon={Icon}
                        label={item.label}
                        isActive={isActive}
                        collapsed={false}
                      />
                    </Link>
                  );
                })}
              </div>
            );
          })
        )}
      </nav>

      {/* User footer */}
      {user && (
        <div className="p-3 shrink-0" style={{ borderTop: "1px solid var(--e-border)" }}>
          {collapsed ? (
            <div
              className="w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center mx-auto"
              style={{ background: "var(--e-orange-lt)", color: "var(--e-orange)" }}
              title={user.fullName}
            >
              {user.fullName.substring(0, 2).toUpperCase()}
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0"
                style={{ background: "var(--e-orange-lt)", color: "var(--e-orange)" }}
              >
                {user.fullName.substring(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold truncate" style={{ color: "var(--e-text-1)" }}>{user.fullName}</div>
                <div className="text-[10px] truncate" style={{ color: "var(--e-text-3)" }}>{user.email}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

// ── SidebarNavItem ────────────────────────────────────────────────────────

function SidebarNavItem({
  icon: Icon, label, isActive, collapsed,
}: { icon: LucideIcon; label: string; isActive: boolean; collapsed: boolean }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      title={collapsed ? label : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`
        flex items-center gap-2.5 px-2 h-9 rounded-lg text-[13px] cursor-pointer
        transition-all duration-150 select-none
        ${collapsed ? "justify-center" : "ml-1"}
        ${isActive ? "font-semibold" : "font-medium"}
      `}
      style={{
        background: isActive
          ? "var(--e-orange-lt)"
          : hovered ? "#FFF0E0" : "transparent",
        color: isActive
          ? "var(--e-orange)"
          : hovered ? "#C2410C" : "var(--e-text-2)",
      }}
    >
      <Icon
        className="shrink-0"
        size={15}
        strokeWidth={isActive || hovered ? 2.2 : 1.8}
        style={{
          color: isActive
            ? "var(--e-orange)"
            : hovered ? "#EA580C" : "var(--e-text-3)",
        }}
      />
      {!collapsed && <span className="truncate">{label}</span>}
    </div>
  );
}
