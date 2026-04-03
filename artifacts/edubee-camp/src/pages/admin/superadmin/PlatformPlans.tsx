import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Pencil, Trash2, Check, X } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const EMPTY = {
  code: "", name: "", priceMonthly: "", priceAnnually: "",
  maxUsers: "", maxStudents: "", isPopular: false,
  features: { camp_module: false, accounting: false, ai_assistant: false },
};

function FeatureToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <div
        onClick={() => onChange(!checked)}
        className="relative w-9 h-5 rounded-full transition-colors"
        style={{ background: checked ? "#F5821F" : "#E8E6E2" }}
      >
        <span
          className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform"
          style={{ transform: checked ? "translateX(16px)" : "translateX(0)" }}
        />
      </div>
      <span className="text-sm text-[#1C1917]">{label}</span>
    </label>
  );
}

export default function PlatformPlans() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm]       = useState<any>(EMPTY);
  const [showNew, setShowNew] = useState(false);

  const { data: plans = [], isLoading } = useQuery<any[]>({
    queryKey: ["superadmin-plans"],
    queryFn: () => axios.get(`${BASE}/api/superadmin/plans`).then(r => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) =>
      editing
        ? axios.put(`${BASE}/api/superadmin/plans/${editing}`, data).then(r => r.data)
        : axios.post(`${BASE}/api/superadmin/plans`, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["superadmin-plans"] });
      setEditing(null); setShowNew(false); setForm(EMPTY);
      toast({ title: editing ? "Plan updated" : "Plan created" });
    },
    onError: (e: any) => toast({ title: "Error", description: e?.response?.data?.error ?? "Failed to save plan", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => axios.delete(`${BASE}/api/superadmin/plans/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["superadmin-plans"] }); toast({ title: "Plan deleted" }); },
    onError: () => toast({ title: "Error", description: "Failed to delete plan", variant: "destructive" }),
  });

  const startEdit = (plan: any) => {
    setEditing(plan.id);
    setShowNew(false);
    setForm({
      code: plan.code, name: plan.name,
      priceMonthly: plan.priceMonthly, priceAnnually: plan.priceAnnually,
      maxUsers: plan.maxUsers, maxStudents: plan.maxStudents,
      isPopular: plan.isPopular ?? false,
      features: plan.features ?? { camp_module: false, accounting: false, ai_assistant: false },
    });
  };

  const startNew = () => {
    setEditing(null); setShowNew(true); setForm(EMPTY);
  };

  const cancel = () => { setEditing(null); setShowNew(false); setForm(EMPTY); };

  const handleSave = () => {
    saveMutation.mutate({
      code: form.code, name: form.name,
      priceMonthly:  Number(form.priceMonthly),
      priceAnnually: Number(form.priceAnnually),
      maxUsers:      Number(form.maxUsers),
      maxStudents:   Number(form.maxStudents),
      isPopular:     form.isPopular,
      features:      form.features,
    });
  };

  const inp = "w-full h-10 px-3 border-[1.5px] border-[#E8E6E2] rounded-lg text-sm focus:outline-none focus:border-[#F5821F] bg-white";

  const FormPanel = () => (
    <div className="bg-white rounded-xl border-2 border-[#F5821F] p-6 space-y-5" style={{ boxShadow: "0 2px 12px rgba(245,130,31,0.12)" }}>
      <h3 className="text-sm font-bold text-[#1C1917]">{editing ? "Edit Plan" : "New Plan"}</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">Code</label>
          <input className={inp} value={form.code} onChange={e => setForm((p: any) => ({ ...p, code: e.target.value }))} placeholder="starter" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">Display Name</label>
          <input className={inp} value={form.name} onChange={e => setForm((p: any) => ({ ...p, name: e.target.value }))} placeholder="Starter" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">Monthly Price (USD)</label>
          <input className={inp} type="number" value={form.priceMonthly} onChange={e => setForm((p: any) => ({ ...p, priceMonthly: e.target.value }))} placeholder="49" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">Annual Price (USD)</label>
          <input className={inp} type="number" value={form.priceAnnually} onChange={e => setForm((p: any) => ({ ...p, priceAnnually: e.target.value }))} placeholder="490" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">Max Users</label>
          <input className={inp} type="number" value={form.maxUsers} onChange={e => setForm((p: any) => ({ ...p, maxUsers: e.target.value }))} placeholder="5" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">Max Students</label>
          <input className={inp} type="number" value={form.maxStudents} onChange={e => setForm((p: any) => ({ ...p, maxStudents: e.target.value }))} placeholder="100" />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-[#57534E] uppercase tracking-wide">Features</p>
        <FeatureToggle
          label="Camp Module" checked={form.features?.camp_module ?? false}
          onChange={v => setForm((p: any) => ({ ...p, features: { ...p.features, camp_module: v } }))}
        />
        <FeatureToggle
          label="Accounting Module" checked={form.features?.accounting ?? false}
          onChange={v => setForm((p: any) => ({ ...p, features: { ...p.features, accounting: v } }))}
        />
        <FeatureToggle
          label="AI Assistant" checked={form.features?.ai_assistant ?? false}
          onChange={v => setForm((p: any) => ({ ...p, features: { ...p.features, ai_assistant: v } }))}
        />
        <FeatureToggle
          label="Mark as Popular" checked={form.isPopular ?? false}
          onChange={v => setForm((p: any) => ({ ...p, isPopular: v }))}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saveMutation.isPending || !form.code || !form.name}
          className="h-10 px-5 rounded-lg text-sm font-semibold text-white flex items-center gap-2 disabled:opacity-50"
          style={{ background: "#F5821F" }}
        >
          {saveMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
          {editing ? "Update Plan" : "Create Plan"}
        </button>
        <button onClick={cancel} className="h-10 px-4 rounded-lg text-sm font-medium border border-[#E8E6E2] text-[#57534E] hover:bg-[#F4F3F1] flex items-center gap-1.5">
          <X size={13} /> Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1C1917]">Platform Plans</h1>
          <p className="text-sm text-[#57534E]">Manage SaaS subscription plans available to tenants</p>
        </div>
        {!showNew && !editing && (
          <button
            onClick={startNew}
            className="h-10 px-5 rounded-lg text-sm font-semibold text-white flex items-center gap-2"
            style={{ background: "#F5821F" }}
          >
            <Plus size={14} /> New Plan
          </button>
        )}
      </div>

      {showNew && <FormPanel />}

      {isLoading ? (
        <div className="flex items-center justify-center h-48"><Loader2 size={24} className="animate-spin text-[#F5821F]" /></div>
      ) : (
        <div className="space-y-4">
          {plans.map((plan: any) => (
            <div key={plan.id}>
              {editing === plan.id ? (
                <FormPanel />
              ) : (
                <div className="bg-white rounded-xl border border-[#E8E6E2] p-5 flex items-start justify-between" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                  <div className="flex items-start gap-6">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#F4F3F1] text-[#57534E]">{plan.code}</span>
                        <p className="text-base font-bold text-[#1C1917]">{plan.name}</p>
                        {plan.isPopular && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F5821F] text-white font-bold">Popular</span>
                        )}
                      </div>
                      <p className="text-sm text-[#57534E] mt-1">
                        <span className="font-semibold text-[#1C1917]">${Number(plan.priceMonthly).toFixed(0)}/mo</span>
                        <span className="mx-1.5 text-[#D4D0CB]">·</span>
                        ${Number(plan.priceAnnually).toFixed(0)}/yr
                      </p>
                    </div>
                    <div className="text-sm text-[#57534E] space-y-0.5">
                      <p>{plan.maxUsers >= 999 ? "Unlimited" : plan.maxUsers} users</p>
                      <p>{plan.maxStudents >= 9999 ? "Unlimited" : Number(plan.maxStudents).toLocaleString()} students</p>
                    </div>
                    <div className="space-y-1 text-xs">
                      {Object.entries(plan.features ?? {}).map(([k, v]) => (
                        <div key={k} className={`flex items-center gap-1.5 ${v ? "text-[#15803D]" : "text-[#D4D0CB]"}`}>
                          <Check size={10} strokeWidth={2.5} />
                          <span className="capitalize">{k.replace(/_/g, " ")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    <button
                      onClick={() => startEdit(plan)}
                      className="h-8 px-3 rounded-lg text-xs font-medium border border-[#E8E6E2] text-[#57534E] hover:bg-[#F4F3F1] flex items-center gap-1.5"
                    >
                      <Pencil size={11} /> Edit
                    </button>
                    <button
                      onClick={() => { if (confirm(`Delete "${plan.name}" plan?`)) deleteMutation.mutate(plan.id); }}
                      disabled={deleteMutation.isPending}
                      className="h-8 px-3 rounded-lg text-xs font-medium border border-red-100 text-red-500 hover:bg-red-50 flex items-center gap-1.5 disabled:opacity-40"
                    >
                      <Trash2 size={11} /> Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
