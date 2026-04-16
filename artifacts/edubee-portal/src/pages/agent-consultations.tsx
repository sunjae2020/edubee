import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Search, UserPlus, Clock, CheckCircle, TrendingUp, ChevronRight, Mail, Phone, Globe } from "lucide-react";
import { format } from "date-fns";

interface Lead {
  id: string;
  leadRefNumber: string | null;
  status: string | null;
  fullName: string;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  source: string | null;
  inquiryType: string | null;
  budget: string | null;
  expectedStartDate: string | null;
  notes: string | null;
  createdAt: string;
}

function statusStyle(status: string | null | undefined) {
  const s = (status ?? "").toLowerCase();
  if (s === "qualified") return { background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0" };
  if (s === "proposal")  return { background: "#FFFBEB", color: "#D97706", border: "1px solid #FDE68A" };
  if (s === "new")       return { background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE" };
  if (s === "converted") return { background: "var(--e-orange-lt)", color: "var(--e-orange)", border: "1px solid #F5821F44" };
  if (s === "lost" || s === "inactive") return { background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" };
  return { background: "#F4F3F1", color: "#57534E", border: "1px solid #E8E6E2" };
}

function statusLabel(status: string | null | undefined) {
  const s = (status ?? "").toLowerCase();
  if (s === "new") return "New";
  if (s === "qualified") return "Qualified";
  if (s === "proposal") return "Proposal";
  if (s === "converted") return "Converted";
  if (s === "lost") return "Lost";
  return status ?? "Unknown";
}

export default function AgentConsultationsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [, navigate] = useLocation();

  const { data: leads = [], isLoading, error } = useQuery({
    queryKey: ["portal-agent-leads"],
    queryFn: () => api.get<{ data: Lead[] }>("/portal/leads").then(r => r.data),
  });

  const statuses = Array.from(new Set(leads.map(l => l.status ?? "unknown")));

  const filtered = leads.filter(l => {
    const matchSearch = !search ||
      l.fullName.toLowerCase().includes(search.toLowerCase()) ||
      l.email?.toLowerCase().includes(search.toLowerCase()) ||
      l.leadRefNumber?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || (l.status ?? "").toLowerCase() === statusFilter;
    return matchSearch && matchStatus;
  });

  const newCount       = leads.filter(l => l.status === "new").length;
  const qualifiedCount = leads.filter(l => l.status === "qualified").length;
  const proposalCount  = leads.filter(l => l.status === "proposal").length;

  if (isLoading) return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
    </div>
  );

  if (error) return (
    <div className="rounded-xl p-6 text-center" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
      <p className="text-sm font-medium" style={{ color: "#DC2626" }}>Failed to load leads</p>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "New Enquiries", value: newCount,       icon: UserPlus,      color: "#2563EB", bg: "#EFF6FF" },
          { label: "Qualified",     value: qualifiedCount, icon: CheckCircle,   color: "#16A34A", bg: "#F0FDF4" },
          { label: "Proposal Sent", value: proposalCount,  icon: TrendingUp,    color: "#D97706", bg: "#FFFBEB" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-xl p-4 flex flex-col gap-1" style={{ background: "#FFFFFF", border: "1px solid var(--e-border)" }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-1" style={{ background: bg }}>
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <span className="text-2xl font-bold" style={{ color: "var(--e-text-1)" }}>{value}</span>
            <span className="text-xs" style={{ color: "var(--e-text-3)" }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--e-text-3)" }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, or lead ref…"
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2"
            style={{
              background: "#FFFFFF",
              border: "1px solid var(--e-border)",
              color: "var(--e-text-1)",
            }}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["all", ...statuses].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={statusFilter === s
                ? { background: "var(--e-orange)", color: "#FFFFFF" }
                : { background: "#F4F3F1", color: "var(--e-text-2)", border: "1px solid var(--e-border)" }
              }
            >
              {s === "all" ? `All (${leads.length})` : statusLabel(s)}
            </button>
          ))}
        </div>
      </div>

      {/* Lead list */}
      {filtered.length === 0 ? (
        <div className="rounded-xl p-10 text-center" style={{ background: "#FFFFFF", border: "1px solid var(--e-border)" }}>
          <Users className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--e-text-3)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--e-text-1)" }}>
            {leads.length === 0 ? "No leads yet" : "No leads match your search"}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--e-text-3)" }}>
            {leads.length === 0 ? "New enquiries will appear here" : "Try adjusting your filters"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(lead => {
            const ss = statusStyle(lead.status);
            return (
              <div
                key={lead.id}
                onClick={() => navigate(`/leads/${lead.id}`)}
                className="rounded-xl p-4 cursor-pointer transition-all group"
                style={{ background: "#FFFFFF", border: "1px solid var(--e-border)" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--e-orange)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--e-border)")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Avatar */}
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                      style={{ background: "var(--e-orange-lt)", color: "var(--e-orange)" }}
                    >
                      {lead.fullName.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm" style={{ color: "var(--e-text-1)" }}>
                          {lead.fullName}
                        </span>
                        {lead.leadRefNumber && (
                          <span className="text-xs font-mono" style={{ color: "var(--e-text-3)" }}>
                            {lead.leadRefNumber}
                          </span>
                        )}
                        <span
                          className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                          style={ss}
                        >
                          {statusLabel(lead.status)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {lead.email && (
                          <span className="flex items-center gap-1 text-xs" style={{ color: "var(--e-text-3)" }}>
                            <Mail className="w-3 h-3" />{lead.email}
                          </span>
                        )}
                        {lead.phone && (
                          <span className="flex items-center gap-1 text-xs" style={{ color: "var(--e-text-3)" }}>
                            <Phone className="w-3 h-3" />{lead.phone}
                          </span>
                        )}
                        {lead.nationality && (
                          <span className="flex items-center gap-1 text-xs" style={{ color: "var(--e-text-3)" }}>
                            <Globe className="w-3 h-3" />{lead.nationality}
                          </span>
                        )}
                      </div>
                      {lead.notes && (
                        <p className="text-xs mt-1.5 line-clamp-1" style={{ color: "var(--e-text-2)" }}>
                          {lead.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right hidden sm:block">
                      {lead.source && (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md" style={{ background: "#F4F3F1", color: "var(--e-text-2)" }}>
                          {lead.source}
                        </span>
                      )}
                      <p className="text-[11px] mt-1" style={{ color: "var(--e-text-3)" }}>
                        {format(new Date(lead.createdAt), "d MMM yyyy")}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--e-orange)" }} />
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
