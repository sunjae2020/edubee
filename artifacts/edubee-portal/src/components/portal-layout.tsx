import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard, Users, DollarSign, User, LogOut,
  Menu, ChevronLeft, ChevronRight, ChevronDown,
  CalendarRange, BookOpen, FileText, Wallet,
  GraduationCap, Building2, Globe,
  LucideIcon,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// ── Types ─────────────────────────────────────────────────────────────────
type NavItem  = { icon: LucideIcon; label: string; href: string };
type NavGroup = { key: string; label: string; catIcon: LucideIcon; items: NavItem[] };

// ── Nav builders ──────────────────────────────────────────────────────────
function buildAgentNav(): NavGroup[] {
  return [
    {
      key: "dashboard", label: "Dashboard", catIcon: LayoutDashboard,
      items: [{ icon: LayoutDashboard, label: "대시보드", href: "/dashboard" }],
    },
    {
      key: "my", label: "내 정보", catIcon: Users,
      items: [
        { icon: Users,     label: "내 학생 / 상담신청서", href: "/students"    },
      ],
    },
    {
      key: "finance", label: "파이낸스", catIcon: Wallet,
      items: [
        { icon: DollarSign, label: "수수료 / 정산", href: "/commissions" },
      ],
    },
    {
      key: "account", label: "계정", catIcon: User,
      items: [{ icon: User, label: "내 프로필", href: "/profile" }],
    },
  ];
}

function buildPartnerNav(): NavGroup[] {
  return [
    {
      key: "dashboard", label: "Dashboard", catIcon: LayoutDashboard,
      items: [{ icon: LayoutDashboard, label: "대시보드", href: "/partner/dashboard" }],
    },
    {
      key: "my", label: "내 예약", catIcon: CalendarRange,
      items: [
        { icon: CalendarRange, label: "예약 내역", href: "/partner/bookings" },
      ],
    },
    {
      key: "account", label: "계정", catIcon: User,
      items: [{ icon: User, label: "내 프로필", href: "/partner/profile" }],
    },
  ];
}

function buildStudentNav(): NavGroup[] {
  return [
    {
      key: "dashboard", label: "Dashboard", catIcon: LayoutDashboard,
      items: [{ icon: LayoutDashboard, label: "대시보드", href: "/student/dashboard" }],
    },
    {
      key: "my", label: "내 정보", catIcon: GraduationCap,
      items: [
        { icon: FileText, label: "내 견적", href: "/student/quotes" },
        { icon: BookOpen, label: "내 프로그램", href: "/student/programs" },
      ],
    },
    {
      key: "account", label: "계정", catIcon: User,
      items: [{ icon: User, label: "내 프로필", href: "/student/profile" }],
    },
  ];
}

const PARTNER_ROLES = ["hotel", "pickup", "institute", "tour"];

function getNavForRole(role: string | null | undefined): NavGroup[] {
  if (!role) return buildAgentNav();
  if (PARTNER_ROLES.includes(role)) return buildPartnerNav();
  if (role === "student") return buildStudentNav();
  return buildAgentNav();
}

// ── Page titles ───────────────────────────────────────────────────────────
const PAGE_TITLES: Record<string, string> = {
  "/dashboard":          "대시보드",
  "/students":           "내 학생 / 상담신청서",
  "/commissions":        "수수료 · 정산",
  "/profile":            "내 프로필",
  "/partner/dashboard":  "파트너 대시보드",
  "/partner/bookings":   "예약 내역",
  "/partner/profile":    "내 프로필",
  "/student/dashboard":  "학생 대시보드",
  "/student/quotes":     "내 견적",
  "/student/programs":   "내 프로그램",
  "/student/profile":    "내 프로필",
};

// ── Language ──────────────────────────────────────────────────────────────
const LANGUAGES = [
  { code: "ko", label: "한국어",  flag: "🇰🇷" },
  { code: "en", label: "English", flag: "🇦🇺" },
  { code: "ja", label: "日本語",  flag: "🇯🇵" },
  { code: "zh", label: "中文",    flag: "🇨🇳" },
  { code: "th", label: "ภาษาไทย", flag: "🇹🇭" },
];

function useLang() {
  const [lang, setLangState] = useState(() => {
    try { return localStorage.getItem("portal_lang") ?? "ko"; } catch { return "ko"; }
  });
  const setLang = (code: string) => {
    try { localStorage.setItem("portal_lang", code); } catch {}
    setLangState(code);
  };
  return { lang, setLang };
}

// ── Helpers ───────────────────────────────────────────────────────────────
const SIDEBAR_KEY = "portal_sidebar_collapsed";
const NAV_OPEN_KEY = "portal_nav_open_groups";

function readCollapsedSidebar(): boolean {
  try { return localStorage.getItem(SIDEBAR_KEY) === "1"; } catch { return false; }
}
function saveCollapsedSidebar(v: boolean) {
  try { localStorage.setItem(SIDEBAR_KEY, v ? "1" : "0"); } catch {}
}
function readOpenGroups(): Set<string> {
  try {
    const raw = localStorage.getItem(NAV_OPEN_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set(["dashboard", "my"]);
  } catch { return new Set(["dashboard", "my"]); }
}
function saveOpenGroups(keys: Set<string>) {
  try { localStorage.setItem(NAV_OPEN_KEY, JSON.stringify([...keys])); } catch {}
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

// ── CategoryHeader ────────────────────────────────────────────────────────
function CategoryHeader({ group, hasActive, open, onToggle }: {
  group: NavGroup; hasActive: boolean; open: boolean; onToggle: () => void;
}) {
  const [hov, setHov] = useState(false);
  const CatIcon = group.catIcon;
  return (
    <button
      onClick={onToggle}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="w-full flex items-center gap-1.5 px-2 pt-3 pb-1.5 rounded-md transition-all duration-150"
      style={{ background: hov && !hasActive ? "var(--e-orange-lt)" : "transparent" }}
    >
      <CatIcon
        size={13}
        strokeWidth={hasActive || hov ? 2.2 : 1.8}
        style={{ color: hasActive || hov ? "var(--e-orange)" : "var(--e-text-3)", flexShrink: 0 }}
      />
      <span
        className="flex-1 text-left text-[11px] font-semibold uppercase tracking-[0.08em] truncate"
        style={{ color: hasActive ? "var(--e-orange)" : hov ? "var(--e-orange-dk)" : "var(--e-text-3)" }}
      >
        {group.label}
      </span>
      <ChevronDown
        size={11}
        strokeWidth={1.8}
        style={{
          color: hov ? "var(--e-orange)" : "var(--e-text-3)",
          flexShrink: 0,
          transform: open ? "rotate(0deg)" : "rotate(-90deg)",
          transition: "transform 150ms ease",
        }}
      />
    </button>
  );
}

// ── NavRow ────────────────────────────────────────────────────────────────
function NavRow({ item, location, onNavClick }: {
  item: NavItem; location: string; onNavClick?: () => void;
}) {
  const [hov, setHov] = useState(false);
  const Icon = item.icon;
  const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href + "/"));
  return (
    <Link href={item.href} onClick={onNavClick}>
      <div
        className="flex items-center gap-2.5 px-3 h-9 mx-1 rounded-lg text-[12px] cursor-pointer transition-all duration-150 select-none font-medium"
        style={{
          background: isActive ? "var(--e-orange-lt)" : hov ? "var(--e-orange-lt)" : "transparent",
          color: isActive ? "var(--e-orange)" : hov ? "var(--e-orange-dk)" : "var(--e-text-2)",
          fontWeight: isActive ? 600 : undefined,
        }}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
      >
        <Icon
          size={14}
          strokeWidth={isActive || hov ? 2.2 : 1.8}
          style={{ color: isActive || hov ? "var(--e-orange)" : "var(--e-text-3)", flexShrink: 0 }}
        />
        <span className="truncate">{item.label}</span>
      </div>
    </Link>
  );
}

// ── CollapsedIconItem ─────────────────────────────────────────────────────
function CollapsedIconItem({ item, location, onNavClick }: {
  item: NavItem; location: string; onNavClick?: () => void;
}) {
  const [hov, setHov] = useState(false);
  const Icon = item.icon;
  const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href + "/"));
  return (
    <Link href={item.href} onClick={onNavClick}>
      <div
        className="w-10 h-9 flex items-center justify-center rounded-lg transition-all duration-150 cursor-pointer"
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
      </div>
    </Link>
  );
}

// ── FlyoutItem ────────────────────────────────────────────────────────────
function FlyoutItem({ item, location, onClose }: {
  item: NavItem; location: string; onClose: () => void;
}) {
  const [hov, setHov] = useState(false);
  const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href + "/"));
  const Icon = item.icon;
  return (
    <Link href={item.href} onClick={onClose}>
      <div
        className="flex items-center gap-2.5 px-3 h-9 mx-1 rounded-lg text-[12px] cursor-pointer transition-all duration-150 select-none font-medium"
        style={{
          background: isActive || hov ? "var(--e-orange-lt)" : "transparent",
          color: isActive ? "var(--e-orange)" : hov ? "var(--e-orange-dk)" : "var(--e-text-2)",
          fontWeight: isActive ? 600 : undefined,
        }}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
      >
        <Icon
          size={14}
          strokeWidth={isActive || hov ? 2.2 : 1.8}
          style={{ color: isActive || hov ? "var(--e-orange)" : "var(--e-text-3)", flexShrink: 0 }}
        />
        <span className="truncate">{item.label}</span>
      </div>
    </Link>
  );
}

// ── CollapsedGroupFlyout ──────────────────────────────────────────────────
function CollapsedGroupFlyout({ group, location, onNavClick }: {
  group: NavGroup; location: string; onNavClick?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [flyoutTop, setFlyoutTop] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef  = useRef<HTMLDivElement>(null);
  const hasActive = group.items.some(
    i => location === i.href || (i.href !== "/" && location.startsWith(i.href + "/"))
  );

  const show = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (wrapRef.current) {
      const rect = wrapRef.current.getBoundingClientRect();
      setFlyoutTop(rect.top);
    }
    setOpen(true);
  };
  const hide = () => { timerRef.current = setTimeout(() => setOpen(false), 120); };

  return (
    <div ref={wrapRef} className="mb-0.5" onMouseEnter={show} onMouseLeave={hide}>
      <div className="flex flex-col items-center gap-0.5 py-1">
        {group.items.map(item => (
          <CollapsedIconItem
            key={item.href}
            item={item}
            location={location}
            onNavClick={onNavClick}
          />
        ))}
      </div>

      {open && (
        <div
          className="z-50 min-w-[190px] rounded-xl py-2"
          style={{
            position: "fixed",
            left: 64,
            top: flyoutTop,
            background: "var(--e-bg-sidebar)",
            border: "1px solid var(--e-border)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          }}
          onMouseEnter={show}
          onMouseLeave={hide}
        >
          <div
            className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.08em]"
            style={{ color: hasActive ? "var(--e-orange)" : "var(--e-text-3)" }}
          >
            {group.label}
          </div>
          {group.items.map(item => (
            <FlyoutItem
              key={item.href}
              item={item}
              location={location}
              onClose={() => { setOpen(false); onNavClick?.(); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── AppSidebar ────────────────────────────────────────────────────────────
function AppSidebar({ collapsed, onToggle, onNavClick }: {
  collapsed: boolean; onToggle: () => void; onNavClick?: () => void;
}) {
  const [location] = useLocation();
  const { user } = useAuth();
  const navGroups = getNavForRole(user?.portalRole);

  const [openGroups, setOpenGroups] = useState<Set<string>>(readOpenGroups);

  const isGroupOpen = (group: NavGroup): boolean => {
    if (collapsed) return true;
    const hasActive = group.items.some(
      i => location === i.href || location.startsWith(i.href + "/")
    );
    if (hasActive) return true;
    return openGroups.has(group.key);
  };

  const toggleGroup = (key: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      saveOpenGroups(next);
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
      }}
    >
      {/* Logo header */}
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

      {/* Nav */}
      <nav
        className="flex-1 overflow-y-auto py-3 px-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {collapsed ? (
          navGroups.map(group => (
            <CollapsedGroupFlyout
              key={group.key}
              group={group}
              location={location}
              onNavClick={onNavClick}
            />
          ))
        ) : (
          navGroups.map(group => {
            const hasActive = group.items.some(
              i => location === i.href || location.startsWith(i.href + "/")
            );
            const open = isGroupOpen(group);
            return (
              <div key={group.key} className="mb-0.5">
                <CategoryHeader
                  group={group}
                  hasActive={hasActive}
                  open={open}
                  onToggle={() => toggleGroup(group.key)}
                />
                {open && (
                  <div className="pb-1">
                    {group.items.map(item => (
                      <NavRow
                        key={item.href}
                        item={item}
                        location={location}
                        onNavClick={onNavClick}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </nav>

      {/* Bottom user row — only when not collapsed */}
      {!collapsed && user && (
        <div
          className="px-3 py-3 border-t shrink-0"
          style={{ borderColor: "var(--e-border)" }}
        >
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg"
            style={{ background: "var(--e-bg-muted)" }}>
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
              <p className="text-[10px] truncate" style={{ color: "var(--e-text-3)" }}>
                {user.email ?? user.portalRole}
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
    ?? Object.entries(PAGE_TITLES).find(([k]) => location.startsWith(k + "/"))?.[1]
    ?? "Edubee 포털";

  const currentLang = LANGUAGES.find(l => l.code === lang) ?? LANGUAGES[0];

  return (
    <header
      className="h-14 flex items-center justify-between px-4 shrink-0 z-20"
      style={{ background: "var(--e-bg-topbar)", borderBottom: "1px solid var(--e-border)" }}
    >
      {/* Left: hamburger + page title */}
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
        <h1 className="font-semibold text-[18px] leading-none" style={{ color: "var(--e-text-1)" }}>
          {pageTitle}
        </h1>
      </div>

      {/* Right: language + profile */}
      <div className="flex items-center gap-1.5">
        {/* Language picker */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="h-8 px-2 rounded-lg flex items-center gap-1 transition-colors text-sm font-medium"
              style={{ color: "var(--e-text-2)" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--e-bg-muted)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              title="언어 선택"
            >
              <Globe className="w-3.5 h-3.5 opacity-60" />
              <span className="text-base leading-none">{currentLang.flag}</span>
              <span className="hidden sm:inline text-xs">{currentLang.label}</span>
              <ChevronDown className="w-3 h-3 opacity-50" />
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
                  <span className="ml-auto w-1.5 h-1.5 rounded-full"
                    style={{ background: "var(--e-orange)" }} />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Profile dropdown */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-2 h-8 pl-1.5 pr-2.5 rounded-lg transition-colors"
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
                <span className="hidden sm:block text-xs font-medium max-w-[120px] truncate"
                  style={{ color: "var(--e-text-1)" }}>
                  {user.accountName}
                </span>
                <ChevronDown className="w-3 h-3 opacity-50 hidden sm:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-2">
              {/* User info */}
              <div className="px-2 pb-2 mb-1 border-b" style={{ borderColor: "var(--e-border)" }}>
                <p className="text-sm font-semibold truncate" style={{ color: "var(--e-text-1)" }}>
                  {user.accountName}
                </p>
                <p className="text-xs truncate" style={{ color: "var(--e-text-3)" }}>
                  {user.email}
                </p>
                {user.portalRole && (
                  <span
                    className="inline-flex mt-1 items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide"
                    style={{ background: "var(--e-orange-lt)", color: "var(--e-orange)" }}
                  >
                    {user.portalRole}
                  </span>
                )}
              </div>

              {/* Profile link */}
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
                내 프로필
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Logout */}
              <DropdownMenuItem
                onClick={logout}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm text-red-600"
              >
                <LogOut className="w-3.5 h-3.5" />
                로그아웃
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
    <div
      className="flex h-screen w-full overflow-hidden"
      style={{ background: "var(--e-bg-page)" }}
    >
      {/* Mobile overlay */}
      {isMobile && mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30"
          onClick={() => setMobileOpen(false)}
        />
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

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <PortalHeader onToggle={toggleSidebar} />
        <main
          className="flex-1 overflow-y-auto p-4 pb-20 md:p-6 md:pb-20 lg:p-8 lg:pb-20"
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
