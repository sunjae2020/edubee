import { useState } from "react";
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
import { Layers, Pencil, Plus, Loader2, Search } from "lucide-react";
import { format } from "date-fns";
import { SortableTh, useSortState, useSorted } from "@/components/ui/sortable-th";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface ProductGroup {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  productCount?: number;
  createdOn?: string;
}

function StatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase();
  if (s === "active")   return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#DCFCE7] text-[#16A34A]">Active</span>;
  return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F4F3F1] text-[#57534E]">Inactive</span>;
}

interface FormState { name: string; description: string; status: string }
const EMPTY_FORM: FormState = { name: "", description: "", status: "Active" };

export default function ProductGroups() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const { sortBy, sortDir, onSort } = useSortState();

  const [search, setSearch]       = useState("");
  const [statusFilter, setStatus] = useState("Active");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState<ProductGroup | null>(null);
  const [form, setForm]           = useState<FormState>(EMPTY_FORM);
  const [nameError, setNameError] = useState("");

  const queryKey = ["product-groups", search, statusFilter];
  const { data: groups = [], isLoading } = useQuery<ProductGroup[]>({
    queryKey,
    queryFn: () => {
      const p = new URLSearchParams();
      if (search) p.set("search", search);
      if (statusFilter !== "all") p.set("status", statusFilter);
      return axios.get(`${BASE}/api/product-groups?${p}`).then(r => r.data);
    },
  });

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setNameError(""); setModalOpen(true); };
  const openEdit   = (g: ProductGroup) => { setEditing(g); setForm({ name: g.name, description: g.description ?? "", status: g.status }); setNameError(""); setModalOpen(true); };
  const closeModal = () => setModalOpen(false);

  const save = useMutation({
    mutationFn: () => {
      if (!form.name.trim()) { setNameError("Name is required"); return Promise.reject(); }
      setNameError("");
      if (editing) return axios.put(`${BASE}/api/product-groups/${editing.id}`, form).then(r => r.data);
      return axios.post(`${BASE}/api/product-groups`, form).then(r => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-groups"] });
      closeModal();
      toast({ title: editing ? "Product group updated" : "Product group created" });
    },
    onError: (err: any) => {
      if (err?.message) toast({ variant: "destructive", title: err.message });
    },
  });

  const deactivate = useMutation({
    mutationFn: (id: string) => axios.delete(`${BASE}/api/product-groups/${id}`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-groups"] });
      toast({ title: "Product group deactivated" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to deactivate" }),
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1C1917]">Products Group</h1>
          <p className="text-sm text-[#57534E] mt-0.5">Manage product categories for your service offerings</p>
        </div>
        <Button onClick={openCreate} className="bg-[#F5821F] hover:bg-[#D96A0A] text-white gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Add Product Group
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8A29E]" />
          <Input
            placeholder="Search by name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9 border-[#E8E6E2]"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatus}>
          <SelectTrigger className="w-36 h-9 border-[#E8E6E2]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#E8E6E2] overflow-x-auto shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#F4F3F1] bg-[#FAFAF9]">
              <>
              <SortableTh key="Name" col="name" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-medium text-[#57534E] uppercase tracking-wide">Name</SortableTh>
              <SortableTh key="Description" col="description" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-medium text-[#57534E] uppercase tracking-wide">Description</SortableTh>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#57534E] uppercase tracking-wide">Types</th>
              <SortableTh key="Status" col="status" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-medium text-[#57534E] uppercase tracking-wide">Status</SortableTh>
              <SortableTh key="Created" col="createdOn" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-medium text-[#57534E] uppercase tracking-wide">Created</SortableTh>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#57534E] uppercase tracking-wide">Actions</th>
            </>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F4F3F1]">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>{[...Array(6)].map((_, j) => (
                  <td key={j} className="px-4 py-3"><div className="h-4 bg-[#F4F3F1] rounded animate-pulse" /></td>
                ))}</tr>
              ))
            ) : groups.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-16 text-center text-[#A8A29E] text-sm">No product groups found</td></tr>
            ) : groups.map(g => (
              <tr key={g.id} className="hover:bg-[#FEF0E3] cursor-pointer transition-colors">
                <td className="px-4 py-3 font-medium text-[#1C1917]">
                  <button
                    onClick={() => navigate(`/admin/product-groups/${g.id}`)}
                    className="flex items-center gap-2 text-left hover:text-[#F5821F] transition-colors"
                  >
                    <Layers className="w-4 h-4 text-[#F5821F] shrink-0" strokeWidth={1.5} />
                    <span className="hover:underline">{g.name}</span>
                  </button>
                </td>
                <td className="px-4 py-3 text-[#57534E] max-w-xs">
                  {g.description ? (g.description.length > 60 ? g.description.slice(0, 60) + "…" : g.description) : "—"}
                </td>
                <td className="px-4 py-3 text-[#57534E]">{g.productCount ?? 0}</td>
                <td className="px-4 py-3"><StatusBadge status={g.status} /></td>
                <td className="px-4 py-3 text-[#A8A29E] text-xs">{g.createdOn ? format(new Date(g.createdOn), "dd MMM yyyy") : "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-[#57534E] hover:bg-[#F4F3F1]" onClick={() => openEdit(g)}>
                      <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </Button>
                    {g.status === "Active" && (
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-[#DC2626] hover:bg-[#FEF2F2]"
                        onClick={() => deactivate.mutate(g.id)}
                        disabled={deactivate.isPending}>
                        Deactivate
                      </Button>
                    )}
                  </div>
                </td>
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
              {editing ? "Edit Product Group" : "Add Product Group"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">Name <span className="text-[#DC2626]">*</span></Label>
              <Input
                value={form.name}
                onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setNameError(""); }}
                placeholder="e.g. Language School"
                className={`h-10 border-[#E8E6E2] focus:border-[#F5821F] ${nameError ? "border-[#DC2626]" : ""}`}
              />
              {nameError && <p className="text-xs text-[#DC2626]">{nameError}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">Description</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Describe this product group..."
                rows={3}
                className="border-[#E8E6E2] focus:border-[#F5821F] text-sm resize-none"
              />
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
                className="bg-[#F5821F] hover:bg-[#D96A0A] text-white gap-1.5">
                {save.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save Product Group
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
