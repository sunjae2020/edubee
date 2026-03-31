import { useState } from "react";
import { formatDate, formatDateTime } from "@/lib/date-format";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { TableFooter } from "@/components/ui/table-footer";
import { useToast } from "@/hooks/use-toast";
import { Receipt, Send, ChevronRight, CreditCard, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { SortableTh, useSortState, useSorted } from "@/components/ui/sortable-th";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const PAGE_SIZE = 10;
const STATUSES = ["draft", "sent", "partially_paid", "awaiting_receipt", "paid", "overdue", "cancelled", "refunded"];

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

function StatusBadge({ status }: { status?: string | null }) {
  const s = (status ?? "draft").toLowerCase();
  const map: Record<string, string> = {
    draft: "bg-[#F4F3F1] text-[#57534E]",
    sent: "bg-[#FEF0E3] text-[#F5821F]",
    paid: "bg-[#DCFCE7] text-[#16A34A]",
    overdue: "bg-[#FEF2F2] text-[#DC2626]",
    cancelled: "bg-[#F4F3F1] text-[#A8A29E]",
    partially_paid: "bg-yellow-100 text-yellow-700",
    awaiting_receipt: "bg-purple-100 text-purple-700",
    refunded: "bg-gray-100 text-gray-500",
  };
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${map[s] ?? "bg-[#F4F3F1] text-[#57534E]"}`}>{s.replace(/_/g, " ")}</span>;
}

interface Invoice {
  id: string; invoiceNumber?: string | null; contractId?: string | null;
  studentName?: string | null; invoiceType?: string | null;
  totalAmount?: string | null; currency?: string | null;
  originalCurrency?: string | null; originalAmount?: string | null; audEquivalent?: string | null;
  status?: string | null; issuedAt?: string | null; dueDate?: string | null;
  paidAt?: string | null; notes?: string | null;
}

interface RecordPaymentForm {
  amount: string;
  bankReference: string;
  transactionDate: string;
  notes: string;
}

function RecordPaymentModal({
  invoice,
  open,
  onClose,
  onSuccess,
}: {
  invoice: Invoice | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<RecordPaymentForm>({
    amount: invoice ? String(Number(invoice.totalAmount ?? 0).toFixed(2)) : "",
    bankReference: "",
    transactionDate: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const handleOpen = (inv: Invoice | null) => {
    setForm({
      amount: inv ? String(Number(inv.totalAmount ?? 0).toFixed(2)) : "",
      bankReference: "",
      transactionDate: new Date().toISOString().split("T")[0],
      notes: "",
    });
  };

  if (!invoice) return null;

  const handleSubmit = async () => {
    if (!form.amount || Number(form.amount) <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await axios.post(`${BASE}/api/transactions`, {
        transactionType: "payment_received",
        invoiceId: invoice.id,
        contractId: invoice.contractId,
        amount: Number(form.amount),
        currency: invoice.currency ?? "AUD",
        bankReference: form.bankReference || undefined,
        transactionDate: form.transactionDate,
        notes: form.notes || undefined,
      });
      toast({ title: "Payment recorded", description: `A$${Number(form.amount).toLocaleString()} recorded for ${invoice.invoiceNumber}` });
      onSuccess();
      onClose();
    } catch (e: any) {
      toast({ title: "Failed to record payment", description: e?.response?.data?.error ?? e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#F5821F]" />
            Record Payment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="bg-muted/30 rounded-lg p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Invoice</span>
              <span className="font-mono font-medium">{invoice.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Student</span>
              <span>{invoice.studentName ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Invoice Total</span>
              <span className="font-medium">
                <DualAmount amount={invoice.originalAmount ?? invoice.totalAmount} currency={invoice.originalCurrency ?? invoice.currency} audEquivalent={invoice.audEquivalent} />
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Transaction Type</Label>
            <Input value="Payment Received" disabled className="bg-muted text-muted-foreground" />
          </div>

          <div className="space-y-1">
            <Label>Amount (AUD)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-1">
            <Label>Transaction Date</Label>
            <Input
              type="date"
              value={form.transactionDate}
              onChange={e => setForm(f => ({ ...f, transactionDate: e.target.value }))}
            />
          </div>

          <div className="space-y-1">
            <Label>Bank Reference <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input
              value={form.bankReference}
              onChange={e => setForm(f => ({ ...f, bankReference: e.target.value }))}
              placeholder="e.g. BSB transfer ref #"
            />
          </div>

          <div className="space-y-1">
            <Label>Notes <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Additional notes"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button className="bg-[#F5821F] hover:bg-[#d97706] text-white" onClick={handleSubmit} disabled={saving}>
            {saving ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />Recording…</> : "Record Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ClientInvoices() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const { sortBy, sortDir, onSort } = useSortState();
  const [activeStatus, setActiveStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<Invoice | null>(null);

  const queryKey = ["invoices-client", { search, status: activeStatus, page, pageSize }];
  const { data: resp, isLoading } = useQuery({
    queryKey,
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: String(pageSize), invoiceType: "client" });
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["invoices-client"] }); toast({ title: "Invoice updated" }); setSelected(null); },
    onError: () => toast({ title: "Update failed", variant: "destructive" }),
  });

  const canRecordPayment = (status?: string | null) =>
    !["paid", "refunded", "cancelled"].includes(status ?? "");

  return (
    <div className="space-y-4">
      <ListToolbar
        search={search} onSearch={v => { setSearch(v); setPage(1); }}
        statuses={STATUSES} activeStatus={activeStatus} onStatusChange={s => { setActiveStatus(s); setPage(1); }}
        total={total} addLabel="New Invoice" onAdd={() => toast({ title: "Coming soon", description: "Invoice creation will open contract picker" })}
      />

      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <>
              <SortableTh key="Invoice #" col="invoiceNumber" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left">Invoice #</SortableTh>
              <SortableTh key="Student" col="studentName" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left">Student</SortableTh>
              <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left">Amount</th>
              <SortableTh key="Issued" col="issuedAt" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left">Issued</SortableTh>
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
                <Receipt className="w-8 h-8 mx-auto mb-3 opacity-30" />No client invoices found
              </td></tr>
            ) : sorted.map(r => (
              <tr key={r.id} className="hover:bg-[#FEF0E3] transition-colors cursor-pointer" onClick={() => setSelected(r)}>
                <td className="px-4 py-3 font-mono text-xs font-medium text-foreground">{r.invoiceNumber ?? "—"}</td>
                <td className="px-4 py-3 font-medium text-foreground">{r.studentName ?? "—"}</td>
                <td className="px-4 py-3 text-right">
                  <DualAmount amount={r.originalAmount ?? r.totalAmount} currency={r.originalCurrency ?? r.currency} audEquivalent={r.audEquivalent} />
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(r.issuedAt)}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{r.dueDate ?? "—"}</td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    {r.status === "draft" && (
                      <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 px-2" onClick={e => { e.stopPropagation(); updateMutation.mutate({ id: r.id, payload: { status: "sent", issuedAt: new Date().toISOString() } }); }}>
                        <Send className="w-2.5 h-2.5" /> Send
                      </Button>
                    )}
                    {canRecordPayment(r.status) && (
                      <Button
                        size="sm"
                        className="h-6 text-[10px] gap-1 px-2 bg-[#F5821F] hover:bg-[#d97706] text-white"
                        onClick={e => { e.stopPropagation(); setPaymentTarget(r); }}
                      >
                        <CreditCard className="w-2.5 h-2.5" /> Pay
                      </Button>
                    )}
                    {["paid", "refunded", "cancelled"].includes(r.status ?? "") && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TableFooter page={page} pageSize={pageSize} total={total} label="invoices" onPageChange={setPage} onPageSizeChange={v => { setPageSize(v); setPage(1); }} />

      {/* Record Payment Modal */}
      <RecordPaymentModal
        invoice={paymentTarget}
        open={!!paymentTarget}
        onClose={() => setPaymentTarget(null)}
        onSuccess={() => { qc.invalidateQueries({ queryKey: ["invoices-client"] }); qc.invalidateQueries({ queryKey: ["ar-status"] }); }}
      />

      {/* Invoice Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={o => { if (!o) setSelected(null); }}>
        <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto bg-background">
          <SheetHeader><SheetTitle>Invoice {selected?.invoiceNumber}</SheetTitle></SheetHeader>
          {selected && (
            <div className="mt-4 space-y-4">
              <StatusBadge status={selected.status} />
              <div className="bg-muted/30 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Student</span><span className="font-medium">{selected.studentName ?? "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Contract</span><span className="font-mono text-xs">{selected.contractId?.slice(0, 8)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><DualAmount amount={selected.originalAmount ?? selected.totalAmount} currency={selected.originalCurrency ?? selected.currency} audEquivalent={selected.audEquivalent} /></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Issued</span><span>{formatDate(selected.issuedAt)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Due</span><span>{selected.dueDate ?? "—"}</span></div>
                {selected.paidAt && <div className="flex justify-between"><span className="text-muted-foreground">Paid At</span><span>{formatDate(selected.paidAt)}</span></div>}
              </div>
              {selected.notes && <div><div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Notes</div><p className="text-sm">{selected.notes}</p></div>}
              <div className="flex gap-2 pt-2">
                {selected.status === "draft" && (
                  <Button size="sm" className="bg-[#F5821F] hover:bg-[#d97706] text-white flex-1 gap-1.5" onClick={() => updateMutation.mutate({ id: selected.id, payload: { status: "sent", issuedAt: new Date().toISOString() } })}>
                    <Send className="w-3.5 h-3.5" /> Send Invoice
                  </Button>
                )}
                {canRecordPayment(selected.status) && (
                  <Button size="sm" className="bg-[#F5821F] hover:bg-[#d97706] text-white flex-1 gap-1.5" onClick={() => { setSelected(null); setPaymentTarget(selected); }}>
                    <CreditCard className="w-3.5 h-3.5" /> Record Payment
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setSelected(null)}>Close</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
