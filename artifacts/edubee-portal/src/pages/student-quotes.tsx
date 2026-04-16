import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, ChevronRight } from "lucide-react";
import { format } from "date-fns";

const ORANGE = "#F5821F";

function fmt(n: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);
}

function statusStyle(status: string | null | undefined) {
  const s = (status ?? "").toLowerCase();
  if (s === "accepted") return { background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0" };
  if (s === "draft") return { background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE" };
  if (s === "sent") return { background: "#FFFBEB", color: "#D97706", border: "1px solid #FDE68A" };
  if (s === "cancelled" || s === "rejected" || s === "expired") return { background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" };
  return { background: "#F4F3F1", color: "#57534E", border: "1px solid #E8E6E2" };
}

interface Quote {
  id: string;
  quoteRefNumber: string | null;
  quoteStatus: string;
  accountName: string | null;
  expiryDate: string | null;
  createdOn: string;
  productCount: number;
  totalValue: number;
}

export default function StudentQuotesPage() {
  const [, navigate] = useLocation();
  const { data: quotes = [], isLoading, error } = useQuery({
    queryKey: ["portal-student-quotes"],
    queryFn: () => api.get<{ data: Quote[] }>("/portal/student/quotes").then(r => r.data),
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#1C1917" }}>My Quotes</h1>
          <p className="text-sm mt-0.5" style={{ color: "#A8A29E" }}>Quotes prepared for you by your agent</p>
        </div>
        <div className="flex items-center gap-2 text-sm" style={{ color: "#A8A29E" }}>
          <FileText className="h-4 w-4" />
          <span>{quotes.length} quote{quotes.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 mb-4">
          Failed to load quotes. Please try again.
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl p-5 border" style={{ background: "#FFFFFF", borderColor: "#E8E6E2" }}>
              <div className="flex justify-between mb-3">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-3 w-56" />
            </div>
          ))}
        </div>
      ) : quotes.length === 0 ? (
        <div className="text-center py-20 rounded-xl border" style={{ background: "#FFFFFF", borderColor: "#E8E6E2" }}>
          <FileText className="h-10 w-10 mx-auto mb-3" style={{ color: "#D1CFC8" }} />
          <p className="text-sm font-semibold" style={{ color: "#1C1917" }}>No quotes yet</p>
          <p className="text-xs mt-1" style={{ color: "#A8A29E" }}>Your quotes will appear here once your agent creates them.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {quotes.map(q => (
            <div key={q.id} className="rounded-xl p-5 border transition-all"
              style={{ background: "#FFFFFF", borderColor: "#E8E6E2", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", cursor: "pointer" }}
              onClick={() => navigate(`/student/quotes/${q.id}`)}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#F5821F40"; (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(245,130,31,0.08)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#E8E6E2"; (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; }}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold" style={{ color: "#1C1917" }}>
                      {q.quoteRefNumber ?? "Quote"}
                    </p>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      style={statusStyle(q.quoteStatus)}>
                      {q.quoteStatus}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap text-xs" style={{ color: "#A8A29E" }}>
                    {q.accountName && <span>{q.accountName}</span>}
                    <span>Created {format(new Date(q.createdOn), "dd MMM yyyy")}</span>
                    {q.expiryDate && <span>Expires {format(new Date(q.expiryDate), "dd MMM yyyy")}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    {q.productCount > 0 && (
                      <p className="text-xs" style={{ color: "#A8A29E" }}>{q.productCount} item{q.productCount !== 1 ? "s" : ""}</p>
                    )}
                    {q.totalValue > 0 && (
                      <p className="text-lg font-bold mt-0.5" style={{ color: "#1C1917" }}>{fmt(q.totalValue)}</p>
                    )}
                  </div>
                  <ChevronRight size={16} style={{ color: "#A8A29E" }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
