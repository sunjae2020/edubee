import { useState } from "react";
import { formatDate, formatDateTime } from "@/lib/date-format";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowDownLeft, ArrowUpRight, Loader2, Copy, Check, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const CURRENCY_SYMBOLS: Record<string, string> = {
  AUD: "A$", USD: "$", SGD: "S$", PHP: "₱",
  THB: "฿", KRW: "₩", JPY: "¥", GBP: "£",
};

interface Transaction {
  id: string;
  contractId?: string | null;
  invoiceId?: string | null;
  transactionType?: string | null;
  amount?: string | null;
  creditAmount?: string | null;
  currency?: string | null;
  description?: string | null;
  transactionDate?: string | null;
  bankReference?: string | null;
  accountId?: string | null;
  contactId?: string | null;
  paymentInfoId?: string | null;
  costCenterCode?: string | null;
  status?: string | null;
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

export default function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  const { data: tx, isLoading } = useQuery<Transaction>({
    queryKey: ["transaction-detail", id],
    queryFn: () => axios.get(`${BASE}/api/transactions/${id}`).then(r => r.data?.data ?? r.data),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center text-muted-foreground text-sm gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading transaction…
      </div>
    );
  }
  if (!tx) {
    return (
      <div className="p-8 text-center text-muted-foreground text-sm">Transaction not found.</div>
    );
  }

  const isCredit = tx.transactionType === "credit";
  const displayAmount = tx.creditAmount ?? tx.amount;

  const effectiveDate = tx.transactionDate ?? tx.createdAt;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => navigate("/admin/accounting/transactions")}>
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            {isCredit
              ? <ArrowDownLeft className="w-4 h-4 text-[#22C55E]" />
              : <ArrowUpRight className="w-4 h-4 text-[#DC2626]" />}
            <span className="text-lg font-bold text-stone-800">Transaction Detail</span>
          </div>
        </div>
      </div>

      {/* Amount highlight */}
      <div className={cn(
        "rounded-2xl p-6 flex items-center justify-between border-2",
        isCredit ? "bg-[#F0FDF4] border-[#86EFAC]" : "bg-[#FEF2F2] border-[#FCA5A5]"
      )}>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
            {isCredit ? "Credit Amount" : "Debit Amount"}
          </p>
          <p className={cn("text-3xl font-bold", isCredit ? "text-[#16A34A]" : "text-[#DC2626]")}>
            {isCredit ? "+" : "−"}{fmtAmount(displayAmount, tx.currency)}
          </p>
          {tx.currency && tx.currency !== "AUD" && (
            <p className="text-xs text-muted-foreground mt-1">{tx.currency}</p>
          )}
        </div>
        <span className={cn(
          "px-2.5 py-0.5 rounded-full text-xs font-medium capitalize",
          tx.status === "Active" ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#F4F3F1] text-[#57534E]"
        )}>
          {tx.status ?? "Active"}
        </span>
      </div>

      {/* Sections grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Transaction Info */}
        <div className="bg-card border border-border rounded-xl p-5">
          <SectionTitle>Transaction Info</SectionTitle>
          <div className="space-y-4">
            <Field label="Type">
              <div className="flex items-center gap-1.5">
                {isCredit
                  ? <ArrowDownLeft className="w-3.5 h-3.5 text-[#22C55E]" />
                  : <ArrowUpRight className="w-3.5 h-3.5 text-[#DC2626]" />}
                <span className={cn("capitalize font-medium text-sm", isCredit ? "text-[#16A34A]" : "text-[#DC2626]")}>
                  {tx.transactionType ?? "—"}
                </span>
              </div>
            </Field>
            <Field label="Description">
              <span className="text-stone-700">{tx.description ?? "—"}</span>
            </Field>
            {tx.bankReference && (
              <Field label="Reference">
                <span className="font-mono text-xs">{tx.bankReference}</span>
              </Field>
            )}
            {tx.costCenterCode && (
              <Field label="Cost Center">
                <span className="font-mono text-xs">{tx.costCenterCode}</span>
              </Field>
            )}
            <Field label="Status">
              <span className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                tx.status === "Active" ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#F4F3F1] text-[#57534E]"
              )}>
                {tx.status ?? "Active"}
              </span>
            </Field>
          </div>
        </div>

        {/* Dates */}
        <div className="bg-card border border-border rounded-xl p-5">
          <SectionTitle>Dates</SectionTitle>
          <div className="space-y-4">
            <Field label="Transaction Date">{fmtDate(effectiveDate)}</Field>
            {tx.createdAt && (
              <Field label="Created At">{fmtDateTime(tx.createdAt)}</Field>
            )}
            {tx.updatedAt && (
              <Field label="Last Updated">{fmtDateTime(tx.updatedAt)}</Field>
            )}
          </div>
        </div>

        {/* Links */}
        {(tx.invoiceId || tx.contractId || tx.accountId || tx.contactId || tx.paymentInfoId) && (
          <div className="bg-card border border-border rounded-xl p-5">
            <SectionTitle>Links</SectionTitle>
            <div className="space-y-4">
              {tx.invoiceId && (
                <Field label="Invoice">
                  <button
                    onClick={() => navigate(`/admin/accounting/invoices/${tx.invoiceId}`)}
                    className="flex items-center gap-1 text-[#F5821F] hover:underline font-mono text-xs"
                  >
                    {tx.invoiceId.slice(0, 8)}…
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </Field>
              )}
              {tx.contractId && (
                <Field label="Contract">
                  <button
                    onClick={() => navigate(`/admin/crm/contracts/${tx.contractId}`)}
                    className="flex items-center gap-1 text-[#F5821F] hover:underline font-mono text-xs"
                  >
                    {tx.contractId.slice(0, 8)}…
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </Field>
              )}
              {tx.accountId && (
                <Field label="Account ID">
                  <div className="flex items-center">
                    <span className="font-mono text-xs text-stone-500">{tx.accountId}</span>
                    <CopyButton value={tx.accountId} />
                  </div>
                </Field>
              )}
              {tx.contactId && (
                <Field label="Contact ID">
                  <div className="flex items-center">
                    <span className="font-mono text-xs text-stone-500">{tx.contactId}</span>
                    <CopyButton value={tx.contactId} />
                  </div>
                </Field>
              )}
              {tx.paymentInfoId && (
                <Field label="Payment Info ID">
                  <div className="flex items-center">
                    <span className="font-mono text-xs text-stone-500">{tx.paymentInfoId}</span>
                    <CopyButton value={tx.paymentInfoId} />
                  </div>
                </Field>
              )}
            </div>
          </div>
        )}

        {/* Admin Info */}
        <div className="bg-card border border-border rounded-xl p-5">
          <SectionTitle>Admin Info</SectionTitle>
          <div className="space-y-4">
            <Field label="Transaction ID">
              <div className="flex items-center">
                <span className="font-mono text-xs text-stone-500">{tx.id}</span>
                <CopyButton value={tx.id} />
              </div>
            </Field>
            {tx.createdAt && (
              <Field label="Created">{fmtDateTime(tx.createdAt)}</Field>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
