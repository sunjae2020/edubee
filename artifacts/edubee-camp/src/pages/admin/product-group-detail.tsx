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
  ArrowLeft, Pencil, Save, X, Loader2, Layers, Tag, Calendar, Clock,
} from "lucide-react";
import { format } from "date-fns";

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

function StatusBadge({ status }: { status: string }) {
  if (status?.toLowerCase() === "active")
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#DCFCE7] text-[#16A34A]">Active</span>;
  return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F4F3F1] text-[#57534E]">Inactive</span>;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-[#A8A29E]">{label}</span>
      <span className="text-sm text-[#1C1917]">{value ?? "—"}</span>
    </div>
  );
}

export default function ProductGroupDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [form, setForm]       = useState({ name: "", description: "", status: "" });
  const [nameError, setNameError] = useState("");

  const { data: group, isLoading } = useQuery<ProductGroup>({
    queryKey: ["product-group", id],
    queryFn: () => axios.get(`${BASE}/api/product-groups/${id}`).then(r => r.data),
    enabled: !!id,
    onSuccess: (data) => {
      setForm({ name: data.name, description: data.description ?? "", status: data.status });
    },
  });

  const { data: types = [], isLoading: typesLoading } = useQuery<ProductType[]>({
    queryKey: ["product-types", "", "Active", id],
    queryFn: () =>
      axios.get(`${BASE}/api/product-types?product_group_id=${id}&status=Active`).then(r => r.data),
    enabled: !!id,
  });

  const startEdit = () => {
    if (group) setForm({ name: group.name, description: group.description ?? "", status: group.status });
    setNameError("");
    setEditing(true);
  };
  const cancelEdit = () => { setEditing(false); setNameError(""); };

  const save = useMutation({
    mutationFn: () => {
      if (!form.name.trim()) { setNameError("Name is required"); return Promise.reject(); }
      setNameError("");
      return axios.put(`${BASE}/api/product-groups/${id}`, form).then(r => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-group", id] });
      qc.invalidateQueries({ queryKey: ["product-groups"] });
      setEditing(false);
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
      {/* Back + title bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-[#57534E] hover:bg-[#F4F3F1] rounded-lg"
            onClick={() => navigate("/admin/product-groups")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#F5821F]" strokeWidth={1.5} />
            <h1 className="text-xl font-bold text-[#1C1917] leading-none">{group.name}</h1>
            <StatusBadge status={group.status} />
          </div>
        </div>

        {!editing ? (
          <Button onClick={startEdit} variant="outline" className="gap-2 border-[#E8E6E2] h-9">
            <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} /> Edit
          </Button>
        ) : (
          <div className="flex gap-2">
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
          Product Group Info
        </h2>

        {!editing ? (
          <div className="grid grid-cols-2 gap-x-8 gap-y-5">
            <div className="col-span-2">
              <InfoRow label="Name" value={<span className="font-semibold">{group.name}</span>} />
            </div>
            <div className="col-span-2">
              <InfoRow
                label="Description"
                value={group.description
                  ? <span className="text-[#57534E] leading-relaxed">{group.description}</span>
                  : <span className="text-[#A8A29E] italic">No description</span>}
              />
            </div>
            <InfoRow label="Status" value={<StatusBadge status={group.status} />} />
            <InfoRow
              label="Created"
              value={group.createdOn
                ? <span className="flex items-center gap-1.5 text-[#57534E]">
                    <Calendar className="w-3.5 h-3.5 text-[#A8A29E]" />
                    {format(new Date(group.createdOn), "dd MMM yyyy, HH:mm")}
                  </span>
                : "—"}
            />
            {group.modifiedOn && (
              <InfoRow
                label="Last Modified"
                value={<span className="flex items-center gap-1.5 text-[#57534E]">
                  <Clock className="w-3.5 h-3.5 text-[#A8A29E]" />
                  {format(new Date(group.modifiedOn), "dd MMM yyyy, HH:mm")}
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
              <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">Description</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={4}
                className="border-[#E8E6E2] focus:border-[#F5821F] text-sm resize-none"
                placeholder="Describe this product group..."
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

      <SystemInfoSection owner={null} createdAt={group.createdOn} updatedAt={group.modifiedOn} />

      {/* Product Types belonging to this group */}
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
                <tr key={t.id} className="hover:bg-[#FAFAF9] transition-colors">
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
