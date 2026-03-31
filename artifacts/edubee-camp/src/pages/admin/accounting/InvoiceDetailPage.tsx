import { useState } from "react";
import { formatDate, formatDateTime } from "@/lib/date-format";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Receipt, Send, CreditCard, Printer, Mail, ExternalLink,
  Loader2, CheckCircle2, Copy, Check,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { fetchLogoSrc, logoImgHtml } from "@/lib/branding";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

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

const STATUS_OPTIONS = [
  "draft", "sent", "partially_paid", "awaiting_receipt",
  "paid", "overdue", "cancelled", "refunded",
];

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
  createdAt?: string | null;
  updatedAt?: string | null;
}

function fmtDate(d: string | null | undefined): string {
  return formatDate(d);
}

function fmtAmount(amount?: string | number | null, currency?: string | null) {
  if (!amount) return "—";
  const sym = CURRENCY_SYMBOLS[currency ?? "AUD"] ?? (currency ?? "AUD");
  return `${sym}${Number(amount).toLocaleString("en-AU", { minimumFractionDigits: 2 })}`;
}

function StatusBadge({ status }: { status?: string | null }) {
  const s = (status ?? "draft").toLowerCase();
  return (
    <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium capitalize", STATUS_COLORS[s] ?? STATUS_COLORS.draft)}>
      {s.replace(/_/g, " ")}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-[#E8E6E2] p-5 space-y-4">
      <h3 className="text-xs font-semibold text-[#F5821F] uppercase tracking-widest border-b border-[#F5821F]/20 pb-2">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-2 items-start text-sm">
      <span className="text-xs font-medium text-stone-500 uppercase tracking-wide pt-0.5">{label}</span>
      <span className="text-stone-800">{children}</span>
    </div>
  );
}

function CopyId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-xs text-stone-500 truncate max-w-[260px]">{id}</span>
      <button
        onClick={() => { navigator.clipboard.writeText(id); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
        className="text-stone-400 hover:text-[#F5821F] transition-colors shrink-0"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

/* ── Record Payment Dialog ──────────────────────────────── */
function RecordPaymentDialog({ invoice, open, onClose, onSuccess }: {
  invoice: Invoice; open: boolean; onClose: () => void; onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    amount: "",
    bankReference: "",
    transactionDate: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.amount || Number(form.amount) <= 0) {
      toast({ title: "유효한 금액을 입력하세요.", variant: "destructive" }); return;
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
      toast({ title: "결제 기록 완료", description: `${fmtAmount(form.amount, invoice.currency ?? "AUD")} recorded for ${invoice.invoiceNumber}` });
      onSuccess();
      onClose();
      setForm({ amount: "", bankReference: "", transactionDate: new Date().toISOString().split("T")[0], notes: "" });
    } catch (e: any) {
      toast({ title: "기록 실패", description: e?.response?.data?.error ?? e.message, variant: "destructive" });
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
            <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span>{fmtAmount(invoice.originalAmount ?? invoice.totalAmount, invoice.originalCurrency ?? invoice.currency)}</span></div>
          </div>
          <div className="space-y-1"><Label>Amount</Label>
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
            {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null} Record Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Email Dialog ───────────────────────────────────────── */
function EmailDialog({ invoice, open, onClose, onSuccess }: {
  invoice: Invoice; open: boolean; onClose: () => void; onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    const to = email || invoice.studentEmail || "";
    if (!to) { toast({ title: "이메일 주소를 입력하세요.", variant: "destructive" }); return; }
    setSending(true);
    try {
      const resp = await axios.post(`${BASE}/api/invoices/${invoice.id}/send-email`, { email: to });
      if (resp.data?.mocked) {
        toast({ title: "Invoice email logged (mock)", description: `Email would be sent to ${to}` });
      } else {
        toast({ title: "Invoice sent!", description: `Email sent to ${to}` });
      }
      onSuccess(); onClose(); setEmail("");
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
          </div>
          <div className="space-y-1.5">
            <Label>Recipient Email</Label>
            <Input type="email" placeholder={invoice.studentEmail ?? "email@example.com"} value={email} onChange={e => setEmail(e.target.value)} />
            {invoice.studentEmail && !email && (
              <p className="text-xs text-muted-foreground">Sending to <span className="font-medium">{invoice.studentEmail}</span></p>
            )}
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => { onClose(); setEmail(""); }} disabled={sending}>Cancel</Button>
          <Button className="bg-[#F5821F] hover:bg-[#d97706] text-white gap-1.5" onClick={handleSend} disabled={sending}>
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Send Email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Print helper ───────────────────────────────────────── */
async function printInvoice(inv: Invoice) {
  const logoSrc = await fetchLogoSrc();
  const brandHtml = logoSrc ? logoImgHtml(logoSrc) : `<div class="brand">Edubee Camp</div>`;
  const sym = CURRENCY_SYMBOLS[inv.originalCurrency ?? inv.currency ?? "AUD"] ?? (inv.originalCurrency ?? inv.currency ?? "AUD");
  const amount = inv.originalAmount ?? inv.totalAmount;
  const amountStr = amount ? `${sym}${Number(amount).toLocaleString("en-AU", { minimumFractionDigits: 2 })}` : "—";

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Invoice ${inv.invoiceNumber ?? ""}</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;background:#fff;color:#1a1917;padding:48px;font-size:14px}.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px}.brand{font-size:28px;font-weight:700;color:#F5821F}.brand-sub{font-size:13px;color:#64748b;margin-top:2px}.inv-title{text-align:right}.inv-title h2{font-size:22px;font-weight:700}.inv-title p{color:#64748b;font-size:13px;margin-top:4px}.badge{display:inline-block;padding:3px 12px;border-radius:999px;font-size:12px;font-weight:600;background:#FEF0E3;color:#F5821F;text-transform:capitalize;margin-top:8px}.divider{border:none;border-top:1px solid #e2e8f0;margin:24px 0}.grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:24px 0}.section h3{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;margin-bottom:8px}.section p{font-size:14px;color:#1a1917;margin-bottom:4px}.section .label{color:#64748b;font-size:12px}table{width:100%;border-collapse:collapse;margin-top:24px}thead tr{background:#f8fafc}thead th{padding:10px 12px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#64748b;border-bottom:1px solid #e2e8f0}tbody td{padding:12px;border-bottom:1px solid #f1f5f9}.total-row td{font-weight:700;font-size:16px;color:#F5821F;border-top:2px solid #e2e8f0;padding-top:16px}.notes{margin-top:32px;padding:16px;background:#f8fafc;border-radius:8px}.notes h3{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;margin-bottom:6px}.footer{margin-top:48px;text-align:center;font-size:12px;color:#94a3b8}@media print{body{padding:24px}}</style></head>
<body>
<div class="header"><div>${brandHtml}<div class="brand-sub">Educational Services</div></div>
<div class="inv-title"><h2>INVOICE</h2><p>${inv.invoiceNumber ?? "—"}</p><span class="badge">${(inv.status ?? "draft").replace(/_/g, " ")}</span></div></div>
<hr class="divider"/>
<div class="grid"><div class="section"><h3>Bill To</h3><p>${inv.studentName ?? "—"}</p>${inv.studentEmail ? `<p class="label">${inv.studentEmail}</p>` : ""}</div>
<div class="section"><h3>Invoice Details</h3><p><span class="label">Date Issued: </span>${inv.issuedAt ? formatDate(inv.issuedAt) : "—"}</p><p><span class="label">Due Date: </span>${inv.dueDate ?? "—"}</p>${inv.contractNumber ? `<p><span class="label">Contract: </span>${inv.contractNumber}</p>` : ""}${inv.agentName ? `<p><span class="label">Agent: </span>${inv.agentName}</p>` : ""}</div></div>
<table><thead><tr><th>Description</th><th style="text-align:right">Amount</th></tr></thead>
<tbody><tr><td>${inv.invoiceType ? inv.invoiceType.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()) : "Service"} — ${inv.studentName ?? ""}</td><td style="text-align:right">${amountStr}</td></tr></tbody>
<tfoot><tr class="total-row"><td>Total Due</td><td style="text-align:right">${amountStr}</td></tr></tfoot></table>
${inv.notes ? `<div class="notes"><h3>Notes</h3><p>${inv.notes}</p></div>` : ""}
<div class="footer"><p>Thank you for your business. Please remit payment by the due date.</p><p style="margin-top:4px">Edubee Camp Administration — admin@edubee.com</p></div>
<script>window.onload=()=>{window.print()}<\/script></body></html>`;

  const w = window.open("", "_blank");
  if (w) { w.document.write(html); w.document.close(); }
}

/* ── Main Page ──────────────────────────────────────────── */
export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [showPayment, setShowPayment] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [editStatus, setEditStatus] = useState<string | null>(null);

  const { data: invoice, isLoading } = useQuery<Invoice>({
    queryKey: ["invoice-detail", id],
    queryFn: () => axios.get(`${BASE}/api/invoices/${id}`).then(r => r.data),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<Invoice>) =>
      axios.put(`${BASE}/api/invoices/${id}`, payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoice-detail", id] });
      qc.invalidateQueries({ queryKey: ["invoices-client"] });
      qc.invalidateQueries({ queryKey: ["invoices-agent"] });
      qc.invalidateQueries({ queryKey: ["invoices-partner"] });
      toast({ title: "Invoice updated" });
      setEditStatus(null);
    },
    onError: () => toast({ variant: "destructive", title: "Update failed" }),
  });

  const canPay = (s?: string | null) => !["paid", "refunded", "cancelled"].includes(s ?? "");
  const isDraft = invoice?.status === "draft";

  if (isLoading) {
    return (
      <div className="p-6 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading invoice…
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-6 text-center space-y-3">
        <Receipt className="w-10 h-10 mx-auto text-stone-300" />
        <p className="text-muted-foreground">Invoice not found.</p>
        <Button variant="outline" size="sm" onClick={() => navigate("/admin/accounting/invoices")}>
          Back to Invoices
        </Button>
      </div>
    );
  }

  const typeLabel = (invoice.invoiceType ?? "").replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());

  return (
    <div className="p-6 max-w-3xl space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 mt-0.5"
          onClick={() => navigate("/admin/accounting/invoices")}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-9 h-9 rounded-lg bg-[#F5821F]/10 flex items-center justify-center shrink-0">
              <Receipt className="w-5 h-5 text-[#F5821F]" />
            </div>
            <div>
              <h1 className="text-lg font-bold font-mono leading-none">{invoice.invoiceNumber ?? "Invoice"}</h1>
              <p className="text-xs text-stone-500 mt-0.5">{typeLabel}</p>
            </div>
            <StatusBadge status={invoice.status} />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {isDraft && (
            <Button
              size="sm"
              className="bg-[#F5821F] hover:bg-[#d97706] text-white gap-1.5"
              disabled={updateMutation.isPending}
              onClick={() => updateMutation.mutate({ status: "sent", issuedAt: new Date().toISOString() })}
            >
              <Send className="w-3.5 h-3.5" /> Mark as Sent
            </Button>
          )}
          {canPay(invoice.status) && (
            <Button size="sm" className="bg-[#F5821F] hover:bg-[#d97706] text-white gap-1.5" onClick={() => setShowPayment(true)}>
              <CreditCard className="w-3.5 h-3.5" /> Record Payment
            </Button>
          )}
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowEmail(true)}>
            <Mail className="w-3.5 h-3.5" /> Email
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => printInvoice(invoice)}>
            <Printer className="w-3.5 h-3.5" /> Print
          </Button>
        </div>
      </div>

      {/* ── Invoice Info ── */}
      <Section title="Invoice Info">
        <div className="space-y-3">
          <Field label="Invoice Number">
            <span className="font-mono text-sm">{invoice.invoiceNumber ?? "—"}</span>
          </Field>
          <Field label="Type">
            <span className="capitalize">{typeLabel || "—"}</span>
          </Field>
          <Field label="Status">
            <div className="flex items-center gap-2">
              {editStatus === null ? (
                <>
                  <StatusBadge status={invoice.status} />
                  <button
                    className="text-xs text-[#F5821F] hover:underline"
                    onClick={() => setEditStatus(invoice.status ?? "draft")}
                  >
                    변경
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger className="h-7 text-xs w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(s => (
                        <SelectItem key={s} value={s} className="text-xs capitalize">{s.replace(/_/g, " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" className="h-7 text-xs bg-[#F5821F] hover:bg-[#d97706] text-white px-2"
                    disabled={updateMutation.isPending}
                    onClick={() => updateMutation.mutate({ status: editStatus })}>
                    {updateMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => setEditStatus(null)}>Cancel</Button>
                </div>
              )}
            </div>
          </Field>
          <Field label="Amount">
            <div className="space-y-0.5">
              <span className="font-semibold text-stone-900">
                {fmtAmount(invoice.originalAmount ?? invoice.totalAmount, invoice.originalCurrency ?? invoice.currency)}
              </span>
              {invoice.currency && invoice.currency !== "AUD" && invoice.audEquivalent && (
                <span className="ml-2 text-xs text-stone-400">
                  ≈ {fmtAmount(invoice.audEquivalent, "AUD")}
                </span>
              )}
            </div>
          </Field>
          <Field label="Currency">{invoice.originalCurrency ?? invoice.currency ?? "AUD"}</Field>
        </div>
      </Section>

      {/* ── Billing Info ── */}
      <Section title="Billing Info">
        <div className="space-y-3">
          <Field label="Student">{invoice.studentName ?? "—"}</Field>
          {invoice.studentEmail && (
            <Field label="Student Email">
              <a href={`mailto:${invoice.studentEmail}`} className="text-[#F5821F] hover:underline text-sm">
                {invoice.studentEmail}
              </a>
            </Field>
          )}
          {invoice.agentName && <Field label="Agent">{invoice.agentName}</Field>}
          <Field label="Contract">
            {invoice.contractId ? (
              <button
                className="flex items-center gap-1 text-[#F5821F] hover:underline font-mono text-xs font-medium"
                onClick={() => navigate(`/admin/crm/contracts/${invoice.contractId}`)}
              >
                {invoice.contractNumber ?? invoice.contractId.slice(0, 8)}
                <ExternalLink className="w-3 h-3" />
              </button>
            ) : <span className="text-stone-400">—</span>}
          </Field>
        </div>
      </Section>

      {/* ── Dates ── */}
      <Section title="Dates">
        <div className="space-y-3">
          <Field label="Issued">{fmtDate(invoice.issuedAt)}</Field>
          <Field label="Due">
            <span className={cn(
              invoice.status === "overdue" ? "text-red-600 font-medium" : ""
            )}>
              {invoice.dueDate ?? "—"}
            </span>
          </Field>
          {invoice.paidAt && <Field label="Paid At">{fmtDate(invoice.paidAt)}</Field>}
        </div>
      </Section>

      {/* ── Notes ── */}
      {invoice.notes && (
        <Section title="Notes">
          <p className="text-sm text-stone-700 whitespace-pre-wrap">{invoice.notes}</p>
        </Section>
      )}

      {/* ── Admin Info ── */}
      <Section title="Admin Info">
        <div className="space-y-3">
          <Field label="Invoice ID"><CopyId id={invoice.id} /></Field>
          {invoice.createdAt && <Field label="Created">{fmtDate(invoice.createdAt)}</Field>}
          {invoice.updatedAt && <Field label="Last Updated">{fmtDate(invoice.updatedAt)}</Field>}
        </div>
      </Section>

      {/* ── Dialogs ── */}
      <RecordPaymentDialog
        invoice={invoice}
        open={showPayment}
        onClose={() => setShowPayment(false)}
        onSuccess={() => qc.invalidateQueries({ queryKey: ["invoice-detail", id] })}
      />
      <EmailDialog
        invoice={invoice}
        open={showEmail}
        onClose={() => setShowEmail(false)}
        onSuccess={() => {}}
      />
    </div>
  );
}
