import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import {
  ArrowLeft, BookOpen, Package, AlertCircle,
  CheckCircle2, Clock, XCircle, CalendarDays, CreditCard,
} from "lucide-react";

function contractStatusStyle(s: string | null | undefined) {
  const v = (s ?? "").toLowerCase();
  if (v === "active" || v === "confirmed") return { background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0" };
  if (v === "draft") return { background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE" };
  if (v === "cancelled") return { background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" };
  if (v === "completed") return { background: "#F4F3F1", color: "#57534E", border: "1px solid #E8E6E2" };
  return { background: "#FFFBEB", color: "#D97706", border: "1px solid #FDE68A" };
}

function productStatusStyle(s: string | null | undefined) {
  const v = (s ?? "").toLowerCase();
  if (v === "confirmed" || v === "active") return { background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0" };
  if (v === "cancelled") return { background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" };
  if (v === "completed") return { background: "#F4F3F1", color: "#57534E", border: "1px solid #E8E6E2" };
  return { background: "#FFFBEB", color: "#D97706", border: "1px solid #FDE68A" };
}

function serviceLabel(t: string | null | undefined) {
  const map: Record<string, string> = {
    study_abroad: "Study Abroad", accommodation: "Accommodation",
    pickup: "Pickup / Transfer", guardian: "Guardian",
    internship: "Internship", tour: "Tour", school_camp: "School Camp",
  };
  return t ? (map[t] ?? t) : "—";
}

function StatusIcon({ status }: { status: string }) {
  const v = status.toLowerCase();
  if (v === "active" || v === "confirmed") return <CheckCircle2 size={15} className="text-green-500" />;
  if (v === "cancelled") return <XCircle size={15} className="text-red-500" />;
  return <Clock size={15} style={{ color: "#D97706" }} />;
}

function fmt(v: string | null | undefined) {
  if (!v) return "—";
  try { return format(new Date(v), "dd MMM yyyy"); } catch { return v; }
}

function money(v: string | number | null | undefined) {
  if (v == null || v === "") return "—";
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(Number(v));
}

interface ServiceDetail {
  contract: Record<string, any>;
  products: Record<string, any>[];
}

export default function StudentServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  const { data, isLoading, error } = useQuery({
    queryKey: ["portal-student-service-detail", id],
    queryFn: () => api.get<{ data: ServiceDetail }>(`/portal/student/programs/${id}`).then(r => r.data),
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
        <button onClick={() => navigate("/student/services")} className="flex items-center gap-1.5 text-sm mb-4" style={{ color: "#A8A29E" }}>
          <ArrowLeft size={14} /> Back to Services
        </button>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle size={16} /> Service not found or you do not have access.
        </div>
      </div>
    );
  }

  const { contract: c, products } = data;
  const balance = Number(c.balanceAmount ?? 0);

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <button onClick={() => navigate("/student/services")} className="flex items-center gap-1.5 text-sm" style={{ color: "#A8A29E" }}>
        <ArrowLeft size={14} /> Back to Services
      </button>

      {/* Header */}
      <div className="rounded-xl border p-6" style={{ background: "#FFFFFF", borderColor: "#E8E6E2" }}>
        <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BookOpen size={16} style={{ color: "#F5821F" }} />
              <h1 className="text-lg font-bold" style={{ color: "#1C1917" }}>
                {c.packageName ?? c.packageGroupName ?? "Service"}
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize"
                style={contractStatusStyle(c.status)}>
                <StatusIcon status={c.status ?? "pending"} />
                <span className="ml-1">{c.status ?? "pending"}</span>
              </span>
            </div>
            {c.contractNumber && (
              <p className="text-sm" style={{ color: "#A8A29E" }}>Contract: {c.contractNumber}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold" style={{ color: "#1C1917" }}>{money(c.totalAmount)}</p>
            <p className="text-xs" style={{ color: "#A8A29E" }}>Total (AUD)</p>
          </div>
        </div>

        {/* Key dates & amounts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <div className="flex items-center gap-1 mb-0.5">
              <CalendarDays size={11} style={{ color: "#A8A29E" }} />
              <p className="text-xs uppercase tracking-wide" style={{ color: "#A8A29E" }}>Start Date</p>
            </div>
            <p className="text-sm font-medium" style={{ color: "#1C1917" }}>{fmt(c.courseStartDate)}</p>
          </div>
          <div>
            <div className="flex items-center gap-1 mb-0.5">
              <CalendarDays size={11} style={{ color: "#A8A29E" }} />
              <p className="text-xs uppercase tracking-wide" style={{ color: "#A8A29E" }}>End Date</p>
            </div>
            <p className="text-sm font-medium" style={{ color: "#1C1917" }}>{fmt(c.courseEndDate)}</p>
          </div>
          <div>
            <div className="flex items-center gap-1 mb-0.5">
              <CreditCard size={11} style={{ color: "#A8A29E" }} />
              <p className="text-xs uppercase tracking-wide" style={{ color: "#A8A29E" }}>Paid</p>
            </div>
            <p className="text-sm font-bold" style={{ color: "#16A34A" }}>{money(c.paidAmount)}</p>
          </div>
          <div>
            <div className="flex items-center gap-1 mb-0.5">
              <CreditCard size={11} style={{ color: "#A8A29E" }} />
              <p className="text-xs uppercase tracking-wide" style={{ color: "#A8A29E" }}>Balance Due</p>
            </div>
            <p className="text-sm font-bold" style={{ color: balance > 0 ? "#D97706" : "#16A34A" }}>{money(c.balanceAmount)}</p>
          </div>
        </div>

        {(c.agentName || c.signedAt) && (
          <div className="mt-4 pt-4 border-t flex items-center gap-4 text-xs" style={{ borderColor: "#F4F3F1", color: "#A8A29E" }}>
            {c.agentName && <span>Agent: {c.agentName}</span>}
            {c.signedAt && <span>Signed: {fmt(c.signedAt)}</span>}
          </div>
        )}
      </div>

      {/* Payment progress bar */}
      {Number(c.totalAmount ?? 0) > 0 && (
        <div className="rounded-xl border p-5" style={{ background: "#FFFFFF", borderColor: "#E8E6E2" }}>
          <p className="text-sm font-semibold mb-3" style={{ color: "#1C1917" }}>Payment Progress</p>
          <div className="w-full rounded-full h-3 mb-2" style={{ background: "#F4F3F1" }}>
            <div className="h-3 rounded-full transition-all"
              style={{
                background: "#F5821F",
                width: `${Math.min(100, (Number(c.paidAmount ?? 0) / Number(c.totalAmount)) * 100).toFixed(1)}%`,
              }} />
          </div>
          <div className="flex justify-between text-xs" style={{ color: "#A8A29E" }}>
            <span>Paid: {money(c.paidAmount)}</span>
            <span>Total: {money(c.totalAmount)}</span>
          </div>
        </div>
      )}

      {/* Services included */}
      <div className="rounded-xl border overflow-hidden" style={{ background: "#FFFFFF", borderColor: "#E8E6E2" }}>
        <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: "#E8E6E2" }}>
          <Package size={15} style={{ color: "#F5821F" }} />
          <h2 className="font-semibold text-sm" style={{ color: "#1C1917" }}>Services Included</h2>
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: "#FEF0E3", color: "#F5821F" }}>
            {products.length} item{products.length !== 1 ? "s" : ""}
          </span>
        </div>

        {products.length === 0 ? (
          <p className="px-5 py-8 text-sm text-center" style={{ color: "#A8A29E" }}>No service items found</p>
        ) : (
          <>
            <div className="hidden sm:grid grid-cols-[1fr_120px_90px_110px] px-5 py-2 text-xs font-medium uppercase tracking-wide"
              style={{ background: "#FAFAF9", color: "#A8A29E", borderBottom: "1px solid #E8E6E2" }}>
              <span>Service</span>
              <span>Status</span>
              <span className="text-center">Qty</span>
              <span className="text-right">Amount</span>
            </div>
            <div className="divide-y" style={{ borderColor: "#F4F3F1" }}>
              {products.map((p: any, i: number) => (
                <div key={p.id ?? i} className="px-5 py-4">
                  <div className="sm:grid sm:grid-cols-[1fr_120px_90px_110px] sm:gap-2 items-center">
                    <div className="mb-2 sm:mb-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="font-medium text-sm" style={{ color: "#1C1917" }}>
                          {p.name ?? "Service"}
                        </p>
                        {p.serviceModuleType && (
                          <span className="text-xs px-1.5 py-0.5 rounded"
                            style={{ background: "#FEF0E3", color: "#F5821F" }}>
                            {serviceLabel(p.serviceModuleType)}
                          </span>
                        )}
                      </div>
                      {p.arDueDate && (
                        <p className="text-xs" style={{ color: "#A8A29E" }}>Due: {fmt(p.arDueDate)}</p>
                      )}
                    </div>
                    <div className="mb-2 sm:mb-0">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize"
                        style={productStatusStyle(p.status)}>
                        {p.status ?? "pending"}
                      </span>
                    </div>
                    <p className="text-sm text-center hidden sm:block" style={{ color: "#57534E" }}>{p.quantity ?? 1}</p>
                    <p className="font-semibold text-sm sm:text-right" style={{ color: "#1C1917" }}>{money(p.arAmount ?? p.totalPrice)}</p>
                  </div>
                </div>
              ))}
              <div className="px-5 py-4 flex items-center justify-between" style={{ background: "#FAFAF9" }}>
                <p className="font-semibold text-sm" style={{ color: "#57534E" }}>Contract Total</p>
                <p className="font-bold text-base" style={{ color: "#1C1917" }}>{money(c.totalAmount)}</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Notes */}
      {c.notes && (
        <div className="rounded-xl border p-5" style={{ background: "#FFFBEB", borderColor: "#FDE68A" }}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#D97706" }}>Notes</p>
          <p className="text-sm whitespace-pre-wrap" style={{ color: "#57534E" }}>{c.notes}</p>
        </div>
      )}
    </div>
  );
}
