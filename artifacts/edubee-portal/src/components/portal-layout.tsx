import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard,
  Users,
  DollarSign,
  User,
  LogOut,
  Menu,
  X,
  ChevronRight,
  CalendarRange,
  BookOpen,
  Building2,
  GraduationCap,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const AGENT_ROLES = ["consultant", "agent"];
const PARTNER_ROLES = ["hotel", "pickup", "institute", "tour"];

const AGENT_NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/students", label: "My Students", icon: Users },
  { href: "/commissions", label: "Commissions", icon: DollarSign },
  { href: "/profile", label: "Profile", icon: User },
];

const PARTNER_NAV = [
  { href: "/partner/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/partner/bookings", label: "My Bookings", icon: CalendarRange },
  { href: "/partner/profile", label: "Profile", icon: User },
];

const STUDENT_NAV = [
  { href: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/student/quotes", label: "My Quotes", icon: FileText },
  { href: "/student/programs", label: "My Programs", icon: BookOpen },
  { href: "/student/profile", label: "Profile", icon: User },
];

function getNav(role: string | null | undefined) {
  if (!role) return AGENT_NAV;
  if (AGENT_ROLES.includes(role)) return AGENT_NAV;
  if (PARTNER_ROLES.includes(role)) return PARTNER_NAV;
  if (role === "student") return STUDENT_NAV;
  return AGENT_NAV;
}

function getRoleLabel(role: string | null | undefined) {
  const map: Record<string, string> = {
    consultant: "Consultant",
    agent: "Agent",
    hotel: "Hotel Partner",
    pickup: "Pickup Partner",
    institute: "Institute Partner",
    tour: "Tour Partner",
    student: "Student",
  };
  return role ? (map[role] ?? role) : "Portal";
}

function getRoleIcon(role: string | null | undefined) {
  if (!role) return null;
  if (PARTNER_ROLES.includes(role)) return <Building2 className="h-3.5 w-3.5 mr-1 opacity-60" />;
  if (role === "student") return <GraduationCap className="h-3.5 w-3.5 mr-1 opacity-60" />;
  return null;
}

function Initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function PortalLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const navItems = getNav(user?.portalRole);
  const roleLabel = getRoleLabel(user?.portalRole);
  const roleIcon = getRoleIcon(user?.portalRole);

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div
      className={cn(
        "flex flex-col h-full border-r",
        mobile ? "w-full" : "w-64"
      )}
      style={{ background: "#FFFFFF", borderColor: "#E8E6E2" }}
    >
      <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: "#E8E6E2" }}>
        <img
          src={`${import.meta.env.BASE_URL}edubee-logo.png`}
          alt="Edubee"
          className="h-6 w-auto object-contain"
        />
        <div className="min-w-0">
          <div className="flex items-center text-xs" style={{ color: "#A8A29E" }}>
            {roleIcon}
            <span className="truncate">{roleLabel}</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active =
            location === href || (href !== "/dashboard" && href !== "/partner/dashboard" && href !== "/student/dashboard" && location.startsWith(href));
          return (
            <Link key={href} href={href}>
              <a
                onClick={() => mobile && setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                )}
                style={
                  active
                    ? { background: "#FEF0E3", color: "#F5821F" }
                    : { color: "#57534E" }
                }
                onMouseEnter={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = "#FAFAF9";
                    (e.currentTarget as HTMLElement).style.color = "#1C1917";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = "";
                    (e.currentTarget as HTMLElement).style.color = "#57534E";
                  }
                }}
              >
                <Icon className="h-4 w-4 shrink-0" style={active ? { color: "#F5821F" } : {}} />
                {label}
                {active && <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-40" />}
              </a>
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t" style={{ borderColor: "#E8E6E2" }}>
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs font-medium" style={{ background: "#FEF0E3", color: "#F5821F" }}>
              {Initials(user?.accountName ?? "A")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: "#1C1917" }}>{user?.accountName}</p>
            <p className="text-xs truncate" style={{ color: "#A8A29E" }}>{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors"
          style={{ color: "#A8A29E" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "#FEF3F2";
            (e.currentTarget as HTMLElement).style.color = "#DC2626";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "";
            (e.currentTarget as HTMLElement).style.color = "#A8A29E";
          }}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#FAFAF9" }}>
      <aside className="hidden lg:flex shrink-0">
        <Sidebar />
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative z-10 h-full w-72">
            <Sidebar mobile />
          </div>
        </div>
      )}

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header
          className="flex items-center gap-4 px-4 py-3 border-b lg:hidden"
          style={{ background: "#FFFFFF", borderColor: "#E8E6E2" }}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            style={{ color: "#57534E" }}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <img
            src={`${import.meta.env.BASE_URL}edubee-logo.png`}
            alt="Edubee"
            className="h-6 w-auto object-contain"
          />
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
