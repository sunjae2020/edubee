import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, FileText, CreditCard, Receipt, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const CURRENCY_SYMBOLS: Record<string, string> = {
  AUD: "A$", USD: "$", KRW: "₩", JPY: "¥", THB: "฿", PHP: "₱", SGD: "S$", GBP: "£",
};

function fmt(amount?: string | number | null, currency = "AUD") {
  if (!amount) return "—";
  const sym = CURRENCY_SYMBOLS[currency] ?? currency;
  return `${sym}${Number(amount).toLocaleString("en-AU", { minimumFractionDigits: 2 })}`;
}

function StatusPill({ status }: { status?: string | null }) {
  const s = (status ?? "").toLowerCase();
  const map: Record<string, string> = {
    paid: "bg-green-100 text-green-700",
    confirmed: "bg-green-100 text-green-700",
    pending: "bg-orange-100 text-orange-700",
    sent: "bg-blue-100 text-blue-700",
    partially_paid: "bg-yellow-100 text-yellow-700",
    awaiting_receipt: "bg-purple-100 text-purple-700",
    overdue: "bg-red-100 text-red-700",
    refunded: "bg-gray-100 text-gray-600",
    cancelled: "bg-gray-100 text-gray-500",
    draft: "bg-gray-100 text-gray-500",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${map[s] ?? "bg-gray-100 text-gray-500"}`}>
      {s.replace(/_/g, " ")}
    </span>
  );
}

function ProgressBar({ received, invoiced }: { received: number; invoiced: number }) {
  const pct = invoiced > 0 ? Math.min(100, Math.round((received / invoiced) * 100)) : 0;
  const full = pct >= 100;
  return (
    <div className="mt-3">
      <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
        <span>{fmt(received)} received</span>
        <span>{fmt(invoiced)} total</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${full ? "bg-green-500" : "bg-[#F5821F]"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {!full && invoiced > 0 && (
        <div className="flex justify-between text-[11px] mt-1">
          <span className="text-[#F5821F] font-medium">{pct}% paid</span>
          <span className="text-muted-foreground">Outstanding: {fmt(invoiced - received)}</span>
        </div>
      )}
    </div>
  );
}

interface ArStatusData {
  contractId: string;
  invoices: Array<{
    invoiceId: string;
    invoiceNumber: string;
    invoiceType: string;
    totalAmount: string;
    currency: string;
    audEquivalent?: string;
    status: string;
    issuedAt?: string;
    dueDate?: string;
    paidAt?: string;
    transactions: Array<{
      transactionId: string;
      amount: string;
      currency: string;
      audEquivalent?: string;
      bankReference?: string;
      transactionDate?: string;
    }>;
    receipts: Array<{
      receiptId: string;
      receiptNumber: string;
      amount: string;
      receiptDate?: string;
      status: string;
    }>;
    balance: {
      invoiced: number;
      received: number;
      outstanding: number;
      isFullyPaid: boolean;
    };
  }>;
  arSummary: {
    totalInvoiced: number;
    totalReceived: number;
    totalOutstanding: number;
    isFullyPaid: boolean;
  };
}

export function ArTimeline({ contractId }: { contractId: string }) {
  const { data, isLoading, isError } = useQuery<{ success: boolean; data: ArStatusData }>({
    queryKey: ["ar-status", contractId],
    queryFn: () => axios.get(`${BASE}/api/ledger/ar-status/${contractId}`).then(r => r.data),
    enabled: !!contractId,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-4">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span>Failed to load receivables data. Please try again.</span>
      </div>
    );
  }

  const arData = data?.data;
  if (!arData || arData.invoices.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground text-sm">
        <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
        No invoices linked to this contract yet.
      </div>
    );
  }

  const { arSummary } = arData;

  return (
    <div className="space-y-4">
      {/* AR Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Invoiced", value: fmt(arSummary.totalInvoiced), color: "text-foreground" },
          { label: "Received", value: fmt(arSummary.totalReceived), color: "text-green-600" },
          { label: "Outstanding", value: fmt(arSummary.totalOutstanding), color: arSummary.totalOutstanding > 0 ? "text-red-600" : "text-green-600" },
        ].map(k => (
          <div key={k.label} className="bg-white border rounded-lg p-3">
            <div className="text-[11px] text-muted-foreground font-medium mb-1">{k.label}</div>
            <div className={`text-sm font-bold font-mono ${k.color}`}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Per-invoice timeline */}
      {arData.invoices.map(inv => (
        <div key={inv.invoiceId} className="bg-white border rounded-xl overflow-hidden">
          {/* Invoice header */}
          <div className="flex items-center justify-between px-4 py-3 bg-muted/20 border-b">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#F5821F]" />
              <span className="font-mono text-sm font-semibold">{inv.invoiceNumber ?? "—"}</span>
              <span className="text-xs text-muted-foreground capitalize">({inv.invoiceType?.replace(/_/g, " ")})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold">{fmt(inv.audEquivalent ?? inv.totalAmount, inv.currency)}</span>
              <StatusPill status={inv.status} />
            </div>
          </div>

          {/* Timeline events */}
          <div className="px-4 py-3 space-y-2.5">
            {/* Issued */}
            {inv.issuedAt && (
              <div className="flex items-center gap-3 text-sm">
                <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <FileText className="w-3 h-3 text-blue-600" />
                </div>
                <span className="text-muted-foreground text-xs w-16 shrink-0">Issued</span>
                <span className="text-xs">{format(new Date(inv.issuedAt), "d MMM yyyy")}</span>
                {inv.dueDate && (
                  <span className="ml-auto text-[11px] text-muted-foreground">
                    Due: {inv.dueDate}
                  </span>
                )}
              </div>
            )}

            {/* Transactions */}
            {inv.transactions.map(t => (
              <div key={t.transactionId} className="flex items-center gap-3 text-sm">
                <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                  <CreditCard className="w-3 h-3 text-orange-600" />
                </div>
                <span className="text-muted-foreground text-xs w-16 shrink-0">Payment</span>
                <span className="font-mono text-xs font-medium">{fmt(t.audEquivalent ?? t.amount, t.currency)}</span>
                {t.transactionDate && (
                  <span className="text-[11px] text-muted-foreground">
                    {format(new Date(t.transactionDate), "d MMM")}
                  </span>
                )}
                {t.bankReference && (
                  <span className="text-[11px] text-muted-foreground font-mono ml-auto">ref: {t.bankReference}</span>
                )}
              </div>
            ))}

            {/* Receipts */}
            {inv.receipts.map(r => (
              <div key={r.receiptId} className="flex items-center gap-3 text-sm">
                <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                  <Receipt className="w-3 h-3 text-purple-600" />
                </div>
                <span className="text-muted-foreground text-xs w-16 shrink-0">Receipt</span>
                <span className="font-mono text-xs">{r.receiptNumber}</span>
                {r.receiptDate && (
                  <span className="text-[11px] text-muted-foreground">
                    {format(new Date(r.receiptDate), "d MMM")}
                  </span>
                )}
                <StatusPill status={r.status} />
              </div>
            ))}

            {/* Paid confirmation */}
            {inv.balance.isFullyPaid && inv.paidAt && (
              <div className="flex items-center gap-3 text-sm">
                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                </div>
                <span className="text-muted-foreground text-xs w-16 shrink-0">Paid</span>
                <span className="text-xs font-medium text-green-700">{format(new Date(inv.paidAt), "d MMM yyyy")}</span>
              </div>
            )}

            {/* Pending / overdue indicator */}
            {!inv.balance.isFullyPaid && inv.transactions.length === 0 && (
              <div className="flex items-center gap-3 text-sm">
                <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <Clock className="w-3 h-3 text-gray-400" />
                </div>
                <span className="text-muted-foreground text-xs">Awaiting payment</span>
              </div>
            )}

            {/* Progress bar */}
            <ProgressBar received={inv.balance.received} invoiced={inv.balance.invoiced} />
          </div>
        </div>
      ))}
    </div>
  );
}
