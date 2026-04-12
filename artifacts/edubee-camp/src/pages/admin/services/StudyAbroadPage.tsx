import { formatDate } from "@/lib/date-format";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import axios from "axios";
import { AlertTriangle, ChevronRight, Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { SortableTh, useSortState, useSorted } from "@/components/ui/sortable-th";
import { TableFooter } from "@/components/ui/table-footer";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ─── Types ───────────────────────────────────────────────────────────────────
interface StudyAbroadRow {
  id: string;
  contractId?: string | null;
  contractNumber?: string | null;
  clientName?: string | null;
  studentName?: string | null;
  agentName?: string | null;
  applicationStage?: string | null;
  coeNumber?: string | null;
  visaType?: string | null;
  visaExpiryDate?: string | null;
  visaGranted?: boolean;
  status?: string | null;
  staffFirstName?: string | null;
  staffLastName?: string | null;
}

// ─── Pipeline stages ─────────────────────────────────────────────────────────
const STAGES: Array<{ key: string; label: string }> = [
  { key: "counseling",       label: "Counseling"       },
  { key: "school_selection", label: "School Selection" },
  { key: "application",      label: "Application"      },
  { key: "coe_issued",       label: "COE Issued"       },
  { key: "visa_applied",     label: "Visa Applied"     },
  { key: "visa_granted",     label: "Visa Granted"     },
  { key: "departed",         label: "Departed"         },
];

const STAGE_BADGE: Record<string, { bg: string; text: string }> = {
  counseling:       { bg: "#F4F3F1", text: "#57534E" },
  school_selection: { bg: "var(--e-orange-lt)", text: "var(--e-orange)" },
  application:      { bg: "#FEF9C3", text: "#CA8A04" },
  coe_issued:       { bg: "#DCFCE7", text: "#16A34A" },
  visa_applied:     { bg: "var(--e-orange-lt)", text: "var(--e-orange)" },
  visa_granted:     { bg: "#DCFCE7", text: "#16A34A" },
  departed:         { bg: "#F0FDF4", text: "#15803D" },
};

function fmtDate(d: string | null | undefined): string {
  return formatDate(d);
}

// ─── Pipeline Stepper ────────────────────────────────────────────────────────
function PipelineStepper({
  activeStage,
  onSelect,
  counts,
}: {
  activeStage: string;
  onSelect: (stage: string) => void;
  counts: Record<string, number>;
}) {
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4">
      <div className="flex items-center">
        {STAGES.map((stage, i) => {
          const isActive = activeStage === stage.key;
          const badge    = STAGE_BADGE[stage.key];
          return (
            <div key={stage.key} className="flex items-center flex-1 min-w-0">
              <button
                onClick={() => onSelect(isActive ? "" : stage.key)}
                className={`flex-1 flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-lg transition-all group min-w-0 ${
                  isActive ? "ring-2 ring-(--e-orange) ring-offset-1" : "hover:bg-stone-50"
                }`}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={isActive ? { background: "var(--e-orange)", color: "#fff" } : { background: badge.bg, color: badge.text }}
                >
                  {counts[stage.key] ?? 0}
                </div>
                <span className={`text-[10px] font-medium text-center leading-tight truncate w-full ${
                  isActive ? "text-(--e-orange)" : "text-stone-500 group-hover:text-stone-800"
                }`}>
                  {stage.label}
                </span>
              </button>
              {i < STAGES.length - 1 && (
                <ChevronRight size={14} className="text-stone-300 shrink-0 mx-0.5" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function StudyAbroadPage() {
  const qc                            = useQueryClient();
  const [, navigate]                  = useLocation();
  const { sortBy, sortDir, onSort } = useSortState("createdOn", "desc");
  const [activeStage, setActiveStage] = useState("");
  const [search, setSearch]           = useState("");
  const [page, setPage]               = useState(1);
  const [pageSize, setPageSize]       = useState(20);
  const [showCreate, setShowCreate]   = useState(false);
  const [createForm, setCreateForm]   = useState<{ contractId: string; notes: string }>({ contractId: "", notes: "" });

  const { data: alertsData } = useQuery({
    queryKey: ["study-abroad-visa-alerts"],
    queryFn: () => axios.get(`${BASE}/api/services/study-abroad/visa-alerts`).then(r => r.data),
  });

  useEffect(() => { setPage(1); }, [sortBy, sortDir]);

  const { data, isLoading } = useQuery({
    queryKey: ["study-abroad", activeStage, search, page, pageSize, sortBy, sortDir],
    queryFn: () => {
      const p = new URLSearchParams({ page: String(page), limit: String(pageSize) });
      if (activeStage) p.set("applicationStage", activeStage);
      if (search)      p.set("search", search);
      p.set("sortBy",  sortBy);
      p.set("sortDir", sortDir);
      return axios.get(`${BASE}/api/services/study-abroad?${p}`).then(r => r.data);
    },
  });

  // Also fetch all records to build stage counts
  const { data: allData } = useQuery({
    queryKey: ["study-abroad-all"],
    queryFn: () => axios.get(`${BASE}/api/services/study-abroad?limit=100`).then(r => r.data),
  });

  const rows: StudyAbroadRow[] = data?.data ?? [];
  const sorted = useSorted(rows, sortBy, sortDir);
  const allRows: StudyAbroadRow[] = allData?.data ?? [];
  const total      = data?.meta?.total ?? 0;
  const alertCount = alertsData?.count ?? 0;

  // Build stage counts from all rows
  const stageCounts: Record<string, number> = {};
  for (const r of allRows) {
    const s = r.applicationStage ?? "counseling";
    stageCounts[s] = (stageCounts[s] ?? 0) + 1;
  }

  const createMutation = useMutation({
    mutationFn: (payload: { contractId: string; notes: string }) =>
      axios.post(`${BASE}/api/services/study-abroad`, payload).then(r => r.data),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["study-abroad"] });
      setShowCreate(false);
      setCreateForm({ contractId: "", notes: "" });
      navigate(`${BASE}/admin/services/study-abroad/${created.id}`);
    },
  });

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-800">Study Abroad</h1>
          <p className="text-sm text-stone-500 mt-1">Manage student study abroad applications and visas</p>
        </div>
        <button
          onClick={() => { setCreateForm({ contractId: "", notes: "" }); setShowCreate(true); }}
          className="flex items-center gap-1.5 h-9 px-4 rounded-lg text-sm font-semibold text-white shrink-0"
          style={{ background: "var(--e-orange)" }}
        >
          <Plus size={15} /> New Study Abroad
        </button>
      </div>

      {/* Visa expiry alert banner */}
      {alertCount > 0 && (
        <div
          className="flex items-center justify-between px-4 py-3 rounded-xl text-sm"
          style={{
            background: "#FEF9C3",
            borderLeft: "4px solid #CA8A04",
          }}
        >
          <div className="flex items-center gap-2 text-[#92400E] font-medium">
            <AlertTriangle size={16} className="text-[#CA8A04]" />
            ⚠️ {alertCount} student visa{alertCount > 1 ? "s" : ""} expiring within 30 days
          </div>
          <button
            onClick={() => navigate("/admin/services/study-abroad?visaAlert=1")}
            className="text-xs font-semibold text-[#92400E] underline hover:no-underline"
          >
            View All →
          </button>
        </div>
      )}

      {/* Pipeline stepper */}
      <PipelineStepper
        activeStage={activeStage}
        onSelect={s => { setActiveStage(s); setPage(1); }}
        counts={stageCounts}
      />

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <Input
            placeholder="Search student, contract, COE…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="h-9 text-sm pl-9"
          />
        </div>
        {activeStage && (
          <button
            onClick={() => { setActiveStage(""); setPage(1); }}
            className="text-xs text-(--e-orange) hover:underline font-medium"
          >
            Clear filter: {STAGES.find(s => s.key === activeStage)?.label}
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-stone-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 border-b border-stone-200">
            <tr>
              <>
              <SortableTh key="Client" col="clientName" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Client</SortableTh>
              <SortableTh key="School Name" col="studentSchoolName" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">School Name</SortableTh>
              <SortableTh key="Account / Contract" col="accountName" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Account / Contract</SortableTh>
              <SortableTh key="Stage" col="applicationStage" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Stage</SortableTh>
              <SortableTh key="Staff" col="staffName" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Staff</SortableTh>
              <SortableTh key="Status" col="status" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Status</SortableTh>
              <SortableTh key="Created" col="createdAt" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide whitespace-nowrap">Created</SortableTh>
              <SortableTh key="Updated" col="updatedAt" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide whitespace-nowrap">Updated</SortableTh>
            </>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {isLoading && (
              <tr><td colSpan={8} className="text-center py-12 text-stone-400 text-sm">Loading…</td></tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr><td colSpan={8} className="text-center py-12 text-stone-400 text-sm">No records found</td></tr>
            )}
            {sorted.map(row => {
              const stage   = row.applicationStage ?? "counseling";
              const badge   = STAGE_BADGE[stage] ?? STAGE_BADGE.counseling;
              const staffName = row.staffFirstName
                ? `${row.staffFirstName} ${row.staffLastName ?? ""}`.trim()
                : "—";

              return (
                <tr
                  key={row.id}
                  className="hover:bg-(--e-orange-lt) transition-colors cursor-pointer"
                  onClick={() => navigate(`/admin/services/study-abroad/${row.id}`)}
                >
                  <td className="px-4 py-3 font-medium text-stone-800 hover:text-(--e-orange) transition-colors">
                    {row.clientName ?? row.studentName ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-600">{row.studentSchoolName ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-stone-500">{row.contractNumber ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className="px-2.5 py-0.5 rounded-full text-xs font-medium capitalize"
                      style={{ background: badge.bg, color: badge.text }}
                    >
                      {STAGES.find(s => s.key === stage)?.label ?? stage}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-stone-600 text-xs">{staffName}</td>
                  <td className="px-4 py-3">
                    <span
                      className="px-2.5 py-0.5 rounded-full text-xs font-medium capitalize"
                      style={{ background: "#F4F3F1", color: "#57534E" }}
                    >
                      {row.status ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-stone-500 text-xs whitespace-nowrap">{fmtDate(row.createdAt)}</td>
                  <td className="px-4 py-3 text-stone-500 text-xs whitespace-nowrap">{fmtDate(row.updatedAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <TableFooter page={page} pageSize={pageSize} total={total} label="records" onPageChange={setPage} onPageSizeChange={v => { setPageSize(v); setPage(1); }} />

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={e => { if (e.target === e.currentTarget) setShowCreate(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E6E2]">
              <h2 className="text-sm font-bold text-[#1C1917]">New Study Abroad Record</h2>
              <button onClick={() => setShowCreate(false)} className="text-[#A8A29E] hover:text-[#1C1917]">✕</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wide text-[#57534E] block mb-1">Contract ID <span className="text-red-500">*</span></label>
                <input type="text" value={createForm.contractId}
                  onChange={e => setCreateForm(f => ({ ...f, contractId: e.target.value }))}
                  placeholder="Paste contract UUID…"
                  className="w-full h-9 px-3 rounded-lg border border-[#E8E6E2] text-sm focus:outline-none focus:border-(--e-orange)" />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wide text-[#57534E] block mb-1">Notes</label>
                <textarea rows={2} value={createForm.notes}
                  onChange={e => setCreateForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-[#E8E6E2] text-sm focus:outline-none focus:border-(--e-orange) resize-none" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[#E8E6E2] flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)}
                className="h-9 px-4 rounded-lg border border-[#E8E6E2] text-sm text-[#57534E] hover:bg-[#F4F3F1]">Cancel</button>
              <button
                onClick={() => createMutation.mutate(createForm)}
                disabled={createMutation.isPending || !createForm.contractId.trim()}
                className="h-9 px-4 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "var(--e-orange)" }}>
                {createMutation.isPending ? "Creating…" : "Create & Open"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
