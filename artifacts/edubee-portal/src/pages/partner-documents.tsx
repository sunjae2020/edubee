import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderOpen, FileText, Search } from "lucide-react";
import { format } from "date-fns";

function contractStatusStyle(s: string | null | undefined) {
  const v = (s ?? "").toLowerCase();
  if (v === "active" || v === "confirmed") return { background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0" };
  if (v === "draft") return { background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE" };
  if (v === "cancelled") return { background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" };
  return { background: "#FFFBEB", color: "#D97706", border: "1px solid #FDE68A" };
}

interface Booking {
  id: string;
  contractId: string | null;
  name: string | null;
  serviceModuleType: string | null;
  apAmount: string | null;
  contractNumber: string | null;
  studentName: string | null;
  clientEmail: string | null;
  courseStartDate: string | null;
  courseEndDate: string | null;
  contractStatus: string | null;
  agentName: string | null;
  packageName: string | null;
  createdAt: string | null;
}

export default function PartnerDocumentsPage() {
  const [search, setSearch] = useState("");

  const { data: bookings = [], isLoading, error } = useQuery({
    queryKey: ["portal-partner-bookings"],
    queryFn: () => api.get<{ data: Booking[] }>("/portal/partner/bookings").then(r => r.data),
  });

  // De-duplicate by contractId to show one entry per contract
  const byContract = bookings.reduce<Record<string, Booking & { items: Booking[] }>>((acc, b) => {
    const key = b.contractId ?? b.id;
    if (!acc[key]) acc[key] = { ...b, items: [] };
    acc[key].items.push(b);
    return acc;
  }, {});

  const contracts = Object.values(byContract).filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.contractNumber?.toLowerCase().includes(q) ||
      c.studentName?.toLowerCase().includes(q) ||
      c.packageName?.toLowerCase().includes(q);
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Search */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm" style={{ color: "#A8A29E" }}>
          {Object.keys(byContract).length} contract{Object.keys(byContract).length !== 1 ? "s" : ""}
        </p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#A8A29E" }} />
          <input
            className="h-9 pl-9 pr-3 rounded-lg border text-sm outline-none w-64"
            style={{ borderColor: "#E8E6E2", background: "#FFFFFF", color: "#1C1917" }}
            placeholder="Search contract or student..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load documents. Please try again.
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl p-5 border" style={{ background: "#FFFFFF", borderColor: "#E8E6E2" }}>
              <Skeleton className="h-4 w-48 mb-2" /><Skeleton className="h-3 w-64" />
            </div>
          ))}
        </div>
      ) : contracts.length === 0 ? (
        <div className="text-center py-16 rounded-xl border" style={{ background: "#FFFFFF", borderColor: "#E8E6E2" }}>
          <FolderOpen className="w-10 h-10 mx-auto mb-3" style={{ color: "#D1CFC8" }} />
          <p className="text-sm font-medium" style={{ color: "#1C1917" }}>No contracts found</p>
          <p className="text-xs mt-1" style={{ color: "#A8A29E" }}>Contracts related to your services will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contracts.map((c, idx) => (
            <div key={idx} className="rounded-xl border p-5 transition-all"
              style={{ background: "#FFFFFF", borderColor: "#E8E6E2", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#FEF0E3" }}>
                    <FileText size={16} style={{ color: "#F5821F" }} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="font-semibold" style={{ color: "#1C1917" }}>
                        {c.packageName ?? c.contractNumber ?? "Contract"}
                      </p>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize" style={contractStatusStyle(c.contractStatus)}>
                        {c.contractStatus ?? "pending"}
                      </span>
                    </div>
                    <div className="flex gap-2 text-xs flex-wrap" style={{ color: "#A8A29E" }}>
                      {c.contractNumber && <span>{c.contractNumber}</span>}
                      {c.studentName && <span>· {c.studentName}</span>}
                      {c.agentName && <span>· Agent: {c.agentName}</span>}
                    </div>
                    <div className="mt-2 flex gap-2 flex-wrap">
                      {c.items.map(item => (
                        <span key={item.id} className="text-xs px-2 py-0.5 rounded-md capitalize"
                          style={{ background: "#F4F3F1", color: "#57534E" }}>
                          {item.name ?? item.serviceModuleType ?? "item"}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {c.courseStartDate && (
                    <p className="text-xs" style={{ color: "#57534E" }}>
                      {format(new Date(c.courseStartDate), "dd MMM yyyy")}
                      {c.courseEndDate && ` – ${format(new Date(c.courseEndDate), "dd MMM yyyy")}`}
                    </p>
                  )}
                  {c.createdAt && (
                    <p className="text-xs mt-0.5" style={{ color: "#A8A29E" }}>
                      Created {format(new Date(c.createdAt), "dd MMM yyyy")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
