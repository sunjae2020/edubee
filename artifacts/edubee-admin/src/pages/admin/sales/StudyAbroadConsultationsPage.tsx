import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import axios from "axios";
import { useAuth } from "@/hooks/use-auth";
import { useBulkSelect } from "@/hooks/use-bulk-select";
import { BulkActionBar } from "@/components/common/BulkActionBar";
import { Plus, Search, Pencil, Globe, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShareLinkModal } from "@/components/common/ShareLinkModal";
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
  { value: "new",         label: "New",         color: "bg-blue-100 text-blue-700"    },
  { value: "in_progress", label: "In Progress",  color: "bg-yellow-100 text-yellow-700" },
  { value: "contacted",   label: "Contacted",   color: "bg-purple-100 text-purple-700" },
  { value: "closed",      label: "Closed",      color: "bg-green-100 text-green-700"  },
];

interface SACRow {
  id: string;
  refNumber?: string | null;
  status?: string | null;
  assignedTo?: string | null;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  nationality?: string | null;
  studyLevel?: string | null;
  studyDuration?: string | null;
  targetStartTerm?: string | null;
  destinationCountries?: string[] | null;
  language?: string | null;
  createdAt?: string | null;
}

export default function StudyAbroadConsultationsPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isSA = user?.role === "super_admin";

  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showShareModal, setShowShareModal] = useState(false);

  const sortState = useSortState("createdAt", "desc");
  const { selectedIds, toggleSelect, toggleAll, clearSelection, isAllSelected } = useBulkSelect();

  const queryKey = ["study-abroad-consultations", page, search, statusFilter];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const params: Record<string, string> = { page: String(page) };
      if (search) params.search = search;
      if (statusFilter && statusFilter !== "all") params.status = statusFilter;
      const res = await axios.get(`${BASE}/api/study-abroad-consultations`, { params });
      return res.data as { data: SACRow[]; total: number; page: number; totalPages: number };
    },
  });

  const rows       = data?.data ?? [];
  const total      = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const sorted     = useSorted(rows, sortState.key, sortState.dir);

  const softDelMutation = useMutation({
    mutationFn: (ids: string[]) => axios.patch(`${BASE}/api/study-abroad-consultations/bulk/soft-delete`, { ids }),
    onSuccess: (_d, ids) => { qc.invalidateQueries({ queryKey: ["study-abroad-consultations"] }); clearSelection(); toast({ title: `${ids.length} moved to trash` }); },
  });

  const hardDelMutation = useMutation({
    mutationFn: (ids: string[]) => axios.delete(`${BASE}/api/study-abroad-consultations/bulk`, { data: { ids } }),
    onSuccess: (_d, ids) => { qc.invalidateQueries({ queryKey: ["study-abroad-consultations"] }); clearSelection(); toast({ title: `${ids.length} permanently deleted` }); },
  });

  const statusInfo = (s: string | null | undefined) =>
    STATUS_OPTIONS.find(o => o.value === s) ?? { label: s ?? "—", color: "bg-gray-100 text-gray-600" };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Study Abroad Consultation</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} record{total !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowShareModal(true)} className="flex items-center gap-1.5 text-gray-600">
            <Link2 className="w-4 h-4" /> Share Link
          </Button>
          <Button onClick={() => navigate("/admin/sales/study-abroad-consultations/new")} className="flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> New Consultation
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Search name, email, phone…"
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
              <SortableTh sortKey="refNumber"     state={sortState} className="px-4 py-3 text-left font-medium text-gray-600">Ref #</SortableTh>
              <SortableTh sortKey="fullName"      state={sortState} className="px-4 py-3 text-left font-medium text-gray-600">Applicant</SortableTh>
              <SortableTh sortKey="nationality"   state={sortState} className="px-4 py-3 text-left font-medium text-gray-600">Nationality</SortableTh>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Destination</th>
              <SortableTh sortKey="studyLevel"    state={sortState} className="px-4 py-3 text-left font-medium text-gray-600">Study Level</SortableTh>
              <SortableTh sortKey="targetStartTerm" state={sortState} className="px-4 py-3 text-left font-medium text-gray-600">Start Term</SortableTh>
              <SortableTh sortKey="status"        state={sortState} className="px-4 py-3 text-left font-medium text-gray-600">Status</SortableTh>
              <SortableTh sortKey="createdAt"     state={sortState} className="px-4 py-3 text-left font-medium text-gray-600">Received</SortableTh>
              <th className="px-4 py-3 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={isSA ? 10 : 9} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
            ) : sorted.length === 0 ? (
              <tr><td colSpan={isSA ? 10 : 9} className="px-4 py-8 text-center text-gray-400">No consultations found.</td></tr>
            ) : sorted.map(c => {
              const si = statusInfo(c.status);
              const destinations = Array.isArray(c.destinationCountries) ? c.destinationCountries : [];
              return (
                <tr key={c.id} className="border-t hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => navigate(`/admin/sales/study-abroad-consultations/${c.id}`)}>
                  {isSA && (
                    <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                      <Checkbox checked={selectedIds.has(c.id)} onCheckedChange={() => toggleSelect(c.id)} />
                    </td>
                  )}
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{c.refNumber ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{c.fullName ?? "—"}</div>
                    {c.email && <div className="text-xs text-gray-500">{c.email}</div>}
                    {c.phone && <div className="text-xs text-gray-500">{c.phone}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{c.nationality ?? "—"}</td>
                  <td className="px-4 py-3">
                    {destinations.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {destinations.slice(0, 2).map((d, i) => (
                          <Badge key={i} className="text-xs bg-gray-100 text-gray-600 border-0">{d}</Badge>
                        ))}
                        {destinations.length > 2 && <Badge className="text-xs bg-gray-100 text-gray-500 border-0">+{destinations.length - 2}</Badge>}
                      </div>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{c.studyLevel ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-700">{c.targetStartTerm ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge className={`text-xs font-medium px-2 py-0.5 rounded-full border-0 ${si.color}`}>
                      {si.label}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{c.createdAt ? formatDate(c.createdAt) : "—"}</td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => navigate(`/admin/sales/study-abroad-consultations/${c.id}`)}>
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

      {showShareModal && (
        <ShareLinkModal
          title="Study Abroad Consultation Form"
          publicUrl={`${window.location.origin}/website/forms/study-abroad-consultation`}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}
