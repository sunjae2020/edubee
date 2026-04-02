import { formatDate } from "@/lib/date-format";
import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SystemInfoSection } from "@/components/shared/SystemInfoSection";
import axios from "axios";
import {
  ArrowLeft, FileText, DollarSign, ExternalLink, User, Building2, RotateCcw, Save,
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

const STATUSES = ["pending", "confirmed", "in_progress", "completed", "cancelled"] as const;
const STATUS_LABEL: Record<string, string> = {
  pending: "Pending", confirmed: "Confirmed", in_progress: "In Progress",
  completed: "Completed", cancelled: "Cancelled",
};
const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending:     { bg: "#FEF9C3", color: "#854D0E" },
  confirmed:   { bg: "#FEF0E3", color: "#F5821F" },
  in_progress: { bg: "#DBEAFE", color: "#1D4ED8" },
  completed:   { bg: "#DCFCE7", color: "#16A34A" },
  cancelled:   { bg: "#FEE2E2", color: "#DC2626" },
};

interface OtherServiceRecord {
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
  serviceType?: string | null;
  title?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status: string;
  serviceFee?: string | null;
  apCost?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

function fmtDate(d: string | null | undefined): string {
  return formatDate(d);
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
  record: OtherServiceRecord;
  onSave: (patch: object) => void;
}) {
  const [isDirty, setIsDirty] = useState(false);
  const [form, setForm] = useState({
    serviceType: record.serviceType ?? "",
    title: record.title ?? "",
    startDate: record.startDate ?? "",
    endDate: record.endDate ?? "",
    status: record.status ?? "pending",
    serviceFee: record.serviceFee ?? "",
    apCost: record.apCost ?? "",
    notes: record.notes ?? "",
  });

  const { data: usersData } = useQuery({
    queryKey: ["users-list"],
    queryFn: () => axios.get(`${BASE}/api/users`).then(r => r.data?.data ?? []),
  });
  const usersList: { id: string; fullName?: string | null }[] = usersData ?? [];

  const [assignedStaffId, setAssignedStaffId] = useState(record.assignedStaffId ?? "");

  const set = <K extends keyof typeof form>(key: K, value: string) => {
    setForm(f => ({ ...f, [key]: value }));
    setIsDirty(true);
  };

  const discard = () => {
    setForm({
      serviceType: record.serviceType ?? "",
      title:       record.title ?? "",
      startDate:   record.startDate ?? "",
      endDate:     record.endDate ?? "",
      status:      record.status ?? "pending",
      serviceFee:  record.serviceFee ?? "",
      apCost:      record.apCost ?? "",
      notes:       record.notes ?? "",
    });
    setAssignedStaffId(record.assignedStaffId ?? "");
    setIsDirty(false);
  };

  function handleSave() {
    onSave({
      serviceType:     form.serviceType || null,
      title:           form.title || null,
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
      {/* Service Info Card */}
      <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={14} style={{ color: "#F5821F" }} />
            <h3 className="text-xs font-bold uppercase tracking-wide text-[#F5821F]">Service Details</h3>
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
              <Label className="text-xs text-stone-500">Service Type</Label>
              <Input value={form.serviceType} onChange={e => set("serviceType", e.target.value)} placeholder="e.g. Airport Transfer, Tour" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-stone-500">Title</Label>
              <Input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Service title / description" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-stone-500">Start Date</Label>
              <Input type="date" value={form.startDate} onChange={e => set("startDate", e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-stone-500">End Date</Label>
              <Input type="date" value={form.endDate} onChange={e => set("endDate", e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-stone-500">Assigned Staff</Label>
              <Select value={assignedStaffId || "_none"} onValueChange={v => { setAssignedStaffId(v === "_none" ? "" : v); setIsDirty(true); }}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select staff" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— Unassigned —</SelectItem>
                  {usersList.map((u: { id: string; fullName?: string | null }) => (
                    <SelectItem key={u.id} value={u.id}>{u.fullName ?? u.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Label className="text-xs text-stone-500">Service Fee (AUD)</Label>
              <Input type="number" step="0.01" value={form.serviceFee} onChange={e => set("serviceFee", e.target.value)} placeholder="0.00" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-stone-500">AP Cost (AUD)</Label>
              <Input type="number" step="0.01" value={form.apCost} onChange={e => set("apCost", e.target.value)} placeholder="0.00" className="h-9 text-sm" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-stone-500">Notes</Label>
            <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={3} className="text-sm resize-none" placeholder="Internal notes about this service…" />
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

// ─── Bill Tab ─────────────────────────────────────────────────────────────────
function BillTab({ record }: { record: OtherServiceRecord }) {
  const margin = record.serviceFee && record.apCost
    ? parseFloat(record.serviceFee) - parseFloat(record.apCost)
    : null;

  return (
    <div className="space-y-4">
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100 flex items-center gap-2">
          <DollarSign size={14} style={{ color: "#F5821F" }} />
          <h3 className="text-xs font-bold uppercase tracking-wide text-[#F5821F]">Billing Summary</h3>
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
          <User size={14} style={{ color: "#F5821F" }} />
          <h3 className="text-xs font-bold uppercase tracking-wide text-[#F5821F]">Service Info</h3>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-stone-400">Service Type</span>
            <span className="text-stone-700">{record.serviceType || "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-stone-400">Status</span>
            <span className="capitalize text-stone-700">{STATUS_LABEL[record.status] ?? record.status}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-stone-400">Period</span>
            <span className="text-stone-700 text-xs">{fmtDate(record.startDate)} → {fmtDate(record.endDate)}</span>
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
export default function OtherServiceDetailPage() {
  const [, params]    = useRoute("/admin/services/other/:id");
  const [, navigate]  = useLocation();
  const { toast }     = useToast();
  const qc            = useQueryClient();
  const [tab, setTab] = useState<"overview" | "documents" | "bill" | "notes" | "payments">("overview");

  const id = params?.id;

  const { data: record, isLoading } = useQuery<OtherServiceRecord>({
    queryKey: ["other-service-detail", id],
    queryFn: () => axios.get(`${BASE}/api/services/other/${id}`).then(r => r.data),
    enabled: !!id,
  });

  const patchMutation = useMutation({
    mutationFn: (patch: object) =>
      axios.patch(`${BASE}/api/services/other/${id}`, patch).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["other-service-detail", id] });
      qc.invalidateQueries({ queryKey: ["other-services"] });
      toast({ title: "Saved successfully" });
    },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: () =>
      axios.patch(`${BASE}/api/services/other/${id}/toggle-active`).then(r => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["other-service-detail", id] });
      qc.invalidateQueries({ queryKey: ["other-services"] });
      toast({ title: data.isActive ? "Record activated" : "Record deactivated" });
    },
    onError: () => toast({ title: "Failed to toggle status", variant: "destructive" }),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64 text-stone-400 text-sm">Loading…</div>;
  if (!record)   return <div className="p-6 text-stone-500">Record not found.</div>;

  const TABS = [
    { key: "overview",   label: "Overview"   },
    { key: "documents",  label: "Documents"  },
    { key: "bill",       label: "Bill"       },
    { key: "payments",   label: "Payments"   },
    { key: "notes",      label: "Notes"      },
  ] as const;

  const statusStyle = STATUS_COLORS[record.status] ?? { bg: "#F4F3F1", color: "#57534E" };

  return (
    <div className="p-6 space-y-5">
      <button onClick={() => navigate("/admin/services/other")}
        className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors">
        <ArrowLeft size={15} /> Back to Other Services
      </button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">{record.title ?? record.serviceType ?? "Other Service"}</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            {record.contractNumber ? `Contract ${record.contractNumber}` : ""}
            {(record.clientName ?? record.studentName) ? ` · ${record.clientName ?? record.studentName}` : ""}
            {record.serviceType ? ` · ${record.serviceType}` : ""}
          </p>
        </div>
        <span className="px-3 py-1 rounded-full text-sm font-medium capitalize"
          style={{ background: statusStyle.bg, color: statusStyle.color }}>
          {STATUS_LABEL[record.status] ?? record.status}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-stone-200 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
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
            recordIdLabel="Other Service ID"
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
      {tab === "documents" && (
        <EntityDocumentsTab entityType="other_services_mgt" entityId={id!} />
      )}
      {tab === "bill"      && <BillTab record={record} />}
      {tab === "payments"  && (
        <ContractPaymentsPanel
          contractId={record.contractId}
          contractNumber={record.contractNumber}
        />
      )}
      {tab === "notes"     && (
        <NotePanel
          entityType="other_services_mgt"
          entityId={id!}
          allowedNoteTypes={["internal"]}
          defaultVisibility="internal"
        />
      )}
    </div>
  );
}
