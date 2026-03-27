import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SystemInfoSection } from "@/components/shared/SystemInfoSection";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, RotateCcw, Loader2, Percent } from "lucide-react";
import { format, isAfter, isBefore, parseISO } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Product { id: string; productName: string }
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
  createdOn?: string | null;
  modifiedOn?: string | null;
}

interface FormState {
  name: string;
  productId: string;
  fromDate: string;
  toDate: string;
  promotionPrice: string;
  status: string;
}

const EMPTY_FORM: FormState = {
  name: "", productId: "__none", fromDate: "", toDate: "", promotionPrice: "", status: "Active",
};

function promoStatus(p: Promotion): { label: string; cls: string } {
  const today = new Date();
  if (p.status?.toLowerCase() === "inactive") return { label: "Inactive", cls: "bg-[#F4F3F1] text-[#57534E]" };
  if (p.fromDate && p.toDate) {
    const from = parseISO(p.fromDate);
    const to   = parseISO(p.toDate);
    if (isBefore(today, from)) return { label: "Upcoming",    cls: "bg-[#FEF9C3] text-[#CA8A04]" };
    if (isAfter(today, to))   return { label: "Expired",     cls: "bg-[#F4F3F1] text-[#A8A29E]" };
    return                           { label: "In Progress",  cls: "bg-[#FEF0E3] text-[#F5821F]" };
  }
  return { label: "Active", cls: "bg-[#DCFCE7] text-[#16A34A]" };
}

function StatusBadge({ promo }: { promo: Promotion }) {
  const { label, cls } = promoStatus(promo);
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>;
}

export default function PromotionDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [form, setForm]         = useState<FormState>(EMPTY_FORM);
  const [original, setOriginal] = useState<FormState>(EMPTY_FORM);
  const [nameError, setNameError] = useState("");

  const isDirty = JSON.stringify(form) !== JSON.stringify(original);

  const { data: promo, isLoading } = useQuery<Promotion>({
    queryKey: ["promotion", id],
    queryFn: () => axios.get(`${BASE}/api/promotions/${id}`).then(r => r.data),
    enabled: !!id,
  });

  useEffect(() => {
    if (!promo) return;
    const snap: FormState = {
      name:           promo.name,
      productId:      promo.productId ?? "__none",
      fromDate:       promo.fromDate ?? "",
      toDate:         promo.toDate ?? "",
      promotionPrice: promo.promotionPrice ?? "",
      status:         promo.status,
    };
    setForm(snap);
    setOriginal(snap);
  }, [promo]);

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["products-active"],
    queryFn: () => axios.get(`${BASE}/api/products?status=active`).then(r => r.data?.data ?? r.data),
  });

  const discard = () => { setForm(original); setNameError(""); };

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
      return axios.put(`${BASE}/api/promotions/${id}`, payload).then(r => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["promotion", id] });
      qc.invalidateQueries({ queryKey: ["promotions"] });
      toast({ title: "Promotion saved" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to save promotion" }),
  });

  if (isLoading) {
    return (
      <div className="space-y-5 animate-pulse max-w-3xl">
        <div className="h-8 w-48 bg-[#F4F3F1] rounded" />
        <div className="h-64 bg-[#F4F3F1] rounded-xl" />
      </div>
    );
  }

  if (!promo) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-[#A8A29E]">
        <Percent className="w-10 h-10 mb-3" strokeWidth={1} />
        <p className="text-sm">Promotion not found.</p>
        <Button variant="link" className="text-[#F5821F] mt-2" onClick={() => navigate("/admin/promotions")}>
          Back to list
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost" size="icon"
            className="h-8 w-8 text-[#57534E] hover:bg-[#F4F3F1] rounded-lg"
            onClick={() => navigate("/admin/promotions")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 flex-wrap">
            <Percent className="w-5 h-5 text-[#F5821F]" strokeWidth={1.5} />
            <h1 className="text-xl font-bold text-[#1C1917] leading-none">{promo.name}</h1>
            <StatusBadge promo={promo} />
          </div>
        </div>

        {isDirty && (
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={discard} className="h-9 gap-1.5 text-stone-600">
              <RotateCcw size={13} /> Discard
            </Button>
            <Button size="sm" disabled={save.isPending} onClick={() => save.mutate()}
              className="h-9 gap-1.5 text-white" style={{ background: "#F5821F" }}>
              {save.isPending
                ? <><Loader2 size={13} className="animate-spin" /> Saving…</>
                : <><Save size={13} /> Save Changes</>}
            </Button>
          </div>
        )}
      </div>

      {/* Unsaved changes banner */}
      {isDirty && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-[#FEF9C3] border border-[#CA8A04]/30 rounded-xl text-sm text-[#854D0E]">
          <span className="w-2 h-2 rounded-full bg-[#CA8A04] shrink-0" />
          You have unsaved changes — click <strong className="mx-1">Save Changes</strong> to apply.
        </div>
      )}

      {/* Detail card */}
      <div className="bg-white rounded-xl border border-[#E8E6E2] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6 space-y-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[#A8A29E] border-b border-[#F4F3F1] pb-3">
          Promotion Info
        </h2>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">
            Name <span className="text-[#DC2626]">*</span>
          </Label>
          <Input
            value={form.name}
            onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setNameError(""); }}
            placeholder="e.g. Summer Early Bird 2025"
            className={`h-10 border-[#E8E6E2] focus:border-[#F5821F] focus-visible:ring-0 ${nameError ? "border-[#DC2626]" : ""}`}
          />
          {nameError && <p className="text-xs text-[#DC2626]">{nameError}</p>}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">Product</Label>
          <Select value={form.productId} onValueChange={v => setForm(f => ({ ...f, productId: v }))}>
            <SelectTrigger className="h-10 border-[#E8E6E2] focus:ring-0">
              <SelectValue placeholder="Select product..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">— None —</SelectItem>
              {products.map(p => <SelectItem key={p.id} value={p.id}>{p.productName}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {promo.accountName && (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">Provider Account</Label>
            <Input value={promo.accountName} readOnly className="h-10 border-[#E8E6E2] bg-[#FAFAF9] text-[#57534E]" />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">From Date</Label>
            <Input
              type="date" value={form.fromDate}
              onChange={e => setForm(f => ({ ...f, fromDate: e.target.value }))}
              className="h-10 border-[#E8E6E2] focus:border-[#F5821F] focus-visible:ring-0"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">To Date</Label>
            <Input
              type="date" value={form.toDate}
              onChange={e => setForm(f => ({ ...f, toDate: e.target.value }))}
              className="h-10 border-[#E8E6E2] focus:border-[#F5821F] focus-visible:ring-0"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">Promotion Price</Label>
          <Input
            value={form.promotionPrice}
            onChange={e => setForm(f => ({ ...f, promotionPrice: e.target.value }))}
            placeholder="e.g. $320/week, 10% OFF first term, Free enrollment fee"
            className="h-10 border-[#E8E6E2] focus:border-[#F5821F] focus-visible:ring-0"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">Status</Label>
          <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
            <SelectTrigger className="h-10 border-[#E8E6E2] focus:ring-0 w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <SystemInfoSection owner={null} createdAt={promo.createdOn} updatedAt={promo.modifiedOn} />
    </div>
  );
}
