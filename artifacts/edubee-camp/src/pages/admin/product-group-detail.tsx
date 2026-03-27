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
import { ArrowLeft, Save, RotateCcw, Loader2, Layers, Tag } from "lucide-react";
import { useLocation as useWouter } from "wouter";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface ProductGroup {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  createdOn?: string | null;
  modifiedOn?: string | null;
}

interface ProductType {
  id: string;
  name: string;
  serviceModuleType?: string | null;
  description?: string | null;
  status: string;
  createdOn?: string;
}

const SERVICE_MODULE_LABELS: Record<string, string> = {
  study_abroad:   "Study Abroad",
  accommodation:  "Accommodation",
  internship:     "Internship",
  guardian:       "Guardian",
  settlement:     "Settlement",
  other:          "Other Services",
  visa:           "Visa Services",
  pickup:         "Pickup / Transfer",
  tour:           "Tour Management",
};

const EMPTY_FORM = { name: "", description: "", status: "Active" };

function StatusBadge({ status }: { status: string }) {
  if (status?.toLowerCase() === "active")
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#DCFCE7] text-[#16A34A]">Active</span>;
  return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F4F3F1] text-[#57534E]">Inactive</span>;
}

export default function ProductGroupDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [form, setForm]         = useState(EMPTY_FORM);
  const [original, setOriginal] = useState(EMPTY_FORM);
  const [nameError, setNameError] = useState("");

  const isDirty = JSON.stringify(form) !== JSON.stringify(original);

  const { data: group, isLoading } = useQuery<ProductGroup>({
    queryKey: ["product-group", id],
    queryFn: () => axios.get(`${BASE}/api/product-groups/${id}`).then(r => r.data),
    enabled: !!id,
  });

  useEffect(() => {
    if (!group) return;
    const snap = {
      name:        group.name,
      description: group.description ?? "",
      status:      group.status,
    };
    setForm(snap);
    setOriginal(snap);
  }, [group]);

  const { data: types = [], isLoading: typesLoading } = useQuery<ProductType[]>({
    queryKey: ["product-types", "", "Active", id],
    queryFn: () =>
      axios.get(`${BASE}/api/product-types?product_group_id=${id}&status=Active`).then(r => r.data),
    enabled: !!id,
  });

  const discard = () => {
    setForm(original);
    setNameError("");
  };

  const save = useMutation({
    mutationFn: () => {
      if (!form.name.trim()) { setNameError("Name is required"); return Promise.reject(); }
      setNameError("");
      return axios.put(`${BASE}/api/product-groups/${id}`, form).then(r => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-group", id] });
      qc.invalidateQueries({ queryKey: ["product-groups"] });
      toast({ title: "Product group saved" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to save" }),
  });

  if (isLoading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-8 w-48 bg-[#F4F3F1] rounded" />
        <div className="h-48 bg-[#F4F3F1] rounded-xl" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-[#A8A29E]">
        <Layers className="w-10 h-10 mb-3" strokeWidth={1} />
        <p className="text-sm">Product group not found.</p>
        <Button variant="link" className="text-[#F5821F] mt-2" onClick={() => navigate("/admin/product-groups")}>
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
            onClick={() => navigate("/admin/product-groups")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#F5821F]" strokeWidth={1.5} />
            <h1 className="text-xl font-bold text-[#1C1917] leading-none">{group.name}</h1>
            <StatusBadge status={form.status} />
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
          Product Group Info
        </h2>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">
            Name <span className="text-[#DC2626]">*</span>
          </Label>
          <Input
            value={form.name}
            onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setNameError(""); }}
            className={`h-10 border-[#E8E6E2] focus:border-[#F5821F] focus-visible:ring-0 ${nameError ? "border-[#DC2626]" : ""}`}
          />
          {nameError && <p className="text-xs text-[#DC2626]">{nameError}</p>}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">Description</Label>
          <Textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={4}
            className="border-[#E8E6E2] focus:border-[#F5821F] focus-visible:ring-0 text-sm resize-none"
            placeholder="Describe this product group..."
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

      <SystemInfoSection owner={null} createdAt={group.createdOn} updatedAt={group.modifiedOn} />

      {/* Product Types in this group */}
      <div className="bg-white rounded-xl border border-[#E8E6E2] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F4F3F1]">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-[#F5821F]" strokeWidth={1.5} />
            <h2 className="text-sm font-semibold text-[#1C1917]">Product Types</h2>
            <span className="text-xs text-[#A8A29E] bg-[#F4F3F1] px-1.5 py-0.5 rounded-full">{types.length}</span>
          </div>
          <Button
            size="sm" variant="outline"
            className="h-8 text-xs border-[#E8E6E2] gap-1.5"
            onClick={() => navigate("/admin/product-types")}
          >
            <Tag className="w-3 h-3" /> Manage Types
          </Button>
        </div>

        {typesLoading ? (
          <div className="p-4 space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 bg-[#F4F3F1] rounded animate-pulse" />
            ))}
          </div>
        ) : types.length === 0 ? (
          <div className="px-6 py-10 text-center text-[#A8A29E] text-sm">
            No active product types in this group
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#FAFAF9]">
                <th className="text-left px-6 py-2.5 text-xs font-medium text-[#57534E] uppercase tracking-wide">Name</th>
                <th className="text-left px-6 py-2.5 text-xs font-medium text-[#57534E] uppercase tracking-wide">Service Module</th>
                <th className="text-left px-6 py-2.5 text-xs font-medium text-[#57534E] uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F3F1]">
              {types.map(t => (
                <tr key={t.id}
                  className="hover:bg-[#FEF0E3] transition-colors cursor-pointer"
                  onClick={() => navigate(`/admin/product-types/${t.id}`)}>
                  <td className="px-6 py-3 font-medium text-[#1C1917]">{t.name}</td>
                  <td className="px-6 py-3">
                    {t.serviceModuleType ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#FEF0E3] text-[#F5821F]">
                        {SERVICE_MODULE_LABELS[t.serviceModuleType] ?? t.serviceModuleType}
                      </span>
                    ) : <span className="text-[#A8A29E]">—</span>}
                  </td>
                  <td className="px-6 py-3"><StatusBadge status={t.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
