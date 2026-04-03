import { useState } from "react";
import { formatDate, formatDateTime } from "@/lib/date-format";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Mail, Printer, ExternalLink, Loader2,
  Copy, Check, Send,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { fetchLogoSrc, logoImgHtml } from "@/lib/branding";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

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

const STATUS_COLORS: Record<string, string> = {
  pending:  "bg-[#FEF9C3] text-[#CA8A04]",
  verified: "bg-[#DCFCE7] text-[#16A34A]",
  rejected: "bg-[#FEF2F2] text-[#DC2626]",
};

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
  createdAt?: string | null;
  updatedAt?: string | null;
}

function fmtDate(d: string | null | undefined): string {
  return formatDate(d);
}
function fmtDateTime(d: string | null | undefined): string {
  return formatDateTime(d);
}
function fmtAmount(amount?: string | number | null, currency?: string | null) {
  if (!amount) return "—";
  const sym = CURRENCY_SYMBOLS[currency ?? "AUD"] ?? (currency ?? "AUD");
  return `${sym}${Number(amount).toLocaleString("en-AU", { minimumFractionDigits: 2 })}`;
}

function StatusBadge({ status }: { status?: string | null }) {
  const s = (status ?? "pending").toLowerCase();
  return (
    <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium capitalize", STATUS_COLORS[s] ?? "bg-[#F4F3F1] text-[#57534E]")}>
      {s}
    </span>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold text-[#F5821F] uppercase tracking-widest border-b border-[#F5821F]/20 pb-2 mb-4">
      {children}
    </h3>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-stone-500 uppercase tracking-wide font-medium mb-0.5">{label}</div>
      <div className="text-sm text-stone-800">{children}</div>
    </div>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="ml-1.5 text-stone-400 hover:text-[#F5821F] transition-colors"
    >
      {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

async function printReceipt(rcp: Receipt) {
  const logoSrc = await fetchLogoSrc();
  const brandHtml = logoSrc ? logoImgHtml(logoSrc) : `<div class="brand">Edubee Camp</div>`;
  const amountStr = fmtAmount(rcp.originalAmount ?? rcp.amount, rcp.originalCurrency ?? rcp.currency);
  const methodLabel = PAYMENT_METHODS.find(m => m.value === rcp.paymentMethod)?.label ?? (rcp.paymentMethod ?? "—");
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Receipt ${rcp.receiptNumber ?? ""}</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;background:#fff;color:#1a1917;padding:48px;font-size:14px}.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px}.brand{font-size:28px;font-weight:700;color:#F5821F}.brand-sub{font-size:13px;color:#64748b;margin-top:2px}.rcp-title{text-align:right}.rcp-title h2{font-size:22px;font-weight:700;color:#1a1917}.rcp-title p{color:#64748b;font-size:13px;margin-top:4px}.badge{display:inline-block;padding:3px 12px;border-radius:999px;font-size:12px;font-weight:600;background:#DCFCE7;color:#16A34A;text-transform:capitalize;margin-top:8px}.divider{border:none;border-top:1px solid #e2e8f0;margin:24px 0}.grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:24px 0}.section h3{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;margin-bottom:8px}.section p{font-size:14px;color:#1a1917;margin-bottom:4px}.section .label{color:#64748b;font-size:12px}.amount-box{background:#f0fdf4;border:2px solid #86efac;border-radius:12px;padding:24px;text-align:center;margin:24px 0}.amount-box .label{font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px}.amount-box .value{font-size:32px;font-weight:700;color:#16A34A}table{width:100%;border-collapse:collapse;margin-top:24px}tbody td{padding:10px 12px;border-bottom:1px solid #f1f5f9}tbody td:first-child{color:#64748b;width:160px}.notes{margin-top:24px;padding:16px;background:#f8fafc;border-radius:8px}.notes h3{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;margin-bottom:6px}.footer{margin-top:48px;text-align:center;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:24px}@media print{body{padding:24px}}</style></head><body><div class="header"><div>${brandHtml}<div class="brand-sub">Educational Services</div></div><div class="rcp-title"><h2>RECEIPT</h2><p>${rcp.receiptNumber ?? "—"}</p><span class="badge">${rcp.status ?? "pending"}</span></div></div><hr class="divider"/><div class="grid"><div class="section"><h3>Received From</h3><p>${rcp.studentName ?? rcp.payerName ?? "—"}</p>${rcp.studentEmail ? `<p class="label">${rcp.studentEmail}</p>` : ""}</div><div class="section"><h3>Receipt Details</h3><p><span class="label">Date: </span>${rcp.receiptDate ?? "—"}</p>${rcp.invoiceNumber ? `<p><span class="label">Invoice: </span>${rcp.invoiceNumber}</p>` : ""}${rcp.contractNumber ? `<p><span class="label">Contract: </span>${rcp.contractNumber}</p>` : ""}${rcp.agentName ? `<p><span class="label">Agent: </span>${rcp.agentName}</p>` : ""}</div></div><div class="amount-box"><div class="label">Amount Received</div><div class="value">${amountStr}</div></div><table><tbody><tr><td>Payment Method</td><td>${methodLabel}</td></tr><tr><td>Receipt Date</td><td>${rcp.receiptDate ?? "—"}</td></tr>${rcp.confirmedAt ? `<tr><td>Confirmed At</td><td>${fmtDateTime(rcp.confirmedAt)}</td></tr>` : ""}</tbody></table>${rcp.notes ? `<div class="notes"><h3>Notes</h3><p>${rcp.notes}</p></div>` : ""}<div class="footer"><p>This receipt confirms that payment has been received.</p><p style="margin-top:4px">Edubee Camp Administration — admin@edubee.co</p></div><script>window.onload=()=>{window.print()}<\/script></body></html>`;
  const w = window.open("", "_blank");
  if (w) { w.document.write(html); w.document.close(); }
}

function EmailModal({
  receipt, open, onClose, onSuccess,
}: {
  receipt: Receipt; open: boolean; onClose: () => void; onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
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
            <Input type="email" placeholder={defaultEmail || "email@example.com"} value={email} onChange={e => setEmail(e.target.value)} />
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

function VerifyModal({
  receipt, open, onClose, onSuccess,
}: {
  receipt: Receipt; open: boolean; onClose: () => void; onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [status, setStatus] = useState(receipt.status ?? "pending");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.patch(`${BASE}/api/receipts/${receipt.id}`, {
        status,
        confirmedAt: status === "verified" ? new Date().toISOString() : undefined,
      });
      toast({ title: "Receipt updated" });
      onSuccess();
      onClose();
    } catch (e: any) {
      toast({ title: "Failed to update", description: e?.response?.data?.error ?? e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Update Status</DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-3">
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button className="bg-[#F5821F] hover:bg-[#d97706] text-white" onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />Saving…</> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ReceiptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [showEmail, setShowEmail] = useState(false);
  const [showVerify, setShowVerify] = useState(false);

  const { data: receipt, isLoading } = useQuery<Receipt>({
    queryKey: ["receipt-detail", id],
    queryFn: () => axios.get(`${BASE}/api/receipts/${id}`).then(r => r.data?.data ?? r.data),
    enabled: !!id,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["receipt-detail", id] });
  const methodLabel = PAYMENT_METHODS.find(m => m.value === receipt?.paymentMethod)?.label ?? receipt?.paymentMethod?.replace(/_/g, " ") ?? "—";

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center text-muted-foreground text-sm gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading receipt…
      </div>
    );
  }
  if (!receipt) {
    return (
      <div className="p-8 text-center text-muted-foreground text-sm">Receipt not found.</div>
    );
  }

  const hasAudEquiv = receipt.originalCurrency && receipt.originalCurrency !== "AUD" && receipt.audEquivalent;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => navigate("/admin/accounting/receipts")}>
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <div className="h-4 w-px bg-border" />
          <div>
            <span className="text-lg font-bold text-stone-800">Receipt</span>
            {receipt.receiptNumber && (
              <span className="ml-2 font-mono text-sm text-muted-foreground">{receipt.receiptNumber}</span>
            )}
          </div>
          <StatusBadge status={receipt.status} />
        </div>
        <div className="flex items-center gap-2">
          {receipt.status === "pending" && (
            <Button size="sm" variant="outline" className="gap-1.5 border-[#F5821F] text-[#F5821F] hover:bg-[#FEF0E3]" onClick={() => setShowVerify(true)}>
              Verify / Update Status
            </Button>
          )}
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowEmail(true)}>
            <Mail className="w-3.5 h-3.5" /> Email
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => printReceipt(receipt)}>
            <Printer className="w-3.5 h-3.5" /> Print / PDF
          </Button>
        </div>
      </div>

      {/* Amount highlight */}
      <div className="bg-[#F0FDF4] border border-[#86EFAC] rounded-2xl p-6 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Amount Received</p>
          <p className="text-3xl font-bold text-[#16A34A]">
            {fmtAmount(receipt.originalAmount ?? receipt.amount, receipt.originalCurrency ?? receipt.currency)}
          </p>
          {hasAudEquiv && (
            <p className="text-xs text-muted-foreground mt-1">≈ {fmtAmount(receipt.audEquivalent, "AUD")} AUD equivalent</p>
          )}
        </div>
        <StatusBadge status={receipt.status} />
      </div>

      {/* Sections grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Receipt Info */}
        <div className="bg-card border border-border rounded-xl p-5">
          <SectionTitle>Receipt Info</SectionTitle>
          <div className="space-y-4">
            <Field label="Receipt Number">
              <span className="font-mono font-medium">{receipt.receiptNumber ?? "—"}</span>
            </Field>
            <Field label="Payment Method">
              <span className="capitalize">{methodLabel}</span>
            </Field>
            <Field label="Status">
              <div className="flex items-center gap-2">
                <StatusBadge status={receipt.status} />
                {receipt.status !== "pending" && (
                  <button className="text-xs text-[#F5821F] hover:underline" onClick={() => setShowVerify(true)}>
                    Change
                  </button>
                )}
              </div>
            </Field>
          </div>
        </div>

        {/* Billing Info */}
        <div className="bg-card border border-border rounded-xl p-5">
          <SectionTitle>Billing Info</SectionTitle>
          <div className="space-y-4">
            <Field label="Student / Payer">
              <span className="font-medium">{receipt.studentName ?? receipt.payerName ?? "—"}</span>
            </Field>
            {receipt.studentEmail && (
              <Field label="Email">
                <a href={`mailto:${receipt.studentEmail}`} className="text-[#F5821F] hover:underline text-sm">
                  {receipt.studentEmail}
                </a>
              </Field>
            )}
            {receipt.agentName && (
              <Field label="Agent">
                {receipt.agentName}
              </Field>
            )}
            {receipt.invoiceId && (
              <Field label="Invoice">
                <button
                  onClick={() => navigate(`/admin/accounting/invoices/${receipt.invoiceId}`)}
                  className="flex items-center gap-1 text-[#F5821F] hover:underline font-mono text-xs"
                >
                  {receipt.invoiceNumber ?? receipt.invoiceId.slice(0, 8)}
                  <ExternalLink className="w-3 h-3" />
                </button>
              </Field>
            )}
            {receipt.contractId && (
              <Field label="Contract">
                <button
                  onClick={() => navigate(`/admin/crm/contracts/${receipt.contractId}`)}
                  className="flex items-center gap-1 text-[#F5821F] hover:underline font-mono text-xs"
                >
                  {receipt.contractNumber ?? receipt.contractId.slice(0, 8)}
                  <ExternalLink className="w-3 h-3" />
                </button>
              </Field>
            )}
          </div>
        </div>

        {/* Dates */}
        <div className="bg-card border border-border rounded-xl p-5">
          <SectionTitle>Dates</SectionTitle>
          <div className="space-y-4">
            <Field label="Receipt Date">{fmtDate(receipt.receiptDate)}</Field>
            {receipt.confirmedAt && (
              <Field label="Confirmed At">{fmtDateTime(receipt.confirmedAt)}</Field>
            )}
          </div>
        </div>

        {/* Notes */}
        {receipt.notes && (
          <div className="bg-card border border-border rounded-xl p-5">
            <SectionTitle>Notes</SectionTitle>
            <p className="text-sm text-stone-700 whitespace-pre-wrap">{receipt.notes}</p>
          </div>
        )}

        {/* Admin Info */}
        <div className={cn("bg-card border border-border rounded-xl p-5", !receipt.notes ? "md:col-start-2" : "")}>
          <SectionTitle>Admin Info</SectionTitle>
          <div className="space-y-4">
            <Field label="Receipt ID">
              <div className="flex items-center">
                <span className="font-mono text-xs text-stone-500">{receipt.id}</span>
                <CopyButton value={receipt.id} />
              </div>
            </Field>
            {receipt.createdAt && (
              <Field label="Created">{fmtDateTime(receipt.createdAt)}</Field>
            )}
            {receipt.updatedAt && (
              <Field label="Last Updated">{fmtDateTime(receipt.updatedAt)}</Field>
            )}
          </div>
        </div>
      </div>

      {showEmail && (
        <EmailModal receipt={receipt} open={showEmail} onClose={() => setShowEmail(false)} onSuccess={invalidate} />
      )}
      {showVerify && (
        <VerifyModal receipt={receipt} open={showVerify} onClose={() => setShowVerify(false)} onSuccess={invalidate} />
      )}
    </div>
  );
}
