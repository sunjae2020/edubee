import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Search, ChevronRight } from "lucide-react";
import { format } from "date-fns";

function statusStyle(s: string | null | undefined) {
  const v = (s ?? "").toLowerCase();
  if (v === "active" || v === "confirmed") return { background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0" };
  if (v === "draft") return { background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE" };
  if (v === "cancelled") return { background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" };
  return { background: "#FFFBEB", color: "#D97706", border: "1px solid #FDE68A" };
}

interface Booking {
  id: string;
  name: string | null;
  studentName: string | null;
  clientEmail: string | null;
  agentName: string | null;
  contractNumber: string | null;
  courseStartDate: string | null;
  courseEndDate: string | null;
  contractStatus: string | null;
  serviceModuleType: string | null;
  createdAt: string | null;
}

export default function PartnerConsultationsPage() {
  const [search, setSearch] = useState("");
  const [, navigate] = useLocation();

  const { data: bookings = [], isLoading, error } = useQuery({
    queryKey: ["portal-partner-bookings"],
    queryFn: () => api.get<{ data: Booking[] }>("/portal/partner/bookings").then(r => r.data),
  });

  // Group by student to show as "consultation" records
  const byStudent = bookings.reduce<Record<string, { student: string; email: string | null; agent: string | null; bookings: Booking[] }>>((acc, b) => {
    const key = b.studentName ?? b.clientEmail ?? b.id;
    if (!acc[key]) acc[key] = { student: b.studentName ?? "Unknown Student", email: b.clientEmail, agent: b.agentName, bookings: [] };
    acc[key].bookings.push(b);
    return acc;
  }, {});

  const entries = Object.values(byStudent).filter(e => {
    if (!search) return true;
    const q = search.toLowerCase();
    return e.student.toLowerCase().includes(q) || e.email?.toLowerCase().includes(q) || e.agent?.toLowerCase().includes(q);
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header count */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm" style={{ color: "#A8A29E" }}>
            {Object.keys(byStudent).length} client{Object.keys(byStudent).length !== 1 ? "s" : ""} · {bookings.length} booking{bookings.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#A8A29E" }} />
          <input
            className="h-9 pl-9 pr-3 rounded-lg border text-sm outline-none w-64"
            style={{ borderColor: "#E8E6E2", background: "#FFFFFF", color: "#1C1917" }}
            placeholder="Search student or agent..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load consultations. Please try again.
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl p-5 border" style={{ background: "#FFFFFF", borderColor: "#E8E6E2" }}>
              <Skeleton className="h-4 w-40 mb-2" /><Skeleton className="h-3 w-56" />
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 rounded-xl border" style={{ background: "#FFFFFF", borderColor: "#E8E6E2" }}>
          <Users className="w-10 h-10 mx-auto mb-3" style={{ color: "#D1CFC8" }} />
          <p className="text-sm font-medium" style={{ color: "#1C1917" }}>No clients yet</p>
          <p className="text-xs mt-1" style={{ color: "#A8A29E" }}>Students booked into your services will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((e, idx) => (
            <div key={idx} className="rounded-xl border p-5 transition-all"
              style={{ background: "#FFFFFF", borderColor: "#E8E6E2", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: "#FEF0E3", color: "#F5821F" }}>
                    {e.student.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold" style={{ color: "#1C1917" }}>{e.student}</p>
                    <div className="flex gap-2 text-xs flex-wrap" style={{ color: "#A8A29E" }}>
                      {e.email && <span>{e.email}</span>}
                      {e.agent && <span>· Agent: {e.agent}</span>}
                    </div>
                  </div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: "#FEF0E3", color: "#F5821F" }}>
                  {e.bookings.length} booking{e.bookings.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="space-y-2">
                {e.bookings.map(b => (
                  <div key={b.id} className="flex items-center justify-between text-xs rounded-lg px-3 py-2"
                    style={{ background: "#FAFAF9", cursor: "pointer" }}
                    onClick={() => navigate(`/partner/quotes/${b.id}`)}
                    onMouseEnter={ev => (ev.currentTarget.style.background = "#F4F3F1")}
                    onMouseLeave={ev => (ev.currentTarget.style.background = "#FAFAF9")}>
                    <div className="flex items-center gap-2">
                      <span style={{ color: "#57534E" }}>{b.name ?? "Service"}</span>
                      {b.contractNumber && <span style={{ color: "#A8A29E" }}>· {b.contractNumber}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      {b.courseStartDate && (
                        <span style={{ color: "#A8A29E" }}>{format(new Date(b.courseStartDate), "dd MMM yyyy")}</span>
                      )}
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full font-medium capitalize" style={statusStyle(b.contractStatus)}>
                        {b.contractStatus ?? "pending"}
                      </span>
                      <ChevronRight size={12} style={{ color: "#A8A29E" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
