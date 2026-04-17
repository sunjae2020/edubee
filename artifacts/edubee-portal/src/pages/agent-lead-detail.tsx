import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, User, Mail, Phone, Globe, Calendar, DollarSign,
  Tag, MessageSquare, FileText, ChevronRight, Clock, TrendingUp,
} from "lucide-react";
import { format } from "date-fns";

interface LinkedQuote {
  id: string;
  quoteRefNumber: string | null;
  quoteStatus: string;
  createdOn: string;
  expiryDate: string | null;
  totalAmount: string | null;
  accountName: string | null;
}

interface LeadDetail {
  id: string;
  leadRefNumber: string | null;
  status: string | null;
  fullName: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  source: string | null;
  inquiryType: string | null;
  budget: string | null;
  expectedStartDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string | null;
  linkedQuotes: LinkedQuote[];
}

function statusStyle(s: string | null | undefined) {
  const v = (s ?? "").toLowerCase();
  if (v === "qualified") return { background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0" };
  if (v === "proposal")  return { background: "#FFFBEB", color: "#D97706", border: "1px solid #FDE68A" };
  if (v === "new")       return { background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE" };
  if (v === "converted") return { background: "var(--e-orange-lt)", color: "var(--e-orange)", border: "1px solid color-mix(in srgb, var(--e-orange) 27%, transparent)" };
  if (v === "lost")      return { background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" };
  return { background: "var(--e-bg-muted)", color: "var(--e-text-2)", border: "1px solid #E8E6E2" };
}

function quoteStatusStyle(s: string) {
  const v = s.toLowerCase();
  if (v === "accepted") return { background: "#F0FDF4", color: "#16A34A" };
  if (v === "sent")     return { background: "#FFFBEB", color: "#D97706" };
  if (v === "draft")    return { background: "#EFF6FF", color: "#2563EB" };
  return { background: "var(--e-bg-muted)", color: "var(--e-text-2)" };
}

function fmt(n: string | number | null) {
  if (!n) return "—";
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(Number(n));
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: "var(--e-orange-lt)" }}>
        <Icon className="w-3.5 h-3.5" style={{ color: "var(--e-orange)" }} />
      </div>
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--e-text-3)" }}>{label}</p>
        <p className="text-sm font-medium mt-0.5" style={{ color: "var(--e-text-1)" }}>{value}</p>
      </div>
    </div>
  );
}

export default function AgentLeadDetailPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  const { data: lead, isLoading, error } = useQuery<LeadDetail>({
    queryKey: ["portal-lead", params.id],
    queryFn: () => api.get<LeadDetail>(`/portal/leads/${params.id}`).then(r => r),
    enabled: !!params.id,
  });

  if (isLoading) return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <Skeleton className="h-10 w-40 rounded-lg" />
      <Skeleton className="h-48 rounded-xl" />
      <Skeleton className="h-32 rounded-xl" />
    </div>
  );

  if (error || !lead) return (
    <div className="rounded-xl p-8 text-center max-w-3xl mx-auto" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
      <p className="text-sm font-medium" style={{ color: "#DC2626" }}>Lead not found or access denied</p>
      <button onClick={() => navigate("/consultations")} className="mt-3 text-xs underline" style={{ color: "#DC2626" }}>
        Back to Consultations
      </button>
    </div>
  );

  const ss = statusStyle(lead.status);

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate("/consultations")}
        className="flex items-center gap-1.5 text-sm font-medium transition-colors"
        style={{ color: "var(--e-text-2)" }}
        onMouseEnter={e => (e.currentTarget.style.color = "var(--e-orange)")}
        onMouseLeave={e => (e.currentTarget.style.color = "var(--e-text-2)")}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Consultations
      </button>

      {/* Header card */}
      <div className="rounded-xl p-5" style={{ background: "var(--e-bg-surface)", border: "1px solid var(--e-border)" }}>
        <div className="flex items-start gap-4">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold shrink-0"
            style={{ background: "var(--e-orange-lt)", color: "var(--e-orange)" }}
          >
            {lead.fullName.substring(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold" style={{ color: "var(--e-text-1)" }}>{lead.fullName}</h1>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={ss}>
                {(lead.status ?? "unknown").charAt(0).toUpperCase() + (lead.status ?? "unknown").slice(1)}
              </span>
            </div>
            {lead.leadRefNumber && (
              <p className="text-sm font-mono mt-0.5" style={{ color: "var(--e-text-3)" }}>{lead.leadRefNumber}</p>
            )}
            <div className="flex items-center gap-2 mt-2 text-xs flex-wrap" style={{ color: "var(--e-text-3)" }}>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Created {format(new Date(lead.createdAt), "d MMM yyyy")}
              </span>
              {lead.updatedAt && lead.updatedAt !== lead.createdAt && (
                <span>· Updated {format(new Date(lead.updatedAt), "d MMM yyyy")}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Contact info */}
        <div className="rounded-xl p-5 space-y-4" style={{ background: "var(--e-bg-surface)", border: "1px solid var(--e-border)" }}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--e-text-1)" }}>Contact Information</h2>
          <InfoRow icon={Mail}  label="Email"       value={lead.email} />
          <InfoRow icon={Phone} label="Phone"       value={lead.phone} />
          <InfoRow icon={Globe} label="Nationality" value={lead.nationality} />
          <InfoRow icon={Tag}   label="Source"      value={lead.source} />
        </div>

        {/* Enquiry details */}
        <div className="rounded-xl p-5 space-y-4" style={{ background: "var(--e-bg-surface)", border: "1px solid var(--e-border)" }}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--e-text-1)" }}>Enquiry Details</h2>
          <InfoRow icon={FileText}  label="Inquiry Type"        value={lead.inquiryType} />
          <InfoRow icon={DollarSign} label="Budget"             value={lead.budget ? fmt(lead.budget) : null} />
          <InfoRow icon={Calendar}  label="Expected Start Date" value={lead.expectedStartDate ? format(new Date(lead.expectedStartDate), "d MMM yyyy") : null} />
          <InfoRow icon={User}      label="Full Name"           value={lead.firstName || lead.lastName ? `${lead.firstName ?? ""} ${lead.lastName ?? ""}`.trim() : null} />
        </div>
      </div>

      {/* Notes */}
      {lead.notes && (
        <div className="rounded-xl p-5" style={{ background: "var(--e-bg-surface)", border: "1px solid var(--e-border)" }}>
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4" style={{ color: "var(--e-orange)" }} />
            <h2 className="text-sm font-semibold" style={{ color: "var(--e-text-1)" }}>Consultation Notes</h2>
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--e-text-2)" }}>
            {lead.notes}
          </p>
        </div>
      )}

      {/* Linked Quotes */}
      {lead.linkedQuotes && lead.linkedQuotes.length > 0 && (
        <div className="rounded-xl p-5" style={{ background: "var(--e-bg-surface)", border: "1px solid var(--e-border)" }}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4" style={{ color: "var(--e-orange)" }} />
            <h2 className="text-sm font-semibold" style={{ color: "var(--e-text-1)" }}>Related Quotes</h2>
            <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "var(--e-orange-lt)", color: "var(--e-orange)" }}>
              {lead.linkedQuotes.length}
            </span>
          </div>
          <div className="space-y-2">
            {lead.linkedQuotes.map(q => {
              const qs = quoteStatusStyle(q.quoteStatus);
              return (
                <div
                  key={q.id}
                  onClick={() => navigate(`/quotes/${q.id}`)}
                  className="flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors group"
                  style={{ background: "var(--e-bg-page)", border: "1px solid var(--e-border)" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--e-orange)")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--e-border)")}
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4" style={{ color: "var(--e-text-3)" }} />
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--e-text-1)" }}>
                        {q.quoteRefNumber ?? "No Ref"}
                      </p>
                      <p className="text-xs" style={{ color: "var(--e-text-3)" }}>
                        {q.accountName ?? "Unknown Student"} · {format(new Date(q.createdOn), "d MMM yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={qs}>
                      {q.quoteStatus}
                    </span>
                    {q.totalAmount && (
                      <span className="text-sm font-bold" style={{ color: "var(--e-text-1)" }}>
                        {fmt(q.totalAmount)}
                      </span>
                    )}
                    <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--e-orange)" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
