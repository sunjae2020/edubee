import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import axios from "axios";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, DollarSign, BarChart3 } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface RevenueData { totalYtd: number; totalCommission: number; netRevenue: number; byMonth: Array<{ month: string; amount: number }>; }

export default function MyRevenue() {
  const { user } = useAuth();

  const { data: revenue, isLoading } = useQuery<RevenueData>({
    queryKey: ["my-revenue"],
    queryFn: () => axios.get(`${BASE}/api/my-accounting/revenue`).then(r => r.data),
  });

  const { data: summaryData } = useQuery({
    queryKey: ["my-settlements-summary"],
    queryFn: () => axios.get(`${BASE}/api/my-accounting/settlements/summary`).then(r => r.data),
  });

  const byMonth = revenue?.byMonth ?? [];
  const maxAmount = Math.max(...byMonth.map(m => m.amount), 1);

  const isCC = user?.role === "camp_coordinator";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-lg bg-[#F5821F]/10 flex items-center justify-center"><BarChart3 className="w-5 h-5 text-[#F5821F]" /></div>
        <div><h1 className="text-lg font-bold">My Revenue</h1><p className="text-xs text-muted-foreground">Year-to-date earnings breakdown and monthly trend</p></div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {isLoading ? [...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />) : [
          {
            label: "Gross Revenue (YTD)",
            value: `A$${(revenue?.totalYtd ?? 0).toLocaleString("en-AU", { minimumFractionDigits: 2 })}`,
            sub: "Total before platform commission",
            icon: <TrendingUp className="w-4 h-4 text-[#16A34A]" />,
            color: "text-[#16A34A]",
          },
          {
            label: isCC ? "Platform Commission" : "Platform Fees",
            value: `A$${(revenue?.totalCommission ?? 0).toLocaleString("en-AU", { minimumFractionDigits: 2 })}`,
            sub: isCC ? "10% deducted by Edubee" : "Fees charged by Edubee",
            icon: <TrendingDown className="w-4 h-4 text-[#DC2626]" />,
            color: "text-[#DC2626]",
          },
          {
            label: "Net Revenue (YTD)",
            value: `A$${(revenue?.netRevenue ?? 0).toLocaleString("en-AU", { minimumFractionDigits: 2 })}`,
            sub: "What you actually receive",
            icon: <DollarSign className="w-4 h-4 text-[#F5821F]" />,
            color: "text-[#F5821F]",
          },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border p-4">
            <div className="flex items-center justify-between mb-2">{k.icon}<span className="text-xs text-muted-foreground font-medium">{k.label}</span></div>
            <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
            <p className="text-[11px] text-muted-foreground mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Monthly Revenue Chart */}
      <div className="bg-white rounded-xl border p-5">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-[#F5821F]" /> Monthly Revenue (Net)</h2>
        {isLoading ? <Skeleton className="h-40" /> : byMonth.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">No revenue data yet</div>
        ) : (
          <div className="space-y-3">
            {byMonth.map(m => {
              const pct = (m.amount / maxAmount) * 100;
              const [yr, mo] = m.month.split("-");
              const label = new Date(`${yr}-${mo}-01`).toLocaleDateString("en-AU", { month: "short", year: "2-digit" });
              return (
                <div key={m.month} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-12 text-right">{label}</span>
                  <div className="flex-1 bg-muted/30 rounded-full h-6 overflow-hidden">
                    <div className="h-full bg-[#F5821F] rounded-full flex items-center justify-end pr-2 transition-all duration-500" style={{ width: `${Math.max(pct, 1)}%` }}>
                      <span className="text-[10px] text-white font-medium">A${m.amount.toLocaleString("en-AU", { minimumFractionDigits: 0 })}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pending Payouts */}
      <div className="bg-white rounded-xl border p-5">
        <h2 className="text-sm font-semibold mb-3">Payout Status</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="text-center p-4 bg-[#FEF9C3] rounded-lg border border-[#CA8A04]/20">
            <div className="text-2xl font-bold text-[#CA8A04]">A${Number(summaryData?.pending ?? 0).toLocaleString("en-AU", { minimumFractionDigits: 2 })}</div>
            <div className="text-xs text-[#CA8A04] mt-1">Pending Payout</div>
          </div>
          <div className="text-center p-4 bg-[#DCFCE7] rounded-lg border border-[#16A34A]/20">
            <div className="text-2xl font-bold text-[#16A34A]">A${Number(summaryData?.paid ?? 0).toLocaleString("en-AU", { minimumFractionDigits: 2 })}</div>
            <div className="text-xs text-[#16A34A] mt-1">Paid Out</div>
          </div>
        </div>
      </div>
    </div>
  );
}
