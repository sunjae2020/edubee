import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Package } from "lucide-react";
import { format } from "date-fns";

function fmt(n: number | string | null | undefined) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(n ?? 0));
}

function apStatusStyle(s: string | null | undefined) {
  const v = (s ?? "").toLowerCase();
  if (v === "paid") return { background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0" };
  if (v === "pending") return { background: "#FFFBEB", color: "#D97706", border: "1px solid #FDE68A" };
  if (v === "scheduled") return { background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE" };
  if (v === "overdue") return { background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" };
  return { background: "#F4F3F1", color: "#57534E", border: "1px solid #E8E6E2" };
}

const TYPE_ICONS: Record<string, string> = {
  institute: "🏫",
  hotel: "🏨",
  pickup: "🚐",
  tour: "🗺️",
};

interface Booking {
  id: string;
  name: string | null;
  serviceModuleType: string | null;
  quantity: number | null;
  apAmount: string | null;
  arAmount: string | null;
  status: string | null;
  apStatus: string | null;
  apDueDate: string | null;
  studentName: string | null;
  courseStartDate: string | null;
  courseEndDate: string | null;
  contractStatus: string | null;
}

export default function PartnerServicesPage() {
  const { data: bookings = [], isLoading, error } = useQuery({
    queryKey: ["portal-partner-bookings"],
    queryFn: () => api.get<{ data: Booking[] }>("/portal/partner/bookings").then(r => r.data),
  });

  // Group by service type
  const byType = bookings.reduce<Record<string, Booking[]>>((acc, b) => {
    const key = b.serviceModuleType ?? "other";
    if (!acc[key]) acc[key] = [];
    acc[key].push(b);
    return acc;
  }, {});

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Summary cards per type */}
      {!isLoading && Object.keys(byType).length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Object.entries(byType).map(([type, items]) => {
            const totalRevenue = items.reduce((s, i) => s + Number(i.apAmount ?? 0), 0);
            return (
              <div key={type} className="rounded-xl p-4 border" style={{ background: "#FFFFFF", borderColor: "#E8E6E2", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <div className="text-xl mb-2">{TYPE_ICONS[type] ?? "📦"}</div>
                <p className="text-xs font-semibold uppercase tracking-wide capitalize mb-1" style={{ color: "#57534E" }}>{type}</p>
                <p className="text-lg font-bold" style={{ color: "#1C1917" }}>{items.length}</p>
                <p className="text-xs mt-0.5" style={{ color: "#A8A29E" }}>{fmt(totalRevenue)}</p>
              </div>
            );
          })}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load services. Please try again.
        </div>
      )}

      {/* Table per group */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl p-5 border" style={{ background: "#FFFFFF", borderColor: "#E8E6E2" }}>
              <Skeleton className="h-4 w-32 mb-3" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
      ) : Object.keys(byType).length === 0 ? (
        <div className="text-center py-16 rounded-xl border" style={{ background: "#FFFFFF", borderColor: "#E8E6E2" }}>
          <Package className="w-10 h-10 mx-auto mb-3" style={{ color: "#D1CFC8" }} />
          <p className="text-sm font-medium" style={{ color: "#1C1917" }}>No services yet</p>
          <p className="text-xs mt-1" style={{ color: "#A8A29E" }}>Your booked services will appear here once students are enrolled.</p>
        </div>
      ) : (
        Object.entries(byType).map(([type, items]) => (
          <div key={type} className="rounded-xl border overflow-hidden" style={{ background: "#FFFFFF", borderColor: "#E8E6E2" }}>
            <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: "1px solid #E8E6E2", background: "#FAFAF9" }}>
              <span className="text-base">{TYPE_ICONS[type] ?? "📦"}</span>
              <h3 className="text-sm font-semibold capitalize" style={{ color: "#1C1917" }}>{type}</h3>
              <span className="ml-auto text-xs" style={{ color: "#A8A29E" }}>{items.length} item{items.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid #F4F3F1" }}>
                    {["Service Name", "Student", "Dates", "Revenue (AP)", "Payment"].map(h => (
                      <th key={h} className="text-left px-5 py-2.5 text-xs font-semibold uppercase tracking-wide" style={{ color: "#A8A29E" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map(b => (
                    <tr key={b.id} style={{ borderBottom: "1px solid #F4F3F1" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#FAFAF9")}
                      onMouseLeave={e => (e.currentTarget.style.background = "")}>
                      <td className="px-5 py-3.5 font-medium" style={{ color: "#1C1917" }}>{b.name ?? "—"}</td>
                      <td className="px-5 py-3.5" style={{ color: "#57534E" }}>{b.studentName ?? "—"}</td>
                      <td className="px-5 py-3.5 text-xs" style={{ color: "#57534E" }}>
                        {b.courseStartDate ? format(new Date(b.courseStartDate), "dd MMM yyyy") : "—"}
                      </td>
                      <td className="px-5 py-3.5 font-semibold" style={{ color: "#1C1917" }}>{fmt(b.apAmount)}</td>
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
          </div>
        ))
      )}
    </div>
  );
}
