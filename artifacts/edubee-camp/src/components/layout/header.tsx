import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useViewAs, ROLE_HIERARCHY, ROLE_LABELS, ROLE_EMOJIS } from "@/hooks/use-view-as";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Menu, Bell, LogOut, ChevronDown, Eye, RotateCcw, User as UserIcon, Clock, ClipboardList, RefreshCw, CalendarCheck, FileText, AlertTriangle, BarChart3, Receipt, LucideIcon, Layers } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import axios from "axios";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface SwitchableUser {
  id: string; email: string; fullName: string;
  role: string; avatarUrl?: string | null;
}

interface Notification {
  id: string; type?: string | null; title?: string | null; message?: string | null;
  isRead?: boolean | null; createdAt?: string | null; referenceType?: string | null;
}

const PAGE_TITLES: Record<string, string> = {
  "/admin/dashboard": "Dashboard",
  "/admin/package-groups": "Package Groups",
  "/admin/packages": "Packages",
  "/admin/products": "Products",
  "/admin/leads": "Leads",
  "/admin/applications": "Applications",
  "/admin/contracts": "Contracts",
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

type Props = { collapsed: boolean; onToggle: () => void; title?: string };

export function Header({ collapsed, onToggle, title }: Props) {
  const { user, logout } = useAuth();
  const { viewAsUser, setViewAs, clearViewAs, isImpersonating } = useViewAs();
  const [location] = useLocation();
  const [notifOpen, setNotifOpen] = useState(false);
  const qc = useQueryClient();

  const myRole = user?.role ?? "";
  const myLevel = ROLE_HIERARCHY[myRole] ?? 0;
  const canSwitch = myLevel >= 60;

  const { data: switchableUsers = [] } = useQuery<SwitchableUser[]>({
    queryKey: ["switchable-users"],
    queryFn: () => axios.get(`${BASE}/api/users/switchable`).then(r => r.data),
    enabled: canSwitch,
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

  const grouped = switchableUsers.reduce<Record<string, SwitchableUser[]>>((acc, u) => {
    if (!acc[u.role]) acc[u.role] = [];
    acc[u.role].push(u);
    return acc;
  }, {});

  if (!user) return null;

  return (
    <div>
      {/* Main header — 56px */}
      <header
        className="h-14 flex items-center justify-between px-4 shrink-0 z-20"
        style={{ background: "#FFFFFF", borderBottom: "1px solid #E8E6E2" }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onToggle}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#57534E] hover:bg-[#F4F3F1] transition-colors"
          >
            <Menu className="w-4 h-4" />
          </button>
          <h1 className="font-semibold text-[18px] text-[#1C1917] leading-none">{pageTitle}</h1>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Role view switcher */}
          {canSwitch && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={isImpersonating ? "default" : "outline"}
                  size="sm"
                  className={`h-8 px-3 text-xs gap-1.5 font-medium ${isImpersonating ? "bg-[#FEF3C7] hover:bg-[#FDE68A] text-[#92400E] border-[#F59E0B]" : ""}`}
                >
                  {isImpersonating ? (
                    <><Eye className="w-3.5 h-3.5" /> Viewing as: {viewAsUser?.fullName?.split(" ")[0]}</>
                  ) : (
                    <><Eye className="w-3.5 h-3.5 opacity-60" /> View as: {ROLE_LABELS[myRole]}</>
                  )}
                  <ChevronDown className="w-3 h-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-xs text-[#A8A29E] py-1 px-2">My View</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={clearViewAs}
                  className={!isImpersonating ? "bg-[#FEF0E3] font-medium" : ""}
                >
                  <div className="w-5 h-5 rounded-full bg-[#FEF0E3] flex items-center justify-center text-[10px] font-bold mr-2 text-[#F5821F]">
                    {user.fullName.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium truncate">{user.fullName}</div>
                    <div className="text-[10px] text-[#A8A29E] truncate flex items-center gap-1">
                      <Layers className="w-2.5 h-2.5" />
                      {ROLE_LABELS[myRole]} · My Account
                    </div>
                  </div>
                </DropdownMenuItem>

                {switchableUsers.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs text-[#A8A29E] py-1 px-2">View as another user</DropdownMenuLabel>
                    {Object.entries(grouped).map(([role, users]) => (
                      <div key={role}>
                        <DropdownMenuLabel className="text-[10px] text-[#A8A29E]/70 py-0.5 px-3 font-normal">
                          {ROLE_EMOJIS[role]} {ROLE_LABELS[role]}
                        </DropdownMenuLabel>
                        {users.map(u => (
                          <DropdownMenuItem
                            key={u.id}
                            onClick={() => setViewAs(u)}
                            className={viewAsUser?.id === u.id ? "bg-[#FEF0E3]" : ""}
                          >
                            <div className="w-5 h-5 rounded-full bg-[#F4F3F1] flex items-center justify-center text-[10px] font-bold mr-2">
                              {u.fullName.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-medium truncate">{u.fullName}</div>
                              <div className="text-[10px] text-[#A8A29E] truncate">{u.email}</div>
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </div>
                    ))}
                  </>
                )}
                {switchableUsers.length === 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem disabled className="text-xs text-[#A8A29E]">No other users to switch to</DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Notifications Bell */}
          <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
            <DropdownMenuTrigger asChild>
              <button className="w-8 h-8 rounded-lg flex items-center justify-center text-[#57534E] hover:bg-[#F4F3F1] transition-colors relative">
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-[#F5821F] text-white text-[9px] font-bold flex items-center justify-center px-0.5">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0">
              <div className="flex items-center justify-between px-3 py-2 border-b border-[#E8E6E2]">
                <span className="text-sm font-semibold text-[#1C1917]">Notifications</span>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button className="text-[10px] text-[#F5821F] hover:text-[#D96A0A] font-medium" onClick={() => markAllMutation.mutate()}>
                      Mark all read
                    </button>
                  )}
                  <Link href="/admin/notifications" className="text-[10px] text-[#A8A29E] hover:text-[#57534E]">View all</Link>
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {!notifList || notifList.length === 0 ? (
                  <div className="px-3 py-6 text-center text-[#A8A29E] text-xs">
                    <Bell className="w-6 h-6 mx-auto mb-2 opacity-30" />
                    No notifications
                  </div>
                ) : notifList.map(n => {
                  const NIcon = NOTIF_ICONS[n.type ?? ""] ?? NOTIF_ICONS.default;
                  return (
                    <div key={n.id} className={`px-3 py-2.5 border-b border-[#F4F3F1] last:border-0 flex items-start gap-2.5 transition-colors ${!n.isRead ? "bg-[#FEF0E3]/40" : "hover:bg-[#FAFAF9]"}`}>
                      <span className="mt-0.5 shrink-0 text-[#A8A29E]"><NIcon className="w-4 h-4" /></span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium leading-snug text-[#1C1917]">{n.title}</div>
                        {n.message && <div className="text-[10px] text-[#57534E] mt-0.5 leading-snug line-clamp-2">{n.message}</div>}
                        <div className="text-[9px] text-[#A8A29E] mt-1 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {n.createdAt ? new Date(n.createdAt).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                        </div>
                      </div>
                      {!n.isRead && <div className="w-2 h-2 rounded-full bg-[#F5821F] mt-1 shrink-0" />}
                    </div>
                  );
                })}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Avatar dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-8 h-8 rounded-full flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#F5821F]/30">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs font-bold" style={{ background: "#FEF0E3", color: "#F5821F" }}>
                    {user.fullName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="font-normal p-3">
                <div className="font-semibold text-sm leading-none text-[#1C1917]">{user.fullName}</div>
                <div className="text-xs text-[#57534E] mt-1 truncate">{user.email}</div>
                <div className="text-[10px] text-[#F5821F] mt-1 font-medium">{ROLE_EMOJIS[user.role]} {ROLE_LABELS[user.role]}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <UserIcon className="mr-2 h-3.5 w-3.5 text-[#A8A29E]" /> Profile
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
            👁 Viewing as: {ROLE_EMOJIS[viewAsUser.role]} {ROLE_LABELS[viewAsUser.role]} — {viewAsUser.fullName} ({viewAsUser.email}) · Preview mode
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
