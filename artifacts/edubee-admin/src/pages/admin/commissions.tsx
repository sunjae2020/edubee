import { useState } from "react";
import { formatDate, formatDateTime } from "@/lib/date-format";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { BadgeDollarSign, Plus, Loader2, Search } from "lucide-react";
import { format } from "date-fns";
import { SortableTh, useSortState, useSorted } from "@/components/ui/sortable-th";
import { useAuth } from "@/hooks/use-auth";
import { useBulkSelect } from "@/hooks/use-bulk-select";
import { BulkActionBar } from "@/components/common/BulkActionBar";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Commission {
  id: string;
  name: string;
  commissionType: string;
  rateValue?: string | null;
  description?: string | null;
  status: string;
  createdOn?: string;
  modifiedOn?: string | null;
}

const TYPE_OPTIONS = [
  { value: "nil",   label: "Nil"   },
  { value: "fixed", label: "Fixed" },
  { value: "rate",  label: "Rate"  },
];

function TypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    nil:   "bg-[#F4F3F1] text-[#57534E]",
    fixed: "bg-[#EFF6FF] text-[#3B82F6]",
    rate:  "bg-(--e-orange-lt) text-(--e-orange)",
  };
  const cls = map[type] ?? "bg-[#F4F3F1] text-[#57534E]";
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>{type.charAt(0).toUpperCase() + type.slice(1)}</span>;
}

function StatusBadge({ status }: { status: string }) {
  if (status?.toLowerCase() === "active")
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#DCFCE7] text-[#16A34A]">Active</span>;
  return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F4F3F1] text-[#57534E]">Inactive</span>;
}

interface FormState { name: string; commissionType: string; rateValue: string; description: string; status: string }
const EMPTY_FORM: FormState = { name: "", commissionType: "rate", rateValue: "", description: "", status: "Active" };

export default function Commissions() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const { sortBy, sortDir, onSort } = useSortState();

  const [search, setSearch]       = useState("");
  const [statusFilter, setStatus] = useState("Active");
  const [typeFilter, setType]     = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState<Commission | null>(null);
  const [form, setForm]           = useState<FormState>(EMPTY_FORM);
  const [nameError, setNameError] = useState("");

  const queryKey = ["commissions", search, statusFilter, typeFilter];
  const { data: commissions = [], isLoading } = useQuery<Commission[]>({
    queryKey,
    queryFn: () => {
      const p = new URLSearchParams();
      if (search) p.set("search", search);
      if (statusFilter !== "all") p.set("status", statusFilter);
      if (typeFilter !== "all") p.set("commission_type", typeFilter);
      return axios.get(`${BASE}/api/commissions?${p}`).then(r => r.data);
    },
  });

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setNameError(""); setModalOpen(true); };
  const openEdit   = (c: Commission) => {
    setEditing(c);
    setForm({ name: c.name, commissionType: c.commissionType, rateValue: c.rateValue ?? "", description: c.description ?? "", status: c.status });
    setNameError("");
    setModalOpen(true);
  };
  const closeModal = () => setModalOpen(false);

  const save = useMutation({
    mutationFn: () => {
      if (!form.name.trim()) { setNameError("Name is required"); return Promise.reject(); }
      setNameError("");
      const payload = {
        name:           form.name,
        commissionType: form.commissionType,
        rateValue:      form.commissionType === "rate" && form.rateValue ? form.rateValue : null,
        description:    form.description,
        status:         form.status,
      };
      if (editing) return axios.put(`${BASE}/api/commissions/${editing.id}`, payload).then(r => r.data);
      return axios.post(`${BASE}/api/commissions`, payload).then(r => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["commissions"] });
      closeModal();
      toast({ title: editing ? "Commission updated" : "Commission created" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to save commission" }),
  });

  const deactivate = useMutation({
    mutationFn: (id: string) => axios.delete(`${BASE}/api/commissions/${id}`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["commissions"] });
      toast({ title: "Commission deactivated" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to deactivate" }),
  });

  const { user } = useAuth();
  const isSA = user?.role === "super_admin";
  const { selectedIds, toggleSelect, toggleAll, clearSelection, isAllSelected } = useBulkSelect();
  const sorted2 = useSorted(commissions, sortBy, sortDir);
  const sortedIds = sorted2.map(r => r.id);

  const softDelMutation = useMutation({
    mutationFn: (ids: string[]) => axios.delete(`${BASE}/api/commissions/bulk`, { data: { ids, soft: true } }).then(r => r.data),
    onSuccess: (_d, ids) => { qc.invalidateQueries({ queryKey: ["commissions"] }); clearSelection(); toast({ title: `${ids.length}개 임시 삭제됨` }); },
    onError: () => toast({ title: "삭제 실패", variant: "destructive" }),
  });
  const hardDelMutation = useMutation({
    mutationFn: (ids: string[]) => axios.delete(`${BASE}/api/commissions/bulk`, { data: { ids } }).then(r => r.data),
    onSuccess: (_d, ids) => { qc.invalidateQueries({ queryKey: ["commissions"] }); clearSelection(); toast({ title: `${ids.length}개 영구 삭제됨` }); },
    onError: () => toast({ title: "삭제 실패", variant: "destructive" }),
  });
  const bulkLoading = softDelMutation.isPending || hardDelMutation.isPending;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1C1917]">Commission</h1>
          <p className="text-sm text-[#57534E] mt-0.5">Define commission types and rates for products and agents</p>
        </div>
        <Button onClick={openCreate} className="bg-(--e-orange) hover:bg-(--e-orange-hover) text-white gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Add Commission
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8A29E]" />
          <Input placeholder="Search by name..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 border-[#E8E6E2]" />
        </div>
        <Select value={typeFilter} onValueChange={setType}>
          <SelectTrigger className="w-36 h-9 border-[#E8E6E2]"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatus}>
          <SelectTrigger className="w-36 h-9 border-[#E8E6E2]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isSA && selectedIds.size > 0 && (
        <BulkActionBar
          count={selectedIds.size}
          isLoading={bulkLoading}
          onSoftDelete={() => softDelMutation.mutate(Array.from(selectedIds))}
          onHardDelete={() => hardDelMutation.mutate(Array.from(selectedIds))}
        />
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#E8E6E2] overflow-x-auto shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#F4F3F1] bg-[#FAFAF9]">
              {isSA && <th className="px-3 py-3 w-10"><input type="checkbox" checked={isAllSelected(sortedIds)} onChange={() => toggleAll(sortedIds)} className="rounded border-stone-300" /></th>}
              <>
              <SortableTh key="Name" col="name" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-medium text-[#57534E] uppercase tracking-wide">Name</SortableTh>
              <SortableTh key="Type" col="commissionType" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-medium text-[#57534E] uppercase tracking-wide">Type</SortableTh>
              <SortableTh key="Rate Value" col="rateValue" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-medium text-[#57534E] uppercase tracking-wide">Rate Value</SortableTh>
              <SortableTh key="Description" col="description" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-medium text-[#57534E] uppercase tracking-wide">Description</SortableTh>
              <SortableTh key="Status" col="status" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-medium text-[#57534E] uppercase tracking-wide">Status</SortableTh>
              <SortableTh key="Created" col="createdOn" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-medium text-[#57534E] uppercase tracking-wide">Created</SortableTh>
              <SortableTh key="Modified" col="modifiedOn" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-medium text-[#57534E] uppercase tracking-wide">Modified</SortableTh>
            </>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F4F3F1]">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>{[...Array(isSA ? 8 : 7)].map((_, j) => (
                  <td key={j} className="px-4 py-3"><div className="h-4 bg-[#F4F3F1] rounded animate-pulse" /></td>
                ))}</tr>
              ))
            ) : commissions.length === 0 ? (
              <tr><td colSpan={isSA ? 8 : 7} className="px-4 py-16 text-center text-[#A8A29E] text-sm">No commissions found</td></tr>
            ) : commissions.map(c => (
              <tr
                key={c.id}
                className="hover:bg-(--e-orange-lt) cursor-pointer transition-colors"
                onClick={() => navigate(`/admin/commissions/${c.id}`)}
              >
                {isSA && <td className="px-3 py-3 w-10" onClick={e => e.stopPropagation()}><input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleSelect(c.id)} className="rounded border-stone-300" /></td>}
                <td className="px-4 py-3 font-medium text-[#1C1917]">
                  <div className="flex items-center gap-2">
                    <BadgeDollarSign className="w-4 h-4 text-(--e-orange) shrink-0" strokeWidth={1.5} />
                    {c.name}
                  </div>
                </td>
                <td className="px-4 py-3"><TypeBadge type={c.commissionType} /></td>
                <td className="px-4 py-3 text-[#1C1917] font-medium">
                  {c.commissionType === "rate" && c.rateValue ? `${c.rateValue}%` : c.commissionType === "nil" ? "—" : "Fixed Amt"}
                </td>
                <td className="px-4 py-3 text-[#57534E] max-w-xs">
                  {c.description ? (c.description.length > 55 ? c.description.slice(0, 55) + "…" : c.description) : "—"}
                </td>
                <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                <td className="px-4 py-3 text-[#A8A29E] text-xs">{c.createdOn ? formatDate(c.createdOn) : "—"}</td>
                <td className="px-4 py-3 text-[#A8A29E] text-xs">{c.modifiedOn ? formatDate(c.modifiedOn) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={o => { if (!o) closeModal(); }}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-[#1C1917]">
              {editing ? "Edit Commission" : "Add Commission"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">Name <span className="text-[#DC2626]">*</span></Label>
              <Input value={form.name} onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setNameError(""); }}
                placeholder="e.g. Rate25"
                className={`h-10 border-[#E8E6E2] focus:border-(--e-orange) ${nameError ? "border-[#DC2626]" : ""}`} />
              {nameError && <p className="text-xs text-[#DC2626]">{nameError}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">Commission Type <span className="text-[#DC2626]">*</span></Label>
              <Select value={form.commissionType} onValueChange={v => setForm(f => ({ ...f, commissionType: v, rateValue: "" }))}>
                <SelectTrigger className="h-10 border-[#E8E6E2]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {form.commissionType === "rate" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">Rate Value (%)</Label>
                <Input
                  type="number" min={0} max={100} step={0.01}
                  value={form.rateValue}
                  onChange={e => setForm(f => ({ ...f, rateValue: e.target.value }))}
                  placeholder="e.g. 25"
                  className="h-10 border-[#E8E6E2] focus:border-(--e-orange)"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Describe this commission..." rows={2}
                className="border-[#E8E6E2] focus:border-(--e-orange) text-sm resize-none" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger className="h-10 border-[#E8E6E2]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#E8E6E2]">
              <Button variant="outline" onClick={closeModal} className="border-[#E8E6E2]">Cancel</Button>
              <Button onClick={() => save.mutate()} disabled={save.isPending}
                className="bg-(--e-orange) hover:bg-(--e-orange-hover) text-white gap-1.5">
                {save.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save Commission
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
