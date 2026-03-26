import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { TableFooter } from "@/components/ui/table-footer";
import { useToast } from "@/hooks/use-toast";
import {
  ClipboardList, ChevronRight, Loader2, Mail, Printer, ExternalLink, Plus, Send,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { SortableTh, useSortState, useSorted } from "@/components/ui/sortable-th";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const PAGE_SIZE = 10;

const CURRENCIES = ["AUD", "USD", "SGD", "PHP", "THB", "KRW", "JPY", "GBP"];
const CURRENCY_SYMBOLS: Record<string, string> = {
  AUD: "A$", USD: "$", SGD: "S$", PHP: "₱", THB: "฿", KRW: "₩", JPY: "¥", GBP: "£",
};
const PAYMENT_METHODS = [
  { value: "bank_transfer",   label: "Bank Transfer" },
  { value: "cash",            label: "Cash" },
  { value: "credit_card",     label: "Credit Card" },
  { value: "cheque",          label: "Cheque" },
  { value: "online_transfer", label: "Online Transfer" },
  { value: "other",           label: "Other" },
];
const STATUSES = ["pending", "verified", "rejected"];

/* ── Types ───────────────────────────────────────────────── */
interface Receipt {
  id: string;
  receiptNumber?: string | null;
  invoiceId?: string | null;
  invoiceNumber?: string | null;
  contractId?: string | null;
  contractNumber?: string | null;
  studentName?: string | null;
  studentEmail?: string | null;
  agentName?: string | null;
  payerName?: string | null;
  amount?: string | null;
  originalAmount?: string | null;
  originalCurrency?: string | null;
  audEquivalent?: string | null;
  currency?: string | null;
  paymentMethod?: string | null;
  receiptDate?: string | null;
  status?: string | null;
  notes?: string | null;
  confirmedAt?: string | null;
}

interface InvoiceOption {
  id: string;
  invoiceNumber?: string | null;
  studentName?: string | null;
  studentEmail?: string | null;
  contractId?: string | null;
  contractNumber?: string | null;
  totalAmount?: string | null;
  originalAmount?: string | null;
  originalCurrency?: string | null;
  currency?: string | null;
  status?: string | null;
}

/* ── Helpers ─────────────────────────────────────────────── */
function fmtAmount(amount?: string | number | null, currency?: string | null) {
  if (!amount) return "—";
  const sym = CURRENCY_SYMBOLS[currency ?? "AUD"] ?? (currency ?? "AUD");
  return `${sym}${Number(amount).toLocaleString("en-AU", { minimumFractionDigits: 2 })}`;
}

function StatusBadge({ status }: { status?: string | null }) {
  const s = (status ?? "pending").toLowerCase();
  const map: Record<string, string> = {
    pending:  "bg-[#FEF9C3] text-[#CA8A04]",
    verified: "bg-[#DCFCE7] text-[#16A34A]",
    rejected: "bg-[#FEF2F2] text-[#DC2626]",
  };
  return (
    <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium capitalize", map[s] ?? "bg-[#F4F3F1] text-[#57534E]")}>
      {s}
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

/* ── Print Receipt ────────────────────────────────────────── */
function printReceipt(rcp: Receipt) {
  const amountStr = fmtAmount(rcp.originalAmount ?? rcp.amount, rcp.originalCurrency ?? rcp.currency);
  const methodLabel = PAYMENT_METHODS.find(m => m.value === rcp.paymentMethod)?.label ?? (rcp.paymentMethod ?? "—");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Receipt ${rcp.receiptNumber ?? ""}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; background: #fff; color: #1a1917; padding: 48px; font-size: 14px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
    .brand { font-size: 28px; font-weight: 700; color: #F5821F; }
    .brand-sub { font-size: 13px; color: #64748b; margin-top: 2px; }
    .rcp-title { text-align: right; }
    .rcp-title h2 { font-size: 22px; font-weight: 700; color: #1a1917; }
    .rcp-title p { color: #64748b; font-size: 13px; margin-top: 4px; }
    .badge { display: inline-block; padding: 3px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; background: #DCFCE7; color: #16A34A; text-transform: capitalize; margin-top: 8px; }
    .divider { border: none; border-top: 1px solid #e2e8f0; margin: 24px 0; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 24px 0; }
    .section h3 { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; margin-bottom: 8px; }
    .section p { font-size: 14px; color: #1a1917; margin-bottom: 4px; }
    .section .label { color: #64748b; font-size: 12px; }
    .amount-box { background: #f0fdf4; border: 2px solid #86efac; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0; }
    .amount-box .label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; }
    .amount-box .value { font-size: 32px; font-weight: 700; color: #16A34A; }
    table { width: 100%; border-collapse: collapse; margin-top: 24px; }
    tbody td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
    tbody td:first-child { color: #64748b; width: 160px; }
    .notes { margin-top: 24px; padding: 16px; background: #f8fafc; border-radius: 8px; }
    .notes h3 { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; margin-bottom: 6px; }
    .footer { margin-top: 48px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 24px; }
    @media print { body { padding: 24px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Edubee Camp</div>
      <div class="brand-sub">Educational Services</div>
    </div>
    <div class="rcp-title">
      <h2>RECEIPT</h2>
      <p>${rcp.receiptNumber ?? "—"}</p>
      <span class="badge">${(rcp.status ?? "pending")}</span>
    </div>
  </div>
  <hr class="divider" />
  <div class="grid">
    <div class="section">
      <h3>Received From</h3>
      <p>${rcp.studentName ?? rcp.payerName ?? "—"}</p>
      ${rcp.studentEmail ? `<p class="label">${rcp.studentEmail}</p>` : ""}
    </div>
    <div class="section">
      <h3>Receipt Details</h3>
      <p><span class="label">Date: </span>${rcp.receiptDate ?? "—"}</p>
      ${rcp.invoiceNumber ? `<p><span class="label">Invoice: </span>${rcp.invoiceNumber}</p>` : ""}
      ${rcp.contractNumber ? `<p><span class="label">Contract: </span>${rcp.contractNumber}</p>` : ""}
      ${rcp.agentName ? `<p><span class="label">Agent: </span>${rcp.agentName}</p>` : ""}
    </div>
  </div>
  <div class="amount-box">
    <div class="label">Amount Received</div>
    <div class="value">${amountStr}</div>
  </div>
  <table>
    <tbody>
      <tr><td>Payment Method</td><td>${methodLabel}</td></tr>
      <tr><td>Receipt Date</td><td>${rcp.receiptDate ?? "—"}</td></tr>
      ${rcp.confirmedAt ? `<tr><td>Confirmed At</td><td>${format(new Date(rcp.confirmedAt), "MMM d, yyyy HH:mm")}</td></tr>` : ""}
    </tbody>
  </table>
  ${rcp.notes ? `<div class="notes"><h3>Notes</h3><p>${rcp.notes}</p></div>` : ""}
  <div class="footer">
    <p>This receipt confirms that payment has been received in full.</p>
    <p style="margin-top:4px">Edubee Camp Administration — admin@edubee.com</p>
  </div>
  <script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (w) { w.document.write(html); w.document.close(); }
}

/* ── New Receipt Modal ────────────────────────────────────── */
function NewReceiptModal({
  open, onClose, onSuccess,
}: {
  open: boolean; onClose: () => void; onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    invoiceId: "",
    amount: "",
    currency: "AUD",
    paymentMethod: "bank_transfer",
    receiptDate: new Date().toISOString().split("T")[0],
    notes: "",
    status: "verified",
  });
  const [saving, setSaving] = useState(false);
  const [invoiceSearch, setInvoiceSearch] = useState("");

  const { data: invoicesResp } = useQuery({
    queryKey: ["invoices-for-receipt-picker"],
    queryFn: () => axios.get(`${BASE}/api/invoices?limit=200&invoiceType=client`).then(r => r.data),
    enabled: open,
  });
  const invoiceOptions: InvoiceOption[] = invoicesResp?.data ?? [];

  const filteredInvoices = invoiceOptions.filter(inv =>
    !invoiceSearch ||
    (inv.invoiceNumber ?? "").toLowerCase().includes(invoiceSearch.toLowerCase()) ||
    (inv.studentName ?? "").toLowerCase().includes(invoiceSearch.toLowerCase())
  );

  const selectedInvoice = invoiceOptions.find(i => i.id === form.invoiceId);

  const handleSelectInvoice = (inv: InvoiceOption) => {
    setForm(f => ({
      ...f,
      invoiceId: inv.id,
      amount: inv.originalAmount ?? inv.totalAmount ?? "",
      currency: inv.originalCurrency ?? inv.currency ?? "AUD",
    }));
    setInvoiceSearch("");
  };

  const f = (k: keyof typeof form, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async () => {
    if (!form.amount || Number(form.amount) <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      await axios.post(`${BASE}/api/receipts`, {
        invoiceId: form.invoiceId || undefined,
        amount: Number(form.amount),
        originalAmount: Number(form.amount),
        originalCurrency: form.currency,
        currency: form.currency,
        paymentMethod: form.paymentMethod,
        receiptDate: form.receiptDate,
        notes: form.notes || undefined,
        status: form.status,
        confirmedAt: form.status === "verified" ? new Date().toISOString() : undefined,
      });
      toast({ title: "Receipt created", description: "Receipt recorded successfully." });
      onSuccess();
      onClose();
      setForm({ invoiceId: "", amount: "", currency: "AUD", paymentMethod: "bank_transfer", receiptDate: new Date().toISOString().split("T")[0], notes: "", status: "verified" });
    } catch (e: any) {
      toast({ title: "Failed to create receipt", description: e?.response?.data?.error ?? e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#F5821F]" /> New Receipt
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          {/* Invoice Picker */}
          <div className="space-y-1.5">
            <Label>Link to Invoice <span className="text-muted-foreground text-xs">(optional — auto-fills amount & marks invoice paid)</span></Label>
            <Input
              placeholder="Search by invoice number or student name…"
              value={invoiceSearch}
              onChange={e => setInvoiceSearch(e.target.value)}
            />
            {invoiceSearch && filteredInvoices.length > 0 && (
              <div className="border border-border rounded-lg max-h-40 overflow-y-auto bg-background shadow">
                {filteredInvoices.slice(0, 8).map(inv => (
                  <button
                    key={inv.id}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors",
                      form.invoiceId === inv.id && "bg-[#FEF0E3]"
                    )}
                    onClick={() => handleSelectInvoice(inv)}
                  >
                    <span className="font-mono font-medium text-xs mr-2">{inv.invoiceNumber}</span>
                    <span className="text-muted-foreground">{inv.studentName}</span>
                    <span className="ml-2 text-muted-foreground text-xs">
                      {fmtAmount(inv.originalAmount ?? inv.totalAmount, inv.originalCurrency ?? inv.currency)}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {invoiceSearch && filteredInvoices.length === 0 && (
              <p className="text-xs text-muted-foreground px-1">No invoices found</p>
            )}
            {selectedInvoice && (
              <div className="flex items-center justify-between bg-muted/40 rounded-md px-3 py-2 text-sm">
                <span>
                  <span className="font-mono font-medium text-xs mr-2">{selectedInvoice.invoiceNumber}</span>
                  {selectedInvoice.studentName}
                  <span className="ml-2 text-muted-foreground text-xs">
                    {fmtAmount(selectedInvoice.originalAmount ?? selectedInvoice.totalAmount, selectedInvoice.originalCurrency ?? selectedInvoice.currency)}
                  </span>
                </span>
                <button className="text-muted-foreground hover:text-foreground text-xs" onClick={() => f("invoiceId", "")}>×</button>
              </div>
            )}
          </div>

          {/* Amount + Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.amount} onChange={e => f("amount", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select value={form.currency} onValueChange={v => f("currency", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-1.5">
            <Label>Payment Method</Label>
            <Select value={form.paymentMethod} onValueChange={v => f("paymentMethod", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Receipt Date */}
          <div className="space-y-1.5">
            <Label>Receipt Date</Label>
            <Input type="date" value={form.receiptDate} onChange={e => f("receiptDate", e.target.value)} />
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => f("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            {form.invoiceId && form.status === "verified" && (
              <p className="text-xs text-[#16A34A]">Linked invoice will be marked as Paid</p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Textarea rows={2} placeholder="Additional notes…" value={form.notes} onChange={e => f("notes", e.target.value)} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button className="bg-[#F5821F] hover:bg-[#d97706] text-white" onClick={handleSubmit} disabled={saving}>
            {saving ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />Creating…</> : "Create Receipt"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Email Receipt Modal ──────────────────────────────────── */
function EmailReceiptModal({
  receipt, open, onClose, onSuccess,
}: {
  receipt: Receipt | null; open: boolean; onClose: () => void; onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  if (!receipt) return null;

  const defaultEmail = receipt.studentEmail ?? "";

  const handleSend = async () => {
    const to = email || defaultEmail;
    if (!to) { toast({ title: "Enter an email address", variant: "destructive" }); return; }
    setSending(true);
    try {
      const resp = await axios.post(`${BASE}/api/receipts/${receipt.id}/send-email`, { email: to });
      if (resp.data?.mocked) {
        toast({ title: "Receipt email logged (mock)", description: `Email would be sent to ${to}` });
      } else {
        toast({ title: "Receipt sent!", description: `Email sent to ${to}` });
      }
      onSuccess();
      onClose();
      setEmail("");
    } catch (e: any) {
      toast({ title: "Send failed", description: e?.response?.data?.error ?? e.message, variant: "destructive" });
    } finally { setSending(false); }
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) { onClose(); setEmail(""); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#F5821F]" /> Send Receipt by Email
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="bg-muted/30 rounded-lg p-3 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Receipt #</span><span className="font-mono font-medium">{receipt.receiptNumber}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Student</span><span>{receipt.studentName ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Amount</span>
              <span className="font-medium text-[#16A34A]">{fmtAmount(receipt.originalAmount ?? receipt.amount, receipt.originalCurrency ?? receipt.currency)}</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Recipient Email</Label>
            <Input
              type="email"
              placeholder={defaultEmail || "email@example.com"}
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            {defaultEmail && !email && (
              <p className="text-xs text-muted-foreground">Sending to <span className="font-medium">{defaultEmail}</span> (student email on file)</p>
            )}
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => { onClose(); setEmail(""); }} disabled={sending}>Cancel</Button>
          <Button className="bg-[#F5821F] hover:bg-[#d97706] text-white gap-1.5" onClick={handleSend} disabled={sending}>
            {sending ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />Sending…</> : <><Send className="w-3.5 h-3.5" />Send Email</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Detail Sheet ─────────────────────────────────────────── */
function ReceiptDetailSheet({
  receipt, open, onClose, onEmail,
}: {
  receipt: Receipt | null; open: boolean; onClose: () => void; onEmail: (r: Receipt) => void;
}) {
  const [, navigate] = useLocation();
  if (!receipt) return null;
  const methodLabel = PAYMENT_METHODS.find(m => m.value === receipt.paymentMethod)?.label ?? receipt.paymentMethod ?? "—";

  return (
    <Sheet open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <SheetContent className="w-[520px] sm:max-w-[520px] overflow-y-auto bg-background">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Receipt <span className="font-mono text-sm text-muted-foreground">{receipt.receiptNumber}</span>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <StatusBadge status={receipt.status} />

          {/* Amount highlight */}
          <div className="bg-[#F0FDF4] border border-[#86EFAC] rounded-xl p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Amount Received</p>
            <p className="text-2xl font-bold text-[#16A34A]">
              {fmtAmount(receipt.originalAmount ?? receipt.amount, receipt.originalCurrency ?? receipt.currency)}
            </p>
          </div>

          {/* Info block */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-2.5 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Student</span>
              <span className="font-medium">{receipt.studentName ?? receipt.payerName ?? "—"}</span>
            </div>
            {receipt.studentEmail && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Student Email</span>
                <span className="text-xs">{receipt.studentEmail}</span>
              </div>
            )}
            {receipt.agentName && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Agent</span>
                <span>{receipt.agentName}</span>
              </div>
            )}
            {/* Invoice link */}
            {receipt.invoiceId && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Invoice</span>
                <span className="font-mono text-xs text-muted-foreground">{receipt.invoiceNumber ?? receipt.invoiceId.slice(0, 8)}</span>
              </div>
            )}
            {/* Contract link */}
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Contract</span>
              {receipt.contractId ? (
                <button
                  className="flex items-center gap-1 text-[#F5821F] hover:underline font-mono text-xs font-medium"
                  onClick={() => { onClose(); navigate(`/admin/crm/contracts/${receipt.contractId}`); }}
                >
                  {receipt.contractNumber ?? receipt.contractId.slice(0, 8)}
                  <ExternalLink className="w-3 h-3" />
                </button>
              ) : <span className="text-muted-foreground text-xs">—</span>}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Method</span>
              <span className="capitalize">{methodLabel}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Receipt Date</span>
              <span>{receipt.receiptDate ? format(new Date(receipt.receiptDate), "MMM d, yyyy") : "—"}</span>
            </div>
            {receipt.confirmedAt && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Confirmed At</span>
                <span className="text-xs">{format(new Date(receipt.confirmedAt), "MMM d, yyyy HH:mm")}</span>
              </div>
            )}
          </div>

          {receipt.notes && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Notes</div>
              <p className="text-sm">{receipt.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onEmail(receipt)}>
              <Mail className="w-3.5 h-3.5" /> Email Receipt
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => printReceipt(receipt)}>
              <Printer className="w-3.5 h-3.5" /> Print / PDF
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose} className="col-span-2 text-muted-foreground">
              Close
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ── Main Page ────────────────────────────────────────────── */
export default function Receipts() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const { sortBy, sortDir, onSort } = useSortState();
  const [activeStatus, setActiveStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<Receipt | null>(null);
  const [emailTarget, setEmailTarget] = useState<Receipt | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);

  const queryKey = ["receipts", { search, status: activeStatus, page, pageSize }];
  const { data: resp, isLoading } = useQuery({
    queryKey,
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
      if (search) params.set("search", search);
      if (activeStatus !== "all") params.set("status", activeStatus);
      return axios.get(`${BASE}/api/receipts?${params}`).then(r => r.data);
    },
  });
  const rows: Receipt[] = resp?.data ?? [];
  const sorted = useSorted(rows, sortBy, sortDir);
  const total: number = resp?.meta?.total ?? rows.length;

  const invalidate = () => qc.invalidateQueries({ queryKey: ["receipts"] });

  return (
    <div className="space-y-4">
      <ListToolbar
        search={search} onSearch={v => { setSearch(v); setPage(1); }}
        statuses={STATUSES} activeStatus={activeStatus} onStatusChange={s => { setActiveStatus(s); setPage(1); }}
        total={total}
        addLabel="New Receipt"
        onAdd={() => setShowNewModal(true)}
        csvExportTable="receipts"
      />

      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <SortableTh col="receiptNumber" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Receipt #</SortableTh>
              <SortableTh col="studentName" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Student / Contract</SortableTh>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</th>
              <SortableTh col="paymentMethod" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Method</SortableTh>
              <SortableTh col="receiptDate" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</SortableTh>
              <SortableTh col="status" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</SortableTh>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? <SkeletonRows cols={7} />
              : rows.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-16 text-center text-muted-foreground text-sm">
                  <ClipboardList className="w-8 h-8 mx-auto mb-3 opacity-30" />No receipts found
                </td></tr>
              ) : sorted.map(r => (
                <tr key={r.id} className="hover:bg-[#FEF0E3] transition-colors cursor-pointer" onClick={() => setSelected(r)}>
                  <td className="px-4 py-3 font-mono text-xs font-medium">{r.receiptNumber ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.studentName ?? r.payerName ?? "—"}</div>
                    {r.contractNumber && <div className="text-xs text-muted-foreground font-mono">{r.contractNumber}</div>}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-[#16A34A]">
                    {fmtAmount(r.originalAmount ?? r.amount, r.originalCurrency ?? r.currency)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground capitalize text-sm">
                    {PAYMENT_METHODS.find(m => m.value === r.paymentMethod)?.label ?? r.paymentMethod?.replace(/_/g, " ") ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {r.receiptDate ? format(new Date(r.receiptDate), "MMM d, yyyy") : "—"}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-muted-foreground" /></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <TableFooter page={page} pageSize={pageSize} total={total} label="receipts" onPageChange={setPage} onPageSizeChange={v => { setPageSize(v); setPage(1); }} />

      <NewReceiptModal open={showNewModal} onClose={() => setShowNewModal(false)} onSuccess={invalidate} />
      <EmailReceiptModal receipt={emailTarget} open={!!emailTarget} onClose={() => setEmailTarget(null)} onSuccess={invalidate} />
      <ReceiptDetailSheet
        receipt={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        onEmail={r => { setSelected(null); setEmailTarget(r); }}
      />
    </div>
  );
}
