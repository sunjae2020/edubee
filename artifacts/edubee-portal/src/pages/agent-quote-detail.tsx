import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import {
  ArrowLeft, FileText, User, Package, Building2,
  AlertCircle, MessageSquare, StickyNote,
} from "lucide-react";

function statusStyle(s: string | null | undefined) {
  const v = (s ?? "").toLowerCase();
  if (v === "accepted" || v === "active" || v === "completed") return { background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0" };
  if (v === "sent" || v === "revised") return { background: "#FFFBEB", color: "#D97706", border: "1px solid #FDE68A" };
  if (v === "draft" || v === "pending") return { background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE" };
  if (v === "cancelled" || v === "rejected" || v === "expired") return { background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" };
  return { background: "var(--e-bg-muted)", color: "var(--e-text-2)", border: "1px solid #E8E6E2" };
}

function serviceLabel(t: string | null | undefined) {
  const map: Record<string, string> = {
    study_abroad: "Study Abroad", accommodation: "Accommodation",
    pickup: "Pickup / Transfer", guardian: "Guardian",
    internship: "Internship", tour: "Tour",
  };
  return t ? (map[t] ?? t) : "—";
}

function fmt(v: string | null | undefined) {
  if (!v) return "—";
  try { return format(new Date(v), "dd MMM yyyy"); } catch { return v; }
}

function money(v: string | number | null | undefined) {
  if (v == null || v === "") return "—";
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(Number(v));
}

interface QuoteDetail {
  quote: Record<string, any>;
  products: Record<string, any>[];
  contract: Record<string, any> | null;
  student: Record<string, any> | null;
}

export default function AgentQuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  const { data, isLoading, error } = useQuery({
    queryKey: ["portal-quote-detail", id],
    queryFn: () => api.get<{ data: QuoteDetail }>(`/portal/quotes/${id}`).then(r => r.data),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto">
        <button onClick={() => navigate("/quotes")} className="flex items-center gap-1.5 text-sm mb-4" style={{ color: "var(--e-text-3)" }}>
          <ArrowLeft size={14} /> Back to Quotes
        </button>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle size={16} /> Quote not found or you do not have access.
        </div>
      </div>
    );
  }

  const { quote, products, contract, student } = data;
  const totalValue = products.reduce((s: number, p: any) => s + Number(p.total ?? 0), 0);

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Back */}
      <button onClick={() => navigate("/quotes")} className="flex items-center gap-1.5 text-sm" style={{ color: "var(--e-text-3)" }}>
        <ArrowLeft size={14} /> Back to Quotes
      </button>

      {/* Header card */}
      <div className="rounded-xl border p-6" style={{ background: "var(--e-bg-surface)", borderColor: "var(--e-border)" }}>
        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileText size={16} style={{ color: "var(--e-orange)" }} />
              <h1 className="text-lg font-bold" style={{ color: "var(--e-text-1)" }}>
                {quote.quoteRefNumber ?? "Draft Quote"}
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize"
                style={statusStyle(quote.quoteStatus)}>
                {quote.quoteStatus}
              </span>
            </div>
            <p className="text-sm" style={{ color: "var(--e-text-2)" }}>
              {quote.accountName ?? quote.customerName ?? "—"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold" style={{ color: "var(--e-text-1)" }}>{money(totalValue)}</p>
            <p className="text-xs" style={{ color: "var(--e-text-3)" }}>Total Quote Value</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wide mb-0.5" style={{ color: "var(--e-text-3)" }}>Created</p>
            <p style={{ color: "var(--e-text-2)" }}>{fmt(quote.createdOn)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide mb-0.5" style={{ color: "var(--e-text-3)" }}>Expiry Date</p>
            <p style={{ color: "var(--e-text-2)" }}>{fmt(quote.expiryDate)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide mb-0.5" style={{ color: "var(--e-text-3)" }}>Last Updated</p>
            <p style={{ color: "var(--e-text-2)" }}>{fmt(quote.modifiedOn)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Student info */}
        <div className="rounded-xl border p-5" style={{ background: "var(--e-bg-surface)", borderColor: "var(--e-border)" }}>
          <div className="flex items-center gap-2 mb-3">
            <User size={15} style={{ color: "var(--e-orange)" }} />
            <h2 className="font-semibold text-sm" style={{ color: "var(--e-text-1)" }}>Student</h2>
          </div>
          {student ? (
            <div className="space-y-1.5 text-sm">
              <p className="font-medium" style={{ color: "var(--e-text-1)" }}>{student.name}</p>
              {student.email && <p style={{ color: "var(--e-text-2)" }}>{student.email}</p>}
              {student.phoneNumber && <p style={{ color: "var(--e-text-2)" }}>{student.phoneNumber}</p>}
              {student.country && <p style={{ color: "var(--e-text-3)" }}>{student.country}</p>}
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--e-text-3)" }}>No student linked</p>
          )}
        </div>

        {/* Contract info */}
        {contract && (
          <div className="rounded-xl border p-5" style={{ background: "var(--e-bg-surface)", borderColor: "var(--e-border)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Building2 size={15} style={{ color: "var(--e-orange)" }} />
              <h2 className="font-semibold text-sm" style={{ color: "var(--e-text-1)" }}>Linked Contract</h2>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center gap-2">
                <p className="font-medium" style={{ color: "var(--e-text-1)" }}>{contract.contractNumber}</p>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize"
                  style={statusStyle(contract.status)}>{contract.status}</span>
              </div>
              {contract.courseStartDate && (
                <p style={{ color: "var(--e-text-2)" }}>{fmt(contract.courseStartDate)} → {fmt(contract.courseEndDate)}</p>
              )}
              <div className="flex gap-4 pt-1">
                <div>
                  <p className="text-xs" style={{ color: "var(--e-text-3)" }}>Paid</p>
                  <p className="font-semibold" style={{ color: "#16A34A" }}>{money(contract.paidAmount)}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: "var(--e-text-3)" }}>Balance</p>
                  <p className="font-semibold" style={{ color: contract.balanceAmount > 0 ? "#D97706" : "#16A34A" }}>{money(contract.balanceAmount)}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Products table */}
      <div className="rounded-xl border overflow-hidden" style={{ background: "var(--e-bg-surface)", borderColor: "var(--e-border)" }}>
        <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: "var(--e-border)" }}>
          <Package size={15} style={{ color: "var(--e-orange)" }} />
          <h2 className="font-semibold text-sm" style={{ color: "var(--e-text-1)" }}>Quote Items</h2>
          <span className="ml-auto text-xs" style={{ color: "var(--e-text-3)" }}>{products.length} item{products.length !== 1 ? "s" : ""}</span>
        </div>
        {products.length === 0 ? (
          <p className="px-5 py-8 text-sm text-center" style={{ color: "var(--e-text-3)" }}>No items in this quote</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--e-bg-page)", borderBottom: "1px solid #E8E6E2" }}>
                  {["Service", "Type", "Qty", "Unit Price", "Total"].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--e-text-3)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map((p: any) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid #F4F3F1" }}>
                    <td className="px-5 py-3">
                      <p className="font-medium" style={{ color: "var(--e-text-1)" }}>{p.productName ?? p.name ?? "—"}</p>
                      {p.description && <p className="text-xs mt-0.5" style={{ color: "var(--e-text-3)" }}>{p.description}</p>}
                    </td>
                    <td className="px-5 py-3 text-xs" style={{ color: "var(--e-text-2)" }}>{serviceLabel(p.serviceModuleType)}</td>
                    <td className="px-5 py-3" style={{ color: "var(--e-text-2)" }}>{p.qty ?? p.quantity ?? 1}</td>
                    <td className="px-5 py-3" style={{ color: "var(--e-text-2)" }}>{money(p.unitPrice ?? p.price)}</td>
                    <td className="px-5 py-3 font-semibold" style={{ color: "var(--e-text-1)" }}>{money(p.total)}</td>
                  </tr>
                ))}
                <tr style={{ background: "var(--e-bg-page)", borderTop: "2px solid #E8E6E2" }}>
                  <td colSpan={4} className="px-5 py-3 font-semibold text-right" style={{ color: "var(--e-text-2)" }}>Total</td>
                  <td className="px-5 py-3 font-bold text-base" style={{ color: "var(--e-text-1)" }}>{money(totalValue)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Notes & Memos — Agent sees all */}
      {(quote.notes || (contract?.adminNote) || (contract?.partnerNote) || (contract?.notes)) && (
        <div className="space-y-3">
          {quote.notes && (
            <div className="rounded-xl border p-5" style={{ background: "#FFFBEB", borderColor: "#FDE68A" }}>
              <div className="flex items-center gap-2 mb-2">
                <StickyNote size={14} style={{ color: "#D97706" }} />
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#D97706" }}>Quote Notes</p>
              </div>
              <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--e-text-2)" }}>{quote.notes}</p>
            </div>
          )}
          {contract?.adminNote && (
            <div className="rounded-xl border p-5" style={{ background: "#FEF2F2", borderColor: "#FECACA" }}>
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={14} style={{ color: "#DC2626" }} />
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#DC2626" }}>Admin Memo</p>
                <span className="ml-1 text-xs px-1.5 py-0.5 rounded" style={{ background: "#FECACA", color: "#991B1B" }}>Agent only</span>
              </div>
              <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--e-text-2)" }}>{contract.adminNote}</p>
            </div>
          )}
          {contract?.partnerNote && (
            <div className="rounded-xl border p-5" style={{ background: "#EFF6FF", borderColor: "#BFDBFE" }}>
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare size={14} style={{ color: "#2563EB" }} />
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#2563EB" }}>Partner Memo</p>
                <span className="ml-1 text-xs px-1.5 py-0.5 rounded" style={{ background: "#BFDBFE", color: "#1D4ED8" }}>Agent & Partner</span>
              </div>
              <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--e-text-2)" }}>{contract.partnerNote}</p>
            </div>
          )}
          {contract?.notes && contract.notes !== contract.adminNote && (
            <div className="rounded-xl border p-5" style={{ background: "var(--e-bg-muted)", borderColor: "var(--e-border)" }}>
              <div className="flex items-center gap-2 mb-2">
                <StickyNote size={14} style={{ color: "#78716C" }} />
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#78716C" }}>Contract Notes</p>
              </div>
              <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--e-text-2)" }}>{contract.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
