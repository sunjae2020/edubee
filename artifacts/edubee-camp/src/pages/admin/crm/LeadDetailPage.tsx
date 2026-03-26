import { useState, useRef, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SystemInfoSection } from "@/components/shared/SystemInfoSection";
import axios from "axios";
import {
  ArrowLeft, Phone, Mail, MessageSquare, Calendar, Users, FileText, Activity,
  ExternalLink, Building2, Search, X, Check, Save, RotateCcw, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { NameFieldGroup } from "@/components/common/NameFieldGroup";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const STATUS_COLORS: Record<string, string> = {
  new:         "bg-[#FEF0E3] text-[#F5821F]",
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

const INQUIRY_TYPES = [
  "General Enquiry", "Camp Program", "Language School",
  "Accommodation", "Airport Transfer", "Insurance", "Visa", "Other",
];
const SOURCES = [
  "Website", "Referral", "Social Media", "Email", "Phone",
  "Agent", "Camp Application", "Walk-in", "Other",
];

const TABS = [
  { key: "details",  label: "Details",           icon: FileText },
  { key: "activity", label: "Activity Timeline", icon: Activity },
];

const INPUT_CLS = "h-9 text-sm border-[#E8E6E2] focus:border-[#F5821F] focus-visible:ring-0 focus-visible:ring-offset-0";

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
  assignedStaffId?: string | null;
  assignedStaffName?: string | null;
  activities?: ActivityRecord[];
  campApplication?: CampApplicationSnippet | null;
}

interface StaffOption { id: string; name: string; }

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-bold text-[#F5821F] uppercase tracking-widest mb-4 pb-2 border-b border-[#F5821F]/20">
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
    <div className="w-8 h-8 rounded-full bg-[#FEF0E3] flex items-center justify-center shrink-0">
      <Icon size={14} className="text-[#F5821F]" />
    </div>
  );
}

// ── Account Lookup Field ──────────────────────────────────────────────────────
function AccountLookupField({
  currentId, currentName, onSave, isSaving,
}: {
  currentId?: string | null;
  currentName?: string | null;
  onSave: (accountId: string | null, accountName: string | null) => void;
  isSaving: boolean;
}) {
  const [editing, setEditing]   = useState(false);
  const [query, setQuery]       = useState("");
  const [selected, setSelected] = useState<AccountOption | null>(
    currentId && currentName ? { id: currentId, name: currentName } : null
  );
  const [pending, setPending]   = useState<AccountOption | null>(null);
  const inputRef                = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSelected(currentId && currentName ? { id: currentId, name: currentName } : null);
  }, [currentId, currentName]);

  const { data: results = [], isFetching } = useQuery<AccountOption[]>({
    queryKey: ["account-search", query],
    queryFn: () =>
      axios.get(`${BASE}/api/crm/accounts?search=${encodeURIComponent(query)}&limit=20`)
        .then(r => r.data.data ?? []),
    enabled: editing && query.length >= 1,
    staleTime: 10_000,
  });

  const startEdit = () => {
    setPending(selected);
    setQuery(selected?.name ?? "");
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };
  const cancel = () => { setPending(null); setQuery(""); setEditing(false); };
  const pick   = (acc: AccountOption) => { setPending(acc); setQuery(acc.name); };
  const save   = () => {
    setSelected(pending);
    onSave(pending?.id ?? null, pending?.name ?? null);
    setEditing(false);
    setQuery("");
    setPending(null);
  };

  if (!editing) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {selected ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FEF0E3] border border-[#F5821F]/30">
            <Building2 size={12} className="text-[#F5821F] shrink-0" />
            <span className="text-sm font-medium text-[#1C1917]">{selected.name}</span>
          </div>
        ) : (
          <span className="text-sm text-stone-400">—</span>
        )}
        <button onClick={startEdit}
          className="text-xs text-[#F5821F] hover:underline font-medium transition-colors">
          {selected ? "Change" : "Link account"}
        </button>
      </div>
    );
  }

  const showDropdown = editing && query.length >= 1 && (isFetching || results.length > 0);

  return (
    <div className="space-y-2">
      <div className="relative max-w-md">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); if (pending?.name !== e.target.value) setPending(null); }}
          placeholder="Search accounts by name…"
          className="w-full pl-8 pr-8 h-9 text-sm border border-[#F5821F] rounded-lg outline-none shadow-[0_0_0_3px_rgba(245,130,31,0.15)] bg-white text-[#1C1917]"
        />
        {query && (
          <button onClick={() => { setPending(null); setQuery(""); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
            <X size={13} />
          </button>
        )}
        {showDropdown && (
          <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-[#E8E6E2] rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto">
            {isFetching && !results.length ? (
              <div className="px-4 py-3 text-sm text-stone-400">Searching…</div>
            ) : results.length === 0 ? (
              <div className="px-4 py-3 text-sm text-stone-400">No accounts found</div>
            ) : results.map(acc => {
              const isSel = pending?.id === acc.id;
              return (
                <button key={acc.id} onClick={() => pick(acc)}
                  className={`w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-[#FEF0E3] transition-colors ${isSel ? "bg-[#FEF0E3]" : ""}`}>
                  <Building2 size={13} className="text-[#F5821F] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1C1917] truncate">{acc.name}</p>
                    {acc.accountType && <p className="text-xs text-stone-400">{acc.accountType}</p>}
                  </div>
                  {isSel && <Check size={13} className="text-[#F5821F] shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
      {pending && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FEF0E3] border border-[#F5821F]/30 w-fit">
          <Building2 size={12} className="text-[#F5821F]" />
          <span className="text-sm font-medium text-[#1C1917]">{pending.name}</span>
        </div>
      )}
      <div className="flex items-center gap-2">
        <Button size="sm" className="h-7 px-3 bg-[#F5821F] hover:bg-[#D96A0A] text-white text-xs"
          onClick={save} disabled={isSaving}>
          {isSaving ? "Saving…" : "Save"}
        </Button>
        <Button size="sm" variant="ghost" className="h-7 px-3 text-xs" onClick={cancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function LeadDetailPage() {
  const [, params]    = useRoute("/admin/crm/leads/:id");
  const [, navigate]  = useLocation();
  const { toast }     = useToast();
  const qc            = useQueryClient();
  const [tab, setTab] = useState("details");
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
      toast({ title: `Quote created: ${data.quoteRefNumber}` });
      navigate(data.redirectTo ?? "/admin/crm/quotes");
    },
    onError: () => toast({ title: "Conversion failed", variant: "destructive" }),
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
              <Building2 size={13} className="text-[#F5821F]" />
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
                className="h-9 gap-1.5 text-white" style={{ background: "#F5821F" }}>
                {saveMutation.isPending
                  ? <><Loader2 size={13} className="animate-spin" /> Saving…</>
                  : <><Save size={13} /> Save Changes</>}
              </Button>
            </>
          )}
          <Button onClick={() => convertMutation.mutate()} disabled={convertMutation.isPending}
            className="h-9 text-white" style={{ background: "#16A34A" }}>
            {convertMutation.isPending ? "Converting…" : "Convert to Quote"}
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
                active ? "border-[#F5821F] text-[#F5821F]" : "border-transparent text-stone-500 hover:text-stone-800"
              }`}>
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Details Tab ── */}
      {tab === "details" && (
        <div className="space-y-5">

          {/* Account */}
          <div className="bg-white border border-[#E8E6E2] rounded-xl p-5">
            <SectionTitle>Account</SectionTitle>
            <AccountLookupField
              currentId={lead.accountId}
              currentName={lead.accountName}
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
                <FieldGroup label="Assigned Staff">
                  <Select value={form.assignedStaffId || "none"} onValueChange={v => set("assignedStaffId", v === "none" ? "" : v)}>
                    <SelectTrigger className={INPUT_CLS}>
                      <SelectValue placeholder="— unassigned —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— unassigned —</SelectItem>
                      {staffList.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
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
                      {INQUIRY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
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
                  className="text-sm border-[#E8E6E2] focus:border-[#F5821F] focus-visible:ring-0 resize-y" />
              </FieldGroup>
            </div>
          </div>

          {/* Linked Camp Application */}
          {lead.source === "Camp Application" && lead.campApplication && (
            <div className="border border-[#F5821F]/30 rounded-xl p-5 bg-[#FEF0E3]/40">
              <p className="text-xs font-semibold text-[#F5821F] uppercase tracking-widest mb-4 pb-2 border-b border-[#F5821F]/20">
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
                    {lead.campApplication.preferredStartDate
                      ? format(new Date(lead.campApplication.preferredStartDate), "MMM d, yyyy")
                      : "—"}
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
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#F5821F] hover:underline">
                <ExternalLink size={13} /> View Application
              </button>
            </div>
          )}

          {/* System Info */}
          <SystemInfoSection id={lead.id} />
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
                  className="text-sm border-[#E8E6E2] focus:border-[#F5821F] focus-visible:ring-0 resize-none" />
              </div>
              <div className="flex justify-end">
                <Button size="sm" disabled={activityMutation.isPending}
                  onClick={handleLogActivity}
                  className="text-white gap-1.5" style={{ background: "#F5821F" }}>
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
                      <span className="text-xs font-semibold text-[#F5821F] uppercase tracking-wide">
                        {act.channel}
                      </span>
                      {act.scheduledAt && (
                        <span className="flex items-center gap-1 text-xs text-stone-400">
                          <Calendar size={10} />
                          {format(new Date(act.scheduledAt), "MMM d, yyyy HH:mm")}
                        </span>
                      )}
                      <span className="text-xs text-stone-300 ml-auto">
                        {format(new Date(act.createdOn), "MMM d, yyyy")}
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
