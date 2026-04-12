import { useParams, useLocation } from "wouter";
import { formatDate, formatDateTime } from "@/lib/date-format";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, ExternalLink } from "lucide-react";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface JournalEntry {
  id: string;
  entryDate?: string | null;
  entryType?: string | null;
  debitCoa: string;
  creditCoa: string;
  debitCoaName?: string | null;
  creditCoaName?: string | null;
  amount: string;
  description?: string | null;
  contractId?: string | null;
  studentAccountId?: string | null;
  partnerId?: string | null;
  paymentHeaderId?: string | null;
  createdOn?: string | null;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-[#A8A29E]">{label}</span>
      <div className="text-sm text-[#1C1917]">{value ?? "—"}</div>
    </div>
  );
}

function CoaBadge({ code, name }: { code: string; name?: string | null }) {
  const bg = code.startsWith("1") ? "#DCFCE7"
    : code.startsWith("2") ? "#FEF9C3"
    : code.startsWith("3") ? "var(--e-orange-lt)"
    : code.startsWith("4") ? "#FEF2F2"
    : "#F4F3F1";
  const color = code.startsWith("1") ? "#16A34A"
    : code.startsWith("2") ? "#CA8A04"
    : code.startsWith("3") ? "var(--e-orange)"
    : code.startsWith("4") ? "#DC2626"
    : "#57534E";
  return (
    <span className="flex items-center gap-1.5">
      <span className="px-2 py-0.5 rounded text-xs font-mono font-bold" style={{ background: bg, color }}>
        {code}
      </span>
      {name && <span className="text-[#57534E]">{name}</span>}
    </span>
  );
}

export default function JournalEntryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  const { data: result, isLoading } = useQuery<{ data: JournalEntry }>({
    queryKey: ["journal-entry", id],
    queryFn: () => axios.get(`${BASE}/api/journal-entries/${id}`).then(r => r.data),
    enabled: !!id,
  });

  const entry = result?.data;

  if (isLoading) {
    return (
      <div className="space-y-5 animate-pulse max-w-3xl">
        <div className="h-8 w-48 bg-[#F4F3F1] rounded" />
        <div className="h-64 bg-[#F4F3F1] rounded-xl" />
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-[#A8A29E]">
        <BookOpen className="w-10 h-10 mb-3" strokeWidth={1} />
        <p className="text-sm">Journal entry not found.</p>
        <Button variant="link" className="text-(--e-orange) mt-2" onClick={() => navigate("/admin/accounting/journal")}>
          Back to Journal Entries
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost" size="icon"
          className="h-8 w-8 text-[#57534E] hover:bg-[#F4F3F1] rounded-lg"
          onClick={() => navigate("/admin/accounting/journal")}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-2 flex-wrap">
          <BookOpen className="w-5 h-5 text-(--e-orange)" strokeWidth={1.5} />
          <h1 className="text-xl font-bold text-[#1C1917] leading-none">Journal Entry</h1>
          {entry.entryType && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-(--e-orange-lt) text-(--e-orange)">
              {entry.entryType}
            </span>
          )}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-sm text-amber-800">
        Journal entries are auto-generated from payment records and are read-only.
      </div>

      {/* Detail card */}
      <div className="bg-white rounded-xl border border-[#E8E6E2] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6 space-y-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[#A8A29E] border-b border-[#F4F3F1] pb-3">
          Entry Details
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
          <InfoRow
            label="Entry Date"
            value={formatDate(entry.entryDate)}
          />
          <InfoRow label="Entry Type" value={entry.entryType} />
          <InfoRow
            label="Amount"
            value={
              <span className="text-lg font-bold text-[#1C1917]">
                {Number(entry.amount).toLocaleString("en-AU", { style: "currency", currency: "AUD" })}
              </span>
            }
          />
          <InfoRow
            label="Created"
            value={formatDateTime(entry.createdOn)}
          />
        </div>

        <div className="border-t border-[#F4F3F1] pt-5 space-y-5">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-(--e-orange)">Journal Lines</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            <InfoRow
              label="Debit Account"
              value={<CoaBadge code={entry.debitCoa} name={entry.debitCoaName} />}
            />
            <InfoRow
              label="Credit Account"
              value={<CoaBadge code={entry.creditCoa} name={entry.creditCoaName} />}
            />
          </div>
        </div>

        {entry.description && (
          <div className="border-t border-[#F4F3F1] pt-5">
            <InfoRow label="Description" value={<p className="text-sm text-[#57534E] leading-relaxed">{entry.description}</p>} />
          </div>
        )}

        {(entry.contractId || entry.paymentHeaderId) && (
          <div className="border-t border-[#F4F3F1] pt-5 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-[#A8A29E]">Related Records</h3>
            {entry.contractId && (
              <button
                onClick={() => navigate(`/admin/crm/contracts/${entry.contractId}`)}
                className="flex items-center gap-1.5 text-sm text-(--e-orange) hover:underline"
              >
                <ExternalLink size={13} /> View Contract
              </button>
            )}
            {entry.paymentHeaderId && (
              <button
                onClick={() => navigate(`/admin/accounting/payments/${entry.paymentHeaderId}`)}
                className="flex items-center gap-1.5 text-sm text-(--e-orange) hover:underline"
              >
                <ExternalLink size={13} /> View Payment
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
