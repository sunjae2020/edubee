import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  ArrowLeft, School, DollarSign, Pencil,
  ExternalLink, Loader2, Check, X, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { format, parseISO } from "date-fns";
import EntityDocumentsTab from "@/components/shared/EntityDocumentsTab";
import { NotePanel } from "@/components/shared/NotePanel";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const STATUSES = ["pending", "confirmed", "in_progress", "completed", "cancelled"] as const;
const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending:     { bg: "#FEF9C3", color: "#854D0E" },
  confirmed:   { bg: "#FEF0E3", color: "#F5821F" },
  in_progress: { bg: "#DBEAFE", color: "#1D4ED8" },
  completed:   { bg: "#DCFCE7", color: "#16A34A" },
  cancelled:   { bg: "#FEE2E2", color: "#DC2626" },
};

const PROGRAM_TYPES = ["english", "academic", "holiday", "mixed", "stem", "arts"];
const AGE_GROUPS    = ["adult", "junior", "mixed"];

function fmtDate(v?: string | null) {
  if (!v) return "—";
  try { return format(parseISO(v), "d MMM yyyy"); } catch { return v; }
}
function fmtMoney(v?: string | null, currency = "AUD") {
  if (!v) return "—";
  return `${currency} ${parseFloat(v).toLocaleString("en-AU", { minimumFractionDigits: 2 })}`;
}

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 border-b border-[#F4F3F1] last:border-0">
      <span className="text-[11px] font-semibold text-[#A8A29E] uppercase tracking-wide">{label}</span>
      <span className="text-sm text-[#1C1917]">{value ?? "—"}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_COLORS[status] ?? { bg: "#F4F3F1", color: "#57534E" };
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ background: s.bg, color: s.color }}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

// ─── Account Search ────────────────────────────────────────────────────────────
function AccountSearchInput({ value, displayName, onChange }: {
  value: string; displayName: string;
  onChange: (id: string, name: string) => void;
}) {
  const [search, setSearch] = useState(displayName);
  const [results, setResults] = useState<{ id: string; name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setSearch(displayName); }, [displayName]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!search.trim() || search === displayName) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
        const token = localStorage.getItem("edubee_token");
        const res = await fetch(`${BASE}/api/crm/accounts-search?search=${encodeURIComponent(search)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setResults((data.data ?? data).map((a: any) => ({ id: a.id, name: a.accountName ?? a.name })));
        setOpen(true);
      } catch { setResults([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [search, displayName]);

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <Input
          className="h-8 text-sm pl-8"
          value={search}
          placeholder="Search school account…"
          onChange={e => { setSearch(e.target.value); if (!e.target.value.trim()) onChange("", ""); }}
          onFocus={() => { if (results.length) setOpen(true); }}
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white border border-[#E8E6E2] rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {results.map(r => (
            <button key={r.id} type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-[#FEF0E3] transition-colors"
              onMouseDown={() => { onChange(r.id, r.name); setSearch(r.name); setOpen(false); }}>
              {r.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab({ record, canEdit, onSave }: { record: any; canEdit: boolean; onSave: (p: object) => void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    programName:             record.programName             ?? "",
    programType:             record.programType             ?? "",
    programStartDate:        record.programStartDate        ?? "",
    programEndDate:          record.programEndDate          ?? "",
    weeklyHours:             record.weeklyHours             ?? "",
    classSizeMax:            record.classSizeMax            ?? "",
    ageGroup:                record.ageGroup                ?? "",
    levelAssessmentRequired: record.levelAssessmentRequired ?? false,
    levelAssessmentDate:     record.levelAssessmentDate     ?? "",
    assignedClass:           record.assignedClass           ?? "",
    partnerCost:             record.partnerCost             ?? "",
    status:                  record.status                  ?? "pending",
    notes:                   record.notes                   ?? "",
    instituteAccountId:      record.instituteAccountId      ?? "",
  });
  const [accountDisplayName, setAccountDisplayName] = useState(record.instituteAccountName ?? "");
  const f = (k: string) => (v: string | boolean) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = () => { onSave(form); setEditing(false); };
  const handleCancel = () => {
    setForm({
      programName:             record.programName             ?? "",
      programType:             record.programType             ?? "",
      programStartDate:        record.programStartDate        ?? "",
      programEndDate:          record.programEndDate          ?? "",
      weeklyHours:             record.weeklyHours             ?? "",
      classSizeMax:            record.classSizeMax            ?? "",
      ageGroup:                record.ageGroup                ?? "",
      levelAssessmentRequired: record.levelAssessmentRequired ?? false,
      levelAssessmentDate:     record.levelAssessmentDate     ?? "",
      assignedClass:           record.assignedClass           ?? "",
      partnerCost:             record.partnerCost             ?? "",
      status:                  record.status                  ?? "pending",
      notes:                   record.notes                   ?? "",
      instituteAccountId:      record.instituteAccountId      ?? "",
    });
    setAccountDisplayName(record.instituteAccountName ?? "");
    setEditing(false);
  };

  const currency = record.contract?.currency ?? "AUD";

  return (
    <div className="space-y-4">
      {/* Contract link */}
      {record.contract && (
        <div className="rounded-xl border border-[#E8E6E2] bg-[#FAFAF9] p-4">
          <div className="text-[11px] font-semibold text-[#A8A29E] uppercase tracking-wide mb-2">Contract</div>
          <div className="flex items-center gap-3">
            <div>
              <div className="text-sm font-semibold text-[#1C1917]">{record.contract.contractNumber ?? "—"}</div>
              <div className="text-xs text-[#57534E]">{record.contract.studentName ?? "—"}</div>
            </div>
            <a href={`${BASE}/admin/camp-contracts/${record.contractId}`} className="ml-auto">
              <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1">
                <ExternalLink className="w-3 h-3" /> View Contract
              </Button>
            </a>
          </div>
        </div>
      )}

      {/* Program info card */}
      <div className="rounded-xl border border-[#E8E6E2] bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <School className="w-4 h-4 text-[#F5821F]" />
            <span className="text-sm font-semibold text-[#1C1917]">Camp Program</span>
          </div>
          {canEdit && !editing && (
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1" onClick={() => setEditing(true)}>
              <Pencil className="w-3 h-3" /> Edit
            </Button>
          )}
          {editing && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1" onClick={handleCancel}>
                <X className="w-3 h-3" /> Cancel
              </Button>
              <Button size="sm" className="h-7 px-2 text-xs gap-1 bg-[#F5821F] hover:bg-[#d97706] text-white" onClick={handleSave}>
                <Check className="w-3 h-3" /> Save
              </Button>
            </div>
          )}
        </div>

        {editing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">School Account</Label>
              <AccountSearchInput
                value={form.instituteAccountId}
                displayName={accountDisplayName}
                onChange={(id, name) => { setForm(p => ({ ...p, instituteAccountId: id })); setAccountDisplayName(name); }}
              />
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">Program Name</Label>
              <Input value={form.programName} onChange={e => f("programName")(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Program Type</Label>
              <Select value={form.programType} onValueChange={v => f("programType")(v)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>{PROGRAM_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Age Group</Label>
              <Select value={form.ageGroup} onValueChange={v => f("ageGroup")(v)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>{AGE_GROUPS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Start Date</Label>
              <Input type="date" value={form.programStartDate} onChange={e => f("programStartDate")(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">End Date</Label>
              <Input type="date" value={form.programEndDate} onChange={e => f("programEndDate")(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Weekly Hours</Label>
              <Input type="number" value={form.weeklyHours} onChange={e => f("weeklyHours")(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Max Class Size</Label>
              <Input type="number" value={form.classSizeMax} onChange={e => f("classSizeMax")(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">Assigned Class</Label>
              <Input value={form.assignedClass} onChange={e => f("assignedClass")(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1 flex items-center gap-2 col-span-2">
              <input type="checkbox" id="levelReq" checked={!!form.levelAssessmentRequired} onChange={e => f("levelAssessmentRequired")(e.target.checked)} />
              <Label htmlFor="levelReq" className="text-xs cursor-pointer">Level Assessment Required</Label>
            </div>
            {form.levelAssessmentRequired && (
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Level Assessment Date</Label>
                <Input type="date" value={form.levelAssessmentDate} onChange={e => f("levelAssessmentDate")(e.target.value)} className="h-8 text-sm" />
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => f("status")(v)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2" />
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">Notes</Label>
              <Textarea value={form.notes} onChange={e => f("notes")(e.target.value)} className="text-sm min-h-[60px]" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-6">
            {record.instituteAccountName && (
              <InfoRow label="School Account" value={record.instituteAccountName} />
            )}
            <InfoRow label="Program Name" value={record.programName} />
            <InfoRow label="Program Type" value={record.programType} />
            <InfoRow label="Age Group" value={record.ageGroup} />
            <InfoRow label="Status" value={<StatusBadge status={record.status} />} />
            <InfoRow label="Start Date" value={fmtDate(record.programStartDate)} />
            <InfoRow label="End Date" value={fmtDate(record.programEndDate)} />
            <InfoRow label="Weekly Hours" value={record.weeklyHours ? `${record.weeklyHours} hrs/week` : null} />
            <InfoRow label="Max Class Size" value={record.classSizeMax} />
            <InfoRow label="Assigned Class" value={record.assignedClass} />
            <InfoRow label="Level Assessment" value={record.levelAssessmentRequired ? "Required" : "Not required"} />
            {record.levelAssessmentRequired && (
              <InfoRow label="Assessment Date" value={fmtDate(record.levelAssessmentDate)} />
            )}
            {record.notes && <InfoRow label="Notes" value={record.notes} />}
          </div>
        )}
      </div>

      {/* Billing card */}
      <div className="rounded-xl border border-[#E8E6E2] bg-white p-4">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="w-4 h-4 text-[#F5821F]" />
          <span className="text-sm font-semibold text-[#1C1917]">Billing</span>
        </div>
        {editing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">Partner Cost (AP)</Label>
              <Input type="number" value={form.partnerCost} onChange={e => f("partnerCost")(e.target.value)} className="h-8 text-sm" placeholder="0.00" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-6">
            <InfoRow label="Partner Cost (AP)" value={fmtMoney(record.partnerCost, currency)} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const TABS = [
  { key: "overview",   label: "Overview"   },
  { key: "documents",  label: "Documents"  },
  { key: "notes",      label: "Notes"      },
] as const;
type TabKey = typeof TABS[number]["key"];

export default function CampInstituteDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const canEdit = ["super_admin", "admin", "camp_coordinator"].includes(user?.role ?? "");

  const { data, isLoading } = useQuery({
    queryKey: ["camp-institute-detail", id],
    queryFn: () => axios.get(`${BASE}/api/camp-services/institutes/${id}`).then(r => r.data),
  });

  const update = useMutation({
    mutationFn: (patch: object) => axios.patch(`${BASE}/api/camp-services/institutes/${id}`, patch).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["camp-institute-detail", id] });
      toast({ title: "Service updated" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to update" }),
  });

  if (isLoading) return <div className="p-6 space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>;
  if (!data) return <div className="p-6 text-[#57534E]">Camp institute service not found.</div>;

  const sc = STATUS_COLORS[data.status] ?? { bg: "#F4F3F1", color: "#57534E" };

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      {/* Header */}
      <div className="bg-white border-b border-[#E8E6E2] px-6 py-4">
        <div className="flex items-center gap-3 mb-3">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-[#57534E]" onClick={() => navigate(`/admin/camp-contracts/${data.contractId}`)}>
            <ArrowLeft className="w-3 h-3" /> Camp Contract
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#FEF0E3] flex items-center justify-center">
            <School className="w-5 h-5 text-[#F5821F]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#1C1917]">{data.programName ?? "Camp Program"}</h1>
            <p className="text-sm text-[#57534E]">{data.contract?.contractNumber ?? "—"} · {data.contract?.studentName ?? "—"}</p>
          </div>
          <span className="ml-auto inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ background: sc.bg, color: sc.color }}>
            {(data.status ?? "pending").replace(/_/g, " ")}
          </span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 -mb-4">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className="px-4 py-2 text-sm font-medium rounded-t-lg transition-colors"
              style={activeTab === t.key
                ? { color: "#F5821F", borderBottom: "2px solid #F5821F", background: "transparent" }
                : { color: "#57534E", borderBottom: "2px solid transparent" }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto p-6">
        {activeTab === "overview" && (
          <OverviewTab record={data} canEdit={canEdit} onSave={(p) => update.mutate(p)} />
        )}
        {activeTab === "documents" && (
          <EntityDocumentsTab entityType="institute_mgt" entityId={id!} mode="full" />
        )}
        {activeTab === "notes" && (
          <NotePanel entityType="camp_institute" entityId={id!} />
        )}
      </div>
    </div>
  );
}
