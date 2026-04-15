import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, MessageSquare } from "lucide-react";
import { format } from "date-fns";

function statusStyle(s: string | null | undefined) {
  const v = (s ?? "").toLowerCase();
  if (v === "accepted") return { background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0" };
  if (v === "sent") return { background: "#FFFBEB", color: "#D97706", border: "1px solid #FDE68A" };
  if (v === "draft") return { background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE" };
  if (v === "cancelled" || v === "rejected" || v === "expired") return { background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" };
  return { background: "#F4F3F1", color: "#57534E", border: "1px solid #E8E6E2" };
}

function stepLabel(status: string | null | undefined) {
  const v = (status ?? "").toLowerCase();
  if (v === "draft") return "Enquiry received";
  if (v === "sent") return "Quote prepared";
  if (v === "accepted") return "Accepted — moving to enrolment";
  if (v === "cancelled") return "Cancelled";
  if (v === "rejected") return "Not proceeding";
  if (v === "expired") return "Quote expired";
  return "In progress";
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

export default function StudentConsultationsPage() {
  const { data: quotes = [], isLoading, error } = useQuery({
    queryKey: ["portal-student-quotes"],
    queryFn: () => api.get<{ data: Quote[] }>("/portal/student/quotes").then(r => r.data),
  });

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-2 text-sm" style={{ color: "#A8A29E" }}>
        <MessageSquare size={14} />
        <span>{quotes.length} consultation{quotes.length !== 1 ? "s" : ""}</span>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load consultations. Please try again.
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl p-5 border" style={{ background: "#FFFFFF", borderColor: "#E8E6E2" }}>
              <Skeleton className="h-4 w-40 mb-2" /><Skeleton className="h-3 w-56" />
            </div>
          ))}
        </div>
      ) : quotes.length === 0 ? (
        <div className="text-center py-16 rounded-xl border" style={{ background: "#FFFFFF", borderColor: "#E8E6E2" }}>
          <Users className="w-10 h-10 mx-auto mb-3" style={{ color: "#D1CFC8" }} />
          <p className="text-sm font-medium" style={{ color: "#1C1917" }}>No consultations yet</p>
          <p className="text-xs mt-1" style={{ color: "#A8A29E" }}>Your consultation history with your agent will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {quotes.map((q, idx) => (
            <div key={q.id} className="rounded-xl border p-5 transition-all"
              style={{ background: "#FFFFFF", borderColor: "#E8E6E2", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3">
                  {/* Step number */}
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                    style={{ background: "var(--e-orange-lt)", color: "var(--e-orange)" }}>
                    {idx + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="font-semibold" style={{ color: "#1C1917" }}>
                        {q.quoteRefNumber ?? "Consultation"}
                      </p>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={statusStyle(q.quoteStatus)}>
                        {q.quoteStatus}
                      </span>
                    </div>
                    <p className="text-xs mb-1" style={{ color: "#57534E" }}>{stepLabel(q.quoteStatus)}</p>
                    <div className="flex gap-3 text-xs flex-wrap" style={{ color: "#A8A29E" }}>
                      {q.accountName && <span>Agent: {q.accountName}</span>}
                      <span>Started {format(new Date(q.createdOn), "dd MMM yyyy")}</span>
                      {q.expiryDate && <span>· Expires {format(new Date(q.expiryDate), "dd MMM yyyy")}</span>}
                    </div>
                  </div>
                </div>
                {q.totalValue > 0 && (
                  <p className="text-sm font-bold shrink-0" style={{ color: "#1C1917" }}>
                    {new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(q.totalValue)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
