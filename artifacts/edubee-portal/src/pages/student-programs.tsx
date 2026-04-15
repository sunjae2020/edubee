import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen } from "lucide-react";
import { format } from "date-fns";

const ORANGE = "#F5821F";

function fmt(n: number | string | null | undefined) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 2 }).format(Number(n ?? 0));
}

function statusStyle(status: string | null | undefined) {
  const s = (status ?? "").toLowerCase();
  if (s === "active" || s === "confirmed") return { background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0" };
  if (s === "draft") return { background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE" };
  if (s === "cancelled") return { background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" };
  if (s === "completed") return { background: "#F4F3F1", color: "#57534E", border: "1px solid #E8E6E2" };
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

export default function StudentProgramsPage() {
  const { data: programs = [], isLoading, error } = useQuery({
    queryKey: ["portal-student-programs"],
    queryFn: () => api.get<{ data: Program[] }>("/portal/student/programs").then(r => r.data),
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#1C1917" }}>My Programs</h1>
          <p className="text-sm mt-0.5" style={{ color: "#A8A29E" }}>Your enrolled programs and payment details</p>
        </div>
        <div className="flex items-center gap-2 text-sm" style={{ color: "#A8A29E" }}>
          <BookOpen className="h-4 w-4" />
          <span>{programs.length} program{programs.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 mb-4">
          Failed to load programs. Please try again.
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl p-6 border" style={{ background: "#FFFFFF", borderColor: "#E8E6E2" }}>
              <Skeleton className="h-5 w-48 mb-3" />
              <Skeleton className="h-3 w-64 mb-2" />
              <Skeleton className="h-3 w-40" />
            </div>
          ))}
        </div>
      ) : programs.length === 0 ? (
        <div className="text-center py-20 rounded-xl border" style={{ background: "#FFFFFF", borderColor: "#E8E6E2" }}>
          <BookOpen className="h-10 w-10 mx-auto mb-3" style={{ color: "#D1CFC8" }} />
          <p className="text-sm font-semibold" style={{ color: "#1C1917" }}>No programs yet</p>
          <p className="text-xs mt-1" style={{ color: "#A8A29E" }}>Your enrolled programs will appear here once confirmed.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {programs.map(p => (
            <div key={p.id} className="rounded-xl p-6 border"
              style={{ background: "#FFFFFF", borderColor: "#E8E6E2", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-semibold text-base" style={{ color: "#1C1917" }}>
                      {p.packageName ?? p.packageGroupName ?? "Program"}
                    </p>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize"
                      style={statusStyle(p.status)}>
                      {p.status ?? "pending"}
                    </span>
                  </div>
                  {p.contractNumber && (
                    <p className="text-xs" style={{ color: "#A8A29E" }}>Contract: {p.contractNumber}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide font-medium mb-1" style={{ color: "#A8A29E" }}>Start Date</p>
                  <p className="text-sm font-medium" style={{ color: "#1C1917" }}>
                    {p.courseStartDate ? format(new Date(p.courseStartDate), "dd MMM yyyy") : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide font-medium mb-1" style={{ color: "#A8A29E" }}>End Date</p>
                  <p className="text-sm font-medium" style={{ color: "#1C1917" }}>
                    {p.courseEndDate ? format(new Date(p.courseEndDate), "dd MMM yyyy") : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide font-medium mb-1" style={{ color: "#A8A29E" }}>Total Amount</p>
                  <p className="text-sm font-bold" style={{ color: "#1C1917" }}>{fmt(p.totalAmount)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide font-medium mb-1" style={{ color: "#A8A29E" }}>Balance</p>
                  <p className="text-sm font-bold" style={{ color: Number(p.balanceAmount ?? 0) > 0 ? "#D97706" : "#16A34A" }}>
                    {fmt(p.balanceAmount)}
                  </p>
                </div>
              </div>

              {(p.agentName || p.signedAt) && (
                <div className="mt-4 pt-4 border-t flex items-center gap-4 text-xs" style={{ borderColor: "#F4F3F1", color: "#A8A29E" }}>
                  {p.agentName && <span>Agent: {p.agentName}</span>}
                  {p.signedAt && <span>Signed: {format(new Date(p.signedAt), "dd MMM yyyy")}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
