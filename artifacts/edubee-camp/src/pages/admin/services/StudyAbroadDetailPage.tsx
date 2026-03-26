import React, { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  ArrowLeft, Plus, Pencil, Check, AlertTriangle,
  ChevronRight, FileText, ExternalLink, DollarSign, X,
  Calendar, Video, MapPin, User, Loader2,
} from "lucide-react";
import { ContractPaymentsPanel } from "@/components/finance/ContractPaymentsPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays, parseISO } from "date-fns";
import { NotePanel } from "@/components/shared/NotePanel";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ─── Interview constants ──────────────────────────────────────────────────────
const INTERVIEW_STATUSES = ["pending", "scheduled", "completed", "cancelled", "rescheduled"];
const INTERVIEW_RESULTS = ["__none", "pass", "fail", "pending"];
const INTERVIEW_FORMATS = ["online", "in_person", "phone"];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  scheduled: "bg-blue-100 text-blue-700",
  completed: "bg-teal-100 text-teal-700",
  cancelled: "bg-gray-100 text-gray-600",
  rescheduled: "bg-orange-100 text-orange-700",
};

const RESULT_COLORS: Record<string, string> = {
  pass: "bg-green-100 text-green-700",
  fail: "bg-red-100 text-red-700",
  pending: "bg-yellow-100 text-yellow-700",
};

const FORMAT_ICONS: Record<string, React.ReactNode> = {
  online: <Video className="w-3.5 h-3.5" />,
  in_person: <MapPin className="w-3.5 h-3.5" />,
  phone: <User className="w-3.5 h-3.5" />,
};

// ─── Interview Dialog ─────────────────────────────────────────────────────────
function InterviewDialog({
  interview,
  studyAbroadId,
  open,
  onClose,
  onSave,
  saving,
}: {
  interview: any | null;
  studyAbroadId: string;
  open: boolean;
  onClose: () => void;
  onSave: (data: Record<string, any>) => void;
  saving: boolean;
}) {
  const isNew = !interview;
  const [form, setForm] = useState({
    scheduledDatetime: interview?.scheduledDatetime
      ? new Date(interview.scheduledDatetime).toISOString().slice(0, 16)
      : "",
    timezone: interview?.timezone ?? "Asia/Seoul",
    format: interview?.format ?? "online",
    meetingLink: interview?.meetingLink ?? "",
    location: interview?.location ?? "",
    status: interview?.status ?? "scheduled",
    result: interview?.result || "__none",
    interviewerNotes: interview?.interviewerNotes ?? "",
    candidateNotes: interview?.candidateNotes ?? "",
  });
  const f = (k: string) => (v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#F5821F]" />
            {isNew ? "Schedule Interview" : "Edit Interview"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">Date & Time *</Label>
              <Input type="datetime-local" value={form.scheduledDatetime} onChange={e => f("scheduledDatetime")(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Timezone</Label>
              <Input value={form.timezone} onChange={e => f("timezone")(e.target.value)} className="h-8 text-sm" placeholder="Asia/Seoul" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Format</Label>
              <Select value={form.format} onValueChange={f("format")}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INTERVIEW_FORMATS.map(fmt => <SelectItem key={fmt} value={fmt}>{fmt.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">Meeting Link</Label>
              <Input value={form.meetingLink} onChange={e => f("meetingLink")(e.target.value)} className="h-8 text-sm" placeholder="https://zoom.us/j/..." />
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">Location (for in-person)</Label>
              <Input value={form.location} onChange={e => f("location")(e.target.value)} className="h-8 text-sm" placeholder="Office address or room" />
            </div>
            {!isNew && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs">Status</Label>
                  <Select value={form.status} onValueChange={f("status")}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {INTERVIEW_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Result</Label>
                  <Select value={form.result} onValueChange={f("result")}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Not set" /></SelectTrigger>
                    <SelectContent>
                      {INTERVIEW_RESULTS.map(r => <SelectItem key={r} value={r}>{r === "__none" ? "Not set" : r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">Candidate Notes</Label>
              <Textarea value={form.candidateNotes} onChange={e => f("candidateNotes")(e.target.value)} className="text-sm min-h-[60px]" />
            </div>
            {!isNew && (
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Interviewer Notes</Label>
                <Textarea value={form.interviewerNotes} onChange={e => f("interviewerNotes")(e.target.value)} className="text-sm min-h-[60px]" />
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t mt-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" className="bg-[#F5821F] hover:bg-[#d97706] text-white gap-1.5"
            onClick={() => onSave({ ...form, studyAbroadId })}
            disabled={saving || !form.scheduledDatetime}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            {isNew ? "Schedule" : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
  clientName?: string | null;
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

// ─── Edit SA Details Modal ────────────────────────────────────────────────────
function EditSADetailsModal({
  record,
  onSave,
  onClose,
}: {
  record: SARecord;
  onSave: (patch: object) => void;
  onClose: () => void;
}) {
  const [status,               setStatus]               = useState(record.status ?? "active");
  const [coeNumber,            setCoeNumber]            = useState(record.coeNumber ?? "");
  const [coeExpiryDate,        setCoeExpiryDate]        = useState(record.coeExpiryDate ?? "");
  const [departureDate,        setDepartureDate]        = useState(record.departureDate ?? "");
  const [orientationCompleted, setOrientationCompleted] = useState(record.orientationCompleted ?? false);
  const [notes,                setNotes]                = useState(record.notes ?? "");
  const [assignedStaffId,      setAssignedStaffId]      = useState(record.assignedStaffId ?? "");

  const { data: usersData } = useQuery({
    queryKey: ["users-list"],
    queryFn:  () => axios.get(`${BASE}/api/users`).then(r => r.data),
  });
  const usersList: { id: string; fullName?: string | null }[] = usersData?.data ?? usersData ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-stone-800">Edit Record Details</h3>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-stone-100 text-stone-500"><X size={16} /></button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-stone-600">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["active", "completed", "cancelled", "on_hold"].map(s => (
                  <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-stone-600">Assigned Staff</Label>
            <Select value={assignedStaffId || "_none"} onValueChange={v => setAssignedStaffId(v === "_none" ? "" : v)}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select staff" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">— Unassigned —</SelectItem>
                {usersList.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.fullName ?? u.id}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-stone-600">COE Number</Label>
            <Input value={coeNumber} onChange={e => setCoeNumber(e.target.value)} className="h-9 text-sm font-mono" placeholder="e.g. COE2024XXXXX" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-stone-600">COE Expiry Date</Label>
            <Input type="date" value={coeExpiryDate} onChange={e => setCoeExpiryDate(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-stone-600">Departure Date</Label>
            <Input type="date" value={departureDate} onChange={e => setDepartureDate(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="col-span-2 flex items-center gap-3 p-3 rounded-lg border border-stone-200 bg-stone-50">
            <input
              type="checkbox" id="sa-orientation"
              checked={orientationCompleted}
              onChange={e => setOrientationCompleted(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <label htmlFor="sa-orientation" className="text-sm font-medium text-stone-700">Orientation Completed</label>
            {orientationCompleted && <span className="ml-auto text-xs font-semibold text-[#16A34A]">Done ✓</span>}
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label className="text-xs text-stone-600">Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} className="text-sm min-h-[80px] resize-none" placeholder="Internal notes…" />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <Button
            onClick={() => {
              onSave({ status, coeNumber: coeNumber || null, coeExpiryDate: coeExpiryDate || null, departureDate: departureDate || null, orientationCompleted, notes: notes || null, assignedStaffId: assignedStaffId || null });
              onClose();
            }}
            className="flex-1 text-white" style={{ background: "#F5821F" }}
          >
            Save Changes
          </Button>
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab({ record, onStageChange, onEdit }: { record: SARecord; onStageChange: (s: string) => void; onEdit: () => void }) {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-stone-200 rounded-xl p-5 overflow-x-auto">
        <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide mb-4">Application Progress</h3>
        <StageStepper current={record.applicationStage ?? "counseling"} onSelect={onStageChange} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">Client</h3>
            <button onClick={onEdit} className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-700 transition-colors">
              <Pencil size={12} /> Edit
            </button>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-stone-400">Name</span><span className="font-medium text-stone-800">{record.clientName ?? record.studentName ?? "—"}</span></div>
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
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">Contract & COE</h3>
            <button onClick={onEdit} className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-700 transition-colors">
              <Pencil size={12} /> Edit
            </button>
          </div>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
  const [tab, setTab] = useState<"overview" | "schools" | "visa" | "payments" | "docs" | "notes" | "interview">("overview");
  const [showEdit, setShowEdit] = useState(false);
  const [editInterview, setEditInterview] = useState<any | null>(null);
  const [newInterview, setNewInterview] = useState(false);

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

  const { data: interviewData, isLoading: interviewLoading } = useQuery({
    queryKey: ["sa-interviews", id],
    queryFn: () => axios.get(`${BASE}/api/interview-schedules?studyAbroadId=${id}`).then(r => r.data),
    enabled: tab === "interview" && !!id,
  });

  const interviews: any[] = interviewData?.data ?? [];

  const updateInterview = useMutation({
    mutationFn: ({ iid, data }: { iid: string; data: Record<string, any> }) =>
      axios.patch(`${BASE}/api/interview-schedules/${iid}`, {
        ...data,
        scheduledDatetime: data.scheduledDatetime ? new Date(data.scheduledDatetime).toISOString() : undefined,
      }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sa-interviews", id] });
      toast({ title: "Interview updated" });
      setEditInterview(null);
    },
    onError: () => toast({ variant: "destructive", title: "Failed to update interview" }),
  });

  const createInterview = useMutation({
    mutationFn: (data: Record<string, any>) =>
      axios.post(`${BASE}/api/interview-schedules`, {
        ...data,
        scheduledDatetime: data.scheduledDatetime ? new Date(data.scheduledDatetime).toISOString() : undefined,
      }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sa-interviews", id] });
      toast({ title: "Interview scheduled" });
      setNewInterview(false);
    },
    onError: () => toast({ variant: "destructive", title: "Failed to schedule interview" }),
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
    { key: "overview",   label: "Overview"            },
    { key: "schools",    label: "School Applications" },
    { key: "interview",  label: "Interview"           },
    { key: "visa",       label: "Visa"                },
    { key: "payments",   label: "Payments"            },
    { key: "docs",       label: "Documents"           },
    { key: "notes",      label: "Notes"               },
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
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">{record.clientName ?? record.studentName ?? "—"}</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            {record.contractNumber ?? ""}{record.agentName ? ` · via ${record.agentName}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-[#F4F3F1] text-[#57534E] capitalize">
            {record.status ?? "—"}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowEdit(true)}
            className="flex items-center gap-1.5 h-8 text-sm border-stone-300"
          >
            <Pencil size={13} /> Edit Details
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
      <div className="flex gap-1 border-b border-stone-200 overflow-x-auto">
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
            onEdit={() => setShowEdit(true)}
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
        {tab === "interview" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button size="sm" className="bg-[#F5821F] hover:bg-[#d97706] text-white gap-1.5" onClick={() => setNewInterview(true)}>
                <Plus size={14} /> Schedule Interview
              </Button>
            </div>

            {interviewLoading ? (
              <div className="space-y-3">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
            ) : interviews.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-stone-400">
                <Calendar className="w-8 h-8 mb-3 opacity-20" />
                <p className="text-sm">No interview schedules yet.</p>
                <p className="text-xs mt-1">Click "Schedule Interview" to add one.</p>
              </div>
            ) : interviews.map((iv: any) => (
              <div key={iv.id} className="rounded-xl border border-stone-200 bg-white p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-stone-800">
                      <Calendar className="w-3.5 h-3.5 text-[#F5821F]" />
                      {iv.scheduledDatetime
                        ? format(new Date(iv.scheduledDatetime), "PPP · HH:mm")
                        : "Date TBD"}
                    </div>
                    {iv.timezone && (
                      <span className="text-[10px] text-stone-400 bg-stone-100 rounded px-1.5 py-0.5">{iv.timezone}</span>
                    )}
                    {iv.status && (
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[iv.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {iv.status}
                      </span>
                    )}
                    {iv.result && iv.result !== "__none" && (
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${RESULT_COLORS[iv.result] ?? "bg-gray-100 text-gray-600"}`}>
                        Result: {iv.result}
                      </span>
                    )}
                  </div>
                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1 shrink-0" onClick={() => setEditInterview(iv)}>
                    <Pencil size={11} /> Edit
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  {iv.format && (
                    <div className="flex items-center gap-1.5 text-stone-500">
                      {FORMAT_ICONS[iv.format] ?? null}
                      <span className="capitalize">{iv.format.replace(/_/g, " ")}</span>
                    </div>
                  )}
                  {iv.meetingLink && (
                    <a href={iv.meetingLink} target="_blank" rel="noopener noreferrer"
                      className="text-[#F5821F] hover:underline text-xs truncate flex items-center gap-1">
                      <Video className="w-3 h-3 shrink-0" />
                      {iv.meetingLink}
                    </a>
                  )}
                  {iv.location && (
                    <div className="flex items-center gap-1.5 text-stone-500 text-xs">
                      <MapPin className="w-3 h-3" /> {iv.location}
                    </div>
                  )}
                </div>

                {(iv.candidateNotes || iv.interviewerNotes) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-stone-100">
                    {iv.candidateNotes && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 mb-1">Candidate Notes</p>
                        <p className="text-xs text-stone-700">{iv.candidateNotes}</p>
                      </div>
                    )}
                    {iv.interviewerNotes && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 mb-1">Interviewer Notes</p>
                        <p className="text-xs text-stone-700">{iv.interviewerNotes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
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

      {showEdit && (
        <EditSADetailsModal
          record={record}
          onSave={patch => patchMutation.mutate(patch)}
          onClose={() => setShowEdit(false)}
        />
      )}

      {editInterview && (
        <InterviewDialog
          interview={editInterview}
          studyAbroadId={id!}
          open={!!editInterview}
          onClose={() => setEditInterview(null)}
          onSave={(data) => updateInterview.mutate({ iid: editInterview.id, data: { ...data, result: data.result === "__none" ? "" : data.result } })}
          saving={updateInterview.isPending}
        />
      )}

      <InterviewDialog
        interview={null}
        studyAbroadId={id!}
        open={newInterview}
        onClose={() => setNewInterview(false)}
        onSave={(data) => createInterview.mutate(data)}
        saving={createInterview.isPending}
      />
    </div>
  );
}
