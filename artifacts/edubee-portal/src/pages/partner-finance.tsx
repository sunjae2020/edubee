import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, DollarSign, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";

function fmt(n: number | string | null | undefined) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 2 }).format(Number(n ?? 0));
}

function apStatusStyle(s: string | null | undefined) {
  const v = (s ?? "").toLowerCase();
  if (v === "paid") return { background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0" };
  if (v === "pending") return { background: "#FFFBEB", color: "#D97706", border: "1px solid #FDE68A" };
  if (v === "scheduled") return { background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE" };
  if (v === "overdue") return { background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" };
  return { background: "var(--e-bg-muted)", color: "var(--e-text-2)", border: "1px solid #E8E6E2" };
}

interface Summary {
  totalRevenue: number;
  pendingRevenue: number;
  paidRevenue: number;
}
interface Booking {
  id: string;
  name: string | null;
  apAmount: string | null;
  apStatus: string | null;
  apDueDate: string | null;
  studentName: string | null;
  contractNumber: string | null;
  serviceModuleType: string | null;
  courseStartDate: string | null;
}

export default function PartnerFinancePage() {
  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ["portal-partner-summary"],
    queryFn: () => api.get<{ data: Summary }>("/portal/partner/summary").then(r => r.data),
  });

  const { data: bookings = [], isLoading: loadingBookings, error } = useQuery({
    queryKey: ["portal-partner-bookings"],
    queryFn: () => api.get<{ data: Booking[] }>("/portal/partner/bookings").then(r => r.data),
  });

  const isLoading = loadingSummary || loadingBookings;
  const overdue = bookings.filter(b => b.apStatus === "overdue");
  const pending = bookings.filter(b => b.apStatus === "pending" || b.apStatus === "scheduled");
  const paid    = bookings.filter(b => b.apStatus === "paid");

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue", value: summary?.totalRevenue ?? 0, icon: DollarSign, color: "var(--e-orange)", bg: "var(--e-orange-lt)" },
          { label: "Paid",          value: summary?.paidRevenue ?? 0,   icon: CheckCircle, color: "#16A34A", bg: "#F0FDF4" },
          { label: "Pending",       value: summary?.pendingRevenue ?? 0, icon: Clock,      color: "#D97706", bg: "#FFFBEB" },
          { label: "Overdue",       value: overdue.reduce((s, b) => s + Number(b.apAmount ?? 0), 0), icon: AlertCircle, color: "#DC2626", bg: "#FEF2F2" },
        ].map(c => (
          <div key={c.label} className="rounded-xl p-5 border" style={{ background: "var(--e-bg-surface)", borderColor: "var(--e-border)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--e-text-3)" }}>{c.label}</p>
                {isLoading
                  ? <Skeleton className="h-7 w-24 mt-1" />
                  : <p className="text-lg font-bold mt-1" style={{ color: "var(--e-text-1)" }}>{fmt(c.value)}</p>
                }
              </div>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: c.bg }}>
                <c.icon size={16} style={{ color: c.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load finance data. Please try again.
        </div>
      )}

      {/* Payment schedule table */}
      <div className="rounded-xl border overflow-hidden" style={{ background: "var(--e-bg-surface)", borderColor: "var(--e-border)" }}>
        <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: "1px solid #E8E6E2", background: "var(--e-bg-page)" }}>
          <Wallet size={15} style={{ color: "var(--e-text-3)" }} />
          <h3 className="text-sm font-semibold" style={{ color: "var(--e-text-1)" }}>Payment Schedule</h3>
          <span className="ml-auto text-xs" style={{ color: "var(--e-text-3)" }}>{bookings.length} item{bookings.length !== 1 ? "s" : ""}</span>
        </div>
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex justify-between"><Skeleton className="h-4 w-48" /><Skeleton className="h-4 w-24" /></div>
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-12">
            <Wallet className="w-8 h-8 mx-auto mb-2" style={{ color: "#D1CFC8" }} />
            <p className="text-sm" style={{ color: "var(--e-text-3)" }}>No payments recorded yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid #E8E6E2" }}>
                  {["Service", "Student", "Type", "Due Date", "Amount", "Status"].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--e-text-3)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bookings.map(b => (
                  <tr key={b.id} style={{ borderBottom: "1px solid #F4F3F1" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--e-bg-page)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "")}>
                    <td className="px-5 py-3.5">
                      <p className="font-medium" style={{ color: "var(--e-text-1)" }}>{b.name ?? "—"}</p>
                      {b.contractNumber && <p className="text-xs" style={{ color: "var(--e-text-3)" }}>{b.contractNumber}</p>}
                    </td>
                    <td className="px-5 py-3.5" style={{ color: "var(--e-text-2)" }}>{b.studentName ?? "—"}</td>
                    <td className="px-5 py-3.5">
                      <span className="capitalize text-xs px-2 py-0.5 rounded-md font-medium"
                        style={{ background: "var(--e-bg-muted)", color: "var(--e-text-2)" }}>
                        {b.serviceModuleType ?? "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs" style={{ color: "var(--e-text-2)" }}>
                      {b.apDueDate ? format(new Date(b.apDueDate), "dd MMM yyyy") : "—"}
                    </td>
                    <td className="px-5 py-3.5 font-semibold" style={{ color: "var(--e-text-1)" }}>{fmt(b.apAmount)}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize" style={apStatusStyle(b.apStatus)}>
                        {b.apStatus ?? "pending"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
