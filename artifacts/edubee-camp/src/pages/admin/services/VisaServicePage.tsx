import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import axios from "axios";
import { Search, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { format, parseISO } from "date-fns";
import { SortableTh, useSortState, useSorted } from "@/components/ui/sortable-th";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface VisaServiceRow {
  id: string;
  contractNumber?: string | null;
  studentName?: string | null;
  visaType?: string | null;
  country?: string | null;
  applicationDate?: string | null;
  decisionDate?: string | null;
  visaNumber?: string | null;
  status: string;
  staffFullName?: string | null;
  serviceFee?: string | null;
}

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  pending:    { bg: "#FEF9C3", text: "#854D0E" },
  applied:    { bg: "#FEF0E3", text: "#F5821F" },
  in_review:  { bg: "#DBEAFE", text: "#1D4ED8" },
  approved:   { bg: "#DCFCE7", text: "#16A34A" },
  rejected:   { bg: "#FEE2E2", text: "#DC2626" },
  expired:    { bg: "#F4F3F1", text: "#57534E" },
  cancelled:  { bg: "#F4F3F1", text: "#57534E" },
};
const STATUS_LABEL: Record<string, string> = {
  pending:   "Pending",
  applied:   "Applied",
  in_review: "In Review",
  approved:  "Approved",
  rejected:  "Rejected",
  expired:   "Expired",
  cancelled: "Cancelled",
};

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  try { return format(parseISO(d), "MMM d, yyyy"); } catch { return d; }
}

export default function VisaServicePage() {
  const qc               = useQueryClient();
  const [, navigate]     = useLocation();
  const { sortBy, sortDir, onSort } = useSortState();
  const [search, setSearch]   = useState("");
  const [status, setStatus]   = useState("");
  const [page, setPage]       = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ contractId: "", visaType: "", country: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["visa-services", search, status, page],
    queryFn: () => {
      const p = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) p.set("search", search);
      if (status) p.set("status", status);
      return axios.get(`${BASE}/api/services/visa?${p}`).then(r => r.data);
    },
  });

  const rows: VisaServiceRow[] = data?.data ?? [];
  const sorted = useSorted(rows, sortBy, sortDir);
  const totalPages             = data?.meta?.totalPages ?? 1;

  const createMutation = useMutation({
    mutationFn: (payload: { contractId: string; visaType: string; country: string }) =>
      axios.post(`${BASE}/api/services/visa`, payload).then(r => r.data),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["visa-services"] });
      setShowCreate(false);
      setCreateForm({ contractId: "", visaType: "", country: "" });
      navigate(`/admin/services/visa/${created.id}`);
    },
  });

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-800">Visa Services</h1>
          <p className="text-sm text-stone-500 mt-1">Manage visa application services for students</p>
        </div>
        <button
          onClick={() => { setCreateForm({ contractId: "", visaType: "", country: "" }); setShowCreate(true); }}
          className="flex items-center gap-1.5 h-9 px-4 rounded-lg text-sm font-semibold text-white shrink-0"
          style={{ background: "#F5821F" }}
        >
          <Plus size={15} /> New Visa Service
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <Input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by student, contract, country, visa type…"
            className="pl-9 h-9 text-sm"
          />
        </div>
        <select
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="h-9 text-sm border border-stone-200 rounded-lg px-3 text-stone-700 bg-white"
        >
          <option value="">All Statuses</option>
          {Object.entries(STATUS_LABEL).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="bg-stone-50 border-b border-stone-200">
            <tr>
              <SortableTh col="contractNumber" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Contract</SortableTh>
              <SortableTh col="studentName"    sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Student</SortableTh>
              <SortableTh col="visaType"       sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Visa Type</SortableTh>
              <SortableTh col="country"        sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Country</SortableTh>
              <SortableTh col="applicationDate" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Applied</SortableTh>
              <SortableTh col="decisionDate"   sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Decision</SortableTh>
              <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Visa #</th>
              <SortableTh col="status"         sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Status</SortableTh>
              <SortableTh col="serviceFee"     sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Fee</SortableTh>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {isLoading && (
              <tr><td colSpan={9} className="text-center py-10 text-stone-400">Loading…</td></tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr><td colSpan={9} className="text-center py-10 text-stone-400">No records found</td></tr>
            )}
            {sorted.map(row => {
              const badge = STATUS_STYLE[row.status] ?? { bg: "#F4F3F1", text: "#57534E" };
              return (
                <tr key={row.id}
                  onClick={() => navigate(`/admin/services/visa/${row.id}`)}
                  className="hover:bg-stone-50 cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-[#F5821F] font-semibold">{row.contractNumber ?? "—"}</td>
                  <td className="px-4 py-3 text-stone-700 font-medium">{row.studentName ?? "—"}</td>
                  <td className="px-4 py-3 text-stone-600">{row.visaType ?? "—"}</td>
                  <td className="px-4 py-3 text-stone-600">{row.country ?? "—"}</td>
                  <td className="px-4 py-3 text-stone-500 text-xs whitespace-nowrap">{fmtDate(row.applicationDate)}</td>
                  <td className="px-4 py-3 text-stone-500 text-xs whitespace-nowrap">{fmtDate(row.decisionDate)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-stone-600">{row.visaNumber ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium"
                      style={{ background: badge.bg, color: badge.text }}>
                      {STATUS_LABEL[row.status] ?? row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-stone-800">
                    {row.serviceFee ? `A$${parseFloat(row.serviceFee).toLocaleString("en-AU", { minimumFractionDigits: 2 })}` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-stone-500">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
              className="p-1.5 rounded hover:bg-stone-100 disabled:opacity-40"><ChevronLeft size={15} /></button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="p-1.5 rounded hover:bg-stone-100 disabled:opacity-40"><ChevronRight size={15} /></button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Visa Service</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-stone-500">Contract ID <span className="text-red-500">*</span></Label>
              <Input
                value={createForm.contractId}
                onChange={e => setCreateForm(f => ({ ...f, contractId: e.target.value }))}
                placeholder="Paste contract UUID"
                className="h-9 text-sm font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-stone-500">Visa Type</Label>
              <Input
                value={createForm.visaType}
                onChange={e => setCreateForm(f => ({ ...f, visaType: e.target.value }))}
                placeholder="e.g. Student Visa, Working Holiday"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-stone-500">Destination Country</Label>
              <Input
                value={createForm.country}
                onChange={e => setCreateForm(f => ({ ...f, country: e.target.value }))}
                placeholder="e.g. Australia, UK, Canada"
                className="h-9 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate(createForm)}
              disabled={!createForm.contractId || createMutation.isPending}
              className="text-white" style={{ background: "#F5821F" }}
            >
              {createMutation.isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
