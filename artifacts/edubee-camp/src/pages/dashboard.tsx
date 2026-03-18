import { useAuth } from "@/hooks/use-auth";
import { useViewAs } from "@/hooks/use-view-as";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Link } from "wouter";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface DashboardStats {
  totalLeads: number; activeLeads: number;
  totalApplications: number; pendingApplications: number; contractedApplications: number;
  totalContracts: number; activeContracts: number;
  totalUsers: number; activeUsers: number;
  recentApplications: { id: string; applicationNumber: string; status: string; createdAt: string; studentName?: string }[];
  recentLeads: { id: string; studentName: string; status: string; createdAt: string }[];
}

function StatCard({ icon, label, value, sub, color = "orange" }: {
  icon: string; label: string; value: number | string; sub?: string;
  color?: "orange" | "blue" | "green" | "purple";
}) {
  const colors = {
    orange: "bg-orange-50 border-orange-100 text-orange-600",
    blue: "bg-blue-50 border-blue-100 text-blue-600",
    green: "bg-green-50 border-green-100 text-green-600",
    purple: "bg-purple-50 border-purple-100 text-purple-600",
  };
  return (
    <div className="bg-white rounded-xl border border-border p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg border ${colors[color]}`}>{icon}</div>
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
    new: "bg-blue-100 text-blue-700", contacted: "bg-yellow-100 text-yellow-700",
    qualified: "bg-indigo-100 text-indigo-700", proposal: "bg-purple-100 text-purple-700",
    submitted: "bg-orange-100 text-orange-700", under_review: "bg-amber-100 text-amber-700",
    approved: "bg-green-100 text-green-700", contracted: "bg-teal-100 text-teal-700",
    rejected: "bg-red-100 text-red-700", draft: "bg-gray-100 text-gray-700",
    active: "bg-green-100 text-green-700", completed: "bg-slate-100 text-slate-700",
    cancelled: "bg-red-100 text-red-700", converted: "bg-teal-100 text-teal-700",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? "bg-gray-100 text-gray-700"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { viewAsUser } = useViewAs();
  const effectiveRole = viewAsUser?.role ?? user?.role ?? "";

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],
    queryFn: () => axios.get(`${BASE}/api/dashboard/stats`).then(r => r.data),
  });

  const isSAorAD = effectiveRole === "super_admin" || effectiveRole === "admin";
  const isCC = effectiveRole === "camp_coordinator";
  const isEA = effectiveRole === "education_agent";
  const isSales = isSAorAD || isCC || isEA;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  };

  if (isLoading) {
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
          {greeting()}, {user?.fullName?.split(" ")[0]} 👋
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">Here's what's happening across Edubee Camp today.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {isSales && (
          <StatCard icon="🎯" label="Leads" value={stats?.totalLeads ?? 0} sub={`${stats?.activeLeads ?? 0} active`} color="orange" />
        )}
        {isSales && (
          <StatCard icon="📋" label="Applications" value={stats?.totalApplications ?? 0} sub={`${stats?.pendingApplications ?? 0} pending`} color="blue" />
        )}
        {(isSAorAD || isCC) && (
          <StatCard icon="📄" label="Contracts" value={stats?.totalContracts ?? 0} sub={`${stats?.activeContracts ?? 0} active`} color="green" />
        )}
        {isSAorAD && (
          <StatCard icon="👥" label="Users" value={stats?.totalUsers ?? 0} sub={`${stats?.activeUsers ?? 0} active`} color="purple" />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {isSales && (
          <div className="bg-white rounded-xl border border-border">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-sm">Recent Applications</h3>
              <Link href="/admin/applications" className="text-xs text-[#F08301] hover:underline">View all</Link>
            </div>
            <div className="divide-y divide-border">
              {stats?.recentApplications?.length ? stats.recentApplications.map(app => (
                <div key={app.id} className="px-5 py-3 flex items-center justify-between hover:bg-muted/20 transition-colors">
                  <div>
                    <div className="text-sm font-medium">{app.applicationNumber}</div>
                    {app.studentName && <div className="text-xs text-muted-foreground">{app.studentName}</div>}
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={app.status} />
                    <span className="text-xs text-muted-foreground">{new Date(app.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              )) : (
                <div className="px-5 py-10 text-center text-sm text-muted-foreground">No applications yet</div>
              )}
            </div>
          </div>
        )}

        {isSales && (
          <div className="bg-white rounded-xl border border-border">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-sm">Recent Leads</h3>
              <Link href="/admin/leads" className="text-xs text-[#F08301] hover:underline">View all</Link>
            </div>
            <div className="divide-y divide-border">
              {stats?.recentLeads?.length ? stats.recentLeads.map(lead => (
                <div key={lead.id} className="px-5 py-3 flex items-center justify-between hover:bg-muted/20 transition-colors">
                  <div className="text-sm font-medium">{lead.studentName}</div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={lead.status} />
                    <span className="text-xs text-muted-foreground">{new Date(lead.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              )) : (
                <div className="px-5 py-10 text-center text-sm text-muted-foreground">No leads yet</div>
              )}
            </div>
          </div>
        )}

        {(isSAorAD || isCC) && (
          <div className="bg-white rounded-xl border border-border">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="font-semibold text-sm">Quick Actions</h3>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              {[
                { emoji: "🎯", label: "Leads CRM", href: "/admin/leads" },
                { emoji: "📋", label: "Applications", href: "/admin/applications" },
                { emoji: "📄", label: "Contracts", href: "/admin/contracts" },
                { emoji: "📦", label: "Package Groups", href: "/admin/package-groups" },
              ].map(a => (
                <Link key={a.href} href={a.href}>
                  <div className="flex items-center gap-2.5 px-3 py-3 rounded-lg border border-border hover:bg-muted/40 hover:border-[#F08301]/30 transition-all text-sm font-medium cursor-pointer">
                    <span className="text-base">{a.emoji}</span>
                    {a.label}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
