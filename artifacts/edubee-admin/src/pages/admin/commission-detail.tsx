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
import { ArrowLeft, Save, RotateCcw, Loader2, BadgeDollarSign } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Commission {
  id: string;
  name: string;
  commissionType: string;
  rateValue?: string | null;
  description?: string | null;
  status: string;
  createdOn?: string | null;
  modifiedOn?: string | null;
}

interface FormState {
  name: string;
  commissionType: string;
  rateValue: string;
  description: string;
  status: string;
}

const EMPTY_FORM: FormState = {
  name: "", commissionType: "rate", rateValue: "", description: "", status: "Active",
};

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
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
    {type.charAt(0).toUpperCase() + type.slice(1)}
  </span>;
}

function StatusBadge({ status }: { status: string }) {
  if (status?.toLowerCase() === "active")
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#DCFCE7] text-[#16A34A]">Active</span>;
  return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F4F3F1] text-[#57534E]">Inactive</span>;
}

export default function CommissionDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [form, setForm]         = useState<FormState>(EMPTY_FORM);
  const [original, setOriginal] = useState<FormState>(EMPTY_FORM);
  const [nameError, setNameError] = useState("");

  const isDirty = JSON.stringify(form) !== JSON.stringify(original);

  const { data: commission, isLoading } = useQuery<Commission>({
    queryKey: ["commission", id],
    queryFn: () => axios.get(`${BASE}/api/commissions/${id}`).then(r => r.data),
    enabled: !!id,
  });

  useEffect(() => {
    if (!commission) return;
    const snap: FormState = {
      name:           commission.name,
      commissionType: commission.commissionType,
      rateValue:      commission.rateValue ?? "",
      description:    commission.description ?? "",
      status:         commission.status,
    };
    setForm(snap);
    setOriginal(snap);
  }, [commission]);

  const discard = () => { setForm(original); setNameError(""); };

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
      return axios.put(`${BASE}/api/commissions/${id}`, payload).then(r => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["commission", id] });
      qc.invalidateQueries({ queryKey: ["commissions"] });
      toast({ title: "Commission saved" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to save commission" }),
  });

  if (isLoading) {
    return (
      <div className="space-y-5 animate-pulse max-w-3xl">
        <div className="h-8 w-48 bg-[#F4F3F1] rounded" />
        <div className="h-64 bg-[#F4F3F1] rounded-xl" />
      </div>
    );
  }

  if (!commission) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-[#A8A29E]">
        <BadgeDollarSign className="w-10 h-10 mb-3" strokeWidth={1} />
        <p className="text-sm">Commission not found.</p>
        <Button variant="link" className="text-(--e-orange) mt-2" onClick={() => navigate("/admin/commissions")}>
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
            onClick={() => navigate("/admin/commissions")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 flex-wrap">
            <BadgeDollarSign className="w-5 h-5 text-(--e-orange)" strokeWidth={1.5} />
            <h1 className="text-xl font-bold text-[#1C1917] leading-none">{commission.name}</h1>
            <TypeBadge type={commission.commissionType} />
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
          Commission Info
        </h2>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">
            Name <span className="text-[#DC2626]">*</span>
          </Label>
          <Input
            value={form.name}
            onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setNameError(""); }}
            placeholder="e.g. Rate25"
            className={`h-10 border-[#E8E6E2] focus:border-(--e-orange) focus-visible:ring-0 ${nameError ? "border-[#DC2626]" : ""}`}
          />
          {nameError && <p className="text-xs text-[#DC2626]">{nameError}</p>}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">
            Commission Type <span className="text-[#DC2626]">*</span>
          </Label>
          <Select value={form.commissionType} onValueChange={v => setForm(f => ({ ...f, commissionType: v, rateValue: "" }))}>
            <SelectTrigger className="h-10 border-[#E8E6E2] focus:ring-0 w-48">
              <SelectValue />
            </SelectTrigger>
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
              className="h-10 border-[#E8E6E2] focus:border-(--e-orange) focus-visible:ring-0 w-48"
            />
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">Description</Label>
          <Textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Describe this commission..."
            rows={3}
            className="border-[#E8E6E2] focus:border-(--e-orange) focus-visible:ring-0 text-sm resize-none"
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

      <SystemInfoSection owner={null} createdAt={commission.createdOn} updatedAt={commission.modifiedOn} />
    </div>
  );
}
