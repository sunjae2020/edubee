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
  draft: "#A8A29E",
  submitted: "#F5821F",
  under_review: "#CA8A04",
  approved: "#16A34A",
  contracted: "#16A34A",
  rejected: "#DC2626",
  cancelled: "#DC2626",
};

const PIE_COLORS = ["#F5821F", "#16A34A", "#CA8A04", "#A8A29E", "#57534E", "#DC2626"];

function StatCard({ icon: Icon, label, value, sub }: {
  icon: React.ElementType; label: string; value: number | string; sub?: string;
}) {
  return (
    <div
      className="bg-white rounded-xl p-5 flex items-start gap-4"
      style={{ border: "1px solid #E8E6E2", boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)" }}
    >
      <div
        className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0"
        style={{ background: "#FEF0E3", color: "#F5821F" }}
      >
        <Icon className="w-5 h-5" strokeWidth={1.8} />
      </div>
      <div className="min-w-0">
        <div className="text-[28px] font-bold leading-none" style={{ color: "#1C1917" }}>{value}</div>
        <div className="text-[13px] mt-1" style={{ color: "#57534E" }}>{label}</div>
        {sub && <div className="text-xs mt-0.5" style={{ color: "#A8A29E" }}>{sub}</div>}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase().replace(/_/g, ' ');
  let cls = "bg-[#F4F3F1] text-[#57534E]";
  if (['active', 'approved', 'contracted', 'confirmed', 'converted', 'completed'].includes(normalized))
    cls = "bg-[#DCFCE7] text-[#16A34A]";
  else if (['pending', 'under review', 'new', 'submitted', 'processing'].includes(normalized))
    cls = "bg-[#FEF9C3] text-[#CA8A04]";
  else if (['rejected', 'cancelled', 'lost'].includes(normalized))
    cls = "bg-[#FEF2F2] text-[#DC2626]";
  else if (['in progress', 'contacted', 'interview scheduled'].includes(normalized))
    cls = "bg-[#FEF0E3] text-[#F5821F]";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize whitespace-nowrap ${cls}`}>
      {normalized}
    </span>
  );
}

const QUICK_ACTIONS = {
  sales: [
    { icon: Target, label: "Leads CRM", href: "/admin/leads" },
    { icon: ClipboardList, label: "Applications", href: "/admin/applications" },
    { icon: FileText, label: "Contracts", href: "/admin/contracts" },
    { icon: CalendarCheck, label: "Interviews", href: "/admin/services/interviews" },
  ],
  partner: [
    { icon: GraduationCap, label: "My Institute", href: "/admin/services/institute" },
    { icon: Building2, label: "My Hotel", href: "/admin/services/hotel" },
    { icon: Car, label: "My Pickups", href: "/admin/services/pickup" },
    { icon: Map, label: "My Tours", href: "/admin/services/tour" },
    { icon: Banknote, label: "My Settlement", href: "/admin/my-accounting/settlements" },
  ],
  parent: [
    { icon: ClipboardList, label: "My Programs", href: "/admin/my-programs" },
    { icon: FileText, label: "My Contracts", href: "/admin/contracts" },
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
    fill: STATUS_COLORS[d.status] ?? "#A8A29E",
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
        <div className="h-8 rounded-lg w-64 animate-pulse" style={{ background: "#F4F3F1" }} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-xl animate-pulse" style={{ background: "#F4F3F1" }} />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[...Array(2)].map((_, i) => <div key={i} className="h-64 rounded-xl animate-pulse" style={{ background: "#F4F3F1" }} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold" style={{ color: "#1C1917" }}>
          {greeting()}, {effectiveUser?.fullName?.split(" ")[0]} 👋
        </h2>
        <p className="text-sm mt-0.5" style={{ color: "#57534E" }}>
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
              sub={`${stats?.activeLeads ?? 0} active`} />
          )}
          {(isSAorAD || isCC || isEA) && (
            <StatCard icon={ClipboardList} label="Applications" value={stats?.totalApplications ?? 0}
              sub={`${stats?.pendingApplications ?? 0} pending`} />
          )}
          {(isSAorAD || isCC) && (
            <StatCard icon={FileText} label="Contracts" value={stats?.totalContracts ?? 0}
              sub={`${stats?.activeContracts ?? 0} active`} />
          )}
          {isSAorAD && (
            <StatCard icon={Users} label="Users" value={stats?.totalUsers ?? 0}
              sub={`${stats?.activeUsers ?? 0} active`} />
          )}
          {isEA && (
            <StatCard icon={TrendingUp} label="Contracted" value={stats?.contractedApplications ?? 0}
              sub="converted to contract" />
          )}
        </div>
      )}

      {/* Partner / Parent — simple welcome block */}
      {(isPartner || isParent) && (
        <div
          className="rounded-xl border p-6"
          style={{ background: "#FEF0E3", borderColor: "rgba(245,130,31,0.3)" }}
        >
          <p className="text-sm mb-1" style={{ color: "#57534E" }}>Role</p>
          <p className="font-semibold capitalize" style={{ color: "#1C1917" }}>
            {effectiveRole.replace(/_/g, " ")}
          </p>
          {isPartner && <p className="text-xs mt-2" style={{ color: "#57534E" }}>Use the sidebar to access your assigned services and settlement records.</p>}
          {isParent && <p className="text-xs mt-2" style={{ color: "#57534E" }}>View your enrolled programs and upcoming schedules below.</p>}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Applications by Status Chart */}
        {isSales && chartData.length > 0 && (
          <div
            className="bg-white rounded-xl"
            style={{ border: "1px solid #E8E6E2", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
          >
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #E8E6E2" }}>
              <h3 className="font-semibold text-sm" style={{ color: "#1C1917" }}>Applications by Status</h3>
              <Link href="/admin/applications" className="text-xs flex items-center gap-1 font-medium hover:underline" style={{ color: "#F5821F" }}>
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="p-4">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} barSize={28}>
                  <XAxis dataKey="status" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={28} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E8E6E2" }}
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
          <div
            className="bg-white rounded-xl"
            style={{ border: "1px solid #E8E6E2", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
          >
            <div className="px-5 py-4" style={{ borderBottom: "1px solid #E8E6E2" }}>
              <h3 className="font-semibold text-sm" style={{ color: "#1C1917" }}>Application Distribution</h3>
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
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E8E6E2" }}
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
          <div
            className="bg-white rounded-xl"
            style={{ border: "1px solid #E8E6E2", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
          >
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #E8E6E2" }}>
              <h3 className="font-semibold text-sm" style={{ color: "#1C1917" }}>Recent Applications</h3>
              <Link href="/admin/applications" className="text-xs flex items-center gap-1 font-medium hover:underline" style={{ color: "#F5821F" }}>
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y" style={{ borderColor: "#F4F3F1" }}>
              {stats!.recentApplications.map(app => (
                <div key={app.id} className="px-5 py-3 flex items-center justify-between transition-colors hover:bg-[#FAFAF9]">
                  <div>
                    <div className="text-sm font-medium" style={{ color: "#1C1917" }}>{app.applicationNumber}</div>
                    {app.studentName && <div className="text-xs" style={{ color: "#57534E" }}>{app.studentName}</div>}
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={app.status} />
                    <span className="text-xs" style={{ color: "#A8A29E" }}>{new Date(app.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Leads */}
        {(isSAorAD || isCC || isEA) && (stats?.recentLeads?.length ?? 0) > 0 && (
          <div
            className="bg-white rounded-xl"
            style={{ border: "1px solid #E8E6E2", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
          >
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #E8E6E2" }}>
              <h3 className="font-semibold text-sm" style={{ color: "#1C1917" }}>Recent Leads</h3>
              <Link href="/admin/leads" className="text-xs flex items-center gap-1 font-medium hover:underline" style={{ color: "#F5821F" }}>
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y" style={{ borderColor: "#F4F3F1" }}>
              {stats!.recentLeads.map(lead => (
                <div key={lead.id} className="px-5 py-3 flex items-center justify-between transition-colors hover:bg-[#FAFAF9]">
                  <div className="text-sm font-medium" style={{ color: "#1C1917" }}>{lead.studentName}</div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={lead.status} />
                    <span className="text-xs" style={{ color: "#A8A29E" }}>{new Date(lead.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div
          className="bg-white rounded-xl"
          style={{ border: "1px solid #E8E6E2", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
        >
          <div className="px-5 py-4" style={{ borderBottom: "1px solid #E8E6E2" }}>
            <h3 className="font-semibold text-sm" style={{ color: "#1C1917" }}>Quick Actions</h3>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3">
            {quickActions.map(a => (
              <Link key={a.href} href={a.href}>
                <div
                  className="flex items-center gap-2.5 px-3 py-3 rounded-lg text-sm font-medium cursor-pointer transition-all"
                  style={{ border: "1px solid #E8E6E2", color: "#57534E" }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.background = "#FEF0E3";
                    (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(245,130,31,0.3)";
                    (e.currentTarget as HTMLDivElement).style.color = "#F5821F";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.background = "";
                    (e.currentTarget as HTMLDivElement).style.borderColor = "#E8E6E2";
                    (e.currentTarget as HTMLDivElement).style.color = "#57534E";
                  }}
                >
                  <a.icon className="w-4 h-4" strokeWidth={1.8} style={{ color: "#F5821F" }} />
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
