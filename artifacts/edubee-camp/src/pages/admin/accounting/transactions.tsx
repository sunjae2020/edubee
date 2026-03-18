import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpDown, TrendingUp, TrendingDown, Search } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const CURRENCY_SYMBOLS: Record<string, string> = { AUD: "A$", USD: "$", SGD: "S$", PHP: "₱", THB: "฿", KRW: "₩", JPY: "¥", GBP: "£" };

function DualAmount({ amount, currency, audEquivalent }: { amount?: string | number | null; currency?: string | null; audEquivalent?: string | number | null }) {
  if (!amount) return <span className="text-muted-foreground">—</span>;
  const sym = CURRENCY_SYMBOLS[currency ?? "AUD"] ?? (currency ?? "AUD");
  const num = Number(amount);
  const aud = Number(audEquivalent);
  return (
    <span>
      <span className="font-medium">{sym}{num.toLocaleString("en-AU", { minimumFractionDigits: 2 })}</span>
      {currency && currency !== "AUD" && aud > 0 && <span className="ml-1.5 text-[11px] text-muted-foreground">≈ A${aud.toFixed(2)}</span>}
    </span>
  );
}

interface Transaction { id: string; contractId?: string | null; invoiceId?: string | null; transactionType?: string; amount?: string | null; currency?: string | null; originalCurrency?: string | null; originalAmount?: string | null; audEquivalent?: string | null; description?: string | null; bankReference?: string | null; transactionDate?: string | null; }

const TYPE_COLORS: Record<string, { cls: string; icon: React.ReactNode }> = {
  payment: { cls: "text-green-700", icon: <TrendingUp className="w-3.5 h-3.5" /> },
  refund: { cls: "text-red-600", icon: <TrendingDown className="w-3.5 h-3.5" /> },
  payout: { cls: "text-blue-700", icon: <TrendingDown className="w-3.5 h-3.5" /> },
  commission: { cls: "text-purple-700", icon: <ArrowUpDown className="w-3.5 h-3.5" /> },
  adjustment: { cls: "text-yellow-700", icon: <ArrowUpDown className="w-3.5 h-3.5" /> },
};

export default function Transactions() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["transactions", page, typeFilter],
    queryFn: () => axios.get(`${BASE}/api/transactions?page=${page}&limit=20`).then(r => r.data),
  });
  const rows: Transaction[] = data?.data ?? [];
  const meta = data?.meta ?? { total: 0, totalPages: 1 };

  const filtered = rows.filter(r => {
    if (typeFilter !== "all" && r.transactionType !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return r.description?.toLowerCase().includes(q) || r.bankReference?.toLowerCase().includes(q) || r.contractId?.toLowerCase().includes(q);
    }
    return true;
  });

  const totalIn = rows.filter(r => r.transactionType === "payment").reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const totalOut = rows.filter(r => ["refund","payout"].includes(r.transactionType ?? "")).reduce((s, r) => s + Number(r.amount ?? 0), 0);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-lg bg-[#F08301]/10 flex items-center justify-center"><ArrowUpDown className="w-5 h-5 text-[#F08301]" /></div>
        <div><h1 className="text-lg font-bold">Transactions</h1><p className="text-xs text-muted-foreground">All financial movements — payments, payouts, refunds</p></div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: "Money In", value: `A$${totalIn.toLocaleString("en-AU", { minimumFractionDigits: 2 })}`, color: "text-green-700" },
          { label: "Money Out", value: `A$${totalOut.toLocaleString("en-AU", { minimumFractionDigits: 2 })}`, color: "text-red-600" },
          { label: "Net", value: `A$${(totalIn - totalOut).toLocaleString("en-AU", { minimumFractionDigits: 2 })}`, color: totalIn - totalOut >= 0 ? "text-green-700" : "text-red-600" },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-lg border p-3">
            <div className="text-xs text-muted-foreground font-medium mb-1">{k.label}</div>
            <div className={`text-base font-bold ${k.color}`}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search transactions…" className="pl-8 h-8 text-sm" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-8 text-sm w-36"><SelectValue placeholder="All types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {["payment","refund","payout","commission","adjustment"].map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <div className="space-y-2">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div> : (
        <div className="rounded-lg border overflow-x-auto bg-white">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/30">
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Description</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Bank Ref</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Date</th>
            </tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground text-sm">No transactions found</td></tr>
              ) : filtered.map(r => {
                const tc = TYPE_COLORS[r.transactionType ?? ""] ?? { cls: "", icon: <ArrowUpDown className="w-3.5 h-3.5" /> };
                return (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1.5 text-xs font-medium capitalize ${tc.cls}`}>{tc.icon}{r.transactionType ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-xs max-w-[200px] truncate">{r.description ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">{r.bankReference ?? "—"}</td>
                    <td className={`px-4 py-3 text-right ${tc.cls}`}><DualAmount amount={r.originalAmount ?? r.amount} currency={r.originalCurrency ?? r.currency} audEquivalent={r.audEquivalent} /></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{r.transactionDate ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-muted-foreground">Page {page} of {meta.totalPages} · {meta.total} total</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <Button size="sm" variant="outline" disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
