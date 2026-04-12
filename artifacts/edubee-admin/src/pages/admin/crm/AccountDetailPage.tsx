import { useState, useEffect, useRef } from "react";
import { formatDate, formatDateTime } from "@/lib/date-format";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  ArrowLeft, Save, Building2, Users, FileText, Briefcase,
  Plus, Loader2, ChevronRight, ExternalLink, Package, DollarSign, Shield,
  UserPlus, X, Layers, Copy, Check, Camera,
} from "lucide-react";
import { AccountServiceProfilesTab } from "./AccountServiceProfilesTab";
import { PortalAccessPanel } from "@/components/crm/PortalAccessPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLookup } from "@/hooks/use-lookup";
import { ImageCropDialog } from "@/components/shared/ImageCropDialog";
import { fileToDataUrl } from "@/lib/imageResize";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const INDIVIDUAL_TYPES = ["Student", "Client"];

// Account types that represent a business entity (eligible to become a tenant)
const BUSINESS_TYPES = ["Company", "Agent", "Institute", "Partner", "Organization", "School",
  "Sub_Agency", "Super_Agency", "Provider", "Supplier", "Branch"];

function getMyRole(): string {
  try {
    const token = localStorage.getItem("edubee_token") ?? "";
    if (!token) return "";
    const payload = JSON.parse(atob(token.split(".")[1]));
    return (payload.role ?? payload.staffRole ?? "") as string;
  } catch { return ""; }
}

function slugify(text: string): string {
  return text.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40);
}

const TENANT_PLANS = [
  { value: "solo",       label: "Solo"       },
  { value: "starter",    label: "Starter"    },
  { value: "growth",     label: "Growth"     },
  { value: "enterprise", label: "Enterprise" },
];

const dlgInp = "w-full h-9 rounded-lg border border-[#E8E6E2] bg-white px-3 text-sm text-[#1C1917] outline-none focus:ring-2 focus:ring-[--e-orange]/30 focus:border-[--e-orange] transition-all";

interface CreateTenantDialogProps {
  account: { name: string; email?: string | null; website?: string | null };
  onClose: () => void;
}

function CreateTenantDialog({ account, onClose }: CreateTenantDialogProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name:       account.name ?? "",
    subdomain:  slugify(account.name ?? ""),
    ownerEmail: account.email ?? "",
    planType:   "starter",
    planStatus: "trial",
  });

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast({ title: "Company name is required", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      const resp = await axios.post(`${BASE}/api/superadmin/tenants`, {
        name:       form.name.trim(),
        subdomain:  form.subdomain.trim() || undefined,
        ownerEmail: form.ownerEmail.trim() || undefined,
        planType:   form.planType,
        planStatus: form.planStatus,
      });
      toast({
        title: "Tenant created",
        description: `${form.name} — ${resp.data?.subdomain ?? form.subdomain}.edubee.co`,
      });
      onClose();
      navigate("/admin/superadmin/tenants");
    } catch (e: any) {
      toast({
        title: "Failed to create tenant",
        description: e?.response?.data?.error ?? "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.35)" }}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl" style={{ border: "1px solid #E8E6E2" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #F4F3F1" }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--e-orange-lt)" }}>
              <Building2 size={15} style={{ color: "var(--e-orange)" }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1C1917]">Create as Tenant</p>
              <p className="text-xs text-[#A8A29E]">New independent organisation on Edubee</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#A8A29E] hover:text-[#1C1917] transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#57534E] uppercase tracking-wide">
              Company Name <span style={{ color: "var(--e-orange)" }}>*</span>
            </label>
            <input className={dlgInp} value={form.name} onChange={e => set("name", e.target.value)} />
          </div>

          {/* Subdomain */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#57534E] uppercase tracking-wide">Subdomain</label>
            <div className="relative">
              <input
                className={dlgInp}
                placeholder="e.g. acme"
                value={form.subdomain}
                onChange={e => set("subdomain", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                style={{ paddingRight: "6.5rem" }}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#A8A29E]">.edubee.co</span>
            </div>
          </div>

          {/* Owner Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#57534E] uppercase tracking-wide">Owner Email</label>
            <input
              className={dlgInp}
              type="email"
              placeholder="admin@company.com"
              value={form.ownerEmail}
              onChange={e => set("ownerEmail", e.target.value)}
            />
          </div>

          {/* Plan + Status row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#57534E] uppercase tracking-wide">Plan</label>
              <select className={dlgInp} value={form.planType} onChange={e => set("planType", e.target.value)}>
                {TENANT_PLANS.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#57534E] uppercase tracking-wide">Status</label>
              <select className={dlgInp} value={form.planStatus} onChange={e => set("planStatus", e.target.value)}>
                <option value="trial">Trial (30 days)</option>
                <option value="active">Active</option>
              </select>
            </div>
          </div>

          {/* Info box */}
          <div className="rounded-lg px-4 py-3 text-xs text-[#92400E] leading-relaxed"
            style={{ background: "#FEF0E3", border: "1px solid #FDE68A" }}>
            <strong>테넌트 생성 시 자동으로:</strong> PostgreSQL 스키마 프로비저닝 + 기본 설정 데이터 세팅 + Owner Email로 환영 이메일 발송
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4" style={{ borderTop: "1px solid #F4F3F1" }}>
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-lg text-sm font-medium text-[#57534E] transition-colors hover:bg-[#F4F3F1]"
            style={{ border: "1px solid #E8E6E2" }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={saving}
            className="h-9 px-5 rounded-lg text-sm font-semibold text-white flex items-center gap-2 disabled:opacity-50 transition-all"
            style={{ background: "var(--e-orange)" }}
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            Create Tenant
          </button>
        </div>
      </div>
    </div>
  );
}

function getAccountTypeBadge(accountType?: string | null): { bg: string; text: string; label: string } {
  switch (accountType) {
    case "Student":      return { bg: "var(--e-orange-lt)", text: "var(--e-orange)", label: "Student" };
    case "Client":       return { bg: "#FCE7F3", text: "#BE185D", label: "Client" };
    case "Company":      return { bg: "#E0F2FE", text: "#0369A1", label: "Company" };
    case "Agent":        return { bg: "#F4F3F1", text: "#57534E", label: "Agent" };
    case "Institute":    return { bg: "#DCFCE7", text: "#16A34A", label: "Institute" };
    case "Partner":      return { bg: "#EDE9FE", text: "#7C3AED", label: "Partner" };
    case "Organization": return { bg: "#FEF9C3", text: "#CA8A04", label: "Organization" };
    default:             return { bg: "#F4F3F1", text: "#57534E", label: accountType ?? "—" };
  }
}

interface Account {
  id: string;
  name: string;
  manualInput: boolean;
  accountType?: string | null;
  parentAccountId?: string | null;
  primaryContactId?: string | null;
  secondaryContactId?: string | null;
  phoneNumber?: string | null;
  phoneNumber2?: string | null;
  fax?: string | null;
  email?: string | null;
  website?: string | null;
  websiteUrl2?: string | null;
  address?: string | null;
  secondaryAddress?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  postalCode?: string | null;
  location?: string | null;
  abn?: string | null;
  isProductSource: boolean;
  isProductProvider: boolean;
  foundYear?: string | null;
  totalCapacity?: number | null;
  avetmissDeliveryLocationId?: string | null;
  description?: string | null;
  profileImageUrl?: string | null;
  ownerId: string;
  status: string;
  createdOn?: string | null;
  modifiedOn?: string | null;
  primaryContact?: {
    id: string; firstName: string; lastName: string;
    originalName?: string | null;
    fullName?: string | null;
    englishName?: string | null;
    title?: string | null;
    gender?: string | null;
    email?: string | null;
    mobile?: string | null;
    officeNumber?: string | null;
    nationality?: string | null;
    dob?: string | null;
    snsType?: string | null;
    snsId?: string | null;
  } | null;
  secondaryContact?: { id: string; firstName: string; lastName: string } | null;
  parentAccount?: { id: string; name: string } | null;
}

interface StaffOption { id: string; name: string; }

type FormData = Omit<Account, "id" | "createdOn" | "modifiedOn" | "primaryContact" | "secondaryContact" | "parentAccount">;

function getTabs(accountType?: string | null) {
  const base = [
    { key: "overview",  label: "Overview",  icon: Building2 },
    { key: "contacts",  label: "Contacts",  icon: Users     },
  ];
  const leads          = { key: "leads",           label: "Leads",            icon: Briefcase  };
  const contracts      = { key: "contracts",       label: "Contracts",        icon: FileText   };
  const products       = { key: "products",        label: "Products",         icon: Package    };
  const commission     = { key: "commission",      label: "Commission",       icon: DollarSign };
  const portal         = { key: "portal",          label: "Portal Access",    icon: Shield     };
  const ledger         = { key: "ledger",          label: "Ledger",           icon: DollarSign };
  const serviceProfiles = { key: "service_profiles", label: "Service Profiles", icon: Layers  };

  switch (accountType) {
    case "Student":
    case "Client":
    case "Company":
      return [...base, leads, contracts, ledger, portal];

    case "Agent":
    case "Institute":
    case "Partner":
    case "Organization":
      return [...base, leads, contracts, serviceProfiles, products, commission, ledger, portal];

    default:
      return [...base, leads, contracts, ledger, portal];
  }
}

function QI({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2 py-1.5 border-b border-[#E8E6E2] last:border-0">
      <span className="text-[12px] text-[#57534E] shrink-0 w-28">{label}</span>
      <span className="text-[13px] font-medium text-[#1C1917] text-right">{children}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-(--e-orange) border-b border-(--e-orange)/20 pb-1.5">
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">{children}</div>
    </div>
  );
}

function Field({ label, span = 1, required, children }: {
  label: string; span?: 1 | 2; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div className={span === 2 ? "col-span-2" : ""}>
      <Label className="text-xs font-medium text-stone-500 mb-1.5 block">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

function Toggle({ label, checked, onChange, description }: {
  label: string; checked: boolean; onChange: (v: boolean) => void; description?: string;
}) {
  return (
    <div className="flex items-center gap-3 col-span-2">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className="w-10 h-6 rounded-full transition-colors relative shrink-0"
        style={{ background: checked ? "var(--e-orange)" : "#E8E6E2" }}
      >
        <span
          className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
          style={{ left: checked ? "calc(100% - 22px)" : "2px" }}
        />
      </button>
      <div>
        <p className="text-sm font-medium text-stone-700">{label}</p>
        {description && <p className="text-xs text-stone-400">{description}</p>}
      </div>
    </div>
  );
}

/** Parse a raw search string into { firstName, lastName }.
 *  Rule: last whitespace-separated token → lastName, everything before → firstName. */
function parseContactName(raw: string): { firstName: string; lastName: string } {
  const parts = raw.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: "", lastName: parts[0] };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts[parts.length - 1] };
}

const EMPTY_CFORM = { firstName: "", lastName: "", englishName: "", originalName: "", email: "", mobile: "", nationality: "" };

function ContactLookup({ value, onChange, placeholder }: {
  value: string; onChange: (id: string, contact?: { email?: string | null; mobile?: string | null; firstName?: string; lastName?: string; fullName?: string | null; dob?: string | null }) => void; placeholder?: string;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen]     = useState(false);
  const [mode, setMode]     = useState<"search" | "create">("search");
  const [creating, setCreating] = useState(false);
  const [cform, setCform]   = useState(EMPTY_CFORM);
  const containerRef        = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["contacts-lookup", search],
    queryFn: () => axios.get(`${BASE}/api/crm/contacts?search=${encodeURIComponent(search)}&limit=10`).then(r => r.data.data ?? []),
    enabled: open && mode === "search" && search.length > 0,
  });

  const { data: selected } = useQuery({
    queryKey: ["contact-single", value],
    queryFn: () => axios.get(`${BASE}/api/crm/contacts/${value}`).then(r => r.data),
    enabled: !!value,
  });

  const displayName = selected
    ? (selected.fullName || `${selected.firstName ?? ""} ${selected.lastName ?? ""}`.trim())
    : "";

  function openCreate() {
    const p = search.trim().length > 0 ? parseContactName(search) : { firstName: "", lastName: "" };
    setCform({ ...EMPTY_CFORM, firstName: p.firstName, lastName: p.lastName.toUpperCase() });
    setMode("create");
  }

  function backToSearch() {
    setMode("search");
    setCform(EMPTY_CFORM);
  }

  async function handleCreate() {
    if (!cform.lastName.trim() || creating) return;
    setCreating(true);
    try {
      const res = await axios.post(`${BASE}/api/crm/contacts`, {
        firstName:    cform.firstName.trim()    || null,
        lastName:     cform.lastName.trim().toUpperCase(),
        englishName:  cform.englishName.trim()  || null,
        originalName: cform.originalName.trim() || null,
        email:        cform.email.trim()        || null,
        mobile:       cform.mobile.trim()       || null,
        nationality:  cform.nationality.trim()  || null,
        status:       "Active",
        accountType:  "Student",
      });
      const newContact = res.data;
      qc.invalidateQueries({ queryKey: ["contacts-lookup"] });
      qc.setQueryData(["contact-single", newContact.id], newContact);
      onChange(newContact.id, newContact);
      setOpen(false);
      setMode("search");
      setSearch("");
      setCform(EMPTY_CFORM);
    } catch {
      // silent — user will retry
    } finally {
      setCreating(false);
    }
  }

  const results: { id: string; firstName?: string; lastName?: string; fullName?: string | null; email?: string | null; mobile?: string | null }[] = Array.isArray(data) ? data : [];

  function handleContainerBlur(e: React.FocusEvent<HTMLDivElement>) {
    if (containerRef.current && !containerRef.current.contains(e.relatedTarget as Node)) {
      setOpen(false);
      setMode("search");
    }
  }

  return (
    <div className="relative" ref={containerRef} onBlur={handleContainerBlur}>
      <Input
        value={open ? search : displayName}
        placeholder={placeholder ?? "Search contacts…"}
        onFocus={() => { setOpen(true); setMode("search"); setSearch(""); }}
        onChange={e => setSearch(e.target.value)}
        className="h-10 text-sm border-[#E8E6E2] focus:border-(--e-orange) pr-8"
      />
      {value && !open && (
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-300 hover:text-stone-500 transition-colors"
          onMouseDown={e => { e.preventDefault(); onChange(""); }}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-[#E8E6E2] rounded-xl shadow-xl">

          {/* ── Search mode ── */}
          {mode === "search" && (
            <div className="max-h-56 overflow-y-auto">
              {results.length > 0 && results.map(c => (
                <button
                  key={c.id}
                  type="button"
                  className="w-full px-3 py-2.5 text-left text-sm hover:bg-(--e-orange-lt) transition-colors first:rounded-t-xl"
                  onMouseDown={() => { onChange(c.id, c); setOpen(false); }}
                >
                  <span className="font-medium text-stone-800">
                    {c.fullName || `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim()}
                  </span>
                  {c.email && <span className="ml-2 text-xs text-stone-400">{c.email}</span>}
                </button>
              ))}
              {results.length === 0 && search.trim().length > 0 && (
                <div className="px-3 py-2.5 text-xs text-stone-400 italic">No contacts found for &ldquo;{search.trim()}&rdquo;</div>
              )}
              {search.trim().length === 0 && (
                <div className="px-3 py-2.5 text-xs text-stone-400 italic">Type a name to search…</div>
              )}
              {/* Create button — always visible when typing */}
              {search.trim().length > 0 && (
                <button
                  type="button"
                  className="w-full px-3 py-2.5 text-left text-sm flex items-center gap-2 text-emerald-600 hover:bg-emerald-50 border-t border-[#F0EDE8] transition-colors font-medium rounded-b-xl"
                  onClick={openCreate}
                >
                  <UserPlus className="w-4 h-4 shrink-0" />
                  Create &ldquo;{search.trim()}&rdquo; as new contact
                </button>
              )}
            </div>
          )}

          {/* ── Create mode (inline panel) ── */}
          {mode === "create" && (
            <div className="p-4 space-y-3">
              {/* Header */}
              <div className="flex items-center gap-2 pb-1">
                <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
                  <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <span className="text-sm font-bold text-emerald-700">New Contact</span>
              </div>

              {/* First Name + Last Name */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wide mb-1 block">
                    First Name
                  </Label>
                  <Input
                    autoFocus
                    value={cform.firstName}
                    onChange={e => { const v = e.target.value; setCform(f => ({ ...f, firstName: v.length > 0 ? v.charAt(0).toUpperCase() + v.slice(1).toLowerCase() : v })); }}
                    placeholder="e.g. Minjun"
                    className="h-8 text-sm border-[#E8E6E2] focus:border-(--e-orange)"
                  />
                </div>
                <div>
                  <Label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wide mb-1 block">
                    Last Name <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    value={cform.lastName}
                    onChange={e => setCform(f => ({ ...f, lastName: e.target.value.toUpperCase() }))}
                    placeholder="KIM"
                    className="h-8 text-sm border-[#E8E6E2] focus:border-(--e-orange) uppercase"
                  />
                </div>
              </div>

              {/* English Name (Nickname) + Original Name */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wide mb-1 block">
                    English Name <span className="text-stone-400 normal-case font-normal">(Nickname)</span>
                  </Label>
                  <Input
                    value={cform.englishName}
                    onChange={e => { const v = e.target.value; setCform(f => ({ ...f, englishName: v.length > 0 ? v.charAt(0).toUpperCase() + v.slice(1).toLowerCase() : v })); }}
                    placeholder="e.g. Alex"
                    className="h-8 text-sm border-[#E8E6E2] focus:border-(--e-orange)"
                  />
                </div>
                <div>
                  <Label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wide mb-1 block">
                    Original Name <span className="text-stone-400 normal-case font-normal">(native script)</span>
                  </Label>
                  <Input
                    value={cform.originalName}
                    onChange={e => setCform(f => ({ ...f, originalName: e.target.value }))}
                    placeholder="e.g. 김민준"
                    className="h-8 text-sm border-[#E8E6E2] focus:border-(--e-orange)"
                  />
                </div>
              </div>

              {/* Email + Mobile */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wide mb-1 block">Email</Label>
                  <Input
                    type="email"
                    value={cform.email}
                    onChange={e => setCform(f => ({ ...f, email: e.target.value }))}
                    placeholder="email@example.com"
                    className="h-8 text-sm border-[#E8E6E2] focus:border-(--e-orange)"
                  />
                </div>
                <div>
                  <Label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wide mb-1 block">Phone</Label>
                  <Input
                    value={cform.mobile}
                    onChange={e => setCform(f => ({ ...f, mobile: e.target.value }))}
                    placeholder="+61 4xx xxx xxx"
                    className="h-8 text-sm border-[#E8E6E2] focus:border-(--e-orange)"
                  />
                </div>
              </div>

              {/* Nationality */}
              <div>
                <Label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wide mb-1 block">Nationality</Label>
                <Input
                  value={cform.nationality}
                  onChange={e => setCform(f => ({ ...f, nationality: e.target.value }))}
                  placeholder="e.g. Korean"
                  className="h-8 text-sm border-[#E8E6E2] focus:border-(--e-orange)"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  className="flex-1 h-9 rounded-lg border border-[#E8E6E2] text-sm text-stone-600 hover:bg-stone-50 transition-colors font-medium"
                  onClick={backToSearch}
                >
                  Back to search
                </button>
                <button
                  type="button"
                  disabled={!cform.lastName.trim() || creating}
                  className="flex-1 h-9 rounded-lg text-sm text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                  style={{ background: "var(--e-orange)" }}
                  onClick={handleCreate}
                >
                  {creating
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Creating…</>
                    : "Create & Select"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AccountLookup({ value, onChange, excludeId, placeholder }: {
  value: string; onChange: (id: string) => void; excludeId?: string; placeholder?: string;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen]     = useState(false);

  const { data } = useQuery({
    queryKey: ["accounts-lookup", search, excludeId],
    queryFn: () => axios.get(
      `${BASE}/api/crm/accounts-search?search=${encodeURIComponent(search)}${excludeId ? `&exclude=${excludeId}` : ""}`
    ).then(r => r.data),
    enabled: open && search.length > 0,
  });

  const { data: selected } = useQuery({
    queryKey: ["account-name", value],
    queryFn: () => axios.get(`${BASE}/api/crm/accounts/${value}`).then(r => r.data),
    enabled: !!value,
  });

  return (
    <div className="relative">
      <Input
        value={open ? search : (selected?.name ?? "")}
        placeholder={placeholder ?? "Search accounts…"}
        onFocus={() => { setOpen(true); setSearch(""); }}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        onChange={e => setSearch(e.target.value)}
        className="h-10 text-sm border-[#E8E6E2] focus:border-(--e-orange)"
      />
      {open && Array.isArray(data) && data.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-[#E8E6E2] rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {data.map((a: { id: string; name: string }) => (
            <button
              key={a.id}
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-(--e-orange-lt) transition-colors"
              onMouseDown={() => { onChange(a.id); setOpen(false); }}
            >
              {a.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── LedgerTab ─────────────────────────────────────────────────────────────────
const fmtAmt = (n: any) => n != null ? `$${Number(n).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—";
const fmtD   = (d: any) => d ? formatDate(d) : "—";

const LDGR_SRC: Record<string, { bg: string; text: string }> = {
  payment:     { bg: "#DCFCE7", text: "#16A34A" },
  transaction: { bg: "var(--e-orange-lt)", text: "var(--e-orange)" },
};
const LDGR_DIR: Record<string, { bg: string; text: string }> = {
  received:    { bg: "#DCFCE7", text: "#16A34A" },
  paid:        { bg: "#FEF2F2", text: "#DC2626" },
  transaction: { bg: "#F0F9FF", text: "#0369A1" },
};

function LedgerTab({ accountId }: { accountId: string }) {
  const { data: rows = [], isLoading } = useQuery<any[]>({
    queryKey: ["account-ledger", accountId],
    queryFn: () => axios.get(`${BASE}/api/accounting/ledger/by-account/${accountId}`).then(r => r.data),
    enabled: !!accountId,
  });

  const totalIn  = rows.filter(r => r.direction === "received").reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const totalOut = rows.filter(r => r.direction === "paid").reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const txnTotal = rows.filter(r => r.source === "transaction").reduce((s, r) => s + Number(r.amount ?? 0), 0);

  if (isLoading) {
    return (
      <div className="bg-white border border-[#E8E6E2] rounded-xl p-10 text-center text-stone-400 text-sm">
        Loading ledger…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E8E6E2] rounded-xl p-4">
          <p className="text-xs text-stone-400 mb-1">Total Received</p>
          <p className="text-xl font-bold text-[#16A34A]">{fmtAmt(totalIn)}</p>
        </div>
        <div className="bg-white border border-[#E8E6E2] rounded-xl p-4">
          <p className="text-xs text-stone-400 mb-1">Total Paid Out</p>
          <p className="text-xl font-bold text-[#DC2626]">{fmtAmt(totalOut)}</p>
        </div>
        <div className="bg-white border border-[#E8E6E2] rounded-xl p-4">
          <p className="text-xs text-stone-400 mb-1">Transaction Volume</p>
          <p className="text-xl font-bold text-(--e-orange)">{fmtAmt(txnTotal)}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E8E6E2] rounded-xl overflow-x-auto">
        <div className="px-5 py-3 border-b border-[#E8E6E2]">
          <h3 className="text-sm font-semibold text-[#1C1917]">Account Ledger ({rows.length} entries)</h3>
        </div>
        {rows.length === 0 ? (
          <div className="text-center py-12 text-stone-400">
            <DollarSign size={32} strokeWidth={1.5} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No financial records linked to this account yet.</p>
            <p className="text-xs mt-1">Records appear when payments are received/paid against this account.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E8E6E2] bg-[#FAFAF9]">
                  {["Source", "Ref", "Date", "Type", "Direction", "Amount", "Bank Ref", "Status"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-stone-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row: any, i: number) => {
                  const srcStyle = LDGR_SRC[row.source] ?? { bg: "#F4F3F1", text: "#57534E" };
                  const dirStyle = LDGR_DIR[row.direction] ?? { bg: "#F4F3F1", text: "#57534E" };
                  const typeLabel = String(row.type ?? "").replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
                  return (
                    <tr key={`${row.id}-${i}`} className="border-b border-[#E8E6E2] hover:bg-[#FAFAF9]">
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium" style={{ background: srcStyle.bg, color: srcStyle.text }}>
                          {row.source === "payment" ? "Payment" : "Txn"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-stone-500">{row.ref?.slice(0, 16) ?? "—"}</td>
                      <td className="px-4 py-3 text-[12px] text-stone-500">{fmtD(row.entry_date)}</td>
                      <td className="px-4 py-3 text-[12px] text-stone-600">{typeLabel || "—"}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium" style={{ background: dirStyle.bg, color: dirStyle.text }}>
                          {row.direction === "received" ? "Received" : row.direction === "paid" ? "Paid Out" : "Txn"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[13px] font-bold" style={{ color: row.direction === "received" ? "#16A34A" : row.direction === "paid" ? "#DC2626" : "var(--e-orange)" }}>
                        {fmtAmt(row.amount)}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-stone-400 font-mono">{row.bank_reference ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          row.status === "Approved" || row.status === "completed" ? "bg-[#DCFCE7] text-[#16A34A]" :
                          row.status === "Pending"  ? "bg-[#FEF9C3] text-[#CA8A04]" :
                          "bg-[#F4F3F1] text-[#57534E]"}`}>
                          {row.status ?? "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const INPUT_CLS = "h-10 text-sm border-[#E8E6E2] focus:border-(--e-orange) focus:ring-0";

export default function AccountDetailPage() {
  const [matchNew] = useRoute("/admin/crm/accounts/new");
  const [matchId, params] = useRoute("/admin/crm/accounts/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const accountTypes     = useLookup("account_type");

  const isNew = !!matchNew;
  const id    = matchId ? (params?.id ?? "") : "";

  const [tab, setTab] = useState("overview");
  const [copiedId, setCopiedId] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showTenantDlg, setShowTenantDlg] = useState(false);
  const isSuperAdmin = getMyRole() === "super_admin";
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Image files only (JPG, PNG, etc.)", variant: "destructive" });
      return;
    }
    if (photoInputRef.current) photoInputRef.current.value = "";
    setPendingFile(file);
  };

  const doUploadAccount = async (cropped: File) => {
    setPendingFile(null);
    setUploadingPhoto(true);
    try {
      const dataUrl = await fileToDataUrl(cropped);
      await axios.patch(`${BASE}/api/crm/accounts/${id}/profile-image`, { dataUrl });
      qc.invalidateQueries({ queryKey: ["crm-account", id] });
      toast({ title: "Profile photo updated" });
    } catch {
      toast({ title: "Failed to upload photo", variant: "destructive" });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const { data: account, isLoading } = useQuery({
    queryKey: ["crm-account", id],
    queryFn: () => axios.get(`${BASE}/api/crm/accounts/${id}`).then(r => r.data),
    enabled: !!id,
  });

  const { data: accountContracts = [], isLoading: contractsLoading } = useQuery<any[]>({
    queryKey: ["crm-account-contracts", id],
    queryFn: () => axios.get(`${BASE}/api/crm/accounts/${id}/contracts`).then(r => r.data),
    enabled: !!id,
  });

  const { data: accountLeads = [], isLoading: leadsLoading } = useQuery<any[]>({
    queryKey: ["crm-account-leads", id],
    queryFn: () => axios.get(`${BASE}/api/crm/accounts/${id}/leads`).then(r => r.data),
    enabled: !!id,
  });

  const { data: meData } = useQuery({
    queryKey: ["me"],
    queryFn: () => axios.get(`${BASE}/api/auth/me`).then(r => r.data),
  });

  const { data: staffList = [] } = useQuery<StaffOption[]>({
    queryKey: ["crm-staff"],
    queryFn: () => axios.get(`${BASE}/api/crm/staff`).then(r => r.data),
  });

  // ── Additional Contacts ───────────────────────────────────────────────────
  const [showAddContact, setShowAddContact]   = useState(false);
  const [contactSearch, setContactSearch]     = useState("");

  const { data: additionalContacts = [], isLoading: addlLoading } = useQuery<any[]>({
    queryKey: ["crm-account-additional-contacts", id],
    queryFn: () => axios.get(`${BASE}/api/crm/accounts/${id}/contacts`).then(r => r.data),
    enabled: !!id && !isNew,
  });

  const { data: contactSearchResults = [] } = useQuery<any[]>({
    queryKey: ["crm-contacts-search-inline", contactSearch],
    queryFn: () => axios.get(`${BASE}/api/crm/contacts?search=${encodeURIComponent(contactSearch)}&limit=10`).then(r => r.data?.data ?? r.data),
    enabled: showAddContact && contactSearch.length >= 1,
  });

  const addContactMut = useMutation({
    mutationFn: (contactId: string) =>
      axios.post(`${BASE}/api/crm/accounts/${id}/contacts`, { contactId }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-account-additional-contacts", id] });
      setContactSearch("");
      setShowAddContact(false);
      toast({ title: "Contact linked" });
    },
    onError: (err: any) => {
      toast({ title: err?.response?.data?.error ?? "Failed to link contact", variant: "destructive" });
    },
  });

  const removeContactMut = useMutation({
    mutationFn: (linkId: string) =>
      axios.delete(`${BASE}/api/crm/accounts/${id}/contacts/${linkId}`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-account-additional-contacts", id] });
      toast({ title: "Contact removed" });
    },
  });

  const emptyForm: FormData = {
    name: "", manualInput: false, accountType: "Student",
    parentAccountId: undefined as any, primaryContactId: undefined as any, secondaryContactId: undefined as any,
    phoneNumber: undefined as any, phoneNumber2: undefined as any, fax: undefined as any,
    email: undefined as any, website: undefined as any, websiteUrl2: undefined as any,
    address: undefined as any, secondaryAddress: undefined as any, country: undefined as any,
    state: undefined as any, city: undefined as any, postalCode: undefined as any,
    location: undefined as any,
    abn: undefined as any, isProductSource: false, isProductProvider: false,
    foundYear: undefined as any, totalCapacity: undefined as any,
    avetmissDeliveryLocationId: undefined as any, description: undefined as any,
    ownerId: meData?.id ?? "", status: "Active",
  };

  const [form, setForm] = useState<FormData>(emptyForm);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (account && !isNew) {
      const autoName = !account.manualInput && account.primaryContact?.fullName
        ? account.primaryContact.fullName
        : (account.name ?? "");
      setForm({
        name:                       autoName,
        manualInput:                account.manualInput ?? false,
        accountType:                account.accountType ?? "Student",
        parentAccountId:            account.parentAccountId ?? undefined,
        primaryContactId:           account.primaryContactId ?? undefined,
        secondaryContactId:         account.secondaryContactId ?? undefined,
        phoneNumber:                account.phoneNumber ?? undefined,
        phoneNumber2:               account.phoneNumber2 ?? undefined,
        fax:                        account.fax ?? undefined,
        email:                      account.email ?? undefined,
        website:                    account.website ?? undefined,
        websiteUrl2:                account.websiteUrl2 ?? undefined,
        address:                    account.address ?? undefined,
        secondaryAddress:           account.secondaryAddress ?? undefined,
        country:                    account.country ?? undefined,
        state:                      account.state ?? undefined,
        city:                       account.city ?? undefined,
        postalCode:                 account.postalCode ?? undefined,
        location:                   account.location ?? undefined,
        abn:                        account.abn ?? undefined,
        isProductSource:            account.isProductSource ?? false,
        isProductProvider:          account.isProductProvider ?? false,
        foundYear:                  account.foundYear ?? undefined,
        totalCapacity:              account.totalCapacity ?? undefined,
        avetmissDeliveryLocationId: account.avetmissDeliveryLocationId ?? undefined,
        description:                account.description ?? undefined,
        ownerId:                    account.ownerId ?? meData?.id ?? "",
        status:                     account.status ?? "Active",
      });
    }
  }, [account, isNew, meData]);

  useEffect(() => {
    if (meData && isNew) setForm(f => ({ ...f, ownerId: meData.id }));
  }, [meData, isNew]);

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm(f => ({ ...f, [key]: value }));
    setDirty(true);
  };

  const saveMut = useMutation({
    mutationFn: (body: FormData) =>
      isNew
        ? axios.post(`${BASE}/api/crm/accounts`, body).then(r => r.data)
        : axios.put(`${BASE}/api/crm/accounts/${id}`, body).then(r => r.data),
    onSuccess: (data) => {
      toast({ title: isNew ? "Account created" : "Account saved" });
      qc.invalidateQueries({ queryKey: ["crm-accounts"] });
      if (isNew) navigate(`/admin/crm/accounts/${data.id}`);
      else { qc.invalidateQueries({ queryKey: ["crm-account", id] }); setDirty(false); }
    },
    onError: (err: any) =>
      toast({ title: err?.response?.data?.error ?? "Save failed", variant: "destructive" }),
  });

  const handleSave = () => {
    if (!form.accountType) { toast({ title: "Account Type is required", variant: "destructive" }); return; }
    if (!form.ownerId)     { toast({ title: "Owner is required",        variant: "destructive" }); return; }
    saveMut.mutate(form);
  };

  if (!isNew && isLoading) {
    return <div className="flex items-center justify-center h-64 text-stone-400 text-sm">Loading…</div>;
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/admin/crm/accounts")}
            className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors"
          >
            <ArrowLeft size={15} /> Back
          </button>
          <span className="text-stone-300">/</span>
          {/* Profile avatar — only for existing accounts */}
          {!isNew && account && (() => {
            const isIndividual = INDIVIDUAL_TYPES.includes(account.accountType ?? "");
            const initials = isIndividual
              ? [(account.firstName ?? account.primaryContact?.firstName)?.charAt(0), (account.lastName ?? account.primaryContact?.lastName)?.charAt(0)].filter(Boolean).join("").toUpperCase() || (account.name || "?").slice(0, 2).toUpperCase()
              : (account.name || "?").slice(0, 2).toUpperCase();
            const badge = getAccountTypeBadge(account.accountType);
            const profileSrc = account.profileImageUrl
              ? account.profileImageUrl
              : null;
            return (
              <div className="relative group cursor-pointer shrink-0" onClick={() => !uploadingPhoto && photoInputRef.current?.click()} title="Change profile photo">
                <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                {profileSrc ? (
                  <div className="w-8 h-8 rounded-full overflow-hidden border-2 shrink-0" style={{ borderColor: badge.bg }}>
                    <img src={profileSrc} alt="Profile" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: badge.bg, color: badge.text }}>
                    {initials}
                  </div>
                )}
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {uploadingPhoto ? <Loader2 size={12} className="text-white animate-spin" /> : <Camera size={12} className="text-white" />}
                </div>
              </div>
            );
          })()}
          <h1 className="text-lg font-semibold text-stone-900">
            {isNew ? "New Account" : (account?.name ?? "Account")}
          </h1>
          {!isNew && account?.status && (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
              account.status === "Active" ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#F4F3F1] text-[#57534E]"
            }`}>{account.status}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Create as Tenant — super_admin only, business account types only */}
          {!isNew && isSuperAdmin && account && BUSINESS_TYPES.includes(account.accountType ?? "") && (
            <button
              onClick={() => setShowTenantDlg(true)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold transition-all"
              style={{ border: "1px solid var(--e-orange)", color: "var(--e-orange)", background: "var(--e-orange-lt)" }}
              title="Create this account as a new independent tenant"
            >
              <Building2 size={13} />
              Create as Tenant
            </button>
          )}
        {(isNew || dirty) && (
          <div className="flex items-center gap-2">
            {!isNew && (
              <Button
                variant="outline"
                onClick={() => {
                  if (!account) return;
                  const autoName = !account.manualInput && account.primaryContact?.fullName
                    ? account.primaryContact.fullName
                    : (account.name ?? "");
                  setForm({
                    name: autoName, manualInput: account.manualInput ?? false,
                    accountType: account.accountType ?? "Student",
                    parentAccountId: account.parentAccountId ?? undefined,
                    primaryContactId: account.primaryContactId ?? undefined,
                    secondaryContactId: account.secondaryContactId ?? undefined,
                    phoneNumber: account.phoneNumber ?? undefined,
                    phoneNumber2: account.phoneNumber2 ?? undefined,
                    fax: account.fax ?? undefined, email: account.email ?? undefined,
                    website: account.website ?? undefined, websiteUrl2: account.websiteUrl2 ?? undefined,
                    address: account.address ?? undefined, secondaryAddress: account.secondaryAddress ?? undefined,
                    country: account.country ?? undefined, state: account.state ?? undefined,
                    city: account.city ?? undefined, postalCode: account.postalCode ?? undefined,
                    location: account.location ?? undefined, abn: account.abn ?? undefined,
                    isProductSource: account.isProductSource ?? false,
                    isProductProvider: account.isProductProvider ?? false,
                    foundYear: account.foundYear ?? undefined,
                    totalCapacity: account.totalCapacity ?? undefined,
                    avetmissDeliveryLocationId: account.avetmissDeliveryLocationId ?? undefined,
                    description: account.description ?? undefined,
                    ownerId: account.ownerId ?? meData?.id ?? "", status: account.status ?? "Active",
                  });
                  setDirty(false);
                }}
                className="flex items-center gap-1.5 text-sm"
              >
                Discard
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={saveMut.isPending}
              className="flex items-center gap-1.5 text-sm"
              style={{ background: "var(--e-orange)", color: "#fff" }}
            >
              {saveMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {isNew ? "Create Account" : "Save Changes"}
            </Button>
          </div>
        )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 border-b border-[#E8E6E2] overflow-x-auto">
        {getTabs(account?.accountType).map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? "border-(--e-orange) text-(--e-orange)"
                  : "border-transparent text-stone-500 hover:text-stone-700"
              }`}
            >
              <Icon size={14} strokeWidth={1.8} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex gap-6 items-start">
        {/* Main form */}
        <div className="flex-1 min-w-0 space-y-6">
          {tab === "overview" && (
            <>
              {/* Basic Info */}
              <div className="bg-white rounded-xl border border-[#E8E6E2] p-5 space-y-4">
                <Section title="Basic Info">
                  {/* Manual Name toggle — Individual accounts (Student / Client) */}
                  {INDIVIDUAL_TYPES.includes(form.accountType ?? "") && (
                    <div className="col-span-2 flex items-center gap-3 py-1">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={form.manualInput}
                        onClick={() => set("manualInput", !form.manualInput)}
                        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none ${
                          form.manualInput ? "bg-(--e-orange)" : "bg-stone-300"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${
                            form.manualInput ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                      <span className="text-sm text-stone-600">
                        Manual Name&nbsp;
                        <span className="text-stone-400 text-xs">
                          — Override auto-naming for individual accounts
                        </span>
                      </span>
                    </div>
                  )}
                  <Field label="Account Name" span={2} required>
                    {INDIVIDUAL_TYPES.includes(form.accountType ?? "") && !form.manualInput ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={form.name}
                          readOnly
                          disabled
                          placeholder="Auto-generated from Primary Contact"
                          className={`${INPUT_CLS} bg-stone-50 text-stone-400 cursor-not-allowed`}
                        />
                        <span className="text-xs text-stone-400 shrink-0">Auto</span>
                      </div>
                    ) : (
                      <Input
                        value={form.name}
                        onChange={e => set("name", e.target.value)}
                        placeholder="Account name"
                        className={INPUT_CLS}
                      />
                    )}
                  </Field>
                  <Field label="Account Type" required>
                    <Select value={form.accountType ?? ""} onValueChange={v => set("accountType", v)}>
                      <SelectTrigger className="h-10 text-sm border-[#E8E6E2]">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {accountTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Status">
                    <Select value={form.status} onValueChange={v => set("status", v)}>
                      <SelectTrigger className="h-10 text-sm border-[#E8E6E2]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Description" span={2}>
                    <Textarea
                      value={form.description ?? ""}
                      onChange={e => set("description", e.target.value)}
                      placeholder="Account description…"
                      rows={2}
                      className="text-sm border-[#E8E6E2] focus:border-(--e-orange) resize-none"
                    />
                  </Field>
                </Section>
              </div>

              {/* Contacts & Address */}
              <div className="bg-white rounded-xl border border-[#E8E6E2] p-5 space-y-4">
                <Section title="Contacts & Address">
                  <Field label="Primary Contact" span={2}>
                    <ContactLookup
                      value={form.primaryContactId ?? ""}
                      onChange={(id, contact) => {
                        set("primaryContactId", id);
                        if (contact) {
                          if (!form.email && contact.email)       set("email",       contact.email);
                          if (!form.phoneNumber && contact.mobile) set("phoneNumber", contact.mobile);
                          // Auto-name: use contact's fullName if available, else build LAST_First
                          if (INDIVIDUAL_TYPES.includes(form.accountType ?? "") && !form.manualInput) {
                            if (contact.fullName) {
                              set("name", contact.fullName);
                            } else {
                              const last  = (contact.lastName  ?? "").toUpperCase().trim();
                              const first = (contact.firstName ?? "").trim();
                              const base  = last && first ? `${last}_${first}` : last || first;
                              if (base) set("name", base);
                            }
                          }
                        }
                      }}
                    />
                  </Field>
                  <Field label="Secondary Contact" span={2}>
                    <ContactLookup
                      value={form.secondaryContactId ?? ""}
                      onChange={id => set("secondaryContactId", id)}
                      placeholder="Search secondary contact…"
                    />
                  </Field>
                  <Field label="Primary Address" span={2}>
                    <Input value={form.address ?? ""} onChange={e => set("address", e.target.value)} placeholder="Street address" className={INPUT_CLS} />
                  </Field>
                  <Field label="Secondary Address" span={2}>
                    <Input value={form.secondaryAddress ?? ""} onChange={e => set("secondaryAddress", e.target.value)} placeholder="Secondary address" className={INPUT_CLS} />
                  </Field>
                  <Field label="Country">
                    <Input value={form.country ?? ""} onChange={e => set("country", e.target.value)} placeholder="Country" className={INPUT_CLS} />
                  </Field>
                  <Field label="State">
                    <Input value={form.state ?? ""} onChange={e => set("state", e.target.value)} placeholder="State" className={INPUT_CLS} />
                  </Field>
                  <Field label="City">
                    <Input value={form.city ?? ""} onChange={e => set("city", e.target.value)} placeholder="City" className={INPUT_CLS} />
                  </Field>
                  <Field label="Postcode">
                    <Input value={form.postalCode ?? ""} onChange={e => set("postalCode", e.target.value)} placeholder="Postcode" className={INPUT_CLS} />
                  </Field>
                  <Field label="Location" span={2}>
                    <div className="space-y-1">
                      <Input
                        value={form.location ?? ""}
                        onChange={e => set("location", e.target.value)}
                        placeholder="e.g. Sydney, Melbourne, Brisbane"
                        className={INPUT_CLS}
                      />
                      <p className="text-xs text-muted-foreground">Enter multiple cities separated by commas.</p>
                    </div>
                  </Field>
                </Section>
              </div>

              {/* Communication */}
              <div className="bg-white rounded-xl border border-[#E8E6E2] p-5 space-y-4">
                <Section title="Communication">
                  <Field label="Email" span={2}>
                    <Input value={form.email ?? ""} onChange={e => set("email", e.target.value)} placeholder="email@example.com" className={INPUT_CLS} />
                  </Field>
                  <Field label="Phone 1">
                    <Input value={form.phoneNumber ?? ""} onChange={e => set("phoneNumber", e.target.value)} placeholder="+61 …" className={INPUT_CLS} />
                  </Field>
                  <Field label="Phone 2">
                    <Input value={form.phoneNumber2 ?? ""} onChange={e => set("phoneNumber2", e.target.value)} placeholder="+61 …" className={INPUT_CLS} />
                  </Field>
                  <Field label="Fax">
                    <Input value={form.fax ?? ""} onChange={e => set("fax", e.target.value)} placeholder="Fax number" className={INPUT_CLS} />
                  </Field>
                  <Field label="Website 1">
                    <Input value={form.website ?? ""} onChange={e => set("website", e.target.value)} placeholder="https://…" className={INPUT_CLS} />
                  </Field>
                  <Field label="Website 2">
                    <Input value={form.websiteUrl2 ?? ""} onChange={e => set("websiteUrl2", e.target.value)} placeholder="https://…" className={INPUT_CLS} />
                  </Field>
                </Section>
              </div>

              {/* Organisation — conditional by type */}
              {["Company","School","Sub_Agency","Super_Agency","Supplier","Branch","Agent","Provider","Organisation"].includes(form.accountType ?? "") && (
                <div className="bg-white rounded-xl border border-[#E8E6E2] p-5 space-y-4">
                  <Section title="Organisation">
                    {["Branch","Super_Agency"].includes(form.accountType ?? "") && (
                      <Field label="Parent Account" span={2}>
                        <AccountLookup
                          value={form.parentAccountId ?? ""}
                          onChange={id => set("parentAccountId", id)}
                          excludeId={isNew ? undefined : id}
                          placeholder="Search parent account…"
                        />
                      </Field>
                    )}
                    {["Company","School","Sub_Agency","Super_Agency","Supplier","Agent","Provider","Organisation"].includes(form.accountType ?? "") && (
                      <Field label="ABN">
                        <Input value={form.abn ?? ""} onChange={e => set("abn", e.target.value)} placeholder="ABN" className={INPUT_CLS} />
                      </Field>
                    )}
                    {form.accountType === "School" && (
                      <>
                        <Field label="Founded Year">
                          <Input value={form.foundYear ?? ""} onChange={e => set("foundYear", e.target.value)} placeholder="e.g. 2010" className={INPUT_CLS} />
                        </Field>
                        <Field label="Total Capacity">
                          <Input
                            type="number"
                            value={form.totalCapacity ?? ""}
                            onChange={e => set("totalCapacity", e.target.value ? Number(e.target.value) : undefined as any)}
                            placeholder="0"
                            className={INPUT_CLS}
                          />
                        </Field>
                        <Field label="AVETMISS Location ID" span={2}>
                          <Input value={form.avetmissDeliveryLocationId ?? ""} onChange={e => set("avetmissDeliveryLocationId", e.target.value)} placeholder="Location ID" className={INPUT_CLS} />
                        </Field>
                      </>
                    )}
                  </Section>
                </div>
              )}

              {/* Product Settings — School + Supplier only */}
              {["School","Supplier","Provider"].includes(form.accountType ?? "") && (
                <div className="bg-white rounded-xl border border-[#E8E6E2] p-5 space-y-4">
                  <Section title="Product Settings">
                    <Toggle
                      label="Is Product Source"
                      description="This account is a source of products"
                      checked={form.isProductSource}
                      onChange={v => set("isProductSource", v)}
                    />
                    <Toggle
                      label="Is Product Provider"
                      description="This account provides products/services"
                      checked={form.isProductProvider}
                      onChange={v => set("isProductProvider", v)}
                    />
                  </Section>
                </div>
              )}

              {/* Admin Info */}
              <div className="bg-white rounded-xl border border-[#E8E6E2] p-5 space-y-4">
                <Section title="Admin Info">
                  <Field label="Owner" span={2} required>
                    <Select value={form.ownerId || "none"} onValueChange={v => set("ownerId", v === "none" ? "" : v)}>
                      <SelectTrigger className={INPUT_CLS}>
                        <SelectValue placeholder="— select staff —" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— unassigned —</SelectItem>
                        {staffList.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  {!isNew && (
                    <>
                      <div>
                        <p className="text-xs text-stone-400 mb-0.5">Created On</p>
                        <p className="text-sm text-stone-700">{account?.createdOn ? new Date(account.createdOn).toLocaleString() : "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-stone-400 mb-0.5">Modified On</p>
                        <p className="text-sm text-stone-700">{account?.modifiedOn ? new Date(account.modifiedOn).toLocaleString() : "—"}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-stone-400 mb-0.5">Account ID</p>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-mono truncate text-stone-500">{account.id}</p>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(account.id).then(() => {
                                setCopiedId(true);
                                setTimeout(() => setCopiedId(false), 2000);
                              });
                            }}
                            className="shrink-0 text-stone-400 hover:text-(--e-orange) transition-colors"
                            title="Copy ID"
                          >
                            {copiedId ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </Section>
              </div>
            </>
          )}

          {tab === "contacts" && (
            <div className="space-y-5">

              {/* ── Primary / Secondary ─────────────────────────────────── */}
              <div>
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Primary &amp; Secondary</p>
                {!account.primaryContact && !account.secondaryContact ? (
                  <div className="bg-white rounded-xl border border-[#E8E6E2] p-6 text-center text-stone-400">
                    <Users size={28} strokeWidth={1.5} className="mx-auto mb-2" />
                    <p className="text-sm font-medium text-stone-500">No primary/secondary contact linked</p>
                    <p className="text-xs text-stone-400 mt-0.5">Set them in the Overview tab.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {account.primaryContact && (
                      <div
                        className="bg-white rounded-xl border border-[#E8E6E2] p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow cursor-pointer group"
                        onClick={() => navigate(`/admin/crm/contacts/${account.primaryContact!.id}`)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-(--e-orange-lt) flex items-center justify-center text-(--e-orange) font-semibold text-sm flex-shrink-0">
                              {account.primaryContact.firstName?.[0]}{account.primaryContact.lastName?.[0]}
                            </div>
                            <div>
                              <p className="font-semibold text-stone-800 text-sm group-hover:text-(--e-orange) transition-colors">
                                {account.primaryContact.firstName} {account.primaryContact.lastName?.toUpperCase()}
                              </p>
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700 mt-0.5">Primary</span>
                            </div>
                          </div>
                          <ExternalLink size={14} className="text-stone-300 group-hover:text-(--e-orange) transition-colors mt-1" />
                        </div>
                        <div className="space-y-1.5 text-xs">
                          {account.primaryContact.originalName && (
                            <div className="flex items-center gap-2">
                              <span className="w-16 text-stone-400 flex-shrink-0">Original Name</span>
                              <span className="text-stone-700 font-medium">{account.primaryContact.originalName}</span>
                            </div>
                          )}
                          {account.primaryContact.email && (
                            <div className="flex items-center gap-2">
                              <span className="w-16 text-stone-400 flex-shrink-0">Email</span>
                              <span className="text-stone-700">{account.primaryContact.email}</span>
                            </div>
                          )}
                          {account.primaryContact.mobile && (
                            <div className="flex items-center gap-2">
                              <span className="w-16 text-stone-400 flex-shrink-0">Phone</span>
                              <span className="text-stone-700">{account.primaryContact.mobile}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {account.secondaryContact && (
                      <div
                        className="bg-white rounded-xl border border-[#E8E6E2] p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow cursor-pointer group"
                        onClick={() => navigate(`/admin/crm/contacts/${account.secondaryContact!.id}`)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#EFF6FF] flex items-center justify-center text-blue-600 font-semibold text-sm flex-shrink-0">
                              {account.secondaryContact.firstName?.[0]}{account.secondaryContact.lastName?.[0]}
                            </div>
                            <div>
                              <p className="font-semibold text-stone-800 text-sm group-hover:text-blue-600 transition-colors">
                                {account.secondaryContact.firstName} {account.secondaryContact.lastName?.toUpperCase()}
                              </p>
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 mt-0.5">Secondary</span>
                            </div>
                          </div>
                          <ExternalLink size={14} className="text-stone-300 group-hover:text-blue-500 transition-colors mt-1" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── Additional Contacts ──────────────────────────────────── */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">
                    Additional Contacts
                    {additionalContacts.length > 0 && (
                      <span className="ml-1.5 text-[10px] bg-stone-100 text-stone-500 rounded-full px-1.5 py-0.5">{additionalContacts.length}</span>
                    )}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1 border-[#E8E6E2] hover:border-(--e-orange) hover:text-(--e-orange)"
                    onClick={() => { setShowAddContact(v => !v); setContactSearch(""); }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Contact
                  </Button>
                </div>

                {/* Search dropdown */}
                {showAddContact && (
                  <div className="bg-white border border-[#E8E6E2] rounded-xl p-4 mb-3 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <Input
                        autoFocus
                        value={contactSearch}
                        onChange={e => setContactSearch(e.target.value)}
                        placeholder="Search contacts by name…"
                        className="h-8 text-sm border-[#E8E6E2] focus:border-(--e-orange)"
                      />
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-stone-400 hover:text-stone-600"
                        onClick={() => { setShowAddContact(false); setContactSearch(""); }}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    {contactSearch.length >= 1 && (
                      <div className="space-y-1 max-h-52 overflow-y-auto">
                        {contactSearchResults.length === 0 ? (
                          <p className="text-xs text-stone-400 text-center py-3">No contacts found</p>
                        ) : contactSearchResults.map((c: any) => {
                          const alreadyLinked = additionalContacts.some((a: any) => a.id === c.id)
                            || account.primaryContactId === c.id
                            || account.secondaryContactId === c.id;
                          return (
                            <button
                              key={c.id}
                              disabled={alreadyLinked || addContactMut.isPending}
                              onClick={() => addContactMut.mutate(c.id)}
                              className="w-full text-left px-3 py-2 rounded-lg hover:bg-(--e-orange-lt) transition-colors flex items-center justify-between group disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <div>
                                <span className="text-sm font-medium text-stone-800 group-hover:text-(--e-orange)">
                                  {c.firstName} {c.lastName?.toUpperCase()}
                                </span>
                                {c.originalName && <span className="text-xs text-stone-400 ml-1.5">({c.originalName})</span>}
                                {c.email && <p className="text-xs text-stone-400">{c.email}</p>}
                              </div>
                              {alreadyLinked
                                ? <span className="text-xs text-stone-400">Already linked</span>
                                : <Plus className="w-3.5 h-3.5 text-stone-300 group-hover:text-(--e-orange)" />
                              }
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {contactSearch.length === 0 && (
                      <p className="text-xs text-stone-400 text-center">Type a name to search contacts</p>
                    )}
                  </div>
                )}

                {/* Additional contacts list */}
                {addlLoading ? (
                  <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-stone-300" /></div>
                ) : additionalContacts.length === 0 ? (
                  <div className="bg-white border border-dashed border-[#E8E6E2] rounded-xl p-5 text-center text-stone-400">
                    <p className="text-sm">No additional contacts yet</p>
                    <p className="text-xs mt-0.5">Use the button above to link contacts.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {additionalContacts.map((c: any) => (
                      <div key={c.linkId}
                        className="bg-white border border-[#E8E6E2] rounded-xl px-4 py-3 flex items-center justify-between group hover:border-stone-300 transition-colors">
                        <div
                          className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                          onClick={() => navigate(`/admin/crm/contacts/${c.id}`)}
                        >
                          <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 font-semibold text-xs flex-shrink-0">
                            {c.firstName?.[0]}{c.lastName?.[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-stone-800 group-hover:text-(--e-orange) truncate">
                              {c.firstName} {c.lastName?.toUpperCase()}
                              {c.originalName && <span className="text-stone-400 font-normal ml-1.5">({c.originalName})</span>}
                            </p>
                            <p className="text-xs text-stone-400 truncate">{c.email || c.mobile || ""}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => { if (confirm(`Remove ${c.firstName} ${c.lastName} from this account?`)) removeContactMut.mutate(c.linkId); }}
                          className="ml-3 flex-shrink-0 p-1.5 rounded-lg text-stone-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                          title="Remove"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "leads" && (
            <div className="bg-white rounded-xl border border-[#E8E6E2] overflow-x-auto">
              {leadsLoading ? (
                <div className="p-8 flex justify-center">
                  <Loader2 size={20} className="animate-spin text-stone-400" />
                </div>
              ) : accountLeads.length === 0 ? (
                <div className="p-8 text-center text-stone-400">
                  <Briefcase size={32} strokeWidth={1.5} className="mx-auto mb-3" />
                  <p className="text-sm">No leads linked to this account yet.</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E8E6E2] bg-[#FAFAF9]">
                      <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Ref #</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Inquiry</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Nationality</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Owner</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E6E2]">
                    {accountLeads.map((lead: any) => (
                      <tr
                        key={lead.id}
                        className="hover:bg-[#FAFAF9] cursor-pointer transition-colors"
                        onClick={() => navigate(`/admin/crm/leads/${lead.id}`)}
                      >
                        <td className="px-4 py-3 font-mono text-xs text-stone-500">{lead.lead_ref_number || "—"}</td>
                        <td className="px-4 py-3 font-medium text-stone-800">{lead.full_name || "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            lead.lead_status === "Won"      ? "bg-green-100 text-green-700" :
                            lead.lead_status === "Lost"     ? "bg-red-100 text-red-700" :
                            lead.lead_status === "New"      ? "bg-blue-100 text-blue-700" :
                            lead.lead_status === "Contacted"? "bg-yellow-100 text-yellow-700" :
                            "bg-stone-100 text-stone-600"
                          }`}>
                            {lead.lead_status || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-stone-600">{lead.inquiry_type || "—"}</td>
                        <td className="px-4 py-3 text-stone-600">{lead.nationality || "—"}</td>
                        <td className="px-4 py-3 text-stone-500">{lead.owner_name || "—"}</td>
                        <td className="px-4 py-3"><ChevronRight size={14} className="text-stone-300" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {tab === "contracts" && (
            <div className="bg-white rounded-xl border border-[#E8E6E2] overflow-x-auto">
              {contractsLoading ? (
                <div className="p-8 flex justify-center">
                  <Loader2 size={20} className="animate-spin text-stone-400" />
                </div>
              ) : accountContracts.length === 0 ? (
                <div className="p-8 text-center text-stone-400">
                  <FileText size={32} strokeWidth={1.5} className="mx-auto mb-3" />
                  <p className="text-sm">No contracts linked to this account yet.</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E8E6E2] bg-[#FAFAF9]">
                      <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Contract #</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Student</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Period</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Owner</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E6E2]">
                    {accountContracts.map((c: any) => (
                      <tr
                        key={c.id}
                        className="hover:bg-[#FAFAF9] cursor-pointer transition-colors"
                        onClick={() => navigate(`/admin/crm/contracts/${c.id}`)}
                      >
                        <td className="px-4 py-3 font-mono text-xs text-stone-500">{c.contract_number || "—"}</td>
                        <td className="px-4 py-3 font-medium text-stone-800">{c.student_name || "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            c.contract_status === "Active"    ? "bg-green-100 text-green-700" :
                            c.contract_status === "Completed" ? "bg-blue-100 text-blue-700" :
                            c.contract_status === "Cancelled" ? "bg-red-100 text-red-700" :
                            c.contract_status === "Draft"     ? "bg-stone-100 text-stone-600" :
                            "bg-stone-100 text-stone-600"
                          }`}>
                            {c.contract_status
                              ? c.contract_status.charAt(0).toUpperCase() + c.contract_status.slice(1)
                              : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-stone-700">
                          {c.contract_amount ? `$${Number(c.contract_amount).toLocaleString()}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-stone-500 text-xs">
                          {c.from_date || c.to_date
                            ? `${c.from_date ? formatDate(c.from_date) : "?"} – ${c.to_date ? formatDate(c.to_date) : "?"}`
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-stone-500">{c.owner_name || "—"}</td>
                        <td className="px-4 py-3"><ChevronRight size={14} className="text-stone-300" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {tab === "products" && (
            <div className="bg-white rounded-xl border border-[#E8E6E2] p-8 text-center text-stone-400">
              <Package size={32} strokeWidth={1.5} className="mx-auto mb-3" />
              <p className="text-sm font-medium text-stone-600 mb-1">Products</p>
              <p className="text-sm">Products linked to this account will appear here.</p>
            </div>
          )}

          {tab === "commission" && (
            <div className="bg-white rounded-xl border border-[#E8E6E2] p-8 text-center text-stone-400">
              <DollarSign size={32} strokeWidth={1.5} className="mx-auto mb-3" />
              <p className="text-sm font-medium text-stone-600 mb-1">Commission</p>
              <p className="text-sm">Commission records for this agency will appear here.</p>
            </div>
          )}

          {tab === "service_profiles" && account && (
            <AccountServiceProfilesTab
              accountId={account.id}
              accountName={account.name}
            />
          )}

          {tab === "portal" && account && (
            <PortalAccessPanel accountId={account.id} accountType={account.accountType} />
          )}

          {tab === "ledger" && account && (
            <LedgerTab accountId={account.id} />
          )}
        </div>

        {/* Sidebar */}
        {!isNew && (
          <div className="w-64 shrink-0 space-y-3">
            {getTabs(account?.accountType).some(t => t.key === "leads") && (
              <div className="bg-white rounded-xl border border-[#E8E6E2] p-4">
                <p className="text-xs text-stone-400 mb-1">Leads</p>
                <p className="text-2xl font-bold text-stone-800">
                  {leadsLoading ? "—" : accountLeads.length}
                </p>
                <button
                  onClick={() => { setTab("leads"); }}
                  className="mt-3 flex items-center gap-1.5 text-xs font-medium text-(--e-orange) hover:opacity-80"
                >
                  <ChevronRight size={12} /> View Leads
                </button>
              </div>
            )}
            {getTabs(account?.accountType).some(t => t.key === "contracts") && (
              <div className="bg-white rounded-xl border border-[#E8E6E2] p-4">
                <p className="text-xs text-stone-400 mb-1">Contracts</p>
                <p className="text-2xl font-bold text-stone-800">
                  {contractsLoading ? "—" : accountContracts.length}
                </p>
                <button
                  onClick={() => { setTab("contracts"); }}
                  className="mt-3 flex items-center gap-1.5 text-xs font-medium text-(--e-orange) hover:opacity-80"
                >
                  <ChevronRight size={12} /> View Contracts
                </button>
              </div>
            )}
            <div className="bg-white rounded-xl border border-[#E8E6E2] p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">Quick Info</p>
                {account?.accountType && (() => {
                  const badge = getAccountTypeBadge(account.accountType);
                  return (
                    <span
                      className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: badge.bg, color: badge.text }}
                    >
                      {badge.label}
                    </span>
                  );
                })()}
              </div>

              {/* ── Owner row (all types) ── */}
              {(() => {
                const ownerName = staffList.find(s => s.id === account?.ownerId)?.name;
                return (
                  <QI label="Owner">
                    {ownerName
                      ? <span className="text-[#1C1917] font-medium">{ownerName}</span>
                      : <span className="text-[#A8A29E]">—</span>}
                  </QI>
                );
              })()}

              {/* Student / Client — contact-based fields */}
              {(account?.accountType === "Student" || account?.accountType === "Client") && (
                <>
                  {account.primaryContact && (
                    <QI label="Contact">
                      <button
                        onClick={() => navigate(`/admin/crm/contacts/${account.primaryContact!.id}`)}
                        className="text-(--e-orange) hover:underline font-medium text-right"
                      >
                        {account.primaryContact.firstName} {account.primaryContact.lastName?.toUpperCase()}
                      </button>
                    </QI>
                  )}
                  <QI label="Nationality">{account.primaryContact?.nationality || <span className="text-[#A8A29E]">—</span>}</QI>
                  <QI label="Date of Birth">{account.primaryContact?.dob ? formatDate(account.primaryContact.dob) : <span className="text-[#A8A29E]">—</span>}</QI>
                  <QI label="Email">{account.primaryContact?.email || <span className="text-[#A8A29E]">—</span>}</QI>
                  <QI label="Mobile">{account.primaryContact?.mobile || <span className="text-[#A8A29E]">—</span>}</QI>
                  {account.primaryContact?.officeNumber && (
                    <QI label="Office">{account.primaryContact.officeNumber}</QI>
                  )}
                  {account.primaryContact?.snsType && (
                    <QI label="SNS">{account.primaryContact.snsType}{account.primaryContact.snsId ? ` · ${account.primaryContact.snsId}` : ""}</QI>
                  )}
                </>
              )}

              {/* Company */}
              {account?.accountType === "Company" && (
                <>
                  <QI label="Country">{account.country || <span className="text-[#A8A29E]">—</span>}</QI>
                  <QI label="ABN">{account.abn || <span className="text-[#A8A29E]">—</span>}</QI>
                  <QI label="Phone">{account.phoneNumber || <span className="text-[#A8A29E]">—</span>}</QI>
                  <QI label="Email">{account.email || <span className="text-[#A8A29E]">—</span>}</QI>
                  {account.primaryContact && (
                    <>
                      <div className="pt-2 pb-1 mt-1 border-t border-[#E8E6E2]">
                        <span className="text-[10px] font-semibold text-[#A8A29E] uppercase tracking-wider">Primary Contact</span>
                      </div>
                      <QI label="Name">
                        <button onClick={() => navigate(`/admin/crm/contacts/${account.primaryContact!.id}`)} className="text-(--e-orange) hover:underline font-medium">
                          {account.primaryContact.firstName} {account.primaryContact.lastName?.toUpperCase()}
                        </button>
                      </QI>
                      {account.primaryContact.email && <QI label="Email">{account.primaryContact.email}</QI>}
                      {account.primaryContact.mobile && <QI label="Mobile">{account.primaryContact.mobile}</QI>}
                      {account.primaryContact.officeNumber && <QI label="Office">{account.primaryContact.officeNumber}</QI>}
                    </>
                  )}
                </>
              )}

              {/* Agent / Institute / Partner / Organization */}
              {["Agent","Institute","Partner","Organization"].includes(account?.accountType ?? "") && (
                <>
                  <QI label="Country">{account?.country || <span className="text-[#A8A29E]">—</span>}</QI>
                  <QI label="Website">
                    {account?.website
                      ? <a href={account.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-(--e-orange) hover:underline" style={{fontSize:13}}><ExternalLink size={11}/>{account.website.replace(/^https?:\/\//, "")}</a>
                      : <span className="text-[#A8A29E]">—</span>}
                  </QI>
                  <QI label="ABN">{account?.abn || <span className="text-[#A8A29E]">—</span>}</QI>
                  <QI label="Phone">{account?.phoneNumber || <span className="text-[#A8A29E]">—</span>}</QI>
                  <QI label="Email">{account?.email || <span className="text-[#A8A29E]">—</span>}</QI>
                  {account?.primaryContact && (
                    <>
                      <div className="pt-2 pb-1 mt-1 border-t border-[#E8E6E2]">
                        <span className="text-[10px] font-semibold text-[#A8A29E] uppercase tracking-wider">Primary Contact</span>
                      </div>
                      <QI label="Name">
                        <button onClick={() => navigate(`/admin/crm/contacts/${account.primaryContact!.id}`)} className="text-(--e-orange) hover:underline font-medium">
                          {account.primaryContact.firstName} {account.primaryContact.lastName?.toUpperCase()}
                        </button>
                      </QI>
                      {account.primaryContact.email && <QI label="Email">{account.primaryContact.email}</QI>}
                      {account.primaryContact.mobile && <QI label="Mobile">{account.primaryContact.mobile}</QI>}
                      {account.primaryContact.officeNumber && <QI label="Office">{account.primaryContact.officeNumber}</QI>}
                    </>
                  )}
                </>
              )}

              {/* Default fallback */}
              {!["Student","Client","Company","Agent","Institute","Partner","Organization"].includes(account?.accountType ?? "") && (
                <>
                  <QI label="Country">{account?.country || <span className="text-[#A8A29E]">—</span>}</QI>
                  <QI label="Phone">{account?.phoneNumber || <span className="text-[#A8A29E]">—</span>}</QI>
                  <QI label="Email">{account?.email || <span className="text-[#A8A29E]">—</span>}</QI>
                  {account?.primaryContact && (
                    <>
                      <div className="pt-2 pb-1 mt-1 border-t border-[#E8E6E2]">
                        <span className="text-[10px] font-semibold text-[#A8A29E] uppercase tracking-wider">Primary Contact</span>
                      </div>
                      <QI label="Name">
                        <button onClick={() => navigate(`/admin/crm/contacts/${account.primaryContact!.id}`)} className="text-(--e-orange) hover:underline font-medium">
                          {account.primaryContact.firstName} {account.primaryContact.lastName?.toUpperCase()}
                        </button>
                      </QI>
                      {account.primaryContact.email && <QI label="Email">{account.primaryContact.email}</QI>}
                      {account.primaryContact.mobile && <QI label="Mobile">{account.primaryContact.mobile}</QI>}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {showTenantDlg && account && (
        <CreateTenantDialog account={account} onClose={() => setShowTenantDlg(false)} />
      )}

      <ImageCropDialog
        file={pendingFile}
        onConfirm={doUploadAccount}
        onCancel={() => setPendingFile(null)}
      />
    </div>
  );
}
