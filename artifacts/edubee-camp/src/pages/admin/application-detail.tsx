import { useState, useEffect } from "react";
import { formatDate, formatDateTime } from "@/lib/date-format";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { DetailPageLayout, DetailSection, DetailRow, EditableField } from "@/components/shared/DetailPageLayout";
import { SystemInfoSection } from "@/components/shared/SystemInfoSection";
import { useDetailEdit } from "@/hooks/useDetailEdit";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { NotePanel } from "@/components/shared/NotePanel";
import EntityDocumentsTab from "@/components/shared/EntityDocumentsTab";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ParticipantEditDialog, ParticipantAddDialog } from "@/components/shared/ParticipantDialogs";
import { Pencil, Plus, ClipboardList, Loader2, ExternalLink, FileText } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const APPLICATION_STATUSES = ["submitted", "reviewing", "quoted", "converted", "cancelled"];

const TABS = [
  { key: "overview",     label: "Overview" },
  { key: "services",     label: "Services" },
  { key: "participants", label: "Participants" },
  { key: "documents",    label: "Documents" },
  { key: "notes",        label: "Notes" },
];

const STATUS_COLORS: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-700",
  submitted: "bg-blue-100 text-blue-700",
  reviewing: "bg-amber-100 text-amber-700",
  approved:  "bg-green-100 text-green-700",
  rejected:  "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-600",
  converted: "bg-teal-100 text-teal-700",
  quoted:    "bg-[#E0F2FE] text-[#0369A1]",
};

// ── Service type definitions (same fields as application form) ───────────────
type SvcFieldDef = {
  label: string;
  key: string;
  type?: "text" | "date" | "time" | "number" | "select";
  options?: string[];
};

const SERVICE_META: Record<string, {
  label: string; icon: string; color: string; fields: SvcFieldDef[];
}> = {
  pickup: {
    label: "Airport Pickup", icon: "🚌", color: "bg-[#FEF9C3] border-yellow-200",
    fields: [
      { label: "Flight Number",     key: "flightNumber" },
      { label: "Flight Date",       key: "flightDate",       type: "date" },
      { label: "Arrival Time",      key: "arrivalTime",      type: "time" },
      { label: "Departure Airport", key: "departureAirport" },
      { label: "Arrival Airport",   key: "arrivalAirport" },
      { label: "Passengers",        key: "passengerCount",   type: "number" },
    ],
  },
  accommodation: {
    label: "Accommodation / Homestay", icon: "🏨", color: "bg-[#EFF6FF] border-blue-200",
    fields: [
      { label: "Check-in Date",  key: "checkinDate",         type: "date" },
      { label: "Check-out Date", key: "checkoutDate",        type: "date" },
      { label: "Room Type",      key: "roomType",            type: "select", options: ["single","twin","double","family"] },
      { label: "Number of Rooms",key: "numRooms",            type: "number" },
      { label: "Address",        key: "accommodationAddress" },
    ],
  },
  study_abroad: {
    label: "Study Abroad", icon: "🎓", color: "bg-[#F0FDF4] border-green-200",
    fields: [
      { label: "Destination Country", key: "destinationCountry" },
      { label: "Institution Name",    key: "institutionName" },
      { label: "Course Name",         key: "courseName" },
      { label: "Study Start Date",    key: "studyStartDate",  type: "date" },
      { label: "Study End Date",      key: "studyEndDate",    type: "date" },
    ],
  },
  internship: {
    label: "Internship Placement", icon: "💼", color: "bg-[#FDF4FF] border-purple-200",
    fields: [
      { label: "Start Date",         key: "internshipStartDate", type: "date" },
      { label: "End Date",           key: "internshipEndDate",   type: "date" },
      { label: "Industry / Program", key: "industry" },
      { label: "Preferred City",     key: "companyPreference" },
    ],
  },
  settlement: {
    label: "Settlement Service", icon: "🏠", color: "bg-[#FFF7ED] border-orange-200",
    fields: [
      { label: "Settlement Date", key: "settlementDate", type: "date" },
      { label: "Suburb / Area",   key: "suburb" },
    ],
  },
  guardian: {
    label: "Guardian Service", icon: "🛡️", color: "bg-[#F0F9FF] border-sky-200",
    fields: [
      { label: "Start Date",    key: "guardianStartDate", type: "date" },
      { label: "End Date",      key: "guardianEndDate",   type: "date" },
      { label: "Guardian Type", key: "guardianType" },
    ],
  },
};

const ALL_SERVICE_TYPES = Object.keys(SERVICE_META);

// ── Helper: labelled input row ───────────────────────────────────────────────
function SvcField({ def, value, onChange }: { def: SvcFieldDef; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] font-semibold text-[#57534E] uppercase tracking-wide">{def.label}</Label>
      {def.type === "select" ? (
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-(--e-orange)/50"
        >
          <option value="">Please Select</option>
          {(def.options ?? []).map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
        </select>
      ) : (
        <Input
          type={def.type ?? "text"}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="h-9 text-sm"
        />
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  // Participant dialogs
  const [editParticipant, setEditParticipant] = useState<any | null>(null);
  const [addParticipant, setAddParticipant] = useState(false);

  // Convert to quote dialog
  const [convertQuoteDialog, setConvertQuoteDialog] = useState(false);

  // Service edit dialog
  const [editingSvc, setEditingSvc]   = useState<string | null>(null);
  const [svcForm, setSvcForm]         = useState<Record<string, string>>({});

  // Add service dialog
  const [addSvcDialog, setAddSvcDialog] = useState(false);
  const [newSvcType, setNewSvcType]     = useState("");
  const [newSvcForm, setNewSvcForm]     = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["application-detail-page", id],
    queryFn: () => axios.get(`${BASE}/api/applications/${id}`).then(r => r.data),
  });

  const app = data?.data ?? data;
  const participants: any[] = app?.participants ?? [];

  const isContracted = app?.status === "contracted";
  const canEdit = ["super_admin", "admin", "camp_coordinator"].includes(user?.role ?? "") && !isContracted;

  // ── Mutations ──────────────────────────────────────────────────────────────
  const toggleActiveMutation = useMutation({
    mutationFn: () =>
      axios.patch(`${BASE}/api/applications/${id}/toggle-active`).then(r => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["application-detail-page", id] });
      toast({ title: data.isActive ? "Application activated" : "Application deactivated" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to toggle status" }),
  });

  const updateApp = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      axios.patch(`${BASE}/api/applications/${id}`, payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["application-detail-page", id] });
      qc.invalidateQueries({ queryKey: ["applications"] });
      toast({ title: "Application updated" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to update" }),
  });

  const convertToQuote = useMutation({
    mutationFn: () => axios.post(`${BASE}/api/applications/${id}/convert-to-quote`).then(r => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["application-detail-page", id] });
      qc.invalidateQueries({ queryKey: ["applications"] });
      setConvertQuoteDialog(false);
      toast({ title: `Quote created: ${data.quoteRefNumber}` });
      window.location.href = `${BASE}/admin/crm/quotes/${data.quoteId}`;
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error ?? "Failed to convert";
      toast({ variant: "destructive", title: msg });
    },
  });

  const updateParticipant = useMutation({
    mutationFn: ({ pid, data }: { pid: string; data: Record<string, any> }) =>
      axios.patch(`${BASE}/api/applications/participants/${pid}`, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["application-detail-page", id] });
      toast({ title: "Participant updated" });
      setEditParticipant(null);
    },
    onError: () => toast({ variant: "destructive", title: "Failed to update participant" }),
  });

  const createParticipant = useMutation({
    mutationFn: (data: Record<string, any>) =>
      axios.post(`${BASE}/api/applications/participants`, { ...data, applicationId: id }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["application-detail-page", id] });
      toast({ title: "Participant added" });
      setAddParticipant(false);
    },
    onError: () => toast({ variant: "destructive", title: "Failed to add participant" }),
  });

  // ── Service edit / add mutations ──────────────────────────────────────────
  const saveSvcEdit = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      axios.patch(`${BASE}/api/applications/${id}`, payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["application-detail-page", id] });
      toast({ title: "Service details updated" });
      setEditingSvc(null);
      setSvcForm({});
    },
    onError: () => toast({ variant: "destructive", title: "Failed to update service" }),
  });

  const saveAddSvc = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      axios.patch(`${BASE}/api/applications/${id}`, payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["application-detail-page", id] });
      toast({ title: "Service added" });
      setAddSvcDialog(false);
      setNewSvcType("");
      setNewSvcForm({});
    },
    onError: () => toast({ variant: "destructive", title: "Failed to add service" }),
  });

  // ── Overview edit ─────────────────────────────────────────────────────────
  const { isEditing, isDirty, isSaving, cancelEdit, setField, saveEdit, getValue } = useDetailEdit({
    initialData: app ?? {},
    onSave: async (data) => { await updateApp.mutateAsync(data); },
    alwaysEdit: true,
  });

  // ── Staff list for Assignment section ────────────────────────────────────
  const { data: staffData } = useQuery({
    queryKey: ["staff-list-app-detail"],
    queryFn:  () => axios.get(`${BASE}/api/users?limit=100`).then(r => r.data?.data ?? []),
  });
  const staffList: any[] = staffData ?? [];
  const currentAssignedStaffId = (getValue("assignedStaffId") as string) ?? app?.assignedStaffId;

  // ── Open service edit dialog ───────────────────────────────────────────────
  function openEditSvc(type: string) {
    const meta = SERVICE_META[type];
    if (!meta || !app) return;
    const initial: Record<string, string> = {};
    meta.fields.forEach(f => { initial[f.key] = app[f.key] ? String(app[f.key]) : ""; });
    setSvcForm(initial);
    setEditingSvc(type);
  }

  // ── Reset add-service form when type changes ───────────────────────────────
  useEffect(() => {
    if (newSvcType) {
      const meta = SERVICE_META[newSvcType];
      if (meta) {
        const init: Record<string, string> = {};
        meta.fields.forEach(f => { init[f.key] = ""; });
        setNewSvcForm(init);
      }
    }
  }, [newSvcType]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleSaveSvc() {
    if (!editingSvc) return;
    const payload: Record<string, unknown> = {};
    Object.entries(svcForm).forEach(([k, v]) => { payload[k] = v || null; });
    saveSvcEdit.mutate(payload);
  }

  function handleAddSvc() {
    if (!newSvcType) { toast({ variant: "destructive", title: "Please select a service type" }); return; }
    const currentTypes: string[] = Array.isArray(app?.serviceTypes) ? app.serviceTypes : [];
    const updatedTypes = [...new Set([...currentTypes, newSvcType])];
    const payload: Record<string, unknown> = { serviceTypes: updatedTypes };
    Object.entries(newSvcForm).forEach(([k, v]) => { payload[k] = v || null; });
    saveAddSvc.mutate(payload);
  }

  // ── Loading / not found ───────────────────────────────────────────────────
  if (isLoading) return <div className="p-6 space-y-4">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>;
  if (!app) return <div className="p-6 text-muted-foreground">Application not found.</div>;

  const statusColor = STATUS_COLORS[app.applicationStatus ?? app.status ?? "pending"] ?? "bg-gray-100 text-gray-600";
  const serviceTypes: string[] = Array.isArray(app.serviceTypes) ? app.serviceTypes : [];
  const availableToAdd = ALL_SERVICE_TYPES.filter(t => !serviceTypes.includes(t));

  return (
    <>
      <DetailPageLayout
        title={app.applicationNumber ?? "Application"}
        subtitle={app.applicantName ?? app.studentName ?? ""}
        badge={<span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>{(app.applicationStatus ?? app.status ?? "pending").replace(/_/g, " ")}</span>}
        backPath="/admin/all-applications"
        backLabel="All Applications"
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isDirty={canEdit && activeTab === "overview" && isDirty}
        isSaving={isSaving}
        onSave={saveEdit}
        onCancel={cancelEdit}
        headerExtra={
          canEdit ? (
            app.quoteId ? (
              <a
                href={`${BASE}/admin/crm/quotes/${app.quoteId}`}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-(--e-orange) text-(--e-orange) text-xs font-medium hover:bg-(--e-orange-lt) transition-colors"
              >
                <FileText className="w-3.5 h-3.5" strokeWidth={1.5} />
                View Quote →
              </a>
            ) : (
              <Button
                size="sm"
                className="h-8 gap-1.5 text-xs bg-(--e-orange) hover:bg-(--e-orange-hover) text-white"
                onClick={() => setConvertQuoteDialog(true)}
                disabled={convertToQuote.isPending}
              >
                <FileText className="w-3.5 h-3.5" strokeWidth={1.5} />
                Convert to Quote
              </Button>
            )
          ) : null
        }
      >

        {/* ── Overview ─────────────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* ① Application Info */}
            <DetailSection title="Application Info">
              <DetailRow label="Application #" value={app.applicationNumber} />
              <EditableField label="Status" isEditing={isEditing}
                value={(app.applicationStatus ?? "submitted").replace(/_/g, " ")}
                editChildren={
                  <Select value={getValue("applicationStatus") ?? "submitted"} onValueChange={v => setField("applicationStatus", v)}>
                    <SelectTrigger className="h-8 text-sm border-(--e-orange)"><SelectValue /></SelectTrigger>
                    <SelectContent>{APPLICATION_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                  </Select>
                }
              />
              <DetailRow label="Submitted" value={app.createdAt ? formatDate(app.createdAt) : "—"} />
              {/* Service type tags */}
              <div className="flex items-start gap-1.5 flex-wrap pt-0.5">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide w-full mb-0.5">Services</span>
                {serviceTypes.length === 0
                  ? <span className="text-sm text-muted-foreground">—</span>
                  : serviceTypes.map(t => (
                    <span key={t} className="px-2 py-0.5 rounded-full bg-(--e-orange-lt) text-(--e-orange) text-xs font-medium border border-(--e-orange)/20">
                      {SERVICE_META[t]?.icon} {SERVICE_META[t]?.label ?? t.replace(/_/g, " ")}
                    </span>
                  ))
                }
              </div>
            </DetailSection>

            {/* ② Personal Information */}
            <DetailSection title="Personal Information">
              <EditableField label="Full Name" isEditing={isEditing}
                value={app.applicantName}
                editChildren={<Input className="h-8 text-sm" value={getValue("applicantName") ?? ""} onChange={e => setField("applicantName", e.target.value)} />}
              />
              <EditableField label="Nationality" isEditing={isEditing}
                value={app.applicantNationality}
                editChildren={<Input className="h-8 text-sm" value={getValue("applicantNationality") ?? ""} onChange={e => setField("applicantNationality", e.target.value)} />}
              />
              <EditableField label="Mobile Phone" isEditing={isEditing}
                value={app.applicantPhone}
                editChildren={<Input className="h-8 text-sm" value={getValue("applicantPhone") ?? ""} onChange={e => setField("applicantPhone", e.target.value)} />}
              />
              <EditableField label="Email" isEditing={isEditing}
                value={app.applicantEmail}
                editChildren={<Input className="h-8 text-sm" type="email" value={getValue("applicantEmail") ?? ""} onChange={e => setField("applicantEmail", e.target.value)} />}
              />
            </DetailSection>

            {/* ③ School Information */}
            <DetailSection title="School Information">
              <EditableField label="Institution" isEditing={isEditing}
                value={app.institutionName}
                editChildren={<Input className="h-8 text-sm" value={getValue("institutionName") ?? ""} onChange={e => setField("institutionName", e.target.value)} />}
              />
              <EditableField label="Course" isEditing={isEditing}
                value={app.courseName}
                editChildren={<Input className="h-8 text-sm" value={getValue("courseName") ?? ""} onChange={e => setField("courseName", e.target.value)} />}
              />
              <EditableField label="Enrollment From" isEditing={isEditing}
                value={app.studyStartDate ? formatDate(app.studyStartDate) : null}
                editChildren={<Input className="h-8 text-sm" type="date" value={getValue("studyStartDate") ?? ""} onChange={e => setField("studyStartDate", e.target.value)} />}
              />
              <EditableField label="Enrollment To" isEditing={isEditing}
                value={app.studyEndDate ? formatDate(app.studyEndDate) : null}
                editChildren={<Input className="h-8 text-sm" type="date" value={getValue("studyEndDate") ?? ""} onChange={e => setField("studyEndDate", e.target.value)} />}
              />
            </DetailSection>

            {/* ④ Agent */}
            <DetailSection title="Agent">
              <EditableField label="Agent Code" isEditing={isEditing}
                value={app.referralAgentCode}
                editChildren={<Input className="h-8 text-sm" value={getValue("referralAgentCode") ?? ""} onChange={e => setField("referralAgentCode", e.target.value)} />}
              />
              <EditableField label="Notes" isEditing={isEditing}
                value={app.notes ? app.notes.slice(0, 120) + (app.notes.length > 120 ? "…" : "") : null}
                editChildren={
                  <textarea
                    className="w-full rounded-md border border-(--e-orange) bg-background px-3 py-1.5 text-sm resize-y min-h-[80px] focus:outline-none"
                    value={getValue("notes") ?? ""}
                    onChange={e => setField("notes", e.target.value)}
                  />
                }
              />
            </DetailSection>

            {/* ⑤ Assignment */}
            <DetailSection title="Assignment">
              <DetailRow label="Assigned Staff">
                {canEdit ? (
                  <Select
                    value={currentAssignedStaffId ?? ""}
                    onValueChange={v => setField("assignedStaffId", v === "__none__" ? null : v as any)}
                  >
                    <SelectTrigger className="h-8 text-sm border-(--e-orange)">
                      <SelectValue placeholder="Select staff..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Unassigned —</SelectItem>
                      {staffList.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>{s.fullName ?? s.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span>{staffList.find((s: any) => s.id === app.assignedStaffId)?.fullName ?? "—"}</span>
                )}
              </DetailRow>
            </DetailSection>

            {/* ⑥ Linked Records */}
            {app.quoteId && (
              <DetailSection title="Linked Records">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Quote</span>
                  <a href={`${BASE}/admin/crm/quotes/${app.quoteId}`}
                    className="flex items-center gap-1 text-sm text-(--e-orange) hover:underline">
                    View Quote <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </DetailSection>
            )}

            <div className="lg:col-span-2">
              <SystemInfoSection
                id={app.id}
                recordIdLabel="Application ID"
                createdAt={app.createdAt}
                updatedAt={app.updatedAt}
                isActive={app.isActive ?? true}
                onToggleActive={() => toggleActiveMutation.mutate()}
                isToggling={toggleActiveMutation.isPending}
              />
            </div>
          </div>
        )}

        {/* ── Services ─────────────────────────────────────────────────── */}
        {activeTab === "services" && (
          <div className="space-y-4">
            {/* Toolbar */}
            {canEdit && (
              <div className="flex justify-end">
                <Button size="sm" className="bg-(--e-orange) hover:bg-(--e-orange-hover) text-white gap-1.5"
                  onClick={() => { setNewSvcType(""); setNewSvcForm({}); setAddSvcDialog(true); }}
                  disabled={availableToAdd.length === 0}
                >
                  <Plus className="w-3.5 h-3.5" /> Add Service
                </Button>
              </div>
            )}

            {serviceTypes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <ClipboardList className="w-8 h-8 mb-3 opacity-20" />
                <p className="text-sm">No services selected for this application.</p>
                {canEdit && <p className="text-xs mt-1">Click "Add Service" to add service types.</p>}
              </div>
            ) : (
              serviceTypes.map(t => {
                const meta = SERVICE_META[t];
                if (!meta) return (
                  <div key={t} className="rounded-xl border p-4 bg-muted/30">
                    <p className="text-sm font-medium capitalize">{t.replace(/_/g, " ")}</p>
                    <p className="text-xs text-muted-foreground mt-1">No configuration available for this service type.</p>
                  </div>
                );

                return (
                  <div key={t} className={`rounded-xl border p-5 ${meta.color}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{meta.icon}</span>
                        <h3 className="font-semibold text-sm text-[#1C1917]">{meta.label}</h3>
                      </div>
                      {canEdit && (
                        <Button size="sm" variant="outline" className="h-7 gap-1 text-xs border-stone-300 bg-white hover:bg-muted"
                          onClick={() => openEditSvc(t)}
                        >
                          <Pencil className="w-3 h-3" /> Edit
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-3">
                      {meta.fields.map(f => {
                        const val = app[f.key];
                        if (!val) return (
                          <div key={f.key}>
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">{f.label}</p>
                            <p className="text-xs text-muted-foreground italic">—</p>
                          </div>
                        );
                        let display = String(val);
                        if (f.type === "date") {
                          try { display = formatDate(val); } catch {}
                        }
                        return (
                          <div key={f.key}>
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">{f.label}</p>
                            <p className="text-sm text-[#1C1917]">{display}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── Participants ──────────────────────────────────────────────── */}
        {activeTab === "participants" && (
          <div className="space-y-3">
            {canEdit && (
              <div className="flex justify-end">
                <Button size="sm" className="bg-(--e-orange) hover:bg-[#d97706] text-white gap-1.5" onClick={() => setAddParticipant(true)}>
                  <Plus className="w-3.5 h-3.5" /> Add Participant
                </Button>
              </div>
            )}
            <div className="bg-card rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                    <th className="px-4 py-2.5 text-left w-8">#</th>
                    <th className="px-4 py-2.5 text-left">Name</th>
                    <th className="px-4 py-2.5 text-left">Type</th>
                    <th className="px-4 py-2.5 text-left">DOB</th>
                    <th className="px-4 py-2.5 text-left">Gender</th>
                    <th className="px-4 py-2.5 text-left">Nationality</th>
                    <th className="px-4 py-2.5 text-left">Grade</th>
                    <th className="px-4 py-2.5 text-left">Passport #</th>
                    {canEdit && <th className="px-4 py-2.5 w-10" />}
                  </tr>
                </thead>
                <tbody>
                  {participants.length === 0 ? (
                    <tr>
                      <td colSpan={canEdit ? 9 : 8} className="px-4 py-8 text-center text-muted-foreground text-xs">
                        No participants on this application.
                      </td>
                    </tr>
                  ) : participants.map((p: any, i: number) => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-(--e-orange-lt) transition-colors">
                      <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{p.fullName ?? "—"}</div>
                        {p.fullNameNative && <div className="text-xs text-muted-foreground">{p.fullNameNative}</div>}
                      </td>
                      <td className="px-4 py-3 capitalize">
                        <span className="px-1.5 py-0.5 bg-muted rounded text-xs">{p.participantType ?? "child"}</span>
                      </td>
                      <td className="px-4 py-3 text-sm">{p.dateOfBirth ? formatDate(p.dateOfBirth) : "—"}</td>
                      <td className="px-4 py-3 capitalize text-sm">{p.gender ?? "—"}</td>
                      <td className="px-4 py-3 text-sm">{p.nationality ?? "—"}</td>
                      <td className="px-4 py-3 text-sm">{p.grade ?? "—"}</td>
                      <td className="px-4 py-3 text-sm font-mono text-xs text-muted-foreground">{p.passportNumber ?? "—"}</td>
                      {canEdit && (
                        <td className="px-4 py-3">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditParticipant(p)}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Documents ────────────────────────────────────────────────── */}
        {activeTab === "documents" && (
          <EntityDocumentsTab entityType="application" entityId={id!} mode="full" />
        )}

        {/* ── Notes ────────────────────────────────────────────────────── */}
        {activeTab === "notes" && (
          <NotePanel entityType="application" entityId={id!} />
        )}

      </DetailPageLayout>

      {/* ── Convert to Quote Dialog ────────────────────────────────────── */}
      <Dialog open={convertQuoteDialog} onOpenChange={setConvertQuoteDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Convert to Quote?</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              This will create a new draft Quote in the CRM from this application's data. The application status will be updated to <strong>Quoted</strong>. This action cannot be undone.
            </p>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setConvertQuoteDialog(false)}>Cancel</Button>
            <Button size="sm" className="bg-(--e-orange) hover:bg-(--e-orange-hover) text-white"
              onClick={() => convertToQuote.mutate()} disabled={convertToQuote.isPending}>
              {convertToQuote.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Convert to Quote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Service Dialog ────────────────────────────────────────── */}
      <Dialog open={!!editingSvc} onOpenChange={open => { if (!open) { setEditingSvc(null); setSvcForm({}); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingSvc && SERVICE_META[editingSvc] && (
                <>
                  <span>{SERVICE_META[editingSvc].icon}</span>
                  <span>Edit — {SERVICE_META[editingSvc].label}</span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {editingSvc && SERVICE_META[editingSvc]?.fields.map(f => (
              <SvcField
                key={f.key}
                def={f}
                value={svcForm[f.key] ?? ""}
                onChange={v => setSvcForm(prev => ({ ...prev, [f.key]: v }))}
              />
            ))}
          </div>

          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={() => { setEditingSvc(null); setSvcForm({}); }}>Cancel</Button>
            <Button size="sm" className="bg-(--e-orange) hover:bg-(--e-orange-hover) text-white"
              onClick={handleSaveSvc} disabled={saveSvcEdit.isPending}>
              {saveSvcEdit.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Service Dialog ─────────────────────────────────────────── */}
      <Dialog open={addSvcDialog} onOpenChange={open => { if (!open) { setAddSvcDialog(false); setNewSvcType(""); setNewSvcForm({}); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Service</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Service type selector */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-[#57534E] uppercase tracking-wide">Service Type</Label>
              <select
                value={newSvcType}
                onChange={e => setNewSvcType(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-(--e-orange)/50"
              >
                <option value="">Please Select</option>
                {availableToAdd.map(t => (
                  <option key={t} value={t}>{SERVICE_META[t]?.label ?? t.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>

            {/* Dynamic fields for selected type */}
            {newSvcType && SERVICE_META[newSvcType]?.fields.map(f => (
              <SvcField
                key={f.key}
                def={f}
                value={newSvcForm[f.key] ?? ""}
                onChange={v => setNewSvcForm(prev => ({ ...prev, [f.key]: v }))}
              />
            ))}
          </div>

          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={() => { setAddSvcDialog(false); setNewSvcType(""); setNewSvcForm({}); }}>Cancel</Button>
            <Button size="sm" className="bg-(--e-orange) hover:bg-(--e-orange-hover) text-white"
              onClick={handleAddSvc} disabled={saveAddSvc.isPending || !newSvcType}>
              {saveAddSvc.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Service"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Participant Dialogs ────────────────────────────────────────── */}
      {editParticipant && (
        <ParticipantEditDialog
          participant={editParticipant}
          open={!!editParticipant}
          onClose={() => setEditParticipant(null)}
          onSave={(data) => updateParticipant.mutate({ pid: editParticipant.id, data })}
          saving={updateParticipant.isPending}
        />
      )}

      <ParticipantAddDialog
        applicationId={id!}
        open={addParticipant}
        onClose={() => setAddParticipant(false)}
        onSave={(data) => createParticipant.mutate(data)}
        saving={createParticipant.isPending}
      />
    </>
  );
}
