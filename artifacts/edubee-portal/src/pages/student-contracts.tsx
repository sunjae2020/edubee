import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, ChevronRight, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";

const ORANGE = "var(--e-orange)";

function fmt(n: number | string | null | undefined) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(Number(n ?? 0));
}

function statusStyle(s: string | null | undefined) {
  const v = (s ?? "").toLowerCase();
  if (v === "active" || v === "confirmed") return { background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0" };
  if (v === "draft")     return { background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE" };
  if (v === "cancelled") return { background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" };
  if (v === "completed") return { background: "var(--e-bg-muted)", color: "var(--e-text-2)", border: "1px solid #E8E6E2" };
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
  agentName: string | null;
  signedAt: string | null;
  createdAt: string | null;
}

function fmt_date(d: string | null | undefined) {
  if (!d) return null;
  try { return format(new Date(d), "dd MMM yyyy"); } catch { return null; }
}

export default function StudentContractsPage() {
  const [, navigate] = useLocation();

  const { data: contracts = [], isLoading, error } = useQuery({
    queryKey: ["portal-student-programs"],
    queryFn: () => api.get<{ data: Contract[] }>("/portal/student/programs").then(r => r.data),
  });

  const active    = contracts.filter(c => c.status?.toLowerCase() === "active");
  const pending   = contracts.filter(c => !["active", "completed", "cancelled"].includes((c.status ?? "").toLowerCase()));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Contracts", value: contracts.length, icon: BookOpen,    color: ORANGE,    bg: "var(--e-orange-lt)" },
          { label: "Active",          value: active.length,    icon: CheckCircle, color: "#16A34A", bg: "#F0FDF4" },
          { label: "Pending",         value: pending.length,   icon: Clock,       color: "#D97706", bg: "#FFFBEB" },
        ].map(c => (
          <div key={c.label} className="rounded-xl p-5 border"
            style={{ background: "var(--e-bg-surface)", borderColor: "var(--e-border)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--e-text-3)" }}>{c.label}</p>
                {isLoading
                  ? <Skeleton className="h-7 w-12 mt-1" />
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

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load contracts.
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl p-5 border" style={{ background: "var(--e-bg-surface)", borderColor: "var(--e-border)" }}>
              <div className="flex justify-between mb-3"><Skeleton className="h-4 w-40" /><Skeleton className="h-4 w-20" /></div>
              <Skeleton className="h-3 w-56" />
            </div>
          ))}
        </div>
      ) : contracts.length === 0 ? (
        <div className="text-center py-16 rounded-xl border" style={{ background: "var(--e-bg-surface)", borderColor: "var(--e-border)" }}>
          <BookOpen className="h-10 w-10 mx-auto mb-3" style={{ color: "#D1CFC8" }} />
          <p className="text-sm font-semibold" style={{ color: "var(--e-text-1)" }}>No contracts yet</p>
          <p className="text-xs mt-1" style={{ color: "var(--e-text-3)" }}>Signed contracts will appear here once confirmed.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contracts.map(c => (
            <div key={c.id}
              className="rounded-xl p-5 border transition-all"
              style={{ background: "var(--e-bg-surface)", borderColor: "var(--e-border)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", cursor: "pointer" }}
              onClick={() => navigate(`/student/services/${c.id}`)}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in srgb, var(--e-orange) 25%, transparent)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px color-mix(in srgb, var(--e-orange) 8%, transparent)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--e-border)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)";
              }}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "var(--e-orange-lt)" }}>
                    <BookOpen size={18} style={{ color: ORANGE }} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-semibold" style={{ color: "var(--e-text-1)" }}>
                        {c.packageName ?? c.packageGroupName ?? "Contract"}
                      </p>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize"
                        style={statusStyle(c.status)}>
                        {c.status ?? "pending"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs flex-wrap" style={{ color: "var(--e-text-3)" }}>
                      {c.contractNumber && <span className="font-medium" style={{ color: "var(--e-text-2)" }}>{c.contractNumber}</span>}
                      {c.agentName && <span>· Agent: {c.agentName}</span>}
                      {c.courseStartDate && <span>· {fmt_date(c.courseStartDate)}</span>}
                      {c.courseEndDate && <span>→ {fmt_date(c.courseEndDate)}</span>}
                      {c.signedAt && <span className="font-medium" style={{ color: "#16A34A" }}>· ✓ Signed</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    {Number(c.balanceAmount ?? 0) > 0 && (
                      <p className="text-xs" style={{ color: "#D97706" }}>Balance: {fmt(c.balanceAmount)}</p>
                    )}
                    <p className="text-lg font-bold" style={{ color: "var(--e-text-1)" }}>{fmt(c.totalAmount)}</p>
                  </div>
                  <ChevronRight size={16} style={{ color: "var(--e-text-3)" }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
