import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import axios from "axios";
import { Search, AlertCircle, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format, parseISO } from "date-fns";
import { SortableTh, useSortState, useSorted } from "@/components/ui/sortable-th";
import { TableFooter } from "@/components/ui/table-footer";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface GuardianRow {
  id: string;
  contractNumber?: string | null;
  studentName?: string | null;
  agentName?: string | null;
  billingCycle?: string | null;
  serviceStartDate?: string | null;
  serviceEndDate?: string | null;
  status?: string | null;
  staffFirstName?: string | null;
  staffLastName?: string | null;
  serviceFee?: string | null;
}

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  pending:    { bg: "#F4F3F1", text: "#57534E" },
  active:     { bg: "#DCFCE7", text: "#16A34A" },
  on_hold:    { bg: "#FEF9C3", text: "#CA8A04" },
  completed:  { bg: "#F4F3F1", text: "#57534E" },
  cancelled:  { bg: "#FEF2F2", text: "#DC2626" },
};

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  try { return format(parseISO(d), "MMM d, yyyy"); } catch { return d; }
}

export default function GuardianPage() {
  const qc              = useQueryClient();
  const [, navigate]    = useLocation();
  const { sortBy, sortDir, onSort } = useSortState();
  const [search, setSearch]   = useState("");
  const [status, setStatus]   = useState("");
  const [page, setPage]       = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<{ contractId: string; notes: string }>({ contractId: "", notes: "" });

  const { data: billingData } = useQuery({
    queryKey: ["guardian-billing-due"],
    queryFn: () => axios.get(`${BASE}/api/services/guardian/billing-due`).then(r => r.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["guardian", search, status, page, pageSize],
    queryFn: () => {
      const p = new URLSearchParams({ page: String(page), limit: String(pageSize) });
      if (search) p.set("search", search);
      if (status) p.set("status", status);
      return axios.get(`${BASE}/api/services/guardian?${p}`).then(r => r.data);
    },
  });

  const rows: GuardianRow[] = data?.data ?? [];
  const sorted = useSorted(rows, sortBy, sortDir);
  const total               = data?.meta?.total ?? 0;
  const billingDueCount     = billingData?.count ?? 0;

  const createMutation = useMutation({
    mutationFn: (payload: { contractId: string; notes: string }) =>
      axios.post(`${BASE}/api/services/guardian`, payload).then(r => r.data),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["guardian"] });
      setShowCreate(false);
      setCreateForm({ contractId: "", notes: "" });
      navigate(`${BASE}/admin/services/guardian/${created.id}`);
    },
  });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-800">Guardian</h1>
          <p className="text-sm text-stone-500 mt-1">Manage student guardian services and billing</p>
        </div>
        <button
          onClick={() => { setCreateForm({ contractId: "", notes: "" }); setShowCreate(true); }}
          className="flex items-center gap-1.5 h-9 px-4 rounded-lg text-sm font-semibold text-white shrink-0"
          style={{ background: "#F5821F" }}
        >
          <Plus size={15} /> New Guardian
        </button>
      </div>

      {/* Billing alert banner */}
      {billingDueCount > 0 && (
        <div
          className="flex items-center justify-between px-4 py-3 rounded-xl text-sm"
          style={{ background: "#FEF0E3", borderLeft: "4px solid #F5821F" }}
        >
          <div className="flex items-center gap-2 font-medium" style={{ color: "#C2410C" }}>
            <AlertCircle size={16} style={{ color: "#F5821F" }} />
            이번 달 가디언 청구 예정: {billingDueCount}건
          </div>
          <button
            onClick={() => navigate("/admin/services/guardian?billingDue=1")}
            className="text-xs font-bold underline hover:no-underline"
            style={{ color: "#C2410C" }}
          >
            Process →
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <Input
            placeholder="Search student, contract…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="h-9 text-sm pl-9"
          />
        </div>
        <select
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="h-9 text-sm border border-stone-200 rounded-lg px-3 bg-white text-stone-700"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="on_hold">On Hold</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-stone-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 border-b border-stone-200">
            <tr>
              <>
              <SortableTh key="Student" col="studentName" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Student</SortableTh>
              <SortableTh key="Guardian Staff" col="guardianName" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Guardian Staff</SortableTh>
              <SortableTh key="Billing Cycle" col="billingCycle" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Billing Cycle</SortableTh>
              <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Service Period</th>
              <SortableTh key="Fee (A$)" col="fee" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Fee (A$)</SortableTh>
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
              const badge = STATUS_STYLE[row.status ?? "pending"] ?? STATUS_STYLE.pending;
              const staffName = row.staffFirstName
                ? `${row.staffFirstName} ${row.staffLastName ?? ""}`.trim()
                : "—";

              return (
                <tr
                  key={row.id}
                  className="hover:bg-stone-50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/admin/services/guardian/${row.id}`)}
                >
                  <td className="px-4 py-3 font-medium text-stone-800">{row.studentName ?? "—"}</td>
                  <td className="px-4 py-3 text-stone-600 text-sm">{staffName}</td>
                  <td className="px-4 py-3 text-stone-500 text-xs capitalize">{row.billingCycle?.replace(/_/g, " ") ?? "—"}</td>
                  <td className="px-4 py-3 text-stone-600 text-xs whitespace-nowrap">
                    {fmtDate(row.serviceStartDate)} → {fmtDate(row.serviceEndDate)}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-stone-700">
                    {row.serviceFee ? `$${Number(row.serviceFee).toLocaleString("en-AU", { minimumFractionDigits: 2 })}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium capitalize"
                      style={{ background: badge.bg, color: badge.text }}>
                      {row.status ?? "—"}
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
              <h2 className="text-sm font-bold text-[#1C1917]">New Guardian Record</h2>
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
