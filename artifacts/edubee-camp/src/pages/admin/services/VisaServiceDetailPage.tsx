import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SystemInfoSection } from "@/components/shared/SystemInfoSection";
import axios from "axios";
import {
  ArrowLeft, FileText, DollarSign, ExternalLink, Stamp, Plus, RotateCcw, Save, Pencil,
} from "lucide-react";
import { ContractPaymentsPanel } from "@/components/finance/ContractPaymentsPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import EntityDocumentsTab from "@/components/shared/EntityDocumentsTab";
import { NotePanel } from "@/components/shared/NotePanel";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const STATUSES = ["pending", "applied", "in_review", "approved", "rejected", "expired", "cancelled"] as const;
const STATUS_LABEL: Record<string, string> = {
  pending:   "Pending",
  applied:   "Applied",
  in_review: "In Review",
  approved:  "Approved",
  rejected:  "Rejected",
  expired:   "Expired",
  cancelled: "Cancelled",
};
const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending:    { bg: "#FEF9C3", color: "#854D0E" },
  applied:    { bg: "#FEF0E3", color: "#F5821F" },
  in_review:  { bg: "#DBEAFE", color: "#1D4ED8" },
  approved:   { bg: "#DCFCE7", color: "#16A34A" },
  rejected:   { bg: "#FEE2E2", color: "#DC2626" },
  expired:    { bg: "#F4F3F1", color: "#57534E" },
  cancelled:  { bg: "#F4F3F1", color: "#57534E" },
};

interface VisaServiceRecord {
  id: string;
  contractId?: string | null;
  contractNumber?: string | null;
  clientName?: string | null;
  studentName?: string | null;
  agentName?: string | null;
  contractStatus?: string | null;
  contractStartDate?: string | null;
  contractEndDate?: string | null;
  contractTotalAmount?: string | null;
  contractCurrency?: string | null;
  contractPaidAmount?: string | null;
  contractBalanceAmount?: string | null;
  assignedStaffId?: string | null;
  staffFullName?: string | null;
  partnerId?: string | null;
  visaType?: string | null;
  country?: string | null;
  applicationDate?: string | null;
  appointmentDate?: string | null;
  submissionDate?: string | null;
  decisionDate?: string | null;
  visaNumber?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status: string;
  serviceFee?: string | null;
  apCost?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

function fmtDate(v?: string | null) {
  if (!v) return "—";
  try { return format(parseISO(v), "d MMM yyyy"); } catch { return v; }
}
function fmtMoney(v?: string | null, currency = "AUD") {
  if (!v) return "—";
  return `${currency} ${parseFloat(v).toLocaleString("en-AU", { minimumFractionDigits: 2 })}`;
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab({
  record,
  onSave,
}: {
  record: VisaServiceRecord;
  onSave: (patch: object) => void;
}) {
  const [isDirty, setIsDirty] = useState(false);
  const [form, setForm] = useState({
    visaType:        record.visaType ?? "",
    country:         record.country ?? "",
    applicationDate: record.applicationDate ?? "",
    appointmentDate: record.appointmentDate ?? "",
    submissionDate:  record.submissionDate ?? "",
    decisionDate:    record.decisionDate ?? "",
    visaNumber:      record.visaNumber ?? "",
    startDate:       record.startDate ?? "",
    endDate:         record.endDate ?? "",
    status:          record.status ?? "pending",
    serviceFee:      record.serviceFee ?? "",
    apCost:          record.apCost ?? "",
    notes:           record.notes ?? "",
  });

  const { data: usersData } = useQuery({
    queryKey: ["users-list"],
    queryFn: () => axios.get(`${BASE}/api/users`).then(r => r.data),
  });
  const usersList: { id: string; fullName?: string | null }[] = usersData?.data ?? usersData ?? [];

  const [assignedStaffId, setAssignedStaffId] = useState(record.assignedStaffId ?? "");

  const set = <K extends keyof typeof form>(key: K, value: string) => {
    setForm(f => ({ ...f, [key]: value }));
    setIsDirty(true);
  };

  const discard = () => {
    setForm({
      visaType:        record.visaType ?? "",
      country:         record.country ?? "",
      applicationDate: record.applicationDate ?? "",
      appointmentDate: record.appointmentDate ?? "",
      submissionDate:  record.submissionDate ?? "",
      decisionDate:    record.decisionDate ?? "",
      visaNumber:      record.visaNumber ?? "",
      startDate:       record.startDate ?? "",
      endDate:         record.endDate ?? "",
      status:          record.status ?? "pending",
      serviceFee:      record.serviceFee ?? "",
      apCost:          record.apCost ?? "",
      notes:           record.notes ?? "",
    });
    setAssignedStaffId(record.assignedStaffId ?? "");
    setIsDirty(false);
  };

  function handleSave() {
    onSave({
      visaType:        form.visaType || null,
      country:         form.country || null,
      applicationDate: form.applicationDate || null,
      appointmentDate: form.appointmentDate || null,
      submissionDate:  form.submissionDate || null,
      decisionDate:    form.decisionDate || null,
      visaNumber:      form.visaNumber || null,
      startDate:       form.startDate || null,
      endDate:         form.endDate || null,
      status:          form.status,
      serviceFee:      form.serviceFee || null,
      apCost:          form.apCost || null,
      notes:           form.notes || null,
      assignedStaffId: assignedStaffId || null,
    });
    setIsDirty(false);
  }

  return (
    <div className="space-y-4">
      {/* Visa Info Card */}
      <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Stamp size={14} style={{ color: "#F5821F" }} />
            <h3 className="text-xs font-bold uppercase tracking-wide text-[#F5821F]">Visa Details</h3>
          </div>
          {isDirty && (
            <div className="flex items-center gap-2">
              <button onClick={discard}
                className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-700 border border-stone-200 rounded-md px-2.5 py-1 transition-colors">
                <RotateCcw size={11} /> Discard
              </button>
              <button onClick={handleSave}
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

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-stone-500">Visa Type</Label>
              <Input value={form.visaType} onChange={e => set("visaType", e.target.value)} placeholder="e.g. Student Visa, Working Holiday" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-stone-500">Destination Country</Label>
              <Input value={form.country} onChange={e => set("country", e.target.value)} placeholder="e.g. Australia" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-stone-500">Application Date</Label>
              <Input type="date" value={form.applicationDate} onChange={e => set("applicationDate", e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-stone-500">Appointment Date</Label>
              <Input type="date" value={form.appointmentDate} onChange={e => set("appointmentDate", e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-stone-500">Submission Date</Label>
              <Input type="date" value={form.submissionDate} onChange={e => set("submissionDate", e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-stone-500">Decision Date</Label>
              <Input type="date" value={form.decisionDate} onChange={e => set("decisionDate", e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-stone-500">Visa Grant Number</Label>
              <Input value={form.visaNumber} onChange={e => set("visaNumber", e.target.value)} placeholder="Grant number after approval" className="h-9 text-sm font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-stone-500">Status</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-stone-500">Visa Valid From</Label>
              <Input type="date" value={form.startDate} onChange={e => set("startDate", e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-stone-500">Visa Expires</Label>
              <Input type="date" value={form.endDate} onChange={e => set("endDate", e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-stone-500">Assigned Staff</Label>
              <Select value={assignedStaffId || "_none"} onValueChange={v => { setAssignedStaffId(v === "_none" ? "" : v); setIsDirty(true); }}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select staff" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— Unassigned —</SelectItem>
                  {usersList.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.fullName ?? u.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-stone-500">Service Fee (AUD)</Label>
              <Input type="number" step="0.01" value={form.serviceFee} onChange={e => set("serviceFee", e.target.value)} placeholder="0.00" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs text-stone-500">AP Cost (AUD)</Label>
              <Input type="number" step="0.01" value={form.apCost} onChange={e => set("apCost", e.target.value)} placeholder="0.00" className="h-9 text-sm" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-stone-500">Notes</Label>
            <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={3} className="text-sm resize-none" placeholder="Internal notes about this visa application…" />
          </div>
        </div>
      </div>

      {/* Related Contract Card */}
      {record.contractId && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <FileText size={14} style={{ color: "#F5821F" }} />
              <h3 className="text-xs font-bold uppercase tracking-wide text-[#F5821F]">Related Contract</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-stone-400">Contract #</span>
                <a href={`/admin/crm/contracts/${record.contractId}`}
                  className="flex items-center gap-1 font-mono text-xs text-[#F5821F] hover:underline font-semibold">
                  {record.contractNumber ?? "View"} <ExternalLink size={10} />
                </a>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-400">Client</span>
                <span className="text-stone-700 font-medium">{record.clientName ?? record.studentName ?? "—"}</span>
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
              <h3 className="text-xs font-bold uppercase tracking-wide text-[#F5821F]">Contract Financial</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-stone-400">Contract Value</span>
                <span className="font-semibold text-stone-800">{fmtMoney(record.contractTotalAmount, record.contractCurrency ?? "AUD")}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-400">Paid</span>
                <span className="font-semibold text-[#16A34A]">{fmtMoney(record.contractPaidAmount, record.contractCurrency ?? "AUD")}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-400">Balance</span>
                <span className="font-semibold text-[#DC2626]">{fmtMoney(record.contractBalanceAmount, record.contractCurrency ?? "AUD")}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Timeline Tab ──────────────────────────────────────────────────────────────
function TimelineTab({ record, onEdit }: { record: VisaServiceRecord; onEdit: () => void }) {
  const steps = [
    { label: "Application Submitted",   date: record.applicationDate,  status: "applied"   },
    { label: "Documents Submitted",     date: record.submissionDate,   status: "applied"   },
    { label: "Appointment / Interview", date: record.appointmentDate,  status: "in_review" },
    { label: "Decision Expected",       date: record.decisionDate,     status: "approved"  },
    { label: "Visa Valid From",         date: record.startDate,        status: "approved"  },
    { label: "Visa Expires",            date: record.endDate,          status: "expired"   },
  ];

  function fmtD(v?: string | null) {
    if (!v) return null;
    try { return format(parseISO(v), "d MMM yyyy"); } catch { return v; }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-stone-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Stamp size={14} style={{ color: "#F5821F" }} />
            <h3 className="text-xs font-bold uppercase tracking-wide text-[#F5821F]">Application Timeline</h3>
          </div>
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 text-xs font-medium text-[#F5821F] hover:underline"
          >
            <Pencil size={12} /> Edit Dates
          </button>
        </div>
        <ol className="relative border-l-2 border-stone-200 space-y-6 ml-3">
          {steps.map((step, i) => {
            const filled = !!step.date;
            return (
              <li key={i} className="ml-6">
                <span
                  className="absolute -left-[9px] flex h-4 w-4 items-center justify-center rounded-full border-2"
                  style={{
                    background: filled ? "#F5821F" : "#fff",
                    borderColor: filled ? "#F5821F" : "#D6D3D1",
                  }}
                />
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${filled ? "text-stone-800" : "text-stone-400"}`}>
                    {step.label}
                  </span>
                  <span className="text-xs text-stone-500">
                    {fmtD(step.date) ?? "Not set"}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {record.visaNumber && (
        <div className="bg-white border border-[#DCFCE7] rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#DCFCE7] flex items-center justify-center shrink-0">
            <Stamp size={18} className="text-[#16A34A]" />
          </div>
          <div>
            <p className="text-xs text-stone-400 font-medium uppercase tracking-wide">Visa Grant Number</p>
            <p className="text-lg font-bold font-mono text-stone-800">{record.visaNumber}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Bill Tab ─────────────────────────────────────────────────────────────────
function BillTab({ record, onEdit }: { record: VisaServiceRecord; onEdit: () => void }) {
  const margin = record.serviceFee && record.apCost
    ? parseFloat(record.serviceFee) - parseFloat(record.apCost)
    : null;

  return (
    <div className="space-y-4">
      <div className="bg-white border border-stone-200 rounded-xl overflow-x-auto">
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign size={14} style={{ color: "#F5821F" }} />
            <h3 className="text-xs font-bold uppercase tracking-wide text-[#F5821F]">Billing Summary</h3>
          </div>
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 text-xs font-medium text-[#F5821F] hover:underline"
          >
            <Pencil size={12} /> Edit Fees
          </button>
        </div>
        <div className="divide-y divide-stone-100">
          <div className="px-5 py-3.5 flex items-center justify-between text-sm">
            <span className="text-stone-500">Service Fee (AR)</span>
            <span className="font-semibold text-stone-800">{fmtMoney(record.serviceFee)}</span>
          </div>
          <div className="px-5 py-3.5 flex items-center justify-between text-sm">
            <span className="text-stone-500">Partner Cost (AP)</span>
            <span className="font-semibold text-stone-800">{fmtMoney(record.apCost)}</span>
          </div>
          {margin !== null && (
            <div className="px-5 py-3.5 flex items-center justify-between text-sm bg-stone-50">
              <span className="text-stone-500 font-medium">Gross Margin</span>
              <span className={`font-bold text-base ${margin >= 0 ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
                {margin >= 0 ? "+" : ""}AUD {margin.toLocaleString("en-AU", { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Stamp size={14} style={{ color: "#F5821F" }} />
          <h3 className="text-xs font-bold uppercase tracking-wide text-[#F5821F]">Visa Info</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-stone-400">Visa Type</span>
            <span className="text-stone-700">{record.visaType || "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-stone-400">Country</span>
            <span className="text-stone-700">{record.country || "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-stone-400">Status</span>
            <span className="capitalize text-stone-700">{STATUS_LABEL[record.status] ?? record.status}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-stone-400">Assigned Staff</span>
            <span className="text-stone-700">{record.staffFullName || "—"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Detail Page ─────────────────────────────────────────────────────────
export default function VisaServiceDetailPage() {
  const [, params]    = useRoute("/admin/services/visa/:id");
  const [, navigate]  = useLocation();
  const { toast }     = useToast();
  const qc            = useQueryClient();
  const [tab, setTab] = useState<"overview" | "timeline" | "documents" | "bill" | "payments" | "notes">("overview");

  const id = params?.id;

  const { data: record, isLoading } = useQuery<VisaServiceRecord>({
    queryKey: ["visa-service-detail", id],
    queryFn: () => axios.get(`${BASE}/api/services/visa/${id}`).then(r => r.data),
    enabled: !!id,
  });

  const patchMutation = useMutation({
    mutationFn: (patch: object) =>
      axios.patch(`${BASE}/api/services/visa/${id}`, patch).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["visa-service-detail", id] });
      qc.invalidateQueries({ queryKey: ["visa-services"] });
      toast({ title: "Saved successfully" });
    },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: () =>
      axios.patch(`${BASE}/api/services/visa/${id}/toggle-active`).then(r => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["visa-service-detail", id] });
      qc.invalidateQueries({ queryKey: ["visa-services"] });
      toast({ title: data.isActive ? "Record activated" : "Record deactivated" });
    },
    onError: () => toast({ title: "Failed to toggle status", variant: "destructive" }),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64 text-stone-400 text-sm">Loading…</div>;
  if (!record)   return <div className="p-6 text-stone-500">Record not found.</div>;

  const TABS = [
    { key: "overview",   label: "Overview"   },
    { key: "timeline",   label: "Timeline"   },
    { key: "documents",  label: "Documents"  },
    { key: "bill",       label: "Bill"       },
    { key: "payments",   label: "Payments"   },
    { key: "notes",      label: "Notes"      },
  ] as const;

  const statusStyle = STATUS_COLORS[record.status] ?? { bg: "#F4F3F1", color: "#57534E" };

  return (
    <div className="p-6 space-y-5">
      <button onClick={() => navigate("/admin/services/visa")}
        className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors">
        <ArrowLeft size={15} /> Back to Visa Services
      </button>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">
            {record.visaType ?? "Visa Service"}
            {record.country ? ` — ${record.country}` : ""}
          </h1>
          <p className="text-sm text-stone-500 mt-0.5">
            {record.contractNumber ? `Contract ${record.contractNumber}` : ""}
            {(record.clientName ?? record.studentName) ? ` · ${record.clientName ?? record.studentName}` : ""}
            {record.visaNumber ? ` · #${record.visaNumber}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="px-3 py-1 rounded-full text-sm font-medium"
            style={{ background: statusStyle.bg, color: statusStyle.color }}>
            {STATUS_LABEL[record.status] ?? record.status}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTab("overview")}
            className="flex items-center gap-1.5 h-8 text-sm border-stone-300"
          >
            <Pencil size={13} /> Edit Details
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-stone-200 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === t.key
                ? "border-[#F5821F] text-[#F5821F]"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview"  && (
        <>
          <OverviewTab record={record} onSave={p => patchMutation.mutate(p)} />
          <SystemInfoSection
            id={record.id}
            recordIdLabel="Visa Service ID"
            createdAt={record.createdAt}
            updatedAt={record.updatedAt}
            isActive={record.isActive ?? true}
            onToggleActive={() => toggleActiveMutation.mutate()}
            isToggling={toggleActiveMutation.isPending}
            ownerName={record.staffFullName ?? null}
            ownerLabel="Assigned Staff"
          />
        </>
      )}
      {tab === "timeline"  && <TimelineTab record={record} onEdit={() => setTab("overview")} />}
      {tab === "documents" && (
        <EntityDocumentsTab entityType="visa_services_mgt" entityId={id!} />
      )}
      {tab === "bill"      && <BillTab record={record} onEdit={() => setTab("overview")} />}
      {tab === "payments"  && (
        <ContractPaymentsPanel
          contractId={record.contractId}
          contractNumber={record.contractNumber}
        />
      )}
      {tab === "notes"     && (
        <NotePanel
          entityType="visa_services_mgt"
          entityId={id!}
          allowedNoteTypes={["internal"]}
          defaultVisibility="internal"
        />
      )}
    </div>
  );
}
