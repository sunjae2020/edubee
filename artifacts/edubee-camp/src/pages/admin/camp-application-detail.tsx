import { useState } from "react";
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
import { ParticipantEditDialog, ParticipantAddDialog } from "@/components/shared/ParticipantDialogs";
import { Pencil, Plus, ClipboardList, ExternalLink } from "lucide-react";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const APP_STATUSES = ["pending", "reviewing", "interview_scheduled", "interview_done", "approved", "rejected", "cancelled", "converted"];
const GENDERS = ["male", "female", "other", "prefer_not_to_say"];
const ENGLISH_LEVELS = ["beginner", "elementary", "pre_intermediate", "intermediate", "upper_intermediate", "advanced", "proficient"];

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "participants", label: "Participants" },
  { key: "documents", label: "Documents" },
  { key: "notes", label: "Notes" },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  reviewing: "bg-blue-100 text-blue-700",
  interview_scheduled: "bg-orange-100 text-orange-700",
  interview_done: "bg-purple-100 text-purple-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-600",
  converted: "bg-teal-100 text-teal-700",
  completed: "bg-teal-100 text-teal-700",
  scheduled: "bg-blue-100 text-blue-700",
  rescheduled: "bg-orange-100 text-orange-700",
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CampApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  const [editParticipant, setEditParticipant] = useState<any | null>(null);
  const [addParticipant, setAddParticipant] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["camp-application-detail-page", id],
    queryFn: () => axios.get(`${BASE}/api/applications/${id}`).then(r => r.data),
  });

  const app = data?.data ?? data;
  const participants: any[] = app?.participants ?? [];

  const isContracted = app?.status === "contracted";
  const canEdit = ["super_admin", "admin", "camp_coordinator"].includes(user?.role ?? "") && !isContracted;

  const updateApp = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      axios.put(`${BASE}/api/applications/${id}`, payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["camp-application-detail-page", id] });
      qc.invalidateQueries({ queryKey: ["camp-applications"] });
      toast({ title: "Camp Application updated" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to update" }),
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
      axios.post(`${BASE}/api/applications/participants`, { ...data, applicationId: id }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["camp-application-detail-page", id] });
      toast({ title: "Participant added" });
      setAddParticipant(false);
    },
    onError: () => toast({ variant: "destructive", title: "Failed to add participant" }),
  });

  const { isEditing, isSaving, startEdit, cancelEdit, setField, saveEdit, getValue } = useDetailEdit({
    initialData: app ?? {},
    onSave: async (data) => { await updateApp.mutateAsync(data); },
  });

  if (isLoading) return <div className="p-6 space-y-4">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>;
  if (!app) return <div className="p-6 text-muted-foreground">Camp Application not found.</div>;

  const statusColor = STATUS_COLORS[app.status ?? "pending"] ?? "bg-gray-100 text-gray-600";

  return (
    <>
      <DetailPageLayout
        title={app.applicationNumber ?? "Camp Application"}
        subtitle={app.studentName ?? ""}
        badge={<span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>{(app.status ?? "pending").replace(/_/g, " ")}</span>}
        backPath="/admin/camp-applications"
        backLabel="Camp Applications"
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={(t) => { setActiveTab(t); if (isEditing) cancelEdit(); }}
        canEdit={canEdit && activeTab === "overview"}
        isEditing={isEditing}
        isSaving={isSaving}
        onEdit={startEdit}
        onSave={saveEdit}
        onCancel={cancelEdit}
      >
        {/* ── Contracted Banner ── */}
        {app.status === "contracted" && app.contractId && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-green-800">
              <ClipboardList className="w-4 h-4 flex-shrink-0" />
              <span>
                Converted to Contract <strong>{app.contractNumber}</strong> — manage services in Contracts.
              </span>
            </div>
            <a
              href={`${BASE}/admin/crm/contracts/${app.contractId}`}
              className="flex items-center gap-1 rounded-md border border-green-300 bg-white px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-50 transition-colors"
            >
              View Contract <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* ── Overview ── */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <DetailSection title="Camp Application Info">
              <DetailRow label="Application #" value={app.applicationNumber} />
              <EditableField label="Status" isEditing={isEditing} value={app.status?.replace(/_/g, " ")}
                editChildren={
                  <Select value={getValue("status")} onValueChange={v => setField("status", v)}>
                    <SelectTrigger className="h-8 text-sm border-[#F5821F]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {APP_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                } />
              <DetailRow label="Primary Language" value={app.primaryLanguage} />
              <DetailRow label="Referral Source" value={app.referralSource} />
              <DetailRow label="Total Children" value={app.totalChildren} />
              <DetailRow label="Total Adults" value={app.totalAdults} />
              <DetailRow label="Submitted" value={app.createdAt ? format(new Date(app.createdAt), "PPP") : "—"} />
            </DetailSection>

            <DetailSection title="Package Info">
              <DetailRow label="Package Group" value={app.packageGroupName ?? app.packageGroupId} />
              <DetailRow label="Package" value={app.packageName ?? app.packageId} />
              <DetailRow label="Preferred Start" value={app.preferredStartDate ? format(new Date(app.preferredStartDate), "PPP") : "—"} />
              <DetailRow label="Currency" value={app.currency} />
              <DetailRow label="Total Amount" value={app.totalAmount ? `${app.currency ?? ""} ${Number(app.totalAmount).toLocaleString()}` : "—"} />
            </DetailSection>

            <DetailSection title="Student Info">
              <DetailRow label="Student Name" value={app.studentName} />
              <DetailRow label="Email" value={app.clientEmail} />
              <DetailRow label="Phone" value={app.clientPhone} />
              <DetailRow label="Country" value={app.clientCountry} />
            </DetailSection>

            <DetailSection title="Agent Info">
              <DetailRow label="Agent" value={app.agentName ?? app.agentId} />
              <DetailRow label="Referral Code" value={app.referralAgentCode} />
              <DetailRow label="Special Requests" value={app.specialRequests} />
            </DetailSection>
            <div className="lg:col-span-2">
              <SystemInfoSection owner={app.agentId ?? null} createdAt={app.createdAt} updatedAt={app.updatedAt} />
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
                      No participants on this camp application.
                    </td>
                  </tr>
                ) : participants.map((p: any, i: number) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-[#FEF0E3] transition-colors">
                    <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{p.fullName ?? "—"}</div>
                      {p.fullNameNative && <div className="text-xs text-muted-foreground">{p.fullNameNative}</div>}
                    </td>
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
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditParticipant(p)} title="Edit participant">
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

      {/* ── Participant Edit Dialog ── */}
      {editParticipant && (
        <ParticipantEditDialog
          participant={editParticipant}
          open={!!editParticipant}
          onClose={() => setEditParticipant(null)}
          onSave={(data) => updateParticipant.mutate({ pid: editParticipant.id, data })}
          saving={updateParticipant.isPending}
        />
      )}

      {/* ── Add Participant Dialog ── */}
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
