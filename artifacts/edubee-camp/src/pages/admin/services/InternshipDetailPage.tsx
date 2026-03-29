import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SystemInfoSection } from "@/components/shared/SystemInfoSection";
import axios from "axios";
import { ArrowLeft, Check, FileText, Briefcase, User, ChevronRight, Building2, ExternalLink, DollarSign, X, Plus, RotateCcw, Save, Pencil } from "lucide-react";
import { ContractPaymentsPanel } from "@/components/finance/ContractPaymentsPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { NotePanel } from "@/components/shared/NotePanel";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface InternshipDetail {
  id: string;
  contractId?: string | null;
  contractNumber?: string | null;
  clientName?: string | null;
  studentName?: string | null;
  agentName?: string | null;
  staffFirstName?: string | null;
  staffLastName?: string | null;
  englishLevel?: string | null;
  workExperience?: Array<{ role: string; company?: string; duration?: string; description?: string }> | null;
  preferredIndustry?: string[] | string | null;
  availableHoursPerWeek?: number | null;
  hostCompanyId?: string | null;
  positionTitle?: string | null;
  employmentType?: string | null;
  hourlyRate?: string | null;
  resumePrepared?: boolean;
  coverLetterPrepared?: boolean;
  interviewDate?: string | null;
  interviewResult?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  placementFeeType?: string | null;
  referenceLetterIssued?: boolean;
  status?: string | null;
  notes?: string | null;
  contractStatus?: string | null;
  contractStartDate?: string | null;
  contractEndDate?: string | null;
  contractTotalAmount?: string | null;
  contractCurrency?: string | null;
  contractPaidAmount?: string | null;
  contractBalanceAmount?: string | null;
}

const STAGES = [
  { key: "profile_review",    label: "Profile Review"    },
  { key: "company_matching",  label: "Company Matching"  },
  { key: "interview",         label: "Interview"         },
  { key: "confirmed",         label: "Confirmed"         },
  { key: "working",           label: "Working"           },
  { key: "completed",         label: "Completed"         },
];

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  try { return format(parseISO(d), "MMM d, yyyy"); } catch { return d; }
}

function StageStepper({ current, onSelect }: { current: string; onSelect: (s: string) => void }) {
  const idx = STAGES.findIndex(s => s.key === current);
  return (
    <div className="flex items-center gap-0 overflow-x-auto">
      {STAGES.map((stage, i) => {
        const done   = i < idx;
        const active = i === idx;
        return (
          <div key={stage.key} className="flex items-center">
            <button
              onClick={() => onSelect(stage.key)}
              className={`flex flex-col items-center gap-1.5 px-3 py-2 rounded-lg transition-all hover:bg-stone-50 shrink-0 ${
                active ? "ring-2 ring-[#F5821F] ring-offset-1 bg-[#FEF0E3]" : ""
              }`}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={
                  active ? { background: "#F5821F", color: "#fff" } :
                  done   ? { background: "#DCFCE7", color: "#16A34A" } :
                           { background: "#F4F3F1", color: "#A8A29E" }
                }
              >
                {done ? <Check size={12} /> : i + 1}
              </div>
              <span className={`text-[10px] font-medium text-center leading-tight whitespace-nowrap ${
                active ? "text-[#F5821F]" : done ? "text-[#16A34A]" : "text-stone-400"
              }`}>
                {stage.label}
              </span>
            </button>
            {i < STAGES.length - 1 && (
              <ChevronRight size={13} className={`mx-0.5 shrink-0 ${done ? "text-[#16A34A]" : "text-stone-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Toggle Row ───────────────────────────────────────────────────────────────
function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-stone-200 bg-white">
      <div className="flex items-center gap-2">
        <div
          className="w-5 h-5 rounded flex items-center justify-center cursor-pointer transition-colors"
          style={{ background: checked ? "#F5821F" : "#F4F3F1", border: `2px solid ${checked ? "#F5821F" : "#E7E5E4"}` }}
          onClick={() => onChange(!checked)}
        >
          {checked && <Check size={11} className="text-white" />}
        </div>
        <span className="text-sm font-medium text-stone-700">{label}</span>
      </div>
      <span className={`text-xs font-semibold ${checked ? "text-[#16A34A]" : "text-stone-400"}`}>
        {checked ? "Done ✓" : "Pending"}
      </span>
    </div>
  );
}

// ─── Student Profile Tab ──────────────────────────────────────────────────────
function StudentProfileTab({ record, onSave }: { record: InternshipDetail; onSave: (p: object) => void }) {
  const [, navigate] = useLocation();
  const [isDirty, setIsDirty] = useState(false);

  const initIndustries = Array.isArray(record.preferredIndustry)
    ? record.preferredIndustry.join(", ")
    : record.preferredIndustry ?? "";

  const [englishLevel,         setEnglishLevel]         = useState(record.englishLevel ?? "");
  const [availableHours,       setAvailableHours]       = useState(String(record.availableHoursPerWeek ?? ""));
  const [preferredIndustryStr, setPreferredIndustryStr] = useState(initIndustries);
  const [newExpRole,     setNewExpRole]     = useState("");
  const [newExpCompany,  setNewExpCompany]  = useState("");
  const [newExpDuration, setNewExpDuration] = useState("");
  const [newExpDesc,     setNewExpDesc]     = useState("");
  const [showAddExp,     setShowAddExp]     = useState(false);

  const mark = () => setIsDirty(true);

  const workExp = Array.isArray(record.workExperience) ? record.workExperience : [];

  function handleSaveProfile() {
    const industries = preferredIndustryStr
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);
    onSave({
      englishLevel:          englishLevel || null,
      availableHoursPerWeek: availableHours ? Number(availableHours) : null,
      preferredIndustry:     industries.length > 0 ? industries : null,
    });
    setIsDirty(false);
  }

  const discard = () => {
    setEnglishLevel(record.englishLevel ?? "");
    setAvailableHours(String(record.availableHoursPerWeek ?? ""));
    setPreferredIndustryStr(initIndustries);
    setIsDirty(false);
  };

  function handleAddExp() {
    if (!newExpRole.trim()) return;
    const newEntry = { role: newExpRole.trim(), company: newExpCompany.trim() || undefined, duration: newExpDuration.trim() || undefined, description: newExpDesc.trim() || undefined };
    onSave({ workExperience: [...workExp, newEntry] });
    setNewExpRole(""); setNewExpCompany(""); setNewExpDuration(""); setNewExpDesc("");
    setShowAddExp(false);
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide flex items-center gap-1.5">
              <User size={13} /> Client Info
            </h3>
            {isDirty && (
              <div className="flex items-center gap-2">
                <button onClick={discard}
                  className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-700 border border-stone-200 rounded-md px-2 py-0.5 transition-colors">
                  <RotateCcw size={10} /> Discard
                </button>
                <button onClick={handleSaveProfile}
                  className="flex items-center gap-1 text-xs text-white rounded-md px-2 py-0.5 font-semibold"
                  style={{ background: "#F5821F" }}>
                  <Save size={10} /> Save
                </button>
              </div>
            )}
          </div>
          {isDirty && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700 flex items-center gap-1.5">
              <span className="text-amber-500">●</span> Unsaved changes
            </div>
          )}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-stone-400">Name</span><span className="font-medium text-stone-800">{record.clientName ?? record.studentName ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-stone-400">Agent</span><span className="text-stone-600">{record.agentName ?? "—"}</span></div>
            <div className="flex justify-between items-center"><span className="text-stone-400">Contract #</span>
              {record.contractId ? (
                <button onClick={() => navigate(`/admin/crm/contracts/${record.contractId}`)}
                  className="font-mono text-xs text-[#F5821F] hover:underline flex items-center gap-1">
                  {record.contractNumber ?? "View"} <ExternalLink size={10} />
                </button>
              ) : <span className="font-mono text-xs text-stone-500">{record.contractNumber ?? "—"}</span>}
            </div>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-stone-600">English Level</Label>
              <Select value={englishLevel || "_none"} onValueChange={v => { setEnglishLevel(v === "_none" ? "" : v); mark(); }}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— Not set —</SelectItem>
                  {["beginner", "elementary", "intermediate", "upper_intermediate", "advanced", "native"].map(l => (
                    <SelectItem key={l} value={l} className="capitalize">{l.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-stone-600">Available Hours / Week</Label>
              <Input type="number" value={availableHours} onChange={e => { setAvailableHours(e.target.value); mark(); }} className="h-9 text-sm" placeholder="e.g. 20" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-3">
          <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Preferred Industry</h3>
          <div className="space-y-1.5">
            <Label className="text-xs text-stone-600">Industries (comma-separated)</Label>
            <Input value={preferredIndustryStr} onChange={e => { setPreferredIndustryStr(e.target.value); mark(); }} className="h-9 text-sm" placeholder="e.g. IT, Finance, Marketing" />
          </div>
        </div>
      </div>

      {/* Work Experience */}
      <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide flex items-center gap-1.5">
            <Briefcase size={13} /> Work Experience
          </h3>
          <button
            onClick={() => setShowAddExp(v => !v)}
            className="flex items-center gap-1.5 text-xs font-medium text-[#F5821F] hover:underline"
          >
            <Plus size={13} /> Add Experience
          </button>
        </div>
        {showAddExp && (
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-semibold text-stone-600 uppercase tracking-wide">New Work Experience</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-stone-600">Role / Title *</Label>
                <Input value={newExpRole} onChange={e => setNewExpRole(e.target.value)} className="h-9 text-sm" placeholder="e.g. Marketing Assistant" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-stone-600">Company</Label>
                <Input value={newExpCompany} onChange={e => setNewExpCompany(e.target.value)} className="h-9 text-sm" placeholder="Company name" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-stone-600">Duration</Label>
                <Input value={newExpDuration} onChange={e => setNewExpDuration(e.target.value)} className="h-9 text-sm" placeholder="e.g. Jan 2022 – Dec 2023" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-stone-600">Description</Label>
                <Input value={newExpDesc} onChange={e => setNewExpDesc(e.target.value)} className="h-9 text-sm" placeholder="Brief description" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddExp} disabled={!newExpRole.trim()} className="text-white text-xs h-8" style={{ background: "#F5821F" }}>Add</Button>
              <Button variant="outline" onClick={() => setShowAddExp(false)} className="text-xs h-8">Cancel</Button>
            </div>
          </div>
        )}
        {workExp.length === 0 ? (
          <p className="text-sm text-stone-400">No work experience recorded</p>
        ) : (
          <div className="space-y-3">
            {workExp.map((exp, i) => (
              <div key={i} className="p-3 rounded-lg bg-stone-50 border border-stone-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm text-stone-800">{exp.role}</span>
                  {exp.duration && <span className="text-xs text-stone-400">{exp.duration}</span>}
                </div>
                {exp.company && <p className="text-xs text-stone-500 mb-1">{exp.company}</p>}
                {exp.description && <p className="text-sm text-stone-600">{exp.description}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Company Match Tab ────────────────────────────────────────────────────────
function CompanyMatchTab({ record, onSave }: { record: InternshipDetail; onSave: (p: object) => void }) {
  const [isDirty,         setIsDirty]         = useState(false);
  const [positionTitle,   setPositionTitle]   = useState(record.positionTitle   ?? "");
  const [employmentType,  setEmploymentType]  = useState(record.employmentType  ?? "");
  const [hourlyRate,      setHourlyRate]      = useState(record.hourlyRate      ?? "");
  const [placementFeeType, setPlacementFeeType] = useState(record.placementFeeType ?? "");
  const [startDate,       setStartDate]       = useState(record.startDate       ?? "");
  const [endDate,         setEndDate]         = useState(record.endDate         ?? "");
  const [notes,           setNotes]           = useState(record.notes           ?? "");

  const mark = () => setIsDirty(true);
  const discard = () => {
    setPositionTitle(record.positionTitle ?? "");
    setEmploymentType(record.employmentType ?? "");
    setHourlyRate(record.hourlyRate ?? "");
    setPlacementFeeType(record.placementFeeType ?? "");
    setStartDate(record.startDate ?? "");
    setEndDate(record.endDate ?? "");
    setNotes(record.notes ?? "");
    setIsDirty(false);
  };

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Company & Placement Details</h3>
        {isDirty && (
          <div className="flex items-center gap-2">
            <button onClick={discard}
              className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-700 border border-stone-200 rounded-md px-2.5 py-1 transition-colors">
              <RotateCcw size={11} /> Discard
            </button>
            <button onClick={() => { onSave({ positionTitle, employmentType, hourlyRate: hourlyRate || null, placementFeeType, startDate: startDate || null, endDate: endDate || null, notes }); setIsDirty(false); }}
              className="flex items-center gap-1 text-xs text-white rounded-md px-2.5 py-1 font-semibold"
              style={{ background: "#F5821F" }}>
              <Save size={11} /> Save Changes
            </button>
          </div>
        )}
      </div>
      {isDirty && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700 flex items-center gap-1.5">
          <span className="text-amber-500">●</span>
          Unsaved changes — click <strong className="mx-0.5">Save Changes</strong> to apply.
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-stone-600">Position Title</Label>
          <Input value={positionTitle} onChange={e => { setPositionTitle(e.target.value); mark(); }} className="h-9 text-sm" placeholder="e.g. Marketing Assistant" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-stone-600">Employment Type</Label>
          <Select value={employmentType} onValueChange={v => { setEmploymentType(v); mark(); }}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              {["full_time", "part_time", "casual", "volunteer"].map(t => (
                <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-stone-600">Hourly Rate ($)</Label>
          <Input type="number" value={hourlyRate} onChange={e => { setHourlyRate(e.target.value); mark(); }} className="h-9 text-sm" placeholder="0.00" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-stone-600">Placement Fee Type</Label>
          <Input value={placementFeeType} onChange={e => { setPlacementFeeType(e.target.value); mark(); }} className="h-9 text-sm" placeholder="e.g. flat_fee" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-stone-600">Start Date</Label>
          <Input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); mark(); }} className="h-9 text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-stone-600">End Date</Label>
          <Input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); mark(); }} className="h-9 text-sm" />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label className="text-xs text-stone-600">Notes</Label>
          <Textarea value={notes} onChange={e => { setNotes(e.target.value); mark(); }} className="text-sm min-h-[60px] resize-none" />
        </div>
      </div>
    </div>
  );
}

// ─── Progress Tab ─────────────────────────────────────────────────────────────
function ProgressTab({ record, onSave }: { record: InternshipDetail; onSave: (p: object) => void }) {
  const [isDirty,               setIsDirty]               = useState(false);
  const [resumePrepared,        setResumePrepared]        = useState(record.resumePrepared        ?? false);
  const [coverLetterPrepared,   setCoverLetterPrepared]   = useState(record.coverLetterPrepared   ?? false);
  const [referenceLetterIssued, setReferenceLetterIssued] = useState(record.referenceLetterIssued ?? false);
  const [interviewDate,         setInterviewDate]         = useState(
    record.interviewDate ? format(parseISO(record.interviewDate), "yyyy-MM-dd") : ""
  );
  const [interviewResult,       setInterviewResult]       = useState(record.interviewResult ?? "");

  const mark = () => setIsDirty(true);
  const discard = () => {
    setResumePrepared(record.resumePrepared ?? false);
    setCoverLetterPrepared(record.coverLetterPrepared ?? false);
    setReferenceLetterIssued(record.referenceLetterIssued ?? false);
    setInterviewDate(record.interviewDate ? format(parseISO(record.interviewDate), "yyyy-MM-dd") : "");
    setInterviewResult(record.interviewResult ?? "");
    setIsDirty(false);
  };

  return (
    <div className="space-y-5">
      <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-3">
        <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Document Readiness</h3>
        <div className="space-y-2">
          <ToggleRow label="Resume Prepared"        checked={resumePrepared}        onChange={v => { setResumePrepared(v); mark(); }} />
          <ToggleRow label="Cover Letter Prepared"  checked={coverLetterPrepared}   onChange={v => { setCoverLetterPrepared(v); mark(); }} />
          <ToggleRow label="Reference Letter Issued" checked={referenceLetterIssued} onChange={v => { setReferenceLetterIssued(v); mark(); }} />
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Interview</h3>
          {isDirty && (
            <div className="flex items-center gap-2">
              <button onClick={discard}
                className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-700 border border-stone-200 rounded-md px-2.5 py-1 transition-colors">
                <RotateCcw size={11} /> Discard
              </button>
              <button onClick={() => { onSave({ resumePrepared, coverLetterPrepared, referenceLetterIssued, interviewDate: interviewDate || null, interviewResult: interviewResult || null }); setIsDirty(false); }}
                className="flex items-center gap-1 text-xs text-white rounded-md px-2.5 py-1 font-semibold"
                style={{ background: "#F5821F" }}>
                <Save size={11} /> Save Changes
              </button>
            </div>
          )}
        </div>
        {isDirty && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700 flex items-center gap-1.5">
            <span className="text-amber-500">●</span>
            Unsaved changes — click <strong className="mx-0.5">Save Changes</strong> to apply.
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-stone-600">Interview Date</Label>
            <Input type="date" value={interviewDate} onChange={e => { setInterviewDate(e.target.value); mark(); }} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-stone-600">Interview Result</Label>
            <Select value={interviewResult} onValueChange={v => { setInterviewResult(v); mark(); }}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                {["pending", "passed", "failed", "rescheduled"].map(r => (
                  <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Detail Page ─────────────────────────────────────────────────────────
export default function InternshipDetailPage() {
  const [, params]   = useRoute("/admin/services/internship/:id");
  const [, navigate] = useLocation();
  const { toast }    = useToast();
  const qc           = useQueryClient();
  const [tab, setTab] = useState<"profile" | "company" | "progress" | "docs" | "notes" | "payments">("profile");

  const id = params?.id;

  const { data: record, isLoading } = useQuery({
    queryKey: ["internship-detail", id],
    queryFn: () => axios.get(`${BASE}/api/services/internship/${id}`).then(r => r.data),
    enabled: !!id,
  });

  const patchMutation = useMutation({
    mutationFn: (patch: object) =>
      axios.patch(`${BASE}/api/services/internship/${id}`, patch).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["internship-detail", id] });
      qc.invalidateQueries({ queryKey: ["internship"] });
      qc.invalidateQueries({ queryKey: ["internship-all"] });
      toast({ title: "Saved successfully" });
    },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: () =>
      axios.patch(`${BASE}/api/services/internship/${id}/toggle-active`).then(r => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["internship-detail", id] });
      qc.invalidateQueries({ queryKey: ["internship"] });
      toast({ title: data.isActive ? "Record activated" : "Record deactivated" });
    },
    onError: () => toast({ title: "Failed to toggle status", variant: "destructive" }),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64 text-stone-400 text-sm">Loading…</div>;
  if (!record)  return <div className="p-6 text-stone-500">Record not found.</div>;

  const TABS = [
    { key: "profile",   label: "Client Profile"  },
    { key: "company",   label: "Host Company"      },
    { key: "progress",  label: "Progress"          },
    { key: "payments",  label: "Payments"          },
    { key: "docs",      label: "Documents"         },
    { key: "notes",     label: "Notes"             },
  ] as const;

  const currentStage = record.status ?? "profile_review";
  const badgeMap: Record<string, { bg: string; text: string }> = {
    profile_review:   { bg: "#F4F3F1", text: "#57534E" },
    company_matching: { bg: "#FEF0E3", text: "#F5821F" },
    interview:        { bg: "#FEF9C3", text: "#CA8A04" },
    confirmed:        { bg: "#DCFCE7", text: "#16A34A" },
    working:          { bg: "#F0FDF4", text: "#15803D" },
    completed:        { bg: "#F4F3F1", text: "#57534E" },
  };
  const badge = badgeMap[currentStage] ?? badgeMap.profile_review;

  return (
    <div className="p-6 space-y-5">
      <button onClick={() => navigate("/admin/services/internship")}
        className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors">
        <ArrowLeft size={15} /> Back to Internship
      </button>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">{record.clientName ?? record.studentName ?? "—"}</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            {record.positionTitle ?? "No position assigned"}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="px-3 py-1 rounded-full text-sm font-medium capitalize"
            style={{ background: badge.bg, color: badge.text }}>
            {STAGES.find(s => s.key === currentStage)?.label ?? currentStage}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTab("profile")}
            className="flex items-center gap-1.5 h-8 text-sm border-stone-300"
          >
            <Pencil size={13} /> Edit Profile
          </Button>
        </div>
      </div>

      {/* Related Contract + Financial Summary */}
      {record.contractId && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <FileText size={14} style={{ color: "#F5821F" }} />
              <h3 className="text-xs font-bold uppercase tracking-wide text-stone-500">Related Contract</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-stone-400">Contract #</span>
                <button
                  onClick={() => navigate(`/admin/crm/contracts/${record.contractId}`)}
                  className="flex items-center gap-1 font-mono text-xs text-[#F5821F] hover:underline font-semibold"
                >
                  {record.contractNumber ?? "View"} <ExternalLink size={10} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-400">Status</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize"
                  style={{ background: "#F4F3F1", color: "#57534E" }}>
                  {record.contractStatus ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-400">Period</span>
                <span className="text-stone-600 text-xs">{fmtDate(record.contractStartDate)} → {fmtDate(record.contractEndDate)}</span>
              </div>
            </div>
          </div>
          <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <DollarSign size={14} style={{ color: "#F5821F" }} />
              <h3 className="text-xs font-bold uppercase tracking-wide text-stone-500">Financial Summary</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-stone-400">Hourly Rate</span>
                <span className="font-semibold text-stone-800">
                  {record.hourlyRate ? `$${Number(record.hourlyRate).toLocaleString("en-AU", { minimumFractionDigits: 2 })}/hr` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-400">Contract Value</span>
                <span className="font-semibold text-stone-800">
                  {record.contractTotalAmount ? `${record.contractCurrency ?? "AUD"} ${Number(record.contractTotalAmount).toLocaleString("en-AU", { minimumFractionDigits: 2 })}` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-400">Paid / Balance</span>
                <span className="text-xs">
                  <span className="text-[#16A34A] font-medium">{record.contractPaidAmount ? `$${Number(record.contractPaidAmount).toLocaleString("en-AU", { minimumFractionDigits: 2 })}` : "—"}</span>
                  <span className="text-stone-300 mx-1">/</span>
                  <span className="text-[#DC2626] font-medium">{record.contractBalanceAmount ? `$${Number(record.contractBalanceAmount).toLocaleString("en-AU", { minimumFractionDigits: 2 })}` : "—"}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stage stepper */}
      <div className="bg-white border border-stone-200 rounded-xl p-4 overflow-x-auto">
        <StageStepper current={currentStage} onSelect={s => patchMutation.mutate({ status: s })} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-stone-200 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? "border-[#F5821F] text-[#F5821F]" : "border-transparent text-stone-500 hover:text-stone-800"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "profile"   && <StudentProfileTab record={record} onSave={p => patchMutation.mutate(p)} />}
      {tab === "company"   && <CompanyMatchTab  record={record} onSave={p => patchMutation.mutate(p)} />}
      {tab === "progress"  && <ProgressTab      record={record} onSave={p => patchMutation.mutate(p)} />}
      {tab === "payments"  && (
        <ContractPaymentsPanel
          contractId={record.contractId}
          contractNumber={record.contractNumber}
        />
      )}
      {tab === "docs"     && (
        <div className="flex items-center justify-center h-40 text-stone-400 text-sm gap-2">
          <FileText size={20} /> Document management coming soon
        </div>
      )}
      {tab === "notes" && id && (
        <div className="bg-white border border-stone-200 rounded-xl p-5">
          <h3 className="text-sm font-bold text-stone-800 mb-4">Activity Notes</h3>
          <NotePanel
            entityType="internship_mgt"
            entityId={id}
            allowedNoteTypes={["internal"]}
            defaultVisibility="internal"
          />
        </div>
      )}
      <SystemInfoSection
        id={record.id}
        recordIdLabel="Internship ID"
        createdAt={record.createdAt}
        updatedAt={record.updatedAt}
        isActive={record.isActive ?? true}
        onToggleActive={() => toggleActiveMutation.mutate()}
        isToggling={toggleActiveMutation.isPending}
        ownerName={record.staffFirstName ?? null}
        ownerLabel="Assigned Staff"
      />
    </div>
  );
}
