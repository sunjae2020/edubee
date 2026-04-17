import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import {
  ArrowLeft, User, Calendar, DollarSign,
  AlertCircle, MessageSquare, Package, Layers,
} from "lucide-react";

function statusStyle(s: string | null | undefined) {
  const v = (s ?? "").toLowerCase();
  if (v === "active" || v === "completed" || v === "paid" || v === "confirmed") return { background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0" };
  if (v === "pending" || v === "scheduled") return { background: "#FFFBEB", color: "#D97706", border: "1px solid #FDE68A" };
  if (v === "cancelled") return { background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" };
  return { background: "var(--e-bg-muted)", color: "var(--e-text-2)", border: "1px solid #E8E6E2" };
}

function serviceLabel(t: string | null | undefined) {
  const map: Record<string, string> = {
    study_abroad: "Study Abroad", accommodation: "Accommodation",
    pickup: "Pickup / Transfer", guardian: "Guardian",
    internship: "Internship", tour: "Tour",
  };
  return t ? (map[t] ?? t) : "Service";
}

function fmt(v: string | null | undefined) {
  if (!v) return "—";
  try { return format(new Date(v), "dd MMM yyyy"); } catch { return v; }
}

function money(v: string | number | null | undefined) {
  if (v == null || v === "") return "—";
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(Number(v));
}

interface BookingDetail {
  id: string;
  contractId: string | null;
  name: string | null;
  serviceModuleType: string | null;
  quantity: number | null;
  unitPrice: string | null;
  totalPrice: string | null;
  apAmount: string | null;
  apStatus: string | null;
  apDueDate: string | null;
  status: string | null;
  createdAt: string | null;
  contractNumber: string | null;
  contractStatus: string | null;
  studentName: string | null;
  clientEmail: string | null;
  clientCountry: string | null;
  agentName: string | null;
  packageName: string | null;
  courseStartDate: string | null;
  courseEndDate: string | null;
  partnerNote: string | null;
  notes: string | null;
  paidAmount: string | null;
  balanceAmount: string | null;
  siblingServices: Array<{
    id: string;
    name: string | null;
    serviceModuleType: string | null;
    apAmount: string | null;
    apStatus: string | null;
    status: string | null;
  }>;
}

interface Props {
  backPath?: string;
  backLabel?: string;
}

export default function PartnerBookingDetailPage({ backPath = "/partner/quotes", backLabel = "Back to Bookings" }: Props) {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  const { data, isLoading, error } = useQuery({
    queryKey: ["portal-partner-booking-detail", id],
    queryFn: () => api.get<{ data: BookingDetail }>(`/portal/partner/bookings/${id}`).then(r => r.data),
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
        <button onClick={() => navigate(backPath)} className="flex items-center gap-1.5 text-sm mb-4" style={{ color: "var(--e-text-3)" }}>
          <ArrowLeft size={14} /> {backLabel}
        </button>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle size={16} /> Booking not found or you do not have access.
        </div>
      </div>
    );
  }

  const b = data;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Back */}
      <button onClick={() => navigate(backPath)} className="flex items-center gap-1.5 text-sm" style={{ color: "var(--e-text-3)" }}>
        <ArrowLeft size={14} /> {backLabel}
      </button>

      {/* Header */}
      <div className="rounded-xl border p-6" style={{ background: "var(--e-bg-surface)", borderColor: "var(--e-border)" }}>
        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Package size={16} style={{ color: "var(--e-orange)" }} />
              <h1 className="text-lg font-bold" style={{ color: "var(--e-text-1)" }}>
                {b.name ?? "Booking"}
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize"
                style={statusStyle(b.status)}>
                {b.status ?? "pending"}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap text-sm" style={{ color: "var(--e-text-2)" }}>
              <span className="px-2 py-0.5 rounded text-xs" style={{ background: "var(--e-orange-lt)", color: "var(--e-orange)" }}>
                {serviceLabel(b.serviceModuleType)}
              </span>
              {b.contractNumber && <span style={{ color: "var(--e-text-3)" }}>Contract: {b.contractNumber}</span>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold" style={{ color: "var(--e-text-1)" }}>{money(b.apAmount)}</p>
            <p className="text-xs" style={{ color: "var(--e-text-3)" }}>Your Payable</p>
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
          <div className="space-y-1.5 text-sm">
            <p className="font-medium" style={{ color: "var(--e-text-1)" }}>{b.studentName ?? "—"}</p>
            {b.clientEmail && <p style={{ color: "var(--e-text-2)" }}>{b.clientEmail}</p>}
            {b.clientCountry && <p style={{ color: "var(--e-text-3)" }}>{b.clientCountry}</p>}
            {b.agentName && (
              <p className="text-xs pt-1" style={{ color: "var(--e-text-3)" }}>Agent: {b.agentName}</p>
            )}
          </div>
        </div>

        {/* Course dates */}
        <div className="rounded-xl border p-5" style={{ background: "var(--e-bg-surface)", borderColor: "var(--e-border)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={15} style={{ color: "var(--e-orange)" }} />
            <h2 className="font-semibold text-sm" style={{ color: "var(--e-text-1)" }}>Course Period</h2>
          </div>
          <div className="space-y-2 text-sm">
            <div>
              <p className="text-xs" style={{ color: "var(--e-text-3)" }}>Start Date</p>
              <p className="font-medium" style={{ color: "var(--e-text-1)" }}>{fmt(b.courseStartDate)}</p>
            </div>
            <div>
              <p className="text-xs" style={{ color: "var(--e-text-3)" }}>End Date</p>
              <p className="font-medium" style={{ color: "var(--e-text-1)" }}>{fmt(b.courseEndDate)}</p>
            </div>
            {b.packageName && (
              <div>
                <p className="text-xs" style={{ color: "var(--e-text-3)" }}>Package</p>
                <p style={{ color: "var(--e-text-2)" }}>{b.packageName}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment details — partner sees AP only */}
      <div className="rounded-xl border p-5" style={{ background: "var(--e-bg-surface)", borderColor: "var(--e-border)" }}>
        <div className="flex items-center gap-2 mb-4">
          <DollarSign size={15} style={{ color: "var(--e-orange)" }} />
          <h2 className="font-semibold text-sm" style={{ color: "var(--e-text-1)" }}>Payment Details</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs" style={{ color: "var(--e-text-3)" }}>Your Amount (AP)</p>
            <p className="font-bold text-base" style={{ color: "var(--e-text-1)" }}>{money(b.apAmount)}</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: "var(--e-text-3)" }}>Payment Status</p>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize mt-1"
              style={statusStyle(b.apStatus)}>
              {b.apStatus ?? "pending"}
            </span>
          </div>
          {b.apDueDate && (
            <div>
              <p className="text-xs" style={{ color: "var(--e-text-3)" }}>Due Date</p>
              <p style={{ color: "var(--e-text-2)" }}>{fmt(b.apDueDate)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Other services in same contract */}
      {b.siblingServices && b.siblingServices.length > 0 && (
        <div className="rounded-xl border p-5" style={{ background: "var(--e-bg-surface)", borderColor: "var(--e-border)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Layers size={15} style={{ color: "var(--e-orange)" }} />
            <h2 className="font-semibold text-sm" style={{ color: "var(--e-text-1)" }}>Other Services in Contract</h2>
          </div>
          <div className="space-y-2">
            {b.siblingServices.map(s => (
              <div key={s.id} className="flex items-center justify-between text-sm rounded-lg px-3 py-2.5"
                style={{ background: "var(--e-bg-page)" }}>
                <div className="flex items-center gap-2">
                  <span style={{ color: "var(--e-text-2)" }}>{s.name ?? "Service"}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--e-orange-lt)", color: "var(--e-orange)" }}>
                    {serviceLabel(s.serviceModuleType)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{ color: "var(--e-text-2)" }}>{money(s.apAmount)}</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize"
                    style={statusStyle(s.apStatus)}>
                    {s.apStatus ?? "pending"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Partner memo (visible to partner) — no admin note */}
      {b.partnerNote && (
        <div className="rounded-xl border p-5" style={{ background: "#EFF6FF", borderColor: "#BFDBFE" }}>
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare size={14} style={{ color: "#2563EB" }} />
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#2563EB" }}>Memo from Agency</p>
          </div>
          <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--e-text-2)" }}>{b.partnerNote}</p>
        </div>
      )}

      {b.notes && (
        <div className="rounded-xl border p-5" style={{ background: "var(--e-bg-muted)", borderColor: "var(--e-border)" }}>
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare size={14} style={{ color: "#78716C" }} />
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#78716C" }}>Notes</p>
          </div>
          <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--e-text-2)" }}>{b.notes}</p>
        </div>
      )}
    </div>
  );
}
