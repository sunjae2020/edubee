import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderOpen, FileText, Search, ExternalLink } from "lucide-react";
import { format } from "date-fns";

function statusStyle(s: string | null | undefined) {
  const v = (s ?? "").toLowerCase();
  if (v === "active" || v === "confirmed") return { background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0" };
  if (v === "draft") return { background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE" };
  if (v === "cancelled" || v === "expired") return { background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" };
  return { background: "#FFFBEB", color: "#D97706", border: "1px solid #FDE68A" };
}

interface Program {
  id: string;
  contractNumber: string | null;
  status: string | null;
  totalAmount: string | null;
  paidAmount: string | null;
  balanceAmount: string | null;
  courseStartDate: string | null;
  courseEndDate: string | null;
  packageName: string | null;
  packageGroupName: string | null;
  agentName: string | null;
  studentName: string | null;
  signedAt: string | null;
  createdAt: string | null;
}

export default function StudentDocumentsPage() {
  const [search, setSearch] = useState("");

  const { data: programs = [], isLoading, error } = useQuery({
    queryKey: ["portal-student-programs"],
    queryFn: () => api.get<{ data: Program[] }>("/portal/student/programs").then(r => r.data),
  });

  const signed   = programs.filter(p => p.signedAt);
  const filtered = programs.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.packageName?.toLowerCase().includes(q) || p.contractNumber?.toLowerCase().includes(q);
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* KPI + search */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-4 text-sm" style={{ color: "#A8A29E" }}>
          <span>{programs.length} document{programs.length !== 1 ? "s" : ""}</span>
          <span>·</span>
          <span style={{ color: "#16A34A" }}>{signed.length} signed</span>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#A8A29E" }} />
          <input
            className="h-9 pl-9 pr-3 rounded-lg border text-sm outline-none w-56"
            style={{ borderColor: "#E8E6E2", background: "#FFFFFF", color: "#1C1917" }}
            placeholder="Search documents..."
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
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl p-5 border" style={{ background: "#FFFFFF", borderColor: "#E8E6E2" }}>
              <Skeleton className="h-5 w-48 mb-3" /><Skeleton className="h-3 w-64" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-xl border" style={{ background: "#FFFFFF", borderColor: "#E8E6E2" }}>
          <FolderOpen className="w-10 h-10 mx-auto mb-3" style={{ color: "#D1CFC8" }} />
          <p className="text-sm font-medium" style={{ color: "#1C1917" }}>No documents yet</p>
          <p className="text-xs mt-1" style={{ color: "#A8A29E" }}>Your enrolment contracts and agreements will appear here once confirmed.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => (
            <div key={p.id} className="rounded-xl border p-5 transition-all"
              style={{ background: "#FFFFFF", borderColor: "#E8E6E2", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div className="flex items-start gap-4 justify-between flex-wrap">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "#FEF0E3" }}>
                    <FileText size={18} style={{ color: "#F5821F" }} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="font-semibold" style={{ color: "#1C1917" }}>
                        {p.packageName ?? p.packageGroupName ?? "Enrolment Contract"}
                      </p>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize" style={statusStyle(p.status)}>
                        {p.status ?? "pending"}
                      </span>
                    </div>
                    <div className="flex gap-2 text-xs flex-wrap" style={{ color: "#A8A29E" }}>
                      {p.contractNumber && <span>{p.contractNumber}</span>}
                      {p.agentName && <span>· Agent: {p.agentName}</span>}
                    </div>
                    {(p.courseStartDate || p.courseEndDate) && (
                      <p className="text-xs mt-1" style={{ color: "#57534E" }}>
                        {p.courseStartDate && format(new Date(p.courseStartDate), "dd MMM yyyy")}
                        {p.courseEndDate && ` – ${format(new Date(p.courseEndDate), "dd MMM yyyy")}`}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  {p.signedAt ? (
                    <p className="text-xs font-medium" style={{ color: "#16A34A" }}>
                      ✓ Signed {format(new Date(p.signedAt), "dd MMM yyyy")}
                    </p>
                  ) : (
                    <p className="text-xs" style={{ color: "#A8A29E" }}>Awaiting signature</p>
                  )}
                  <button
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                    style={{ background: "#FEF0E3", color: "#F5821F" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#FDE0C5")}
                    onMouseLeave={e => (e.currentTarget.style.background = "#FEF0E3")}
                    title="Document download coming soon"
                    disabled
                  >
                    <ExternalLink size={12} />
                    View
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
