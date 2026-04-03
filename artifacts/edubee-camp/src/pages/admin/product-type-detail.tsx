import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SystemInfoSection } from "@/components/shared/SystemInfoSection";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, RotateCcw, Loader2, Tag } from "lucide-react";
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
  createdOn?: string | null;
  modifiedOn?: string | null;
}

const SERVICE_MODULE_OPTIONS = [
  { value: "__none",        label: "— None —"         },
  { value: "study_abroad",  label: "Study Abroad"     },
  { value: "accommodation", label: "Accommodation"    },
  { value: "internship",    label: "Internship"       },
  { value: "guardian",      label: "Guardian"         },
  { value: "settlement",    label: "Settlement"       },
  { value: "other",         label: "Other Services"   },
  { value: "visa",          label: "Visa Services"    },
  { value: "pickup",        label: "Pickup / Transfer"},
  { value: "tour",          label: "Tour Management"  },
];

const EMPTY_FORM = { name: "", productGroupId: "__none", serviceModuleType: "__none", description: "", status: "Active" };

function StatusBadge({ status }: { status: string }) {
  if (status?.toLowerCase() === "active")
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#DCFCE7] text-[#16A34A]">Active</span>;
  return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F4F3F1] text-[#57534E]">Inactive</span>;
}

export default function ProductTypeDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [form, setForm]         = useState(EMPTY_FORM);
  const [original, setOriginal] = useState(EMPTY_FORM);
  const [nameError, setNameError]   = useState("");
  const [smodError, setSmodError]   = useState("");

  const isDirty = JSON.stringify(form) !== JSON.stringify(original);

  const { data: productType, isLoading } = useQuery<ProductType>({
    queryKey: ["product-type", id],
    queryFn: () => axios.get(`${BASE}/api/product-types/${id}`).then(r => r.data),
    enabled: !!id,
  });

  useEffect(() => {
    if (!productType) return;
    const snap = {
      name:              productType.name,
      productGroupId:    productType.productGroupId    ?? "__none",
      serviceModuleType: productType.serviceModuleType ?? "__none",
      description:       productType.description       ?? "",
      status:            productType.status,
    };
    setForm(snap);
    setOriginal(snap);
  }, [productType]);

  const { data: groups = [] } = useQuery<ProductGroup[]>({
    queryKey: ["product-groups-active"],
    queryFn: () => axios.get(`${BASE}/api/product-groups?status=Active`).then(r => r.data),
  });

  const discard = () => {
    setForm(original);
    setNameError("");
    setSmodError("");
  };

  const toPayload = () => ({
    name:              form.name,
    productGroupId:    form.productGroupId    === "__none" ? null : form.productGroupId,
    serviceModuleType: form.serviceModuleType === "__none" ? null : form.serviceModuleType,
    description:       form.description,
    status:            form.status,
  });

  const save = useMutation({
    mutationFn: () => {
      let valid = true;
      if (!form.name.trim()) { setNameError("Name is required"); valid = false; } else setNameError("");
      if (form.serviceModuleType === "__none") { setSmodError("Service Module is required"); valid = false; } else setSmodError("");
      if (!valid) return Promise.reject();
      return axios.put(`${BASE}/api/product-types/${id}`, toPayload()).then(r => r.data);
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["product-type", id] });
      qc.invalidateQueries({ queryKey: ["product-types"] });
      toast({ title: "Product type saved" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to save" }),
  });

  if (isLoading) {
    return (
      <div className="space-y-5 animate-pulse max-w-3xl">
        <div className="h-8 w-48 bg-[#F4F3F1] rounded" />
        <div className="h-64 bg-[#F4F3F1] rounded-xl" />
      </div>
    );
  }

  if (!productType) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-[#A8A29E]">
        <Tag className="w-10 h-10 mb-3" strokeWidth={1} />
        <p className="text-sm">Product type not found.</p>
        <Button variant="link" className="text-(--e-orange) mt-2" onClick={() => navigate("/admin/product-types")}>
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
            onClick={() => navigate("/admin/product-types")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 flex-wrap">
            <Tag className="w-5 h-5 text-(--e-orange)" strokeWidth={1.5} />
            <h1 className="text-xl font-bold text-[#1C1917] leading-none">{productType.name}</h1>
            <StatusBadge status={form.status} />
          </div>
        </div>

        {isDirty && (
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={discard} className="h-9 gap-1.5 text-stone-600">
              <RotateCcw size={13} /> Discard
            </Button>
            <Button size="sm" disabled={save.isPending} onClick={() => save.mutate()}
              className="h-9 gap-1.5 text-white" style={{ background: "var(--e-orange)" }}>
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
          Product Type Info
        </h2>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">
            Name <span className="text-[#DC2626]">*</span>
          </Label>
          <Input
            value={form.name}
            onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setNameError(""); }}
            className={`h-10 border-[#E8E6E2] focus:border-(--e-orange) focus-visible:ring-0 ${nameError ? "border-[#DC2626]" : ""}`}
          />
          {nameError && <p className="text-xs text-[#DC2626]">{nameError}</p>}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">Product Group</Label>
          <Select value={form.productGroupId} onValueChange={v => setForm(f => ({ ...f, productGroupId: v }))}>
            <SelectTrigger className="h-10 border-[#E8E6E2] focus:ring-0">
              <SelectValue placeholder="Select group..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">— None —</SelectItem>
              {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">
            Service Module Type <span className="text-[#DC2626]">*</span>
          </Label>
          <Select value={form.serviceModuleType} onValueChange={v => { setForm(f => ({ ...f, serviceModuleType: v })); setSmodError(""); }}>
            <SelectTrigger className={`h-10 border-[#E8E6E2] focus:ring-0 ${smodError ? "border-[#DC2626]" : ""}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SERVICE_MODULE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {smodError
            ? <p className="text-xs text-[#DC2626]">{smodError}</p>
            : <p className="text-xs text-[#A8A29E]">When a contract is created with this product type, the corresponding service record will be auto-generated.</p>
          }
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">Description</Label>
          <Textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={3}
            className="border-[#E8E6E2] focus:border-(--e-orange) focus-visible:ring-0 text-sm resize-none"
            placeholder="Describe this product type..."
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

      <SystemInfoSection owner={null} createdAt={productType.createdOn} updatedAt={productType.modifiedOn} />
    </div>
  );
}
