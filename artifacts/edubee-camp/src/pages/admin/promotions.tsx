import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Percent, Pencil, Plus, Loader2, Search } from "lucide-react";
import { format, isAfter, isBefore, parseISO } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Product { id: string; productName: string; providerAccountId?: string | null }
interface Promotion {
  id: string;
  name: string;
  productId?: string | null;
  productName?: string | null;
  accountId?: string | null;
  accountName?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
  promotionPrice?: string | null;
  status: string;
  createdOn?: string;
}

function promoStatus(p: Promotion): { label: string; cls: string } {
  const today = new Date();
  if (p.status?.toLowerCase() === "inactive") return { label: "Inactive", cls: "bg-[#F4F3F1] text-[#57534E]" };
  if (p.fromDate && p.toDate) {
    const from = parseISO(p.fromDate);
    const to   = parseISO(p.toDate);
    if (isBefore(today, from)) return { label: "Upcoming", cls: "bg-[#FEF9C3] text-[#CA8A04]" };
    if (isAfter(today, to))   return { label: "Expired",  cls: "bg-[#F4F3F1] text-[#A8A29E]" };
    return { label: "In Progress", cls: "bg-[#FEF0E3] text-[#F5821F]" };
  }
  return { label: "Active", cls: "bg-[#DCFCE7] text-[#16A34A]" };
}

function PromoBadge({ p }: { p: Promotion }) {
  const { label, cls } = promoStatus(p);
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>;
}

interface FormState {
  name: string; productId: string; accountName: string;
  fromDate: string; toDate: string; promotionPrice: string; status: string;
}
const EMPTY_FORM: FormState = { name: "", productId: "__none", accountName: "", fromDate: "", toDate: "", promotionPrice: "", status: "Active" };

export default function Promotions() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [search, setSearch]        = useState("");
  const [statusFilter, setStatus]  = useState("all");
  const [productFilter, setProduct]= useState("all");
  const [modalOpen, setModalOpen]  = useState(false);
  const [editing, setEditing]      = useState<Promotion | null>(null);
  const [form, setForm]            = useState<FormState>(EMPTY_FORM);
  const [nameError, setNameError]  = useState("");

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["products-active"],
    queryFn: () => axios.get(`${BASE}/api/products?status=active`).then(r => r.data?.data ?? r.data),
  });

  const queryKey = ["promotions", search, statusFilter, productFilter];
  const { data: promos = [], isLoading } = useQuery<Promotion[]>({
    queryKey,
    queryFn: () => {
      const p = new URLSearchParams();
      if (search)        p.set("search", search);
      if (statusFilter !== "all")  p.set("status", statusFilter);
      if (productFilter !== "all") p.set("product_id", productFilter);
      return axios.get(`${BASE}/api/promotions?${p}`).then(r => r.data);
    },
  });

  const handleProductSelect = (productId: string) => {
    if (productId === "__none") {
      setForm(f => ({ ...f, productId: "__none", accountName: "" }));
      return;
    }
    const found = products.find(p => p.id === productId);
    setForm(f => ({ ...f, productId }));
  };

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setNameError(""); setModalOpen(true); };
  const openEdit   = (p: Promotion) => {
    setEditing(p);
    setForm({
      name:           p.name,
      productId:      p.productId ?? "__none",
      accountName:    p.accountName ?? "",
      fromDate:       p.fromDate ?? "",
      toDate:         p.toDate ?? "",
      promotionPrice: p.promotionPrice ?? "",
      status:         p.status,
    });
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
        productId:      form.productId === "__none" ? null : form.productId,
        fromDate:       form.fromDate || null,
        toDate:         form.toDate || null,
        promotionPrice: form.promotionPrice,
        status:         form.status,
      };
      if (editing) return axios.put(`${BASE}/api/promotions/${editing.id}`, payload).then(r => r.data);
      return axios.post(`${BASE}/api/promotions`, payload).then(r => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["promotions"] });
      closeModal();
      toast({ title: editing ? "Promotion updated" : "Promotion created" });
    },
    onError: (err: any) => {
      if (err?.message) toast({ variant: "destructive", title: err.message });
    },
  });

  const deactivate = useMutation({
    mutationFn: (id: string) => axios.delete(`${BASE}/api/promotions/${id}`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["promotions"] });
      toast({ title: "Promotion deactivated" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to deactivate" }),
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1C1917]">Promotions</h1>
          <p className="text-sm text-[#57534E] mt-0.5">Manage promotional pricing for products</p>
        </div>
        <Button onClick={openCreate} className="bg-[#F5821F] hover:bg-[#D96A0A] text-white gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Add Promotion
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8A29E]" />
          <Input placeholder="Search by name..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 border-[#E8E6E2]" />
        </div>
        <Select value={productFilter} onValueChange={setProduct}>
          <SelectTrigger className="w-48 h-9 border-[#E8E6E2]"><SelectValue placeholder="All Products" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Products</SelectItem>
            {products.map(p => <SelectItem key={p.id} value={p.id}>{p.productName}</SelectItem>)}
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
              {["Name", "Product", "Provider", "Period", "Promo Price", "Status", "Actions"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-[#57534E] uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F4F3F1]">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>{[...Array(7)].map((_, j) => (
                  <td key={j} className="px-4 py-3"><div className="h-4 bg-[#F4F3F1] rounded animate-pulse" /></td>
                ))}</tr>
              ))
            ) : promos.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-16 text-center text-[#A8A29E] text-sm">No promotions found</td></tr>
            ) : promos.map(p => (
              <tr key={p.id} className="hover:bg-[#FAFAF9] transition-colors">
                <td className="px-4 py-3 font-medium text-[#1C1917]">
                  <div className="flex items-center gap-2">
                    <Percent className="w-4 h-4 text-[#F5821F] shrink-0" strokeWidth={1.5} />
                    {p.name}
                  </div>
                </td>
                <td className="px-4 py-3 text-[#57534E]">{p.productName ?? "—"}</td>
                <td className="px-4 py-3 text-[#57534E]">{p.accountName ?? "—"}</td>
                <td className="px-4 py-3 text-[#57534E] text-xs">
                  {p.fromDate && p.toDate
                    ? `${format(parseISO(p.fromDate), "dd MMM yyyy")} – ${format(parseISO(p.toDate), "dd MMM yyyy")}`
                    : "—"}
                </td>
                <td className="px-4 py-3 text-[#1C1917] font-medium">{p.promotionPrice ?? "—"}</td>
                <td className="px-4 py-3"><PromoBadge p={p} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-[#57534E] hover:bg-[#F4F3F1]" onClick={() => openEdit(p)}>
                      <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </Button>
                    {p.status === "Active" && (
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-[#DC2626] hover:bg-[#FEF2F2]"
                        onClick={() => deactivate.mutate(p.id)} disabled={deactivate.isPending}>
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
              {editing ? "Edit Promotion" : "Add Promotion"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">Name <span className="text-[#DC2626]">*</span></Label>
              <Input value={form.name} onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setNameError(""); }}
                placeholder="e.g. Summer Early Bird 2025"
                className={`h-10 border-[#E8E6E2] focus:border-[#F5821F] ${nameError ? "border-[#DC2626]" : ""}`} />
              {nameError && <p className="text-xs text-[#DC2626]">{nameError}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">Product <span className="text-[#DC2626]">*</span></Label>
              <Select value={form.productId} onValueChange={handleProductSelect}>
                <SelectTrigger className="h-10 border-[#E8E6E2]"><SelectValue placeholder="Select product..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">— None —</SelectItem>
                  {products.map(p => <SelectItem key={p.id} value={p.id}>{p.productName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {form.accountName && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">Provider Account</Label>
                <Input value={form.accountName} readOnly className="h-10 border-[#E8E6E2] bg-[#FAFAF9] text-[#57534E]" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">From Date</Label>
                <Input type="date" value={form.fromDate} onChange={e => setForm(f => ({ ...f, fromDate: e.target.value }))}
                  className="h-10 border-[#E8E6E2] focus:border-[#F5821F]" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">To Date</Label>
                <Input type="date" value={form.toDate} onChange={e => setForm(f => ({ ...f, toDate: e.target.value }))}
                  className="h-10 border-[#E8E6E2] focus:border-[#F5821F]" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">Promotion Price <span className="text-[#DC2626]">*</span></Label>
              <Input value={form.promotionPrice} onChange={e => setForm(f => ({ ...f, promotionPrice: e.target.value }))}
                placeholder="e.g. $320/week, 10% OFF first term, Free enrollment fee"
                className="h-10 border-[#E8E6E2] focus:border-[#F5821F]" />
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
                Save Promotion
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
