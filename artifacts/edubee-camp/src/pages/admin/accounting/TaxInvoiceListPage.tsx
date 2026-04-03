import { useState, useEffect, useRef } from "react";
import { formatDate, formatDateTime } from "@/lib/date-format";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  FileText, Download, Send, CheckCircle2, Clock,
  DollarSign, Plus, Printer, X, ExternalLink, Search,
  Building2, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { SortableTh, useSortState, useSorted } from "@/components/ui/sortable-th";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const EMPTY: any[] = [];

function fmtAud(val: string | number | null | undefined) {
  if (val == null) return "—";
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n)) return "—";
  return `A$${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtDate(d: string | null | undefined): string {
  return formatDate(d);
}

const TABS = [
  { key: "", label: "All" },
  { key: "net", label: "NET" },
  { key: "gross", label: "GROSS" },
];
const STATUS_TABS = [
  { key: "", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "sent", label: "Sent" },
  { key: "paid", label: "Paid" },
];
const STATUS_STYLES: Record<string, string> = {
  draft: "bg-amber-50 text-amber-700 border border-amber-200",
  sent: "bg-blue-50 text-blue-700 border border-blue-200",
  paid: "bg-green-50 text-green-700 border border-green-200",
};

// ─── New Tax Invoice Modal ──────────────────────────────────────────────────
function NewTaxInvoiceModal({
  open, onClose, onCreated,
}: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const { toast } = useToast();
  const [cpQuery, setCpQuery] = useState("");
  const [selectedCp, setSelectedCp] = useState<any>(null);
  const [acctQuery, setAcctQuery] = useState("");
  const [selectedAcct, setSelectedAcct] = useState<any>(null);
  const [invoiceType, setInvoiceType] = useState<"net" | "gross">("net");
  const [commission, setCommission] = useState("");
  const [isGstFree, setIsGstFree] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [cpOpen, setCpOpen] = useState(false);
  const [acctOpen, setAcctOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const cpRef = useRef<HTMLDivElement>(null);
  const acctRef = useRef<HTMLDivElement>(null);

  // Contract product search
  const { data: cpData } = useQuery({
    queryKey: ["cp-search", cpQuery],
    queryFn: async () => {
      const r = await fetch(`${BASE}/api/tax-invoices/contract-products/search?q=${encodeURIComponent(cpQuery)}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: cpQuery.length >= 2 || cpOpen,
    staleTime: 10_000,
  });

  // Account search
  const { data: acctData } = useQuery({
    queryKey: ["accounts-search-ti", acctQuery],
    queryFn: async () => {
      const r = await fetch(`${BASE}/api/crm/accounts?search=${encodeURIComponent(acctQuery)}&limit=30`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: acctQuery.length >= 1 || acctOpen,
    staleTime: 10_000,
  });

  const cpRows: any[] = cpData?.data ?? EMPTY;
  const acctRows: any[] = acctData?.data ?? EMPTY;

  function pickCp(cp: any) {
    setSelectedCp(cp);
    setCpOpen(false);
    setCpQuery(`${cp.studentName} — ${cp.name}`);
    setCommission(cp.commissionAmount ? parseFloat(cp.commissionAmount).toFixed(2) : "");
    setInvoiceType(cp.remittanceMethod === "gross" ? "gross" : "net");
    setIsGstFree(cp.isGstFree ?? false);
  }

  function pickAcct(a: any) {
    setSelectedAcct(a);
    setAcctOpen(false);
    setAcctQuery(a.name);
  }

  // Click-outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (cpRef.current && !cpRef.current.contains(e.target as Node)) setCpOpen(false);
      if (acctRef.current && !acctRef.current.contains(e.target as Node)) setAcctOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // GST calculation preview
  const commNum = parseFloat(commission) || 0;
  const gst = isGstFree ? 0 : parseFloat((commNum * 0.1).toFixed(2));
  const total = parseFloat((commNum + gst).toFixed(2));

  async function handleCreate() {
    if (!selectedCp) return toast({ title: "Select a contract product", variant: "destructive" });
    if (!selectedAcct) return toast({ title: "Select a school account", variant: "destructive" });
    if (!commission || isNaN(commNum) || commNum <= 0) return toast({ title: "Enter a valid commission amount", variant: "destructive" });

    setCreating(true);
    try {
      const r = await fetch(`${BASE}/api/tax-invoices`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractProductId: selectedCp.id,
          schoolAccountId: selectedAcct.id,
          invoiceType,
          commissionAmount: commNum,
          isGstFree,
          dueDate: dueDate || undefined,
        }),
      });
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.error ?? "Failed to create");
      }
      toast({ title: "Tax Invoice created", description: "Invoice saved as Draft." });
      onCreated();
      onClose();
      // Reset
      setCpQuery(""); setSelectedCp(null);
      setAcctQuery(""); setSelectedAcct(null);
      setCommission(""); setDueDate("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E6E2]">
          <h2 className="text-base font-bold text-[#1C1917]">New Tax Invoice</h2>
          <button onClick={onClose} className="text-[#A8A29E] hover:text-[#1C1917]"><X size={18} /></button>
        </div>
        <div className="px-6 py-5 space-y-5">

          {/* Contract Product picker */}
          <div ref={cpRef} className="relative">
            <Label className="text-xs font-semibold text-[#78716C] uppercase tracking-wide mb-1.5 block">
              Contract Product <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E]" />
              <input
                className="w-full pl-8 pr-3 py-2 border border-[#E8E6E2] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-(--e-orange)/30"
                placeholder="Search by student name, contract #, or program…"
                value={cpQuery}
                onChange={e => { setCpQuery(e.target.value); setCpOpen(true); }}
                onFocus={() => setCpOpen(true)}
              />
            </div>
            {cpOpen && cpRows.length > 0 && (
              <div className="absolute z-50 mt-1 w-full bg-white border border-[#E8E6E2] rounded-lg shadow-lg max-h-52 overflow-y-auto">
                {cpRows.map(cp => (
                  <button
                    key={cp.id}
                    className="w-full text-left px-3 py-2.5 hover:bg-[#F5F4F2] border-b border-[#F5F4F2] last:border-0"
                    onClick={() => pickCp(cp)}
                  >
                    <div className="text-sm font-medium text-[#1C1917]">{cp.studentName}</div>
                    <div className="text-xs text-[#78716C]">{cp.contractNumber} · {cp.name}</div>
                    {cp.commissionAmount && (
                      <div className="text-xs text-(--e-orange) font-medium mt-0.5">{fmtAud(cp.commissionAmount)} commission</div>
                    )}
                  </button>
                ))}
              </div>
            )}
            {selectedCp && (
              <div className="mt-1.5 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg text-xs">
                <span className="font-semibold text-[#1C1917]">{selectedCp.studentName}</span>
                <span className="text-[#78716C] ml-1">· {selectedCp.contractNumber}</span>
                <div className="text-[#78716C] mt-0.5">{selectedCp.name}</div>
              </div>
            )}
          </div>

          {/* School Account picker */}
          <div ref={acctRef} className="relative">
            <Label className="text-xs font-semibold text-[#78716C] uppercase tracking-wide mb-1.5 block">
              School Account <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E]" />
              <input
                className="w-full pl-8 pr-3 py-2 border border-[#E8E6E2] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-(--e-orange)/30"
                placeholder="Search school / institution name…"
                value={acctQuery}
                onChange={e => { setAcctQuery(e.target.value); setAcctOpen(true); }}
                onFocus={() => setAcctOpen(true)}
              />
            </div>
            {acctOpen && acctRows.length > 0 && (
              <div className="absolute z-50 mt-1 w-full bg-white border border-[#E8E6E2] rounded-lg shadow-lg max-h-44 overflow-y-auto">
                {acctRows.map((a: any) => (
                  <button
                    key={a.id}
                    className="w-full text-left px-3 py-2 hover:bg-[#F5F4F2] border-b border-[#F5F4F2] last:border-0"
                    onClick={() => pickAcct(a)}
                  >
                    <div className="text-sm font-medium text-[#1C1917]">{a.name}</div>
                    {a.email && <div className="text-xs text-[#A8A29E]">{a.email}</div>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Invoice Type */}
          <div>
            <Label className="text-xs font-semibold text-[#78716C] uppercase tracking-wide mb-1.5 block">Invoice Type</Label>
            <div className="flex gap-2">
              {(["net", "gross"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setInvoiceType(t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                    invoiceType === t
                      ? t === "net"
                        ? "bg-purple-600 text-white border-purple-600"
                        : "bg-sky-600 text-white border-sky-600"
                      : "border-[#E8E6E2] text-[#57534E] hover:bg-[#F5F4F2]"
                  }`}
                >
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Commission + GST-free */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold text-[#78716C] uppercase tracking-wide mb-1.5 block">
                Commission (A$) <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={commission}
                onChange={e => setCommission(e.target.value)}
                className="text-sm"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-[#78716C] uppercase tracking-wide mb-1.5 block">Due Date</Label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="text-sm" />
            </div>
          </div>

          {/* GST free toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isGstFree}
              onChange={e => setIsGstFree(e.target.checked)}
              className="w-4 h-4 accent-(--e-orange)"
            />
            <span className="text-sm text-[#57534E]">GST-Free (overseas / exempt school)</span>
          </label>

          {/* Amount preview */}
          {commNum > 0 && (
            <div className="bg-[#FAFAF9] rounded-xl border border-[#E8E6E2] p-4 space-y-1.5">
              <div className="flex justify-between text-sm text-[#57534E]">
                <span>Commission</span><span>{fmtAud(commNum)}</span>
              </div>
              <div className="flex justify-between text-sm text-[#57534E]">
                <span>GST (10%)</span>
                <span>{isGstFree ? <span className="text-xs text-[#A8A29E]">GST-free</span> : fmtAud(gst)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-[#1C1917] pt-1 border-t border-[#E8E6E2]">
                <span>Total</span><span className="text-(--e-orange)">{fmtAud(total)}</span>
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-3 px-6 pb-5">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            className="flex-1 bg-(--e-orange) hover:bg-[#E5721F] text-white"
            onClick={handleCreate}
            disabled={creating}
          >
            {creating ? "Creating…" : "Create Tax Invoice"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Email Modal ────────────────────────────────────────────────────────────
function EmailTaxInvoiceModal({
  row, open, onClose, onSent,
}: { row: any; open: boolean; onClose: () => void; onSent: () => void }) {
  const { toast } = useToast();
  const [email, setEmail] = useState(row?.schoolEmail ?? row?.sentToEmail ?? "");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (row) setEmail(row.schoolEmail ?? row.sentToEmail ?? "");
  }, [row]);

  async function handleSend() {
    if (!email.trim()) return toast({ title: "Enter an email address", variant: "destructive" });
    setSending(true);
    try {
      const r = await fetch(`${BASE}/api/tax-invoices/${row.id}/send`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? "Failed to send");
      toast({ title: "Email sent", description: `Tax Invoice sent to ${email}` });
      onSent();
      onClose();
    } catch (err: any) {
      toast({ title: "Send failed", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  }

  if (!open || !row) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E6E2]">
          <h2 className="text-base font-bold text-[#1C1917]">Email Tax Invoice</h2>
          <button onClick={onClose} className="text-[#A8A29E] hover:text-[#1C1917]"><X size={18} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700 border border-blue-200">
            <strong>{row.invoiceRef}</strong> · {row.schoolName ?? "School"} · {fmtAud(row.totalAmount)}
          </div>
          <div>
            <Label className="text-xs font-semibold text-[#78716C] uppercase tracking-wide mb-1.5 block">To Email</Label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="school@institution.com"
              className="text-sm"
            />
            {row.schoolEmail && (
              <p className="text-xs text-[#A8A29E] mt-1">Default school email: {row.schoolEmail}</p>
            )}
          </div>
          <div className="text-xs text-[#A8A29E]">
            The tax invoice with PDF attachment will be sent to the school.
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-5">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-(--e-orange) hover:bg-[#E5721F] text-white" onClick={handleSend} disabled={sending}>
            <Send size={14} className="mr-2" />{sending ? "Sending…" : "Send Email"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Print function ─────────────────────────────────────────────────────────
function printTaxInvoice(row: any) {
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return;
  const _bc = getComputedStyle(document.documentElement).getPropertyValue("--e-orange").trim() || "#F5821F";
  const typeLabel = row.invoiceType === "gross" ? "GROSS" : "NET";
  const typeColor = row.invoiceType === "gross" ? "#0284c7" : "#7c3aed";
  w.document.write(`<!DOCTYPE html><html><head>
<meta charset="utf-8" />
<title>${row.invoiceRef}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 13px; color: #1C1917; background:#fff; padding: 40px; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:32px; }
  .logo-area h1 { font-size:22px; font-weight:800; color:${_bc}; }
  .logo-area p { color:#78716C; font-size:12px; margin-top:2px; }
  .ref-area { text-align:right; }
  .ref-area .ref { font-size:18px; font-weight:700; color:#1C1917; font-family:monospace; }
  .ref-area .badge { display:inline-block; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:700;
    background:${typeColor}22; color:${typeColor}; border:1px solid ${typeColor}44; margin-top:6px; }
  .divider { border:none; border-top:2px solid ${_bc}; margin:0 0 24px 0; }
  .meta-grid { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:28px; }
  .meta-section h3 { font-size:10px; font-weight:700; text-transform:uppercase; color:#78716C; letter-spacing:0.05em; margin-bottom:6px; }
  .meta-section p { font-size:13px; color:#1C1917; line-height:1.6; }
  .amount-box { background:#F0FDF4; border:1px solid #86EFAC; border-radius:12px; padding:20px 24px; margin-bottom:28px; }
  .amount-box .label { font-size:11px; font-weight:700; text-transform:uppercase; color:#15803d; letter-spacing:0.05em; margin-bottom:8px; }
  .amount-box .big { font-size:32px; font-weight:800; color:#15803d; }
  .breakdown { width:100%; border-collapse:collapse; margin-bottom:28px; }
  .breakdown th { background:#FAFAF9; padding:10px 14px; text-align:left; font-size:11px; font-weight:700; color:#78716C; text-transform:uppercase; letter-spacing:0.05em; border-bottom:1px solid #E8E6E2; }
  .breakdown td { padding:10px 14px; border-bottom:1px solid #F5F4F2; font-size:13px; }
  .breakdown tfoot td { font-weight:700; color:#1C1917; padding:12px 14px; background:#FAFAF9; font-size:14px; }
  .footer { text-align:center; font-size:11px; color:#A8A29E; margin-top:40px; border-top:1px solid #E8E6E2; padding-top:16px; }
  @media print { body { padding:20px; } }
</style></head><body>
<div class="header">
  <div class="logo-area">
    <h1>Edubee Camp</h1>
    <p>Education Agency · Tax Invoice</p>
  </div>
  <div class="ref-area">
    <div class="ref">${row.invoiceRef}</div>
    <div class="badge">${typeLabel} INVOICE</div>
    <p style="font-size:12px;color:#78716C;margin-top:6px;">Date: ${fmtDate(row.invoiceDate)}</p>
    ${row.dueDate ? `<p style="font-size:12px;color:#78716C;">Due: ${fmtDate(row.dueDate)}</p>` : ""}
  </div>
</div>
<hr class="divider" />
<div class="meta-grid">
  <div class="meta-section">
    <h3>School / Institution</h3>
    <p><strong>${row.schoolName ?? "—"}</strong></p>
    ${row.schoolEmail ? `<p style="color:#78716C;">${row.schoolEmail}</p>` : ""}
  </div>
  <div class="meta-section">
    <h3>Student / Program</h3>
    <p><strong>${row.studentName ?? "—"}</strong></p>
    <p style="color:#78716C;">${row.programName ?? "—"}</p>
    ${row.courseStartDate ? `<p style="color:#78716C;font-size:12px;">Course: ${fmtDate(row.courseStartDate)} – ${fmtDate(row.courseEndDate)}</p>` : ""}
  </div>
</div>
<div class="amount-box">
  <div class="label">Total Amount Due</div>
  <div class="big">${fmtAud(row.totalAmount)}</div>
</div>
<table class="breakdown">
  <thead><tr><th>Description</th><th style="text-align:right;">Amount (A$)</th></tr></thead>
  <tbody>
    <tr><td>Commission (${typeLabel})</td><td style="text-align:right;">${fmtAud(row.commissionAmount)}</td></tr>
    <tr><td>${row.isGstFree ? "GST — Exempt" : "GST (10%)"}</td>
        <td style="text-align:right;">${row.isGstFree ? "<span style='color:#A8A29E;font-size:12px;'>GST-free</span>" : fmtAud(row.gstAmount)}</td></tr>
  </tbody>
  <tfoot><tr><td>Total</td><td style="text-align:right;color:#15803d;">${fmtAud(row.totalAmount)}</td></tr></tfoot>
</table>
<div class="footer">This is a tax invoice issued by Edubee Camp Pty Ltd for commission services.</div>
</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
}

// ─── Detail Sheet ───────────────────────────────────────────────────────────
function TaxInvoiceDetailSheet({
  row, open, onClose,
  onEmail, onPrint, onSend, onPaid, sendPending, paidPending,
}: {
  row: any; open: boolean; onClose: () => void;
  onEmail: () => void; onPrint: () => void;
  onSend: () => void; onPaid: () => void;
  sendPending: boolean; paidPending: boolean;
}) {
  const [, navigate] = useLocation();
  if (!row) return null;

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-2 text-base">
            <FileText size={16} className="text-(--e-orange)" />
            {row.invoiceRef}
            <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[row.status] ?? ""}`}>
              {row.status}
            </span>
          </SheetTitle>
        </SheetHeader>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 mb-6 pb-4 border-b border-[#E8E6E2]">
          <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={onPrint}>
            <Printer size={13} />Print / PDF
          </Button>
          {row.status !== "paid" && (
            <Button
              size="sm" variant="outline"
              className="text-xs gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50"
              onClick={onEmail}
            >
              <Send size={13} />Email Invoice
            </Button>
          )}
          {row.status !== "paid" && (
            <Button
              size="sm" variant="outline"
              className="text-xs gap-1.5 text-green-600 border-green-200 hover:bg-green-50"
              onClick={onPaid}
              disabled={paidPending}
            >
              <CheckCircle2 size={13} />{paidPending ? "Updating…" : "Mark Paid"}
            </Button>
          )}
          {row.pdfUrl && (
            <Button
              size="sm" variant="outline"
              className="text-xs gap-1.5"
              onClick={() => window.open(`${BASE}/api/tax-invoices/${row.id}/pdf`, "_blank")}
            >
              <Download size={13} />Download PDF
            </Button>
          )}
        </div>

        {/* Total amount highlight */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-5 text-center">
          <div className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Total Amount</div>
          <div className="text-3xl font-bold text-green-700">{fmtAud(row.totalAmount)}</div>
          <div className="text-xs text-green-500 mt-1">
            {row.invoiceType === "gross" ? "GROSS" : "NET"} ·{" "}
            {row.isGstFree ? "GST-Free" : `GST ${fmtAud(row.gstAmount)} included`}
          </div>
        </div>

        {/* Detail fields */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-semibold text-[#78716C] uppercase tracking-wide mb-1">Invoice Date</div>
              <div className="text-sm text-[#1C1917]">{fmtDate(row.invoiceDate)}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-[#78716C] uppercase tracking-wide mb-1">Due Date</div>
              <div className="text-sm text-[#1C1917]">{fmtDate(row.dueDate)}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-semibold text-[#78716C] uppercase tracking-wide mb-1">Commission</div>
              <div className="text-sm font-semibold text-[#1C1917]">{fmtAud(row.commissionAmount)}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-[#78716C] uppercase tracking-wide mb-1">GST</div>
              <div className="text-sm text-[#1C1917]">
                {row.isGstFree ? <span className="text-[#A8A29E] text-xs">GST-Free</span> : fmtAud(row.gstAmount)}
              </div>
            </div>
          </div>

          {/* School Account link */}
          <div className="p-3 bg-[#F5F4F2] rounded-lg">
            <div className="text-xs font-semibold text-[#78716C] uppercase tracking-wide mb-1.5 flex items-center gap-1">
              <Building2 size={12} />School Account
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-[#1C1917]">{row.schoolName ?? "—"}</div>
                {row.schoolEmail && <div className="text-xs text-[#A8A29E]">{row.schoolEmail}</div>}
              </div>
              {row.schoolAccountId && (
                <button
                  onClick={() => navigate(`/admin/crm/accounts/${row.schoolAccountId}`)}
                  className="text-(--e-orange) hover:text-[#E5721F] flex items-center gap-1 text-xs font-medium"
                >
                  <ExternalLink size={12} />View
                </button>
              )}
            </div>
          </div>

          {/* Contract link */}
          <div className="p-3 bg-[#F5F4F2] rounded-lg">
            <div className="text-xs font-semibold text-[#78716C] uppercase tracking-wide mb-1.5 flex items-center gap-1">
              <User size={12} />Student / Contract
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-[#1C1917]">{row.studentName}</div>
                <div className="text-xs text-[#78716C]">{row.programName}</div>
                {row.courseStartDate && (
                  <div className="text-xs text-[#A8A29E] mt-0.5">
                    {fmtDate(row.courseStartDate)} – {fmtDate(row.courseEndDate)}
                  </div>
                )}
              </div>
              {row.contractId && (
                <button
                  onClick={() => navigate(`/admin/crm/contracts/${row.contractId}`)}
                  className="text-(--e-orange) hover:text-[#E5721F] flex items-center gap-1 text-xs font-medium"
                >
                  <ExternalLink size={12} />Contract
                </button>
              )}
            </div>
          </div>

          {/* Sent info */}
          {row.sentAt && (
            <div>
              <div className="text-xs font-semibold text-[#78716C] uppercase tracking-wide mb-1">Email Sent</div>
              <div className="text-sm text-[#1C1917]">{fmtDate(row.sentAt)}</div>
              {row.sentToEmail && <div className="text-xs text-[#A8A29E]">{row.sentToEmail}</div>}
            </div>
          )}

          {row.paidAt && (
            <div>
              <div className="text-xs font-semibold text-[#78716C] uppercase tracking-wide mb-1">Paid On</div>
              <div className="text-sm text-green-700 font-semibold">{fmtDate(row.paidAt)}</div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function TaxInvoiceListPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [typeTab, setTypeTab] = useState("");
  const { sortBy, sortDir, onSort } = useSortState();
  const [statusTab, setStatusTab] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);

  const qs = new URLSearchParams();
  if (typeTab) qs.set("type", typeTab);
  if (statusTab) qs.set("status", statusTab);

  const { data, isLoading } = useQuery({
    queryKey: ["tax-invoices", typeTab, statusTab],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/tax-invoices?${qs.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load tax invoices");
      return res.json();
    },
    staleTime: 30_000,
  });

  const rows: any[] = data?.data ?? EMPTY;
  const sorted = useSorted(rows, sortBy, sortDir);

  const totals = rows.reduce((acc, r) => {
    acc.total += parseFloat(r.totalAmount ?? "0");
    acc.commission += parseFloat(r.commissionAmount ?? "0");
    acc.gst += parseFloat(r.gstAmount ?? "0");
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, { total: 0, commission: 0, gst: 0, draft: 0, sent: 0, paid: 0 });

  const sendMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${BASE}/api/tax-invoices/${id}/send`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("Failed to send");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Tax Invoice sent", description: "Email sent to school successfully." });
      qc.invalidateQueries({ queryKey: ["tax-invoices"] });
    },
    onError: () => toast({ title: "Send failed", variant: "destructive" }),
  });

  const paidMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${BASE}/api/tax-invoices/${id}/mark-paid`, {
        method: "POST", credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to mark paid");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Marked as paid" });
      qc.invalidateQueries({ queryKey: ["tax-invoices"] });
    },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  function openDetail(row: any) {
    setSelectedRow(row);
    setSheetOpen(true);
  }

  function handleRefresh() {
    qc.invalidateQueries({ queryKey: ["tax-invoices"] });
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9] p-6">
      {/* Modals */}
      <NewTaxInvoiceModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreated={handleRefresh}
      />
      <EmailTaxInvoiceModal
        row={selectedRow}
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        onSent={handleRefresh}
      />
      <TaxInvoiceDetailSheet
        row={selectedRow}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onEmail={() => { setSheetOpen(false); setEmailOpen(true); }}
        onPrint={() => selectedRow && printTaxInvoice(selectedRow)}
        onSend={() => selectedRow && sendMutation.mutate(selectedRow.id)}
        onPaid={() => selectedRow && paidMutation.mutate(selectedRow.id)}
        sendPending={sendMutation.isPending}
        paidPending={paidMutation.isPending}
      />

      {/* Page header */}
      <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText size={20} className="text-(--e-orange)" />
            <h1 className="text-xl font-bold text-[#1C1917]">Tax Invoices</h1>
          </div>
          <p className="text-sm text-[#78716C]">Commission tax invoices issued to schools for NET and GROSS remittances</p>
        </div>
        <Button
          className="bg-(--e-orange) hover:bg-[#E5721F] text-white gap-2"
          onClick={() => setNewOpen(true)}
        >
          <Plus size={16} />New Tax Invoice
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Invoiced", value: fmtAud(totals.total), icon: DollarSign, color: "text-(--e-orange)" },
          { label: "Commission", value: fmtAud(totals.commission), icon: FileText, color: "text-blue-600" },
          { label: "GST Collected", value: fmtAud(totals.gst), icon: CheckCircle2, color: "text-green-600" },
          { label: "Pending (Draft)", value: `${totals.draft} invoices`, icon: Clock, color: "text-amber-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-[#E8E6E2] p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon size={16} className={color} />
              <span className="text-xs text-[#78716C] uppercase tracking-wide font-medium">{label}</span>
            </div>
            <p className="text-lg font-bold text-[#1C1917]">{value}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs + table */}
      <div className="bg-white rounded-xl border border-[#E8E6E2] overflow-x-auto">
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[#E8E6E2] flex-wrap gap-3">
          <div className="flex gap-1">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTypeTab(t.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  typeTab === t.key ? "bg-(--e-orange) text-white" : "text-[#57534E] hover:bg-[#F5F4F2]"
                }`}
              >{t.label}</button>
            ))}
          </div>
          <div className="flex gap-1">
            {STATUS_TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setStatusTab(t.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  statusTab === t.key ? "bg-[#1C1917] text-white" : "text-[#57534E] hover:bg-[#F5F4F2]"
                }`}
              >{t.label}</button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E8E6E2] bg-[#FAFAF9]">
                <SortableTh col="invoiceRef" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-left text-xs font-semibold text-[#78716C] uppercase tracking-wide whitespace-nowrap">Invoice Ref</SortableTh>
                <SortableTh col="invoiceDate" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-left text-xs font-semibold text-[#78716C] uppercase tracking-wide whitespace-nowrap">Date</SortableTh>
                <SortableTh col="invoiceType" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-left text-xs font-semibold text-[#78716C] uppercase tracking-wide whitespace-nowrap">Type</SortableTh>
                <SortableTh col="schoolName" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-left text-xs font-semibold text-[#78716C] uppercase tracking-wide whitespace-nowrap">School</SortableTh>
                <SortableTh col="studentName" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-left text-xs font-semibold text-[#78716C] uppercase tracking-wide whitespace-nowrap">Student / Program</SortableTh>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[#78716C] uppercase tracking-wide whitespace-nowrap">Commission</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[#78716C] uppercase tracking-wide whitespace-nowrap">GST</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[#78716C] uppercase tracking-wide whitespace-nowrap">Total</th>
                <SortableTh col="status" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-left text-xs font-semibold text-[#78716C] uppercase tracking-wide whitespace-nowrap">Status</SortableTh>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#78716C] uppercase tracking-wide whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-[#A8A29E]">Loading…</td></tr>
              )}
              {!isLoading && rows.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-[#A8A29E]">No tax invoices found.</td></tr>
              )}
              {sorted.map(row => (
                <tr
                  key={row.id}
                  className="border-b border-[#F5F4F2] hover:bg-(--e-orange-lt) transition-colors cursor-pointer"
                  onClick={() => navigate(`/admin/accounting/tax-invoices/${row.id}`)}
                >
                  <td className="px-4 py-3 font-mono text-xs text-[#1C1917] font-semibold whitespace-nowrap">{row.invoiceRef}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-[#57534E]">{fmtDate(row.invoiceDate)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      row.invoiceType === "net"
                        ? "bg-purple-50 text-purple-700 border border-purple-200"
                        : "bg-sky-50 text-sky-700 border border-sky-200"
                    }`}>
                      {row.invoiceType?.toUpperCase() ?? "—"}
                    </span>
                  </td>
                  <td
                    className="px-4 py-3 text-[#1C1917] max-w-[140px] truncate"
                    title={row.schoolName}
                  >
                    {row.schoolAccountId ? (
                      <button
                        className="hover:text-(--e-orange) hover:underline text-left truncate max-w-[130px] block"
                        onClick={e => { e.stopPropagation(); navigate(`/admin/crm/accounts/${row.schoolAccountId}`); }}
                        title="View school account"
                      >
                        {row.schoolName ?? "—"}
                      </button>
                    ) : (row.schoolName ?? "—")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-[#1C1917] font-medium truncate max-w-[160px]" title={row.studentName}>{row.studentName}</div>
                    <div className="text-xs text-[#A8A29E] truncate max-w-[160px]" title={row.programName}>{row.programName}</div>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap text-[#1C1917]">{fmtAud(row.commissionAmount)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap text-[#57534E]">
                    {row.isGstFree
                      ? <span className="text-xs text-[#A8A29E]">GST-free</span>
                      : fmtAud(row.gstAmount)
                    }
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap font-semibold text-green-600">{fmtAud(row.totalAmount)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[row.status] ?? ""}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex gap-1 items-center">
                      <Button
                        size="sm" variant="ghost" className="h-7 px-2 text-xs"
                        title="Print / PDF"
                        onClick={() => printTaxInvoice(row)}
                      >
                        <Printer size={13} />
                      </Button>
                      {row.pdfUrl && (
                        <Button
                          size="sm" variant="ghost" className="h-7 px-2 text-xs"
                          title="Download PDF"
                          onClick={() => window.open(`${BASE}/api/tax-invoices/${row.id}/pdf`, "_blank")}
                        >
                          <Download size={13} />
                        </Button>
                      )}
                      {row.status !== "paid" && (
                        <Button
                          size="sm" variant="ghost"
                          className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700"
                          title="Send Email"
                          onClick={() => { setSelectedRow(row); setEmailOpen(true); }}
                        >
                          <Send size={13} />
                        </Button>
                      )}
                      {row.status !== "paid" && (
                        <Button
                          size="sm" variant="ghost"
                          className="h-7 px-2 text-xs text-green-600 hover:text-green-700"
                          title="Mark Paid"
                          disabled={paidMutation.isPending}
                          onClick={() => paidMutation.mutate(row.id)}
                        >
                          <CheckCircle2 size={13} />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
