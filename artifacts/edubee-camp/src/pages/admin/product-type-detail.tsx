import { useState } from "react";
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
import {
  ArrowLeft, Pencil, Save, X, Loader2, Tag, Calendar, Clock,
} from "lucide-react";
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
  { value: "__none",        label: "— None —"              },
  { value: "study_abroad",  label: "Study Abroad"          },
  { value: "accommodation", label: "Accommodation"          },
  { value: "internship",    label: "Internship"             },
  { value: "guardian",      label: "Guardian"               },
  { value: "settlement",    label: "Settlement"             },
  { value: "other",         label: "Other Services"         },
  { value: "visa",          label: "Visa Services"          },
  { value: "pickup",        label: "Pickup / Transfer"      },
  { value: "tour",          label: "Tour Management"        },
];

function serviceLabel(v?: string | null) {
  return SERVICE_MODULE_OPTIONS.find(o => o.value === v)?.label ?? v ?? "—";
}

function StatusBadge({ status }: { status: string }) {
  if (status?.toLowerCase() === "active")
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#DCFCE7] text-[#16A34A]">Active</span>;
  return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F4F3F1] text-[#57534E]">Inactive</span>;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-[#A8A29E]">{label}</span>
      <div className="text-sm text-[#1C1917]">{value ?? "—"}</div>
    </div>
  );
}

export default function ProductTypeDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [editing, setEditing]       = useState(false);
  const [nameError, setNameError]   = useState("");
  const [smodError, setSmodError]   = useState("");
  const [form, setForm] = useState({
    name: "", productGroupId: "__none", serviceModuleType: "__none", description: "", status: "",
  });

  const { data: productType, isLoading } = useQuery<ProductType>({
    queryKey: ["product-type", id],
    queryFn: () => axios.get(`${BASE}/api/product-types/${id}`).then(r => r.data),
    enabled: !!id,
    onSuccess: (data) => {
      setForm({
        name:              data.name,
        productGroupId:    data.productGroupId    ?? "__none",
        serviceModuleType: data.serviceModuleType ?? "__none",
        description:       data.description       ?? "",
        status:            data.status,
      });
    },
  });

  const { data: groups = [] } = useQuery<ProductGroup[]>({
    queryKey: ["product-groups-active"],
    queryFn: () => axios.get(`${BASE}/api/product-groups?status=Active`).then(r => r.data),
  });

  const startEdit = () => {
    if (productType) {
      setForm({
        name:              productType.name,
        productGroupId:    productType.productGroupId    ?? "__none",
        serviceModuleType: productType.serviceModuleType ?? "__none",
        description:       productType.description       ?? "",
        status:            productType.status,
      });
    }
    setNameError("");
    setEditing(true);
  };
  const cancelEdit = () => { setEditing(false); setNameError(""); setSmodError(""); };

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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-type", id] });
      qc.invalidateQueries({ queryKey: ["product-types"] });
      setEditing(false);
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
        <Button variant="link" className="text-[#F5821F] mt-2" onClick={() => navigate("/admin/product-types")}>
          Back to list
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back + title bar */}
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
            <Tag className="w-5 h-5 text-[#F5821F]" strokeWidth={1.5} />
            <h1 className="text-xl font-bold text-[#1C1917] leading-none">{productType.name}</h1>
            <StatusBadge status={productType.status} />
          </div>
        </div>

        {!editing ? (
          <Button onClick={startEdit} variant="outline" className="gap-2 border-[#E8E6E2] h-9 shrink-0">
            <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} /> Edit
          </Button>
        ) : (
          <div className="flex gap-2 shrink-0">
            <Button variant="ghost" onClick={cancelEdit} className="h-9 gap-1.5 text-[#57534E]">
              <X className="w-3.5 h-3.5" /> Cancel
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}
              className="bg-[#F5821F] hover:bg-[#D96A0A] text-white h-9 gap-1.5">
              {save.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save
            </Button>
          </div>
        )}
      </div>

      {/* Detail card */}
      <div className="bg-white rounded-xl border border-[#E8E6E2] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6 space-y-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[#A8A29E] border-b border-[#F4F3F1] pb-3">
          Product Type Info
        </h2>

        {!editing ? (
          <div className="grid grid-cols-2 gap-x-8 gap-y-5">
            <div className="col-span-2">
              <InfoRow label="Name" value={<span className="font-semibold">{productType.name}</span>} />
            </div>
            <InfoRow
              label="Product Group"
              value={productType.productGroupName
                ? <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F5821F] inline-block" />
                    {productType.productGroupName}
                  </span>
                : <span className="text-[#A8A29E] italic">Not assigned</span>}
            />
            <InfoRow
              label="Service Module"
              value={productType.serviceModuleType
                ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#FEF0E3] text-[#F5821F]">
                    {serviceLabel(productType.serviceModuleType)}
                  </span>
                : <span className="text-[#A8A29E] italic">Not assigned</span>}
            />
            <div className="col-span-2">
              <InfoRow
                label="Description"
                value={productType.description
                  ? <span className="text-[#57534E] leading-relaxed">{productType.description}</span>
                  : <span className="text-[#A8A29E] italic">No description</span>}
              />
            </div>
            <InfoRow label="Status" value={<StatusBadge status={productType.status} />} />
            <InfoRow
              label="Created"
              value={productType.createdOn
                ? <span className="flex items-center gap-1.5 text-[#57534E]">
                    <Calendar className="w-3.5 h-3.5 text-[#A8A29E]" />
                    {format(new Date(productType.createdOn), "dd MMM yyyy, HH:mm")}
                  </span>
                : "—"}
            />
            {productType.modifiedOn && (
              <InfoRow
                label="Last Modified"
                value={<span className="flex items-center gap-1.5 text-[#57534E]">
                  <Clock className="w-3.5 h-3.5 text-[#A8A29E]" />
                  {format(new Date(productType.modifiedOn), "dd MMM yyyy, HH:mm")}
                </span>}
              />
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">
                Name <span className="text-[#DC2626]">*</span>
              </Label>
              <Input
                value={form.name}
                onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setNameError(""); }}
                className={`h-10 border-[#E8E6E2] focus:border-[#F5821F] ${nameError ? "border-[#DC2626]" : ""}`}
              />
              {nameError && <p className="text-xs text-[#DC2626]">{nameError}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">Product Group</Label>
              <Select value={form.productGroupId} onValueChange={v => setForm(f => ({ ...f, productGroupId: v }))}>
                <SelectTrigger className="h-10 border-[#E8E6E2]"><SelectValue placeholder="Select group..." /></SelectTrigger>
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
                <SelectTrigger className={`h-10 border-[#E8E6E2] ${smodError ? "border-[#DC2626]" : ""}`}><SelectValue /></SelectTrigger>
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
                className="border-[#E8E6E2] focus:border-[#F5821F] text-sm resize-none"
                placeholder="Describe this product type..."
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger className="h-10 border-[#E8E6E2] w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>
      <SystemInfoSection owner={null} createdAt={productType.createdOn} updatedAt={productType.modifiedOn} />
    </div>
  );
}
