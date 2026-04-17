import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import {
  ArrowLeft, MessageSquare, User, Package,
  AlertCircle, FileText, Globe, Phone,
} from "lucide-react";

function leadStatusStyle(s: string | null | undefined) {
  const v = (s ?? "").toLowerCase();
  if (v === "converted") return { background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0" };
  if (v === "proposal")  return { background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE" };
  if (v === "qualified") return { background: "var(--e-orange-lt)", color: "#C2410C", border: "1px solid #FED7AA" };
  if (v === "lost")      return { background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" };
  return { background: "#FFFBEB", color: "#D97706", border: "1px solid #FDE68A" };
}

function leadStatusLabel(s: string | null | undefined) {
  const v = (s ?? "").toLowerCase();
  if (v === "new")       return "New Enquiry";
  if (v === "qualified") return "Qualified";
  if (v === "proposal")  return "Proposal Stage";
  if (v === "converted") return "Enrolled";
  if (v === "lost")      return "Not Proceeding";
  return s ?? "In Progress";
}

const STAGES = [
  { key: "new",       label: "Enquiry Received" },
  { key: "qualified", label: "Qualified" },
  { key: "proposal",  label: "Proposal Sent" },
  { key: "converted", label: "Enrolled" },
];

function StageBar({ current }: { current: string | null | undefined }) {
  const idx = STAGES.findIndex(s => s.key === (current ?? "new").toLowerCase());
  const activeIdx = idx === -1 ? 0 : idx;
  return (
    <div className="flex items-center gap-0 w-full">
      {STAGES.map((stage, i) => {
        const done   = i < activeIdx;
        const active = i === activeIdx;
        return (
          <div key={stage.key} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1 flex-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 shrink-0`}
                style={{
                  background: done || active ? "var(--e-orange)" : "var(--e-bg-muted)",
                  borderColor: done || active ? "var(--e-orange)" : "var(--e-border)",
                  color: done || active ? "var(--e-bg-surface)" : "var(--e-text-3)",
                }}>
                {done ? "✓" : i + 1}
              </div>
              <p className="text-center text-xs leading-tight" style={{ color: active ? "var(--e-orange)" : done ? "var(--e-text-2)" : "var(--e-text-3)", fontWeight: active ? 600 : 400 }}>
                {stage.label}
              </p>
            </div>
            {i < STAGES.length - 1 && (
              <div className="h-0.5 flex-1 mb-5 mx-1" style={{ background: done ? "var(--e-orange)" : "var(--e-border)" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function quoteStatusStyle(s: string | null | undefined) {
  const v = (s ?? "").toLowerCase();
  if (v === "accepted") return { background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0" };
  if (v === "sent" || v === "revised") return { background: "#FFFBEB", color: "#D97706", border: "1px solid #FDE68A" };
  if (v === "draft") return { background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE" };
  if (v === "cancelled" || v === "rejected" || v === "expired") return { background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" };
  return { background: "var(--e-bg-muted)", color: "var(--e-text-2)", border: "1px solid #E8E6E2" };
}

function serviceLabel(t: string | null | undefined) {
  const map: Record<string, string> = {
    study_abroad: "Study Abroad", accommodation: "Accommodation",
    pickup: "Pickup / Transfer", guardian: "Guardian",
    internship: "Internship", tour: "Tour", school_camp: "School Camp",
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

interface ConsultationDetail {
  consultation: Record<string, any>;
  products: Record<string, any>[];
  agent: Record<string, any> | null;
}

export default function StudentConsultationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  const { data, isLoading, error } = useQuery({
    queryKey: ["portal-student-consultation-detail", id],
    queryFn: () => api.get<{ data: ConsultationDetail }>(`/portal/student/consultations/${id}`).then(r => r.data),
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
        <button onClick={() => navigate("/student/consultations")} className="flex items-center gap-1.5 text-sm mb-4" style={{ color: "var(--e-text-3)" }}>
          <ArrowLeft size={14} /> Back to Consultations
        </button>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle size={16} /> Consultation not found or you do not have access.
        </div>
      </div>
    );
  }

  const { consultation: c, products, agent } = data;
  const totalValue = products.reduce((s: number, p: any) => s + Number(p.total ?? 0), 0);
  const refNum = c.leadRefNumber ?? c.quoteRefNumber ?? "Consultation";
  const status = c.leadStatus ?? c.quoteStatus;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <button onClick={() => navigate("/student/consultations")} className="flex items-center gap-1.5 text-sm" style={{ color: "var(--e-text-3)" }}>
        <ArrowLeft size={14} /> Back to Consultations
      </button>

      {/* Header card */}
      <div className="rounded-xl border p-6" style={{ background: "var(--e-bg-surface)", borderColor: "var(--e-border)" }}>
        <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare size={16} style={{ color: "var(--e-orange)" }} />
              <h1 className="text-lg font-bold" style={{ color: "var(--e-text-1)" }}>{refNum}</h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize"
                style={leadStatusStyle(status)}>
                {leadStatusLabel(status)}
              </span>
            </div>
            <p className="text-sm" style={{ color: "var(--e-text-2)" }}>Started {fmt(c.createdOn)}</p>
          </div>
          {totalValue > 0 && (
            <div className="text-right">
              <p className="text-2xl font-bold" style={{ color: "var(--e-text-1)" }}>{money(totalValue)}</p>
              <p className="text-xs" style={{ color: "var(--e-text-3)" }}>Estimated Total (AUD)</p>
            </div>
          )}
        </div>

        {/* Stage bar */}
        {c.leadStatus && c.leadStatus !== "lost" && (
          <StageBar current={c.leadStatus} />
        )}
      </div>

      {/* Lead / Enquiry details */}
      {(c.leadNotes || c.leadNationality || c.leadInquiryType || c.leadSource) && (
        <div className="rounded-xl border p-5" style={{ background: "var(--e-bg-surface)", borderColor: "var(--e-border)" }}>
          <div className="flex items-center gap-2 mb-4">
            <FileText size={15} style={{ color: "var(--e-orange)" }} />
            <h2 className="font-semibold text-sm" style={{ color: "var(--e-text-1)" }}>Enquiry Details</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm mb-4">
            {c.leadNationality && (
              <div>
                <p className="text-xs uppercase tracking-wide mb-0.5" style={{ color: "var(--e-text-3)" }}>Nationality</p>
                <div className="flex items-center gap-1">
                  <Globe size={12} style={{ color: "var(--e-text-2)" }} />
                  <p style={{ color: "var(--e-text-2)" }}>{c.leadNationality}</p>
                </div>
              </div>
            )}
            {c.leadInquiryType && (
              <div>
                <p className="text-xs uppercase tracking-wide mb-0.5" style={{ color: "var(--e-text-3)" }}>Enquiry Type</p>
                <p style={{ color: "var(--e-text-2)" }} className="capitalize">{c.leadInquiryType}</p>
              </div>
            )}
            {c.leadSource && (
              <div>
                <p className="text-xs uppercase tracking-wide mb-0.5" style={{ color: "var(--e-text-3)" }}>Source</p>
                <p style={{ color: "var(--e-text-2)" }} className="capitalize">{c.leadSource}</p>
              </div>
            )}
          </div>
          {c.leadNotes && (
            <div className="rounded-lg p-3 text-sm" style={{ background: "var(--e-bg-page)", borderColor: "var(--e-border)", border: "1px solid #E8E6E2" }}>
              <p className="text-xs font-medium mb-1 uppercase tracking-wide" style={{ color: "var(--e-text-3)" }}>Notes</p>
              <p className="whitespace-pre-wrap" style={{ color: "var(--e-text-2)" }}>{c.leadNotes}</p>
            </div>
          )}
        </div>
      )}

      {/* Agent info */}
      {agent && (
        <div className="rounded-xl border p-5" style={{ background: "var(--e-bg-surface)", borderColor: "var(--e-border)" }}>
          <div className="flex items-center gap-2 mb-3">
            <User size={15} style={{ color: "var(--e-orange)" }} />
            <h2 className="font-semibold text-sm" style={{ color: "var(--e-text-1)" }}>Your Agent</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
              style={{ background: "var(--e-orange-lt)", color: "var(--e-orange)" }}>
              {agent.name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() ?? "AG"}
            </div>
            <div className="text-sm">
              <p className="font-medium" style={{ color: "var(--e-text-1)" }}>{agent.name}</p>
              {agent.email && <p style={{ color: "var(--e-text-2)" }}>{agent.email}</p>}
              {agent.phoneNumber && (
                <div className="flex items-center gap-1" style={{ color: "var(--e-text-3)" }}>
                  <Phone size={11} />
                  <span>{agent.phoneNumber}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quote / Proposal */}
      {(products.length > 0 || c.quoteRefNumber) && (
        <div className="rounded-xl border overflow-hidden" style={{ background: "var(--e-bg-surface)", borderColor: "var(--e-border)" }}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--e-border)" }}>
            <div className="flex items-center gap-2">
              <Package size={15} style={{ color: "var(--e-orange)" }} />
              <h2 className="font-semibold text-sm" style={{ color: "var(--e-text-1)" }}>
                {c.quoteRefNumber ? `Proposal — ${c.quoteRefNumber}` : "Proposal"}
              </h2>
            </div>
            {c.quoteStatus && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize"
                style={quoteStatusStyle(c.quoteStatus)}>
                {c.quoteStatus}
              </span>
            )}
          </div>

          {products.length === 0 ? (
            <p className="px-5 py-8 text-sm text-center" style={{ color: "var(--e-text-3)" }}>No items in this proposal yet</p>
          ) : (
            <>
              {/* Table header */}
              <div className="hidden sm:grid grid-cols-[1fr_80px_100px_100px] px-5 py-2 text-xs font-medium uppercase tracking-wide"
                style={{ background: "var(--e-bg-page)", color: "var(--e-text-3)", borderBottom: "1px solid #E8E6E2" }}>
                <span>Service</span>
                <span className="text-center">Qty</span>
                <span className="text-right">Unit Price</span>
                <span className="text-right">Total</span>
              </div>
              <div className="divide-y" style={{ borderColor: "var(--e-bg-muted)" }}>
                {products.map((p: any, i: number) => (
                  <div key={p.id ?? i} className="px-5 py-4">
                    <div className="sm:grid sm:grid-cols-[1fr_80px_100px_100px] sm:gap-2 items-center">
                      <div className="mb-2 sm:mb-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <p className="font-medium text-sm" style={{ color: "var(--e-text-1)" }}>
                            {p.productName ?? p.name ?? "Service"}
                          </p>
                          {p.serviceModuleType && (
                            <span className="text-xs px-1.5 py-0.5 rounded"
                              style={{ background: "var(--e-orange-lt)", color: "var(--e-orange)" }}>
                              {serviceLabel(p.serviceModuleType)}
                            </span>
                          )}
                        </div>
                        {p.description && <p className="text-xs" style={{ color: "var(--e-text-3)" }}>{p.description}</p>}
                      </div>
                      <p className="text-sm text-center hidden sm:block" style={{ color: "var(--e-text-2)" }}>{p.qty ?? p.quantity ?? 1}</p>
                      <p className="text-sm text-right hidden sm:block" style={{ color: "var(--e-text-2)" }}>{money(p.unitPrice)}</p>
                      <p className="font-semibold text-sm sm:text-right" style={{ color: "var(--e-text-1)" }}>{money(p.total)}</p>
                    </div>
                  </div>
                ))}
                <div className="px-5 py-4 flex items-center justify-between" style={{ background: "var(--e-bg-page)" }}>
                  <p className="font-semibold text-sm" style={{ color: "var(--e-text-2)" }}>Total</p>
                  <p className="font-bold text-base" style={{ color: "var(--e-text-1)" }}>{money(totalValue)}</p>
                </div>
              </div>
            </>
          )}

          {c.expiryDate && (
            <div className="px-5 py-3 border-t text-xs" style={{ borderColor: "var(--e-border)", color: "var(--e-text-3)" }}>
              Quote valid until {fmt(c.expiryDate)}
            </div>
          )}
        </div>
      )}

      {/* Notes from agent */}
      {c.notes && (
        <div className="rounded-xl border p-5" style={{ background: "#FFFBEB", borderColor: "#FDE68A" }}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#D97706" }}>Notes from your Agent</p>
          <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--e-text-2)" }}>{c.notes}</p>
        </div>
      )}
    </div>
  );
}
