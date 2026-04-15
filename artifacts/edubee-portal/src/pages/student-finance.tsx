import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, DollarSign, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";

function fmt(n: number | string | null | undefined) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 2 }).format(Number(n ?? 0));
}

function balanceStyle(balance: string | null | undefined) {
  const v = Number(balance ?? 0);
  if (v <= 0) return { color: "#16A34A" };
  return { color: "#D97706" };
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
  signedAt: string | null;
}

export default function StudentFinancePage() {
  const { data: programs = [], isLoading, error } = useQuery({
    queryKey: ["portal-student-programs"],
    queryFn: () => api.get<{ data: Program[] }>("/portal/student/programs").then(r => r.data),
  });

  const totalFees   = programs.reduce((s, p) => s + Number(p.totalAmount ?? 0), 0);
  const totalPaid   = programs.reduce((s, p) => s + Number(p.paidAmount ?? 0), 0);
  const totalBalance = programs.reduce((s, p) => s + Number(p.balanceAmount ?? 0), 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Fees",    value: totalFees,    icon: DollarSign,  color: "#F5821F", bg: "#FEF0E3" },
          { label: "Total Paid",    value: totalPaid,    icon: CheckCircle, color: "#16A34A", bg: "#F0FDF4" },
          { label: "Balance Due",   value: totalBalance, icon: Clock,       color: totalBalance > 0 ? "#D97706" : "#16A34A", bg: totalBalance > 0 ? "#FFFBEB" : "#F0FDF4" },
        ].map(c => (
          <div key={c.label} className="rounded-xl p-5 border" style={{ background: "#FFFFFF", borderColor: "#E8E6E2", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#A8A29E" }}>{c.label}</p>
                {isLoading
                  ? <Skeleton className="h-7 w-28 mt-1" />
                  : <p className="text-xl font-bold mt-1" style={{ color: "#1C1917" }}>{fmt(c.value)}</p>
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
          Failed to load finance data. Please try again.
        </div>
      )}

      {/* Per-program breakdown */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl p-6 border" style={{ background: "#FFFFFF", borderColor: "#E8E6E2" }}>
              <Skeleton className="h-5 w-48 mb-3" /><Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
      ) : programs.length === 0 ? (
        <div className="text-center py-16 rounded-xl border" style={{ background: "#FFFFFF", borderColor: "#E8E6E2" }}>
          <Wallet className="w-10 h-10 mx-auto mb-3" style={{ color: "#D1CFC8" }} />
          <p className="text-sm font-medium" style={{ color: "#1C1917" }}>No payment records</p>
          <p className="text-xs mt-1" style={{ color: "#A8A29E" }}>Your fee and payment details will appear here once enrolled.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {programs.map(p => (
            <div key={p.id} className="rounded-xl border p-5" style={{ background: "#FFFFFF", borderColor: "#E8E6E2", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
                <div>
                  <p className="font-semibold" style={{ color: "#1C1917" }}>
                    {p.packageName ?? p.packageGroupName ?? "Program"}
                  </p>
                  <div className="flex gap-2 text-xs mt-0.5 flex-wrap" style={{ color: "#A8A29E" }}>
                    {p.contractNumber && <span>{p.contractNumber}</span>}
                    {p.courseStartDate && <span>· {format(new Date(p.courseStartDate), "dd MMM yyyy")}{p.courseEndDate && ` – ${format(new Date(p.courseEndDate), "dd MMM yyyy")}`}</span>}
                  </div>
                </div>
              </div>

              {/* Payment bar */}
              <div className="mb-3">
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "#F4F3F1" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      background: "#16A34A",
                      width: Number(p.totalAmount) > 0
                        ? `${Math.min(100, (Number(p.paidAmount ?? 0) / Number(p.totalAmount)) * 100)}%`
                        : "0%",
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs mt-1" style={{ color: "#A8A29E" }}>
                  <span>Paid: <strong style={{ color: "#16A34A" }}>{fmt(p.paidAmount)}</strong></span>
                  <span>Balance: <strong style={balanceStyle(p.balanceAmount)}>{fmt(p.balanceAmount)}</strong></span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-3" style={{ borderTop: "1px solid #F4F3F1" }}>
                <div>
                  <p className="text-xs uppercase tracking-wide font-medium" style={{ color: "#A8A29E" }}>Total Fees</p>
                  <p className="text-sm font-bold mt-0.5" style={{ color: "#1C1917" }}>{fmt(p.totalAmount)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide font-medium" style={{ color: "#A8A29E" }}>Paid</p>
                  <p className="text-sm font-bold mt-0.5" style={{ color: "#16A34A" }}>{fmt(p.paidAmount)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide font-medium" style={{ color: "#A8A29E" }}>Balance</p>
                  <p className="text-sm font-bold mt-0.5" style={balanceStyle(p.balanceAmount)}>{fmt(p.balanceAmount)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
