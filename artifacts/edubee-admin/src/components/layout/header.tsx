import { useState, useRef } from "react";
import { formatDateTime } from "@/lib/date-format";
import { useAuth } from "@/hooks/use-auth";
import { useViewAs, ROLE_HIERARCHY, ROLE_LABELS, ROLE_EMOJIS, ROLE_DESCRIPTIONS } from "@/hooks/use-view-as";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Menu, Bell, LogOut, ChevronDown, Eye, RotateCcw, User as UserIcon, Clock, ClipboardList, RefreshCw, CalendarCheck, FileText, AlertTriangle, BarChart3, Receipt, LucideIcon, Layers, Sun, Moon, Search, X, Building2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import axios from "axios";
import { useTranslation } from "react-i18next";

const LANGUAGES = [
  { code: "en", label: "English", flag: "🇦🇺" },
  { code: "ko", label: "한국어",  flag: "🇰🇷" },
  { code: "ja", label: "日本語",  flag: "🇯🇵" },
  { code: "th", label: "ภาษาไทย", flag: "🇹🇭" },
];

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface SwitchableUser {
  id: string; email: string; fullName: string;
  role: string; avatarUrl?: string | null;
}

interface SwitchableAccount {
  id: string;
  name: string;
  accountType: string | null;
  portalAccess: boolean;
  portalRole: string | null;
  portalEmail: string | null;
  primaryContactFirstName: string | null;
  primaryContactLastName: string | null;
  primaryContactOriginalName: string | null;
}

interface Notification {
  id: string; type?: string | null; title?: string | null; message?: string | null;
  isRead?: boolean | null; createdAt?: string | null;
  referenceType?: string | null; referenceId?: string | null;
}

const PAGE_TITLES: Record<string, string> = {
  "/admin/dashboard": "Dashboard",
  "/admin/dashboard/crm": "Dashboard",
  "/admin/package-groups": "Package Groups",
  "/admin/packages": "Packages",
  "/admin/products": "Products",
  "/admin/leads": "Leads",
  "/admin/applications": "Applications",
  "/admin/crm/contracts": "Contracts",
  "/admin/services/institute": "Institute Management",
  "/admin/services/hotel": "Hotel Management",
  "/admin/services/pickup": "Pickup Management",
  "/admin/services/tour": "Tour Management",
  "/admin/services/interviews": "Interviews",
  "/admin/services/settlement": "Settlement",
  "/admin/accounting/client-invoices": "Client Invoices",
  "/admin/accounting/agent-invoices": "Agent Invoices",
  "/admin/accounting/partner-invoices": "Partner Invoices",
  "/admin/accounting/receipts": "Receipts",
  "/admin/accounting/transactions": "Transactions",
  "/admin/accounting/exchange-rates": "Exchange Rates",
  "/admin/my-accounting/settlements": "My Settlements",
  "/admin/my-accounting/invoices": "My Invoices",
  "/admin/my-accounting/revenue": "My Revenue",
  "/admin/reports": "Program Reports",
  "/admin/documents": "Documents",
  "/admin/users": "Users",
  "/admin/settings/general": "General Settings",
  "/admin/settings/page-access": "Page Access",
  "/admin/settings/field-permissions": "Field Permissions",
  "/admin/settings/doc-permissions": "Document Permissions",
  "/admin/settings/impersonation-logs": "Impersonation Logs",
  "/admin/settings/data-manager": "Data Manager",
  "/admin/settings/lookup-values": "Lookup Values",
  "/admin/my-programs": "My Programs",
};

const NOTIF_ICONS: Record<string, LucideIcon> = {
  application_submitted: ClipboardList,
  status_changed: RefreshCw,
  interview_scheduled: CalendarCheck,
  contract_created: FileText,
  document_expiring: AlertTriangle,
  report_published: BarChart3,
  invoice_sent: Receipt,
  invoice_overdue: AlertTriangle,
  default: Bell,
};

const ACCOUNT_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  Student:      { bg: "var(--e-orange-lt)", text: "var(--e-orange)" },
  Agent:        { bg: "#F4F3F1", text: "#57534E" },
  School:       { bg: "#DCFCE7", text: "#15803D" },
  Company:      { bg: "#E0F2FE", text: "#0369A1" },
  Parent:       { bg: "#FCE7F3", text: "#BE185D" },
};

function getAccountTypeColor(type: string | null) {
  return ACCOUNT_TYPE_COLORS[type ?? ""] ?? { bg: "#F4F3F1", text: "#57534E" };
}

type ViewTab = "users" | "accounts";
type Props = { collapsed: boolean; onToggle: () => void; title?: string };

export function Header({ collapsed, onToggle, title }: Props) {
  const { user, logout } = useAuth();
  const { viewAsRole, viewAsUser, setViewAsRole, setViewAs, clearViewAs, isImpersonating } = useViewAs();
  const { theme, toggleTheme } = useTheme();
  const { i18n } = useTranslation();
  const [location, navigate] = useLocation();
  const [notifOpen, setNotifOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [viewAsOpen, setViewAsOpen] = useState(false);
  const [viewTab, setViewTab] = useState<ViewTab>("users");
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const myRole = user?.role ?? "";
  const myLevel = ROLE_HIERARCHY[myRole] ?? 0;
  const canSwitch = myLevel >= 60;
  const canSwitchAccounts = myLevel >= 60;

  // Available roles for View-As: only roles strictly below the current user's level
  const switchableRoles = Object.entries(ROLE_HIERARCHY)
    .filter(([role, level]) => level < myLevel && ROLE_LABELS[role])
    .sort(([, a], [, b]) => b - a)
    .map(([role]) => role);

  const { data: switchableAccounts = [] } = useQuery<SwitchableAccount[]>({
    queryKey: ["switchable-accounts"],
    queryFn: () => axios.get(`${BASE}/api/users/switchable-accounts`).then(r => r.data),
    enabled: canSwitchAccounts,
  });

  const { data: notifData } = useQuery({
    queryKey: ["notifications-unread-count"],
    queryFn: () => axios.get(`${BASE}/api/notifications/unread-count`).then(r => r.data),
    refetchInterval: 30000,
    enabled: !!user,
  });
  const unreadCount: number = notifData?.count ?? 0;

  const { data: notifList } = useQuery<Notification[]>({
    queryKey: ["notifications-dropdown"],
    queryFn: () => axios.get(`${BASE}/api/notifications?limit=10`).then(r => r.data?.data ?? []),
    enabled: notifOpen && !!user,
  });

  const markAllMutation = useMutation({
    mutationFn: () => axios.post(`${BASE}/api/notifications/mark-all-read`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications-unread-count"] });
      qc.invalidateQueries({ queryKey: ["notifications-dropdown"] });
    },
  });

  const pageTitle = title ?? PAGE_TITLES[location] ?? "Edubee Camp Admin";

  const filteredAccounts = switchableAccounts.filter(a => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      (a.name ?? "").toLowerCase().includes(q) ||
      (a.portalEmail ?? "").toLowerCase().includes(q) ||
      (a.accountType ?? "").toLowerCase().includes(q)
    );
  });

  function handleClose() {
    setViewAsOpen(false);
    setSearchQuery("");
  }

  function switchToAccount(acct: SwitchableAccount) {
    const contactName = [acct.primaryContactFirstName, acct.primaryContactLastName].filter(Boolean).join(" ") || acct.name;
    setViewAs({
      id: acct.id,
      email: acct.portalEmail ?? "",
      fullName: acct.name,
      role: acct.portalRole ?? "consultant",
      _sourceType: "account",
      _accountType: acct.accountType,
    });
    handleClose();
  }

  if (!user) return null;

  const viewingAsLabel = isImpersonating
    ? viewAsRole
      ? `${ROLE_LABELS[viewAsRole] ?? viewAsRole} (Preview)`
      : viewAsUser?._sourceType === "account"
      ? `Account: ${viewAsUser.fullName.split(" ")[0]}`
      : `Account`
    : ROLE_LABELS[myRole];

  return (
    <div>
      {/* Main header — 56px */}
      <header
        className="h-14 flex items-center justify-between px-4 shrink-0 z-20"
        style={{ background: "var(--e-bg-topbar)", borderBottom: "1px solid var(--e-border)" }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onToggle}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[#F4F3F1] dark:hover:bg-[#242220]"
            style={{ color: "var(--e-text-2)" }}
          >
            <Menu className="w-4 h-4" />
          </button>
          <h1 className="font-semibold text-[18px] leading-none" style={{ color: "var(--e-text-1)" }}>{pageTitle}</h1>
        </div>

        <div className="flex items-center gap-1.5">
          {/* View as switcher */}
          {canSwitch && (
            <DropdownMenu open={viewAsOpen} onOpenChange={(o) => {
              setViewAsOpen(o);
              if (!o) { setSearchQuery(""); }
            }}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={isImpersonating ? "default" : "outline"}
                  size="sm"
                  className={`h-8 px-3 text-xs gap-1.5 font-medium ${isImpersonating ? "bg-[#FEF3C7] hover:bg-[#FDE68A] text-[#92400E] border-[#F59E0B]" : ""}`}
                >
                  {isImpersonating ? (
                    <><Eye className="w-3.5 h-3.5" /> Viewing as: {viewingAsLabel}</>
                  ) : (
                    <><Eye className="w-3.5 h-3.5 opacity-60" /> View as: {ROLE_LABELS[myRole]}</>
                  )}
                  <ChevronDown className="w-3 h-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-72 p-0" onCloseAutoFocus={e => e.preventDefault()}>
                {/* My View */}
                <div className="px-2 pt-2 pb-1">
                  <p className="text-[10px] font-semibold text-[#A8A29E] uppercase tracking-wide px-1 mb-1">My View</p>
                  <button
                    onClick={() => { clearViewAs(); handleClose(); }}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${!isImpersonating ? "bg-(--e-orange-lt)" : "hover:bg-[#F4F3F1]"}`}
                  >
                    <div className="w-6 h-6 rounded-full bg-(--e-orange-lt) flex items-center justify-center text-[10px] font-bold text-(--e-orange) shrink-0">
                      {user.fullName.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium truncate">{user.fullName}</div>
                      <div className="text-[10px] text-[#A8A29E] flex items-center gap-1">
                        <Layers className="w-2.5 h-2.5" />{ROLE_LABELS[myRole]} · My Account
                      </div>
                    </div>
                    {!isImpersonating && <div className="w-1.5 h-1.5 rounded-full bg-(--e-orange) shrink-0" />}
                  </button>
                </div>

                {/* Tabs: Roles + Accounts */}
                <div className="border-t border-[#E8E6E2] mx-2" />
                <div className="px-2 pt-2">
                  <div className="flex gap-1 mb-2">
                    <button
                      onClick={() => { setViewTab("users"); setSearchQuery(""); }}
                      className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-[11px] font-medium transition-colors border ${viewTab === "users" ? "bg-(--e-orange) text-white border-(--e-orange)" : "bg-white text-[#78716C] border-[#E8E6E2] hover:border-(--e-orange) hover:text-(--e-orange)"}`}
                    >
                      <Layers className="w-3 h-3" /> Roles
                      {switchableRoles.length > 0 && (
                        <span className={`ml-0.5 px-1 py-0 rounded-full text-[9px] font-bold ${viewTab === "users" ? "bg-white/30 text-white" : "bg-[#F4F3F1] text-[#78716C]"}`}>
                          {switchableRoles.length}
                        </span>
                      )}
                    </button>
                    {canSwitchAccounts && (
                      <button
                        onClick={() => { setViewTab("accounts"); setSearchQuery(""); }}
                        className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-[11px] font-medium transition-colors border ${viewTab === "accounts" ? "bg-(--e-orange) text-white border-(--e-orange)" : "bg-white text-[#78716C] border-[#E8E6E2] hover:border-(--e-orange) hover:text-(--e-orange)"}`}
                      >
                        <Building2 className="w-3 h-3" /> Accounts
                        {switchableAccounts.length > 0 && (
                          <span className={`ml-0.5 px-1 py-0 rounded-full text-[9px] font-bold ${viewTab === "accounts" ? "bg-white/30 text-white" : "bg-[#F4F3F1] text-[#78716C]"}`}>
                            {switchableAccounts.length}
                          </span>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Search — only shown on Accounts tab */}
                  {viewTab === "accounts" && (
                    <div className="relative mb-2">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#A8A29E]" />
                      <input
                        ref={searchRef}
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        onKeyDown={e => e.stopPropagation()}
                        onClick={e => e.stopPropagation()}
                        placeholder="Search account name or email…"
                        className="w-full pl-7 pr-7 py-1.5 text-xs border border-[#E8E6E2] rounded-lg bg-[#FAFAF9] focus:outline-none focus:ring-1 focus:ring-(--e-orange) focus:border-(--e-orange)"
                      />
                      {searchQuery && (
                        <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#A8A29E] hover:text-[#78716C]">
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* List */}
                <div className="max-h-52 overflow-y-auto px-2 pb-2">
                  {viewTab === "users" ? (
                    switchableRoles.length === 0 ? (
                      <div className="text-center py-4 text-[11px] text-[#A8A29E]">No roles available</div>
                    ) : (
                      switchableRoles.map(role => (
                        <button
                          key={role}
                          onClick={() => { setViewAsRole(role); handleClose(); }}
                          className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left transition-colors mb-0.5 ${viewAsRole === role ? "bg-(--e-orange-lt)" : "hover:bg-[#F4F3F1]"}`}
                        >
                          <div className="w-7 h-7 rounded-full bg-[#F4F3F1] flex items-center justify-center text-sm shrink-0">
                            {ROLE_EMOJIS[role]}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-medium">{ROLE_LABELS[role]}</div>
                            <div className="text-[10px] text-[#A8A29E]">{ROLE_DESCRIPTIONS[role]}</div>
                          </div>
                          {viewAsRole === role && (
                            <div className="w-1.5 h-1.5 rounded-full bg-(--e-orange) shrink-0" />
                          )}
                        </button>
                      ))
                    )
                  ) : (
                    filteredAccounts.length === 0 ? (
                      <div className="text-center py-4 text-[11px] text-[#A8A29E]">
                        {switchableAccounts.length === 0 ? "No accounts with portal access" : "No accounts found"}
                      </div>
                    ) : (
                      filteredAccounts.map(a => {
                        const { bg, text } = getAccountTypeColor(a.accountType);
                        const isActive = viewAsUser?.id === a.id && viewAsUser?._sourceType === "account";
                        return (
                          <button
                            key={a.id}
                            onClick={() => switchToAccount(a)}
                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors mb-0.5 ${isActive ? "bg-(--e-orange-lt)" : "hover:bg-[#F4F3F1]"}`}
                          >
                            <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: bg }}>
                              <Building2 className="w-3.5 h-3.5" style={{ color: text }} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-medium truncate">{a.name}</div>
                              <div className="text-[10px] text-[#A8A29E] truncate flex items-center gap-1">
                                {a.accountType && (
                                  <span className="px-1 py-0 rounded text-[9px] font-medium" style={{ background: bg, color: text }}>
                                    {a.accountType}
                                  </span>
                                )}
                                {a.portalEmail && <span className="truncate">{a.portalEmail}</span>}
                              </div>
                            </div>
                            {isActive && <div className="w-1.5 h-1.5 rounded-full bg-(--e-orange) shrink-0" />}
                          </button>
                        );
                      })
                    )
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Language switcher */}
          <DropdownMenu open={langOpen} onOpenChange={setLangOpen}>
            <DropdownMenuTrigger asChild>
              <button
                className="h-8 px-2 rounded-lg flex items-center gap-1 text-[#57534E] hover:bg-[#F4F3F1] dark:text-[#A8A29E] dark:hover:bg-[#242220] transition-colors text-sm font-medium"
                title="Change language"
              >
                <span className="text-base leading-none">
                  {LANGUAGES.find(l => l.code === i18n.language)?.flag ?? "🇦🇺"}
                </span>
                <span className="hidden sm:inline text-xs">
                  {LANGUAGES.find(l => l.code === i18n.language)?.label ?? "English"}
                </span>
                <ChevronDown className="w-3 h-3 opacity-50" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 p-1">
              {LANGUAGES.map(lang => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => { i18n.changeLanguage(lang.code); setLangOpen(false); }}
                  className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md cursor-pointer text-sm ${
                    lang.code === i18n.language
                      ? "bg-(--e-orange-lt) text-(--e-orange) font-semibold"
                      : ""
                  }`}
                >
                  <span className="text-base">{lang.flag}</span>
                  <span>{lang.label}</span>
                  {lang.code === i18n.language && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-(--e-orange)" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Dark mode toggle */}
          <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#57534E] hover:bg-[#F4F3F1] dark:text-[#A8A29E] dark:hover:bg-[#242220] transition-colors"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Notifications Bell */}
          <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
            <DropdownMenuTrigger asChild>
              <button
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors relative hover:bg-[#F4F3F1] dark:hover:bg-[#242220]"
                style={{ color: "var(--e-text-2)" }}
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-(--e-orange) text-white text-[9px] font-bold flex items-center justify-center px-0.5">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0">
              <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: "1px solid var(--e-border)" }}>
                <span className="text-sm font-semibold" style={{ color: "var(--e-text-1)" }}>Notifications</span>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button className="text-[10px] text-(--e-orange) hover:text-(--e-orange-hover) font-medium" onClick={() => markAllMutation.mutate()}>
                      Mark all read
                    </button>
                  )}
                  <Link href="/admin/notifications" className="text-[10px] hover:text-[#57534E]" style={{ color: "var(--e-text-3)" }}>View all</Link>
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {!notifList || notifList.length === 0 ? (
                  <div className="px-3 py-6 text-center text-xs" style={{ color: "var(--e-text-3)" }}>
                    <Bell className="w-6 h-6 mx-auto mb-2 opacity-30" />
                    No notifications
                  </div>
                ) : notifList.map(n => {
                  const NIcon = NOTIF_ICONS[n.type ?? ""] ?? NOTIF_ICONS.default;
                  const isParent = false; // parent_client role removed
                  const isEA = false; // education_agent role removed
                  const notifTarget = (() => {
                    if (n.referenceType === "report" && n.referenceId) {
                      if (isParent || isEA) return `/admin/reports/${n.referenceId}`;
                      return `/admin/reports/${n.referenceId}/edit`;
                    }
                    return null;
                  })();
                  return (
                    <div
                      key={n.id}
                      role={notifTarget ? "button" : undefined}
                      onClick={() => {
                        if (notifTarget) {
                          setNotifOpen(false);
                          navigate(notifTarget);
                        }
                      }}
                      className={`px-3 py-2.5 flex items-start gap-2.5 transition-colors last:border-0
                        ${!n.isRead ? "bg-(--e-orange-lt)/40 dark:bg-[var(--e-orange-shadow-08)]" : "hover:bg-[#FAFAF9] dark:hover:bg-[#242220]"}
                        ${notifTarget ? "cursor-pointer" : ""}
                      `}
                      style={{ borderBottom: "1px solid var(--e-border-sub)" }}
                    >
                      <span className="mt-0.5 shrink-0" style={{ color: "var(--e-text-3)" }}><NIcon className="w-4 h-4" /></span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium leading-snug" style={{ color: "var(--e-text-1)" }}>{n.title}</div>
                        {n.message && <div className="text-[10px] mt-0.5 leading-snug line-clamp-2" style={{ color: "var(--e-text-2)" }}>{n.message}</div>}
                        <div className="text-[9px] mt-1 flex items-center gap-1" style={{ color: "var(--e-text-3)" }}>
                          <Clock className="w-2.5 h-2.5" />
                          {formatDateTime(n.createdAt)}
                        </div>
                      </div>
                      {!n.isRead && <div className="w-2 h-2 rounded-full bg-(--e-orange) mt-1 shrink-0" />}
                    </div>
                  );
                })}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Avatar dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-8 h-8 rounded-full flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-(--e-orange)/30">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs font-bold" style={{ background: "var(--e-orange-lt)", color: "var(--e-orange)" }}>
                    {user.fullName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="font-normal p-3">
                <div className="font-semibold text-sm leading-none" style={{ color: "var(--e-text-1)" }}>{user.fullName}</div>
                <div className="text-xs mt-1 truncate" style={{ color: "var(--e-text-2)" }}>{user.email}</div>
                <div className="text-[10px] mt-1 font-medium text-(--e-orange)">{ROLE_EMOJIS[user.role]} {ROLE_LABELS[user.role]}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <UserIcon className="mr-2 h-3.5 w-3.5" style={{ color: "var(--e-text-3)" }} /> Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-[#DC2626] focus:text-[#DC2626]" onClick={logout}>
                <LogOut className="mr-2 h-3.5 w-3.5" /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Impersonation banner */}
      {isImpersonating && viewAsUser && (
        <div
          className="flex items-center justify-between px-4 py-2 text-xs font-medium"
          style={{ background: "#FEF3C7", borderBottom: "1px solid #F59E0B", color: "#92400E" }}
        >
          <span>
            {viewAsUser._sourceType === "account" ? (
              <>🏢 Viewing as Account: {viewAsUser.fullName} ({viewAsUser.email || "No portal email"}) · Portal Preview</>
            ) : (
              <>👁 Viewing as: {ROLE_EMOJIS[viewAsUser.role]} {ROLE_LABELS[viewAsUser.role]} — {viewAsUser.fullName} ({viewAsUser.email}) · Preview mode</>
            )}
          </span>
          <button
            onClick={clearViewAs}
            className="flex items-center gap-1 px-2 py-0.5 rounded border border-[#CA8A04] hover:bg-[#FEF9C3] transition-colors"
          >
            <RotateCcw className="w-3 h-3" /> Return to My Account
          </button>
        </div>
      )}
    </div>
  );
}
