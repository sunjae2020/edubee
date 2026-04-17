import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarRange, ChevronRight } from "lucide-react";
import { format } from "date-fns";

const ORANGE = "var(--e-orange)";

function fmt(n: number | string | null | undefined) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 2 }).format(Number(n ?? 0));
}

function apStatusStyle(status: string | null | undefined) {
  const s = (status ?? "").toLowerCase();
  if (s === "paid") return { background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0" };
  if (s === "pending") return { background: "#FFFBEB", color: "#D97706", border: "1px solid #FDE68A" };
  if (s === "scheduled") return { background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE" };
  if (s === "overdue") return { background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" };
  return { background: "var(--e-bg-muted)", color: "var(--e-text-2)", border: "1px solid #E8E6E2" };
}

function contractStatusStyle(status: string | null | undefined) {
  const s = (status ?? "").toLowerCase();
  if (s === "active" || s === "confirmed") return { background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0" };
  if (s === "draft") return { background: "var(--e-bg-muted)", color: "var(--e-text-2)", border: "1px solid #E8E6E2" };
  if (s === "cancelled") return { background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" };
  return { background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE" };
}

interface Booking {
  id: string;
  contractId: string | null;
  name: string | null;
  serviceModuleType: string | null;
  quantity: number | null;
  apAmount: string | null;
  arAmount: string | null;
  status: string | null;
  apStatus: string | null;
  arStatus: string | null;
  apDueDate: string | null;
  createdAt: string | null;
  contractNumber: string | null;
  studentName: string | null;
  clientEmail: string | null;
  courseStartDate: string | null;
  courseEndDate: string | null;
  contractStatus: string | null;
  agentName: string | null;
  packageName: string | null;
}

export default function PartnerBookingsPage() {
  const [, navigate] = useLocation();
  const { data: bookings = [], isLoading, error } = useQuery({
    queryKey: ["portal-partner-bookings"],
    queryFn: () => api.get<{ data: Booking[] }>("/portal/partner/bookings").then(r => r.data),
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--e-text-1)" }}>My Bookings</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--e-text-3)" }}>Student bookings linked to your account</p>
        </div>
        <div className="flex items-center gap-2 text-sm" style={{ color: "var(--e-text-3)" }}>
          <CalendarRange className="h-4 w-4" />
          <span>{bookings.length} booking{bookings.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 mb-4">
          Failed to load bookings. Please try again.
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl p-5 border" style={{ background: "var(--e-bg-surface)", borderColor: "var(--e-border)" }}>
              <div className="flex justify-between mb-3">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-3 w-64" />
            </div>
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-20 rounded-xl border" style={{ background: "var(--e-bg-surface)", borderColor: "var(--e-border)" }}>
          <CalendarRange className="h-10 w-10 mx-auto mb-3" style={{ color: "#D1CFC8" }} />
          <p className="text-sm font-semibold" style={{ color: "var(--e-text-1)" }}>No bookings yet</p>
          <p className="text-xs mt-1" style={{ color: "var(--e-text-3)" }}>
            Bookings will appear here once students are enrolled in your programs.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ background: "var(--e-bg-surface)", borderColor: "var(--e-border)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid #E8E6E2", background: "var(--e-bg-page)" }}>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--e-text-3)" }}>Booking</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--e-text-3)" }}>Student</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--e-text-3)" }}>Program Dates</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--e-text-3)" }}>Revenue (AP)</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--e-text-3)" }}>Payment</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--e-text-3)" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} style={{ borderBottom: "1px solid #F4F3F1", cursor: "pointer" }}
                    onClick={() => navigate(`/partner/quotes/${b.id}`)}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--e-bg-page)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "")}>
                    <td className="px-5 py-4">
                      <p className="font-medium" style={{ color: "var(--e-text-1)" }}>{b.name ?? "—"}</p>
                      {b.contractNumber && (
                        <p className="text-xs mt-0.5" style={{ color: "var(--e-text-3)" }}>{b.contractNumber}</p>
                      )}
                      {b.serviceModuleType && (
                        <p className="text-xs capitalize" style={{ color: "var(--e-text-3)" }}>{b.serviceModuleType}</p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium" style={{ color: "var(--e-text-1)" }}>{b.studentName ?? "—"}</p>
                      {b.clientEmail && <p className="text-xs" style={{ color: "var(--e-text-3)" }}>{b.clientEmail}</p>}
                      {b.agentName && <p className="text-xs" style={{ color: "var(--e-text-3)" }}>Agent: {b.agentName}</p>}
                    </td>
                    <td className="px-5 py-4 text-xs" style={{ color: "var(--e-text-2)" }}>
                      {b.courseStartDate ? (
                        <>
                          <p>{format(new Date(b.courseStartDate), "dd MMM yyyy")}</p>
                          {b.courseEndDate && <p>{format(new Date(b.courseEndDate), "dd MMM yyyy")}</p>}
                        </>
                      ) : "—"}
                    </td>
                    <td className="px-5 py-4 text-right font-semibold" style={{ color: "var(--e-text-1)" }}>
                      {fmt(b.apAmount)}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize" style={apStatusStyle(b.apStatus)}>
                        {b.apStatus ?? "pending"}
                      </span>
                      {b.apDueDate && (
                        <p className="text-xs mt-1" style={{ color: "var(--e-text-3)" }}>
                          Due: {format(new Date(b.apDueDate), "dd MMM yyyy")}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize" style={contractStatusStyle(b.contractStatus)}>
                        {b.contractStatus ?? b.status ?? "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
