import { useState } from "react";
import { useParams, useLocation } from "wouter";
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
import { ParticipantEditDialog, ParticipantAddDialog } from "@/components/shared/ParticipantDialogs";
import { Pencil, Plus, Check, ArrowRight, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const APP_STATUSES = ["submitted", "reviewing", "quoted", "confirmed", "cancelled"];

const TABS = [
  { key: "overview",     label: "Overview" },
  { key: "participants", label: "Participants" },
  { key: "documents",    label: "Documents" },
  { key: "notes",        label: "Notes" },
];

const STATUS_LABELS: Record<string, string> = {
  submitted: "Submitted",
  reviewing: "Reviewing",
  quoted:    "Quoted",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
};

const STATUS_BADGE: Record<string, string> = {
  submitted: "bg-[#F4F3F1] text-[#57534E]",
  reviewing: "bg-[#FEF0E3] text-[#F5821F]",
  quoted:    "bg-[#FEF9C3] text-[#CA8A04]",
  confirmed: "bg-[#DCFCE7] text-[#16A34A]",
  cancelled: "bg-[#FEF2F2] text-[#DC2626]",
};

const WORKFLOW_STEPS = ["submitted", "reviewing", "quoted", "confirmed"] as const;

// ─── Workflow Progress Bar ────────────────────────────────────────────────────
function WorkflowBar({ status }: { status: string }) {
  const isCancelled = status === "cancelled";
  const currentIdx  = WORKFLOW_STEPS.indexOf(status as typeof WORKFLOW_STEPS[number]);

  return (
    <div className="mb-6 rounded-xl border border-[#E8E6E2] bg-white px-6 py-4">
      {isCancelled && (
        <div className="mb-3 flex items-center gap-2">
          <span className="rounded-full bg-[#FEF2F2] px-3 py-0.5 text-xs font-medium text-[#DC2626]">
            Cancelled
          </span>
          <span className="text-xs text-[#A8A29E]">This application has been cancelled.</span>
        </div>
      )}
      <div className="flex items-center gap-0">
        {WORKFLOW_STEPS.map((step, i) => {
          const isDone    = !isCancelled && currentIdx > i;
          const isCurrent = !isCancelled && currentIdx === i;
          const label     = STATUS_LABELS[step];

          let circleStyle = "bg-[#F4F3F1] text-[#A8A29E]";
          let textStyle   = "text-[#A8A29E]";
          if (isCancelled) {
            circleStyle = "bg-[#F4F3F1] text-[#A8A29E]";
            textStyle   = "text-[#A8A29E]";
          } else if (isDone) {
            circleStyle = "bg-[#DCFCE7] text-[#16A34A]";
            textStyle   = "text-[#16A34A] font-medium";
          } else if (isCurrent) {
            circleStyle = "bg-[#FEF0E3] text-[#F5821F] border border-[#F5821F]";
            textStyle   = "text-[#F5821F] font-semibold";
          }

          return (
            <div key={step} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center gap-1.5">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 ${circleStyle}`}>
                  {isDone ? <Check className="w-4 h-4" /> : isCurrent ? "●" : "○"}
                </div>
                <span className={`text-xs whitespace-nowrap ${textStyle}`}>{label}</span>
              </div>
              {i < WORKFLOW_STEPS.length - 1 && (
                <div className="flex-1 h-px bg-[#E8E6E2] mx-2 mb-4" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Action Buttons ───────────────────────────────────────────────────────────
function ConvertButton({
  label,
  loading,
  loadingLabel,
  onClick,
}: {
  label: string;
  loading: boolean;
  loadingLabel?: string;
  onClick: () => void;
}) {
  return (
    <button
      disabled={loading}
      onClick={onClick}
      style={{
        background: loading ? "#D96A0A" : "#F5821F",
        color: "white",
        border: "none",
        borderRadius: 8,
        padding: "8px 18px",
        fontWeight: 600,
        fontSize: 14,
        cursor: loading ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        gap: 8,
        transition: "background 0.15s, transform 0.15s",
        opacity: loading ? 0.8 : 1,
      }}
      onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "none"; }}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {loading ? (loadingLabel ?? "Processing...") : label}
    </button>
  );
}

function ActionButtons({
  app,
  id,
  onStatusChange,
  statusChanging,
  onConvertDone,
}: {
  app: any;
  id: string;
  onStatusChange: (s: string) => void;
  statusChanging: boolean;
  onConvertDone: () => void;
}) {
  const [, navigate]               = useLocation();
  const { toast }                  = useToast();
  const [convertingQuote, setConvertingQuote]       = useState(false);
  const [convertingContract, setConvertingContract] = useState(false);
  const status = app.applicationStatus ?? app.status;

  const handleConvertToQuote = async () => {
    setConvertingQuote(true);
    try {
      const res = await axios.post(`${BASE}/api/camp-applications/${id}/convert-to-quote`);
      toast({ title: "Quote created!", description: `Ref: ${res.data.quoteRefNumber}` });
      onConvertDone();
      navigate(`/admin/crm/quotes/${res.data.quoteId}`);
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? "Failed to convert to quote";
      toast({ variant: "destructive", title: msg });
    } finally {
      setConvertingQuote(false);
    }
  };

  const handleConvertToContract = async () => {
    setConvertingContract(true);
    try {
      const res = await axios.post(`${BASE}/api/camp-applications/${id}/convert-to-contract`);
      toast({ title: "Contract created!", description: `Ref: ${res.data.contractNumber}` });
      onConvertDone();
      navigate(`/admin/crm/contracts/${res.data.contractId}`);
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? "Failed to convert to contract";
      toast({ variant: "destructive", title: msg });
    } finally {
      setConvertingContract(false);
    }
  };

  if (status === "submitted") {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={statusChanging || convertingQuote}
          onClick={() => onStatusChange("reviewing")}
          className="border-[#E8E6E2] text-[#57534E] hover:bg-[#F4F3F1]"
        >
          {statusChanging ? "Updating..." : "Mark as Reviewing"}
        </Button>
        <ConvertButton
          label="Convert to Quote"
          loading={convertingQuote}
          loadingLabel="Converting..."
          onClick={handleConvertToQuote}
        />
      </div>
    );
  }

  if (status === "reviewing") {
    return (
      <ConvertButton
        label="Convert to Quote"
        loading={convertingQuote}
        loadingLabel="Converting..."
        onClick={handleConvertToQuote}
      />
    );
  }

  if (status === "quoted") {
    return (
      <div className="flex items-center gap-2">
        {app.quoteId && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/admin/crm/quotes/${app.quoteId}`)}
            className="border-[#E8E6E2] text-[#57534E] hover:bg-[#F4F3F1] gap-1"
          >
            View Quote <ArrowRight className="w-4 h-4" />
          </Button>
        )}
        <ConvertButton
          label="Convert to Contract"
          loading={convertingContract}
          loadingLabel="Converting..."
          onClick={handleConvertToContract}
        />
      </div>
    );
  }

  if (status === "confirmed") {
    return (
      <div className="flex items-center gap-2">
        {app.quoteId && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/admin/crm/quotes/${app.quoteId}`)}
            className="border-[#E8E6E2] text-[#57534E] hover:bg-[#F4F3F1] gap-1"
          >
            View Quote <ArrowRight className="w-4 h-4" />
          </Button>
        )}
        {app.contractId && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/admin/crm/contracts/${app.contractId}`)}
            className="border-[#E8E6E2] text-[#57534E] hover:bg-[#F4F3F1] gap-1"
          >
            View Contract <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    );
  }

  if (status === "cancelled") {
    return (
      <ConvertButton
        label="Convert to Quote"
        loading={convertingQuote}
        loadingLabel="Converting..."
        onClick={handleConvertToQuote}
      />
    );
  }

  return null;
}

// ─── Linked Records Card ──────────────────────────────────────────────────────
function LinkedRecordsCard({ app }: { app: any }) {
  const [, navigate] = useLocation();

  return (
    <DetailSection title="Linked Records">
      <DetailRow label="Quote">
        {app.quoteId ? (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">{app.quoteRefNumber ?? app.quoteId}</span>
            <button
              onClick={() => navigate(`/admin/crm/quotes/${app.quoteId}`)}
              className="text-sm font-medium text-[#F5821F] hover:text-[#d97706] transition-colors"
              style={{ background: "none", border: "none", cursor: "pointer" }}
            >
              View →
            </button>
          </div>
        ) : (
          <span className="text-muted-foreground/60">Not created yet</span>
        )}
      </DetailRow>
      <DetailRow label="Contract">
        {app.contractId ? (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">{app.contractNumber ?? app.contractId}</span>
            <button
              onClick={() => navigate(`/admin/crm/contracts/${app.contractId}`)}
              className="text-sm font-medium text-[#F5821F] hover:text-[#d97706] transition-colors"
              style={{ background: "none", border: "none", cursor: "pointer" }}
            >
              View →
            </button>
          </div>
        ) : (
          <span className="text-muted-foreground/60">Not created yet</span>
        )}
      </DetailRow>
    </DetailSection>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CampApplicationDetail() {
  const { id }           = useParams<{ id: string }>();
  const [, navigate]     = useLocation();
  const qc               = useQueryClient();
  const { toast }        = useToast();
  const { user }         = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  const [editParticipant, setEditParticipant] = useState<any | null>(null);
  const [addParticipant,  setAddParticipant]  = useState(false);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["camp-application-detail-page", id],
    queryFn: async () => {
      const url = `${BASE}/api/camp-applications/${id}`;
      const res = await axios.get(url);
      return res.data;
    },
    enabled: !!id,
    retry: 2,
    retryDelay: 800,
  });

  const app          = data?.data ?? data;
  const participants: any[] = app?.participants ?? [];

  const appStatus    = app?.applicationStatus ?? app?.status ?? "submitted";
  const isContracted = appStatus === "confirmed";
  const canEdit      = ["super_admin", "admin", "camp_coordinator"].includes(user?.role ?? "") &&
                       !isContracted;

  const { data: staffData } = useQuery({
    queryKey: ["staff-list-for-camp"],
    queryFn: () => axios.get(`${BASE}/api/users?limit=100`).then(r => r.data?.data ?? []),
  });
  const staffList: any[] = staffData ?? [];

  const updateApp = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      axios.put(`${BASE}/api/camp-applications/${id}`, payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["camp-application-detail-page", id] });
      qc.invalidateQueries({ queryKey: ["camp-applications"] });
      toast({ title: "Camp Application updated" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to update" }),
  });

  const changeStatus = useMutation({
    mutationFn: (newStatus: string) =>
      axios.patch(`${BASE}/api/camp-applications/${id}/status`, { applicationStatus: newStatus }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["camp-application-detail-page", id] });
      qc.invalidateQueries({ queryKey: ["camp-applications"] });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to update status" }),
  });

  const updateParticipant = useMutation({
    mutationFn: ({ pid, data }: { pid: string; data: Record<string, any> }) =>
      axios.patch(`${BASE}/api/applications/participants/${pid}`, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["camp-application-detail-page", id] });
      toast({ title: "Participant updated" });
      setEditParticipant(null);
    },
    onError: () => toast({ variant: "destructive", title: "Failed to update participant" }),
  });

  const createParticipant = useMutation({
    mutationFn: (data: Record<string, any>) =>
      axios.post(`${BASE}/api/applications/participants`, { ...data, campApplicationId: id }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["camp-application-detail-page", id] });
      toast({ title: "Participant added" });
      setAddParticipant(false);
    },
    onError: () => toast({ variant: "destructive", title: "Failed to add participant" }),
  });

  const { isEditing, isDirty, isSaving, cancelEdit, setField, saveEdit, getValue } = useDetailEdit({
    initialData: app ?? {},
    onSave: async (data) => { await updateApp.mutateAsync(data); },
    alwaysEdit: true,
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-20 rounded-xl bg-[#F4F3F1] animate-pulse" />
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}
      </div>
    );
  }

  if (isError) {
    const errStatus = (error as any)?.response?.status;
    if (errStatus === 404) {
      return (
        <div className="m-6 rounded-lg border border-[#E8E6E2] bg-[#FAFAF9] px-5 py-6 text-center space-y-3">
          <p className="text-sm font-medium text-[#1C1917]">Camp Application not found.</p>
          <p className="text-xs text-[#78716C]">This record may have been deleted or the link is incorrect.</p>
          <button
            onClick={() => navigate("/admin/all-applications")}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#F5821F] px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
          >
            ← Back to All Applications
          </button>
        </div>
      );
    }
    const errMsg = (error as any)?.response?.data?.message
      || (error as any)?.response?.data?.error
      || (error as any)?.message
      || String(error);
    return (
      <div className="m-6 rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-4 text-sm text-[#DC2626] space-y-2">
        <div className="flex items-center gap-4">
          <span className="font-medium">Failed to load camp application.</span>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="ml-auto shrink-0 rounded-md bg-[#DC2626] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#b91c1c] disabled:opacity-50"
          >
            {isFetching ? "Retrying…" : "Try Again"}
          </button>
        </div>
        <p className="text-xs text-[#991B1B]">{errMsg}</p>
      </div>
    );
  }

  if (!app) return <div className="p-6 text-muted-foreground">Camp Application not found.</div>;

  const badgeCls = STATUS_BADGE[appStatus] ?? "bg-[#F4F3F1] text-[#57534E]";

  const badge = (
    <span style={{ borderRadius: 999, padding: "3px 12px", fontSize: 12, fontWeight: 500 }}
      className={badgeCls}>
      {STATUS_LABELS[appStatus] ?? appStatus}
    </span>
  );

  const headerActions = (
    <ActionButtons
      app={app}
      id={id!}
      onStatusChange={(s) => changeStatus.mutate(s)}
      statusChanging={changeStatus.isPending}
      onConvertDone={() => qc.invalidateQueries({ queryKey: ["camp-application-detail-page", id] })}
    />
  );

  return (
    <>
      <DetailPageLayout
        title={app.applicationRef ?? app.applicationNumber ?? "Camp Application"}
        subtitle={
          app.applicantFirstName || app.applicantLastName
            ? `${app.applicantFirstName ?? ""} ${app.applicantLastName ? app.applicantLastName.toUpperCase() : ""}`.trim()
            : (app.applicantName ?? app.studentName ?? "")
        }
        badge={badge}
        backPath="/admin/all-applications"
        backLabel="All Applications"
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isDirty={canEdit && activeTab === "overview" && isDirty}
        isSaving={isSaving}
        onSave={saveEdit}
        onCancel={cancelEdit}
        headerExtra={headerActions}
      >
        {/* ── Workflow Progress Bar ── */}
        <WorkflowBar status={appStatus} />

        {/* ── Overview ── */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <DetailSection title="Camp Application Info">
                <DetailRow label="Application #" value={app.applicationRef ?? app.applicationNumber} />
                <EditableField
                  label="Status"
                  isEditing={isEditing}
                  value={STATUS_LABELS[appStatus] ?? appStatus}
                  editChildren={
                    <Select value={getValue("applicationStatus")} onValueChange={v => setField("applicationStatus", v)}>
                      <SelectTrigger className="h-8 text-sm border-[#F5821F]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {APP_STATUSES.map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  }
                />
                <EditableField
                  label="First Name"
                  isEditing={isEditing}
                  value={app.applicantFirstName ?? (app.applicantName ? app.applicantName.split(" ")[0] : "—")}
                  editValue={getValue("applicantFirstName") ?? app.applicantFirstName ?? (app.applicantName ? app.applicantName.split(" ")[0] : "")}
                  onChange={v => setField("applicantFirstName", v)}
                />
                <EditableField
                  label="Last Name"
                  isEditing={isEditing}
                  value={app.applicantLastName ? app.applicantLastName.toUpperCase() : (app.applicantName ? app.applicantName.split(" ").slice(1).join(" ").toUpperCase() : "—")}
                  editValue={getValue("applicantLastName") ?? app.applicantLastName ?? (app.applicantName ? app.applicantName.split(" ").slice(1).join(" ") : "")}
                  onChange={v => setField("applicantLastName", v)}
                />
                <EditableField
                  label="Original Name"
                  isEditing={isEditing}
                  value={app.applicantOriginalName ?? "—"}
                  editValue={getValue("applicantOriginalName") ?? app.applicantOriginalName ?? ""}
                  onChange={v => setField("applicantOriginalName", v)}
                />
                <EditableField
                  label="English Name (Nick Name)"
                  isEditing={isEditing}
                  value={app.applicantEnglishName ?? "—"}
                  editValue={getValue("applicantEnglishName") ?? app.applicantEnglishName ?? ""}
                  onChange={v => setField("applicantEnglishName", v)}
                />
                <EditableField
                  label="Email"
                  isEditing={isEditing}
                  value={app.applicantEmail}
                  editValue={getValue("applicantEmail") ?? ""}
                  onChange={v => setField("applicantEmail", v)}
                  inputType="email"
                />
                <EditableField
                  label="Phone"
                  isEditing={isEditing}
                  value={app.applicantPhone}
                  editValue={getValue("applicantPhone") ?? ""}
                  onChange={v => setField("applicantPhone", v)}
                />
                <EditableField
                  label="Nationality"
                  isEditing={isEditing}
                  value={app.applicantNationality}
                  editValue={getValue("applicantNationality") ?? ""}
                  onChange={v => setField("applicantNationality", v)}
                />
                <EditableField
                  label="DOB"
                  isEditing={isEditing}
                  value={app.applicantDob ?? ""}
                  editValue={getValue("applicantDob") ?? ""}
                  onChange={v => setField("applicantDob", v)}
                  inputType="date"
                />
                <EditableField
                  label="Adults"
                  isEditing={isEditing}
                  value={app.adultCount}
                  editValue={getValue("adultCount") != null ? String(getValue("adultCount")) : ""}
                  onChange={v => setField("adultCount", v ? Number(v) : null)}
                  inputType="number"
                />
                <EditableField
                  label="Students"
                  isEditing={isEditing}
                  value={app.studentCount}
                  editValue={getValue("studentCount") != null ? String(getValue("studentCount")) : ""}
                  onChange={v => setField("studentCount", v ? Number(v) : null)}
                  inputType="number"
                />
                <DetailRow label="Submitted" value={app.createdAt ? format(new Date(app.createdAt), "PPP") : "—"} />
              </DetailSection>

              <DetailSection title="Package Info">
                <DetailRow label="Package Group" value={app.packageGroupName ?? app.packageGroupId} />
                <DetailRow label="Package"       value={app.packageName     ?? app.packageId} />
                <EditableField
                  label="Preferred Start"
                  isEditing={isEditing}
                  value={app.preferredStartDate ? format(new Date(app.preferredStartDate), "PPP") : "—"}
                  editValue={getValue("preferredStartDate") ?? ""}
                  onChange={v => setField("preferredStartDate", v)}
                  inputType="date"
                />
                <EditableField
                  label="Special Req."
                  isEditing={isEditing}
                  value={app.specialRequirements}
                  editValue={getValue("specialRequirements") ?? ""}
                  onChange={v => setField("specialRequirements", v)}
                  multiline
                />
                <EditableField
                  label="Dietary"
                  isEditing={isEditing}
                  value={app.dietaryRequirements}
                  editValue={getValue("dietaryRequirements") ?? ""}
                  onChange={v => setField("dietaryRequirements", v)}
                  multiline
                />
                <EditableField
                  label="Medical"
                  isEditing={isEditing}
                  value={app.medicalConditions}
                  editValue={getValue("medicalConditions") ?? ""}
                  onChange={v => setField("medicalConditions", v)}
                  multiline
                />
              </DetailSection>

              <DetailSection title="Emergency Contact">
                <EditableField
                  label="Name"
                  isEditing={isEditing}
                  value={app.emergencyContactName}
                  editValue={getValue("emergencyContactName") ?? ""}
                  onChange={v => setField("emergencyContactName", v)}
                />
                <EditableField
                  label="Phone"
                  isEditing={isEditing}
                  value={app.emergencyContactPhone}
                  editValue={getValue("emergencyContactPhone") ?? ""}
                  onChange={v => setField("emergencyContactPhone", v)}
                />
              </DetailSection>

              <DetailSection title="Assignment">
                <EditableField
                  label="Assigned Staff"
                  isEditing={isEditing}
                  value={staffList.find(s => s.id === app.assignedStaffId)?.name ?? app.assignedStaffId ?? "—"}
                  editChildren={
                    <Select
                      value={getValue("assignedStaffId") ?? ""}
                      onValueChange={v => setField("assignedStaffId", v === "__none__" ? null : v)}
                    >
                      <SelectTrigger className="h-8 text-sm border-[#F5821F]"><SelectValue placeholder="Select staff..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Unassigned —</SelectItem>
                        {staffList.map((s: any) => (
                          <SelectItem key={s.id} value={s.id}>{s.name ?? s.email}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  }
                />
                <DetailRow label="Lead ID"   value={app.leadId} />
                <DetailRow label="Quoted At" value={app.quotedAt ? format(new Date(app.quotedAt), "PPP p") : "—"} />
              </DetailSection>

              <div className="lg:col-span-2">
                <LinkedRecordsCard app={app} />
              </div>

              <div className="lg:col-span-2">
                <SystemInfoSection
                  owner={app.assignedStaffId ?? null}
                  createdAt={app.createdAt}
                  updatedAt={app.updatedAt}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Participants ── */}
        {activeTab === "participants" && (
          <div className="space-y-3">
            {canEdit ? (
              <div className="flex justify-end">
                <Button size="sm" className="bg-[#F5821F] hover:bg-[#d97706] text-white gap-1.5" onClick={() => setAddParticipant(true)}>
                  <Plus className="w-3.5 h-3.5" /> Add Participant
                </Button>
              </div>
            ) : isContracted ? (
              <p className="text-xs text-muted-foreground text-right">Participants are read-only after contract conversion.</p>
            ) : null}
            <div className="bg-card rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                    <th className="px-4 py-2.5 text-left w-8">#</th>
                    <th className="px-4 py-2.5 text-left">Name</th>
                    <th className="px-4 py-2.5 text-left">Original Name</th>
                    <th className="px-4 py-2.5 text-left">English Name</th>
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
                      <td colSpan={canEdit ? 11 : 10} className="px-4 py-8 text-center text-muted-foreground text-xs">
                        No participants on this camp application.
                      </td>
                    </tr>
                  ) : participants.map((p: any, i: number) => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-[#FEF0E3] transition-colors">
                      <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{p.fullName ?? "—"}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">{p.fullNameNative ?? "—"}</td>
                      <td className="px-4 py-3 text-sm">{p.englishName ?? "—"}</td>
                      <td className="px-4 py-3 capitalize">
                        <span className="px-1.5 py-0.5 bg-muted rounded text-xs">{p.participantType ?? "child"}</span>
                      </td>
                      <td className="px-4 py-3 text-sm">{p.dateOfBirth ? format(new Date(p.dateOfBirth), "MMM d, yyyy") : "—"}</td>
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

        {/* ── Documents ── */}
        {activeTab === "documents" && (
          <EntityDocumentsTab entityType="application" entityId={id!} mode="full" />
        )}

        {/* ── Notes ── */}
        {activeTab === "notes" && (
          <NotePanel entityType="application" entityId={id!} />
        )}
      </DetailPageLayout>

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
