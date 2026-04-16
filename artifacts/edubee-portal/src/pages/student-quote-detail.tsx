import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import {
  ArrowLeft, FileText, User, Package,
  AlertCircle, CheckCircle2, Clock, XCircle, StickyNote,
} from "lucide-react";

function statusStyle(s: string | null | undefined) {
  const v = (s ?? "").toLowerCase();
  if (v === "accepted") return { background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0" };
  if (v === "sent" || v === "revised") return { background: "#FFFBEB", color: "#D97706", border: "1px solid #FDE68A" };
  if (v === "draft") return { background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE" };
  if (v === "cancelled" || v === "rejected" || v === "expired") return { background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" };
  return { background: "#F4F3F1", color: "#57534E", border: "1px solid #E8E6E2" };
}

function StatusIcon({ status }: { status: string }) {
  const v = status.toLowerCase();
  if (v === "accepted") return <CheckCircle2 size={16} className="text-green-500" />;
  if (v === "cancelled" || v === "rejected" || v === "expired") return <XCircle size={16} className="text-red-500" />;
  return <Clock size={16} style={{ color: "#D97706" }} />;
}

function nextStepText(status: string) {
  const v = status.toLowerCase();
  if (v === "draft") return "Your agent is preparing your quote. You will be notified when it is ready.";
  if (v === "sent" || v === "revised") return "Please review the items below and contact your agent if you have any questions.";
  if (v === "accepted") return "Your quote has been accepted and we are proceeding with your enrolment.";
  if (v === "cancelled") return "This quote has been cancelled. Please contact your agent for assistance.";
  if (v === "expired") return "This quote has expired. Please contact your agent for an updated quote.";
  return "Your agent will be in touch with the next steps.";
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
  agent: Record<string, any> | null;
}

interface Props {
  backPath?: string;
  backLabel?: string;
}

export default function StudentQuoteDetailPage({ backPath = "/student/quotes", backLabel = "Back to My Quotes" }: Props) {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  const { data, isLoading, error } = useQuery({
    queryKey: ["portal-student-quote-detail", id],
    queryFn: () => api.get<{ data: QuoteDetail }>(`/portal/student/quotes/${id}`).then(r => r.data),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto">
        <button onClick={() => navigate(backPath)} className="flex items-center gap-1.5 text-sm mb-4" style={{ color: "#A8A29E" }}>
          <ArrowLeft size={14} /> {backLabel}
        </button>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle size={16} /> Quote not found or you do not have access.
        </div>
      </div>
    );
  }

  const { quote, products, agent } = data;
  const totalValue = products.reduce((s: number, p: any) => s + Number(p.total ?? 0), 0);

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Back */}
      <button onClick={() => navigate(backPath)} className="flex items-center gap-1.5 text-sm" style={{ color: "#A8A29E" }}>
        <ArrowLeft size={14} /> {backLabel}
      </button>

      {/* Header */}
      <div className="rounded-xl border p-6" style={{ background: "#FFFFFF", borderColor: "#E8E6E2" }}>
        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileText size={16} style={{ color: "#F5821F" }} />
              <h1 className="text-lg font-bold" style={{ color: "#1C1917" }}>
                {quote.quoteRefNumber ?? "Quote"}
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize"
                style={statusStyle(quote.quoteStatus)}>
                <StatusIcon status={quote.quoteStatus} />
                <span className="ml-1">{quote.quoteStatus}</span>
              </span>
            </div>
            <p className="text-sm" style={{ color: "#57534E" }}>Prepared for {quote.customerName ?? "you"}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold" style={{ color: "#1C1917" }}>{money(totalValue)}</p>
            <p className="text-xs" style={{ color: "#A8A29E" }}>Total (AUD)</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wide mb-0.5" style={{ color: "#A8A29E" }}>Date Issued</p>
            <p style={{ color: "#57534E" }}>{fmt(quote.createdOn)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide mb-0.5" style={{ color: "#A8A29E" }}>Valid Until</p>
            <p style={{ color: "#57534E" }}>{fmt(quote.expiryDate)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide mb-0.5" style={{ color: "#A8A29E" }}>Last Updated</p>
            <p style={{ color: "#57534E" }}>{fmt(quote.modifiedOn)}</p>
          </div>
        </div>
      </div>

      {/* Next steps banner */}
      <div className="rounded-xl border p-4 flex items-start gap-3"
        style={{ background: "#FEF0E3", borderColor: "#F5821F40" }}>
        <StatusIcon status={quote.quoteStatus} />
        <div>
          <p className="text-sm font-semibold mb-0.5" style={{ color: "#1C1917" }}>What's next?</p>
          <p className="text-sm" style={{ color: "#57534E" }}>{nextStepText(quote.quoteStatus)}</p>
        </div>
      </div>

      {/* Agent info */}
      {agent && (
        <div className="rounded-xl border p-5" style={{ background: "#FFFFFF", borderColor: "#E8E6E2" }}>
          <div className="flex items-center gap-2 mb-3">
            <User size={15} style={{ color: "#F5821F" }} />
            <h2 className="font-semibold text-sm" style={{ color: "#1C1917" }}>Your Agent</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
              style={{ background: "#FEF0E3", color: "#F5821F" }}>
              {agent.name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() ?? "AG"}
            </div>
            <div className="text-sm">
              <p className="font-medium" style={{ color: "#1C1917" }}>{agent.name}</p>
              {agent.email && <p style={{ color: "#57534E" }}>{agent.email}</p>}
              {agent.phoneNumber && <p style={{ color: "#A8A29E" }}>{agent.phoneNumber}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Services included */}
      <div className="rounded-xl border overflow-hidden" style={{ background: "#FFFFFF", borderColor: "#E8E6E2" }}>
        <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: "#E8E6E2" }}>
          <Package size={15} style={{ color: "#F5821F" }} />
          <h2 className="font-semibold text-sm" style={{ color: "#1C1917" }}>Services Included</h2>
        </div>
        {products.length === 0 ? (
          <p className="px-5 py-8 text-sm text-center" style={{ color: "#A8A29E" }}>No items in this quote yet</p>
        ) : (
          <div className="divide-y" style={{ borderColor: "#F4F3F1" }}>
            {products.map((p: any, i: number) => (
              <div key={p.id ?? i} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-medium text-sm" style={{ color: "#1C1917" }}>
                        {p.productName ?? p.name ?? "Service"}
                      </p>
                      <span className="text-xs px-1.5 py-0.5 rounded"
                        style={{ background: "#FEF0E3", color: "#F5821F" }}>
                        {serviceLabel(p.serviceModuleType)}
                      </span>
                    </div>
                    {p.description && (
                      <p className="text-xs mt-0.5" style={{ color: "#A8A29E" }}>{p.description}</p>
                    )}
                    <p className="text-xs mt-1" style={{ color: "#A8A29E" }}>
                      Qty: {p.qty ?? p.quantity ?? 1}
                    </p>
                  </div>
                  <p className="font-semibold text-sm shrink-0" style={{ color: "#1C1917" }}>{money(p.total)}</p>
                </div>
              </div>
            ))}
            <div className="px-5 py-4 flex items-center justify-between" style={{ background: "#FAFAF9" }}>
              <p className="font-semibold text-sm" style={{ color: "#57534E" }}>Total</p>
              <p className="font-bold text-base" style={{ color: "#1C1917" }}>{money(totalValue)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Quote notes (student-visible only) */}
      {quote.notes && (
        <div className="rounded-xl border p-5" style={{ background: "#FFFBEB", borderColor: "#FDE68A" }}>
          <div className="flex items-center gap-2 mb-2">
            <StickyNote size={14} style={{ color: "#D97706" }} />
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#D97706" }}>Notes from your Agent</p>
          </div>
          <p className="text-sm whitespace-pre-wrap" style={{ color: "#57534E" }}>{quote.notes}</p>
        </div>
      )}
    </div>
  );
}
