import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Pencil, Trash2, Check, X, LayoutGrid, Users, GraduationCap, Building2 } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Types ─────────────────────────────────────────────────────────────────────

type PlatformPlan = {
  id: string;
  code: string;
  name: string;
  priceMonthly: string;
  priceAnnually: string;
  maxUsers: number;
  maxStudents: number;
  maxBranches: number;
  storageGb: number;
  featureCommission: boolean;
  featureVisa: boolean;
  featureServiceModules: boolean;
  featureMultiBranch: boolean;
  featureAiAssistant: boolean;
  featureAccounting: boolean;
  featureAvetmiss: boolean;
  featureApiAccess: boolean;
  featureWhiteLabel: boolean;
  isPopular: boolean;
  isActive: boolean;
  sortOrder: number;
};

const EMPTY_FORM: Omit<PlatformPlan, "id" | "isActive" | "sortOrder"> = {
  code: "", name: "",
  priceMonthly: "0", priceAnnually: "0",
  maxUsers: 5, maxStudents: 100, maxBranches: 1, storageGb: 10,
  featureCommission: false, featureVisa: false, featureServiceModules: false,
  featureMultiBranch: false, featureAiAssistant: false, featureAccounting: false,
  featureAvetmiss: false, featureApiAccess: false, featureWhiteLabel: false,
  isPopular: false,
};

// ── Design tokens ─────────────────────────────────────────────────────────────

const inp = `
  w-full h-10 px-3 border-[1.5px] border-[#E8E6E2] rounded-lg text-sm text-[#1C1917]
  bg-white placeholder-[#A8A29E]
  focus:outline-none focus:border-[#F5821F] focus:shadow-[0_0_0_3px_rgba(245,130,31,0.15)]
  transition-all
`.replace(/\s+/g, " ").trim();

// ── Toggle switch ─────────────────────────────────────────────────────────────

function Toggle({
  label, checked, onChange, id,
}: { label: string; checked: boolean; onChange: (v: boolean) => void; id: string }) {
  return (
    <label
      htmlFor={id}
      className="flex items-center gap-3 cursor-pointer select-none h-9"
      style={{ color: "#1C1917", fontSize: 14 }}
    >
      <div className="relative shrink-0" style={{ width: 36, height: 20 }}>
        <input
          id={id}
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
        />
        <div
          className="absolute inset-0 rounded-full transition-colors duration-200"
          style={{ background: checked ? "#F5821F" : "#E8E6E2" }}
        />
        <div
          className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200"
          style={{ left: 2, transform: checked ? "translateX(16px)" : "translateX(0)" }}
        />
      </div>
      {label}
    </label>
  );
}

// ── Inline form ───────────────────────────────────────────────────────────────

function FormPanel({
  editingId, initial, onSave, onCancel,
}: {
  editingId: string | null;
  initial: typeof EMPTY_FORM;
  onSave: (data: any, id: string | null) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({ ...initial });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setForm({ ...initial });
    setErrors({});
    setApiError(null);
    setTimeout(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
  }, [editingId]);

  const f = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [key]: e.target.value }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.code) e.code = "Code is required";
    else if (!/^[a-z0-9-]+$/.test(form.code)) e.code = "Lowercase letters, numbers and hyphens only";
    if (!form.name) e.name = "Display name is required";
    if (Number(form.priceMonthly) < 0) e.priceMonthly = "Must be ≥ 0";
    if (Number(form.priceAnnually) < 0) e.priceAnnually = "Must be ≥ 0";
    if (Number(form.maxUsers) < 1) e.maxUsers = "Must be ≥ 1";
    if (Number(form.maxStudents) < 1) e.maxStudents = "Must be ≥ 1";
    if (Number(form.maxBranches) < 1) e.maxBranches = "Must be ≥ 1";
    if (Number(form.storageGb) < 1) e.storageGb = "Must be ≥ 1";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    setApiError(null);
    if (!validate()) return;
    onSave(form, editingId);
  };

  const numField = (key: keyof typeof form, label: string, errKey?: string) => (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-[#57534E] uppercase tracking-[0.05em]">{label}</label>
      <input
        type="number" min={0} className={inp}
        value={form[key] as any}
        onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
      />
      {errors[errKey ?? key] && (
        <p className="text-xs text-red-600 mt-0.5">{errors[errKey ?? key]}</p>
      )}
    </div>
  );

  return (
    <div
      ref={panelRef}
      className="rounded-xl p-6 space-y-6 mb-6"
      style={{
        background: "#FFFFFF",
        border: "1.5px solid #F5821F",
        boxShadow: "0 2px 12px rgba(245,130,31,0.12)",
      }}
    >
      <h3 className="text-base font-semibold text-[#1C1917]">{editingId ? "Edit Plan" : "New Plan"}</h3>

      {/* Row 1: code + name */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-[#57534E] uppercase tracking-[0.05em]">Code</label>
          <input
            className={inp} value={form.code}
            onChange={e => setForm(p => ({ ...p, code: e.target.value.toLowerCase().replace(/\s/g, "-") }))}
            placeholder="e.g. starter"
          />
          <p className="text-[11px] text-[#A8A29E]">Lowercase letters, numbers, and hyphens only</p>
          {errors.code && <p className="text-xs text-red-600">{errors.code}</p>}
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-[#57534E] uppercase tracking-[0.05em]">Display Name</label>
          <input className={inp} value={form.name} onChange={f("name")} placeholder="e.g. Starter" />
          {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
        </div>
      </div>

      {/* Row 2: pricing */}
      <div className="grid grid-cols-2 gap-4">
        {numField("priceMonthly", "Monthly Price (USD)", "priceMonthly")}
        {numField("priceAnnually", "Annual Price (USD)", "priceAnnually")}
      </div>

      {/* Row 3: users + students */}
      <div className="grid grid-cols-2 gap-4">
        {numField("maxUsers", "Max Users", "maxUsers")}
        {numField("maxStudents", "Max Students", "maxStudents")}
      </div>

      {/* Row 4: branches + storage */}
      <div className="grid grid-cols-2 gap-4">
        {numField("maxBranches", "Max Branches", "maxBranches")}
        {numField("storageGb", "Storage (GB)", "storageGb")}
      </div>

      {/* Features */}
      <div>
        <p className="text-xs font-medium text-[#57534E] uppercase tracking-[0.05em] mb-3">Features</p>
        <div className="grid grid-cols-2 gap-x-8 gap-y-0.5">
          <Toggle id="fc" label="Commission Auto-Calculation" checked={form.featureCommission}
            onChange={v => setForm(p => ({ ...p, featureCommission: v }))} />
          <Toggle id="fv" label="Visa Management Module" checked={form.featureVisa}
            onChange={v => setForm(p => ({ ...p, featureVisa: v }))} />
          <Toggle id="fs" label="Service Modules (Pickup · Homestay · Internship · Settlement)"
            checked={form.featureServiceModules}
            onChange={v => setForm(p => ({ ...p, featureServiceModules: v }))} />
          <Toggle id="fm" label="Multi-Branch Support" checked={form.featureMultiBranch}
            onChange={v => setForm(p => ({ ...p, featureMultiBranch: v }))} />
          <Toggle id="fai" label="AI Assistant" checked={form.featureAiAssistant}
            onChange={v => setForm(p => ({ ...p, featureAiAssistant: v }))} />
          <Toggle id="facc" label="Full Accounting Module (AR/AP)" checked={form.featureAccounting}
            onChange={v => setForm(p => ({ ...p, featureAccounting: v }))} />
          <Toggle id="fav" label="AVETMISS Reporting (Australian VET)" checked={form.featureAvetmiss}
            onChange={v => setForm(p => ({ ...p, featureAvetmiss: v }))} />
          <Toggle id="fapi" label="API Access" checked={form.featureApiAccess}
            onChange={v => setForm(p => ({ ...p, featureApiAccess: v }))} />
          <Toggle id="fwl" label="White-label & Custom Branding" checked={form.featureWhiteLabel}
            onChange={v => setForm(p => ({ ...p, featureWhiteLabel: v }))} />
        </div>
        <div className="border-t border-[#E8E6E2] mt-3 pt-3">
          <Toggle id="fpop" label="Mark as Popular" checked={form.isPopular}
            onChange={v => setForm(p => ({ ...p, isPopular: v }))} />
        </div>
      </div>

      {/* API error */}
      {apiError && (
        <div
          className="text-sm px-3 py-2.5 rounded-lg"
          style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626" }}
        >
          {apiError}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleSubmit}
          className="h-10 px-5 rounded-lg text-sm font-semibold text-white flex items-center gap-2 transition-all hover:-translate-y-px"
          style={{ background: "#F5821F" }}
        >
          <Check size={14} strokeWidth={2} />
          {editingId ? "Save Changes" : "Create Plan"}
        </button>
        <button
          onClick={onCancel}
          className="h-10 px-4 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
          style={{ background: "#FFFFFF", border: "1.5px solid #E8E6E2", color: "#1C1917" }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#A8A29E"; (e.currentTarget as HTMLButtonElement).style.background = "#FAFAF9"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#E8E6E2"; (e.currentTarget as HTMLButtonElement).style.background = "#FFFFFF"; }}
        >
          <X size={14} /> Cancel
        </button>
      </div>
    </div>
  );
}

// ── Plan card ─────────────────────────────────────────────────────────────────

const CHIP_LABELS: Array<{ key: keyof PlatformPlan; label: string }> = [
  { key: "featureCommission",     label: "Commission"   },
  { key: "featureVisa",           label: "Visa"         },
  { key: "featureServiceModules", label: "Services"     },
  { key: "featureMultiBranch",    label: "Multi-Branch" },
  { key: "featureAiAssistant",    label: "AI"           },
  { key: "featureAccounting",     label: "Accounting"   },
  { key: "featureAvetmiss",       label: "AVETMISS"     },
  { key: "featureApiAccess",      label: "API"          },
  { key: "featureWhiteLabel",     label: "White-label"  },
];

function PlanCard({
  plan,
  onEdit,
  onDeactivate,
}: {
  plan: PlatformPlan;
  onEdit: () => void;
  onDeactivate: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const activeFeatures = CHIP_LABELS.filter(c => plan[c.key]);

  return (
    <div
      className="rounded-xl flex flex-col"
      style={{ background: "#FFFFFF", border: "1px solid #E8E6E2", padding: "20px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-base font-semibold text-[#1C1917]">{plan.name}</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "#F4F3F1", color: "#57534E" }}>
            {plan.code}
          </span>
        </div>
        {plan.isPopular && (
          <span className="text-xs px-2.5 py-0.5 rounded-full font-medium shrink-0" style={{ background: "#FEF0E3", color: "#F5821F" }}>
            Most Popular
          </span>
        )}
      </div>

      {/* Pricing */}
      <div className="mb-2">
        <span className="font-bold text-[#1C1917]" style={{ fontSize: 22 }}>
          ${Number(plan.priceMonthly).toFixed(0)}<span className="text-sm font-normal text-[#57534E]"> / mo</span>
        </span>
        <span className="ml-3 text-xs text-[#57534E]">${Number(plan.priceAnnually).toFixed(0)} / yr annual</span>
      </div>

      {/* Limits */}
      <div className="flex items-center gap-3 text-xs text-[#57534E] mb-3 flex-wrap">
        <span className="flex items-center gap-1"><Users size={12} /> {plan.maxUsers} users</span>
        <span className="text-[#D4D0CB]">·</span>
        <span className="flex items-center gap-1"><GraduationCap size={12} /> {plan.maxStudents?.toLocaleString()} students</span>
        <span className="text-[#D4D0CB]">·</span>
        <span className="flex items-center gap-1"><Building2 size={12} /> {plan.maxBranches} branches</span>
      </div>

      {/* Feature chips */}
      <div className="flex flex-wrap gap-1 flex-1 content-start mb-4">
        {activeFeatures.length === 0 ? (
          <span className="text-xs text-[#A8A29E]">No features enabled</span>
        ) : activeFeatures.map(c => (
          <span key={c.key} className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "#F4F3F1", color: "#57534E" }}>
            {c.label}
          </span>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 pt-3" style={{ borderTop: "1px solid #F4F3F1", marginTop: "auto" }}>
        {confirming ? (
          <div className="flex items-center gap-2 text-xs text-[#57534E]">
            <span>Deactivate this plan?</span>
            <button
              onClick={() => { onDeactivate(); setConfirming(false); }}
              className="px-2 py-1 rounded text-xs font-medium text-white"
              style={{ background: "#DC2626" }}
            >
              Confirm
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="px-2 py-1 rounded text-xs font-medium"
              style={{ border: "1px solid #E8E6E2", color: "#57534E" }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={onEdit}
              className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors"
              style={{ color: "#57534E" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#F4F3F1")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <Pencil size={12} strokeWidth={1.5} /> Edit
            </button>
            <button
              onClick={() => setConfirming(true)}
              className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors"
              style={{ color: "#DC2626" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#FEF2F2")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <Trash2 size={12} strokeWidth={1.5} /> Deactivate
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="rounded-xl p-6 space-y-3 animate-pulse" style={{ background: "#FFFFFF", border: "1px solid #E8E6E2" }}>
      <div className="h-5 w-1/2 rounded" style={{ background: "#E8E6E2" }} />
      <div className="h-7 w-1/3 rounded" style={{ background: "#F4F3F1" }} />
      <div className="h-4 w-full rounded" style={{ background: "#F4F3F1" }} />
      <div className="h-4 w-2/3 rounded" style={{ background: "#F4F3F1" }} />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PlatformPlans() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formInitial, setFormInitial] = useState<typeof EMPTY_FORM>({ ...EMPTY_FORM });

  const { data, isLoading, isError, error } = useQuery<{ success: boolean; data: PlatformPlan[] }>({
    queryKey: ["platform-plans"],
    queryFn: () => axios.get(`${BASE}/api/platform-plans`).then(r => r.data),
  });

  const plans = data?.data ?? [];

  const saveMutation = useMutation({
    mutationFn: ({ form, id }: { form: any; id: string | null }) =>
      id
        ? axios.put(`${BASE}/api/platform-plans/${id}`, form).then(r => r.data)
        : axios.post(`${BASE}/api/platform-plans`, form).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-plans"] });
      setShowForm(false);
      setEditingId(null);
      setFormInitial({ ...EMPTY_FORM });
      toast({ title: editingId ? "Plan updated" : "Plan created" });
    },
    onError: (e: any) => {
      toast({
        title: "Error",
        description: e?.response?.data?.error ?? "Failed to save plan",
        variant: "destructive",
      });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => axios.delete(`${BASE}/api/platform-plans/${id}`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-plans"] });
      toast({ title: "Plan deactivated" });
    },
    onError: () => toast({ title: "Error", description: "Failed to deactivate plan", variant: "destructive" }),
  });

  const openNew = () => {
    setEditingId(null);
    setFormInitial({ ...EMPTY_FORM });
    setShowForm(true);
  };

  const openEdit = (plan: PlatformPlan) => {
    setEditingId(plan.id);
    setFormInitial({
      code: plan.code, name: plan.name,
      priceMonthly: plan.priceMonthly, priceAnnually: plan.priceAnnually,
      maxUsers: plan.maxUsers, maxStudents: plan.maxStudents,
      maxBranches: plan.maxBranches, storageGb: plan.storageGb,
      featureCommission: plan.featureCommission,
      featureVisa: plan.featureVisa,
      featureServiceModules: plan.featureServiceModules,
      featureMultiBranch: plan.featureMultiBranch,
      featureAiAssistant: plan.featureAiAssistant,
      featureAccounting: plan.featureAccounting,
      featureAvetmiss: plan.featureAvetmiss,
      featureApiAccess: plan.featureApiAccess,
      featureWhiteLabel: plan.featureWhiteLabel,
      isPopular: plan.isPopular,
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormInitial({ ...EMPTY_FORM });
  };

  const handleSave = (form: any, id: string | null) => {
    saveMutation.mutate({ form, id });
  };

  return (
    <div className="p-8 space-y-6" style={{ background: "#FAFAF9", minHeight: "100vh" }}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-semibold text-[#1C1917]" style={{ fontSize: 24 }}>Platform Plans</h1>
          <p className="text-sm text-[#57534E] mt-1">Manage SaaS subscription plans available to tenants</p>
        </div>
        {(!showForm || editingId !== null) && (
          <button
            onClick={openNew}
            className="h-10 px-5 rounded-lg text-sm font-semibold text-white flex items-center gap-2 transition-all hover:-translate-y-px"
            style={{ background: "#F5821F" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#D96A0A")}
            onMouseLeave={e => (e.currentTarget.style.background = "#F5821F")}
          >
            <Plus size={15} strokeWidth={2} /> Add New Plan
          </button>
        )}
      </div>

      {/* Form panel */}
      {showForm && (
        <FormPanel
          editingId={editingId}
          initial={formInitial}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}

      {/* Error state */}
      {isError && (
        <div className="rounded-xl p-4 text-sm text-red-700" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
          Failed to load plans: {(error as any)?.response?.data?.message ?? (error as any)?.message ?? "Unknown error"}
        </div>
      )}

      {/* Plans grid */}
      {isLoading ? (
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
          {[1, 2, 3].map(i => <Skeleton key={i} />)}
        </div>
      ) : isError ? null : plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <LayoutGrid size={40} style={{ color: "#A8A29E" }} strokeWidth={1} />
          <p className="mt-4 font-semibold text-[#1C1917]" style={{ fontSize: 16 }}>No plans configured yet</p>
          <p className="mt-1 text-sm text-[#57534E]">Create your first SaaS plan to get started</p>
          <button
            onClick={openNew}
            className="mt-4 h-10 px-5 rounded-lg text-sm font-semibold text-white flex items-center gap-2"
            style={{ background: "#F5821F" }}
          >
            <Plus size={14} /> Add New Plan
          </button>
        </div>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
          {plans.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onEdit={() => openEdit(plan)}
              onDeactivate={() => deactivateMutation.mutate(plan.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
