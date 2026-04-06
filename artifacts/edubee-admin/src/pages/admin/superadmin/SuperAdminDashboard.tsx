import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Loader2, Building2, Users, GraduationCap, Package } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: any; sub?: string; icon: any; color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-[#E8E6E2] p-5" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-[#A8A29E] uppercase tracking-wide">{label}</p>
          <p className="text-3xl font-bold text-[#1C1917] mt-1">{value}</p>
          {sub && <p className="text-xs text-[#A8A29E] mt-0.5">{sub}</p>}
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: color + "20" }}>
          <Icon size={20} style={{ color }} strokeWidth={1.5} />
        </div>
      </div>
    </div>
  );
}

export default function SuperAdminDashboard() {
  const { data: stats, isLoading } = useQuery<any>({
    queryKey: ["superadmin-stats"],
    queryFn: () => axios.get(`${BASE}/api/superadmin/stats`).then(r => r.data),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-48">
      <Loader2 size={24} className="animate-spin text-(--e-orange)" />
    </div>
  );

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-xl font-bold text-[#1C1917]">Platform Overview</h1>
        <p className="text-sm text-[#57534E] mt-1">All tenants and platform-wide metrics</p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total Tenants"   value={stats?.totalTenants ?? 0}
          sub={`${stats?.activeTenants ?? 0} active`}
          icon={Building2} color="var(--e-orange)"
        />
        <StatCard
          label="Trial Tenants"  value={stats?.trialTenants ?? 0}
          icon={Building2} color="#0369A1"
        />
        <StatCard
          label="Total Users"    value={stats?.totalUsers ?? 0}
          icon={Users} color="#15803D"
        />
        <StatCard
          label="Total Students" value={stats?.totalStudents ?? 0}
          icon={GraduationCap} color="#7C3AED"
        />
      </div>

      {/* Plan Distribution */}
      <div className="bg-white rounded-xl border border-[#E8E6E2] p-6" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <div className="flex items-center gap-2 mb-6">
          <Package size={16} className="text-(--e-orange)" strokeWidth={1.5} />
          <h2 className="text-sm font-semibold text-[#1C1917] uppercase tracking-wide">Plan Distribution</h2>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Starter",      key: "starter",      color: "#A8A29E" },
            { label: "Professional", key: "professional", color: "var(--e-orange)" },
            { label: "Enterprise",   key: "enterprise",   color: "#7C3AED" },
          ].map(({ label, key, color }) => {
            const count = stats?.planDistribution?.[key] ?? 0;
            const total = stats?.totalTenants ?? 1;
            const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <div key={key} className="text-center space-y-2">
                <p className="text-xs font-medium text-[#57534E] uppercase tracking-wide">{label}</p>
                <p className="text-2xl font-bold" style={{ color }}>{count}</p>
                <p className="text-xs text-[#A8A29E]">{pct}% of tenants</p>
                <div className="h-2 rounded-full bg-[#E8E6E2]">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
