import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Search, CheckCircle, Clock, ChevronRight, DollarSign } from "lucide-react";
import { format } from "date-fns";

const ORANGE = "#F5821F";

function fmt(n: number | string | null | undefined) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(Number(n ?? 0));
}

function statusStyle(s: string | null | undefined) {
  const v = (s ?? "").toLowerCase();
  if (v === "active" || v === "confirmed") return { background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0" };
  if (v === "draft")     return { background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE" };
  if (v === "cancelled") return { background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" };
  if (v === "completed") return { background: "#F4F3F1", color: "#57534E", border: "1px solid #E8E6E2" };
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
  agentName: string | null;
  signedAt: string | null;
  createdAt: string | null;
}

function fmt_date(d: string | null | undefined) {
  if (!d) return null;
  try { return format(new Date(d), "dd MMM yyyy"); } catch { return null; }
}

export default function AgentContractsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: contracts = [], isLoading, error } = useQuery({
    queryKey: ["portal-agent-contracts"],
    queryFn: () => api.get<{ data: Contract[] }>("/portal/agent/contracts").then(r => r.data),
  });

  const active    = contracts.filter(c => c.status?.toLowerCase() === "active");
  const completed = contracts.filter(c => c.status?.toLowerCase() === "completed");

  const totalValue = contracts.reduce((sum, c) => sum + Number(c.totalAmount ?? 0), 0);

  const statuses = [...new Set(contracts.map(c => c.status).filter((s): s is string => !!s))];

  const filtered = contracts.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      c.contractNumber?.toLowerCase().includes(q) ||
      c.studentName?.toLowerCase().includes(q) ||
      c.packageName?.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || (c.status ?? "").toLowerCase() === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Contracts", value: contracts.length,  icon: BookOpen,     color: ORANGE,     bg: "#FEF0E3" },
          { label: "Active",          value: active.length,     icon: CheckCircle,  color: "#16A34A",  bg: "#F0FDF4" },
          { label: "Total Value",     value: fmt(totalValue),   icon: DollarSign,   color: "#2563EB",  bg: "#EFF6FF" },
        ].map(c => (
          <div key={c.label} className="rounded-xl p-5 border"
            style={{ background: "#FFFFFF", borderColor: "#E8E6E2", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#A8A29E" }}>{c.label}</p>
                {isLoading
                  ? <Skeleton className="h-7 w-20 mt-1" />
                  : <p className="text-2xl font-bold mt-1" style={{ color: "#1C1917" }}>{c.value}</p>
                }
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: c.bg }}>
                <c.icon size={18} style={{ color: c.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#A8A29E" }} />
          <input
            className="h-9 pl-9 pr-3 rounded-lg border text-sm outline-none w-full"
            style={{ borderColor: "#E8E6E2", background: "#FFFFFF", color: "#1C1917" }}
            placeholder="Search by student, ref, package..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["all", ...statuses].map(s => (
            <button key={s}
              className="text-xs px-3 py-1.5 rounded-lg border font-medium capitalize transition-colors"
              style={statusFilter === s
                ? { background: ORANGE, color: "#FFFFFF", borderColor: ORANGE }
                : { background: "#FFFFFF", color: "#57534E", borderColor: "#E8E6E2" }
              }
              onClick={() => setStatusFilter(s)}>
              {s === "all" ? "All" : s}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load contracts.
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl p-5 border" style={{ background: "#FFFFFF", borderColor: "#E8E6E2" }}>
              <div className="flex justify-between mb-3"><Skeleton className="h-4 w-40" /><Skeleton className="h-4 w-20" /></div>
              <Skeleton className="h-3 w-56" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-xl border" style={{ background: "#FFFFFF", borderColor: "#E8E6E2" }}>
          <BookOpen className="w-10 h-10 mx-auto mb-3" style={{ color: "#D1CFC8" }} />
          <p className="text-sm font-medium" style={{ color: "#1C1917" }}>No contracts found</p>
          <p className="text-xs mt-1" style={{ color: "#A8A29E" }}>Contracts linked to your quotes will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => (
            <div key={c.id}
              className="rounded-xl p-5 border"
              style={{ background: "#FFFFFF", borderColor: "#E8E6E2", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "#FEF0E3" }}>
                    <BookOpen size={18} style={{ color: ORANGE }} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-semibold" style={{ color: "#1C1917" }}>
                        {c.packageName ?? c.packageGroupName ?? "Contract"}
                      </p>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize"
                        style={statusStyle(c.status)}>
                        {c.status ?? "pending"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs flex-wrap" style={{ color: "#A8A29E" }}>
                      {c.contractNumber && <span className="font-medium" style={{ color: "#57534E" }}>{c.contractNumber}</span>}
                      {c.studentName && <span>· {c.studentName}</span>}
                      {c.courseStartDate && <span>· {fmt_date(c.courseStartDate)}</span>}
                      {c.courseEndDate && <span>→ {fmt_date(c.courseEndDate)}</span>}
                      {c.signedAt && <span className="font-medium" style={{ color: "#16A34A" }}>· ✓ Signed</span>}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {Number(c.balanceAmount ?? 0) > 0 && (
                    <p className="text-xs" style={{ color: "#D97706" }}>Balance: {fmt(c.balanceAmount)}</p>
                  )}
                  <p className="text-lg font-bold" style={{ color: "#1C1917" }}>{fmt(c.totalAmount)}</p>
                  {c.paidAmount && Number(c.paidAmount) > 0 && (
                    <p className="text-xs" style={{ color: "#16A34A" }}>Paid: {fmt(c.paidAmount)}</p>
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
