import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import axios from "axios";
import { Search, ChevronRight, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format, parseISO } from "date-fns";
import { SortableTh, useSortState, useSorted } from "@/components/ui/sortable-th";
import { TableFooter } from "@/components/ui/table-footer";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface InternshipRow {
  id: string;
  contractNumber?: string | null;
  studentName?: string | null;
  preferredIndustry?: string[] | null;
  positionTitle?: string | null;
  employmentType?: string | null;
  startDate?: string | null;
  status?: string | null;
  staffFirstName?: string | null;
  staffLastName?: string | null;
}

// ─── Pipeline stages ──────────────────────────────────────────────────────────
const STAGES: Array<{ key: string; label: string }> = [
  { key: "profile_review",    label: "Profile Review"    },
  { key: "company_matching",  label: "Company Matching"  },
  { key: "interview",         label: "Interview"         },
  { key: "confirmed",         label: "Confirmed"         },
  { key: "working",           label: "Working"           },
  { key: "completed",         label: "Completed"         },
];

const STAGE_STYLE: Record<string, { bg: string; text: string }> = {
  profile_review:   { bg: "#F4F3F1", text: "#57534E" },
  company_matching: { bg: "#FEF0E3", text: "#F5821F" },
  interview:        { bg: "#FEF9C3", text: "#CA8A04" },
  confirmed:        { bg: "#DCFCE7", text: "#16A34A" },
  working:          { bg: "#F0FDF4", text: "#15803D" },
  completed:        { bg: "#F4F3F1", text: "#57534E" },
};

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  try { return format(parseISO(d), "MMM d, yyyy"); } catch { return d; }
}

function PipelineStepper({
  activeStage,
  onSelect,
  counts,
}: {
  activeStage: string;
  onSelect: (s: string) => void;
  counts: Record<string, number>;
}) {
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4">
      <div className="flex items-center">
        {STAGES.map((stage, i) => {
          const isActive = activeStage === stage.key;
          const badge    = STAGE_STYLE[stage.key];
          return (
            <div key={stage.key} className="flex items-center flex-1 min-w-0">
              <button
                onClick={() => onSelect(isActive ? "" : stage.key)}
                className={`flex-1 flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-lg transition-all group min-w-0 ${
                  isActive ? "ring-2 ring-[#F5821F] ring-offset-1" : "hover:bg-stone-50"
                }`}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={isActive ? { background: "#F5821F", color: "#fff" } : { background: badge.bg, color: badge.text }}
                >
                  {counts[stage.key] ?? 0}
                </div>
                <span className={`text-[10px] font-medium text-center leading-tight w-full ${
                  isActive ? "text-[#F5821F]" : "text-stone-500 group-hover:text-stone-800"
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

export default function InternshipPage() {
  const qc                            = useQueryClient();
  const [, navigate]                  = useLocation();
  const { sortBy, sortDir, onSort } = useSortState();
  const [activeStage, setActiveStage] = useState("");
  const [search, setSearch]           = useState("");
  const [page, setPage]               = useState(1);
  const [pageSize, setPageSize]       = useState(20);
  const [showCreate, setShowCreate]   = useState(false);
  const [createForm, setCreateForm]   = useState<{ contractId: string; notes: string }>({ contractId: "", notes: "" });

  const { data: allData } = useQuery({
    queryKey: ["internship-all"],
    queryFn: () => axios.get(`${BASE}/api/services/internship?limit=100`).then(r => r.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["internship", activeStage, search, page, pageSize],
    queryFn: () => {
      const p = new URLSearchParams({ page: String(page), limit: String(pageSize) });
      if (activeStage) p.set("status", activeStage);
      if (search)      p.set("search", search);
      return axios.get(`${BASE}/api/services/internship?${p}`).then(r => r.data);
    },
  });

  const rows: InternshipRow[]    = data?.data ?? [];
  const sorted = useSorted(rows, sortBy, sortDir);
  const allRows: InternshipRow[] = allData?.data ?? [];
  const total                    = data?.meta?.total ?? 0;

  // Stage counts from all rows
  const stageCounts: Record<string, number> = {};
  for (const r of allRows) {
    const s = r.status ?? "profile_review";
    stageCounts[s] = (stageCounts[s] ?? 0) + 1;
  }

  const createMutation = useMutation({
    mutationFn: (payload: { contractId: string; notes: string }) =>
      axios.post(`${BASE}/api/services/internship`, payload).then(r => r.data),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["internship"] });
      setShowCreate(false);
      setCreateForm({ contractId: "", notes: "" });
      navigate(`${BASE}/admin/services/internship/${created.id}`);
    },
  });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-800">Internship</h1>
          <p className="text-sm text-stone-500 mt-1">Manage student internship placements</p>
        </div>
        <button
          onClick={() => { setCreateForm({ contractId: "", notes: "" }); setShowCreate(true); }}
          className="flex items-center gap-1.5 h-9 px-4 rounded-lg text-sm font-semibold text-white shrink-0"
          style={{ background: "#F5821F" }}
        >
          <Plus size={15} /> New Internship
        </button>
      </div>

      <PipelineStepper
        activeStage={activeStage}
        onSelect={s => { setActiveStage(s); setPage(1); }}
        counts={stageCounts}
      />

      <div className="flex items-center gap-3">
        <div className="relative w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <Input
            placeholder="Search student, position, contract…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="h-9 text-sm pl-9"
          />
        </div>
        {activeStage && (
          <button onClick={() => { setActiveStage(""); setPage(1); }}
            className="text-xs text-[#F5821F] hover:underline font-medium">
            Clear: {STAGES.find(s => s.key === activeStage)?.label}
          </button>
        )}
      </div>

      <div className="rounded-xl border border-stone-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 border-b border-stone-200">
            <tr>
              <>
              <SortableTh key="Student" col="studentName" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Student</SortableTh>
              <SortableTh key="Industry" col="industry" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Industry</SortableTh>
              <SortableTh key="Position / Company" col="positionTitle" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Position / Company</SortableTh>
              <SortableTh key="Employment Type" col="employmentType" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Employment Type</SortableTh>
              <SortableTh key="Start Date" col="startDate" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Start Date</SortableTh>
              <SortableTh key="Status" col="status" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Status</SortableTh>
            </>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {isLoading && (
              <tr><td colSpan={6} className="text-center py-12 text-stone-400 text-sm">Loading…</td></tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr><td colSpan={6} className="text-center py-12 text-stone-400 text-sm">No records found</td></tr>
            )}
            {sorted.map(row => {
              const stage = row.status ?? "profile_review";
              const badge = STAGE_STYLE[stage] ?? STAGE_STYLE.profile_review;
              const industries = Array.isArray(row.preferredIndustry)
                ? row.preferredIndustry.slice(0, 2).join(", ")
                : typeof row.preferredIndustry === "string"
                  ? row.preferredIndustry
                  : "—";

              return (
                <tr
                  key={row.id}
                  className="hover:bg-stone-50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/admin/services/internship/${row.id}`)}
                >
                  <td className="px-4 py-3 font-medium text-stone-800">{row.studentName ?? "—"}</td>
                  <td className="px-4 py-3 text-stone-500 text-xs">{industries}</td>
                  <td className="px-4 py-3 text-stone-700">
                    <div className="font-medium">{row.positionTitle ?? "—"}</div>
                  </td>
                  <td className="px-4 py-3 text-stone-500 text-xs capitalize">{row.employmentType?.replace(/_/g, " ") ?? "—"}</td>
                  <td className="px-4 py-3 text-stone-600 text-xs whitespace-nowrap">{fmtDate(row.startDate)}</td>
                  <td className="px-4 py-3">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium capitalize"
                      style={{ background: badge.bg, color: badge.text }}>
                      {STAGES.find(s => s.key === stage)?.label ?? stage}
                    </span>
                  </td>
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
              <h2 className="text-sm font-bold text-[#1C1917]">New Internship Record</h2>
              <button onClick={() => setShowCreate(false)} className="text-[#A8A29E] hover:text-[#1C1917]">✕</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wide text-[#57534E] block mb-1">Contract ID <span className="text-red-500">*</span></label>
                <input type="text" value={createForm.contractId}
                  onChange={e => setCreateForm(f => ({ ...f, contractId: e.target.value }))}
                  placeholder="Paste contract UUID…"
                  className="w-full h-9 px-3 rounded-lg border border-[#E8E6E2] text-sm focus:outline-none focus:border-[#F5821F]" />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wide text-[#57534E] block mb-1">Notes</label>
                <textarea rows={2} value={createForm.notes}
                  onChange={e => setCreateForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-[#E8E6E2] text-sm focus:outline-none focus:border-[#F5821F] resize-none" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[#E8E6E2] flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)}
                className="h-9 px-4 rounded-lg border border-[#E8E6E2] text-sm text-[#57534E] hover:bg-[#F4F3F1]">Cancel</button>
              <button
                onClick={() => createMutation.mutate(createForm)}
                disabled={createMutation.isPending || !createForm.contractId.trim()}
                className="h-9 px-4 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "#F5821F" }}>
                {createMutation.isPending ? "Creating…" : "Create & Open"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
