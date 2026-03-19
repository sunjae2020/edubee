import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import axios from "axios";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, TrendingDown } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const CURRENCY_SYMBOLS: Record<string, string> = { AUD: "A$", USD: "$", SGD: "S$", PHP: "₱", THB: "฿", KRW: "₩", JPY: "¥", GBP: "£" };

function DualAmount({ amount, currency, audEquivalent }: { amount?: string | number | null; currency?: string | null; audEquivalent?: string | number | null }) {
  if (!amount) return <span className="text-muted-foreground">—</span>;
  const sym = CURRENCY_SYMBOLS[currency ?? "AUD"] ?? (currency ?? "AUD");
  const num = Number(amount);
  const aud = Number(audEquivalent);
  return (
    <span>
      <span className="font-semibold">{sym}{num.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      {currency && currency !== "AUD" && aud > 0 && (
        <span className="ml-2 text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">≈ A${aud.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      )}
    </span>
  );
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-[#FEF9C3] text-[#CA8A04] border-[#CA8A04]/20",
  processing: "bg-[#FEF0E3] text-[#F5821F] border-[#F5821F]/20",
  settled: "bg-[#DCFCE7] text-[#16A34A] border-[#16A34A]/20",
  disputed: "bg-[#FEF2F2] text-[#DC2626] border-[#DC2626]/20",
};

function StatusBadge({ status }: { status?: string | null }) {
  const s = (status ?? "pending").toLowerCase();
  return <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border capitalize ${STATUS_COLORS[s] ?? "bg-[#F4F3F1] text-[#57534E] border-[#E8E6E2]"}`}>{s}</span>;
}

interface Rec { id: string; contractId?: string | null; serviceDescription?: string | null; grossAmount?: string | null; commissionRate?: string | null; commissionAmount?: string | null; netAmount?: string | null; currency?: string | null; originalCurrency?: string | null; originalNetAmount?: string | null; audEquivalent?: string | null; status?: string | null; settlementDate?: string | null; createdAt?: string | null; }

export default function MySettlements() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: settlements, isLoading } = useQuery({
    queryKey: ["my-settlements"],
    queryFn: () => axios.get(`${BASE}/api/my-accounting/settlements`).then(r => r.data),
  });

  const { data: summary } = useQuery({
    queryKey: ["my-settlements-summary"],
    queryFn: () => axios.get(`${BASE}/api/my-accounting/settlements/summary`).then(r => r.data),
  });

  const rows: Rec[] = settlements?.data ?? [];
  const filtered = statusFilter === "all" ? rows : rows.filter(r => r.status === statusFilter);

  const isCC = user?.role === "camp_coordinator";

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-lg bg-[#F5821F]/10 flex items-center justify-center"><DollarSign className="w-5 h-5 text-[#F5821F]" /></div>
        <div><h1 className="text-lg font-bold">My Settlements</h1><p className="text-xs text-muted-foreground">Your earnings and payout history</p></div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {[
          { label: "Total Earned (Net)", value: summary?.totalEarned != null ? `A$${Number(summary.totalEarned).toLocaleString("en-AU", { minimumFractionDigits: 2 })}` : "—", color: "text-[#16A34A]" },
          { label: "Pending Payout", value: summary?.pending != null ? `A$${Number(summary.pending).toLocaleString("en-AU", { minimumFractionDigits: 2 })}` : "—", color: "text-[#CA8A04]" },
          { label: "Paid Out", value: summary?.paid != null ? `A$${Number(summary.paid).toLocaleString("en-AU", { minimumFractionDigits: 2 })}` : "—" },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-lg border p-4">
            <div className="text-xs text-muted-foreground font-medium mb-1">{k.label}</div>
            <div className={`text-xl font-bold ${k.color ?? ""}`}>{k.value}</div>
          </div>
        ))}
      </div>

      {isCC && (
        <div className="bg-[#FEF9C3] border border-[#CA8A04]/20 rounded-lg p-3 flex items-start gap-2 text-sm">
          <TrendingDown className="w-4 h-4 text-[#CA8A04] mt-0.5 shrink-0" />
          <div><span className="font-medium text-[#CA8A04]">Platform commission deducted:</span><span className="text-[#CA8A04]"> Net amounts shown are after platform commission (typically 10%) has been deducted from your gross revenue.</span></div>
        </div>
      )}

      {/* Status Filter */}
      <div className="flex items-center gap-2">
        {["all","pending","processing","settled","disputed"].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all capitalize ${statusFilter === s ? "bg-[#F5821F] text-white border-[#F5821F]" : "border-muted-foreground/30 text-muted-foreground hover:border-[#F5821F]/50"}`}>
            {s}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground"><DollarSign className="w-10 h-10 mx-auto mb-3 opacity-30" /><p className="text-sm">No settlements yet</p></div>
      ) : (
        <div className="rounded-lg border overflow-x-auto bg-white">
          <table className="w-full min-w-[800px] text-sm">
            <thead><tr className="border-b bg-muted/30">
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Contract</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Description</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Gross</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Commission</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Net (You Receive)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Settlement Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Status</th>
            </tr></thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-[#FEF0E3]">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.contractId?.slice(0, 8) ?? "—"}</td>
                  <td className="px-4 py-3 text-xs max-w-[180px] truncate">{r.serviceDescription ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-sm"><DualAmount amount={r.grossAmount} currency={r.originalCurrency ?? r.currency} audEquivalent={r.audEquivalent} /></td>
                  <td className="px-4 py-3 text-right text-sm text-[#DC2626]">
                    {r.commissionAmount ? `− A$${Number(r.commissionAmount).toFixed(2)} (${r.commissionRate}%)` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-[#16A34A]"><DualAmount amount={r.netAmount} currency={r.currency} /></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{r.settlementDate ?? "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
