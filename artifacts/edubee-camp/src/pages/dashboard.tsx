import { useAuth } from "@/hooks/use-auth";
import { useViewAs } from "@/hooks/use-view-as";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Link } from "wouter";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Target, ClipboardList, FileText, Users, TrendingUp,
  GraduationCap, Building2, Car, Map, Banknote,
  CalendarCheck, ArrowRight,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface DashboardStats {
  totalLeads: number; activeLeads: number;
  totalApplications: number; pendingApplications: number; contractedApplications: number;
  totalContracts: number; activeContracts: number;
  totalUsers: number; activeUsers: number;
  recentApplications: { id: string; applicationNumber: string; status: string; createdAt: string; studentName?: string }[];
  recentLeads: { id: string; studentName: string; status: string; createdAt: string }[];
  applicationsByStatus: { status: string; count: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  draft: "#94a3b8", submitted: "#f97316", under_review: "#f59e0b",
  approved: "#22c55e", contracted: "#14b8a6", rejected: "#ef4444", cancelled: "#64748b",
};
const PIE_COLORS = ["#F08301", "#22c55e", "#3b82f6", "#a855f7", "#14b8a6", "#ef4444", "#94a3b8"];

function StatCard({ icon: Icon, label, value, sub, color = "orange" }: {
  icon: React.ElementType; label: string; value: number | string; sub?: string;
  color?: "orange" | "blue" | "green" | "purple" | "teal" | "red";
}) {
  const colors = {
    orange: "bg-orange-50 border-orange-200 text-orange-600",
    blue: "bg-blue-50 border-blue-200 text-blue-600",
    green: "bg-green-50 border-green-200 text-green-600",
    purple: "bg-purple-50 border-purple-200 text-purple-600",
    teal: "bg-teal-50 border-teal-200 text-teal-600",
    red: "bg-red-50 border-red-200 text-red-600",
  };
  return (
    <div className="bg-card rounded-xl border border-border p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <div className="text-sm font-medium text-foreground/80">{label}</div>
        {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    new: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    contacted: "bg-yellow-100 text-yellow-700",
    qualified: "bg-indigo-100 text-indigo-700",
    proposal: "bg-purple-100 text-purple-700",
    submitted: "bg-orange-100 text-orange-700",
    under_review: "bg-amber-100 text-amber-700",
    approved: "bg-green-100 text-green-700",
    contracted: "bg-teal-100 text-teal-700",
    rejected: "bg-red-100 text-red-700",
    draft: "bg-gray-100 text-gray-700",
    active: "bg-green-100 text-green-700",
    completed: "bg-slate-100 text-slate-700",
    cancelled: "bg-red-100 text-red-700",
    converted: "bg-teal-100 text-teal-700",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? "bg-gray-100 text-gray-700"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

const QUICK_ACTIONS = {
  sales: [
    { icon: Target, label: "Leads CRM", href: "/admin/leads", color: "text-orange-500" },
    { icon: ClipboardList, label: "Applications", href: "/admin/applications", color: "text-blue-500" },
    { icon: FileText, label: "Contracts", href: "/admin/contracts", color: "text-green-500" },
    { icon: CalendarCheck, label: "Interviews", href: "/admin/services/interviews", color: "text-purple-500" },
  ],
  partner: [
    { icon: GraduationCap, label: "My Institute", href: "/admin/services/institute", color: "text-orange-500" },
    { icon: Building2, label: "My Hotel", href: "/admin/services/hotel", color: "text-blue-500" },
    { icon: Car, label: "My Pickups", href: "/admin/services/pickup", color: "text-green-500" },
    { icon: Map, label: "My Tours", href: "/admin/services/tour", color: "text-purple-500" },
    { icon: Banknote, label: "My Settlement", href: "/admin/my-accounting/settlements", color: "text-teal-500" },
  ],
  parent: [
    { icon: ClipboardList, label: "My Programs", href: "/admin/my-programs", color: "text-orange-500" },
    { icon: FileText, label: "My Contracts", href: "/admin/contracts", color: "text-blue-500" },
  ],
};

export default function Dashboard() {
  const { user } = useAuth();
  const { viewAsUser } = useViewAs();
  const effectiveUser = viewAsUser ?? user;
  const effectiveRole = effectiveUser?.role ?? "";

  const isSA = effectiveRole === "super_admin";
  const isAD = effectiveRole === "admin";
  const isSAorAD = isSA || isAD;
  const isCC = effectiveRole === "camp_coordinator";
  const isEA = effectiveRole === "education_agent";
  const isSales = isSAorAD || isCC || isEA;
  const isPartner = effectiveRole.startsWith("partner_");
  const isParent = effectiveRole === "parent_client";

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],
    queryFn: () => axios.get(`${BASE}/api/dashboard/stats`).then(r => r.data),
    enabled: isSales || isSAorAD,
  });

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  };

  const chartData = (stats?.applicationsByStatus ?? []).map(d => ({
    status: d.status.replace(/_/g, " "),
    count: d.count,
    fill: STATUS_COLORS[d.status] ?? "#94a3b8",
  }));

  const quickActions = isPartner
    ? QUICK_ACTIONS.partner.filter(a => {
        if (effectiveRole === "partner_institute") return a.href.includes("institute") || a.href.includes("settlements");
        if (effectiveRole === "partner_hotel") return a.href.includes("hotel") || a.href.includes("settlements");
        if (effectiveRole === "partner_pickup") return a.href.includes("pickup") || a.href.includes("settlements");
        if (effectiveRole === "partner_tour") return a.href.includes("tour") || a.href.includes("settlements");
        return true;
      })
    : isParent ? QUICK_ACTIONS.parent
    : QUICK_ACTIONS.sales;

  if (isLoading && isSales) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted rounded-lg w-64 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[...Array(2)].map((_, i) => <div key={i} className="h-64 bg-muted rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">
          {greeting()}, {effectiveUser?.fullName?.split(" ")[0]} 👋
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isSAorAD ? "Full platform overview — Edubee Camp Admin." :
           isCC ? "Your active programs and service management." :
           isEA ? "Your leads, applications and conversions." :
           isPartner ? "Your service assignments and settlements." :
           "Your enrolled programs and upcoming activities."}
        </p>
      </div>

      {/* KPI Cards */}
      {isSales && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(isSAorAD || isCC || isEA) && (
            <StatCard icon={Target} label="Total Leads" value={stats?.totalLeads ?? 0}
              sub={`${stats?.activeLeads ?? 0} active`} color="orange" />
          )}
          {(isSAorAD || isCC || isEA) && (
            <StatCard icon={ClipboardList} label="Applications" value={stats?.totalApplications ?? 0}
              sub={`${stats?.pendingApplications ?? 0} pending`} color="blue" />
          )}
          {(isSAorAD || isCC) && (
            <StatCard icon={FileText} label="Contracts" value={stats?.totalContracts ?? 0}
              sub={`${stats?.activeContracts ?? 0} active`} color="green" />
          )}
          {isSAorAD && (
            <StatCard icon={Users} label="Users" value={stats?.totalUsers ?? 0}
              sub={`${stats?.activeUsers ?? 0} active`} color="purple" />
          )}
          {isEA && (
            <StatCard icon={TrendingUp} label="Contracted" value={stats?.contractedApplications ?? 0}
              sub="converted to contract" color="teal" />
          )}
        </div>
      )}

      {/* Partner / Parent — simple welcome block */}
      {(isPartner || isParent) && (
        <div className="bg-gradient-to-r from-[#F08301]/10 to-orange-50 dark:from-orange-950/30 dark:to-transparent rounded-xl border border-orange-200/50 dark:border-orange-800/30 p-6">
          <p className="text-sm text-muted-foreground mb-1">Role</p>
          <p className="font-semibold text-foreground capitalize">
            {effectiveRole.replace(/_/g, " ")}
          </p>
          {isPartner && <p className="text-xs text-muted-foreground mt-2">Use the sidebar to access your assigned services and settlement records.</p>}
          {isParent && <p className="text-xs text-muted-foreground mt-2">View your enrolled programs and upcoming schedules below.</p>}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Applications by Status Chart */}
        {isSales && chartData.length > 0 && (
          <div className="bg-card rounded-xl border border-border">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-sm text-foreground">Applications by Status</h3>
              <Link href="/admin/applications" className="text-xs text-[#F08301] hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="p-4">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} barSize={28}>
                  <XAxis dataKey="status" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={28} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
                    formatter={(v) => [v, "Applications"]}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Leads breakdown (Pie) for SA/AD */}
        {isSAorAD && chartData.length > 0 && (
          <div className="bg-card rounded-xl border border-border">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-sm text-foreground">Application Distribution</h3>
            </div>
            <div className="p-4 flex items-center justify-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    dataKey="count"
                    nameKey="status"
                    paddingAngle={2}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
                    formatter={(v, name) => [v, String(name).replace(/_/g, " ")]}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Recent Applications */}
        {isSales && (stats?.recentApplications?.length ?? 0) > 0 && (
          <div className="bg-card rounded-xl border border-border">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-sm text-foreground">Recent Applications</h3>
              <Link href="/admin/applications" className="text-xs text-[#F08301] hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-border">
              {stats!.recentApplications.map(app => (
                <div key={app.id} className="px-5 py-3 flex items-center justify-between hover:bg-muted/20 transition-colors">
                  <div>
                    <div className="text-sm font-medium text-foreground">{app.applicationNumber}</div>
                    {app.studentName && <div className="text-xs text-muted-foreground">{app.studentName}</div>}
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={app.status} />
                    <span className="text-xs text-muted-foreground">{new Date(app.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Leads */}
        {(isSAorAD || isCC || isEA) && (stats?.recentLeads?.length ?? 0) > 0 && (
          <div className="bg-card rounded-xl border border-border">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-sm text-foreground">Recent Leads</h3>
              <Link href="/admin/leads" className="text-xs text-[#F08301] hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-border">
              {stats!.recentLeads.map(lead => (
                <div key={lead.id} className="px-5 py-3 flex items-center justify-between hover:bg-muted/20 transition-colors">
                  <div className="text-sm font-medium text-foreground">{lead.studentName}</div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={lead.status} />
                    <span className="text-xs text-muted-foreground">{new Date(lead.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-card rounded-xl border border-border">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-semibold text-sm text-foreground">Quick Actions</h3>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3">
            {quickActions.map(a => (
              <Link key={a.href} href={a.href}>
                <div className="flex items-center gap-2.5 px-3 py-3 rounded-lg border border-border hover:bg-muted/40 hover:border-[#F08301]/30 transition-all text-sm font-medium cursor-pointer text-foreground">
                  <a.icon className={`w-4 h-4 ${a.color}`} />
                  {a.label}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
