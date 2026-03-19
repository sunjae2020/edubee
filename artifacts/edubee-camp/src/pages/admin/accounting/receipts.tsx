import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { ListPagination } from "@/components/ui/list-pagination";
import { ClipboardList, ChevronRight } from "lucide-react";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const PAGE_SIZE = 10;
const STATUSES = ["pending", "verified", "rejected"];

const CURRENCY_SYMBOLS: Record<string, string> = { AUD: "A$", USD: "$", SGD: "S$", PHP: "₱", THB: "฿", KRW: "₩", JPY: "¥", GBP: "£" };

function StatusBadge({ status }: { status?: string | null }) {
  const s = (status ?? "pending").toLowerCase();
  const map: Record<string, string> = {
    pending: "bg-[#FEF9C3] text-[#CA8A04]", verified: "bg-[#DCFCE7] text-[#16A34A]", rejected: "bg-[#FEF2F2] text-[#DC2626]",
  };
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${map[s] ?? "bg-[#F4F3F1] text-[#57534E]"}`}>{s}</span>;
}

interface Receipt {
  id: string; receiptNumber?: string | null; invoiceId?: string | null;
  studentName?: string | null; payerName?: string | null;
  amount?: string | null; currency?: string | null; paymentMethod?: string | null;
  paymentDate?: string | null; referenceNumber?: string | null; status?: string | null; notes?: string | null;
}

export default function Receipts() {
  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Receipt | null>(null);

  const queryKey = ["receipts", { search, status: activeStatus, page }];
  const { data: resp, isLoading } = useQuery({
    queryKey,
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (search) params.set("search", search);
      if (activeStatus !== "all") params.set("status", activeStatus);
      return axios.get(`${BASE}/api/receipts?${params}`).then(r => r.data);
    },
  });
  const rows: Receipt[] = resp?.data ?? [];
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
        statuses={STATUSES} activeStatus={activeStatus} onStatusChange={s => { setActiveStatus(s); setPage(1); }}
        total={total}
        csvExportTable="receipts"
      />

      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {["Receipt #", "Student", "Payer", "Amount", "Method", "Date", "Status", ""].map(h => (
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
                <ClipboardList className="w-8 h-8 mx-auto mb-3 opacity-30" />No receipts found
              </td></tr>
            ) : rows.map(r => (
              <tr key={r.id} className="hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => setSelected(r)}>
                <td className="px-4 py-3 font-mono text-xs font-medium text-foreground">{r.receiptNumber ?? "—"}</td>
                <td className="px-4 py-3 font-medium text-foreground">{r.studentName ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.payerName ?? "—"}</td>
                <td className="px-4 py-3 font-medium text-foreground">{fmtAmount(r.amount, r.currency)}</td>
                <td className="px-4 py-3 text-muted-foreground capitalize">{r.paymentMethod?.replace(/_/g, " ") ?? "—"}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{r.paymentDate ? format(new Date(r.paymentDate), "MMM d, yyyy") : "—"}</td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-muted-foreground" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ListPagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />

      <Sheet open={!!selected} onOpenChange={o => { if (!o) setSelected(null); }}>
        <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto bg-background">
          <SheetHeader><SheetTitle>Receipt {selected?.receiptNumber}</SheetTitle></SheetHeader>
          {selected && (
            <div className="mt-4 space-y-4">
              <StatusBadge status={selected.status} />
              <div className="bg-muted/30 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Student</span><span className="font-medium">{selected.studentName ?? "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Payer</span><span className="font-medium">{selected.payerName ?? "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-semibold">{fmtAmount(selected.amount, selected.currency)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Method</span><span className="capitalize">{selected.paymentMethod?.replace(/_/g, " ") ?? "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{selected.paymentDate ? format(new Date(selected.paymentDate), "MMM d, yyyy") : "—"}</span></div>
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
