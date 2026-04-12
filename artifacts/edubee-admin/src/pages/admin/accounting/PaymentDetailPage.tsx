import { formatDate } from "@/lib/date-format";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CreditCard, ExternalLink, AlertCircle } from "lucide-react";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface PaymentLine {
  id: string;
  contractId?: string | null;
  contractNumber?: string | null;
  studentName?: string | null;
  amount: string;
  notes?: string | null;
}

interface JournalEntry {
  id: string;
  entryDate?: string | null;
  entryType?: string | null;
  debitCoa: string;
  debitCoaName?: string;
  creditCoa: string;
  creditCoaName?: string;
  amount: string;
}

interface PaymentDetail {
  id: string;
  paymentRef?: string | null;
  paymentDate: string;
  paymentType: string;
  paymentMethod?: string | null;
  totalAmount?: string | null;
  bankReference?: string | null;
  notes?: string | null;
  status: string;
  receivedFrom?: string | null;
  paidTo?: string | null;
  createdOn: string;
  lines?: PaymentLine[];
  journalEntries?: JournalEntry[];
}

const fmtDate = (d?: string | null) => formatDate(d);
const fmtAud = (v?: string | null) =>
  v ? Number(v).toLocaleString("en-AU", { style: "currency", currency: "AUD" }) : "—";

const STATUS_STYLES: Record<string, string> = {
  Pending:   "bg-[#FEF9C3] text-[#CA8A04]",
  Completed: "bg-[#DCFCE7] text-[#16A34A]",
  Void:      "bg-[#F4F3F1] text-[#57534E]",
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-[#A8A29E]">{label}</span>
      <div className="text-sm text-[#1C1917]">{value ?? "—"}</div>
    </div>
  );
}

export default function PaymentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: payment, isLoading } = useQuery<PaymentDetail>({
    queryKey: ["payment-detail", id],
    queryFn: () => axios.get(`${BASE}/api/accounting/payments/${id}`).then(r => r.data),
    enabled: !!id,
  });

  const voidMutation = useMutation({
    mutationFn: () =>
      axios.patch(`${BASE}/api/accounting/payments/${id}/void`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payment-detail", id] });
      qc.invalidateQueries({ queryKey: ["payments"] });
      toast({ title: "Payment voided" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to void payment" }),
  });

  if (isLoading) {
    return (
      <div className="space-y-5 animate-pulse max-w-3xl">
        <div className="h-8 w-48 bg-[#F4F3F1] rounded" />
        <div className="h-64 bg-[#F4F3F1] rounded-xl" />
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-[#A8A29E]">
        <CreditCard className="w-10 h-10 mb-3" strokeWidth={1} />
        <p className="text-sm">Payment not found.</p>
        <Button variant="link" className="text-(--e-orange) mt-2" onClick={() => navigate("/admin/accounting/payments")}>
          Back to Payments
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
            onClick={() => navigate("/admin/accounting/payments")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 flex-wrap">
            <CreditCard className="w-5 h-5 text-(--e-orange)" strokeWidth={1.5} />
            <h1 className="text-xl font-bold text-[#1C1917] leading-none font-mono">
              {payment.paymentRef ?? payment.id.slice(0, 8).toUpperCase()}
            </h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[payment.status] ?? "bg-[#F4F3F1] text-[#57534E]"}`}>
              {payment.status}
            </span>
          </div>
        </div>

        {payment.status !== "Void" && (
          <Button
            size="sm" variant="outline"
            className="h-9 gap-1.5 text-[#DC2626] border-[#DC2626]/30 hover:bg-[#FEF2F2]"
            onClick={() => voidMutation.mutate()}
            disabled={voidMutation.isPending}
          >
            <AlertCircle size={13} />
            {voidMutation.isPending ? "Voiding…" : "Void Payment"}
          </Button>
        )}
      </div>

      {/* Total amount */}
      <div className="bg-[#F5F4F2] rounded-xl p-4 text-center border border-[#E8E6E2]">
        <div className="text-xs font-semibold text-[#57534E] uppercase tracking-wide mb-1">Total Amount</div>
        <div className="text-3xl font-bold text-[#1C1917]">{fmtAud(payment.totalAmount)}</div>
        <div className="text-xs text-[#A8A29E] mt-1">{payment.paymentType}</div>
      </div>

      {/* Payment info card */}
      <div className="bg-white rounded-xl border border-[#E8E6E2] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6 space-y-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[#A8A29E] border-b border-[#F4F3F1] pb-3">
          Payment Details
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
          <InfoRow label="Payment Date" value={fmtDate(payment.paymentDate)} />
          <InfoRow label="Payment Type" value={
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-(--e-orange-lt) text-(--e-orange)">
              {payment.paymentType}
            </span>
          } />
          <InfoRow label="Payment Method" value={payment.paymentMethod} />
          <InfoRow label="Bank Reference" value={payment.bankReference} />
          {payment.receivedFrom && <InfoRow label="Received From" value={payment.receivedFrom} />}
          {payment.paidTo && <InfoRow label="Paid To" value={payment.paidTo} />}
          <InfoRow label="Created" value={fmtDate(payment.createdOn)} />
        </div>
        {payment.notes && (
          <div className="border-t border-[#F4F3F1] pt-4">
            <InfoRow label="Notes" value={<p className="text-sm text-[#57534E] leading-relaxed">{payment.notes}</p>} />
          </div>
        )}
      </div>

      {/* Payment lines */}
      {payment.lines && payment.lines.length > 0 && (
        <div className="bg-white rounded-xl border border-[#E8E6E2] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="px-6 py-4 border-b border-[#F4F3F1]">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#A8A29E]">Payment Lines</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#FAFAF9]">
                <th className="text-left px-6 py-2.5 text-xs font-medium text-[#57534E] uppercase tracking-wide">Contract</th>
                <th className="text-left px-6 py-2.5 text-xs font-medium text-[#57534E] uppercase tracking-wide">Student</th>
                <th className="text-right px-6 py-2.5 text-xs font-medium text-[#57534E] uppercase tracking-wide">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F3F1]">
              {payment.lines.map(line => (
                <tr key={line.id}
                  className="hover:bg-(--e-orange-lt) cursor-pointer transition-colors"
                  onClick={() => line.contractId && navigate(`/admin/crm/contracts/${line.contractId}`)}>
                  <td className="px-6 py-3 font-mono text-xs text-[#1C1917]">
                    {line.contractNumber ?? "—"}
                  </td>
                  <td className="px-6 py-3 text-[#57534E]">{line.studentName ?? "—"}</td>
                  <td className="px-6 py-3 text-right font-semibold text-[#1C1917]">{fmtAud(line.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Journal Entries */}
      {payment.journalEntries && payment.journalEntries.length > 0 && (
        <div className="bg-white rounded-xl border border-[#E8E6E2] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="px-6 py-4 border-b border-[#F4F3F1]">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#A8A29E]">Journal Entries</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#FAFAF9]">
                <th className="text-left px-6 py-2.5 text-xs font-medium text-[#57534E] uppercase tracking-wide">Debit</th>
                <th className="text-left px-6 py-2.5 text-xs font-medium text-[#57534E] uppercase tracking-wide">Credit</th>
                <th className="text-right px-6 py-2.5 text-xs font-medium text-[#57534E] uppercase tracking-wide">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F3F1]">
              {payment.journalEntries.map(je => (
                <tr key={je.id}
                  className="hover:bg-(--e-orange-lt) cursor-pointer transition-colors"
                  onClick={() => navigate(`/admin/accounting/journal/${je.id}`)}>
                  <td className="px-6 py-3 text-[#57534E] text-xs">
                    <span className="font-mono font-bold text-(--e-orange) mr-1">{je.debitCoa}</span>
                    {je.debitCoaName && <span className="text-[#A8A29E]">{je.debitCoaName}</span>}
                  </td>
                  <td className="px-6 py-3 text-[#57534E] text-xs">
                    <span className="font-mono font-bold text-[#3B82F6] mr-1">{je.creditCoa}</span>
                    {je.creditCoaName && <span className="text-[#A8A29E]">{je.creditCoaName}</span>}
                  </td>
                  <td className="px-6 py-3 text-right font-semibold text-[#1C1917]">{fmtAud(je.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
