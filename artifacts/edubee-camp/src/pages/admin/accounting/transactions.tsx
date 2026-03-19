import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { ListPagination } from "@/components/ui/list-pagination";
import { ArrowDownLeft, ArrowUpRight, ChevronRight } from "lucide-react";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const PAGE_SIZE = 10;
const TX_TYPES = ["credit", "debit"];

const CURRENCY_SYMBOLS: Record<string, string> = { AUD: "A$", USD: "$", SGD: "S$", PHP: "₱", THB: "฿", KRW: "₩", JPY: "¥", GBP: "£" };

interface Transaction {
  id: string; contractId?: string | null; invoiceId?: string | null;
  studentName?: string | null; transactionType?: string | null;
  amount?: string | null; currency?: string | null;
  description?: string | null; transactionDate?: string | null;
  paymentMethod?: string | null; referenceNumber?: string | null; notes?: string | null;
}

export default function Transactions() {
  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Transaction | null>(null);

  const queryKey = ["transactions", { search, status: activeStatus, page }];
  const { data: resp, isLoading } = useQuery({
    queryKey,
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (search) params.set("search", search);
      if (activeStatus !== "all") params.set("transactionType", activeStatus);
      return axios.get(`${BASE}/api/transactions?${params}`).then(r => r.data);
    },
  });
  const rows: Transaction[] = resp?.data ?? [];
  const total: number = resp?.meta?.total ?? rows.length;

  const fmtAmount = (amount?: string | number | null, currency?: string | null) => {
    if (!amount) return "—";
    const sym = CURRENCY_SYMBOLS[currency ?? "AUD"] ?? (currency ?? "AUD");
    return `${sym}${Number(amount).toLocaleString("en-AU", { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-4">
      <ListToolbar
        search={search} onSearch={v => { setSearch(v); setPage(1); }}
        statuses={TX_TYPES} filterLabel="Type"
        activeStatus={activeStatus} onStatusChange={s => { setActiveStatus(s); setPage(1); }}
        total={total}
        csvExportTable="transactions"
      />

      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {["Type", "Student", "Description", "Amount", "Method", "Date", "Ref #", ""].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              [...Array(PAGE_SIZE)].map((_, i) => (
                <tr key={i}>{[...Array(8)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>)}</tr>
              ))
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-16 text-center text-muted-foreground text-sm">
                <ArrowDownLeft className="w-8 h-8 mx-auto mb-3 opacity-30" />No transactions found
              </td></tr>
            ) : rows.map(r => (
              <tr key={r.id} className="hover:bg-[#FEF0E3] transition-colors cursor-pointer" onClick={() => setSelected(r)}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    {r.transactionType === "credit"
                      ? <ArrowDownLeft className="w-3.5 h-3.5 text-[#22C55E] shrink-0" />
                      : <ArrowUpRight className="w-3.5 h-3.5 text-[#DC2626] shrink-0" />}
                    <span className={`text-xs font-medium capitalize ${r.transactionType === "credit" ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
                      {r.transactionType ?? "—"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 font-medium text-foreground">{r.studentName ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground max-w-[180px] truncate">{r.description ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={`font-medium ${r.transactionType === "credit" ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
                    {r.transactionType === "credit" ? "+" : "−"}{fmtAmount(r.amount, r.currency)}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground capitalize">{r.paymentMethod?.replace(/_/g, " ") ?? "—"}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{r.transactionDate ? format(new Date(r.transactionDate), "MMM d, yyyy") : "—"}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.referenceNumber ?? "—"}</td>
                <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-muted-foreground" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ListPagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />

      <Sheet open={!!selected} onOpenChange={o => { if (!o) setSelected(null); }}>
        <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto bg-background">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {selected?.transactionType === "credit"
                ? <ArrowDownLeft className="w-4 h-4 text-[#22C55E]" />
                : <ArrowUpRight className="w-4 h-4 text-[#DC2626]" />}
              Transaction Detail
            </SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="mt-4 space-y-4">
              <div className={`text-2xl font-bold ${selected.transactionType === "credit" ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
                {selected.transactionType === "credit" ? "+" : "−"}{fmtAmount(selected.amount, selected.currency)}
              </div>
              <div className="bg-muted/30 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Student</span><span className="font-medium">{selected.studentName ?? "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="capitalize font-medium">{selected.transactionType ?? "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Description</span><span>{selected.description ?? "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Method</span><span className="capitalize">{selected.paymentMethod?.replace(/_/g, " ") ?? "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{selected.transactionDate ? format(new Date(selected.transactionDate), "MMM d, yyyy") : "—"}</span></div>
                {selected.referenceNumber && <div className="flex justify-between"><span className="text-muted-foreground">Reference</span><span className="font-mono text-xs">{selected.referenceNumber}</span></div>}
              </div>
              {selected.notes && <div><div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Notes</div><p className="text-sm">{selected.notes}</p></div>}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
