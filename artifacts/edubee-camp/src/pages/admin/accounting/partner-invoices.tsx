import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { ListPagination } from "@/components/ui/list-pagination";
import { useToast } from "@/hooks/use-toast";
import { Handshake, Send, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { SortableTh, useSortState, useSorted } from "@/components/ui/sortable-th";

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

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-[#F4F3F1] text-[#57534E] border-[#E8E6E2]",
  sent: "bg-[#FEF0E3] text-[#F5821F] border-[#F5821F]/20",
  paid: "bg-[#DCFCE7] text-[#16A34A] border-[#16A34A]/20",
  overdue: "bg-[#FEF2F2] text-[#DC2626] border-[#DC2626]/20",
  cancelled: "bg-[#F4F3F1] text-[#A8A29E] border-[#E8E6E2]",
};

function StatusBadge({ status }: { status?: string | null }) {
  const s = (status ?? "draft").toLowerCase();
  return <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border capitalize ${STATUS_COLORS[s] ?? "bg-[#F4F3F1] text-[#57534E] border-[#E8E6E2]"}`}>{s}</span>;
}

const STATUSES = ["draft", "sent", "paid", "overdue", "cancelled"];
const PAGE_SIZE = 10;

interface Invoice {
  id: string; invoiceNumber?: string | null; contractId?: string | null;
  studentName?: string | null; invoiceType?: string | null;
  totalAmount?: string | null; currency?: string | null;
  originalCurrency?: string | null; originalAmount?: string | null; audEquivalent?: string | null;
  status?: string | null; issuedAt?: string | null; dueDate?: string | null; notes?: string | null;
}

export default function PartnerInvoices() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const { sortBy, sortDir, onSort } = useSortState();
  const [activeStatus, setActiveStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Invoice | null>(null);

  const queryKey = ["invoices-partner", { search, status: activeStatus, page }];
  const { data: resp, isLoading } = useQuery({
    queryKey,
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE), invoiceType: "partner" });
      if (search) params.set("search", search);
      if (activeStatus !== "all") params.set("status", activeStatus);
      return axios.get(`${BASE}/api/invoices?${params}`).then(r => r.data);
    },
  });
  const rows: Invoice[] = resp?.data ?? [];
  const sorted = useSorted(rows, sortBy, sortDir);
  const total: number = resp?.meta?.total ?? rows.length;

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Invoice> }) =>
      axios.put(`${BASE}/api/invoices/${id}`, payload).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["invoices-partner"] }); toast({ title: "Invoice updated" }); setSelected(null); },
  });

  return (
    <div className="space-y-4">
      <ListToolbar
        search={search} onSearch={v => { setSearch(v); setPage(1); }}
        statuses={STATUSES} activeStatus={activeStatus} onStatusChange={s => { setActiveStatus(s); setPage(1); }}
        total={total} addLabel="New Invoice" onAdd={() => toast({ title: "Coming soon" })}
      />

      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <>
              <SortableTh key="Invoice #" col="invoiceNumber" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left">Invoice #</SortableTh>
              <SortableTh key="Student" col="studentName" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left">Student</SortableTh>
              <SortableTh key="Provider Type" col="providerType" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left">Provider Type</SortableTh>
              <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left">Amount</th>
              <SortableTh key="Due" col="dueDate" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left">Due</SortableTh>
              <SortableTh key="Status" col="status" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left">Status</SortableTh>
              <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left w-20" />
            </>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              [...Array(PAGE_SIZE)].map((_, i) => (
                <tr key={i}>{[...Array(7)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>)}</tr>
              ))
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-16 text-center text-muted-foreground text-sm">
                <Handshake className="w-8 h-8 mx-auto mb-3 opacity-30" />No partner invoices found
              </td></tr>
            ) : sorted.map(r => (
              <tr key={r.id} className="hover:bg-[#FEF0E3] transition-colors cursor-pointer" onClick={() => setSelected(r)}>
                <td className="px-4 py-3 font-mono text-xs font-medium text-foreground">{r.invoiceNumber ?? "—"}</td>
                <td className="px-4 py-3 font-medium text-foreground">{r.studentName ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 bg-muted rounded text-xs capitalize">{r.invoiceType?.replace("partner_", "") ?? "—"}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <DualAmount amount={r.originalAmount ?? r.totalAmount} currency={r.originalCurrency ?? r.currency} audEquivalent={r.audEquivalent} />
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{r.dueDate ?? "—"}</td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-4 py-3">
                  {r.status === "sent" ? (
                    <Button size="sm" className="h-6 text-[10px] px-2 bg-[#16A34A] hover:bg-[#15803D] text-white" onClick={e => { e.stopPropagation(); updateMutation.mutate({ id: r.id, payload: { status: "paid", paidAt: new Date().toISOString() } }); }}>Mark Paid</Button>
                  ) : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ListPagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />

      <Sheet open={!!selected} onOpenChange={o => { if (!o) setSelected(null); }}>
        <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto bg-background">
          <SheetHeader><SheetTitle>Partner Invoice {selected?.invoiceNumber}</SheetTitle></SheetHeader>
          {selected && (
            <div className="mt-4 space-y-4">
              <StatusBadge status={selected.status} />
              <div className="bg-muted/30 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Student</span><span className="font-medium">{selected.studentName ?? "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Provider Type</span><span className="capitalize">{selected.invoiceType?.replace("partner_", "") ?? "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><DualAmount amount={selected.originalAmount ?? selected.totalAmount} currency={selected.originalCurrency ?? selected.currency} audEquivalent={selected.audEquivalent} /></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Due</span><span>{selected.dueDate ?? "—"}</span></div>
              </div>
              <div className="flex gap-2 pt-2">
                {selected.status === "draft" && <Button size="sm" className="bg-[#F5821F] hover:bg-[#d97706] text-white gap-1.5" onClick={() => updateMutation.mutate({ id: selected.id, payload: { status: "sent", issuedAt: new Date().toISOString() } })}><Send className="w-3.5 h-3.5" /> Send</Button>}
                {selected.status === "sent" && <Button size="sm" className="bg-[#16A34A] hover:bg-[#15803D] text-white" onClick={() => updateMutation.mutate({ id: selected.id, payload: { status: "paid", paidAt: new Date().toISOString() } })}>Mark Paid</Button>}
                <Button size="sm" variant="outline" onClick={() => setSelected(null)}>Close</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
