import { useState, useRef, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SystemInfoSection } from "@/components/shared/SystemInfoSection";
import axios from "axios";
import { ArrowLeft, Phone, Mail, MessageSquare, Calendar, Users, FileText, Activity, ExternalLink, Building2, Search, X, Check, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

const TABS = [
  { key: "details",  label: "Details",           icon: FileText },
  { key: "activity", label: "Activity Timeline", icon: Activity },
];

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

function DetailField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-stone-400 mb-0.5">{label}</p>
      <p className="text-sm text-stone-800 font-medium">{value || "—"}</p>
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
  currentId,
  currentName,
  onSave,
  isSaving,
}: {
  currentId?: string | null;
  currentName?: string | null;
  onSave: (accountId: string | null, accountName: string | null) => void;
  isSaving: boolean;
}) {
  const [editing, setEditing]         = useState(false);
  const [query, setQuery]             = useState("");
  const [selected, setSelected]       = useState<AccountOption | null>(
    currentId && currentName ? { id: currentId, name: currentName } : null
  );
  const [pending, setPending]         = useState<AccountOption | null>(null);
  const inputRef                      = useRef<HTMLInputElement>(null);

  // Sync when parent data changes
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

  const cancel = () => {
    setPending(null);
    setQuery("");
    setEditing(false);
  };

  const pick = (acc: AccountOption) => {
    setPending(acc);
    setQuery(acc.name);
  };

  const save = () => {
    setSelected(pending);
    onSave(pending?.id ?? null, pending?.name ?? null);
    setEditing(false);
    setQuery("");
    setPending(null);
  };

  const clear = () => {
    setPending(null);
    setQuery("");
  };

  // ── View mode ──
  if (!editing) {
    return (
      <div>
        <p className="text-xs text-stone-400 mb-1">Account</p>
        <div className="flex items-center gap-2">
          {selected ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FEF0E3] border border-[#F5821F]/30">
              <Building2 size={12} className="text-[#F5821F] shrink-0" />
              <span className="text-sm font-medium text-[#1C1917]">{selected.name}</span>
            </div>
          ) : (
            <span className="text-sm text-stone-400">—</span>
          )}
          <button
            onClick={startEdit}
            className="p-1 rounded hover:bg-[#F4F3F1] text-stone-400 hover:text-stone-700 transition-colors"
            title="Change account"
          >
            <Pencil size={13} />
          </button>
        </div>
      </div>
    );
  }

  // ── Edit mode ──
  const showDropdown = editing && query.length >= 1 && (isFetching || results.length > 0);

  return (
    <div className="col-span-full">
      <p className="text-xs text-stone-400 mb-1">Account</p>
      <div className="flex flex-col gap-2">
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
            <button onClick={clear} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
              <X size={13} />
            </button>
          )}

          {/* Dropdown */}
          {showDropdown && (
            <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-[#E8E6E2] rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto">
              {isFetching && !results.length ? (
                <div className="px-4 py-3 text-sm text-stone-400">Searching…</div>
              ) : results.length === 0 ? (
                <div className="px-4 py-3 text-sm text-stone-400">No accounts found</div>
              ) : (
                results.map(acc => {
                  const isSelected = pending?.id === acc.id;
                  return (
                    <button
                      key={acc.id}
                      onClick={() => pick(acc)}
                      className={`w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-[#FEF0E3] transition-colors ${isSelected ? "bg-[#FEF0E3]" : ""}`}
                    >
                      <Building2 size={13} className="text-[#F5821F] shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#1C1917] truncate">{acc.name}</p>
                        {acc.accountType && (
                          <p className="text-xs text-stone-400">{acc.accountType}</p>
                        )}
                      </div>
                      {isSelected && <Check size={13} className="text-[#F5821F] shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Pending selection preview */}
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
          {(selected || pending) && (
            <button
              onClick={() => { setPending(null); setQuery(""); }}
              className="text-xs text-stone-400 hover:text-red-500 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function LeadDetailPage() {
  const [, params]   = useRoute("/admin/crm/leads/:id");
  const [, navigate] = useLocation();
  const { toast }    = useToast();
  const qc           = useQueryClient();
  const [tab, setTab] = useState("details");
  const [activityForm, setActivityForm] = useState({ channel: "Call", scheduledAt: "", description: "" });
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: "", lastName: "", englishName: "", originalName: "",
    email: "", phone: "", nationality: "", source: "", inquiryType: "",
    budget: "", expectedStartDate: "", status: "new", notes: "",
    assignedStaffId: "",
  });
  const id = params?.id ?? "";

  const { data: lead, isLoading } = useQuery<Lead>({
    queryKey: ["crm-lead", id],
    queryFn: () => axios.get(`${BASE}/api/crm/leads/${id}`).then(r => r.data),
    enabled: !!id,
  });

  const { data: staffList = [] } = useQuery<StaffOption[]>({
    queryKey: ["crm-staff"],
    queryFn: () => axios.get(`${BASE}/api/crm/staff`).then(r => r.data),
  });

  // ── Open Edit Modal ─────────────────────────────────────────────────────────
  const openEdit = () => {
    if (!lead) return;
    setEditForm({
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
    setEditOpen(true);
  };

  // ── Edit Lead Mutation ───────────────────────────────────────────────────────
  const editMutation = useMutation({
    mutationFn: (f: typeof editForm) => {
      const fn = f.firstName.trim();
      const ln = f.lastName.trim();
      return axios.put(`${BASE}/api/crm/leads/${id}`, {
        firstName:         fn   || null,
        lastName:          ln   || null,
        englishName:       f.englishName       || null,
        originalName:      f.originalName      || null,
        fullName:          fn && ln ? `${fn} ${ln.toUpperCase()}` : (fn || ln || lead?.fullName),
        email:             f.email             || null,
        phone:             f.phone             || null,
        nationality:       f.nationality        || null,
        source:            f.source            || null,
        inquiryType:       f.inquiryType        || null,
        budget:            f.budget            || null,
        expectedStartDate: f.expectedStartDate  || null,
        status:            f.status,
        notes:             f.notes             || null,
        assignedStaffId:   f.assignedStaffId    || null,
      }).then(r => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-lead", id] });
      setEditOpen(false);
      toast({ title: "Lead updated" });
    },
    onError: () => toast({ title: "Failed to update lead", variant: "destructive" }),
  });

  // ── Save Account ────────────────────────────────────────────────────────────
  const [savingAccount, setSavingAccount] = useState(false);
  const saveAccount = async (accountId: string | null, _name: string | null) => {
    if (!lead) return;
    setSavingAccount(true);
    try {
      await axios.put(`${BASE}/api/crm/leads/${id}`, {
        fullName:          lead.fullName,
        email:             lead.email,
        phone:             lead.phone,
        nationality:       lead.nationality,
        source:            lead.source,
        inquiryType:       lead.inquiryType,
        budget:            lead.budget,
        expectedStartDate: lead.expectedStartDate,
        notes:             lead.notes,
        status:            lead.status,
        accountId:         accountId,
      });
      qc.invalidateQueries({ queryKey: ["crm-lead", id] });
      toast({ title: accountId ? "Account linked" : "Account removed" });
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setSavingAccount(false);
    }
  };

  // ── Activity ────────────────────────────────────────────────────────────────
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

  // ── Convert to Quote ────────────────────────────────────────────────────────
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-stone-800">{lead.fullName}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[status] ?? "bg-[#F4F3F1] text-[#57534E]"}`}>
              {status.replace(/_/g, " ")}
            </span>
          </div>
          {lead.leadRefNumber && (
            <p className="font-mono text-sm text-stone-400">{lead.leadRefNumber}</p>
          )}
          {/* Account badge under the name */}
          {lead.accountName && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <Building2 size={13} className="text-[#F5821F]" />
              <span className="text-sm text-[#57534E]">{lead.accountName}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button onClick={() => convertMutation.mutate()} disabled={convertMutation.isPending}
            className="text-white" style={{ background: "#F5821F" }}>
            {convertMutation.isPending ? "Converting…" : "Convert to Quote"}
          </Button>
          <Button variant="outline" onClick={openEdit}>
            <Pencil size={13} className="mr-1" /> Edit
          </Button>
        </div>
      </div>

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
        <div className="space-y-6">
          {/* Account Lookup - full width row */}
          <div className="bg-white border border-[#E8E6E2] rounded-xl p-4">
            <p className="text-xs font-semibold text-[#F5821F] uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Building2 size={12} /> Account
            </p>
            <AccountLookupField
              currentId={lead.accountId}
              currentName={lead.accountName}
              onSave={saveAccount}
              isSaving={savingAccount}
            />
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <DetailField label="Full Name"      value={lead.fullName} />
            <div>
              <p className="text-xs text-stone-400 mb-0.5">Status</p>
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[lead.status ?? "new"] ?? "bg-[#F4F3F1] text-[#57534E]"}`}>
                {(lead.status ?? "new").replace(/_/g, " ")}
              </span>
            </div>
            <DetailField label="Assigned Staff" value={lead.assignedStaffName} />
            <DetailField label="Email"          value={lead.email} />
            <DetailField label="Phone"          value={lead.phone} />
            <DetailField label="Nationality"    value={lead.nationality} />
            <DetailField label="Inquiry Type"   value={lead.inquiryType} />
            <DetailField label="Budget"         value={lead.budget ? `A$${Number(lead.budget).toLocaleString("en-AU")}` : null} />
            <DetailField label="Expected Start" value={lead.expectedStartDate ? format(new Date(lead.expectedStartDate), "MMM d, yyyy") : null} />
            <DetailField label="Source"         value={lead.source} />
            {lead.notes && (
              <div className="col-span-full">
                <p className="text-xs text-stone-400 mb-0.5">Notes</p>
                <p className="text-sm text-stone-700 whitespace-pre-wrap">{lead.notes}</p>
              </div>
            )}
          </div>

          {/* Linked Camp Application */}
          {lead.source === "Camp Application" && lead.campApplication && (
            <div className="border border-[#F5821F]/30 rounded-xl p-4 bg-[#FEF0E3]/40">
              <p className="text-xs font-semibold text-[#F5821F] uppercase tracking-wide mb-3">Linked Camp Application</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3">
                <div>
                  <p className="text-xs text-stone-400 mb-0.5">Application Ref</p>
                  <p className="text-sm font-mono font-medium text-stone-800">{lead.campApplication.applicationRef ?? "—"}</p>
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
                onClick={() => navigate(`/admin/camp-applications/${lead.campApplication.id}`)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#F5821F] hover:underline"
              >
                View Application <ExternalLink size={13} />
              </button>
            </div>
          )}
          <SystemInfoSection owner={(lead as any).ownerId ?? null} createdAt={(lead as any).createdAt} updatedAt={(lead as any).updatedAt} />
        </div>
      )}

      {/* ── Activity Tab ── */}
      {tab === "activity" && (
        <div className="space-y-6">
          <div className="space-y-0">
            {(lead.activities ?? []).length === 0 && (
              <p className="text-sm text-stone-400 text-center py-8">No activities yet. Log the first one below.</p>
            )}
            {(lead.activities ?? []).map((a, idx) => {
              const isLast = idx === (lead.activities ?? []).length - 1;
              return (
                <div key={a.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <ChannelIcon channel={a.channel} />
                    {!isLast && <div className="w-px flex-1 bg-stone-200 mt-2" />}
                  </div>
                  <div className={`pb-6 flex-1`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-stone-600">{a.channel}</span>
                      <span className="text-[11px] text-stone-400">
                        {format(new Date(a.createdOn), "MMM d, yyyy · h:mm a")}
                      </span>
                      {a.scheduledAt && (
                        <span className="flex items-center gap-1 text-[11px] text-stone-400">
                          <Calendar size={11} />
                          {format(new Date(a.scheduledAt), "MMM d, yyyy · h:mm a")}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-stone-700">{a.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border border-stone-200 rounded-xl p-4 space-y-3 bg-stone-50">
            <p className="text-sm font-semibold text-stone-700">+ Log Activity</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-stone-600">Channel</Label>
                <Select value={activityForm.channel} onValueChange={v => setActivityForm(f => ({ ...f, channel: v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{CHANNELS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-stone-600">Scheduled At</Label>
                <Input type="datetime-local" value={activityForm.scheduledAt}
                  onChange={e => setActivityForm(f => ({ ...f, scheduledAt: e.target.value }))}
                  className="h-9 text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-stone-600">Description <span className="text-red-500">*</span></Label>
              <Textarea value={activityForm.description}
                onChange={e => setActivityForm(f => ({ ...f, description: e.target.value }))}
                className="text-sm min-h-[70px] resize-none bg-white"
                placeholder="Describe the activity…" />
            </div>
            <Button onClick={handleLogActivity} disabled={activityMutation.isPending}
              className="text-white" style={{ background: "#F5821F" }}>
              {activityMutation.isPending ? "Saving…" : "Save Activity"}
            </Button>
          </div>
        </div>
      )}

      {/* ── Edit Lead Dialog ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-1">
            <NameFieldGroup
              values={{
                firstName:    editForm.firstName,
                lastName:     editForm.lastName,
                originalName: editForm.originalName,
                englishName:  editForm.englishName,
              }}
              onChange={(key, value) => setEditForm(f => ({ ...f, [key]: value }))}
              required
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input className="h-9 text-sm" type="email" value={editForm.email}
                  onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Phone</Label>
                <Input className="h-9 text-sm" value={editForm.phone}
                  onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Nationality</Label>
                <Input className="h-9 text-sm" value={editForm.nationality}
                  onChange={e => setEditForm(f => ({ ...f, nationality: e.target.value }))} placeholder="e.g. Korean" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Source</Label>
                <Input className="h-9 text-sm" value={editForm.source}
                  onChange={e => setEditForm(f => ({ ...f, source: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Inquiry Type</Label>
                <Select value={editForm.inquiryType || "__none__"} onValueChange={v => setEditForm(f => ({ ...f, inquiryType: v === "__none__" ? "" : v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None —</SelectItem>
                    {["Study Abroad","Camp","Language Course","University","Internship","Other"].map(v =>
                      <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select value={editForm.status} onValueChange={v => setEditForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["new","open","in_progress","converted","closed","lost"].map(v =>
                      <SelectItem key={v} value={v}>{v.replace(/_/g, " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Budget (A$)</Label>
                <Input className="h-9 text-sm" type="number" value={editForm.budget}
                  onChange={e => setEditForm(f => ({ ...f, budget: e.target.value }))} placeholder="0" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Expected Start Date</Label>
                <Input className="h-9 text-sm" type="date" value={editForm.expectedStartDate}
                  onChange={e => setEditForm(f => ({ ...f, expectedStartDate: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Assigned Staff (담당 직원)</Label>
                <Select value={editForm.assignedStaffId || "__none__"} onValueChange={v => setEditForm(f => ({ ...f, assignedStaffId: v === "__none__" ? "" : v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select staff…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Unassigned —</SelectItem>
                    {staffList.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Textarea className="text-sm min-h-[80px]" value={editForm.notes}
                onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button
                disabled={!editForm.firstName.trim() || !editForm.lastName.trim() || editMutation.isPending}
                className="text-white" style={{ background: "#F5821F" }}
                onClick={() => editMutation.mutate(editForm)}>
                {editMutation.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
