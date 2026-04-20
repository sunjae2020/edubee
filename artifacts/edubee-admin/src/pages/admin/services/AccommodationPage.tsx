import { formatDate } from "@/lib/date-format";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import axios from "axios";
import { Search, Home, CheckCircle2, LogIn, HeartPulse, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format, parseISO, differenceInWeeks, differenceInCalendarDays } from "date-fns";
import { SortableTh, useSortState, useSorted } from "@/components/ui/sortable-th";
import { TableFooter } from "@/components/ui/table-footer";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface AccomRow {
  id: string;
  contractNumber?: string | null;
  clientName?: string | null;
  studentName?: string | null;
  accommodationType?: string | null;
  hostName?: string | null;
  checkinDate?: string | null;
  checkoutDate?: string | null;
  weeklyRate?: string | null;
  welfareCheckDates?: Array<{ date: string; staff?: string; notes?: string; status: string }> | null;
  status?: string | null;
  staffFirstName?: string | null;
  staffLastName?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

function fmtDate(d: string | null | undefined): string {
  return formatDate(d);
}

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  searching:   { bg: "var(--e-orange-lt)", text: "var(--e-orange)" },
  applied:     { bg: "#FEF9C3", text: "#CA8A04" },
  confirmed:   { bg: "#DCFCE7", text: "#16A34A" },
  checked_in:  { bg: "#D1FAE5", text: "#065F46" },
  checked_out: { bg: "#F4F3F1", text: "#57534E" },
  cancelled:   { bg: "#FEF2F2", text: "#DC2626" },
};

function welfareDueCount(rows: AccomRow[]): number {
  const today = new Date();
  return rows.filter(r => {
    if (r.status !== "checked_in") return false;
    const checks = r.welfareCheckDates ?? [];
    if (checks.length === 0) return true;
    const last = checks[checks.length - 1];
    try {
      const days = differenceInCalendarDays(today, parseISO(last.date));
      return days >= 7;
    } catch { return false; }
  }).length;
}

export default function AccommodationPage() {
  const qc              = useQueryClient();
  const [, navigate]    = useLocation();
  const { sortBy, sortDir, onSort } = useSortState("createdOn", "desc");
  const [search, setSearch]   = useState("");
  const [status, setStatus]   = useState("");
  const [page, setPage]       = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<{ contractId: string; notes: string }>({ contractId: "", notes: "" });

  const { data: allData } = useQuery({
    queryKey: ["accommodation-all"],
    queryFn: () => axios.get(`${BASE}/api/services/accommodation?limit=100`).then(r => r.data),
  });

  useEffect(() => { setPage(1); }, [sortBy, sortDir]);

  const { data, isLoading } = useQuery({
    queryKey: ["accommodation", search, status, page, pageSize, sortBy, sortDir],
    queryFn: () => {
      const p = new URLSearchParams({ page: String(page), limit: String(pageSize) });
      if (search) p.set("search", search);
      if (status) p.set("status", status);
      p.set("sortBy",  sortBy);
      p.set("sortDir", sortDir);
      return axios.get(`${BASE}/api/services/accommodation?${p}`).then(r => r.data);
    },
  });

  const rows: AccomRow[]    = data?.data ?? [];
  const sorted = useSorted(rows, sortBy, sortDir);
  const allRows: AccomRow[] = allData?.data ?? [];
  const total               = data?.meta?.total ?? 0;

  // KPI counts from all rows
  const kpi = {
    searching:  allRows.filter(r => r.status === "searching").length,
    confirmed:  allRows.filter(r => r.status === "confirmed").length,
    checkedIn:  allRows.filter(r => r.status === "checked_in").length,
    welfareDue: welfareDueCount(allRows),
  };

  const createMutation = useMutation({
    mutationFn: (payload: { contractId: string; notes: string }) =>
      axios.post(`${BASE}/api/services/accommodation`, payload).then(r => r.data),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["accommodation"] });
      setShowCreate(false);
      setCreateForm({ contractId: "", notes: "" });
      navigate(`/admin/services/accommodation/${created.id}`);
    },
  });

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-800">Accommodation</h1>
          <p className="text-sm text-stone-500 mt-1">Track homestay and student housing placements</p>
        </div>
        <button
          onClick={() => { setCreateForm({ contractId: "", notes: "" }); setShowCreate(true); }}
          className="flex items-center gap-1.5 h-9 px-4 rounded-lg text-sm font-semibold text-white shrink-0"
          style={{ background: "var(--e-orange)" }}
        >
          <Plus size={15} /> New Accommodation
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Searching",   count: kpi.searching,  icon: <Search size={18} />,       color: "var(--e-orange)", bg: "var(--e-orange-lt)"  },
          { label: "Confirmed",   count: kpi.confirmed,  icon: <CheckCircle2 size={18} />,  color: "#CA8A04", bg: "#FEF9C3"  },
          { label: "Checked In",  count: kpi.checkedIn,  icon: <LogIn size={18} />,         color: "#16A34A", bg: "#DCFCE7"  },
          { label: "Welfare Due", count: kpi.welfareDue, icon: <HeartPulse size={18} />,    color: "#DC2626", bg: "#FEF2F2"  },
        ].map(kp => (
          <div key={kp.label} className="bg-white border border-stone-200 rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: kp.bg, color: kp.color }}>
              {kp.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-stone-800">{kp.count}</p>
              <p className="text-xs text-stone-500">{kp.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <Input
            placeholder="Search student, host, contract…"
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
          <option value="searching">Searching</option>
          <option value="applied">Applied</option>
          <option value="confirmed">Confirmed</option>
          <option value="checked_in">Checked In</option>
          <option value="checked_out">Checked Out</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-stone-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 border-b border-stone-200">
            <tr>
              <>
              <SortableTh key="Client" col="clientName" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Client</SortableTh>
              <SortableTh key="Provider / Host" col="providerName" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Provider / Host</SortableTh>
              <SortableTh key="Type" col="accommodationType" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Type</SortableTh>
              <SortableTh key="Check-in" col="checkIn" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Check-in</SortableTh>
              <SortableTh key="Check-out" col="checkOut" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Check-out</SortableTh>
              <SortableTh key="Weekly Rate" col="weeklyRate" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Weekly Rate</SortableTh>
              <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Welfare</th>
              <SortableTh key="Status" col="status" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Status</SortableTh>
              <SortableTh key="Created" col="createdAt" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide whitespace-nowrap">Created</SortableTh>
              <SortableTh key="Updated" col="updatedAt" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide whitespace-nowrap">Updated</SortableTh>
            </>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {isLoading && (
              <tr><td colSpan={10} className="text-center py-12 text-stone-400 text-sm">Loading…</td></tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr><td colSpan={10} className="text-center py-12 text-stone-400 text-sm">No records found</td></tr>
            )}
            {sorted.map(row => {
              const badge   = STATUS_BADGE[row.status ?? "searching"] ?? STATUS_BADGE.searching;
              const checks  = row.welfareCheckDates ?? [];
              const lastCheck = checks.length > 0 ? checks[checks.length - 1] : null;
              let welfareBadge: React.ReactNode = <span className="text-stone-400 text-xs">None</span>;
              if (lastCheck) {
                let daysSince = 0;
                try { daysSince = differenceInCalendarDays(new Date(), parseISO(lastCheck.date)); } catch {}
                const overdueColor = daysSince >= 7 ? "#DC2626" : "#16A34A";
                welfareBadge = (
                  <span className="text-xs font-medium" style={{ color: overdueColor }}>
                    {daysSince}d ago
                  </span>
                );
              }
              return (
                <tr
                  key={row.id}
                  className="hover:bg-(--e-orange-lt) transition-colors cursor-pointer"
                  onClick={() => navigate(`/admin/services/accommodation/${row.id}`)}
                >
                  <td className="px-4 py-3 font-medium text-stone-800">{row.clientName ?? row.studentName ?? "—"}</td>
                  <td className="px-4 py-3 text-stone-600 text-xs">{row.hostName ?? "—"}</td>
                  <td className="px-4 py-3 text-stone-600 text-xs capitalize">{row.accommodationType?.replace(/_/g, " ") ?? "—"}</td>
                  <td className="px-4 py-3 text-stone-600 text-xs whitespace-nowrap">{fmtDate(row.checkinDate)}</td>
                  <td className="px-4 py-3 text-stone-600 text-xs whitespace-nowrap">{fmtDate(row.checkoutDate)}</td>
                  <td className="px-4 py-3 text-stone-700 text-xs font-medium">
                    {row.weeklyRate ? `$${parseFloat(row.weeklyRate).toLocaleString()}/wk` : "—"}
                  </td>
                  <td className="px-4 py-3">{welfareBadge}</td>
                  <td className="px-4 py-3">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium capitalize"
                      style={{ background: badge.bg, color: badge.text }}>
                      {row.status?.replace(/_/g, " ") ?? "—"}
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
              <h2 className="text-sm font-bold text-[#1C1917]">New Accommodation Record</h2>
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
