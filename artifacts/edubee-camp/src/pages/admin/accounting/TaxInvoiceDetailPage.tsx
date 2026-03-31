import { formatDate } from "@/lib/date-format";
import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Save, RotateCcw, Loader2, FileText,
  Building2, User, ExternalLink, Download, Printer,
} from "lucide-react";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface TaxInvoice {
  id: string;
  invoiceRef?: string | null;
  invoiceDate?: string | null;
  invoiceType?: string | null;
  programName?: string | null;
  studentName?: string | null;
  commissionAmount?: string | null;
  gstAmount?: string | null;
  totalAmount?: string | null;
  isGstFree?: boolean | null;
  status?: string | null;
  sentAt?: string | null;
  sentToEmail?: string | null;
  dueDate?: string | null;
  paidAt?: string | null;
  schoolName?: string | null;
  schoolEmail?: string | null;
  courseStartDate?: string | null;
  courseEndDate?: string | null;
  contractProductId?: string | null;
  contractId?: string | null;
  contractNumber?: string | null;
  schoolAccountId?: string | null;
  paymentHeaderId?: string | null;
  pdfUrl?: string | null;
  createdOn?: string | null;
}

interface FormState {
  status: string;
  dueDate: string;
}

const fmtDate = (d?: string | null) => formatDate(d);
const fmtAud = (v?: string | null) =>
  v ? Number(v).toLocaleString("en-AU", { style: "currency", currency: "AUD" }) : "—";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-[#FEF9C3] text-[#CA8A04]",
  sent:    "bg-[#EFF6FF] text-[#3B82F6]",
  paid:    "bg-[#DCFCE7] text-[#16A34A]",
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-[#A8A29E]">{label}</span>
      <div className="text-sm text-[#1C1917]">{value ?? "—"}</div>
    </div>
  );
}

export default function TaxInvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [form, setForm]         = useState<FormState>({ status: "pending", dueDate: "" });
  const [original, setOriginal] = useState<FormState>({ status: "pending", dueDate: "" });

  const isDirty = JSON.stringify(form) !== JSON.stringify(original);

  const { data: result, isLoading } = useQuery<{ data: TaxInvoice }>({
    queryKey: ["tax-invoice", id],
    queryFn: () => axios.get(`${BASE}/api/tax-invoices/${id}`).then(r => r.data),
    enabled: !!id,
  });

  const invoice = result?.data;

  useEffect(() => {
    if (!invoice) return;
    const snap: FormState = {
      status:  invoice.status  ?? "pending",
      dueDate: invoice.dueDate ?? "",
    };
    setForm(snap);
    setOriginal(snap);
  }, [invoice]);

  const discard = () => setForm(original);

  const save = useMutation({
    mutationFn: () =>
      axios.patch(`${BASE}/api/tax-invoices/${id}`, {
        status:  form.status,
        dueDate: form.dueDate || null,
      }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tax-invoice", id] });
      qc.invalidateQueries({ queryKey: ["tax-invoices"] });
      toast({ title: "Invoice updated" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to update invoice" }),
  });

  const markPaid = useMutation({
    mutationFn: () =>
      axios.post(`${BASE}/api/tax-invoices/${id}/mark-paid`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tax-invoice", id] });
      qc.invalidateQueries({ queryKey: ["tax-invoices"] });
      toast({ title: "Invoice marked as paid" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to mark as paid" }),
  });

  if (isLoading) {
    return (
      <div className="space-y-5 animate-pulse max-w-3xl">
        <div className="h-8 w-48 bg-[#F4F3F1] rounded" />
        <div className="h-64 bg-[#F4F3F1] rounded-xl" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-[#A8A29E]">
        <FileText className="w-10 h-10 mb-3" strokeWidth={1} />
        <p className="text-sm">Tax invoice not found.</p>
        <Button variant="link" className="text-[#F5821F] mt-2" onClick={() => navigate("/admin/accounting/tax-invoices")}>
          Back to list
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost" size="icon"
            className="h-8 w-8 text-[#57534E] hover:bg-[#F4F3F1] rounded-lg"
            onClick={() => navigate("/admin/accounting/tax-invoices")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 flex-wrap">
            <FileText className="w-5 h-5 text-[#F5821F]" strokeWidth={1.5} />
            <h1 className="text-xl font-bold text-[#1C1917] leading-none font-mono">{invoice.invoiceRef}</h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[form.status] ?? "bg-[#F4F3F1] text-[#57534E]"}`}>
              {form.status}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {isDirty && (
            <>
              <Button variant="outline" size="sm" onClick={discard} className="h-9 gap-1.5 text-stone-600">
                <RotateCcw size={13} /> Discard
              </Button>
              <Button size="sm" disabled={save.isPending} onClick={() => save.mutate()}
                className="h-9 gap-1.5 text-white" style={{ background: "#F5821F" }}>
                {save.isPending
                  ? <><Loader2 size={13} className="animate-spin" /> Saving…</>
                  : <><Save size={13} /> Save Changes</>}
              </Button>
            </>
          )}
          {invoice.pdfUrl && (
            <Button size="sm" variant="outline" className="h-9 gap-1.5 text-xs"
              onClick={() => window.open(`${BASE}/api/tax-invoices/${id}/pdf`, "_blank")}>
              <Download size={13} /> PDF
            </Button>
          )}
        </div>
      </div>

      {/* Unsaved changes banner */}
      {isDirty && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-[#FEF9C3] border border-[#CA8A04]/30 rounded-xl text-sm text-[#854D0E]">
          <span className="w-2 h-2 rounded-full bg-[#CA8A04] shrink-0" />
          You have unsaved changes — click <strong className="mx-1">Save Changes</strong> to apply.
        </div>
      )}

      {/* Total amount */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
        <div className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Total Amount</div>
        <div className="text-3xl font-bold text-green-700">{fmtAud(invoice.totalAmount)}</div>
        <div className="text-xs text-green-500 mt-1">
          {invoice.invoiceType?.toUpperCase() ?? ""} ·{" "}
          {invoice.isGstFree ? "GST-Free" : `GST ${fmtAud(invoice.gstAmount)} included`}
        </div>
      </div>

      {/* Invoice info card */}
      <div className="bg-white rounded-xl border border-[#E8E6E2] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6 space-y-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[#A8A29E] border-b border-[#F4F3F1] pb-3">
          Invoice Details
        </h2>

        <div className="grid grid-cols-2 gap-x-8 gap-y-5">
          <InfoRow label="Invoice Date" value={fmtDate(invoice.invoiceDate)} />
          <InfoRow label="Invoice Type" value={
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              invoice.invoiceType === "net" ? "bg-purple-50 text-purple-700" : "bg-sky-50 text-sky-700"
            }`}>{invoice.invoiceType?.toUpperCase() ?? "—"}</span>
          } />
          <InfoRow label="Commission" value={<span className="font-semibold">{fmtAud(invoice.commissionAmount)}</span>} />
          <InfoRow label="GST" value={invoice.isGstFree ? <span className="text-[#A8A29E] italic">GST-Free</span> : fmtAud(invoice.gstAmount)} />
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-4 border-t border-[#F4F3F1] pt-5">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">Status</Label>
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger className="h-10 border-[#E8E6E2] focus:ring-0 w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">Due Date</Label>
            <Input
              type="date"
              value={form.dueDate}
              onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
              className="h-10 border-[#E8E6E2] focus:border-[#F5821F] focus-visible:ring-0"
            />
          </div>
        </div>

        {invoice.paidAt && (
          <div className="border-t border-[#F4F3F1] pt-4">
            <InfoRow label="Paid On" value={<span className="text-green-700 font-semibold">{fmtDate(invoice.paidAt)}</span>} />
          </div>
        )}

        {invoice.sentAt && (
          <div className="border-t border-[#F4F3F1] pt-4 grid grid-cols-2 gap-x-8">
            <InfoRow label="Email Sent" value={fmtDate(invoice.sentAt)} />
            {invoice.sentToEmail && <InfoRow label="Sent To" value={invoice.sentToEmail} />}
          </div>
        )}
      </div>

      {/* Related records */}
      <div className="bg-white rounded-xl border border-[#E8E6E2] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6 space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[#A8A29E] border-b border-[#F4F3F1] pb-3">
          Related Records
        </h2>

        {(invoice.schoolName || invoice.schoolAccountId) && (
          <div className="p-3 bg-[#F5F4F2] rounded-lg">
            <div className="text-xs font-semibold text-[#78716C] uppercase tracking-wide mb-1.5 flex items-center gap-1">
              <Building2 size={12} /> School Account
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-[#1C1917]">{invoice.schoolName ?? "—"}</div>
                {invoice.schoolEmail && <div className="text-xs text-[#A8A29E]">{invoice.schoolEmail}</div>}
              </div>
              {invoice.schoolAccountId && (
                <button
                  onClick={() => navigate(`/admin/crm/accounts/${invoice.schoolAccountId}`)}
                  className="text-[#F5821F] flex items-center gap-1 text-xs font-medium hover:underline"
                >
                  <ExternalLink size={12} /> View
                </button>
              )}
            </div>
          </div>
        )}

        {(invoice.studentName || invoice.contractId) && (
          <div className="p-3 bg-[#F5F4F2] rounded-lg">
            <div className="text-xs font-semibold text-[#78716C] uppercase tracking-wide mb-1.5 flex items-center gap-1">
              <User size={12} /> Student / Contract
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-[#1C1917]">{invoice.studentName}</div>
                <div className="text-xs text-[#78716C]">{invoice.programName}</div>
                {invoice.courseStartDate && (
                  <div className="text-xs text-[#A8A29E] mt-0.5">
                    {fmtDate(invoice.courseStartDate)} – {fmtDate(invoice.courseEndDate)}
                  </div>
                )}
              </div>
              {invoice.contractId && (
                <button
                  onClick={() => navigate(`/admin/crm/contracts/${invoice.contractId}`)}
                  className="text-[#F5821F] flex items-center gap-1 text-xs font-medium hover:underline"
                >
                  <ExternalLink size={12} /> Contract
                </button>
              )}
            </div>
          </div>
        )}

        {invoice.paymentHeaderId && (
          <button
            onClick={() => navigate(`/admin/accounting/payments/${invoice.paymentHeaderId}`)}
            className="flex items-center gap-1.5 text-sm text-[#F5821F] hover:underline"
          >
            <ExternalLink size={13} /> View Payment
          </button>
        )}
      </div>
    </div>
  );
}
