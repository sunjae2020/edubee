import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, Cell,
} from "recharts";
import {
  FileText, Users, TrendingUp, DollarSign, BarChart2, Briefcase,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const fmtAUD = (n: number) =>
  n >= 1_000_000
    ? `A$${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
    ? `A$${(n / 1_000).toFixed(1)}K`
    : `A$${n.toLocaleString("en-AU", { minimumFractionDigits: 0 })}`;

const SERVICE_COLORS: Record<string, string> = {
  study_abroad: "var(--e-orange)",
  camp:         "#16A34A",
  guardian:     "#CA8A04",
  other:        "#A8A29E",
};
const SERVICE_LABELS: Record<string, string> = {
  study_abroad: "Study Abroad",
  camp:         "Camp",
  guardian:     "Guardian",
  other:        "Other",
};

const FUNNEL_COLORS: Record<string, string> = {
  new:         "#A8A29E",
  open:        "#3B82F6",
  in_progress: "var(--e-orange)",
  qualified:   "#16A34A",
  unqualified: "#DC2626",
};

const TIER_STYLES: Record<string, string> = {
  platinum: "bg-[--e-orange-lt] text-[--e-orange]",
  gold:     "bg-[#FEF9C3] text-[#CA8A04]",
  silver:   "bg-[#F4F3F1] text-[#57534E]",
  standard: "bg-[#F4F3F1] text-[#A8A29E]",
};

interface KpiData {
  activeContracts:  number;
  newLeads:         number;
  arOutstanding:    number;
  apPending:        number;
  commissionYtd:    number;
  campRevenueYtd:   number;
}
interface RevenueRow   { month: string; service_type: string; total: string }
interface FunnelRow    { status: string; count: number }
interface AgingRow     { bucket: string; count: number; amount: number; pct: number }
interface StaffKpiRow  {
  id: string; staff_name: string; staff_id: string;
  lead_count: number; conversion_count: number; conversion_rate: string | null;
  attributed_revenue: string; incentive_amount: string;
  bonus_tier: string | null; status: string;
}

function KpiCard({ icon: Icon, label, value, sub }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl px-6 py-5 flex items-start gap-4"
      style={{ border: "1px solid #E8E6E2" }}>
      <div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0"
        style={{ background: "var(--e-orange-lt)" }}>
        <Icon className="w-5 h-5" style={{ color: "var(--e-orange)" }} strokeWidth={1.8} />
      </div>
      <div className="min-w-0">
        <div className="text-[28px] font-bold leading-none" style={{ color: "#1C1917" }}>{value}</div>
        <div className="text-[13px] mt-1" style={{ color: "#57534E" }}>{label}</div>
        {sub && <div className="text-xs mt-0.5" style={{ color: "#A8A29E" }}>{sub}</div>}
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl" style={{ border: "1px solid #E8E6E2" }}>
      <div className="px-5 py-4" style={{ borderBottom: "1px solid #E8E6E2" }}>
        <h3 className="font-semibold text-sm" style={{ color: "#1C1917" }}>{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

const MONTH_FMT = (ym: string) => {
  const [y, m] = ym.split("-");
  const dt = new Date(Number(y), Number(m) - 1);
  return dt.toLocaleString("en-AU", { month: "short", year: "2-digit" });
};

export default function DashboardCrmPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isSA = user?.role === "super_admin";
  const isSAorAD = isSA || user?.role === "admin";
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: kpi,     isLoading: kpiLoading }     = useQuery<KpiData>({
    queryKey: ["crm-kpi"],
    queryFn:  () => axios.get(`${BASE}/api/dashboard/crm/kpi`).then(r => r.data),
    enabled: isSAorAD,
  });
  const { data: revData }  = useQuery<{ data: RevenueRow[] }>({
    queryKey: ["crm-revenue"],
    queryFn:  () => axios.get(`${BASE}/api/dashboard/crm/revenue`).then(r => r.data),
    enabled: isSAorAD,
  });
  const { data: funnelData } = useQuery<{ data: FunnelRow[] }>({
    queryKey: ["crm-funnel"],
    queryFn:  () => axios.get(`${BASE}/api/dashboard/crm/funnel`).then(r => r.data),
    enabled: isSAorAD,
  });
  const { data: agingData } = useQuery<{ data: AgingRow[]; total: number }>({
    queryKey: ["crm-ar-aging"],
    queryFn:  () => axios.get(`${BASE}/api/dashboard/crm/ar-aging`).then(r => r.data),
    enabled: isSAorAD,
  });
  const { data: staffData } = useQuery<{ data: StaffKpiRow[] }>({
    queryKey: ["crm-staff-kpi"],
    queryFn:  () => axios.get(`${BASE}/api/dashboard/crm/staff-kpi`).then(r => r.data),
    enabled: isSAorAD,
  });

  const approveMutation = useMutation({
    mutationFn: (ids: string[]) =>
      axios.patch(`${BASE}/api/dashboard/crm/staff-kpi/approve`, { ids }).then(r => r.data),
    onSuccess: (data) => {
      toast({ title: `${data.approved} incentive(s) approved` });
      setSelectedIds(new Set());
      qc.invalidateQueries({ queryKey: ["crm-staff-kpi"] });
    },
    onError: () => toast({ title: "Approval failed", variant: "destructive" }),
  });

  const revenueChart = useMemo(() => {
    const rows: RevenueRow[] = revData?.data ?? [];
    const months = [...new Set(rows.map(r => r.month))].sort();
    const serviceTypes = [...new Set(rows.map(r => r.service_type))];
    return months.map(m => {
      const entry: Record<string, any> = { month: MONTH_FMT(m) };
      for (const st of serviceTypes) {
        const row = rows.find(r => r.month === m && r.service_type === st);
        entry[st] = row ? Number(row.total) : 0;
      }
      return entry;
    });
  }, [revData]);

  const revenueServiceTypes = useMemo(() => {
    const rows: RevenueRow[] = revData?.data ?? [];
    return [...new Set(rows.map(r => r.service_type))];
  }, [revData]);

  const funnelRows: FunnelRow[] = funnelData?.data ?? [];
  const newCount       = funnelRows.find(r => r.status === "new")?.count ?? 0;
  const qualifiedCount = funnelRows.find(r => r.status === "qualified")?.count ?? 0;
  const convRate       = newCount > 0 ? Math.round((qualifiedCount / newCount) * 100) : 0;

  const agingRows: AgingRow[] = agingData?.data ?? [];
  const staffRows: StaffKpiRow[] = staffData?.data ?? [];

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleAll() {
    const pending = staffRows.filter(r => r.status === "draft").map(r => r.id);
    if (selectedIds.size === pending.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pending));
    }
  }

  if (kpiLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 rounded-lg w-64 animate-pulse" style={{ background: "#F4F3F1" }} />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-24 rounded-xl animate-pulse" style={{ background: "#F4F3F1" }} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#1C1917" }}>CRM Dashboard</h1>
        <p className="text-sm mt-0.5" style={{ color: "#57534E" }}>Revenue, pipeline, and staff performance overview</p>
      </div>

      {/* Row 1 — 6 KPI cards in 2 rows of 3 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard icon={FileText}   label="Active Contracts"     value={kpi?.activeContracts ?? 0} />
        <KpiCard icon={Users}      label="New Leads This Month" value={kpi?.newLeads ?? 0} />
        <KpiCard icon={TrendingUp} label="AR Outstanding"       value={fmtAUD(kpi?.arOutstanding ?? 0)} />
        <KpiCard icon={DollarSign} label="AP Pending"           value={fmtAUD(kpi?.apPending ?? 0)} />
        <KpiCard icon={Briefcase}  label="Commission YTD"       value={fmtAUD(kpi?.commissionYtd ?? 0)} />
        <KpiCard icon={BarChart2}  label="Camp Revenue YTD"     value={fmtAUD(kpi?.campRevenueYtd ?? 0)} />
      </div>

      {/* Row 2 — 2 charts 50/50 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="Monthly Revenue by Service Type (last 6 months)">
          {revenueChart.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-stone-400 text-sm">No revenue data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenueChart} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F4F3F1" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E8E6E2" }}
                  formatter={(v: number, name: string) => [fmtAUD(v), SERVICE_LABELS[name] ?? name]}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11 }}
                  formatter={(name: string) => SERVICE_LABELS[name] ?? name}
                />
                {revenueServiceTypes.map(st => (
                  <Bar key={st} dataKey={st} stackId="a" fill={SERVICE_COLORS[st] ?? "#A8A29E"} radius={revenueServiceTypes[revenueServiceTypes.length - 1] === st ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title={`Lead Funnel — Conversion Rate: ${convRate}%`}>
          {funnelRows.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-stone-400 text-sm">No lead data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={funnelRows.map(r => ({ ...r, fill: FUNNEL_COLORS[r.status] ?? "#A8A29E" }))}
                layout="vertical"
                barSize={20}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F4F3F1" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="status"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={90}
                  tickFormatter={v => v.replace(/_/g, " ")}
                />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E8E6E2" }}
                  formatter={(v) => [v, "Leads"]}
                  labelFormatter={(l) => String(l).replace(/_/g, " ")}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {funnelRows.map((r, i) => (
                    <Cell key={i} fill={FUNNEL_COLORS[r.status] ?? "#A8A29E"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Row 3 — AR Aging table */}
      <div className="bg-white rounded-xl" style={{ border: "1px solid #E8E6E2" }}>
        <div className="px-5 py-4" style={{ borderBottom: "1px solid #E8E6E2" }}>
          <h3 className="font-semibold text-sm" style={{ color: "#1C1917" }}>AR Aging</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid #E8E6E2" }}>
                {["Aging", "Count", "Amount (AUD)", "% of Total"].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold" style={{ color: "#57534E" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agingRows.length === 0 ? (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-stone-400 text-sm">No outstanding AR items</td></tr>
              ) : agingRows.map(row => {
                const is90plus = row.bucket === "90+";
                return (
                  <tr key={row.bucket} className="hover:bg-[#FAFAF9]" style={{ borderBottom: "1px solid #F4F3F1" }}>
                    <td className="px-5 py-3 font-medium" style={{ color: is90plus ? "#DC2626" : "#1C1917", fontWeight: is90plus ? 700 : 500 }}>
                      {row.bucket === "current" ? "Current" : `${row.bucket} days`}
                    </td>
                    <td className="px-5 py-3" style={{ color: is90plus ? "#DC2626" : "#57534E" }}>{row.count}</td>
                    <td className="px-5 py-3 font-medium" style={{ color: is90plus ? "#DC2626" : "#1C1917" }}>
                      {fmtAUD(row.amount)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: "#F4F3F1" }}>
                          <div className="h-full rounded-full" style={{ width: `${row.pct}%`, background: is90plus ? "#DC2626" : "var(--e-orange)" }} />
                        </div>
                        <span className="text-xs" style={{ color: is90plus ? "#DC2626" : "#57534E" }}>{row.pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row 4 — Staff KPI (SA/Admin only) */}
      {isSAorAD && (
        <div className="bg-white rounded-xl" style={{ border: "1px solid #E8E6E2" }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #E8E6E2" }}>
            <div>
              <h3 className="font-semibold text-sm" style={{ color: "#1C1917" }}>Staff KPI — Current Month</h3>
              {selectedIds.size > 0 && (
                <p className="text-xs mt-0.5" style={{ color: "#57534E" }}>{selectedIds.size} selected</p>
              )}
            </div>
            {isSA && selectedIds.size > 0 && (
              <Button
                onClick={() => approveMutation.mutate([...selectedIds])}
                disabled={approveMutation.isPending}
                className="text-white text-sm h-8 px-4"
                style={{ background: "var(--e-orange)" }}
              >
                {approveMutation.isPending ? "Approving…" : `Approve Incentives (${selectedIds.size})`}
              </Button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid #E8E6E2" }}>
                  {isSA && (
                    <th className="px-4 py-3 w-8">
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={staffRows.filter(r => r.status === "draft").length > 0 &&
                          selectedIds.size === staffRows.filter(r => r.status === "draft").length}
                        onChange={toggleAll}
                      />
                    </th>
                  )}
                  {["Staff", "Leads", "Converted", "Conv. Rate", "Revenue", "Incentive", "Tier", "Status"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "#57534E" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staffRows.length === 0 ? (
                  <tr>
                    <td colSpan={isSA ? 9 : 8} className="px-5 py-8 text-center text-stone-400 text-sm">
                      No staff KPI data for this month
                    </td>
                  </tr>
                ) : staffRows.map(row => {
                  const tier    = (row.bonus_tier ?? "standard").toLowerCase();
                  const tierCls = TIER_STYLES[tier] ?? TIER_STYLES.standard;
                  const isDraft = row.status === "draft";
                  const checked = selectedIds.has(row.id);
                  return (
                    <tr key={row.id} className="hover:bg-[#FAFAF9]" style={{ borderBottom: "1px solid #F4F3F1" }}>
                      {isSA && (
                        <td className="px-4 py-3">
                          {isDraft && (
                            <input type="checkbox" className="rounded" checked={checked} onChange={() => toggleSelect(row.id)} />
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3 font-medium" style={{ color: "#1C1917" }}>{row.staff_name}</td>
                      <td className="px-4 py-3" style={{ color: "#57534E" }}>{row.lead_count}</td>
                      <td className="px-4 py-3" style={{ color: "#57534E" }}>{row.conversion_count}</td>
                      <td className="px-4 py-3" style={{ color: "#57534E" }}>
                        {row.conversion_rate != null ? `${(Number(row.conversion_rate) * 100).toFixed(1)}%` : "—"}
                      </td>
                      <td className="px-4 py-3 font-medium" style={{ color: "#1C1917" }}>{fmtAUD(Number(row.attributed_revenue))}</td>
                      <td className="px-4 py-3 font-medium" style={{ color: "var(--e-orange)" }}>{fmtAUD(Number(row.incentive_amount))}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${tierCls}`}>{tier}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                          row.status === "approved" ? "bg-[#DCFCE7] text-[#16A34A]" :
                          row.status === "paid"     ? "bg-[#EFF6FF] text-[#3B82F6]" :
                          "bg-[#F4F3F1] text-[#57534E]"
                        }`}>{row.status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
