import { useState, useRef, useEffect } from "react";
import { formatDate, formatDateTime } from "@/lib/date-format";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SystemInfoSection } from "@/components/shared/SystemInfoSection";
import axios from "axios";
import {
  ArrowLeft, Phone, Mail, MessageSquare, Calendar, Users, FileText, Activity,
  ExternalLink, Building2, Search, X, Check, Save, RotateCcw, Loader2, UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { NameFieldGroup } from "@/components/common/NameFieldGroup";
import { useAuth } from "@/hooks/use-auth";
import { useLookup } from "@/hooks/use-lookup";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const STATUS_COLORS: Record<string, string> = {
  new:         "bg-[--e-orange-lt] text-[--e-orange]",
  open:        "bg-[#EFF6FF] text-[#3B82F6]",
  in_progress: "bg-[#FEF9C3] text-[#CA8A04]",
  qualified:   "bg-[#DCFCE7] text-[#16A34A]",
  unqualified: "bg-[#F4F3F1] text-[#57534E]",
};

const CHANNEL_ICONS: Record<string, React.ElementType> = {
  Call:      Phone,
  Email:     Mail,
  SMS:       MessageSquare,
  Meeting:   Users,
  WhatsApp:  MessageSquare,
  LINE:      MessageSquare,
  KakaoTalk: MessageSquare,
};
const CHANNELS = ["Call", "Email", "SMS", "Meeting", "WhatsApp", "LINE", "KakaoTalk"];

const SOURCES = [
  "Website", "Referral", "Social Media", "Email", "Phone",
  "Agent", "Camp Application", "Walk-in", "Other",
];

const TABS = [
  { key: "details",  label: "Details",           icon: FileText },
  { key: "activity", label: "Activity Timeline", icon: Activity },
];

const INPUT_CLS = "h-9 text-sm border-[#E8E6E2] focus:border-[--e-orange] focus-visible:ring-0 focus-visible:ring-offset-0";

const ACCOUNT_CREATE_TYPES = ["Student", "Provider", "Client", "Institute", "Agent", "Company", "Accommodation", "Agency", "School", "Private"];

interface ActivityRecord {
  id: string;
  channel: string;
  scheduledAt?: string | null;
  description: string;
  createdOn: string;
}

interface CampApplicationSnippet {
  id: string;
  applicationRef?: string | null;
  packageGroupId?: string | null;
  preferredStartDate?: string | null;
  applicationStatus?: string | null;
}

interface AccountOption {
  id: string;
  name: string;
  accountType?: string | null;
}

interface Lead {
  id: string;
  leadRefNumber?: string | null;
  fullName: string;
  firstName?: string | null;
  lastName?: string | null;
  englishName?: string | null;
  originalName?: string | null;
  email?: string | null;
  phone?: string | null;
  nationality?: string | null;
  inquiryType?: string | null;
  budget?: string | null;
  expectedStartDate?: string | null;
  status?: string | null;
  source?: string | null;
  notes?: string | null;
  accountId?: string | null;
  accountName?: string | null;
  accountType?: string | null;
  assignedStaffId?: string | null;
  assignedStaffName?: string | null;
  activities?: ActivityRecord[];
  campApplication?: CampApplicationSnippet | null;
  isActive?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface StaffOption { id: string; name: string; }

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-bold text-[--e-orange] uppercase tracking-widest mb-4 pb-2 border-b border-[--e-orange]/20">
      {children}
    </h3>
  );
}

function FormRow({ children, cols = 2 }: { children: React.ReactNode; cols?: number }) {
  return (
    <div className={`grid gap-4 ${cols === 1 ? "" : cols === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"}`}>
      {children}
    </div>
  );
}

function FieldGroup({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

function ChannelIcon({ channel }: { channel: string }) {
  const Icon = CHANNEL_ICONS[channel] ?? MessageSquare;
  return (
    <div className="w-8 h-8 rounded-full bg-[--e-orange-lt] flex items-center justify-center shrink-0">
      <Icon size={14} className="text-[--e-orange]" />
    </div>
  );
}

// ── Account Lookup Field ──────────────────────────────────────────────────────
function AccountLookupField({
  currentId, currentName, defaultAccountType, onSave, isSaving,
}: {
  currentId?: string | null;
  currentName?: string | null;
  defaultAccountType?: string | null;
  onSave: (accountId: string | null, accountName: string | null) => void;
  isSaving: boolean;
}) {
  const { user }  = useAuth();
  const { toast } = useToast();
  const qc        = useQueryClient();

  const [editing, setEditing]   = useState(false);
  const [query, setQuery]       = useState("");
  const [selected, setSelected] = useState<AccountOption | null>(
    currentId && currentName ? { id: currentId, name: currentName } : null
  );
  const [pending, setPending]   = useState<AccountOption | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName,  setNewName]  = useState("");
  const [newType,  setNewType]  = useState(defaultAccountType ?? "Client");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [creating, setCreating] = useState(false);
  const inputRef  = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelected(currentId && currentName ? { id: currentId, name: currentName } : null);
  }, [currentId, currentName]);

  useEffect(() => {
    if (defaultAccountType) setNewType(defaultAccountType);
  }, [defaultAccountType]);

  const { data: results = [] } = useQuery<AccountOption[]>({
    queryKey: ["account-search-lead", query],
    queryFn: () =>
      axios.get(`${BASE}/api/crm/accounts?search=${encodeURIComponent(query)}&limit=20`)
        .then(r => r.data.data ?? []),
    enabled: editing && query.length >= 1 && !showCreate,
    staleTime: 10_000,
  });

  // Click-outside to close
  useEffect(() => {
    if (!editing) return;
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        if (!showCreate) cancel();
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [editing, showCreate]);

  const resetForm = () => { setNewName(""); setNewType(defaultAccountType ?? "Client"); setNewEmail(""); setNewPhone(""); };

  const startEdit = () => {
    setPending(selected);
    setQuery(selected?.name ?? "");
    setEditing(true);
    setShowCreate(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const cancel = () => {
    setPending(null); setQuery(""); setEditing(false);
    setShowCreate(false); resetForm();
  };

  const pick = (acc: AccountOption) => {
    setSelected(acc);
    onSave(acc.id, acc.name);
    setEditing(false); setQuery(""); setPending(null); setShowCreate(false);
  };

  const clear = () => {
    setSelected(null); onSave(null, null);
    setEditing(false); setQuery(""); setPending(null); setShowCreate(false);
  };

  const openCreate = () => { setNewName(query); setShowCreate(true); };

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast({ title: "Account name is required", variant: "destructive" }); return;
    }
    if (!user?.id) {
      toast({ title: "User session not found", variant: "destructive" }); return;
    }
    setCreating(true);
    try {
      const res = await axios.post(`${BASE}/api/crm/accounts`, {
        name:        newName.trim(),
        accountType: newType,
        email:       newEmail.trim() || undefined,
        phoneNumber: newPhone.trim() || undefined,
        ownerId:     user.id,
        manualInput: true,
        status:      "Active",
      });
      const created = res.data;
      toast({ title: "Account created", description: `"${created.name}" has been added.` });
      qc.invalidateQueries({ queryKey: ["account-search-lead"] });
      pick({ id: created.id, name: created.name, accountType: created.accountType });
      resetForm();
    } catch (err: any) {
      toast({ title: "Failed to create account", description: err?.response?.data?.error ?? err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  if (!editing) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {selected ? (
          <>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[--e-orange-lt] border border-[--e-orange]/30">
              <Building2 size={12} className="text-[--e-orange] shrink-0" />
              <span className="text-sm font-medium text-[#1C1917]">{selected.name}</span>
            </div>
            <button onClick={startEdit} className="text-xs text-[--e-orange] hover:underline font-medium">Change</button>
            <button onClick={clear} className="text-stone-400 hover:text-red-500"><X size={13} /></button>
          </>
        ) : (
          <button
            onClick={startEdit}
            className="w-full text-left text-sm flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-stone-300 hover:border-[--e-orange] hover:bg-[--e-orange-lt]/40 transition-colors text-stone-400 hover:text-stone-700"
          >
            <Search size={13} className="text-[--e-orange]" />
            Search or create account…
          </button>
        )}
      </div>
    );
  }

  return (
    <div ref={dropdownRef} className="relative">
      {/* Search row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          <Input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setShowCreate(false); }}
            placeholder="Search account name…"
            className="h-9 text-sm pl-8 border-[--e-orange] shadow-[0_0_0_3px_var(--e-orange-shadow-12)]"
          />
        </div>
        <button onClick={cancel} className="text-stone-400 hover:text-stone-600" title="Cancel">
          <X size={16} />
        </button>
      </div>

      {/* Dropdown */}
      {(results.length > 0 || query.length >= 1) && !showCreate && (
        <div className="absolute top-10 left-0 z-50 bg-white border border-[#E8E6E2] rounded-xl shadow-lg w-full max-h-60 overflow-y-auto">
          {results.map(acc => (
            <button key={acc.id} onClick={() => pick(acc)}
              className="w-full text-left px-3 py-2.5 text-sm hover:bg-[--e-orange-lt] flex items-center gap-2 border-b border-stone-50 last:border-0">
              <Building2 size={13} className="text-stone-400 shrink-0" />
              <span className="flex-1 truncate">{acc.name}</span>
              {acc.accountType && <span className="text-xs text-stone-400 shrink-0">({acc.accountType})</span>}
            </button>
          ))}
          {/* Create new option */}
          <button onClick={openCreate}
            className="w-full text-left px-3 py-2.5 text-sm hover:bg-green-50 flex items-center gap-2 border-t border-stone-100 text-green-700 font-medium">
            <UserPlus size={13} className="shrink-0" />
            {query.trim() ? `Create "${query.trim()}"` : "Create new account…"}
          </button>
        </div>
      )}

      {/* Inline create form */}
      {showCreate && (
        <div className="mt-2 border border-green-200 rounded-xl bg-green-50 p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <UserPlus size={14} className="text-green-700" />
            <span className="text-sm font-semibold text-green-800">New Account</span>
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1 block">
              Name <span className="text-red-500">*</span>
            </label>
            <Input value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="e.g. John Smith" className="h-8 text-sm bg-white" autoFocus />
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1 block">
              Account Type <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {ACCOUNT_CREATE_TYPES.map(t => (
                <button key={t} type="button" onClick={() => setNewType(t)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    newType === t
                      ? "bg-[--e-orange] text-white border-[--e-orange]"
                      : "bg-white text-stone-600 border-stone-200 hover:border-orange-300"
                  }`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1 block">Email</label>
              <Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                placeholder="email@example.com" className="h-8 text-sm bg-white" />
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1 block">Phone</label>
              <Input value={newPhone} onChange={e => setNewPhone(e.target.value)}
                placeholder="+61 4xx xxx xxx" className="h-8 text-sm bg-white" />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={() => setShowCreate(false)}
              className="flex-1 h-8 rounded-lg border border-stone-300 text-sm text-stone-600 hover:bg-stone-50 transition-colors">
              Back to search
            </button>
            <button onClick={handleCreate} disabled={creating || !newName.trim()}
              className="flex-1 h-8 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50 bg-[--e-orange] hover:bg-[--e-orange-hover]">
              {creating ? "Creating…" : "Create & Select"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function LeadDetailPage() {
  const [, params]    = useRoute("/admin/crm/leads/:id");
  const [, navigate]  = useLocation();
  const { toast }     = useToast();
  const qc            = useQueryClient();
  const inquiryTypes  = useLookup("inquiry_type");
  const [tab, setTab] = useState("details");
  const [showConvertConfirm, setShowConvertConfirm] = useState(false);
  const [activityForm, setActivityForm] = useState({ channel: "Call", scheduledAt: "", description: "" });
  const id = params?.id ?? "";

  // ── form state ────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    firstName: "", lastName: "", englishName: "", originalName: "",
    email: "", phone: "", nationality: "", source: "", inquiryType: "",
    budget: "", expectedStartDate: "", status: "new", notes: "",
    assignedStaffId: "",
  });
  const [isDirty, setIsDirty] = useState(false);

  const set = (key: keyof typeof form, value: string) => {
    setForm(f => ({ ...f, [key]: value }));
    setIsDirty(true);
  };

  // ── queries ───────────────────────────────────────────────────────────────
  const { data: lead, isLoading } = useQuery<Lead>({
    queryKey: ["crm-lead", id],
    queryFn: () => axios.get(`${BASE}/api/crm/leads/${id}`).then(r => r.data),
    enabled: !!id,
  });

  const { data: staffList = [] } = useQuery<StaffOption[]>({
    queryKey: ["crm-staff"],
    queryFn: () => axios.get(`${BASE}/api/crm/staff`).then(r => r.data),
  });

  // Sync form when lead loads
  useEffect(() => {
    if (!lead) return;
    setForm({
      firstName:         lead.firstName         ?? "",
      lastName:          lead.lastName          ?? "",
      englishName:       lead.englishName        ?? "",
      originalName:      lead.originalName       ?? "",
      email:             lead.email             ?? "",
      phone:             lead.phone             ?? "",
      nationality:       lead.nationality        ?? "",
      source:            lead.source            ?? "",
      inquiryType:       lead.inquiryType        ?? "",
      budget:            lead.budget            ?? "",
      expectedStartDate: lead.expectedStartDate  ?? "",
      status:            lead.status            ?? "new",
      notes:             lead.notes             ?? "",
      assignedStaffId:   lead.assignedStaffId    ?? "",
    });
    setIsDirty(false);
  }, [lead]);

  const cancelEdit = () => {
    if (!lead) return;
    setForm({
      firstName:         lead.firstName         ?? "",
      lastName:          lead.lastName          ?? "",
      englishName:       lead.englishName        ?? "",
      originalName:      lead.originalName       ?? "",
      email:             lead.email             ?? "",
      phone:             lead.phone             ?? "",
      nationality:       lead.nationality        ?? "",
      source:            lead.source            ?? "",
      inquiryType:       lead.inquiryType        ?? "",
      budget:            lead.budget            ?? "",
      expectedStartDate: lead.expectedStartDate  ?? "",
      status:            lead.status            ?? "new",
      notes:             lead.notes             ?? "",
      assignedStaffId:   lead.assignedStaffId    ?? "",
    });
    setIsDirty(false);
  };

  // ── toggle active mutation ─────────────────────────────────────────────────
  const toggleActiveMutation = useMutation({
    mutationFn: () =>
      axios.patch(`${BASE}/api/crm/leads/${id}/toggle-active`).then(r => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["crm-lead", id] });
      toast({ title: data.isActive ? "Lead activated" : "Lead deactivated" });
    },
    onError: () => toast({ title: "Failed to toggle status", variant: "destructive" }),
  });

  // ── save mutation ─────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: () => {
      const fn = form.firstName.trim();
      const ln = form.lastName.trim();
      return axios.put(`${BASE}/api/crm/leads/${id}`, {
        firstName:         fn   || null,
        lastName:          ln   || null,
        englishName:       form.englishName       || null,
        originalName:      form.originalName      || null,
        fullName:          fn && ln ? `${fn} ${ln.toUpperCase()}` : (fn || ln || lead?.fullName),
        email:             form.email             || null,
        phone:             form.phone             || null,
        nationality:       form.nationality        || null,
        source:            form.source            || null,
        inquiryType:       form.inquiryType        || null,
        budget:            form.budget            || null,
        expectedStartDate: form.expectedStartDate  || null,
        status:            form.status,
        notes:             form.notes             || null,
        assignedStaffId:   form.assignedStaffId    || null,
      }).then(r => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-lead", id] });
      setIsDirty(false);
      toast({ title: "Lead saved" });
    },
    onError: () => toast({ title: "Failed to save lead", variant: "destructive" }),
  });

  // ── assigned staff quick-save ─────────────────────────────────────────────
  const [staffSaving, setStaffSaving] = useState(false);
  const saveAssignedStaff = async (staffId: string | null) => {
    if (!lead) return;
    setStaffSaving(true);
    try {
      await axios.put(`${BASE}/api/crm/leads/${id}`, {
        fullName: lead.fullName, email: lead.email, phone: lead.phone,
        nationality: lead.nationality, source: lead.source,
        inquiryType: lead.inquiryType, budget: lead.budget,
        expectedStartDate: lead.expectedStartDate, notes: lead.notes,
        status: lead.status, accountId: lead.accountId,
        assignedStaffId: staffId,
      });
      qc.invalidateQueries({ queryKey: ["crm-lead", id] });
      toast({ title: "Assigned staff updated" });
    } catch {
      toast({ title: "Failed to update assigned staff", variant: "destructive" });
    } finally {
      setStaffSaving(false);
    }
  };

  // ── account save ──────────────────────────────────────────────────────────
  const [savingAccount, setSavingAccount] = useState(false);
  const saveAccount = async (accountId: string | null, _name: string | null) => {
    if (!lead) return;
    setSavingAccount(true);
    try {
      await axios.put(`${BASE}/api/crm/leads/${id}`, {
        fullName: lead.fullName, email: lead.email, phone: lead.phone,
        nationality: lead.nationality, source: lead.source,
        inquiryType: lead.inquiryType, budget: lead.budget,
        expectedStartDate: lead.expectedStartDate, notes: lead.notes,
        status: lead.status, accountId,
      });
      qc.invalidateQueries({ queryKey: ["crm-lead", id] });
      toast({ title: accountId ? "Account linked" : "Account removed" });
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setSavingAccount(false);
    }
  };

  // ── activity ──────────────────────────────────────────────────────────────
  const activityMutation = useMutation({
    mutationFn: (payload: typeof activityForm) =>
      axios.post(`${BASE}/api/crm/leads/${id}/activities`, payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-lead", id] });
      setActivityForm({ channel: "Call", scheduledAt: "", description: "" });
      toast({ title: "Activity logged" });
    },
    onError: () => toast({ title: "Failed to log activity", variant: "destructive" }),
  });

  // ── convert to quote ──────────────────────────────────────────────────────
  const convertMutation = useMutation({
    mutationFn: () => axios.post(`${BASE}/api/crm/leads/${id}/convert-to-quote`).then(r => r.data),
    onSuccess: (data) => {
      setShowConvertConfirm(false);
      qc.invalidateQueries({ queryKey: ["lead", id] });
      toast({ title: `Quote created: ${data.quoteRefNumber}` });
      navigate(data.redirectTo ?? "/admin/crm/quotes");
    },
    onError: () => {
      setShowConvertConfirm(false);
      toast({ title: "Conversion failed", variant: "destructive" });
    },
  });

  function handleLogActivity() {
    if (!activityForm.description.trim()) {
      toast({ title: "Description is required", variant: "destructive" });
      return;
    }
    activityMutation.mutate(activityForm);
  }

  if (isLoading) return <div className="flex items-center justify-center h-64 text-stone-400 text-sm">Loading lead…</div>;
  if (!lead)     return <div className="flex items-center justify-center h-64 text-stone-400 text-sm">Lead not found.</div>;

  const status = lead.status ?? "new";

  return (
    <div className="p-6 space-y-6">
      <button onClick={() => navigate("/admin/crm/leads")}
        className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors">
        <ArrowLeft size={16} /> Back to Leads
      </button>

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h1 className="text-2xl font-bold text-stone-800">
              {form.firstName || form.lastName
                ? `${form.firstName} ${(form.lastName).toUpperCase()}`.trim()
                : lead.fullName}
            </h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[form.status] ?? "bg-[#F4F3F1] text-[#57534E]"}`}>
              {form.status.replace(/_/g, " ")}
            </span>
          </div>
          {lead.leadRefNumber && (
            <p className="font-mono text-sm text-stone-400">{lead.leadRefNumber}</p>
          )}
          {lead.accountName && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <Building2 size={13} className="text-[--e-orange]" />
              <span className="text-sm text-[#57534E]">{lead.accountName}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {isDirty && (
            <>
              <Button variant="outline" size="sm" onClick={cancelEdit}
                className="h-9 gap-1.5 text-stone-600">
                <RotateCcw size={13} /> Discard
              </Button>
              <Button size="sm" disabled={saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
                className="h-9 gap-1.5 text-white" style={{ background: "var(--e-orange)" }}>
                {saveMutation.isPending
                  ? <><Loader2 size={13} className="animate-spin" /> Saving…</>
                  : <><Save size={13} /> Save Changes</>}
              </Button>
            </>
          )}
          <Button onClick={() => setShowConvertConfirm(true)} disabled={convertMutation.isPending}
            className="h-9 gap-1.5 text-white" style={{ background: "var(--e-orange)" }}>
            <FileText size={14} />
            Convert to Quote
          </Button>
        </div>
      </div>

      {/* ── Unsaved changes banner ── */}
      {isDirty && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-[#FEF9C3] border border-[#CA8A04]/30 rounded-xl text-sm text-[#854D0E]">
          <span className="w-2 h-2 rounded-full bg-[#CA8A04] shrink-0" />
          You have unsaved changes — click <strong className="mx-1">Save Changes</strong> to apply.
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-1 border-b border-stone-200 overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                active ? "border-[--e-orange] text-[--e-orange]" : "border-transparent text-stone-500 hover:text-stone-800"
              }`}>
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Confirm Convert Dialog ── */}
      {showConvertConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 rounded-full bg-[--e-orange-lt] shrink-0">
                <FileText size={18} className="text-[--e-orange]" />
              </div>
              <div>
                <h3 className="font-semibold text-[#1C1917] text-base">Convert to Quote</h3>
                <p className="text-sm text-stone-500 mt-0.5">
                  A new quote will be created and linked to this lead.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowConvertConfirm(false)}
                className="h-9">Cancel</Button>
              <Button size="sm" disabled={convertMutation.isPending}
                onClick={() => convertMutation.mutate()}
                className="h-9 gap-1.5 text-white" style={{ background: "var(--e-orange)" }}>
                {convertMutation.isPending
                  ? <><Loader2 size={13} className="animate-spin" /> Converting…</>
                  : "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Details Tab ── */}
      {tab === "details" && (
        <div className="space-y-5">

          {/* Linked Quotes */}
          {lead.quotes && lead.quotes.length > 0 && (
            <div className="bg-white border border-[#E8E6E2] rounded-xl p-5">
              <SectionTitle>Quotes ({lead.quotes.length})</SectionTitle>
              <div className="space-y-2 mt-2">
                {lead.quotes.map((q: { id: string; quoteRefNumber: string; quoteStatus: string; createdOn: string }) => (
                  <div key={q.id}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-[#F4F3F1] hover:bg-[--e-orange-lt] transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText size={14} className="text-[--e-orange] shrink-0" />
                      <span className="font-mono text-sm text-[#1C1917] font-medium">{q.quoteRefNumber}</span>
                      {q.createdOn && (
                        <span className="text-xs text-muted-foreground">{formatDateTime(q.createdOn)}</span>
                      )}
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#F4F3F1] text-[#57534E]">
                        {q.quoteStatus}
                      </span>
                    </div>
                    <button
                      onClick={() => navigate(`/admin/crm/quotes/${q.id}`)}
                      className="flex items-center gap-1 text-xs font-medium text-[--e-orange] hover:underline shrink-0">
                      <ExternalLink size={12} /> View
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Account */}
          <div className="bg-white border border-[#E8E6E2] rounded-xl p-5">
            <SectionTitle>Account</SectionTitle>
            <AccountLookupField
              currentId={lead.accountId}
              currentName={lead.accountName}
              defaultAccountType={lead.accountType}
              onSave={saveAccount}
              isSaving={savingAccount}
            />
          </div>

          {/* Name */}
          <div className="bg-white border border-[#E8E6E2] rounded-xl p-5">
            <SectionTitle>Name</SectionTitle>
            <NameFieldGroup
              values={{
                firstName:    form.firstName,
                lastName:     form.lastName,
                englishName:  form.englishName,
                originalName: form.originalName,
              }}
              onChange={(key, value) => set(key as keyof typeof form, value)}
            />
          </div>

          {/* Contact Info */}
          <div className="bg-white border border-[#E8E6E2] rounded-xl p-5">
            <SectionTitle>Contact Info</SectionTitle>
            <div className="space-y-4">
              <FormRow>
                <FieldGroup label="Email">
                  <Input type="email" value={form.email}
                    onChange={e => set("email", e.target.value)}
                    placeholder="email@example.com" className={INPUT_CLS} />
                </FieldGroup>
                <FieldGroup label="Phone">
                  <Input value={form.phone}
                    onChange={e => set("phone", e.target.value)}
                    placeholder="+61 4xx xxx xxx" className={INPUT_CLS} />
                </FieldGroup>
              </FormRow>
              <FormRow>
                <FieldGroup label="Nationality">
                  <Input value={form.nationality}
                    onChange={e => set("nationality", e.target.value)}
                    placeholder="e.g. Korean" className={INPUT_CLS} />
                </FieldGroup>
              </FormRow>
            </div>
          </div>

          {/* Lead Info */}
          <div className="bg-white border border-[#E8E6E2] rounded-xl p-5">
            <SectionTitle>Lead Info</SectionTitle>
            <div className="space-y-4">
              <FormRow>
                <FieldGroup label="Status">
                  <Select value={form.status} onValueChange={v => set("status", v)}>
                    <SelectTrigger className={INPUT_CLS}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="qualified">Qualified</SelectItem>
                      <SelectItem value="unqualified">Unqualified</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldGroup>
              </FormRow>
              <FormRow>
                <FieldGroup label="Inquiry Type">
                  <Select value={form.inquiryType || "none"} onValueChange={v => set("inquiryType", v === "none" ? "" : v)}>
                    <SelectTrigger className={INPUT_CLS}>
                      <SelectValue placeholder="— select —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {inquiryTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FieldGroup>
                <FieldGroup label="Source">
                  <Select value={form.source || "none"} onValueChange={v => set("source", v === "none" ? "" : v)}>
                    <SelectTrigger className={INPUT_CLS}>
                      <SelectValue placeholder="— select —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FieldGroup>
              </FormRow>
              <FormRow>
                <FieldGroup label="Budget (AUD)">
                  <Input type="number" min="0" value={form.budget}
                    onChange={e => set("budget", e.target.value)}
                    placeholder="0.00" className={INPUT_CLS} />
                </FieldGroup>
                <FieldGroup label="Expected Start Date">
                  <Input type="date" value={form.expectedStartDate}
                    onChange={e => set("expectedStartDate", e.target.value)}
                    className={INPUT_CLS} />
                </FieldGroup>
              </FormRow>
              <FieldGroup label="Notes">
                <Textarea value={form.notes}
                  onChange={e => set("notes", e.target.value)}
                  placeholder="Additional notes…"
                  rows={8}
                  className="text-sm border-[#E8E6E2] focus:border-[--e-orange] focus-visible:ring-0 resize-y" />
              </FieldGroup>
            </div>
          </div>

          {/* Linked Camp Application */}
          {lead.source === "Camp Application" && lead.campApplication && (
            <div className="border border-[--e-orange]/30 rounded-xl p-5 bg-[--e-orange-lt]/40">
              <p className="text-xs font-semibold text-[--e-orange] uppercase tracking-widest mb-4 pb-2 border-b border-[--e-orange]/20">
                Linked Camp Application
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-xs text-stone-400 mb-0.5">Application Ref</p>
                  <p className="text-sm font-mono font-medium text-stone-800">
                    {lead.campApplication.applicationRef ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-stone-400 mb-0.5">Preferred Start</p>
                  <p className="text-sm font-medium text-stone-800">
                    {formatDate(lead.campApplication.preferredStartDate)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-stone-400 mb-0.5">Status</p>
                  <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-[#FEF9C3] text-[#CA8A04] capitalize">
                    {lead.campApplication.applicationStatus ?? "—"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => navigate(`/admin/camp-applications/${lead.campApplication!.id}`)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[--e-orange] hover:underline">
                <ExternalLink size={13} /> View Application
              </button>
            </div>
          )}

          {/* Assigned Staff */}
          <div className="bg-white border border-[#E8E6E2] rounded-xl p-5">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-widest mb-3">Assigned Staff</p>
            <Select
              value={lead.assignedStaffId ?? "none"}
              onValueChange={v => saveAssignedStaff(v === "none" ? null : v)}
              disabled={staffSaving}
            >
              <SelectTrigger className="h-9 text-sm border-[#E8E6E2] focus:border-[--e-orange] focus-visible:ring-0 focus-visible:ring-offset-0">
                <SelectValue placeholder="— unassigned —" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— unassigned —</SelectItem>
                {staffList.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {staffSaving && <p className="text-xs text-stone-400 mt-1.5 flex items-center gap-1"><Loader2 size={11} className="animate-spin" /> Saving…</p>}
          </div>

          {/* System Info */}
          <SystemInfoSection
            id={lead.id}
            recordIdLabel="Lead ID"
            createdAt={lead.createdAt ?? null}
            updatedAt={lead.updatedAt ?? null}
            isActive={lead.isActive ?? true}
            onToggleActive={() => toggleActiveMutation.mutate()}
            isToggling={toggleActiveMutation.isPending}
          />
        </div>
      )}

      {/* ── Activity Tab ── */}
      {tab === "activity" && (
        <div className="space-y-6">
          {/* Log new activity */}
          <div className="bg-white border border-[#E8E6E2] rounded-xl p-5">
            <SectionTitle>Log Activity</SectionTitle>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1 block">Channel</Label>
                  <Select value={activityForm.channel}
                    onValueChange={v => setActivityForm(f => ({ ...f, channel: v }))}>
                    <SelectTrigger className={INPUT_CLS}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CHANNELS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1 block">
                    <span className="flex items-center gap-1"><Calendar size={11} /> Scheduled At</span>
                  </Label>
                  <Input type="datetime-local" value={activityForm.scheduledAt}
                    onChange={e => setActivityForm(f => ({ ...f, scheduledAt: e.target.value }))}
                    className={INPUT_CLS} />
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1 block">Description</Label>
                <Textarea value={activityForm.description}
                  onChange={e => setActivityForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="What happened?"
                  rows={3}
                  className="text-sm border-[#E8E6E2] focus:border-[--e-orange] focus-visible:ring-0 resize-none" />
              </div>
              <div className="flex justify-end">
                <Button size="sm" disabled={activityMutation.isPending}
                  onClick={handleLogActivity}
                  className="text-white gap-1.5" style={{ background: "var(--e-orange)" }}>
                  {activityMutation.isPending
                    ? <><Loader2 size={13} className="animate-spin" />Logging…</>
                    : "Log Activity"}
                </Button>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-3">
            {(!lead.activities || lead.activities.length === 0) ? (
              <div className="text-center py-12 text-stone-400 text-sm">No activities yet</div>
            ) : (
              [...lead.activities].reverse().map(act => (
                <div key={act.id} className="flex gap-3 bg-white border border-[#E8E6E2] rounded-xl p-4">
                  <ChannelIcon channel={act.channel} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-semibold text-[--e-orange] uppercase tracking-wide">
                        {act.channel}
                      </span>
                      {act.scheduledAt && (
                        <span className="flex items-center gap-1 text-xs text-stone-400">
                          <Calendar size={10} />
                          {formatDateTime(act.scheduledAt)}
                        </span>
                      )}
                      <span className="text-xs text-stone-300 ml-auto">
                        {formatDate(act.createdOn)}
                      </span>
                    </div>
                    <p className="text-sm text-stone-700 whitespace-pre-wrap">{act.description}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
