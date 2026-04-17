import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import axios from "axios";
import { useAuth } from "@/hooks/use-auth";
import { useBulkSelect } from "@/hooks/use-bulk-select";
import { BulkActionBar } from "@/components/common/BulkActionBar";
import { Plus, Search, Pencil, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { SortableTh, useSortState, useSorted } from "@/components/ui/sortable-th";
import { TableFooter } from "@/components/ui/table-footer";
import { formatDate } from "@/lib/date-format";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const STATUS_OPTIONS = [
  { value: "new",         label: "New",         color: "bg-blue-100 text-blue-700"   },
  { value: "in_progress", label: "In Progress",  color: "bg-yellow-100 text-yellow-700" },
  { value: "contacted",   label: "Contacted",   color: "bg-purple-100 text-purple-700" },
  { value: "closed",      label: "Closed",      color: "bg-green-100 text-green-700" },
];

interface SCRow {
  id: string;
  refNumber?: string | null;
  status?: string | null;
  assignedTo?: string | null;
  guardianName?: string | null;
  relationship?: string | null;
  phone?: string | null;
  email?: string | null;
  studyDuration?: string | null;
  targetTerm?: string | null;
  consultMethod?: string | null;
  language?: string | null;
  studentCount?: number;
  createdAt?: string | null;
}

export default function SchoolingConsultationsPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isSA = user?.role === "super_admin";

  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const sortState = useSortState("createdAt", "desc");
  const { selectedIds, toggleSelect, toggleAll, clearSelection, isAllSelected } = useBulkSelect();

  const queryKey = ["schooling-consultations", page, search, statusFilter];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const params: Record<string, string> = { page: String(page) };
      if (search) params.search = search;
      if (statusFilter && statusFilter !== "all") params.status = statusFilter;
      const res = await axios.get(`${BASE}/api/schooling-consultations`, { params });
      return res.data as { data: SCRow[]; total: number; page: number; totalPages: number };
    },
  });

  const rows       = data?.data ?? [];
  const total      = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const sorted     = useSorted(rows, sortState.key, sortState.dir);

  const softDelMutation = useMutation({
    mutationFn: (ids: string[]) => axios.patch(`${BASE}/api/schooling-consultations/bulk/soft-delete`, { ids }),
    onSuccess: (_d, ids) => { qc.invalidateQueries({ queryKey: ["schooling-consultations"] }); clearSelection(); toast({ title: `${ids.length} moved to trash` }); },
  });

  const hardDelMutation = useMutation({
    mutationFn: (ids: string[]) => axios.delete(`${BASE}/api/schooling-consultations/bulk`, { data: { ids } }),
    onSuccess: (_d, ids) => { qc.invalidateQueries({ queryKey: ["schooling-consultations"] }); clearSelection(); toast({ title: `${ids.length} permanently deleted` }); },
  });

  const statusInfo = (s: string | null | undefined) =>
    STATUS_OPTIONS.find(o => o.value === s) ?? { label: s ?? "—", color: "bg-gray-100 text-gray-600" };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schooling Consultation</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} record{total !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => navigate("/admin/sales/schooling-consultations/new")} className="flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> New Consultation
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Search guardian, email, phone…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {STATUS_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isSA && (
        <BulkActionBar
          count={selectedIds.size}
          onSoftDelete={() => softDelMutation.mutate(Array.from(selectedIds))}
          onHardDelete={() => hardDelMutation.mutate(Array.from(selectedIds))}
          isLoading={softDelMutation.isPending || hardDelMutation.isPending}
        />
      )}

      <div className="border rounded-lg overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {isSA && (
                <th className="w-10 px-3 py-3">
                  <Checkbox
                    checked={rows.length > 0 && isAllSelected(rows.map(r => r.id))}
                    onCheckedChange={() => toggleAll(rows.map(r => r.id))}
                  />
                </th>
              )}
              <SortableTh sortKey="refNumber"    state={sortState} className="px-4 py-3 text-left font-medium text-gray-600">Ref #</SortableTh>
              <SortableTh sortKey="guardianName" state={sortState} className="px-4 py-3 text-left font-medium text-gray-600">Guardian</SortableTh>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Students</th>
              <SortableTh sortKey="status"       state={sortState} className="px-4 py-3 text-left font-medium text-gray-600">Status</SortableTh>
              <SortableTh sortKey="studyDuration" state={sortState} className="px-4 py-3 text-left font-medium text-gray-600">Duration</SortableTh>
              <SortableTh sortKey="targetTerm"   state={sortState} className="px-4 py-3 text-left font-medium text-gray-600">Target Term</SortableTh>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Consult Method</th>
              <SortableTh sortKey="createdAt"    state={sortState} className="px-4 py-3 text-left font-medium text-gray-600">Received</SortableTh>
              <th className="px-4 py-3 text-left font-medium text-gray-600 w-16">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={isSA ? 10 : 9} className="px-4 py-8 text-center text-gray-400">Loading…</td>
              </tr>
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={isSA ? 10 : 9} className="px-4 py-8 text-center text-gray-400">No consultations found.</td>
              </tr>
            ) : sorted.map(c => {
              const si = statusInfo(c.status);
              return (
                <tr key={c.id} className="border-t hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => navigate(`/admin/sales/schooling-consultations/${c.id}`)}>
                  {isSA && (
                    <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                      <Checkbox checked={selectedIds.has(c.id)} onCheckedChange={() => toggleSelect(c.id)} />
                    </td>
                  )}
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{c.refNumber ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{c.guardianName ?? "—"}</div>
                    {c.email && <div className="text-xs text-gray-500">{c.email}</div>}
                    {c.phone && <div className="text-xs text-gray-500">{c.phone}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-gray-700">
                      <Users className="w-3.5 h-3.5 text-gray-400" />
                      {c.studentCount ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={`text-xs font-medium px-2 py-0.5 rounded-full border-0 ${si.color}`}>
                      {si.label}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{c.studyDuration ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-700">{c.targetTerm ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-700">{c.consultMethod ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{c.createdAt ? formatDate(c.createdAt) : "—"}</td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => navigate(`/admin/sales/schooling-consultations/${c.id}`)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <TableFooter page={page} totalPages={totalPages} total={total} pageSize={20} onPageChange={setPage} />
    </div>
  );
}
