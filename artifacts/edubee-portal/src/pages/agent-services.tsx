import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Search, DollarSign, Layers } from "lucide-react";
import { format } from "date-fns";

function fmt(n: number | string | null | undefined) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(n ?? 0));
}

function apStatusStyle(s: string | null | undefined) {
  const v = (s ?? "").toLowerCase();
  if (v === "paid") return { background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0" };
  if (v === "pending") return { background: "#FFFBEB", color: "#D97706", border: "1px solid #FDE68A" };
  if (v === "scheduled") return { background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE" };
  if (v === "overdue") return { background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" };
  return { background: "#F4F3F1", color: "#57534E", border: "1px solid #E8E6E2" };
}

interface Service {
  id: string;
  name: string | null;
  serviceModuleType: string | null;
  quantity: number | null;
  unitPrice: string | null;
  apAmount: string | null;
  arAmount: string | null;
  status: string | null;
  apStatus: string | null;
  apDueDate: string | null;
  contractNumber: string | null;
  studentName: string | null;
  courseStartDate: string | null;
  courseEndDate: string | null;
  contractStatus: string | null;
  packageName: string | null;
}

export default function AgentServicesPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: services = [], isLoading, error } = useQuery({
    queryKey: ["portal-agent-services"],
    queryFn: () => api.get<{ data: Service[] }>("/portal/agent/services").then(r => r.data),
  });

  const totalValue = services.reduce((s, i) => s + Number(i.arAmount ?? 0), 0);
  const active     = services.filter(s => !["cancelled", "rejected"].includes((s.status ?? "").toLowerCase()));
  const types      = [...new Set(services.map(s => s.serviceModuleType).filter(Boolean))];

  const filtered = services.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      s.name?.toLowerCase().includes(q) ||
      s.studentName?.toLowerCase().includes(q) ||
      s.contractNumber?.toLowerCase().includes(q);
    const matchType = typeFilter === "all" || s.serviceModuleType === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* KPI */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Services", value: services.length, icon: Layers, color: "#F5821F", bg: "#FEF0E3", isCount: true },
          { label: "Active",         value: active.length,   icon: Package,   color: "#16A34A", bg: "#F0FDF4", isCount: true },
          { label: "Total Value",    value: totalValue,       icon: DollarSign, color: "#2563EB", bg: "#EFF6FF", isCount: false },
        ].map(c => (
          <div key={c.label} className="rounded-xl p-5 border" style={{ background: "#FFFFFF", borderColor: "#E8E6E2", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#A8A29E" }}>{c.label}</p>
                {isLoading
                  ? <Skeleton className="h-7 w-20 mt-1" />
                  : <p className="text-2xl font-bold mt-1" style={{ color: "#1C1917" }}>
                      {c.isCount ? c.value : fmt(c.value)}
                    </p>
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#A8A29E" }} />
          <input
            className="w-full h-9 pl-9 pr-3 rounded-lg border text-sm outline-none"
            style={{ borderColor: "#E8E6E2", background: "#FFFFFF", color: "#1C1917" }}
            placeholder="Search service, student, contract..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="h-9 px-3 rounded-lg border text-sm outline-none capitalize"
          style={{ borderColor: "#E8E6E2", background: "#FFFFFF", color: "#57534E" }}
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
        >
          <option value="all">All Types</option>
          {types.map(t => <option key={t} value={t!} className="capitalize">{t}</option>)}
        </select>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load services. Please try again.
        </div>
      )}

      <div className="rounded-xl border overflow-hidden" style={{ background: "#FFFFFF", borderColor: "#E8E6E2" }}>
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex justify-between"><Skeleton className="h-4 w-48" /><Skeleton className="h-4 w-24" /></div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-10 h-10 mx-auto mb-3" style={{ color: "#D1CFC8" }} />
            <p className="text-sm font-medium" style={{ color: "#1C1917" }}>No services found</p>
            <p className="text-xs mt-1" style={{ color: "#A8A29E" }}>Services will appear here once student contracts are created.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid #E8E6E2", background: "#FAFAF9" }}>
                  {["Service", "Student", "Type", "Dates", "Value (AR)", "Payment"].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "#A8A29E" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id} style={{ borderBottom: "1px solid #F4F3F1" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#FAFAF9")}
                    onMouseLeave={e => (e.currentTarget.style.background = "")}>
                    <td className="px-5 py-4">
                      <p className="font-medium" style={{ color: "#1C1917" }}>{s.name ?? "—"}</p>
                      {s.contractNumber && <p className="text-xs mt-0.5" style={{ color: "#A8A29E" }}>{s.contractNumber}</p>}
                    </td>
                    <td className="px-5 py-4" style={{ color: "#57534E" }}>{s.studentName ?? "—"}</td>
                    <td className="px-5 py-4">
                      <span className="capitalize text-xs px-2 py-0.5 rounded-md font-medium"
                        style={{ background: "#F4F3F1", color: "#57534E" }}>
                        {s.serviceModuleType ?? "—"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs" style={{ color: "#57534E" }}>
                      {s.courseStartDate ? (
                        <>{format(new Date(s.courseStartDate), "dd MMM yy")}
                          {s.courseEndDate && <> – {format(new Date(s.courseEndDate), "dd MMM yy")}</>}
                        </>
                      ) : "—"}
                    </td>
                    <td className="px-5 py-4 font-semibold" style={{ color: "#1C1917" }}>{fmt(s.arAmount)}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize" style={apStatusStyle(s.apStatus)}>
                        {s.apStatus ?? "pending"}
                      </span>
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
