import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, ArrowLeft, Building2, Globe, Mail, Users, GraduationCap,
  CreditCard, Calendar, Save, ExternalLink, Clock, Check, Zap, Palette, Image,
} from "lucide-react";
import { formatDate } from "@/lib/date-format";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Types ──────────────────────────────────────────────────────────────────────

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
};

// ── Design constants ───────────────────────────────────────────────────────────

const inp = `w-full h-10 px-3 border-[1.5px] border-[#E8E6E2] rounded-lg text-sm text-[#1C1917] bg-white placeholder-[#A8A29E] focus:outline-none focus:border-[#F5821F] focus:shadow-[0_0_0_3px_rgba(245,130,31,0.15)] transition-all`;
const readInp = `w-full h-10 px-3 border border-[#F4F3F1] rounded-lg text-sm text-[#57534E] bg-[#FAFAF9] cursor-not-allowed select-none`;

const PLAN_STATUS = [
  { value: "trial",     label: "Trial (30 days)" },
  { value: "active",    label: "Active"           },
  { value: "past_due",  label: "Past Due"         },
  { value: "cancelled", label: "Cancelled"        },
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

const PLAN_COLOR: Record<string, { bg: string; color: string; border: string }> = {
  solo:       { bg: "#FAFAF9", color: "#57534E",  border: "#E8E6E2" },
  starter:    { bg: "#FEF0E3", color: "#C2410C",  border: "#FDE0C0" },
  growth:     { bg: "#ECFDF5", color: "#065F46",  border: "#A7F3D0" },
  enterprise: { bg: "#F5F3FF", color: "#6D28D9",  border: "#DDD6FE" },
};

const FEATURE_LABELS: Array<{ key: keyof PlatformPlan; label: string }> = [
  { key: "featureCommission",     label: "Commission Auto-Calc"              },
  { key: "featureVisa",           label: "Visa Management"                   },
  { key: "featureServiceModules", label: "Services (Pickup/Homestay/Intern)" },
  { key: "featureMultiBranch",    label: "Multi-Branch"                      },
  { key: "featureAiAssistant",    label: "AI Assistant"                      },
  { key: "featureAccounting",     label: "Accounting"                        },
  { key: "featureAvetmiss",       label: "AVETMISS Reporting"                },
  { key: "featureApiAccess",      label: "REST API / Webhook"                },
  { key: "featureWhiteLabel",     label: "White-label"                       },
];

function fmtLimit(v: number) {
  return v >= 9999 ? "Unlimited" : v.toLocaleString();
}

function ColorSwatch({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const safe = /^#[0-9A-Fa-f]{6}$/.test(value) ? value : "#000000";
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={safe}
          onChange={e => onChange(e.target.value)}
          className="w-9 h-9 rounded-lg border border-[#E8E6E2] cursor-pointer p-0.5 shrink-0"
        />
        <input
          type="text"
          value={value || ""}
          onChange={e => onChange(e.target.value)}
          maxLength={7}
          className="flex-1 h-9 px-3 border-[1.5px] border-[#E8E6E2] rounded-lg text-sm font-mono focus:outline-none focus:border-[#F5821F] uppercase bg-white"
          placeholder="#F5821F"
        />
      </div>
    </div>
  );
}

// ── UI helpers ────────────────────────────────────────────────────────────────

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

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-[#57534E] uppercase tracking-wide flex items-center gap-1">{label}</label>
      {children}
    </div>
  );
}

// ── Plan info card (shown below the Plan dropdown) ────────────────────────────

function PlanInfoCard({ plan }: { plan: PlatformPlan }) {
  const c = PLAN_COLOR[plan.code] ?? PLAN_COLOR.solo;
  const isContact = Number(plan.priceMonthly) === 0;
  const activeFeatures = FEATURE_LABELS.filter(f => plan[f.key]);

  return (
    <div
      className="rounded-xl mt-4 p-4 space-y-3"
      style={{ background: c.bg, border: `1.5px solid ${c.border}` }}
    >
      {/* Price + limits row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          {plan.isPopular && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: "#FEF0E3", color: "#F5821F" }}>
              Most Popular
            </span>
          )}
          <span className="font-bold" style={{ color: c.color, fontSize: 18 }}>
            {isContact ? "Contact us" : `$${Number(plan.priceMonthly).toFixed(0)}/mo`}
          </span>
          {!isContact && (
            <span className="text-xs text-[#A8A29E]">
              (${Number(plan.priceAnnually).toFixed(0)}/yr annual)
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-[#57534E]">
          <span className="flex items-center gap-1"><Users size={11} /> {fmtLimit(plan.maxUsers)} users</span>
          <span className="text-[#D4D0CB]">·</span>
          <span className="flex items-center gap-1"><GraduationCap size={11} /> {fmtLimit(plan.maxStudents)} students</span>
          <span className="text-[#D4D0CB]">·</span>
          <span className="flex items-center gap-1"><Building2 size={11} /> {fmtLimit(plan.maxBranches)} branches</span>
        </div>
      </div>

      {/* Features */}
      {activeFeatures.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {activeFeatures.map(f => (
            <span
              key={f.key as string}
              className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium"
              style={{ background: "rgba(255,255,255,0.7)", color: c.color, border: `1px solid ${c.border}` }}
            >
              <Check size={9} strokeWidth={3} /> {f.label}
            </span>
          ))}
        </div>
      )}

      {activeFeatures.length === 0 && (
        <p className="text-xs text-[#A8A29E]">CRM core only (Lead → Invoice)</p>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TenantDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: org, isLoading: orgLoading } = useQuery<any>({
    queryKey: ["tenant", id],
    queryFn: () => axios.get(`${BASE}/api/superadmin/tenants/${id}`).then(r => r.data),
    enabled: !!id,
  });

  const { data: plansRaw, isLoading: plansLoading } = useQuery<PlatformPlan[]>({
    queryKey: ["platform-plans", "v2"],
    queryFn: async () => {
      const r = await axios.get(`${BASE}/api/platform-plans`);
      const result = r.data?.data ?? r.data;
      return Array.isArray(result) ? result : [];
    },
  });
  const plans: PlatformPlan[] = Array.isArray(plansRaw) ? plansRaw : [];

  const [form, setForm] = useState<Record<string, any> | null>(null);
  const [dirty, setDirty] = useState(false);

  const set = (k: string, v: any) => {
    setForm(f => ({ ...(f ?? {}), [k]: v }));
    setDirty(true);
  };

  const val = (k: string, fallback?: any) =>
    form?.[k] !== undefined ? form[k] : (org?.[k] ?? fallback ?? "");

  const selectedPlan = plans.find(p => p.code === val("plan_type"));

  const save = useMutation({
    mutationFn: () =>
      axios.put(`${BASE}/api/superadmin/tenants/${id}`, {
        name:           val("name"),
        tradingName:    val("trading_name")  || undefined,
        subdomain:      val("subdomain")     || undefined,
        customDomain:   val("custom_domain") || undefined,
        ownerEmail:     val("owner_email")   || undefined,
        planType:       val("plan_type"),
        planStatus:     val("plan_status"),
        status:         val("status"),
        maxUsers:       val("max_users")    ? Number(val("max_users"))    : undefined,
        maxStudents:    val("max_students") ? Number(val("max_students")) : undefined,
        trialEndsAt:    val("trial_ends_at") || undefined,
        logoUrl:        val("logo_url")        || undefined,
        faviconUrl:     val("favicon_url")     || undefined,
        primaryColor:   val("primary_color")   || undefined,
        secondaryColor: val("secondary_color") || undefined,
        accentColor:    val("accent_color")    || undefined,
      }).then(r => r.data),
    onSuccess: () => {
      toast({ title: "Tenant updated" });
      qc.invalidateQueries({ queryKey: ["tenant", id] });
      qc.invalidateQueries({ queryKey: ["superadmin-tenants"] });
      setForm(null);
      setDirty(false);
    },
    onError: (e: any) => {
      toast({
        title: "Error",
        description: e?.response?.data?.error ?? "Failed to update tenant",
        variant: "destructive",
      });
    },
  });

  if (orgLoading || plansLoading) {
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
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold" style={statusStyle}>
                {val("status")}
              </span>
            </div>
            {org.subdomain && (
              <p className="text-sm text-[#A8A29E] mt-0.5 font-mono">{org.subdomain}.edubee.co</p>
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
          <Field label={<><Globe size={11} /> Subdomain</>}>
            <div className="relative">
              <input
                className={inp}
                placeholder="acme"
                value={val("subdomain")}
                onChange={e => set("subdomain", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#A8A29E]">.edubee.co</span>
            </div>
          </Field>
          <Field label={<><ExternalLink size={11} /> Custom Domain</>}>
            <input className={inp} placeholder="app.acmeedu.com" value={val("custom_domain")} onChange={e => set("custom_domain", e.target.value)} />
          </Field>
          <Field label={<><Mail size={11} /> Owner Email</>}>
            <input className={inp} type="email" value={val("owner_email")} onChange={e => set("owner_email", e.target.value)} />
          </Field>
        </div>
      </Section>

      {/* Plan & Billing */}
      <Section title="Plan & Billing">
        <div className="grid grid-cols-2 gap-4">
          <Field label={<><CreditCard size={11} /> Plan</>}>
            <select className={inp} value={val("plan_type")} onChange={e => set("plan_type", e.target.value)}>
              {plans.filter(p => p.isActive).map(p => (
                <option key={p.code} value={p.code}>
                  {p.name}{p.isPopular ? " ★" : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Plan Status">
            <select className={inp} value={val("plan_status")} onChange={e => set("plan_status", e.target.value)}>
              {PLAN_STATUS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </Field>
          <Field label={<><Calendar size={11} /> Trial Ends At</>}>
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

        {/* Selected plan info card */}
        {selectedPlan && (
          <div>
            <p className="mt-4 mb-1 text-xs font-semibold text-[#57534E] uppercase tracking-wide flex items-center gap-1">
              <Zap size={11} /> {selectedPlan.name} Plan — Included Features
            </p>
            <PlanInfoCard plan={selectedPlan} />
          </div>
        )}

        {/* Custom limits override */}
        <div className="grid grid-cols-2 gap-4 mt-4 pt-4" style={{ borderTop: "1px solid #F4F3F1" }}>
          <p className="col-span-2 text-xs text-[#A8A29E]">
            Override per-tenant limits (leave as plan default if not customised)
          </p>
          <Field label={<><Users size={11} /> Max Users Override</>}>
            <input className={inp} type="number" min={1} value={val("max_users", selectedPlan?.maxUsers ?? 10)} onChange={e => set("max_users", e.target.value)} />
          </Field>
          <Field label={<><GraduationCap size={11} /> Max Students Override</>}>
            <input className={inp} type="number" min={1} value={val("max_students", selectedPlan?.maxStudents ?? 500)} onChange={e => set("max_students", e.target.value)} />
          </Field>
        </div>
      </Section>

      {/* Branding */}
      <Section title="Branding & Visual Identity">
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <ColorSwatch
              label="Primary Colour"
              value={val("primary_color", "#F5821F")}
              onChange={v => set("primary_color", v)}
            />
            <ColorSwatch
              label="Secondary Colour"
              value={val("secondary_color", "#1C1917")}
              onChange={v => set("secondary_color", v)}
            />
            <ColorSwatch
              label="Accent Colour"
              value={val("accent_color", "#FEF0E3")}
              onChange={v => set("accent_color", v)}
            />
          </div>

          {/* Live colour preview */}
          <div
            className="rounded-xl border border-[#E8E6E2] p-4"
            style={{ background: val("accent_color", "#FEF0E3") }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: val("secondary_color", "#1C1917") }}>
              Colour Preview
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                className="h-8 px-4 rounded-lg text-xs font-semibold text-white"
                style={{ background: val("primary_color", "#F5821F") }}
              >
                Primary Button
              </button>
              <button
                className="h-8 px-4 rounded-lg text-xs font-semibold border-2"
                style={{ color: val("primary_color", "#F5821F"), borderColor: val("primary_color", "#F5821F"), background: "transparent" }}
              >
                Outline
              </button>
              <span
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
                style={{ background: val("primary_color", "#F5821F"), color: "#fff" }}
              >
                Badge
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-1">
            <Field label={<><Image size={11} /> Logo URL</>}>
              <div className="space-y-1.5">
                <input
                  className={inp}
                  placeholder="https://cdn.example.com/logo.png"
                  value={val("logo_url")}
                  onChange={e => set("logo_url", e.target.value)}
                />
                {val("logo_url") && (
                  <div className="h-16 border border-[#E8E6E2] rounded-lg bg-[#FAFAF9] flex items-center justify-center overflow-hidden">
                    <img
                      src={val("logo_url")}
                      alt="Logo preview"
                      className="max-h-full max-w-full object-contain p-2"
                      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  </div>
                )}
              </div>
            </Field>
            <Field label={<><Palette size={11} /> Favicon URL</>}>
              <div className="space-y-1.5">
                <input
                  className={inp}
                  placeholder="https://cdn.example.com/favicon.ico"
                  value={val("favicon_url")}
                  onChange={e => set("favicon_url", e.target.value)}
                />
                {val("favicon_url") && (
                  <div className="h-16 border border-[#E8E6E2] rounded-lg bg-[#FAFAF9] flex items-center justify-center overflow-hidden">
                    <img
                      src={val("favicon_url")}
                      alt="Favicon preview"
                      className="h-8 w-8 object-contain"
                      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  </div>
                )}
              </div>
            </Field>
          </div>

          <p className="text-xs text-[#A8A29E]">
            Tenants can also upload logo/favicon images directly from their own Settings → Branding page.
            Changes here are saved with the main Save Changes button above.
          </p>
        </div>
      </Section>

      {/* System Info */}
      <Section title="System Information">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <Field label="Tenant ID">
            <input className={readInp} readOnly value={org.id} />
          </Field>
          <Field label={<><Clock size={11} /> Created On</>}>
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
