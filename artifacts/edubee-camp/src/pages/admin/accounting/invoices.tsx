import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { ListPagination } from "@/components/ui/list-pagination";
import { useToast } from "@/hooks/use-toast";
import { Receipt, Send, ChevronRight, CreditCard, Loader2, FileText, Handshake, Download } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { SortableTh, useSortState, useSorted } from "@/components/ui/sortable-th";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const PAGE_SIZE = 10;

const CURRENCY_SYMBOLS: Record<string, string> = {
  AUD: "A$", USD: "$", SGD: "S$", PHP: "₱", THB: "฿", KRW: "₩", JPY: "¥", GBP: "£",
};

const STATUS_COLORS: Record<string, string> = {
  draft:            "bg-[#F4F3F1] text-[#57534E]",
  sent:             "bg-[#FEF0E3] text-[#F5821F]",
  paid:             "bg-[#DCFCE7] text-[#16A34A]",
  overdue:          "bg-[#FEF2F2] text-[#DC2626]",
  cancelled:        "bg-[#F4F3F1] text-[#A8A29E]",
  partially_paid:   "bg-yellow-100 text-yellow-700",
  awaiting_receipt: "bg-purple-100 text-purple-700",
  refunded:         "bg-gray-100 text-gray-500",
};

interface Invoice {
  id: string; invoiceNumber?: string | null; contractId?: string | null;
  studentName?: string | null; invoiceType?: string | null;
  totalAmount?: string | null; currency?: string | null;
  originalCurrency?: string | null; originalAmount?: string | null; audEquivalent?: string | null;
  status?: string | null; issuedAt?: string | null; dueDate?: string | null;
  paidAt?: string | null; notes?: string | null;
}

/* ── Shared Helpers ─────────────────────────────────────── */
function DualAmount({ amount, currency, audEquivalent }: {
  amount?: string | number | null; currency?: string | null; audEquivalent?: string | number | null;
}) {
  if (!amount) return <span className="text-muted-foreground">—</span>;
  const sym = CURRENCY_SYMBOLS[currency ?? "AUD"] ?? (currency ?? "AUD");
  const num = Number(amount);
  const aud = Number(audEquivalent);
  return (
    <span>
      <span className="font-medium">{sym}{num.toLocaleString("en-AU", { minimumFractionDigits: 2 })}</span>
      {currency && currency !== "AUD" && aud > 0 && (
        <span className="ml-1.5 text-[11px] text-muted-foreground">≈ A${aud.toFixed(2)}</span>
      )}
    </span>
  );
}

function StatusBadge({ status }: { status?: string | null }) {
  const s = (status ?? "draft").toLowerCase();
  return (
    <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium capitalize", STATUS_COLORS[s] ?? "bg-[#F4F3F1] text-[#57534E]")}>
      {s.replace(/_/g, " ")}
    </span>
  );
}

function SkeletonRows({ cols }: { cols: number }) {
  return (
    <>
      {[...Array(PAGE_SIZE)].map((_, i) => (
        <tr key={i}>
          {[...Array(cols)].map((_, j) => (
            <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>
          ))}
        </tr>
      ))}
    </>
  );
}

/* ── Record Payment Modal (Client only) ─────────────────── */
function RecordPaymentModal({ invoice, open, onClose, onSuccess }: {
  invoice: Invoice | null; open: boolean; onClose: () => void; onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({ amount: "", bankReference: "", transactionDate: new Date().toISOString().split("T")[0], notes: "" });
  const [saving, setSaving] = useState(false);

  if (!invoice) return null;

  const handleSubmit = async () => {
    if (!form.amount || Number(form.amount) <= 0) { toast({ title: "Enter a valid amount", variant: "destructive" }); return; }
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
      onSuccess(); onClose();
    } catch (e: any) {
      toast({ title: "Failed to record payment", description: e?.response?.data?.error ?? e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#F5821F]" /> Record Payment
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="bg-muted/30 rounded-lg p-3 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Invoice</span><span className="font-mono font-medium">{invoice.invoiceNumber}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Student</span><span>{invoice.studentName ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Total</span>
              <DualAmount amount={invoice.originalAmount ?? invoice.totalAmount} currency={invoice.originalCurrency ?? invoice.currency} audEquivalent={invoice.audEquivalent} />
            </div>
          </div>
          <div className="space-y-1"><Label>Amount (AUD)</Label>
            <Input type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
          </div>
          <div className="space-y-1"><Label>Transaction Date</Label>
            <Input type="date" value={form.transactionDate} onChange={e => setForm(f => ({ ...f, transactionDate: e.target.value }))} />
          </div>
          <div className="space-y-1"><Label>Bank Reference <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input value={form.bankReference} onChange={e => setForm(f => ({ ...f, bankReference: e.target.value }))} placeholder="e.g. BSB transfer ref #" />
          </div>
          <div className="space-y-1"><Label>Notes <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional notes" />
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

/* ── Client Tab ─────────────────────────────────────────── */
const CLIENT_STATUSES = ["draft", "sent", "partially_paid", "awaiting_receipt", "paid", "overdue", "cancelled", "refunded"];

function ClientTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const { sortBy, sortDir, onSort } = useSortState();
  const [activeStatus, setActiveStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<Invoice | null>(null);

  const queryKey = ["invoices-client", { search, status: activeStatus, page }];
  const { data: resp, isLoading } = useQuery({
    queryKey,
    queryFn: () => {
      const p = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE), invoiceType: "client" });
      if (search) p.set("search", search);
      if (activeStatus !== "all") p.set("status", activeStatus);
      return axios.get(`${BASE}/api/invoices?${p}`).then(r => r.data);
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

  const canPay = (s?: string | null) => !["paid", "refunded", "cancelled"].includes(s ?? "");

  return (
    <div className="space-y-4">
      <ListToolbar
        search={search} onSearch={v => { setSearch(v); setPage(1); }}
        statuses={CLIENT_STATUSES} activeStatus={activeStatus} onStatusChange={s => { setActiveStatus(s); setPage(1); }}
        total={total} addLabel="New Invoice" onAdd={() => toast({ title: "Coming soon", description: "Invoice creation will open contract picker" })}
      />
      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <SortableTh col="invoiceNumber" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left">Invoice #</SortableTh>
              <SortableTh col="studentName" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left">Student</SortableTh>
              <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Amount</th>
              <SortableTh col="issuedAt" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left">Issued</SortableTh>
              <SortableTh col="dueDate" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left">Due</SortableTh>
              <SortableTh col="status" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left">Status</SortableTh>
              <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? <SkeletonRows cols={7} />
              : rows.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-16 text-center text-muted-foreground text-sm">
                  <Receipt className="w-8 h-8 mx-auto mb-3 opacity-30" />No client invoices found
                </td></tr>
              ) : sorted.map(r => (
                <tr key={r.id} className="hover:bg-[#FEF0E3] transition-colors cursor-pointer" onClick={() => setSelected(r)}>
                  <td className="px-4 py-3 font-mono text-xs font-medium">{r.invoiceNumber ?? "—"}</td>
                  <td className="px-4 py-3 font-medium">{r.studentName ?? "—"}</td>
                  <td className="px-4 py-3 text-right"><DualAmount amount={r.originalAmount ?? r.totalAmount} currency={r.originalCurrency ?? r.currency} audEquivalent={r.audEquivalent} /></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{r.issuedAt ? format(new Date(r.issuedAt), "MMM d, yyyy") : "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{r.dueDate ?? "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {r.status === "draft" && (
                        <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 px-2" onClick={e => { e.stopPropagation(); updateMutation.mutate({ id: r.id, payload: { status: "sent", issuedAt: new Date().toISOString() } }); }}>
                          <Send className="w-2.5 h-2.5" /> Send
                        </Button>
                      )}
                      {canPay(r.status) && (
                        <Button size="sm" className="h-6 text-[10px] gap-1 px-2 bg-[#F5821F] hover:bg-[#d97706] text-white" onClick={e => { e.stopPropagation(); setPaymentTarget(r); }}>
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
      <ListPagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />

      <RecordPaymentModal
        invoice={paymentTarget} open={!!paymentTarget} onClose={() => setPaymentTarget(null)}
        onSuccess={() => { qc.invalidateQueries({ queryKey: ["invoices-client"] }); qc.invalidateQueries({ queryKey: ["ar-status"] }); }}
      />

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
                <div className="flex justify-between"><span className="text-muted-foreground">Issued</span><span>{selected.issuedAt ? format(new Date(selected.issuedAt), "MMM d, yyyy") : "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Due</span><span>{selected.dueDate ?? "—"}</span></div>
                {selected.paidAt && <div className="flex justify-between"><span className="text-muted-foreground">Paid At</span><span>{format(new Date(selected.paidAt), "MMM d, yyyy")}</span></div>}
              </div>
              {selected.notes && <div><div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Notes</div><p className="text-sm">{selected.notes}</p></div>}
              <div className="flex gap-2 pt-2">
                {selected.status === "draft" && <Button size="sm" className="bg-[#F5821F] hover:bg-[#d97706] text-white flex-1 gap-1.5" onClick={() => updateMutation.mutate({ id: selected.id, payload: { status: "sent", issuedAt: new Date().toISOString() } })}><Send className="w-3.5 h-3.5" /> Send Invoice</Button>}
                {canPay(selected.status) && <Button size="sm" className="bg-[#F5821F] hover:bg-[#d97706] text-white flex-1 gap-1.5" onClick={() => { setSelected(null); setPaymentTarget(selected); }}><CreditCard className="w-3.5 h-3.5" /> Record Payment</Button>}
                <Button size="sm" variant="outline" onClick={() => setSelected(null)}>Close</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ── Agent Tab ──────────────────────────────────────────── */
const AGENT_STATUSES = ["draft", "sent", "paid", "overdue", "cancelled"];

function AgentTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const { sortBy, sortDir, onSort } = useSortState();
  const [activeStatus, setActiveStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Invoice | null>(null);

  const queryKey = ["invoices-agent", { search, status: activeStatus, page }];
  const { data: resp, isLoading } = useQuery({
    queryKey,
    queryFn: () => {
      const p = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE), invoiceType: "agent" });
      if (search) p.set("search", search);
      if (activeStatus !== "all") p.set("status", activeStatus);
      return axios.get(`${BASE}/api/invoices?${p}`).then(r => r.data);
    },
  });
  const rows: Invoice[] = resp?.data ?? [];
  const sorted = useSorted(rows, sortBy, sortDir);
  const total: number = resp?.meta?.total ?? rows.length;

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Invoice> }) =>
      axios.put(`${BASE}/api/invoices/${id}`, payload).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["invoices-agent"] }); toast({ title: "Invoice updated" }); setSelected(null); },
  });

  return (
    <div className="space-y-4">
      <ListToolbar
        search={search} onSearch={v => { setSearch(v); setPage(1); }}
        statuses={AGENT_STATUSES} activeStatus={activeStatus} onStatusChange={s => { setActiveStatus(s); setPage(1); }}
        total={total} addLabel="New Invoice" onAdd={() => toast({ title: "Coming soon" })}
      />
      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <SortableTh col="invoiceNumber" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left">Invoice #</SortableTh>
              <SortableTh col="studentName" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left">Student</SortableTh>
              <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Commission</th>
              <SortableTh col="issuedAt" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left">Issued</SortableTh>
              <SortableTh col="dueDate" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left">Due</SortableTh>
              <SortableTh col="status" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left">Status</SortableTh>
              <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? <SkeletonRows cols={7} />
              : rows.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-16 text-center text-muted-foreground text-sm">
                  <FileText className="w-8 h-8 mx-auto mb-3 opacity-30" />No agent invoices found
                </td></tr>
              ) : sorted.map(r => (
                <tr key={r.id} className="hover:bg-[#FEF0E3] transition-colors cursor-pointer" onClick={() => setSelected(r)}>
                  <td className="px-4 py-3 font-mono text-xs font-medium">{r.invoiceNumber ?? "—"}</td>
                  <td className="px-4 py-3 font-medium">{r.studentName ?? "—"}</td>
                  <td className="px-4 py-3 text-right"><DualAmount amount={r.originalAmount ?? r.totalAmount} currency={r.originalCurrency ?? r.currency} audEquivalent={r.audEquivalent} /></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{r.issuedAt ? format(new Date(r.issuedAt), "MMM d, yyyy") : "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{r.dueDate ?? "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3">
                    {r.status === "sent"
                      ? <Button size="sm" className="h-6 text-[10px] px-2 bg-[#16A34A] hover:bg-[#15803D] text-white" onClick={e => { e.stopPropagation(); updateMutation.mutate({ id: r.id, payload: { status: "paid", paidAt: new Date().toISOString() } }); }}>Mark Paid</Button>
                      : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <ListPagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />

      <Sheet open={!!selected} onOpenChange={o => { if (!o) setSelected(null); }}>
        <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto bg-background">
          <SheetHeader><SheetTitle>Agent Invoice {selected?.invoiceNumber}</SheetTitle></SheetHeader>
          {selected && (
            <div className="mt-4 space-y-4">
              <StatusBadge status={selected.status} />
              <div className="bg-muted/30 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Student</span><span className="font-medium">{selected.studentName ?? "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Commission</span><DualAmount amount={selected.originalAmount ?? selected.totalAmount} currency={selected.originalCurrency ?? selected.currency} audEquivalent={selected.audEquivalent} /></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Issued</span><span>{selected.issuedAt ? format(new Date(selected.issuedAt), "MMM d, yyyy") : "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Due</span><span>{selected.dueDate ?? "—"}</span></div>
              </div>
              <div className="flex gap-2 pt-2">
                {selected.status === "draft" && <Button size="sm" className="bg-[#F5821F] hover:bg-[#d97706] text-white gap-1.5" onClick={() => updateMutation.mutate({ id: selected.id, payload: { status: "sent", issuedAt: new Date().toISOString() } })}><Send className="w-3.5 h-3.5" /> Send</Button>}
                {selected.status === "sent" && <Button size="sm" className="bg-[#16A34A] hover:bg-[#15803D] text-white" onClick={() => updateMutation.mutate({ id: selected.id, payload: { status: "paid", paidAt: new Date().toISOString() } })}>Mark Paid</Button>}
                <Button size="sm" variant="ghost" className="gap-1.5"><Download className="w-3.5 h-3.5" /> PDF</Button>
                <Button size="sm" variant="outline" onClick={() => setSelected(null)}>Close</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ── Partner Tab ────────────────────────────────────────── */
const PARTNER_STATUSES = ["draft", "sent", "paid", "overdue", "cancelled"];

function PartnerTab() {
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
      const p = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE), invoiceType: "partner" });
      if (search) p.set("search", search);
      if (activeStatus !== "all") p.set("status", activeStatus);
      return axios.get(`${BASE}/api/invoices?${p}`).then(r => r.data);
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
        statuses={PARTNER_STATUSES} activeStatus={activeStatus} onStatusChange={s => { setActiveStatus(s); setPage(1); }}
        total={total} addLabel="New Invoice" onAdd={() => toast({ title: "Coming soon" })}
      />
      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <SortableTh col="invoiceNumber" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left">Invoice #</SortableTh>
              <SortableTh col="studentName" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left">Student</SortableTh>
              <SortableTh col="providerType" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left">Provider Type</SortableTh>
              <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Amount</th>
              <SortableTh col="dueDate" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left">Due</SortableTh>
              <SortableTh col="status" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left">Status</SortableTh>
              <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? <SkeletonRows cols={7} />
              : rows.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-16 text-center text-muted-foreground text-sm">
                  <Handshake className="w-8 h-8 mx-auto mb-3 opacity-30" />No partner invoices found
                </td></tr>
              ) : sorted.map(r => (
                <tr key={r.id} className="hover:bg-[#FEF0E3] transition-colors cursor-pointer" onClick={() => setSelected(r)}>
                  <td className="px-4 py-3 font-mono text-xs font-medium">{r.invoiceNumber ?? "—"}</td>
                  <td className="px-4 py-3 font-medium">{r.studentName ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-muted rounded text-xs capitalize">{r.invoiceType?.replace("partner_", "") ?? "—"}</span>
                  </td>
                  <td className="px-4 py-3 text-right"><DualAmount amount={r.originalAmount ?? r.totalAmount} currency={r.originalCurrency ?? r.currency} audEquivalent={r.audEquivalent} /></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{r.dueDate ?? "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3">
                    {r.status === "sent"
                      ? <Button size="sm" className="h-6 text-[10px] px-2 bg-[#16A34A] hover:bg-[#15803D] text-white" onClick={e => { e.stopPropagation(); updateMutation.mutate({ id: r.id, payload: { status: "paid", paidAt: new Date().toISOString() } }); }}>Mark Paid</Button>
                      : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
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

/* ── Main Page ──────────────────────────────────────────── */
const TABS = [
  { key: "client",  label: "Client",  icon: Receipt },
  { key: "agent",   label: "Agent",   icon: FileText },
  { key: "partner", label: "Partner", icon: Handshake },
] as const;

type TabKey = typeof TABS[number]["key"];

export default function Invoices() {
  const [activeTab, setActiveTab] = useState<TabKey>("client");

  return (
    <div className="space-y-0">
      {/* Tab bar */}
      <div className="flex border-b border-border mb-5 -mt-1">
        {TABS.map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 text-sm border-b-2 transition-colors font-medium",
                isActive
                  ? "border-[#F5821F] text-[#F5821F]"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "client"  && <ClientTab />}
      {activeTab === "agent"   && <AgentTab />}
      {activeTab === "partner" && <PartnerTab />}
    </div>
  );
}
