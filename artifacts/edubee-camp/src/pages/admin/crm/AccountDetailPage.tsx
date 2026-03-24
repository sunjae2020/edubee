import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  ArrowLeft, Save, Building2, Users, FileText, Briefcase,
  Plus, Loader2, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const ACCOUNT_TYPES = ["Student", "School", "Agent", "Provider", "Organisation"];
const CATEGORY_MAP: Record<string, string[]> = {
  Student:      [],
  School:       ["Language School", "University", "TAFE", "High School", "Other"],
  Agent:        ["Sub-agent", "Super-agent", "Referral Partner"],
  Provider:     ["Homestay", "Dormitory", "Pickup", "Insurance", "Migration Agent", "Tour Operator", "Other"],
  Organisation: ["Head Office", "Branch", "Partner Organisation"],
};

interface Account {
  id: string;
  name: string;
  manualInput: boolean;
  accountType?: string | null;
  accountCategory?: string | null;
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
  abn?: string | null;
  isProductSource: boolean;
  isProductProvider: boolean;
  foundYear?: string | null;
  totalCapacity?: number | null;
  avetmissDeliveryLocationId?: string | null;
  description?: string | null;
  ownerId: string;
  status: string;
  createdOn?: string | null;
  modifiedOn?: string | null;
  primaryContact?: { id: string; firstName: string; lastName: string; email?: string | null; mobile?: string | null } | null;
  secondaryContact?: { id: string; firstName: string; lastName: string } | null;
  parentAccount?: { id: string; name: string } | null;
}

type FormData = Omit<Account, "id" | "createdOn" | "modifiedOn" | "primaryContact" | "secondaryContact" | "parentAccount">;

const TABS = [
  { key: "overview",   label: "Overview",   icon: Building2 },
  { key: "contacts",   label: "Contacts",   icon: Users     },
  { key: "leads",      label: "Leads",      icon: Briefcase },
  { key: "contracts",  label: "Contracts",  icon: FileText  },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-stone-400 border-b border-[#E8E6E2] pb-1.5">
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
        style={{ background: checked ? "#F5821F" : "#E8E6E2" }}
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

function ContactLookup({ value, onChange, placeholder }: {
  value: string; onChange: (id: string, contact?: { email?: string | null; mobile?: string | null }) => void; placeholder?: string;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen]     = useState(false);

  const { data } = useQuery({
    queryKey: ["contacts-lookup", search],
    queryFn: () => axios.get(`${BASE}/api/crm/contacts?search=${encodeURIComponent(search)}&limit=10`).then(r => r.data.data ?? []),
    enabled: open && search.length > 0,
  });

  const { data: selected } = useQuery({
    queryKey: ["contact-single", value],
    queryFn: () => axios.get(`${BASE}/api/crm/contacts/${value}`).then(r => r.data),
    enabled: !!value,
  });

  const displayName = selected ? `${selected.firstName} ${selected.lastName}` : "";

  return (
    <div className="relative">
      <Input
        value={open ? search : displayName}
        placeholder={placeholder ?? "Search contacts…"}
        onFocus={() => { setOpen(true); setSearch(""); }}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        onChange={e => setSearch(e.target.value)}
        className="h-10 text-sm border-[#E8E6E2] focus:border-[#F5821F]"
      />
      {open && Array.isArray(data) && data.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-[#E8E6E2] rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {data.map((c: { id: string; firstName: string; lastName: string; email?: string | null; mobile?: string | null }) => (
            <button
              key={c.id}
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-[#FEF0E3] transition-colors"
              onMouseDown={() => {
                onChange(c.id, c);
                setOpen(false);
              }}
            >
              <span className="font-medium text-stone-800">{c.firstName} {c.lastName}</span>
              {c.email && <span className="ml-2 text-xs text-stone-400">{c.email}</span>}
            </button>
          ))}
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
        className="h-10 text-sm border-[#E8E6E2] focus:border-[#F5821F]"
      />
      {open && Array.isArray(data) && data.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-[#E8E6E2] rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {data.map((a: { id: string; name: string }) => (
            <button
              key={a.id}
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-[#FEF0E3] transition-colors"
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

const INPUT_CLS = "h-10 text-sm border-[#E8E6E2] focus:border-[#F5821F] focus:ring-0";

export default function AccountDetailPage() {
  const [matchNew] = useRoute("/admin/crm/accounts/new");
  const [matchId, params] = useRoute("/admin/crm/accounts/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const isNew = !!matchNew;
  const id    = matchId ? (params?.id ?? "") : "";

  const [tab, setTab] = useState("overview");

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

  const emptyForm: FormData = {
    name: "", manualInput: false, accountType: "Student", accountCategory: undefined as any,
    parentAccountId: undefined as any, primaryContactId: undefined as any, secondaryContactId: undefined as any,
    phoneNumber: undefined as any, phoneNumber2: undefined as any, fax: undefined as any,
    email: undefined as any, website: undefined as any, websiteUrl2: undefined as any,
    address: undefined as any, secondaryAddress: undefined as any, country: undefined as any,
    state: undefined as any, city: undefined as any, postalCode: undefined as any,
    abn: undefined as any, isProductSource: false, isProductProvider: false,
    foundYear: undefined as any, totalCapacity: undefined as any,
    avetmissDeliveryLocationId: undefined as any, description: undefined as any,
    ownerId: meData?.id ?? "", status: "Active",
  };

  const [form, setForm] = useState<FormData>(emptyForm);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (account && !isNew) {
      setForm({
        name:                       account.name ?? "",
        manualInput:                account.manualInput ?? false,
        accountType:                account.accountType ?? "Student",
        accountCategory:            account.accountCategory ?? undefined,
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

  const categories = CATEGORY_MAP[form.accountType ?? "Student"] ?? [];

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
          <h1 className="text-lg font-semibold text-stone-900">
            {isNew ? "New Account" : (account?.name ?? "Account")}
          </h1>
          {!isNew && account?.status && (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
              account.status === "Active" ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#F4F3F1] text-[#57534E]"
            }`}>{account.status}</span>
          )}
        </div>
        <Button
          onClick={handleSave}
          disabled={saveMut.isPending}
          className="flex items-center gap-1.5 text-sm"
          style={{ background: "#F5821F", color: "#fff" }}
        >
          {saveMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {isNew ? "Create Account" : "Save Changes"}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 border-b border-[#E8E6E2]">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? "border-[#F5821F] text-[#F5821F]"
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
                  <Toggle
                    label="Manual Name"
                    description="Override auto-naming for Student accounts"
                    checked={form.manualInput}
                    onChange={v => set("manualInput", v)}
                  />
                  <Field label="Account Name" span={form.manualInput || form.accountType !== "Student" ? 2 : 1} required>
                    <Input
                      value={form.name}
                      onChange={e => set("name", e.target.value)}
                      placeholder="Account name"
                      className={INPUT_CLS}
                      readOnly={!form.manualInput && form.accountType === "Student"}
                    />
                  </Field>
                  <Field label="Account Type" required>
                    <Select value={form.accountType ?? ""} onValueChange={v => { set("accountType", v); set("accountCategory", undefined as any); }}>
                      <SelectTrigger className="h-10 text-sm border-[#E8E6E2]">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {ACCOUNT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  {categories.length > 0 && (
                    <Field label="Category">
                      <Select value={form.accountCategory ?? "none"} onValueChange={v => set("accountCategory", v === "none" ? undefined as any : v)}>
                        <SelectTrigger className="h-10 text-sm border-[#E8E6E2]">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
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
                      className="text-sm border-[#E8E6E2] focus:border-[#F5821F] resize-none"
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
                        if (!form.manualInput && form.accountType === "Student") {
                          // Name will be auto-set on save
                        }
                        if (contact) {
                          if (!form.email && contact.email)   set("email",       contact.email);
                          if (!form.phoneNumber && contact.mobile) set("phoneNumber", contact.mobile);
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

              {/* Organisation */}
              <div className="bg-white rounded-xl border border-[#E8E6E2] p-5 space-y-4">
                <Section title="Organisation">
                  <Field label="Parent Account" span={2}>
                    <AccountLookup
                      value={form.parentAccountId ?? ""}
                      onChange={id => set("parentAccountId", id)}
                      excludeId={isNew ? undefined : id}
                      placeholder="Search parent account…"
                    />
                  </Field>
                  <Field label="ABN">
                    <Input value={form.abn ?? ""} onChange={e => set("abn", e.target.value)} placeholder="ABN" className={INPUT_CLS} />
                  </Field>
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
                  <Field label="AVETMISS Delivery Location ID">
                    <Input value={form.avetmissDeliveryLocationId ?? ""} onChange={e => set("avetmissDeliveryLocationId", e.target.value)} placeholder="Location ID" className={INPUT_CLS} />
                  </Field>
                </Section>
              </div>

              {/* Product Settings */}
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

              {/* System */}
              <div className="bg-white rounded-xl border border-[#E8E6E2] p-5 space-y-4">
                <Section title="System">
                  <Field label="Owner" span={2} required>
                    <Input
                      value={form.ownerId}
                      onChange={e => set("ownerId", e.target.value)}
                      placeholder="Owner user ID"
                      className={INPUT_CLS}
                    />
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
                    </>
                  )}
                </Section>
              </div>
            </>
          )}

          {tab === "contacts" && (
            <div className="bg-white rounded-xl border border-[#E8E6E2] p-8 text-center text-stone-400">
              <Users size={32} strokeWidth={1.5} className="mx-auto mb-3" />
              <p className="text-sm">Contact linkage is managed from the Primary / Secondary Contact fields in Overview.</p>
            </div>
          )}

          {tab === "leads" && (
            <div className="bg-white rounded-xl border border-[#E8E6E2] overflow-hidden">
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
            <div className="bg-white rounded-xl border border-[#E8E6E2] overflow-hidden">
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
                            ? `${c.from_date ? new Date(c.from_date).toLocaleDateString() : "?"} – ${c.to_date ? new Date(c.to_date).toLocaleDateString() : "?"}`
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
        </div>

        {/* Sidebar */}
        {!isNew && (
          <div className="w-64 shrink-0 space-y-3">
            <div className="bg-white rounded-xl border border-[#E8E6E2] p-4">
              <p className="text-xs text-stone-400 mb-1">Leads</p>
              <p className="text-2xl font-bold text-stone-800">
                {leadsLoading ? "—" : accountLeads.length}
              </p>
              <button
                onClick={() => { setTab("leads"); }}
                className="mt-3 flex items-center gap-1.5 text-xs font-medium text-[#F5821F] hover:opacity-80"
              >
                <ChevronRight size={12} /> View Leads
              </button>
            </div>
            <div className="bg-white rounded-xl border border-[#E8E6E2] p-4">
              <p className="text-xs text-stone-400 mb-1">Contracts</p>
              <p className="text-2xl font-bold text-stone-800">
                {contractsLoading ? "—" : accountContracts.length}
              </p>
              <button
                onClick={() => { setTab("contracts"); }}
                className="mt-3 flex items-center gap-1.5 text-xs font-medium text-[#F5821F] hover:opacity-80"
              >
                <ChevronRight size={12} /> View Contracts
              </button>
            </div>
            <div className="bg-white rounded-xl border border-[#E8E6E2] p-4 space-y-2">
              <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">Quick Info</p>
              {account?.accountType && (
                <div>
                  <p className="text-[11px] text-stone-400">Type</p>
                  <p className="text-sm text-stone-700 font-medium">{account.accountType}</p>
                </div>
              )}
              {account?.accountCategory && (
                <div>
                  <p className="text-[11px] text-stone-400">Category</p>
                  <p className="text-sm text-stone-700">{account.accountCategory}</p>
                </div>
              )}
              {account?.country && (
                <div>
                  <p className="text-[11px] text-stone-400">Country</p>
                  <p className="text-sm text-stone-700">{account.country}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
