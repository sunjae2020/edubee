import { useState } from "react";
import { formatDate, formatDateTime } from "@/lib/date-format";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { TableFooter } from "@/components/ui/table-footer";
import { useToast } from "@/hooks/use-toast";
import {
  Receipt, Send, ChevronRight, CreditCard, Loader2, FileText, Handshake,
  Printer, Mail, ExternalLink, Plus,
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
  id: string;
  invoiceNumber?: string | null;
  contractId?: string | null;
  contractNumber?: string | null;
  studentName?: string | null;
  studentEmail?: string | null;
  agentName?: string | null;
  invoiceType?: string | null;
  totalAmount?: string | null;
  currency?: string | null;
  originalCurrency?: string | null;
  originalAmount?: string | null;
  audEquivalent?: string | null;
  status?: string | null;
  issuedAt?: string | null;
  dueDate?: string | null;
  paidAt?: string | null;
  notes?: string | null;
  lineItems?: any;
}

interface ContractOption {
  id: string;
  contractNumber?: string | null;
  studentName?: string | null;
  clientEmail?: string | null;
  status?: string | null;
}

/* ── Helpers ─────────────────────────────────────────────── */
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

/* ── Print Invoice ────────────────────────────────────────── */
function printInvoice(inv: Invoice) {
  const sym = CURRENCY_SYMBOLS[inv.originalCurrency ?? inv.currency ?? "AUD"] ?? (inv.originalCurrency ?? inv.currency ?? "AUD");
  const amount = inv.originalAmount ?? inv.totalAmount;
  const amountStr = amount ? `${sym}${Number(amount).toLocaleString("en-AU", { minimumFractionDigits: 2 })}` : "—";

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Invoice ${inv.invoiceNumber ?? ""}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; background: #fff; color: #1a1917; padding: 48px; font-size: 14px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
    .brand { font-size: 28px; font-weight: 700; color: #F5821F; }
    .brand-sub { font-size: 13px; color: #64748b; margin-top: 2px; }
    .inv-title { text-align: right; }
    .inv-title h2 { font-size: 22px; font-weight: 700; color: #1a1917; }
    .inv-title p { color: #64748b; font-size: 13px; margin-top: 4px; }
    .badge { display: inline-block; padding: 3px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; background: #FEF0E3; color: #F5821F; text-transform: capitalize; margin-top: 8px; }
    .divider { border: none; border-top: 1px solid #e2e8f0; margin: 24px 0; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 24px 0; }
    .section h3 { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; margin-bottom: 8px; }
    .section p { font-size: 14px; color: #1a1917; margin-bottom: 4px; }
    .section .label { color: #64748b; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 24px; }
    thead tr { background: #f8fafc; }
    thead th { padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; border-bottom: 1px solid #e2e8f0; }
    tbody td { padding: 12px; border-bottom: 1px solid #f1f5f9; }
    .total-row td { font-weight: 700; font-size: 16px; color: #F5821F; border-top: 2px solid #e2e8f0; padding-top: 16px; }
    .notes { margin-top: 32px; padding: 16px; background: #f8fafc; border-radius: 8px; }
    .notes h3 { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; margin-bottom: 6px; }
    .footer { margin-top: 48px; text-align: center; font-size: 12px; color: #94a3b8; }
    @media print { body { padding: 24px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Edubee Camp</div>
      <div class="brand-sub">Educational Services</div>
    </div>
    <div class="inv-title">
      <h2>INVOICE</h2>
      <p>${inv.invoiceNumber ?? "—"}</p>
      <span class="badge">${(inv.status ?? "draft").replace(/_/g, " ")}</span>
    </div>
  </div>
  <hr class="divider" />
  <div class="grid">
    <div class="section">
      <h3>Bill To</h3>
      <p>${inv.studentName ?? "—"}</p>
      ${inv.studentEmail ? `<p class="label">${inv.studentEmail}</p>` : ""}
    </div>
    <div class="section">
      <h3>Invoice Details</h3>
      <p><span class="label">Date Issued: </span>${formatDate(inv.issuedAt)}</p>
      <p><span class="label">Due Date: </span>${inv.dueDate ?? "—"}</p>
      ${inv.contractNumber ? `<p><span class="label">Contract: </span>${inv.contractNumber}</p>` : ""}
      ${inv.agentName ? `<p><span class="label">Agent: </span>${inv.agentName}</p>` : ""}
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th style="text-align:right">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${inv.invoiceType ? inv.invoiceType.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()) : "Service"} — ${inv.studentName ?? ""}</td>
        <td style="text-align:right">${amountStr}</td>
      </tr>
    </tbody>
    <tfoot>
      <tr class="total-row">
        <td>Total Due</td>
        <td style="text-align:right">${amountStr}</td>
      </tr>
    </tfoot>
  </table>
  ${inv.notes ? `<div class="notes"><h3>Notes</h3><p>${inv.notes}</p></div>` : ""}
  <div class="footer">
    <p>Thank you for your business. Please remit payment by the due date.</p>
    <p style="margin-top:4px">Edubee Camp Administration — admin@edubee.com</p>
  </div>
  <script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (w) { w.document.write(html); w.document.close(); }
}

/* ── New Invoice Modal ────────────────────────────────────── */
function NewInvoiceModal({
  open, onClose, defaultType, onSuccess,
}: {
  open: boolean; onClose: () => void; defaultType: string; onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    contractId: "",
    invoiceType: defaultType,
    totalAmount: "",
    currency: "AUD",
    dueDate: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [contractSearch, setContractSearch] = useState("");

  const { data: contractsResp } = useQuery({
    queryKey: ["contracts-dropdown"],
    queryFn: () => axios.get(`${BASE}/api/crm/contracts?limit=200`).then(r => r.data),
    enabled: open,
  });
  const contractOptions: ContractOption[] = contractsResp?.data ?? contractsResp ?? [];

  const filtered = contractOptions.filter(c =>
    !contractSearch ||
    (c.contractNumber ?? "").toLowerCase().includes(contractSearch.toLowerCase()) ||
    (c.studentName ?? "").toLowerCase().includes(contractSearch.toLowerCase())
  );

  const selectedContract = contractOptions.find(c => c.id === form.contractId);

  const partnerTypes = [
    { value: "partner_school", label: "Partner — School" },
    { value: "partner_hotel", label: "Vendor — Hotel" },
    { value: "partner_tour", label: "Vendor — Tour" },
    { value: "partner_pickup", label: "Vendor — Pickup" },
    { value: "partner_other", label: "Partner — Other" },
  ];

  const invoiceTypeOptions = defaultType === "partner"
    ? partnerTypes
    : [
        { value: "client", label: "Client Invoice" },
        { value: "agent", label: "Agent Commission" },
      ];

  const f = (k: keyof typeof form, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async () => {
    if (!form.totalAmount || Number(form.totalAmount) <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      await axios.post(`${BASE}/api/invoices`, {
        contractId: form.contractId || undefined,
        invoiceType: form.invoiceType,
        totalAmount: Number(form.totalAmount),
        originalAmount: Number(form.totalAmount),
        originalCurrency: form.currency,
        currency: form.currency,
        dueDate: form.dueDate || undefined,
        notes: form.notes || undefined,
        status: "draft",
      });
      toast({ title: "Invoice created", description: "Draft invoice created successfully." });
      onSuccess();
      onClose();
      setForm({ contractId: "", invoiceType: defaultType, totalAmount: "", currency: "AUD", dueDate: "", notes: "" });
    } catch (e: any) {
      toast({ title: "Failed to create invoice", description: e?.response?.data?.error ?? e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#F5821F]" /> New Invoice
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          {/* Contract Picker */}
          <div className="space-y-1.5">
            <Label>Contract <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input
              placeholder="Search by contract number or student name…"
              value={contractSearch}
              onChange={e => setContractSearch(e.target.value)}
              className="mb-1"
            />
            {contractSearch && filtered.length > 0 && (
              <div className="border border-border rounded-lg max-h-36 overflow-y-auto bg-background shadow">
                {filtered.slice(0, 8).map(c => (
                  <button
                    key={c.id}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors",
                      form.contractId === c.id && "bg-[#FEF0E3]"
                    )}
                    onClick={() => { f("contractId", c.id); setContractSearch(""); }}
                  >
                    <span className="font-mono font-medium text-xs mr-2">{c.contractNumber}</span>
                    <span className="text-muted-foreground">{c.studentName}</span>
                  </button>
                ))}
              </div>
            )}
            {selectedContract && (
              <div className="flex items-center justify-between bg-muted/40 rounded-md px-3 py-2 text-sm">
                <span>
                  <span className="font-mono font-medium text-xs mr-2">{selectedContract.contractNumber}</span>
                  {selectedContract.studentName}
                </span>
                <button className="text-muted-foreground hover:text-foreground text-xs" onClick={() => f("contractId", "")}>×</button>
              </div>
            )}
          </div>

          {/* Invoice Type */}
          <div className="space-y-1.5">
            <Label>Invoice Type</Label>
            <Select value={form.invoiceType} onValueChange={v => f("invoiceType", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {invoiceTypeOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Amount + Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.totalAmount} onChange={e => f("totalAmount", e.target.value)} />
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

          {/* Due Date */}
          <div className="space-y-1.5">
            <Label>Due Date <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input type="date" value={form.dueDate} onChange={e => f("dueDate", e.target.value)} />
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
            {saving ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />Creating…</> : "Create Invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Email Invoice Modal ──────────────────────────────────── */
function EmailInvoiceModal({
  invoice, open, onClose, onSuccess,
}: {
  invoice: Invoice | null; open: boolean; onClose: () => void; onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  if (!invoice) return null;

  const defaultEmail = invoice.studentEmail ?? "";

  const handleSend = async () => {
    const to = email || defaultEmail;
    if (!to) { toast({ title: "Enter an email address", variant: "destructive" }); return; }
    setSending(true);
    try {
      const resp = await axios.post(`${BASE}/api/invoices/${invoice.id}/send-email`, { email: to });
      if (resp.data?.mocked) {
        toast({ title: "Invoice email logged (mock)", description: `Email would be sent to ${to}` });
      } else {
        toast({ title: "Invoice sent!", description: `Email sent to ${to}` });
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
            <Mail className="w-4 h-4 text-[#F5821F]" /> Send Invoice by Email
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="bg-muted/30 rounded-lg p-3 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Invoice</span><span className="font-mono font-medium">{invoice.invoiceNumber}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Student</span><span>{invoice.studentName ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Amount</span>
              <DualAmount amount={invoice.originalAmount ?? invoice.totalAmount} currency={invoice.originalCurrency ?? invoice.currency} audEquivalent={invoice.audEquivalent} />
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

/* ── Record Payment Modal ─────────────────────────────────── */
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

/* ── Detail Sheet ─────────────────────────────────────────── */
function InvoiceDetailSheet({
  invoice, open, onClose, onPayment, onUpdate, onEmail, label = "Invoice",
}: {
  invoice: Invoice | null; open: boolean; onClose: () => void;
  onPayment: (inv: Invoice) => void;
  onUpdate: (id: string, payload: Partial<Invoice>) => void;
  onEmail: (inv: Invoice) => void;
  label?: string;
}) {
  const [, navigate] = useLocation();
  const canPay = (s?: string | null) => !["paid", "refunded", "cancelled"].includes(s ?? "");

  if (!invoice) return null;

  return (
    <Sheet open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <SheetContent className="w-[520px] sm:max-w-[520px] overflow-y-auto bg-background">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {label} <span className="font-mono text-sm text-muted-foreground">{invoice.invoiceNumber}</span>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <StatusBadge status={invoice.status} />

          {/* Main info */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-2.5 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Student</span>
              <span className="font-medium">{invoice.studentName ?? "—"}</span>
            </div>
            {invoice.studentEmail && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Student Email</span>
                <span className="text-xs">{invoice.studentEmail}</span>
              </div>
            )}
            {invoice.agentName && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Agent</span>
                <span>{invoice.agentName}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Contract</span>
              {invoice.contractId ? (
                <button
                  className="flex items-center gap-1 text-[#F5821F] hover:underline font-mono text-xs font-medium"
                  onClick={() => { onClose(); navigate(`/admin/crm/contracts/${invoice.contractId}`); }}
                >
                  {invoice.contractNumber ?? invoice.contractId.slice(0, 8)}
                  <ExternalLink className="w-3 h-3" />
                </button>
              ) : <span className="text-muted-foreground text-xs">—</span>}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Amount</span>
              <DualAmount amount={invoice.originalAmount ?? invoice.totalAmount} currency={invoice.originalCurrency ?? invoice.currency} audEquivalent={invoice.audEquivalent} />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Issued</span>
              <span>{formatDate(invoice.issuedAt)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Due</span>
              <span>{invoice.dueDate ?? "—"}</span>
            </div>
            {invoice.paidAt && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Paid At</span>
                <span>{formatDate(invoice.paidAt)}</span>
              </div>
            )}
          </div>

          {invoice.notes && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Notes</div>
              <p className="text-sm">{invoice.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {invoice.status === "draft" && (
              <Button
                size="sm"
                className="bg-[#F5821F] hover:bg-[#d97706] text-white gap-1.5 col-span-2"
                onClick={() => onUpdate(invoice.id, { status: "sent", issuedAt: new Date().toISOString() })}
              >
                <Send className="w-3.5 h-3.5" /> Mark as Sent
              </Button>
            )}
            {canPay(invoice.status) && (
              <Button
                size="sm"
                className="bg-[#F5821F] hover:bg-[#d97706] text-white gap-1.5"
                onClick={() => { onClose(); onPayment(invoice); }}
              >
                <CreditCard className="w-3.5 h-3.5" /> Record Payment
              </Button>
            )}
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onEmail(invoice)}>
              <Mail className="w-3.5 h-3.5" /> Email
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => printInvoice(invoice)}>
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

/* ── Client Tab ─────────────────────────────────────────── */
const CLIENT_STATUSES = ["draft", "sent", "partially_paid", "awaiting_receipt", "paid", "overdue", "cancelled", "refunded"];

function ClientTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const { sortBy, sortDir, onSort } = useSortState();
  const [activeStatus, setActiveStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [paymentTarget, setPaymentTarget] = useState<Invoice | null>(null);
  const [emailTarget, setEmailTarget] = useState<Invoice | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);

  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const queryKey = ["invoices-client", { search, status: activeStatus, page, pageSize }];
  const { data: resp, isLoading } = useQuery({
    queryKey,
    queryFn: () => {
      const p = new URLSearchParams({ page: String(page), limit: String(pageSize), invoiceType: "client" });
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["invoices-client"] }); toast({ title: "Invoice updated" }); },
    onError: () => toast({ title: "Update failed", variant: "destructive" }),
  });

  const canPay = (s?: string | null) => !["paid", "refunded", "cancelled"].includes(s ?? "");
  const invalidate = () => { qc.invalidateQueries({ queryKey: ["invoices-client"] }); qc.invalidateQueries({ queryKey: ["ar-status"] }); };

  return (
    <div className="space-y-4">
      <ListToolbar
        search={search} onSearch={v => { setSearch(v); setPage(1); }}
        statuses={CLIENT_STATUSES} activeStatus={activeStatus} onStatusChange={s => { setActiveStatus(s); setPage(1); }}
        total={total} addLabel="New Invoice" onAdd={() => setShowNewModal(true)}
      />
      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <SortableTh col="invoiceNumber" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left">Invoice #</SortableTh>
              <SortableTh col="studentName" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left">Student / Contract</SortableTh>
              <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Amount</th>
              <SortableTh col="issuedAt" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left">Issued</SortableTh>
              <SortableTh col="dueDate" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left">Due</SortableTh>
              <SortableTh col="status" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left">Status</SortableTh>
              <th className="px-4 py-3 w-24" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? <SkeletonRows cols={7} />
              : rows.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-16 text-center text-muted-foreground text-sm">
                  <Receipt className="w-8 h-8 mx-auto mb-3 opacity-30" />No client invoices found
                </td></tr>
              ) : sorted.map(r => (
                <tr key={r.id} className="hover:bg-[#FEF0E3] transition-colors cursor-pointer" onClick={() => navigate(`/admin/accounting/invoices/${r.id}`)}>
                  <td className="px-4 py-3 font-mono text-xs font-medium">{r.invoiceNumber ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.studentName ?? "—"}</div>
                    {r.contractNumber && <div className="text-xs text-muted-foreground font-mono">{r.contractNumber}</div>}
                  </td>
                  <td className="px-4 py-3 text-right"><DualAmount amount={r.originalAmount ?? r.totalAmount} currency={r.originalCurrency ?? r.currency} audEquivalent={r.audEquivalent} /></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(r.issuedAt)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{r.dueDate ?? "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
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
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <TableFooter page={page} pageSize={pageSize} total={total} label="invoices" onPageChange={setPage} onPageSizeChange={v => { setPageSize(v); setPage(1); }} />

      <NewInvoiceModal open={showNewModal} onClose={() => setShowNewModal(false)} defaultType="client" onSuccess={invalidate} />
      <RecordPaymentModal invoice={paymentTarget} open={!!paymentTarget} onClose={() => setPaymentTarget(null)} onSuccess={invalidate} />
      <EmailInvoiceModal invoice={emailTarget} open={!!emailTarget} onClose={() => setEmailTarget(null)} onSuccess={invalidate} />
    </div>
  );
}

/* ── Agent Tab ──────────────────────────────────────────── */
const AGENT_STATUSES = ["draft", "sent", "paid", "overdue", "cancelled"];

function AgentTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const { sortBy, sortDir, onSort } = useSortState();
  const [activeStatus, setActiveStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [emailTarget, setEmailTarget] = useState<Invoice | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);

  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const queryKey = ["invoices-agent", { search, status: activeStatus, page, pageSize }];
  const { data: resp, isLoading } = useQuery({
    queryKey,
    queryFn: () => {
      const p = new URLSearchParams({ page: String(page), limit: String(pageSize), invoiceType: "agent" });
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["invoices-agent"] }); toast({ title: "Invoice updated" }); },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["invoices-agent"] });

  return (
    <div className="space-y-4">
      <ListToolbar
        search={search} onSearch={v => { setSearch(v); setPage(1); }}
        statuses={AGENT_STATUSES} activeStatus={activeStatus} onStatusChange={s => { setActiveStatus(s); setPage(1); }}
        total={total} addLabel="New Invoice" onAdd={() => setShowNewModal(true)}
      />
      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <SortableTh col="invoiceNumber" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left">Invoice #</SortableTh>
              <SortableTh col="studentName" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left">Student / Contract</SortableTh>
              <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Commission</th>
              <SortableTh col="issuedAt" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left">Issued</SortableTh>
              <SortableTh col="dueDate" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left">Due</SortableTh>
              <SortableTh col="status" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left">Status</SortableTh>
              <th className="px-4 py-3 w-24" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? <SkeletonRows cols={7} />
              : rows.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-16 text-center text-muted-foreground text-sm">
                  <FileText className="w-8 h-8 mx-auto mb-3 opacity-30" />No agent invoices found
                </td></tr>
              ) : sorted.map(r => (
                <tr key={r.id} className="hover:bg-[#FEF0E3] transition-colors cursor-pointer" onClick={() => navigate(`/admin/accounting/invoices/${r.id}`)}>
                  <td className="px-4 py-3 font-mono text-xs font-medium">{r.invoiceNumber ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.studentName ?? "—"}</div>
                    {r.contractNumber && <div className="text-xs text-muted-foreground font-mono">{r.contractNumber}</div>}
                  </td>
                  <td className="px-4 py-3 text-right"><DualAmount amount={r.originalAmount ?? r.totalAmount} currency={r.originalCurrency ?? r.currency} audEquivalent={r.audEquivalent} /></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(r.issuedAt)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{r.dueDate ?? "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {r.status === "sent" && (
                        <Button size="sm" className="h-6 text-[10px] px-2 bg-[#16A34A] hover:bg-[#15803D] text-white" onClick={e => { e.stopPropagation(); updateMutation.mutate({ id: r.id, payload: { status: "paid", paidAt: new Date().toISOString() } }); }}>Mark Paid</Button>
                      )}
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <TableFooter page={page} pageSize={pageSize} total={total} label="invoices" onPageChange={setPage} onPageSizeChange={v => { setPageSize(v); setPage(1); }} />

      <NewInvoiceModal open={showNewModal} onClose={() => setShowNewModal(false)} defaultType="agent" onSuccess={invalidate} />
      <EmailInvoiceModal invoice={emailTarget} open={!!emailTarget} onClose={() => setEmailTarget(null)} onSuccess={invalidate} />
    </div>
  );
}

/* ── Partner Tab ────────────────────────────────────────── */
const PARTNER_STATUSES = ["draft", "sent", "paid", "overdue", "cancelled"];

function PartnerTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const { sortBy, sortDir, onSort } = useSortState();
  const [activeStatus, setActiveStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [emailTarget, setEmailTarget] = useState<Invoice | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);

  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const queryKey = ["invoices-partner", { search, status: activeStatus, page, pageSize }];
  const { data: resp, isLoading } = useQuery({
    queryKey,
    queryFn: () => {
      const p = new URLSearchParams({ page: String(page), limit: String(pageSize), invoiceType: "partner" });
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["invoices-partner"] }); toast({ title: "Invoice updated" }); },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["invoices-partner"] });

  return (
    <div className="space-y-4">
      <ListToolbar
        search={search} onSearch={v => { setSearch(v); setPage(1); }}
        statuses={PARTNER_STATUSES} activeStatus={activeStatus} onStatusChange={s => { setActiveStatus(s); setPage(1); }}
        total={total} addLabel="New Invoice" onAdd={() => setShowNewModal(true)}
      />
      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <SortableTh col="invoiceNumber" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left">Invoice #</SortableTh>
              <SortableTh col="studentName" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left">Student / Contract</SortableTh>
              <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left">Provider Type</th>
              <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Amount</th>
              <SortableTh col="dueDate" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left">Due</SortableTh>
              <SortableTh col="status" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left">Status</SortableTh>
              <th className="px-4 py-3 w-24" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? <SkeletonRows cols={7} />
              : rows.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-16 text-center text-muted-foreground text-sm">
                  <Handshake className="w-8 h-8 mx-auto mb-3 opacity-30" />No partner invoices found
                </td></tr>
              ) : sorted.map(r => (
                <tr key={r.id} className="hover:bg-[#FEF0E3] transition-colors cursor-pointer" onClick={() => navigate(`/admin/accounting/invoices/${r.id}`)}>
                  <td className="px-4 py-3 font-mono text-xs font-medium">{r.invoiceNumber ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.studentName ?? "—"}</div>
                    {r.contractNumber && <div className="text-xs text-muted-foreground font-mono">{r.contractNumber}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-muted rounded text-xs capitalize">{r.invoiceType?.replace("partner_", "") ?? "—"}</span>
                  </td>
                  <td className="px-4 py-3 text-right"><DualAmount amount={r.originalAmount ?? r.totalAmount} currency={r.originalCurrency ?? r.currency} audEquivalent={r.audEquivalent} /></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{r.dueDate ?? "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {r.status === "sent" && (
                        <Button size="sm" className="h-6 text-[10px] px-2 bg-[#16A34A] hover:bg-[#15803D] text-white" onClick={e => { e.stopPropagation(); updateMutation.mutate({ id: r.id, payload: { status: "paid", paidAt: new Date().toISOString() } }); }}>Mark Paid</Button>
                      )}
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <TableFooter page={page} pageSize={pageSize} total={total} label="invoices" onPageChange={setPage} onPageSizeChange={v => { setPageSize(v); setPage(1); }} />

      <NewInvoiceModal open={showNewModal} onClose={() => setShowNewModal(false)} defaultType="partner" onSuccess={invalidate} />
      <EmailInvoiceModal invoice={emailTarget} open={!!emailTarget} onClose={() => setEmailTarget(null)} onSuccess={invalidate} />
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
      <div className="flex border-b border-border mb-5 -mt-1 overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 text-sm border-b-2 transition-colors font-medium whitespace-nowrap",
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
      {activeTab === "client"  && <ClientTab />}
      {activeTab === "agent"   && <AgentTab />}
      {activeTab === "partner" && <PartnerTab />}
    </div>
  );
}
