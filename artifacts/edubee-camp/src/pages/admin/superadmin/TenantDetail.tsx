import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, ArrowLeft, Building2, Globe, Mail, Users, GraduationCap,
  CreditCard, Calendar, Save, ExternalLink, Clock,
} from "lucide-react";
import { formatDate } from "@/lib/date-format";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const inp = `w-full h-10 px-3 border-[1.5px] border-[#E8E6E2] rounded-lg text-sm text-[#1C1917] bg-white placeholder-[#A8A29E] focus:outline-none focus:border-[#F5821F] focus:shadow-[0_0_0_3px_rgba(245,130,31,0.15)] transition-all`;
const readInp = `w-full h-10 px-3 border border-[#F4F3F1] rounded-lg text-sm text-[#57534E] bg-[#FAFAF9] cursor-not-allowed select-none`;

const PLANS = [
  { value: "solo",       label: "Solo"       },
  { value: "starter",    label: "Starter"    },
  { value: "growth",     label: "Growth"     },
  { value: "enterprise", label: "Enterprise" },
];

const PLAN_STATUS = [
  { value: "trial",  label: "Trial (30 days)" },
  { value: "active", label: "Active"           },
  { value: "past_due", label: "Past Due"       },
  { value: "cancelled", label: "Cancelled"     },
];

const ORG_STATUS = [
  { value: "Active",    label: "Active"    },
  { value: "Suspended", label: "Suspended" },
  { value: "Cancelled", label: "Cancelled" },
];

const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  Active:    { bg: "#F0FDF4", color: "#15803D" },
  Suspended: { bg: "#FFF1F2", color: "#9F1239" },
  Cancelled: { bg: "#F4F3F1", color: "#57534E" },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl" style={{ background: "#FFFFFF", border: "1px solid #E8E6E2", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      <div className="px-6 py-4" style={{ borderBottom: "1px solid #F4F3F1" }}>
        <h3 className="text-sm font-semibold text-[#1C1917]">{title}</h3>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-[#57534E] uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

export default function TenantDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: org, isLoading } = useQuery<any>({
    queryKey: ["tenant", id],
    queryFn: () => axios.get(`${BASE}/api/superadmin/tenants/${id}`).then(r => r.data),
    enabled: !!id,
  });

  const [form, setForm] = useState<Record<string, any> | null>(null);
  const [dirty, setDirty] = useState(false);

  const set = (k: string, v: any) => {
    setForm(f => ({ ...(f ?? {}), [k]: v }));
    setDirty(true);
  };

  const val = (k: string, fallback?: any) =>
    form?.[k] !== undefined ? form[k] : (org?.[k] ?? fallback ?? "");

  const save = useMutation({
    mutationFn: () =>
      axios.put(`${BASE}/api/superadmin/tenants/${id}`, {
        name:        val("name"),
        tradingName: val("trading_name") || undefined,
        subdomain:   val("subdomain")    || undefined,
        customDomain: val("custom_domain") || undefined,
        ownerEmail:  val("owner_email")  || undefined,
        planType:    val("plan_type"),
        planStatus:  val("plan_status"),
        status:      val("status"),
        maxUsers:    val("max_users") ? Number(val("max_users")) : undefined,
        maxStudents: val("max_students") ? Number(val("max_students")) : undefined,
        trialEndsAt: val("trial_ends_at") || undefined,
      }).then(r => r.data),
    onSuccess: () => {
      toast({ title: "Tenant updated" });
      qc.invalidateQueries({ queryKey: ["tenant", id] });
      qc.invalidateQueries({ queryKey: ["superadmin-tenants"] });
      setForm(null);
      setDirty(false);
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e?.response?.data?.error ?? "Failed to update tenant", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-[#F5821F]" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="p-8 flex flex-col items-center gap-3 text-[#A8A29E]">
        <Building2 size={40} strokeWidth={1} />
        <p className="text-sm">Tenant not found</p>
        <button onClick={() => navigate("/superadmin/tenants")} className="text-sm text-[#F5821F] hover:underline">
          ← Back to Tenants
        </button>
      </div>
    );
  }

  const statusStyle = STATUS_COLOR[val("status")] ?? STATUS_COLOR.Active;

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/superadmin/tenants")}
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#E8E6E2] text-[#57534E] hover:border-[#F5821F] hover:text-[#F5821F] transition-colors"
          >
            <ArrowLeft size={15} />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-[#1C1917]">{org.name}</h1>
              <span
                className="text-xs px-2.5 py-0.5 rounded-full font-semibold"
                style={statusStyle}
              >
                {val("status")}
              </span>
            </div>
            {org.subdomain && (
              <p className="text-sm text-[#A8A29E] mt-0.5 font-mono">{org.subdomain}.edubee.com</p>
            )}
          </div>
        </div>

        <button
          onClick={() => save.mutate()}
          disabled={!dirty || save.isPending}
          className="h-9 px-5 rounded-lg text-sm font-semibold text-white flex items-center gap-2 disabled:opacity-40 transition-all"
          style={{ background: "#F5821F" }}
          onMouseEnter={e => { if (dirty && !save.isPending) e.currentTarget.style.background = "#D96A0A"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "#F5821F"; }}
        >
          {save.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save Changes
        </button>
      </div>

      {/* Company Info */}
      <Section title="Company Information">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Company Name *">
            <input className={inp} value={val("name")} onChange={e => set("name", e.target.value)} />
          </Field>
          <Field label="Trading Name">
            <input className={inp} placeholder="Optional" value={val("trading_name")} onChange={e => set("trading_name", e.target.value)} />
          </Field>
          <Field label={<span className="flex items-center gap-1"><Globe size={11} /> Subdomain</span> as any}>
            <div className="relative">
              <input
                className={inp}
                placeholder="acme"
                value={val("subdomain")}
                onChange={e => set("subdomain", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#A8A29E]">.edubee.com</span>
            </div>
          </Field>
          <Field label={<span className="flex items-center gap-1"><ExternalLink size={11} /> Custom Domain</span> as any}>
            <input className={inp} placeholder="app.acmeedu.com" value={val("custom_domain")} onChange={e => set("custom_domain", e.target.value)} />
          </Field>
          <Field label={<span className="flex items-center gap-1"><Mail size={11} /> Owner Email</span> as any}>
            <input className={inp} type="email" value={val("owner_email")} onChange={e => set("owner_email", e.target.value)} />
          </Field>
        </div>
      </Section>

      {/* Plan & Billing */}
      <Section title="Plan & Billing">
        <div className="grid grid-cols-2 gap-4">
          <Field label={<span className="flex items-center gap-1"><CreditCard size={11} /> Plan</span> as any}>
            <select className={inp} value={val("plan_type")} onChange={e => set("plan_type", e.target.value)}>
              {PLANS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </Field>
          <Field label="Plan Status">
            <select className={inp} value={val("plan_status")} onChange={e => set("plan_status", e.target.value)}>
              {PLAN_STATUS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </Field>
          <Field label={<span className="flex items-center gap-1"><Calendar size={11} /> Trial Ends At</span> as any}>
            <input
              className={inp}
              type="date"
              value={val("trial_ends_at") ? val("trial_ends_at").slice(0, 10) : ""}
              onChange={e => set("trial_ends_at", e.target.value)}
            />
          </Field>
          <Field label="Account Status">
            <select className={inp} value={val("status")} onChange={e => set("status", e.target.value)}>
              {ORG_STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </Field>
        </div>

        {/* Limits */}
        <div className="grid grid-cols-2 gap-4 mt-4 pt-4" style={{ borderTop: "1px solid #F4F3F1" }}>
          <Field label={<span className="flex items-center gap-1"><Users size={11} /> Max Users</span> as any}>
            <input className={inp} type="number" min={1} value={val("max_users", 10)} onChange={e => set("max_users", e.target.value)} />
          </Field>
          <Field label={<span className="flex items-center gap-1"><GraduationCap size={11} /> Max Students</span> as any}>
            <input className={inp} type="number" min={1} value={val("max_students", 500)} onChange={e => set("max_students", e.target.value)} />
          </Field>
        </div>
      </Section>

      {/* System Info */}
      <Section title="System Information">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <Field label="Tenant ID">
            <input className={readInp} readOnly value={org.id} />
          </Field>
          <Field label={<span className="flex items-center gap-1"><Clock size={11} /> Created On</span> as any}>
            <input className={readInp} readOnly value={formatDate(org.created_on)} />
          </Field>
          <Field label="Onboarded At">
            <input className={readInp} readOnly value={org.onboarded_at ? formatDate(org.onboarded_at) : "—"} />
          </Field>
          <Field label="Last Login">
            <input className={readInp} readOnly value={org.last_login_at ? formatDate(org.last_login_at) : "—"} />
          </Field>
        </div>
      </Section>
    </div>
  );
}
