import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Search, TrendingUp, Clock, CheckCircle, ChevronRight } from "lucide-react";
import { format } from "date-fns";

function fmt(n: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);
}

function statusStyle(status: string | null | undefined) {
  const s = (status ?? "").toLowerCase();
  if (s === "accepted") return { background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0" };
  if (s === "sent") return { background: "#FFFBEB", color: "#D97706", border: "1px solid #FDE68A" };
  if (s === "draft") return { background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE" };
  if (s === "cancelled" || s === "rejected" || s === "expired") return { background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" };
  return { background: "var(--e-bg-muted)", color: "var(--e-text-2)", border: "1px solid #E8E6E2" };
}

interface Quote {
  id: string;
  quoteRefNumber: string | null;
  quoteStatus: string;
  accountName: string | null;
  studentAccountId: string | null;
  expiryDate: string | null;
  createdOn: string;
}

export default function AgentQuotesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [, navigate] = useLocation();

  const { data: quotes = [], isLoading, error } = useQuery({
    queryKey: ["portal-agent-quotes"],
    queryFn: () => api.get<{ data: Quote[] }>("/portal/quotes").then(r => r.data),
  });

  const active   = quotes.filter(q => !["Cancelled", "Rejected", "Expired"].includes(q.quoteStatus));
  const accepted = quotes.filter(q => q.quoteStatus === "Accepted");

  const filtered = quotes.filter(q => {
    const matchSearch = !search ||
      q.quoteRefNumber?.toLowerCase().includes(search.toLowerCase()) ||
      q.accountName?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || q.quoteStatus.toLowerCase() === statusFilter;
    return matchSearch && matchStatus;
  });

  const statuses = [...new Set(quotes.map(q => q.quoteStatus))];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Quotes", value: quotes.length, icon: FileText, color: "var(--e-orange)", bg: "var(--e-orange-lt)" },
          { label: "Active",       value: active.length,   icon: Clock,      color: "#D97706", bg: "#FFFBEB" },
          { label: "Accepted",     value: accepted.length, icon: CheckCircle, color: "#16A34A", bg: "#F0FDF4" },
        ].map(c => (
          <div key={c.label} className="rounded-xl p-5 border" style={{ background: "var(--e-bg-surface)", borderColor: "var(--e-border)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--e-text-3)" }}>{c.label}</p>
                {isLoading
                  ? <Skeleton className="h-7 w-16 mt-1" />
                  : <p className="text-2xl font-bold mt-1" style={{ color: "var(--e-text-1)" }}>{c.value}</p>
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
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--e-text-3)" }} />
          <input
            className="w-full h-9 pl-9 pr-3 rounded-lg border text-sm outline-none"
            style={{ borderColor: "var(--e-border)", background: "var(--e-bg-surface)", color: "var(--e-text-1)" }}
            placeholder="Search by ref or student..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="h-9 px-3 rounded-lg border text-sm outline-none"
          style={{ borderColor: "var(--e-border)", background: "var(--e-bg-surface)", color: "var(--e-text-2)" }}
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          {statuses.map(s => <option key={s} value={s.toLowerCase()}>{s}</option>)}
        </select>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load quotes. Please try again.
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ background: "var(--e-bg-surface)", borderColor: "var(--e-border)" }}>
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-10 h-10 mx-auto mb-3" style={{ color: "#D1CFC8" }} />
            <p className="text-sm font-medium" style={{ color: "var(--e-text-1)" }}>No quotes found</p>
            <p className="text-xs mt-1" style={{ color: "var(--e-text-3)" }}>Quotes you create for students will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid #E8E6E2", background: "var(--e-bg-page)" }}>
                  {["Quote Ref", "Student / Agency", "Status", "Expiry Date", "Created"].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--e-text-3)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(q => (
                  <tr key={q.id} style={{ borderBottom: "1px solid #F4F3F1", cursor: "pointer" }}
                    onClick={() => navigate(`/quotes/${q.id}`)}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--e-bg-page)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "")}>
                    <td className="px-5 py-4 font-medium" style={{ color: "var(--e-text-1)" }}>
                      {q.quoteRefNumber ?? <span style={{ color: "var(--e-text-3)" }}>—</span>}
                    </td>
                    <td className="px-5 py-4" style={{ color: "var(--e-text-2)" }}>
                      {q.accountName ?? <span style={{ color: "var(--e-text-3)" }}>—</span>}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize" style={statusStyle(q.quoteStatus)}>
                        {q.quoteStatus}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm" style={{ color: "var(--e-text-2)" }}>
                      {q.expiryDate ? format(new Date(q.expiryDate), "dd MMM yyyy") : <span style={{ color: "var(--e-text-3)" }}>—</span>}
                    </td>
                    <td className="px-5 py-4 text-sm" style={{ color: "var(--e-text-3)" }}>
                      {format(new Date(q.createdOn), "dd MMM yyyy")}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <ChevronRight size={14} style={{ color: "var(--e-text-3)" }} />
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
