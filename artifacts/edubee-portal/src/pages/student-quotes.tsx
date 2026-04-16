import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, BookOpen, ChevronRight } from "lucide-react";
import { format } from "date-fns";

const ORANGE = "#F5821F";

function fmt(n: number | string | null | undefined) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(Number(n ?? 0));
}

function quoteStatusStyle(status: string | null | undefined) {
  const s = (status ?? "").toLowerCase();
  if (s === "accepted") return { background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0" };
  if (s === "draft")    return { background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE" };
  if (s === "sent" || s === "revised") return { background: "#FFFBEB", color: "#D97706", border: "1px solid #FDE68A" };
  if (s === "cancelled" || s === "rejected" || s === "expired") return { background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" };
  return { background: "#F4F3F1", color: "#57534E", border: "1px solid #E8E6E2" };
}

function contractStatusStyle(s: string | null | undefined) {
  const v = (s ?? "").toLowerCase();
  if (v === "active" || v === "confirmed") return { background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0" };
  if (v === "draft")     return { background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE" };
  if (v === "cancelled") return { background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" };
  if (v === "completed") return { background: "#F4F3F1", color: "#57534E", border: "1px solid #E8E6E2" };
  return { background: "#FFFBEB", color: "#D97706", border: "1px solid #FDE68A" };
}

interface Quote {
  id: string;
  quoteRefNumber: string | null;
  quoteStatus: string;
  customerName: string | null;
  agentName: string | null;
  expiryDate: string | null;
  createdOn: string;
  productCount: number;
  totalValue: number;
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
  agentName: string | null;
  signedAt: string | null;
  createdAt: string | null;
}

function SectionHeader({ icon, title, count }: { icon: React.ReactNode; title: string; count: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="flex items-center gap-1.5" style={{ color: "#57534E" }}>
        {icon}
        <h2 className="font-semibold text-sm">{title}</h2>
      </div>
      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
        style={{ background: "#FEF0E3", color: ORANGE }}>
        {count}
      </span>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl p-5 border" style={{ background: "#FFFFFF", borderColor: "#E8E6E2" }}>
      <div className="flex justify-between mb-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-3 w-56" />
    </div>
  );
}

export default function StudentQuotesPage() {
  const [, navigate] = useLocation();

  const { data: quotes = [], isLoading: qLoading } = useQuery({
    queryKey: ["portal-student-quotes"],
    queryFn: () => api.get<{ data: Quote[] }>("/portal/student/quotes").then(r => r.data),
  });

  const { data: contracts = [], isLoading: cLoading } = useQuery({
    queryKey: ["portal-student-programs"],
    queryFn: () => api.get<{ data: Contract[] }>("/portal/student/programs").then(r => r.data),
  });

  const isLoading = qLoading || cLoading;

  const activeQuotes   = quotes.filter(q => !["accepted"].includes((q.quoteStatus ?? "").toLowerCase()));
  const acceptedQuotes = quotes.filter(q => (q.quoteStatus ?? "").toLowerCase() === "accepted");

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">

      {/* ── Quotes Section ───────────────────────────────────────── */}
      <div>
        <SectionHeader
          icon={<FileText size={15} />}
          title="My Quotes"
          count={isLoading ? 0 : activeQuotes.length + acceptedQuotes.length}
        />
        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} />)}</div>
        ) : quotes.length === 0 ? (
          <div className="text-center py-12 rounded-xl border" style={{ background: "#FFFFFF", borderColor: "#E8E6E2" }}>
            <FileText className="h-8 w-8 mx-auto mb-2" style={{ color: "#D1CFC8" }} />
            <p className="text-sm font-semibold" style={{ color: "#1C1917" }}>No quotes yet</p>
            <p className="text-xs mt-1" style={{ color: "#A8A29E" }}>Your quotes will appear here once your agent creates them.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {quotes.map(q => (
              <div key={q.id}
                className="rounded-xl p-5 border transition-all"
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
                        style={quoteStatusStyle(q.quoteStatus)}>
                        {q.quoteStatus}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap text-xs" style={{ color: "#A8A29E" }}>
                      {q.agentName && <span>Agent: {q.agentName}</span>}
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

      {/* ── Contracts Section ─────────────────────────────────────── */}
      <div>
        <SectionHeader
          icon={<BookOpen size={15} />}
          title="My Contracts"
          count={isLoading ? 0 : contracts.length}
        />
        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} />)}</div>
        ) : contracts.length === 0 ? (
          <div className="text-center py-12 rounded-xl border" style={{ background: "#FFFFFF", borderColor: "#E8E6E2" }}>
            <BookOpen className="h-8 w-8 mx-auto mb-2" style={{ color: "#D1CFC8" }} />
            <p className="text-sm font-semibold" style={{ color: "#1C1917" }}>No contracts yet</p>
            <p className="text-xs mt-1" style={{ color: "#A8A29E" }}>Signed contracts will appear here once confirmed.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {contracts.map(c => (
              <div key={c.id}
                className="rounded-xl p-5 border transition-all"
                style={{ background: "#FFFFFF", borderColor: "#E8E6E2", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", cursor: "pointer" }}
                onClick={() => navigate(`/student/services/${c.id}`)}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#F5821F40"; (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(245,130,31,0.08)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#E8E6E2"; (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; }}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-semibold" style={{ color: "#1C1917" }}>
                        {c.packageName ?? c.packageGroupName ?? "Contract"}
                      </p>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize"
                        style={contractStatusStyle(c.status)}>
                        {c.status ?? "pending"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs flex-wrap" style={{ color: "#A8A29E" }}>
                      {c.contractNumber && <span>{c.contractNumber}</span>}
                      {c.agentName && <span>Agent: {c.agentName}</span>}
                      {c.courseStartDate && <span>{format(new Date(c.courseStartDate), "dd MMM yyyy")}</span>}
                      {c.courseEndDate && <span>→ {format(new Date(c.courseEndDate), "dd MMM yyyy")}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      {Number(c.balanceAmount ?? 0) > 0 && (
                        <p className="text-xs" style={{ color: "#D97706" }}>Balance: {fmt(c.balanceAmount)}</p>
                      )}
                      <p className="text-lg font-bold mt-0.5" style={{ color: "#1C1917" }}>{fmt(c.totalAmount)}</p>
                    </div>
                    <ChevronRight size={16} style={{ color: "#A8A29E" }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
