import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard, Users, FileText, Package, Wallet,
  FolderOpen, User, LogOut,
  Menu, ChevronLeft, ChevronRight, ChevronDown, Globe,
  MessageCircle,
  LucideIcon,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ── Types ─────────────────────────────────────────────────────────────────
type NavItem = { icon: LucideIcon; label: string; href: string };

// ── Nav builders (flat, English) ──────────────────────────────────────────
function buildAgentNav(): NavItem[] {
  return [
    { icon: LayoutDashboard, label: "Dashboard",          href: "/dashboard"      },
    { icon: Users,           label: "Consultations",      href: "/consultations"  },
    { icon: FileText,        label: "Quotes & Contracts", href: "/quotes"         },
    { icon: Package,         label: "Services",           href: "/services"       },
    { icon: Wallet,          label: "Finance",            href: "/finance"        },
    { icon: FolderOpen,      label: "Documents",          href: "/documents"      },
    { icon: MessageCircle,   label: "Community",          href: "/community"      },
    { icon: User,            label: "My Profile",         href: "/profile"        },
  ];
}

function buildPartnerNav(): NavItem[] {
  return [
    { icon: LayoutDashboard, label: "Dashboard",          href: "/partner/dashboard"      },
    { icon: Users,           label: "Consultations",      href: "/partner/consultations"  },
    { icon: FileText,        label: "Quotes & Contracts", href: "/partner/quotes"         },
    { icon: Package,         label: "Services",           href: "/partner/services"       },
    { icon: Wallet,          label: "Finance",            href: "/partner/finance"        },
    { icon: FolderOpen,      label: "Documents",          href: "/partner/documents"      },
    { icon: MessageCircle,   label: "Community",          href: "/community"              },
    { icon: User,            label: "My Profile",         href: "/partner/profile"        },
  ];
}

function buildStudentNav(): NavItem[] {
  return [
    { icon: LayoutDashboard, label: "Dashboard",          href: "/student/dashboard"      },
    { icon: Users,           label: "Consultations",      href: "/student/consultations"  },
    { icon: FileText,        label: "Quotes & Contracts", href: "/student/quotes"         },
    { icon: Package,         label: "Services",           href: "/student/services"       },
    { icon: Wallet,          label: "Finance",            href: "/student/finance"        },
    { icon: FolderOpen,      label: "Documents",          href: "/student/documents"      },
    { icon: MessageCircle,   label: "Community",          href: "/community"              },
    { icon: User,            label: "My Profile",         href: "/student/profile"        },
  ];
}

const PARTNER_ROLES = ["hotel", "pickup", "institute", "tour"];

function getNavForRole(role: string | null | undefined): NavItem[] {
  if (role === "student") return buildStudentNav();
  if (role && PARTNER_ROLES.includes(role)) return buildPartnerNav();
  return buildAgentNav();
}

// ── Page titles ───────────────────────────────────────────────────────────
const PAGE_TITLES: Record<string, string> = {
  "/dashboard":               "Dashboard",
  "/consultations":           "Consultations",
  "/quotes":                  "Quotes & Contracts",
  "/services":                "Services",
  "/finance":                 "Finance",
  "/documents":               "Documents",
  "/profile":                 "My Profile",
  "/community":               "Community",
  "/partner/dashboard":       "Dashboard",
  "/partner/consultations":   "Consultations",
  "/partner/quotes":          "Quotes & Contracts",
  "/partner/services":        "Services",
  "/partner/finance":         "Finance",
  "/partner/documents":       "Documents",
  "/partner/profile":         "My Profile",
  "/student/dashboard":       "Dashboard",
  "/student/consultations":   "Consultations",
  "/student/quotes":          "Quotes & Contracts",
  "/student/services":        "Services",
  "/student/finance":         "Finance",
  "/student/documents":       "Documents",
  "/student/profile":         "My Profile",
};

// ── Language ──────────────────────────────────────────────────────────────
const LANGUAGES = [
  { code: "en", label: "English",  flag: "🇦🇺" },
  { code: "ko", label: "한국어",    flag: "🇰🇷" },
  { code: "ja", label: "日本語",    flag: "🇯🇵" },
  { code: "zh", label: "中文",      flag: "🇨🇳" },
  { code: "th", label: "ภาษาไทย",   flag: "🇹🇭" },
];

function useLang() {
  const [lang, setLangState] = useState(() => {
    try { return localStorage.getItem("portal_lang") ?? "en"; } catch { return "en"; }
  });
  const setLang = (code: string) => {
    try { localStorage.setItem("portal_lang", code); } catch {}
    setLangState(code);
  };
  return { lang, setLang };
}

// ── Helpers ───────────────────────────────────────────────────────────────
const SIDEBAR_KEY = "portal_sidebar_collapsed";

function readCollapsedSidebar(): boolean {
  try { return localStorage.getItem(SIDEBAR_KEY) === "1"; } catch { return false; }
}
function saveCollapsedSidebar(v: boolean) {
  try { localStorage.setItem(SIDEBAR_KEY, v ? "1" : "0"); } catch {}
}
function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" ? window.matchMedia(query).matches : false
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const h = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, [query]);
  return matches;
}

// ── NavRow (expanded) ─────────────────────────────────────────────────────
function NavRow({ item, location, onNavClick }: {
  item: NavItem; location: string; onNavClick?: () => void;
}) {
  const [hov, setHov] = useState(false);
  const Icon = item.icon;
  const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href + "/"));
  return (
    <Link href={item.href} onClick={onNavClick}>
      <div
        className="flex items-center gap-2.5 px-3 h-9 mx-1 rounded-lg text-[13px] cursor-pointer transition-all duration-150 select-none"
        style={{
          background: isActive || hov ? "var(--e-orange-lt)" : "transparent",
          color:      isActive ? "var(--e-orange)" : hov ? "var(--e-orange-dk)" : "var(--e-text-2)",
          fontWeight: isActive ? 600 : 450,
        }}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
      >
        <Icon
          size={15}
          strokeWidth={isActive || hov ? 2.2 : 1.8}
          style={{ color: isActive || hov ? "var(--e-orange)" : "var(--e-text-3)", flexShrink: 0 }}
        />
        <span className="truncate">{item.label}</span>
      </div>
    </Link>
  );
}

// ── CollapsedNavItem (icon-only with tooltip) ─────────────────────────────
function CollapsedNavItem({ item, location, onNavClick }: {
  item: NavItem; location: string; onNavClick?: () => void;
}) {
  const [hov, setHov] = useState(false);
  const Icon = item.icon;
  const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href + "/"));
  return (
    <Link href={item.href} onClick={onNavClick}>
      <div
        className="relative w-10 h-9 mx-auto flex items-center justify-center rounded-lg transition-all duration-150 cursor-pointer group"
        style={{ background: isActive || hov ? "var(--e-orange-lt)" : "transparent" }}
        title={item.label}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
      >
        <Icon
          size={16}
          strokeWidth={isActive || hov ? 2.2 : 1.8}
          style={{ color: isActive || hov ? "var(--e-orange)" : "var(--e-text-3)" }}
        />
        {/* Tooltip */}
        <div
          className="pointer-events-none absolute left-[52px] top-1/2 -translate-y-1/2 z-50
            px-2 py-1 rounded-md text-[11px] font-medium whitespace-nowrap opacity-0
            group-hover:opacity-100 transition-opacity duration-100"
          style={{
            background: "var(--e-text-1)",
            color: "var(--e-bg-surface)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}
        >
          {item.label}
        </div>
      </div>
    </Link>
  );
}

// ── AppSidebar ────────────────────────────────────────────────────────────
function AppSidebar({ collapsed, onToggle, onNavClick }: {
  collapsed: boolean; onToggle: () => void; onNavClick?: () => void;
}) {
  const [location] = useLocation();
  const { user } = useAuth();
  const navItems = getNavForRole(user?.portalRole);

  return (
    <aside
      className="flex flex-col shrink-0 h-full overflow-hidden transition-all duration-200"
      style={{
        width: collapsed ? 64 : 240,
        background: "var(--e-bg-sidebar)",
        borderRight: "1px solid var(--e-border)",
      }}
    >
      {/* Logo + toggle */}
      <div
        className="flex items-center h-14 shrink-0 px-3 gap-2"
        style={{ borderBottom: "1px solid var(--e-border)" }}
      >
        {collapsed ? (
          <div className="flex-1 flex items-center justify-center">
            <Link href="/">
              <img
                src={`${import.meta.env.BASE_URL}edubee-logo.png`}
                alt="Edubee"
                className="h-7 w-7 object-contain rounded"
              />
            </Link>
          </div>
        ) : (
          <Link href="/" className="flex-1 min-w-0 flex items-center">
            <img
              src={`${import.meta.env.BASE_URL}edubee-logo.png`}
              alt="Edubee"
              className="h-[34px] w-auto object-contain max-w-[160px]"
            />
          </Link>
        )}
        <button
          onClick={onToggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0"
          style={{ color: "var(--e-text-3)" }}
          onMouseEnter={e => (e.currentTarget.style.background = "var(--e-bg-muted)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav — true flat list */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {collapsed ? (
          /* Collapsed: icon-only + tooltip */
          <div className="flex flex-col items-center gap-0.5 py-1">
            {navItems.map(item => (
              <CollapsedNavItem
                key={item.href}
                item={item}
                location={location}
                onNavClick={onNavClick}
              />
            ))}
          </div>
        ) : (
          /* Expanded: flat list */
          <div className="flex flex-col gap-0.5 py-1">
            {navItems.map(item => (
              <NavRow
                key={item.href}
                item={item}
                location={location}
                onNavClick={onNavClick}
              />
            ))}
          </div>
        )}
      </nav>

      {/* Bottom: user info (expanded only) */}
      {!collapsed && user && (
        <div className="px-3 py-3 shrink-0" style={{ borderTop: "1px solid var(--e-border)" }}>
          <div
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg"
            style={{ background: "var(--e-bg-muted)" }}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
              style={{ background: "var(--e-orange-lt)", color: "var(--e-orange)" }}
            >
              {initials(user.accountName ?? "A")}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold truncate" style={{ color: "var(--e-text-1)" }}>
                {user.accountName}
              </p>
              <p className="text-[10px] truncate capitalize" style={{ color: "var(--e-text-3)" }}>
                {user.portalRole ?? "Portal User"}
              </p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

// ── PortalHeader ──────────────────────────────────────────────────────────
function PortalHeader({ onToggle }: { onToggle: () => void }) {
  const [location, navigate] = useLocation();
  const { user, logout } = useAuth();
  const { lang, setLang } = useLang();

  const pageTitle = PAGE_TITLES[location]
    ?? Object.entries(PAGE_TITLES).find(([k]) => k !== "/" && location.startsWith(k + "/"))?.[1]
    ?? "Portal";

  const currentLang = LANGUAGES.find(l => l.code === lang) ?? LANGUAGES[0];

  return (
    <header
      className="h-14 flex items-center justify-between px-4 shrink-0 z-20"
      style={{ background: "var(--e-bg-topbar)", borderBottom: "1px solid var(--e-border)" }}
    >
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggle}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{ color: "var(--e-text-2)" }}
          onMouseEnter={e => (e.currentTarget.style.background = "var(--e-bg-muted)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          <Menu className="w-4 h-4" />
        </button>
        <h1 className="font-semibold text-[17px] leading-none" style={{ color: "var(--e-text-1)" }}>
          {pageTitle}
        </h1>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1">
        {/* Language */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="h-8 px-2 rounded-lg flex items-center gap-1.5 transition-colors"
              style={{ color: "var(--e-text-2)" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--e-bg-muted)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <Globe className="w-3.5 h-3.5 opacity-50" />
              <span className="text-[15px] leading-none">{currentLang.flag}</span>
              <span className="hidden sm:inline text-[12px] font-medium">{currentLang.label}</span>
              <ChevronDown className="w-3 h-3 opacity-40" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 p-1">
            {LANGUAGES.map(l => (
              <DropdownMenuItem
                key={l.code}
                onClick={() => setLang(l.code)}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-md cursor-pointer text-sm"
                style={l.code === lang ? {
                  background: "var(--e-orange-lt)",
                  color: "var(--e-orange)",
                  fontWeight: 600,
                } : {}}
              >
                <span className="text-base">{l.flag}</span>
                <span>{l.label}</span>
                {l.code === lang && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: "var(--e-orange)" }} />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Profile */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-2 h-8 pl-1.5 pr-2.5 rounded-lg transition-colors ml-1"
                style={{ color: "var(--e-text-2)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--e-bg-muted)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={{ background: "var(--e-orange-lt)", color: "var(--e-orange)" }}
                >
                  {initials(user.accountName ?? "A")}
                </div>
                <span
                  className="hidden sm:block text-[12px] font-medium max-w-[120px] truncate"
                  style={{ color: "var(--e-text-1)" }}
                >
                  {user.accountName}
                </span>
                <ChevronDown className="w-3 h-3 opacity-40 hidden sm:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-2">
              <div className="px-2 pb-2 mb-1 border-b" style={{ borderColor: "var(--e-border)" }}>
                <p className="text-sm font-semibold truncate" style={{ color: "var(--e-text-1)" }}>
                  {user.accountName}
                </p>
                <p className="text-xs truncate" style={{ color: "var(--e-text-3)" }}>{user.email}</p>
                {user.portalRole && (
                  <span
                    className="inline-flex mt-1 items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide capitalize"
                    style={{ background: "var(--e-orange-lt)", color: "var(--e-orange)" }}
                  >
                    {user.portalRole}
                  </span>
                )}
              </div>

              <DropdownMenuItem
                onClick={() => {
                  const href =
                    user.portalRole === "student" ? "/student/profile" :
                    PARTNER_ROLES.includes(user.portalRole ?? "") ? "/partner/profile" :
                    "/profile";
                  navigate(href);
                }}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm"
                style={{ color: "var(--e-text-2)" }}
              >
                <User className="w-3.5 h-3.5" style={{ color: "var(--e-text-3)" }} />
                My Profile
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={logout}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm text-red-600"
              >
                <LogOut className="w-3.5 h-3.5" />
                Log Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}

// ── PortalLayout ──────────────────────────────────────────────────────────
export function PortalLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const isTablet = useMediaQuery("(max-width: 1023px)");

  const [collapsed, setCollapsed] = useState(readCollapsedSidebar);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (isMobile) setMobileOpen(false);
    else if (isTablet) setCollapsed(true);
  }, [isMobile, isTablet]);

  const toggleSidebar = () => {
    if (isMobile) {
      setMobileOpen(o => !o);
    } else {
      setCollapsed(c => {
        const next = !c;
        saveCollapsedSidebar(next);
        return next;
      });
    }
  };

  const sidebarCollapsed = isMobile ? false : collapsed;

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ background: "var(--e-bg-page)" }}>
      {/* Mobile overlay */}
      {isMobile && mobileOpen && (
        <div className="fixed inset-0 bg-black/40 z-30" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={isMobile
        ? `fixed inset-y-0 left-0 z-40 transition-transform duration-200 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`
        : ""
      }>
        <AppSidebar
          collapsed={sidebarCollapsed}
          onToggle={toggleSidebar}
          onNavClick={isMobile ? () => setMobileOpen(false) : undefined}
        />
      </div>

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <PortalHeader onToggle={toggleSidebar} />
        <main
          className="flex-1 overflow-y-auto p-4 pb-20 md:p-6 lg:p-8"
          style={{ background: "var(--e-bg-page)" }}
        >
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
