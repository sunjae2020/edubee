import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import axios from "axios";
import { Search, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { format, parseISO } from "date-fns";
import { SortableTh, useSortState, useSorted } from "@/components/ui/sortable-th";
import { TableFooter } from "@/components/ui/table-footer";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface OtherServiceRow {
  id: string;
  contractNumber?: string | null;
  clientName?: string | null;
  studentName?: string | null;
  serviceType?: string | null;
  title?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status: string;
  staffFullName?: string | null;
  serviceFee?: string | null;
}

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  pending:     { bg: "#FEF9C3", text: "#854D0E" },
  confirmed:   { bg: "#FEF0E3", text: "#F5821F" },
  in_progress: { bg: "#DBEAFE", text: "#1D4ED8" },
  completed:   { bg: "#DCFCE7", text: "#16A34A" },
  cancelled:   { bg: "#FEE2E2", text: "#DC2626" },
};
const STATUS_LABEL: Record<string, string> = {
  pending: "Pending", confirmed: "Confirmed", in_progress: "In Progress",
  completed: "Completed", cancelled: "Cancelled",
};

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  try { return format(parseISO(d), "MMM d, yyyy"); } catch { return d; }
}

export default function OtherServicePage() {
  const qc               = useQueryClient();
  const [, navigate]     = useLocation();
  const { sortBy, sortDir, onSort } = useSortState();
  const [search, setSearch]   = useState("");
  const [status, setStatus]   = useState("");
  const [page, setPage]       = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ contractId: "", serviceType: "", title: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["other-services", search, status, page, pageSize],
    queryFn: () => {
      const p = new URLSearchParams({ page: String(page), limit: String(pageSize) });
      if (search) p.set("search", search);
      if (status) p.set("status", status);
      return axios.get(`${BASE}/api/services/other?${p}`).then(r => r.data);
    },
  });

  const rows: OtherServiceRow[] = data?.data ?? [];
  const sorted = useSorted(rows, sortBy, sortDir);
  const total                   = data?.meta?.total ?? 0;

  const createMutation = useMutation({
    mutationFn: (payload: { contractId: string; serviceType: string; title: string }) =>
      axios.post(`${BASE}/api/services/other`, payload).then(r => r.data),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["other-services"] });
      setShowCreate(false);
      setCreateForm({ contractId: "", serviceType: "", title: "" });
      navigate(`/admin/services/other/${created.id}`);
    },
  });

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-800">Other Services</h1>
          <p className="text-sm text-stone-500 mt-1">Manage other service arrangements for students</p>
        </div>
        <button
          onClick={() => { setCreateForm({ contractId: "", serviceType: "", title: "" }); setShowCreate(true); }}
          className="flex items-center gap-1.5 h-9 px-4 rounded-lg text-sm font-semibold text-white shrink-0"
          style={{ background: "#F5821F" }}
        >
          <Plus size={15} /> New Other Service
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <Input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by student, contract, title…"
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
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 border-b border-stone-200">
            <tr>
              <>
              <SortableTh key="Contract" col="contractNumber" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Contract</SortableTh>
              <SortableTh key="Client" col="clientName" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Client</SortableTh>
              <SortableTh key="Service Type" col="serviceType" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Service Type</SortableTh>
              <SortableTh key="Title" col="title" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Title</SortableTh>
              <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Period</th>
              <SortableTh key="Staff" col="staffName" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Staff</SortableTh>
              <SortableTh key="Status" col="status" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Status</SortableTh>
              <SortableTh key="Fee" col="fee" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Fee</SortableTh>
              <SortableTh key="Created" col="createdAt" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide whitespace-nowrap">Created</SortableTh>
              <SortableTh key="Updated" col="updatedAt" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide whitespace-nowrap">Updated</SortableTh>
            </>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {isLoading && (
              <tr><td colSpan={10} className="text-center py-10 text-stone-400">Loading…</td></tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr><td colSpan={10} className="text-center py-10 text-stone-400">No records found</td></tr>
            )}
            {sorted.map(row => {
              const badge = STATUS_STYLE[row.status] ?? { bg: "#F4F3F1", text: "#57534E" };
              return (
                <tr key={row.id}
                  onClick={() => navigate(`/admin/services/other/${row.id}`)}
                  className="hover:bg-stone-50 cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-[#F5821F] font-semibold">{row.contractNumber ?? "—"}</td>
                  <td className="px-4 py-3 text-stone-700 font-medium">{row.clientName ?? row.studentName ?? "—"}</td>
                  <td className="px-4 py-3 text-stone-600">{row.serviceType ?? "—"}</td>
                  <td className="px-4 py-3 text-stone-600 max-w-[160px] truncate">{row.title ?? "—"}</td>
                  <td className="px-4 py-3 text-stone-500 text-xs whitespace-nowrap">
                    {fmtDate(row.startDate)} → {fmtDate(row.endDate)}
                  </td>
                  <td className="px-4 py-3 text-stone-600">{row.staffFullName ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium capitalize"
                      style={{ background: badge.bg, color: badge.text }}>
                      {STATUS_LABEL[row.status] ?? row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-stone-800">
                    {row.serviceFee ? `A$${parseFloat(row.serviceFee).toLocaleString("en-AU", { minimumFractionDigits: 2 })}` : "—"}
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
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Other Service</DialogTitle>
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
              <Label className="text-xs text-stone-500">Service Type</Label>
              <Input
                value={createForm.serviceType}
                onChange={e => setCreateForm(f => ({ ...f, serviceType: e.target.value }))}
                placeholder="e.g. Airport Transfer, Tour, Medical"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-stone-500">Title</Label>
              <Input
                value={createForm.title}
                onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Brief service description"
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
