import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SystemInfoSection } from "@/components/shared/SystemInfoSection";
import axios from "axios";
import {
  ArrowLeft, Plus, FileText, CalendarDays, HeartPulse,
  DollarSign, Check, X, ExternalLink, RotateCcw, Save,
} from "lucide-react";
import { ContractPaymentsPanel } from "@/components/finance/ContractPaymentsPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface MonthlyReport {
  month: string;
  reportText?: string | null;
  sentAt?: string | null;
  parentAcked?: boolean;
}

interface SchoolEvent {
  date?: string;
  eventName?: string;
  notes?: string;
}

interface MedicalRecord {
  date?: string;
  description?: string;
  action?: string;
}

interface WelfareIntervention {
  date?: string;
  description?: string;
  outcome?: string;
}

interface RecurringInvoice {
  id: string;
  invoiceNumber?: string | null;
  recurringSeq?: number | null;
  totalAmount?: string | null;
  status?: string | null;
  createdAt?: string;
}

interface GuardianDetail {
  id: string;
  contractId?: string | null;
  contractNumber?: string | null;
  clientName?: string | null;
  studentName?: string | null;
  agentName?: string | null;
  staffFirstName?: string | null;
  staffLastName?: string | null;
  serviceStartDate?: string | null;
  serviceEndDate?: string | null;
  billingCycle?: string | null;
  officialGuardianRegistered?: boolean;
  schoolGuardianRegistrationDate?: string | null;
  parentContact?: object | null;
  emergencyContact?: string | null;
  monthlyReports?: MonthlyReport[] | null;
  schoolEventsAttended?: SchoolEvent[] | null;
  medicalEmergencies?: MedicalRecord[] | null;
  welfareInterventions?: WelfareIntervention[] | null;
  status?: string | null;
  notes?: string | null;
  serviceFee?: string | null;
  recurringInvoices?: RecurringInvoice[];
  contractStatus?: string | null;
  contractStartDate?: string | null;
  contractEndDate?: string | null;
  contractTotalAmount?: string | null;
  contractCurrency?: string | null;
  contractPaidAmount?: string | null;
  contractBalanceAmount?: string | null;
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  try { return format(parseISO(d), "MMM d, yyyy"); } catch { return d; }
}

// ─── Add Monthly Report Modal ─────────────────────────────────────────────────
function AddReportModal({
  guardianId,
  onClose,
}: {
  guardianId: string;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const today = new Date();
  const [month,       setMonth]       = useState(format(today, "yyyy-MM"));
  const [reportText,  setReportText]  = useState("");
  const [sentAt,      setSentAt]      = useState("");
  const [parentAcked, setParentAcked] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      axios.post(`${BASE}/api/services/guardian/${guardianId}/monthly-report`, {
        month, reportText, sentAt: sentAt || null, parentAcked,
      }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["guardian-detail", guardianId] });
      toast({ title: "Monthly report added" });
      onClose();
    },
    onError: () => toast({ title: "Failed to save", variant: "destructive" }),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-[#F5821F]" />
            <h3 className="text-base font-bold text-stone-800">Add Monthly Report</h3>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700"><X size={16} /></button>
        </div>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-stone-600">Month</Label>
            <Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-stone-600">Report Text</Label>
            <Textarea
              value={reportText}
              onChange={e => setReportText(e.target.value)}
              className="text-sm min-h-[80px] resize-none"
              placeholder="Monthly guardian report content…"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-stone-600">Sent to Parent At</Label>
            <Input type="date" value={sentAt} onChange={e => setSentAt(e.target.value)} className="h-9 text-sm" />
          </div>
          <div
            className="flex items-center gap-2 p-2.5 rounded-lg border border-stone-200 cursor-pointer"
            onClick={() => setParentAcked(!parentAcked)}
          >
            <div
              className="w-5 h-5 rounded flex items-center justify-center"
              style={{ background: parentAcked ? "#F5821F" : "#F4F3F1", border: `2px solid ${parentAcked ? "#F5821F" : "#E7E5E4"}` }}
            >
              {parentAcked && <Check size={11} className="text-white" />}
            </div>
            <span className="text-sm text-stone-700">Parent Acknowledged</span>
          </div>
        </div>
        <div className="flex gap-3 pt-1">
          <Button
            onClick={() => mutation.mutate()}
            disabled={!month || mutation.isPending}
            className="flex-1 text-white" style={{ background: "#F5821F" }}
          >
            {mutation.isPending ? "Saving…" : "Add Report"}
          </Button>
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Details Tab ──────────────────────────────────────────────────────────────
function DetailsTab({ record, onSave }: { record: GuardianDetail; onSave: (p: object) => void }) {
  const [isDirty,        setIsDirty]        = useState(false);
  const [status,         setStatus]         = useState(record.status         ?? "pending");
  const [billingCycle,   setBillingCycle]   = useState(record.billingCycle   ?? "");
  const [serviceStart,   setServiceStart]   = useState(record.serviceStartDate ?? "");
  const [serviceEnd,     setServiceEnd]     = useState(record.serviceEndDate   ?? "");
  const [emergencyContact, setEmergencyContact] = useState(record.emergencyContact ?? "");
  const [notes,          setNotes]          = useState(record.notes          ?? "");
  const [regDate,        setRegDate]        = useState(record.schoolGuardianRegistrationDate ?? "");
  const [registered,     setRegistered]     = useState(record.officialGuardianRegistered ?? false);

  const mark = () => setIsDirty(true);

  const discard = () => {
    setStatus(record.status ?? "pending");
    setBillingCycle(record.billingCycle ?? "");
    setServiceStart(record.serviceStartDate ?? "");
    setServiceEnd(record.serviceEndDate ?? "");
    setEmergencyContact(record.emergencyContact ?? "");
    setNotes(record.notes ?? "");
    setRegDate(record.schoolGuardianRegistrationDate ?? "");
    setRegistered(record.officialGuardianRegistered ?? false);
    setIsDirty(false);
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-3">
          <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Client</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-stone-400">Name</span><span className="font-medium text-stone-800">{record.clientName ?? record.studentName ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-stone-400">Agent</span><span className="text-stone-600">{record.agentName ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-stone-400">Contract</span><span className="font-mono text-xs text-stone-500">{record.contractNumber ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-stone-400">Staff</span>
              <span className="text-stone-600">{record.staffFirstName ? `${record.staffFirstName} ${record.staffLastName ?? ""}`.trim() : "—"}</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-3">
          <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide">School Registration</h3>
          <div
            className="flex items-center gap-2 p-2.5 rounded-lg border border-stone-200 cursor-pointer"
            onClick={() => { setRegistered(!registered); mark(); }}
          >
            <div
              className="w-5 h-5 rounded flex items-center justify-center"
              style={{ background: registered ? "#F5821F" : "#F4F3F1", border: `2px solid ${registered ? "#F5821F" : "#E7E5E4"}` }}
            >
              {registered && <Check size={11} className="text-white" />}
            </div>
            <span className="text-sm text-stone-700">Official Guardian Registered</span>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-stone-600">Registration Date</Label>
            <Input type="date" value={regDate} onChange={e => { setRegDate(e.target.value); mark(); }} className="h-9 text-sm" />
          </div>
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Service Details</h3>
          {isDirty && (
            <div className="flex items-center gap-2">
              <button onClick={discard}
                className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-700 border border-stone-200 rounded-md px-2.5 py-1 transition-colors">
                <RotateCcw size={11} /> Discard
              </button>
              <button onClick={() => { onSave({ status, billingCycle: billingCycle || null, serviceStartDate: serviceStart || null, serviceEndDate: serviceEnd || null, emergencyContact: emergencyContact || null, notes, officialGuardianRegistered: registered, schoolGuardianRegistrationDate: regDate || null }); setIsDirty(false); }}
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
            <Label className="text-xs text-stone-600">Service Start</Label>
            <Input type="date" value={serviceStart} onChange={e => { setServiceStart(e.target.value); mark(); }} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-stone-600">Service End</Label>
            <Input type="date" value={serviceEnd} onChange={e => { setServiceEnd(e.target.value); mark(); }} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-stone-600">Billing Cycle</Label>
            <Select value={billingCycle} onValueChange={v => { setBillingCycle(v); mark(); }}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                {["monthly", "term", "annual"].map(c => (
                  <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-stone-600">Status</Label>
            <Select value={status} onValueChange={v => { setStatus(v); mark(); }}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["pending", "active", "on_hold", "completed", "cancelled"].map(s => (
                  <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label className="text-xs text-stone-600">Emergency Contact</Label>
            <Input value={emergencyContact} onChange={e => { setEmergencyContact(e.target.value); mark(); }} className="h-9 text-sm" placeholder="Name + phone" />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label className="text-xs text-stone-600">Notes</Label>
            <Textarea value={notes} onChange={e => { setNotes(e.target.value); mark(); }} className="text-sm min-h-[60px] resize-none" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Monthly Reports Tab ──────────────────────────────────────────────────────
function MonthlyReportsTab({ record }: { record: GuardianDetail }) {
  const [showAdd, setShowAdd] = useState(false);
  const reports: MonthlyReport[] = Array.isArray(record.monthlyReports) ? [...record.monthlyReports] : [];
  const sorted = reports.sort((a, b) => b.month.localeCompare(a.month));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-700">Monthly Reports ({reports.length})</h3>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 text-xs font-medium text-[#F5821F] hover:underline">
          <Plus size={13} /> Add Report
        </button>
      </div>

      {sorted.length === 0 && (
        <div className="flex flex-col items-center justify-center h-32 text-stone-400 text-sm gap-2">
          <FileText size={22} />
          <span>No monthly reports yet</span>
        </div>
      )}

      <div className="space-y-3">
        {sorted.map((report, i) => (
          <div key={i} className="bg-white border border-stone-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-stone-800 text-sm">{report.month}</span>
              <div className="flex items-center gap-2">
                {report.sentAt && (
                  <span className="text-xs text-stone-400">Sent {fmtDate(report.sentAt)}</span>
                )}
                {report.parentAcked ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-[#16A34A] bg-[#DCFCE7] px-2 py-0.5 rounded-full">
                    <Check size={10} /> Acknowledged
                  </span>
                ) : (
                  <span className="text-xs text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">Pending ACK</span>
                )}
              </div>
            </div>
            {report.reportText && (
              <p className="text-sm text-stone-700 leading-relaxed">{report.reportText}</p>
            )}
          </div>
        ))}
      </div>

      {showAdd && <AddReportModal guardianId={record.id} onClose={() => setShowAdd(false)} />}
    </div>
  );
}

// ─── School Events Tab ────────────────────────────────────────────────────────
function SchoolEventsTab({ record }: { record: GuardianDetail }) {
  const events: SchoolEvent[] = Array.isArray(record.schoolEventsAttended) ? record.schoolEventsAttended : [];

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-stone-700">School Events Attended ({events.length})</h3>
      <div className="rounded-xl border border-stone-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 border-b border-stone-200">
            <tr>
              {["Date", "Event", "Notes"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {events.length === 0 && (
              <tr><td colSpan={3} className="text-center py-10 text-stone-400 text-sm">No school events recorded</td></tr>
            )}
            {events.map((ev, i) => (
              <tr key={i} className="hover:bg-stone-50">
                <td className="px-4 py-3 text-stone-600 text-xs whitespace-nowrap">{fmtDate(ev.date)}</td>
                <td className="px-4 py-3 font-medium text-stone-800">{ev.eventName ?? "—"}</td>
                <td className="px-4 py-3 text-stone-500 text-xs">{ev.notes ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Medical Tab ──────────────────────────────────────────────────────────────
function MedicalTab({ record }: { record: GuardianDetail }) {
  const medical: MedicalRecord[] = Array.isArray(record.medicalEmergencies) ? record.medicalEmergencies : [];
  const welfare: WelfareIntervention[] = Array.isArray(record.welfareInterventions) ? record.welfareInterventions : [];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-stone-700 mb-3 flex items-center gap-1.5">
          <HeartPulse size={14} className="text-[#DC2626]" /> Medical Emergencies ({medical.length})
        </h3>
        <div className="rounded-xl border border-stone-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                {["Date", "Description", "Action Taken"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {medical.length === 0 && (
                <tr><td colSpan={3} className="text-center py-8 text-stone-400 text-sm">No medical emergencies recorded</td></tr>
              )}
              {medical.map((m, i) => (
                <tr key={i}><td className="px-4 py-3 text-xs text-stone-500">{fmtDate(m.date)}</td><td className="px-4 py-3 text-stone-700">{m.description ?? "—"}</td><td className="px-4 py-3 text-stone-500 text-xs">{m.action ?? "—"}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-stone-700 mb-3 flex items-center gap-1.5">
          <HeartPulse size={14} className="text-[#F5821F]" /> Welfare Interventions ({welfare.length})
        </h3>
        <div className="rounded-xl border border-stone-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                {["Date", "Description", "Outcome"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {welfare.length === 0 && (
                <tr><td colSpan={3} className="text-center py-8 text-stone-400 text-sm">No welfare interventions recorded</td></tr>
              )}
              {welfare.map((w, i) => (
                <tr key={i}><td className="px-4 py-3 text-xs text-stone-500">{fmtDate(w.date)}</td><td className="px-4 py-3 text-stone-700">{w.description ?? "—"}</td><td className="px-4 py-3 text-stone-500 text-xs">{w.outcome ?? "—"}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Billing Tab ──────────────────────────────────────────────────────────────
function BillingTab({ record, id }: { record: GuardianDetail; id: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const recurringInvoices: RecurringInvoice[] = record.recurringInvoices ?? [];

  const generateMutation = useMutation({
    mutationFn: () =>
      axios.post(`${BASE}/api/accounting/invoices/recurring`, {
        contractId: record.contractId,
        invoiceType: "guardian",
        notes: `Guardian service — ${record.studentName ?? ""} recurring`,
      }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["guardian-detail", id] });
      toast({ title: "Recurring invoice generated" });
    },
    onError: () => toast({ title: "Failed to generate invoice", variant: "destructive" }),
  });

  const INV_STATUS_STYLE: Record<string, { bg: string; text: string }> = {
    draft:   { bg: "#F4F3F1", text: "#57534E" },
    issued:  { bg: "#FEF0E3", text: "#F5821F" },
    paid:    { bg: "#DCFCE7", text: "#16A34A" },
    overdue: { bg: "#FEF2F2", text: "#DC2626" },
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-stone-700">Recurring Invoices ({recurringInvoices.length})</h3>
          <p className="text-xs text-stone-400 mt-0.5">Billing Cycle: <span className="capitalize font-medium text-stone-600">{record.billingCycle?.replace(/_/g, " ") ?? "Not set"}</span></p>
        </div>
        <Button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending || !record.contractId}
          className="flex items-center gap-1.5 text-white text-xs h-9" style={{ background: "#F5821F" }}
        >
          <DollarSign size={13} />
          {generateMutation.isPending ? "Generating…" : "Generate This Month Invoice"}
        </Button>
      </div>

      <div className="rounded-xl border border-stone-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 border-b border-stone-200">
            <tr>
              {["Invoice #", "Seq #", "Amount", "Status", "Created"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {recurringInvoices.length === 0 && (
              <tr><td colSpan={5} className="text-center py-10 text-stone-400 text-sm">No recurring invoices yet</td></tr>
            )}
            {recurringInvoices.map(inv => {
              const badge = INV_STATUS_STYLE[inv.status ?? "draft"] ?? INV_STATUS_STYLE.draft;
              return (
                <tr key={inv.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3 font-mono text-xs text-stone-600">{inv.invoiceNumber ?? "—"}</td>
                  <td className="px-4 py-3 text-stone-700 font-medium">#{inv.recurringSeq ?? "—"}</td>
                  <td className="px-4 py-3 font-semibold text-stone-800">
                    {inv.totalAmount ? `A$${parseFloat(inv.totalAmount).toLocaleString("en-AU", { minimumFractionDigits: 2 })}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium capitalize" style={{ background: badge.bg, color: badge.text }}>
                      {inv.status ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-stone-500 text-xs">{fmtDate(inv.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Detail Page ─────────────────────────────────────────────────────────
export default function GuardianDetailPage() {
  const [, params]    = useRoute("/admin/services/guardian/:id");
  const [, navigate]  = useLocation();
  const { toast }     = useToast();
  const qc            = useQueryClient();
  const [tab, setTab] = useState<"details" | "reports" | "events" | "medical" | "billing">("details");

  const id = params?.id;

  const { data: record, isLoading } = useQuery({
    queryKey: ["guardian-detail", id],
    queryFn: () => axios.get(`${BASE}/api/services/guardian/${id}`).then(r => r.data),
    enabled: !!id,
  });

  const patchMutation = useMutation({
    mutationFn: (patch: object) =>
      axios.patch(`${BASE}/api/services/guardian/${id}`, patch).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["guardian-detail", id] });
      qc.invalidateQueries({ queryKey: ["guardian"] });
      qc.invalidateQueries({ queryKey: ["guardian-billing-due"] });
      toast({ title: "Saved successfully" });
    },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64 text-stone-400 text-sm">Loading…</div>;
  if (!record)  return <div className="p-6 text-stone-500">Record not found.</div>;

  const TABS = [
    { key: "details",   label: "Details"          },
    { key: "reports",   label: "Monthly Reports"  },
    { key: "events",    label: "School Events"    },
    { key: "medical",   label: "Medical"          },
    { key: "billing",   label: "Billing"          },
    { key: "payments",  label: "Payments"         },
  ] as const;

  return (
    <div className="p-6 space-y-5">
      <button onClick={() => navigate("/admin/services/guardian")}
        className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors">
        <ArrowLeft size={15} /> Back to Guardian
      </button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">{record.clientName ?? record.studentName ?? "—"}</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            {record.contractNumber ?? ""}
            {record.billingCycle ? ` · ${record.billingCycle} billing` : ""}
          </p>
        </div>
        <span className="px-3 py-1 rounded-full text-sm font-medium capitalize"
          style={{ background: "#F4F3F1", color: "#57534E" }}>
          {record.status?.replace(/_/g, " ") ?? "—"}
        </span>
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
                <span className="text-stone-400">Monthly Service Fee</span>
                <span className="font-semibold text-stone-800">
                  {record.serviceFee ? `$${Number(record.serviceFee).toLocaleString("en-AU", { minimumFractionDigits: 2 })}/mo` : "—"}
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

      {tab === "details"   && <DetailsTab      record={record} onSave={p => patchMutation.mutate(p)} />}
      {tab === "reports"   && <MonthlyReportsTab record={record} />}
      {tab === "events"    && <SchoolEventsTab   record={record} />}
      {tab === "medical"   && <MedicalTab        record={record} />}
      {tab === "billing"   && <BillingTab        record={record} id={id!} />}
      {tab === "payments"  && (
        <ContractPaymentsPanel
          contractId={record.contractId}
          contractNumber={record.contractNumber}
        />
      )}
      <SystemInfoSection owner={record.clientId ?? null} createdAt={record.createdAt} updatedAt={record.updatedAt} />
    </div>
  );
}
