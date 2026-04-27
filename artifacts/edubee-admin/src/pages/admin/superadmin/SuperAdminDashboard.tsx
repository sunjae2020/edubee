import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Loader2, Building2, Users, GraduationCap, Package, AlertTriangle, CheckCircle, Clock } from "lucide-react";

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

const PLAN_CONFIG: Array<{ label: string; key: string; color: string }> = [
  { label: "Solo",       key: "solo",       color: "#A8A29E"         },
  { label: "Starter",    key: "starter",    color: "var(--e-orange)" },
  { label: "Growth",     key: "growth",     color: "#15803D"         },
  { label: "Enterprise", key: "enterprise", color: "#7C3AED"         },
];

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

  const total = stats?.totalTenants ?? 1;
  const active    = stats?.activeTenants    ?? 0;
  const trial     = stats?.trialTenants     ?? 0;
  const suspended = stats?.suspendedTenants ?? 0;
  const cancelled = stats?.cancelledTenants ?? 0;

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-xl font-bold text-[#1C1917]">Platform Overview</h1>
        <p className="text-sm text-[#57534E] mt-1">All tenants and platform-wide metrics</p>
      </div>

      {/* Core Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total Tenants" value={stats?.totalTenants ?? 0}
          sub={`${active} active`}
          icon={Building2} color="var(--e-orange)"
        />
        <StatCard
          label="On Trial"  value={trial}
          sub="30-day trial accounts"
          icon={Clock} color="#0369A1"
        />
        <StatCard
          label="Total Accounts" value={stats?.totalAccounts ?? 0}
          icon={Users} color="#15803D"
        />
        <StatCard
          label="Total Students" value={stats?.totalStudents ?? 0}
          icon={GraduationCap} color="#7C3AED"
        />
      </div>

      {/* Tenant Health */}
      <div className="bg-white rounded-xl border border-[#E8E6E2] p-6" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <h2 className="text-sm font-semibold text-[#1C1917] uppercase tracking-wide mb-5">Tenant Health</h2>
        <div className="grid grid-cols-4 gap-6">
          {[
            { label: "Active",    count: active,    color: "#15803D", bg: "#F0FDF4",  icon: CheckCircle  },
            { label: "On Trial",  count: trial,     color: "#0369A1", bg: "#EFF6FF",  icon: Clock        },
            { label: "Suspended", count: suspended, color: "#CA8A04", bg: "#FEFCE8",  icon: AlertTriangle },
            { label: "Cancelled", count: cancelled, color: "#57534E", bg: "#F4F3F1",  icon: Building2    },
          ].map(({ label, count, color, bg, icon: Icon }) => {
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <div key={label} className="flex flex-col items-center gap-3 p-4 rounded-xl" style={{ background: bg }}>
                <Icon size={20} style={{ color }} strokeWidth={1.5} />
                <div className="text-center">
                  <p className="text-2xl font-bold" style={{ color }}>{count}</p>
                  <p className="text-xs font-medium text-[#57534E] mt-0.5">{label}</p>
                  <p className="text-[11px] text-[#A8A29E]">{pct}%</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Plan Distribution */}
      <div className="bg-white rounded-xl border border-[#E8E6E2] p-6" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <div className="flex items-center gap-2 mb-6">
          <Package size={16} className="text-(--e-orange)" strokeWidth={1.5} />
          <h2 className="text-sm font-semibold text-[#1C1917] uppercase tracking-wide">Plan Distribution</h2>
        </div>

        {/* Horizontal stacked bar */}
        <div className="h-4 rounded-full overflow-hidden flex mb-5 gap-0.5">
          {PLAN_CONFIG.map(({ key, color }) => {
            const count = stats?.planDistribution?.[key] ?? 0;
            const pct = total > 0 ? (count / total) * 100 : 0;
            return pct > 0 ? (
              <div key={key} style={{ width: `${pct}%`, background: color, minWidth: 4, transition: "width 600ms ease" }}
                title={`${key}: ${count}`} />
            ) : null;
          })}
        </div>

        <div className="grid grid-cols-4 gap-4">
          {PLAN_CONFIG.map(({ label, key, color }) => {
            const count = stats?.planDistribution?.[key] ?? 0;
            const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <div key={key} className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                  <p className="text-xs font-medium text-[#57534E]">{label}</p>
                </div>
                <p className="text-2xl font-bold" style={{ color }}>{count}</p>
                <p className="text-xs text-[#A8A29E]">{pct}% of tenants</p>
                <div className="h-1.5 rounded-full bg-[#E8E6E2]">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
