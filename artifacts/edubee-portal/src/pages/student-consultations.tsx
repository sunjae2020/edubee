import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, ChevronRight } from "lucide-react";
import { format } from "date-fns";

function leadStatusStyle(s: string | null | undefined) {
  const v = (s ?? "").toLowerCase();
  if (v === "converted") return { background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0" };
  if (v === "proposal") return { background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE" };
  if (v === "qualified") return { background: "var(--e-orange-lt)", color: "#C2410C", border: "1px solid #FED7AA" };
  if (v === "lost") return { background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" };
  return { background: "#FFFBEB", color: "#D97706", border: "1px solid #FDE68A" };
}

function leadStatusLabel(s: string | null | undefined) {
  const v = (s ?? "").toLowerCase();
  if (v === "new") return "New Enquiry";
  if (v === "qualified") return "Qualified";
  if (v === "proposal") return "Proposal Stage";
  if (v === "converted") return "Enrolled";
  if (v === "lost") return "Not Proceeding";
  return s ?? "In Progress";
}

function stageDesc(s: string | null | undefined) {
  const v = (s ?? "").toLowerCase();
  if (v === "new") return "Your enquiry has been received and is being reviewed.";
  if (v === "qualified") return "Your agent has reviewed your enquiry and is preparing options.";
  if (v === "proposal") return "A proposal has been prepared for you. Please review and discuss with your agent.";
  if (v === "converted") return "Your consultation has been completed and your enrolment is confirmed.";
  if (v === "lost") return "This consultation has been closed.";
  return "Your agent will be in touch with the next steps.";
}

interface ConsultItem {
  id: string;
  quoteRefNumber: string | null;
  quoteStatus: string;
  agentName: string | null;
  createdOn: string;
  totalValue: number;
  leadRefNumber: string | null;
  leadStatus: string | null;
  leadFullName: string | null;
  leadNotes: string | null;
}

export default function StudentConsultationsPage() {
  const [, navigate] = useLocation();
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ["portal-student-quotes"],
    queryFn: () => api.get<{ data: ConsultItem[] }>("/portal/student/quotes").then(r => r.data),
  });

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-2 text-sm" style={{ color: "var(--e-text-3)" }}>
        <MessageSquare size={14} />
        <span>{items.length} consultation{items.length !== 1 ? "s" : ""}</span>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load consultations. Please try again.
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl p-5 border" style={{ background: "var(--e-bg-surface)", borderColor: "var(--e-border)" }}>
              <Skeleton className="h-4 w-40 mb-2" /><Skeleton className="h-3 w-56" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 rounded-xl border" style={{ background: "var(--e-bg-surface)", borderColor: "var(--e-border)" }}>
          <MessageSquare className="w-10 h-10 mx-auto mb-3" style={{ color: "#D1CFC8" }} />
          <p className="text-sm font-medium" style={{ color: "var(--e-text-1)" }}>No consultations yet</p>
          <p className="text-xs mt-1" style={{ color: "var(--e-text-3)" }}>Your consultation history with your agent will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, idx) => {
            const refNum = item.leadRefNumber ?? item.quoteRefNumber ?? `#${idx + 1}`;
            const status = item.leadStatus ?? item.quoteStatus;
            const desc   = stageDesc(item.leadStatus);
            return (
              <div key={item.id}
                className="rounded-xl border p-5 transition-all"
                style={{ background: "var(--e-bg-surface)", borderColor: "var(--e-border)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", cursor: "pointer" }}
                onClick={() => navigate(`/student/consultations/${item.id}`)}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in srgb, var(--e-orange) 25%, transparent)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px color-mix(in srgb, var(--e-orange) 8%, transparent)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--e-border)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; }}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                      style={{ background: "var(--e-orange-lt)", color: "var(--e-orange)" }}>
                      {idx + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="font-semibold" style={{ color: "var(--e-text-1)" }}>{refNum}</p>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                          style={leadStatusStyle(status)}>
                          {leadStatusLabel(status)}
                        </span>
                      </div>
                      <p className="text-xs mb-1" style={{ color: "var(--e-text-2)" }}>{desc}</p>
                      <div className="flex gap-3 text-xs flex-wrap" style={{ color: "var(--e-text-3)" }}>
                        {item.agentName && <span>Agent: {item.agentName}</span>}
                        <span>Started {format(new Date(item.createdOn), "dd MMM yyyy")}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.totalValue > 0 && (
                      <p className="text-sm font-bold" style={{ color: "var(--e-text-1)" }}>
                        {new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(item.totalValue)}
                      </p>
                    )}
                    <ChevronRight size={16} style={{ color: "var(--e-text-3)" }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
