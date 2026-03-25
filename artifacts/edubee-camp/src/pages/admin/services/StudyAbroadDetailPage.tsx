import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  ArrowLeft, Plus, Pencil, Check, AlertTriangle,
  ChevronRight, FileText, ExternalLink, DollarSign,
} from "lucide-react";
import { ContractPaymentsPanel } from "@/components/finance/ContractPaymentsPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays, parseISO } from "date-fns";
import { NotePanel } from "@/components/shared/NotePanel";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ─── Types ───────────────────────────────────────────────────────────────────
interface TargetSchool {
  schoolName: string;
  status: string;
  appliedDate?: string;
  notes?: string;
}

interface SARecord {
  id: string;
  contractId?: string | null;
  contractNumber?: string | null;
  studentName?: string | null;
  agentName?: string | null;
  assignedStaffId?: string | null;
  staffFirstName?: string | null;
  staffLastName?: string | null;
  applicationStage?: string | null;
  targetSchools?: TargetSchool[] | null;
  coeNumber?: string | null;
  coeExpiryDate?: string | null;
  visaType?: string | null;
  visaApplicationDate?: string | null;
  visaDecisionDate?: string | null;
  visaExpiryDate?: string | null;
  visaGranted?: boolean;
  departureDate?: string | null;
  orientationCompleted?: boolean;
  status?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  contractStatus?: string | null;
  contractStartDate?: string | null;
  contractEndDate?: string | null;
  contractTotalAmount?: string | null;
  contractCurrency?: string | null;
  contractPaidAmount?: string | null;
  contractBalanceAmount?: string | null;
}

// ─── Pipeline stages ─────────────────────────────────────────────────────────
const STAGES: Array<{ key: string; label: string }> = [
  { key: "counseling",       label: "Counseling"       },
  { key: "school_selection", label: "School Selection" },
  { key: "application",      label: "Application"      },
  { key: "coe_issued",       label: "COE Issued"       },
  { key: "visa_applied",     label: "Visa Applied"     },
  { key: "visa_granted",     label: "Visa Granted"     },
  { key: "departed",         label: "Departed"         },
];

const SCHOOL_STATUSES = ["researching", "applied", "offer_received", "accepted", "rejected", "enrolled"];

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  try { return format(parseISO(d), "MMM d, yyyy"); } catch { return d; }
}

function VisaExpiryBadge({ expiryDate }: { expiryDate: string | null | undefined }) {
  if (!expiryDate) return null;
  const days = differenceInDays(parseISO(expiryDate), new Date());
  if (days < 30) {
    return (
      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#FEF2F2] text-[#DC2626]">
        <AlertTriangle size={11} /> Urgent — expires in {days} days
      </span>
    );
  }
  if (days < 90) {
    return (
      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#FEF9C3] text-[#CA8A04]">
        <AlertTriangle size={11} /> Expires in {days} days
      </span>
    );
  }
  return null;
}

// ─── Stage Stepper ────────────────────────────────────────────────────────────
function StageStepper({ current, onSelect }: { current: string; onSelect: (s: string) => void }) {
  const currentIdx = STAGES.findIndex(s => s.key === current);
  return (
    <div className="flex items-center gap-0">
      {STAGES.map((stage, i) => {
        const done   = i < currentIdx;
        const active = i === currentIdx;
        return (
          <div key={stage.key} className="flex items-center">
            <button
              onClick={() => onSelect(stage.key)}
              className={`flex flex-col items-center gap-1.5 px-3 py-2 rounded-lg transition-all min-w-0 hover:bg-stone-50 ${
                active ? "ring-2 ring-[#F5821F] ring-offset-1 bg-[#FEF0E3]" : ""
              }`}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={
                  active ? { background: "#F5821F", color: "#fff" } :
                  done   ? { background: "#DCFCE7", color: "#16A34A" } :
                           { background: "#F4F3F1", color: "#A8A29E" }
                }
              >
                {done ? <Check size={12} /> : i + 1}
              </div>
              <span className={`text-[10px] font-medium text-center leading-tight ${
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

// ─── Add School Modal ─────────────────────────────────────────────────────────
function AddSchoolModal({
  existingSchools,
  onSave,
  onClose,
}: {
  existingSchools: TargetSchool[];
  onSave: (schools: TargetSchool[]) => void;
  onClose: () => void;
}) {
  const [schoolName, setSchoolName] = useState("");
  const [status,     setStatus]     = useState("researching");
  const [appliedDate, setAppliedDate] = useState("");
  const [notes,      setNotes]      = useState("");

  function handleSave() {
    if (!schoolName.trim()) return;
    onSave([...existingSchools, { schoolName: schoolName.trim(), status, appliedDate: appliedDate || undefined, notes: notes || undefined }]);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-4">
        <h3 className="text-base font-bold text-stone-800">Add School</h3>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-stone-600">School Name</Label>
            <Input value={schoolName} onChange={e => setSchoolName(e.target.value)} className="h-9 text-sm" placeholder="e.g. University of Sydney" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-stone-600">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SCHOOL_STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-stone-600">Applied Date</Label>
            <Input type="date" value={appliedDate} onChange={e => setAppliedDate(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-stone-600">Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} className="text-sm min-h-[60px] resize-none" />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <Button onClick={handleSave} className="flex-1 text-white" style={{ background: "#F5821F" }}>Add School</Button>
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab({ record, onStageChange }: { record: SARecord; onStageChange: (s: string) => void }) {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-stone-200 rounded-xl p-5 overflow-x-auto">
        <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide mb-4">Application Progress</h3>
        <StageStepper current={record.applicationStage ?? "counseling"} onSelect={onStageChange} />
      </div>
      <div className="grid grid-cols-2 gap-5">
        <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">Student</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-stone-400">Name</span><span className="font-medium text-stone-800">{record.studentName ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-stone-400">Agent</span><span className="text-stone-600">{record.agentName ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-stone-400">Status</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#F4F3F1] text-[#57534E] capitalize">{record.status ?? "—"}</span>
            </div>
            <div className="flex justify-between"><span className="text-stone-400">Staff</span>
              <span className="text-stone-600">{record.staffFirstName ? `${record.staffFirstName} ${record.staffLastName ?? ""}`.trim() : "—"}</span>
            </div>
            <div className="flex justify-between"><span className="text-stone-400">Departure</span><span className="text-stone-600">{fmtDate(record.departureDate)}</span></div>
            <div className="flex justify-between items-center"><span className="text-stone-400">Orientation</span>
              <span className={`flex items-center gap-1 text-xs font-medium ${record.orientationCompleted ? "text-[#16A34A]" : "text-stone-400"}`}>
                {record.orientationCompleted ? <><Check size={11} /> Done</> : "Pending"}
              </span>
            </div>
          </div>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">Contract</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-stone-400">Contract #</span>
              <span className="font-mono text-xs text-stone-600">{record.contractNumber ?? "—"}</span>
            </div>
            <div className="flex justify-between"><span className="text-stone-400">COE Number</span>
              <span className="font-mono text-xs text-stone-600">{record.coeNumber ?? "—"}</span>
            </div>
            <div className="flex justify-between"><span className="text-stone-400">COE Expiry</span><span className="text-stone-600">{fmtDate(record.coeExpiryDate)}</span></div>
          </div>
        </div>
      </div>
      {record.notes && (
        <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
          <p className="text-xs text-stone-400 mb-1">Notes</p>
          <p className="text-sm text-stone-700">{record.notes}</p>
        </div>
      )}
    </div>
  );
}

// ─── School Applications Tab ──────────────────────────────────────────────────
function SchoolsTab({ record, onUpdate }: { record: SARecord; onUpdate: (schools: TargetSchool[]) => void }) {
  const [showAdd, setShowAdd]         = useState(false);
  const schools: TargetSchool[]       = (record.targetSchools as TargetSchool[] | null) ?? [];
  const [editingIdx, setEditingIdx]   = useState<number | null>(null);
  const [editStatus, setEditStatus]   = useState("");

  const SCHOOL_STATUS_STYLE: Record<string, { bg: string; text: string }> = {
    researching:    { bg: "#F4F3F1", text: "#57534E" },
    applied:        { bg: "#FEF0E3", text: "#F5821F" },
    offer_received: { bg: "#FEF9C3", text: "#CA8A04" },
    accepted:       { bg: "#DCFCE7", text: "#16A34A" },
    rejected:       { bg: "#FEF2F2", text: "#DC2626" },
    enrolled:       { bg: "#F0FDF4", text: "#15803D" },
  };

  function saveStatus(idx: number) {
    const updated = schools.map((s, i) => i === idx ? { ...s, status: editStatus } : s);
    onUpdate(updated);
    setEditingIdx(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-700">Target Schools ({schools.length})</h3>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 text-xs font-medium text-[#F5821F] hover:underline"
        >
          <Plus size={13} /> Add School
        </button>
      </div>
      <div className="rounded-xl border border-stone-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 border-b border-stone-200">
            <tr>
              {["School Name", "Status", "Applied Date", "Actions"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {schools.length === 0 && (
              <tr><td colSpan={4} className="text-center py-10 text-stone-400 text-sm">No schools added yet</td></tr>
            )}
            {schools.map((school, idx) => {
              const badge = SCHOOL_STATUS_STYLE[school.status] ?? SCHOOL_STATUS_STYLE.researching;
              return (
                <tr key={idx} className="hover:bg-stone-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-stone-800">{school.schoolName}</td>
                  <td className="px-4 py-3">
                    {editingIdx === idx ? (
                      <div className="flex items-center gap-2">
                        <Select value={editStatus} onValueChange={setEditStatus}>
                          <SelectTrigger className="h-7 text-xs w-36"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {SCHOOL_STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <button onClick={() => saveStatus(idx)} className="p-1 rounded bg-[#DCFCE7] text-[#16A34A]"><Check size={12} /></button>
                      </div>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium capitalize"
                        style={{ background: badge.bg, color: badge.text }}>
                        {school.status.replace(/_/g, " ")}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-stone-500 text-xs">{fmtDate(school.appliedDate)}</td>
                  <td className="px-4 py-3">
                    {editingIdx !== idx && (
                      <button onClick={() => { setEditingIdx(idx); setEditStatus(school.status); }}
                        className="p-1.5 rounded hover:bg-stone-100 text-stone-400 hover:text-stone-700">
                        <Pencil size={13} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {showAdd && (
        <AddSchoolModal
          existingSchools={schools}
          onSave={onUpdate}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}

// ─── Visa Tab ─────────────────────────────────────────────────────────────────
function VisaTab({ record, onSave }: { record: SARecord; onSave: (patch: Partial<SARecord>) => void }) {
  const [visaType,            setVisaType]            = useState(record.visaType            ?? "");
  const [visaApplicationDate, setVisaApplicationDate] = useState(record.visaApplicationDate ?? "");
  const [visaDecisionDate,    setVisaDecisionDate]    = useState(record.visaDecisionDate    ?? "");
  const [visaExpiryDate,      setVisaExpiryDate]      = useState(record.visaExpiryDate      ?? "");
  const [visaGranted,         setVisaGranted]         = useState(record.visaGranted         ?? false);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">Visa Information</h3>
          {visaExpiryDate && <VisaExpiryBadge expiryDate={visaExpiryDate} />}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-stone-600">Visa Type</Label>
            <Input value={visaType} onChange={e => setVisaType(e.target.value)} className="h-9 text-sm" placeholder="e.g. Student Visa 500" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-stone-600">Application Date</Label>
            <Input type="date" value={visaApplicationDate} onChange={e => setVisaApplicationDate(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-stone-600">Decision Date</Label>
            <Input type="date" value={visaDecisionDate} onChange={e => setVisaDecisionDate(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-stone-600">Expiry Date</Label>
            <Input type="date" value={visaExpiryDate} onChange={e => setVisaExpiryDate(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="col-span-2 flex items-center gap-3 p-3 rounded-lg border border-stone-200">
            <input
              type="checkbox"
              id="visa-granted"
              checked={visaGranted}
              onChange={e => setVisaGranted(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <label htmlFor="visa-granted" className="text-sm font-medium text-stone-700 flex items-center gap-2">
              <Check size={14} className={visaGranted ? "text-[#16A34A]" : "text-stone-300"} />
              Visa Granted
            </label>
            {visaGranted && (
              <span className="ml-auto px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#DCFCE7] text-[#16A34A]">Granted ✓</span>
            )}
          </div>
        </div>
        <Button
          onClick={() => onSave({ visaType, visaApplicationDate, visaDecisionDate, visaExpiryDate, visaGranted })}
          className="text-white" style={{ background: "#F5821F" }}
        >
          Save Visa Details
        </Button>
      </div>

      <div className="bg-stone-50 border border-stone-200 rounded-xl p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-stone-600 uppercase tracking-wide mb-3">
          <FileText size={14} /> Visa Documents
        </div>
        <p className="text-sm text-stone-400">Document upload available via the Documents tab.</p>
      </div>
    </div>
  );
}

// ─── Main Detail Page ─────────────────────────────────────────────────────────
export default function StudyAbroadDetailPage() {
  const [, params] = useRoute("/admin/services/study-abroad/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"overview" | "schools" | "visa" | "docs" | "notes">("overview");

  const id = params?.id;

  const { data: record, isLoading } = useQuery({
    queryKey: ["study-abroad-detail", id],
    queryFn: () => axios.get(`${BASE}/api/services/study-abroad/${id}`).then(r => r.data),
    enabled: !!id,
  });

  const patchMutation = useMutation({
    mutationFn: (patch: object) =>
      axios.patch(`${BASE}/api/services/study-abroad/${id}`, patch).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["study-abroad-detail", id] });
      qc.invalidateQueries({ queryKey: ["study-abroad"] });
      qc.invalidateQueries({ queryKey: ["study-abroad-all"] });
      toast({ title: "Saved successfully" });
    },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-stone-400 text-sm">Loading…</div>
    );
  }
  if (!record) {
    return (
      <div className="p-6 text-stone-500">Record not found.</div>
    );
  }

  const TABS = [
    { key: "overview",  label: "Overview"            },
    { key: "schools",   label: "School Applications" },
    { key: "visa",      label: "Visa"                },
    { key: "payments",  label: "Payments"            },
    { key: "docs",      label: "Documents"           },
    { key: "notes",     label: "Notes"               },
  ] as const;

  return (
    <div className="p-6 space-y-5">
      {/* Back */}
      <button
        onClick={() => navigate("/admin/services/study-abroad")}
        className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors"
      >
        <ArrowLeft size={15} /> Back to Study Abroad
      </button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">{record.studentName ?? "—"}</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            {record.contractNumber ?? ""}{record.agentName ? ` · via ${record.agentName}` : ""}
          </p>
        </div>
        <span className="px-3 py-1 rounded-full text-sm font-medium bg-[#F4F3F1] text-[#57534E] capitalize">
          {record.status ?? "—"}
        </span>
      </div>

      {/* Related Contract + Financial Summary */}
      {record.contractId && (
        <div className="grid grid-cols-2 gap-4">
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
                <span className="text-stone-400">Contract Value</span>
                <span className="font-semibold text-stone-800">
                  {record.contractTotalAmount ? `${record.contractCurrency ?? "AUD"} ${Number(record.contractTotalAmount).toLocaleString("en-AU", { minimumFractionDigits: 2 })}` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-400">Paid</span>
                <span className="text-[#16A34A] font-medium">
                  {record.contractPaidAmount ? `${record.contractCurrency ?? "AUD"} ${Number(record.contractPaidAmount).toLocaleString("en-AU", { minimumFractionDigits: 2 })}` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-400">Balance</span>
                <span className="text-[#DC2626] font-medium">
                  {record.contractBalanceAmount ? `${record.contractCurrency ?? "AUD"} ${Number(record.contractBalanceAmount).toLocaleString("en-AU", { minimumFractionDigits: 2 })}` : "—"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-stone-200">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? "border-[#F5821F] text-[#F5821F]"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {tab === "overview" && (
          <OverviewTab
            record={record}
            onStageChange={stage => patchMutation.mutate({ applicationStage: stage })}
          />
        )}
        {tab === "schools" && (
          <SchoolsTab
            record={record}
            onUpdate={schools => patchMutation.mutate({ targetSchools: schools })}
          />
        )}
        {tab === "visa" && (
          <VisaTab
            record={record}
            onSave={patch => patchMutation.mutate(patch)}
          />
        )}
        {tab === "payments" && (
          <ContractPaymentsPanel
            contractId={record.contractId}
            contractNumber={record.contractNumber}
          />
        )}
        {tab === "docs" && (
          <div className="flex items-center justify-center h-40 text-stone-400 text-sm gap-2">
            <FileText size={20} /> Document management coming soon
          </div>
        )}
        {tab === "notes" && id && (
          <div className="bg-white border border-stone-200 rounded-xl p-5">
            <h3 className="text-sm font-bold text-stone-800 mb-4">Activity Notes</h3>
            <NotePanel
              entityType="study_abroad_mgt"
              entityId={id}
              allowedNoteTypes={["internal"]}
              defaultVisibility="internal"
            />
          </div>
        )}
      </div>
    </div>
  );
}
