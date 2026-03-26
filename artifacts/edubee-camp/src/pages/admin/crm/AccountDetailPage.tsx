import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  ArrowLeft, Save, Building2, Users, FileText, Briefcase,
  Plus, Loader2, ChevronRight, ExternalLink, Package, DollarSign, Shield,
} from "lucide-react";
import { PortalAccessPanel } from "@/components/crm/PortalAccessPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const ACCOUNT_TYPES = [
  "Student", "School",
  "Sub_Agency", "Super_Agency",
  "Supplier", "Staff", "Branch",
  "Agent", "Provider", "Organisation",
];
const CATEGORY_MAP: Record<string, string[]> = {
  Student:      [],
  School:       ["Language School", "University", "TAFE", "High School", "Other"],
  Sub_Agency:   [],
  Super_Agency: [],
  Supplier:     ["Homestay", "Dormitory", "Pickup", "Insurance", "Migration Agent", "Tour Operator", "Other"],
  Staff:        [],
  Branch:       [],
  Agent:        ["Sub-agent", "Super-agent", "Referral Partner"],
  Provider:     ["Homestay", "Dormitory", "Pickup", "Insurance", "Migration Agent", "Tour Operator", "Other"],
  Organisation: ["Head Office", "Branch", "Partner Organisation"],
};

function getAccountTypeBadge(accountType?: string | null): { bg: string; text: string; label: string } {
  switch (accountType) {
    case "Student":      return { bg: "#FEF0E3", text: "#F5821F", label: "Student" };
    case "School":       return { bg: "#DCFCE7", text: "#16A34A", label: "School" };
    case "Sub_Agency":   return { bg: "#EDE9FE", text: "#7C3AED", label: "Sub Agency" };
    case "Super_Agency": return { bg: "#EDE9FE", text: "#7C3AED", label: "Super Agency" };
    case "Supplier":     return { bg: "#F0F9FF", text: "#0369A1", label: "Supplier" };
    case "Staff":        return { bg: "#F4F3F1", text: "#57534E", label: "Staff" };
    case "Branch":       return { bg: "#FEF9C3", text: "#CA8A04", label: "Branch" };
    case "Agent":        return { bg: "#F4F3F1", text: "#57534E", label: "Agent" };
    case "Provider":     return { bg: "#F4F3F1", text: "#57534E", label: "Provider" };
    case "Organisation": return { bg: "#F4F3F1", text: "#57534E", label: "Organisation" };
    default:             return { bg: "#F4F3F1", text: "#57534E", label: accountType ?? "—" };
  }
}

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
  location?: string | null;
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
  primaryContact?: {
    id: string; firstName: string; lastName: string;
    email?: string | null; mobile?: string | null;
    nationality?: string | null; dob?: string | null;
    snsType?: string | null; snsId?: string | null;
  } | null;
  secondaryContact?: { id: string; firstName: string; lastName: string } | null;
  parentAccount?: { id: string; name: string } | null;
}

type FormData = Omit<Account, "id" | "createdOn" | "modifiedOn" | "primaryContact" | "secondaryContact" | "parentAccount">;

function getTabs(accountType?: string | null) {
  const base = [
    { key: "overview",  label: "Overview",  icon: Building2 },
    { key: "contacts",  label: "Contacts",  icon: Users     },
  ];
  const leads      = { key: "leads",      label: "Leads",          icon: Briefcase  };
  const contracts  = { key: "contracts",  label: "Contracts",      icon: FileText   };
  const products   = { key: "products",   label: "Products",       icon: Package    };
  const commission = { key: "commission", label: "Commission",     icon: DollarSign };
  const portal     = { key: "portal",     label: "Portal Access",  icon: Shield     };
  const ledger     = { key: "ledger",     label: "Ledger",         icon: DollarSign };

  switch (accountType) {
    case "Student":
      return [...base, leads, contracts, ledger];
    case "Supplier":
      return [...base, products, ledger, portal];
    case "School":
      return [...base, leads, contracts, products, ledger, portal];
    case "Sub_Agency":
    case "Super_Agency":
      return [...base, leads, contracts, commission, ledger, portal];
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
  value: string; onChange: (id: string, contact?: { email?: string | null; mobile?: string | null; firstName?: string; lastName?: string; dob?: string | null }) => void; placeholder?: string;
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

// ── LedgerTab ─────────────────────────────────────────────────────────────────
const fmtAmt = (n: any) => n != null ? `$${Number(n).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—";
const fmtD   = (d: any) => d ? new Date(d).toLocaleDateString("en-AU") : "—";

const LDGR_SRC: Record<string, { bg: string; text: string }> = {
  payment:     { bg: "#DCFCE7", text: "#16A34A" },
  transaction: { bg: "#FEF0E3", text: "#F5821F" },
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
          <p className="text-xl font-bold text-[#F5821F]">{fmtAmt(txnTotal)}</p>
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
                      <td className="px-4 py-3 text-[13px] font-bold" style={{ color: row.direction === "received" ? "#16A34A" : row.direction === "paid" ? "#DC2626" : "#F5821F" }}>
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
      <div className="flex gap-0.5 border-b border-[#E8E6E2] overflow-x-auto">
        {getTabs(account?.accountType).map(t => {
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
                  {/* Manual Name toggle — Student accounts only */}
                  {form.accountType === "Student" && (
                    <div className="col-span-2 flex items-center gap-3 py-1">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={form.manualInput}
                        onClick={() => set("manualInput", !form.manualInput)}
                        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none ${
                          form.manualInput ? "bg-[#F5821F]" : "bg-stone-300"
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
                          — Override auto-naming for Student accounts
                        </span>
                      </span>
                    </div>
                  )}
                  <Field label="Account Name" span={2} required>
                    {form.accountType === "Student" && !form.manualInput ? (
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
                        if (contact) {
                          if (!form.email && contact.email)       set("email",       contact.email);
                          if (!form.phoneNumber && contact.mobile) set("phoneNumber", contact.mobile);
                          // Auto-name preview for Student accounts
                          if (form.accountType === "Student" && !form.manualInput) {
                            const last  = (contact.lastName  ?? "").toUpperCase().trim();
                            const first = (contact.firstName ?? "").trim();
                            const base  = last && first ? `${last}_${first}` : last || first;
                            if (base) set("name", base);
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
              {["School","Sub_Agency","Super_Agency","Supplier","Branch","Agent","Provider","Organisation"].includes(form.accountType ?? "") && (
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
                    {["School","Sub_Agency","Super_Agency","Supplier","Agent","Provider","Organisation"].includes(form.accountType ?? "") && (
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
            <div className="space-y-4">
              {/* Contact cards */}
              {!account.primaryContact && !account.secondaryContact ? (
                <div className="bg-white rounded-xl border border-[#E8E6E2] p-8 text-center text-stone-400">
                  <Users size={32} strokeWidth={1.5} className="mx-auto mb-3" />
                  <p className="text-sm font-medium text-stone-500">No contacts linked yet</p>
                  <p className="text-xs text-stone-400 mt-1">
                    Add a Primary or Secondary Contact in the Overview tab.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Primary Contact */}
                  {account.primaryContact && (
                    <div
                      className="bg-white rounded-xl border border-[#E8E6E2] p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow cursor-pointer group"
                      onClick={() => navigate(`/admin/crm/contacts/${account.primaryContact!.id}`)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#FEF0E3] flex items-center justify-center text-[#F5821F] font-semibold text-sm flex-shrink-0">
                            {account.primaryContact.firstName?.[0]}{account.primaryContact.lastName?.[0]}
                          </div>
                          <div>
                            <p className="font-semibold text-stone-800 text-sm group-hover:text-[#F5821F] transition-colors">
                              {account.primaryContact.firstName} {account.primaryContact.lastName}
                            </p>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700 mt-0.5">
                              Primary
                            </span>
                          </div>
                        </div>
                        <ExternalLink size={14} className="text-stone-300 group-hover:text-[#F5821F] transition-colors mt-1" />
                      </div>
                      <div className="space-y-1.5 text-xs">
                        {account.primaryContact.email && (
                          <div className="flex items-center gap-2">
                            <span className="w-12 text-stone-400 flex-shrink-0">Email</span>
                            <span className="text-stone-700">{account.primaryContact.email}</span>
                          </div>
                        )}
                        {account.primaryContact.mobile && (
                          <div className="flex items-center gap-2">
                            <span className="w-12 text-stone-400 flex-shrink-0">Phone</span>
                            <span className="text-stone-700">{account.primaryContact.mobile}</span>
                          </div>
                        )}
                        {account.primaryContact.nationality && (
                          <div className="flex items-center gap-2">
                            <span className="w-12 text-stone-400 flex-shrink-0">Nation</span>
                            <span className="text-stone-700">{account.primaryContact.nationality}</span>
                          </div>
                        )}
                        {account.primaryContact.dob && (
                          <div className="flex items-center gap-2">
                            <span className="w-12 text-stone-400 flex-shrink-0">DOB</span>
                            <span className="text-stone-700">{new Date(account.primaryContact.dob).toLocaleDateString()}</span>
                          </div>
                        )}
                        {account.primaryContact.snsType && (
                          <div className="flex items-center gap-2">
                            <span className="w-12 text-stone-400 flex-shrink-0">SNS</span>
                            <span className="text-stone-700">{account.primaryContact.snsType}{account.primaryContact.snsId ? ` · ${account.primaryContact.snsId}` : ""}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Secondary Contact */}
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
                              {account.secondaryContact.firstName} {account.secondaryContact.lastName}
                            </p>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 mt-0.5">
                              Secondary
                            </span>
                          </div>
                        </div>
                        <ExternalLink size={14} className="text-stone-300 group-hover:text-blue-500 transition-colors mt-1" />
                      </div>
                      <p className="text-xs text-stone-400 italic">Click to view full contact details</p>
                    </div>
                  )}
                </div>
              )}

              {/* Info note */}
              <div className="bg-[#FAFAF9] rounded-lg border border-[#E8E6E2] px-4 py-3 text-xs text-stone-400">
                To add or change contacts, use the <strong className="text-stone-500">Primary / Secondary Contact</strong> fields in the Overview tab.
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
                  className="mt-3 flex items-center gap-1.5 text-xs font-medium text-[#F5821F] hover:opacity-80"
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
                  className="mt-3 flex items-center gap-1.5 text-xs font-medium text-[#F5821F] hover:opacity-80"
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

              {/* Student */}
              {account?.accountType === "Student" && (
                <>
                  <QI label="Nationality">{account.primaryContact?.nationality || <span className="text-[#A8A29E]">—</span>}</QI>
                  <QI label="Date of Birth">{account.primaryContact?.dob ? new Date(account.primaryContact.dob).toLocaleDateString() : <span className="text-[#A8A29E]">—</span>}</QI>
                  <QI label="Email">{account.primaryContact?.email || <span className="text-[#A8A29E]">—</span>}</QI>
                  <QI label="Phone">{account.primaryContact?.mobile || <span className="text-[#A8A29E]">—</span>}</QI>
                  {account.primaryContact?.snsType && (
                    <QI label="SNS">{account.primaryContact.snsType}{account.primaryContact.snsId ? ` · ${account.primaryContact.snsId}` : ""}</QI>
                  )}
                  <QI label="Owner">{account.ownerId ? <span className="text-[#A8A29E] text-xs">{account.ownerId.slice(0, 8)}…</span> : <span className="text-[#A8A29E]">—</span>}</QI>
                </>
              )}

              {/* School */}
              {account?.accountType === "School" && (
                <>
                  <QI label="Country">{account.country || <span className="text-[#A8A29E]">—</span>}</QI>
                  <QI label="Website">
                    {account.website
                      ? <a href={account.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[#F5821F] hover:underline" style={{fontSize:13}}><ExternalLink size={11}/>{account.website.replace(/^https?:\/\//, "")}</a>
                      : <span className="text-[#A8A29E]">—</span>}
                  </QI>
                  <QI label="ABN">{account.abn || <span className="text-[#A8A29E]">—</span>}</QI>
                  <QI label="Phone">{account.phoneNumber || <span className="text-[#A8A29E]">—</span>}</QI>
                  <QI label="Email">{account.email || <span className="text-[#A8A29E]">—</span>}</QI>
                  <QI label="Owner"><span className="text-[#A8A29E] text-xs">{account.ownerId?.slice(0,8)}…</span></QI>
                </>
              )}

              {/* Sub_Agency / Super_Agency */}
              {(account?.accountType === "Sub_Agency" || account?.accountType === "Super_Agency") && (
                <>
                  <QI label="Country">{account.country || <span className="text-[#A8A29E]">—</span>}</QI>
                  <QI label="Website">
                    {account.website
                      ? <a href={account.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[#F5821F] hover:underline" style={{fontSize:13}}><ExternalLink size={11}/>{account.website.replace(/^https?:\/\//, "")}</a>
                      : <span className="text-[#A8A29E]">—</span>}
                  </QI>
                  <QI label="ABN">{account.abn || <span className="text-[#A8A29E]">—</span>}</QI>
                  <QI label="Phone">{account.phoneNumber || <span className="text-[#A8A29E]">—</span>}</QI>
                  <QI label="Email">{account.email || <span className="text-[#A8A29E]">—</span>}</QI>
                  {account?.accountType === "Super_Agency" && (
                    <QI label="Parent Account">
                      {account.parentAccount
                        ? <button className="text-[#F5821F] hover:underline text-[13px]" onClick={() => navigate(`/admin/crm/accounts/${account.parentAccount!.id}`)}>{account.parentAccount.name}</button>
                        : <span className="text-[#A8A29E]">—</span>}
                    </QI>
                  )}
                  <QI label="Owner"><span className="text-[#A8A29E] text-xs">{account.ownerId?.slice(0,8)}…</span></QI>
                </>
              )}

              {/* Supplier */}
              {account?.accountType === "Supplier" && (
                <>
                  <QI label="Category">{account.accountCategory || <span className="text-[#A8A29E]">—</span>}</QI>
                  <QI label="Country">{account.country || <span className="text-[#A8A29E]">—</span>}</QI>
                  <QI label="ABN">{account.abn || <span className="text-[#A8A29E]">—</span>}</QI>
                  <QI label="Phone">{account.phoneNumber || <span className="text-[#A8A29E]">—</span>}</QI>
                  <QI label="Email">{account.email || <span className="text-[#A8A29E]">—</span>}</QI>
                  <QI label="Website">
                    {account.website
                      ? <a href={account.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[#F5821F] hover:underline" style={{fontSize:13}}><ExternalLink size={11}/>{account.website.replace(/^https?:\/\//, "")}</a>
                      : <span className="text-[#A8A29E]">—</span>}
                  </QI>
                  <QI label="Owner"><span className="text-[#A8A29E] text-xs">{account.ownerId?.slice(0,8)}…</span></QI>
                </>
              )}

              {/* Staff */}
              {account?.accountType === "Staff" && (
                <>
                  <QI label="Email">{account.email || <span className="text-[#A8A29E]">—</span>}</QI>
                  <QI label="Phone">{account.phoneNumber || <span className="text-[#A8A29E]">—</span>}</QI>
                  <QI label="Owner"><span className="text-[#A8A29E] text-xs">{account.ownerId?.slice(0,8)}…</span></QI>
                </>
              )}

              {/* Branch */}
              {account?.accountType === "Branch" && (
                <>
                  <QI label="Parent Account">
                    {account.parentAccount
                      ? <button className="text-[#F5821F] hover:underline text-[13px]" onClick={() => navigate(`/admin/crm/accounts/${account.parentAccount!.id}`)}>{account.parentAccount.name}</button>
                      : <span className="text-[#A8A29E]">—</span>}
                  </QI>
                  <QI label="Country">{account.country || <span className="text-[#A8A29E]">—</span>}</QI>
                  <QI label="Address">{account.address || <span className="text-[#A8A29E]">—</span>}</QI>
                  <QI label="Phone">{account.phoneNumber || <span className="text-[#A8A29E]">—</span>}</QI>
                  <QI label="Owner"><span className="text-[#A8A29E] text-xs">{account.ownerId?.slice(0,8)}…</span></QI>
                </>
              )}

              {/* Default: Agent / Provider / Organisation / unknown */}
              {!["Student","School","Sub_Agency","Super_Agency","Supplier","Staff","Branch"].includes(account?.accountType ?? "") && (
                <>
                  <QI label="Country">{account?.country || <span className="text-[#A8A29E]">—</span>}</QI>
                  <QI label="Phone">{account?.phoneNumber || <span className="text-[#A8A29E]">—</span>}</QI>
                  <QI label="Email">{account?.email || <span className="text-[#A8A29E]">—</span>}</QI>
                  <QI label="Owner"><span className="text-[#A8A29E] text-xs">{account?.ownerId?.slice(0,8)}…</span></QI>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
