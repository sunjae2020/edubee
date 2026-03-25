import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import axios from "axios";
import { GraduationCap, ChevronRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending:     { bg: "#FEF9C3", color: "#854D0E" },
  confirmed:   { bg: "#FEF0E3", color: "#F5821F" },
  in_progress: { bg: "#DBEAFE", color: "#1D4ED8" },
  completed:   { bg: "#DCFCE7", color: "#16A34A" },
  cancelled:   { bg: "#FEE2E2", color: "#DC2626" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_COLORS[status] ?? { bg: "#F4F3F1", color: "#57534E" };
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ background: s.bg, color: s.color }}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export default function CampInstitutes() {
  const [, navigate] = useLocation();
  const [search, setSearch]   = useState("");
  const [status, setStatus]   = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["camp-institutes", status],
    queryFn: () =>
      axios.get(`${BASE}/api/camp-services/institutes`).then(r => r.data),
  });

  const rows: any[] = data?.data ?? [];

  const filtered = rows.filter(r => {
    const matchStatus = status === "all" || r.status === status;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (r.programName ?? "").toLowerCase().includes(q) ||
      (r.programType ?? "").toLowerCase().includes(q) ||
      (r.assignedClass ?? "").toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  return (
    <div className="min-h-screen" style={{ background: "var(--e-bg-page)" }}>
      {/* Header */}
      <div className="px-6 py-5 border-b" style={{ background: "var(--e-bg-surface)", borderColor: "var(--e-border)" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--e-orange-lt)" }}>
            <GraduationCap className="w-5 h-5" style={{ color: "var(--e-orange)" }} />
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: "var(--e-text-1)" }}>Camp Institutes</h1>
            <p className="text-sm" style={{ color: "var(--e-text-3)" }}>Language school program records</p>
          </div>
          <span className="ml-auto text-sm font-medium px-2.5 py-1 rounded-full" style={{ background: "var(--e-orange-lt)", color: "var(--e-orange)" }}>
            {filtered.length} records
          </span>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--e-text-3)" }} />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search program name, class…"
              className="pl-9 h-9 text-sm"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9 w-40 text-sm"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.keys(STATUS_COLORS).map(s => (
                <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="px-6 py-4">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16" style={{ color: "var(--e-text-3)" }}>
            <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No institute records found</p>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--e-border)" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--e-bg-surface)", borderBottom: `1px solid var(--e-border)` }}>
                  {["Program Name", "Type", "Age Group", "Assigned Class", "Dates", "Status", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--e-text-3)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => (
                  <tr
                    key={row.id}
                    onClick={() => navigate(`/admin/camp-services/institutes/${row.id}`)}
                    className="cursor-pointer transition-colors hover:bg-[#F4F3F1] dark:hover:bg-[#242220]"
                    style={{
                      background: i % 2 === 0 ? "var(--e-bg-surface)" : "var(--e-bg-page)",
                      borderBottom: `1px solid var(--e-border)`,
                    }}
                  >
                    <td className="px-4 py-3 font-medium" style={{ color: "var(--e-text-1)" }}>
                      {row.programName ?? "—"}
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--e-text-2)" }}>{row.programType ?? "—"}</td>
                    <td className="px-4 py-3" style={{ color: "var(--e-text-2)" }}>{row.ageGroup ?? "—"}</td>
                    <td className="px-4 py-3" style={{ color: "var(--e-text-2)" }}>{row.assignedClass ?? "—"}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--e-text-3)" }}>
                      {row.programStartDate ? row.programStartDate.slice(0, 10) : "—"}
                      {row.programEndDate ? ` → ${row.programEndDate.slice(0, 10)}` : ""}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={row.status ?? "pending"} /></td>
                    <td className="px-4 py-3 text-right">
                      <ChevronRight className="w-4 h-4 inline-block" style={{ color: "var(--e-text-3)" }} />
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
