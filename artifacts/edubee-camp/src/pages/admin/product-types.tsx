import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Tag, Pencil, Plus, Loader2, Search } from "lucide-react";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface ProductGroup { id: string; name: string; status: string }
interface ProductType {
  id: string;
  name: string;
  productGroupId?: string | null;
  productGroupName?: string | null;
  serviceModuleType?: string | null;
  description?: string | null;
  status: string;
  createdOn?: string;
}

const SERVICE_MODULE_OPTIONS = [
  { value: "__none", label: "— None —" },
  { value: "study_abroad",   label: "Study Abroad" },
  { value: "pickup",         label: "Pickup" },
  { value: "accommodation",  label: "Accommodation" },
  { value: "internship",     label: "Internship" },
  { value: "settlement",     label: "Settlement" },
  { value: "guardian",       label: "Guardian" },
  { value: "camp",           label: "Camp" },
];

function serviceLabel(v?: string | null) {
  return SERVICE_MODULE_OPTIONS.find(o => o.value === v)?.label ?? "—";
}

function StatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase();
  if (s === "active") return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#DCFCE7] text-[#16A34A]">Active</span>;
  return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F4F3F1] text-[#57534E]">Inactive</span>;
}

interface FormState { name: string; productGroupId: string; serviceModuleType: string; description: string; status: string }
const EMPTY_FORM: FormState = { name: "", productGroupId: "__none", serviceModuleType: "__none", description: "", status: "Active" };

export default function ProductTypes() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [search, setSearch]          = useState("");
  const [statusFilter, setStatus]    = useState("Active");
  const [groupFilter, setGroupFilter]= useState("all");
  const [modalOpen, setModalOpen]    = useState(false);
  const [editing, setEditing]        = useState<ProductType | null>(null);
  const [form, setForm]              = useState<FormState>(EMPTY_FORM);
  const [nameError, setNameError]    = useState("");

  const { data: groups = [] } = useQuery<ProductGroup[]>({
    queryKey: ["product-groups-active"],
    queryFn: () => axios.get(`${BASE}/api/product-groups?status=Active`).then(r => r.data),
  });

  const queryKey = ["product-types", search, statusFilter, groupFilter];
  const { data: types = [], isLoading } = useQuery<ProductType[]>({
    queryKey,
    queryFn: () => {
      const p = new URLSearchParams();
      if (search) p.set("search", search);
      if (statusFilter !== "all") p.set("status", statusFilter);
      if (groupFilter !== "all") p.set("product_group_id", groupFilter);
      return axios.get(`${BASE}/api/product-types?${p}`).then(r => r.data);
    },
  });

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setNameError(""); setModalOpen(true); };
  const openEdit   = (t: ProductType) => {
    setEditing(t);
    setForm({
      name: t.name,
      productGroupId: t.productGroupId ?? "__none",
      serviceModuleType: t.serviceModuleType ?? "__none",
      description: t.description ?? "",
      status: t.status,
    });
    setNameError("");
    setModalOpen(true);
  };
  const closeModal = () => setModalOpen(false);

  const toPayload = (f: FormState) => ({
    name: f.name,
    productGroupId: f.productGroupId === "__none" ? null : f.productGroupId,
    serviceModuleType: f.serviceModuleType === "__none" ? null : f.serviceModuleType,
    description: f.description,
    status: f.status,
  });

  const save = useMutation({
    mutationFn: () => {
      if (!form.name.trim()) { setNameError("Name is required"); return Promise.reject(); }
      setNameError("");
      if (editing) return axios.put(`${BASE}/api/product-types/${editing.id}`, toPayload(form)).then(r => r.data);
      return axios.post(`${BASE}/api/product-types`, toPayload(form)).then(r => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-types"] });
      closeModal();
      toast({ title: editing ? "Product type updated" : "Product type created" });
    },
    onError: (err: any) => {
      if (err?.message) toast({ variant: "destructive", title: err.message });
    },
  });

  const deactivate = useMutation({
    mutationFn: (id: string) => axios.delete(`${BASE}/api/product-types/${id}`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-types"] });
      toast({ title: "Product type deactivated" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to deactivate" }),
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1C1917]">Products Type</h1>
          <p className="text-sm text-[#57534E] mt-0.5">Define product types and map them to service automation modules</p>
        </div>
        <Button onClick={openCreate} className="bg-[#F5821F] hover:bg-[#D96A0A] text-white gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Add Product Type
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8A29E]" />
          <Input placeholder="Search by name..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 border-[#E8E6E2]" />
        </div>
        <Select value={groupFilter} onValueChange={setGroupFilter}>
          <SelectTrigger className="w-44 h-9 border-[#E8E6E2]"><SelectValue placeholder="All Groups" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Groups</SelectItem>
            {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
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

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#E8E6E2] overflow-x-auto shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#F4F3F1] bg-[#FAFAF9]">
              {["Name", "Product Group", "Service Module", "Status", "Created", "Actions"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-[#57534E] uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F4F3F1]">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>{[...Array(6)].map((_, j) => (
                  <td key={j} className="px-4 py-3"><div className="h-4 bg-[#F4F3F1] rounded animate-pulse" /></td>
                ))}</tr>
              ))
            ) : types.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-16 text-center text-[#A8A29E] text-sm">No product types found</td></tr>
            ) : types.map(t => (
              <tr key={t.id} className="hover:bg-[#FAFAF9] transition-colors">
                <td className="px-4 py-3 font-medium text-[#1C1917]">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-[#F5821F] shrink-0" strokeWidth={1.5} />
                    {t.name}
                  </div>
                </td>
                <td className="px-4 py-3 text-[#57534E]">{t.productGroupName ?? "—"}</td>
                <td className="px-4 py-3">
                  {t.serviceModuleType ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#FEF0E3] text-[#F5821F]">
                      {serviceLabel(t.serviceModuleType)}
                    </span>
                  ) : "—"}
                </td>
                <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                <td className="px-4 py-3 text-[#A8A29E] text-xs">{t.createdOn ? format(new Date(t.createdOn), "dd MMM yyyy") : "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-[#57534E] hover:bg-[#F4F3F1]" onClick={() => openEdit(t)}>
                      <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </Button>
                    {t.status === "Active" && (
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-[#DC2626] hover:bg-[#FEF2F2]"
                        onClick={() => deactivate.mutate(t.id)} disabled={deactivate.isPending}>
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
              {editing ? "Edit Product Type" : "Add Product Type"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">Name <span className="text-[#DC2626]">*</span></Label>
              <Input value={form.name} onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setNameError(""); }}
                placeholder="e.g. Language School Program"
                className={`h-10 border-[#E8E6E2] focus:border-[#F5821F] ${nameError ? "border-[#DC2626]" : ""}`} />
              {nameError && <p className="text-xs text-[#DC2626]">{nameError}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">Product Group <span className="text-[#DC2626]">*</span></Label>
              <Select value={form.productGroupId} onValueChange={v => setForm(f => ({ ...f, productGroupId: v }))}>
                <SelectTrigger className="h-10 border-[#E8E6E2]"><SelectValue placeholder="Select group..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">— None —</SelectItem>
                  {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">Service Module Type</Label>
              <Select value={form.serviceModuleType} onValueChange={v => setForm(f => ({ ...f, serviceModuleType: v }))}>
                <SelectTrigger className="h-10 border-[#E8E6E2]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SERVICE_MODULE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-[#A8A29E]">When a contract is created with this product type, the corresponding service management record will be automatically generated.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Describe this product type..." rows={3}
                className="border-[#E8E6E2] focus:border-[#F5821F] text-sm resize-none" />
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
                Save Product Type
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
