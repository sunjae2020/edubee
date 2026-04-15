import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderOpen, Search, FileCheck, FileText } from "lucide-react";
import { format } from "date-fns";

function fmt(n: number | string | null | undefined) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(n ?? 0));
}

function statusStyle(s: string | null | undefined) {
  const v = (s ?? "").toLowerCase();
  if (v === "active" || v === "confirmed") return { background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0" };
  if (v === "draft") return { background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE" };
  if (v === "cancelled" || v === "expired") return { background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" };
  return { background: "#FFFBEB", color: "#D97706", border: "1px solid #FDE68A" };
}

interface Contract {
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
  studentName: string | null;
  clientEmail: string | null;
  signedAt: string | null;
  createdAt: string | null;
}

export default function AgentDocumentsPage() {
  const [search, setSearch] = useState("");

  const { data: contracts = [], isLoading, error } = useQuery({
    queryKey: ["portal-agent-contracts"],
    queryFn: () => api.get<{ data: Contract[] }>("/portal/agent/contracts").then(r => r.data),
  });

  const signed   = contracts.filter(c => c.signedAt);
  const filtered = contracts.filter(c => {
    const q = search.toLowerCase();
    return !search ||
      c.contractNumber?.toLowerCase().includes(q) ||
      c.studentName?.toLowerCase().includes(q) ||
      c.packageName?.toLowerCase().includes(q);
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* KPI */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Contracts", value: contracts.length, icon: FolderOpen,  color: "#F5821F", bg: "#FEF0E3" },
          { label: "Signed",          value: signed.length,    icon: FileCheck,   color: "#16A34A", bg: "#F0FDF4" },
          { label: "Unsigned",        value: contracts.length - signed.length, icon: FileText, color: "#D97706", bg: "#FFFBEB" },
        ].map(c => (
          <div key={c.label} className="rounded-xl p-5 border" style={{ background: "#FFFFFF", borderColor: "#E8E6E2", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#A8A29E" }}>{c.label}</p>
                {isLoading ? <Skeleton className="h-7 w-12 mt-1" />
                  : <p className="text-2xl font-bold mt-1" style={{ color: "#1C1917" }}>{c.value}</p>}
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: c.bg }}>
                <c.icon size={18} style={{ color: c.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#A8A29E" }} />
        <input
          className="w-full h-9 pl-9 pr-3 rounded-lg border text-sm outline-none"
          style={{ borderColor: "#E8E6E2", background: "#FFFFFF", color: "#1C1917" }}
          placeholder="Search by contract #, student, or program..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
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
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-xl border" style={{ background: "#FFFFFF", borderColor: "#E8E6E2" }}>
          <FolderOpen className="w-10 h-10 mx-auto mb-3" style={{ color: "#D1CFC8" }} />
          <p className="text-sm font-medium" style={{ color: "#1C1917" }}>No documents found</p>
          <p className="text-xs mt-1" style={{ color: "#A8A29E" }}>Student contracts will appear here once created.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => (
            <div key={c.id} className="rounded-xl border p-5 transition-all"
              style={{ background: "#FFFFFF", borderColor: "#E8E6E2", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#FEF0E3" }}>
                    <FileText size={16} style={{ color: "#F5821F" }} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="font-semibold" style={{ color: "#1C1917" }}>
                        {c.packageName ?? c.packageGroupName ?? "Contract"}
                      </p>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize" style={statusStyle(c.status)}>
                        {c.status ?? "pending"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs flex-wrap" style={{ color: "#A8A29E" }}>
                      {c.contractNumber && <span>{c.contractNumber}</span>}
                      {c.studentName && <span>· {c.studentName}</span>}
                      {c.courseStartDate && (
                        <span>· {format(new Date(c.courseStartDate), "dd MMM yyyy")}
                          {c.courseEndDate && ` – ${format(new Date(c.courseEndDate), "dd MMM yyyy")}`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold" style={{ color: "#1C1917" }}>{fmt(c.totalAmount)}</p>
                  {c.signedAt ? (
                    <p className="text-xs mt-0.5" style={{ color: "#16A34A" }}>
                      Signed {format(new Date(c.signedAt), "dd MMM yyyy")}
                    </p>
                  ) : (
                    <p className="text-xs mt-0.5" style={{ color: "#A8A29E" }}>Not signed</p>
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
