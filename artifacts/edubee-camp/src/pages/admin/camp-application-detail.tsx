import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { DetailPageLayout, DetailSection, DetailRow, EditableField } from "@/components/shared/DetailPageLayout";
import { useDetailEdit } from "@/hooks/useDetailEdit";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { NotePanel } from "@/components/shared/NotePanel";
import EntityDocumentsTab from "@/components/shared/EntityDocumentsTab";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ParticipantEditDialog, ParticipantAddDialog } from "@/components/shared/ParticipantDialogs";
import { Pencil, Plus, Calendar, Video, MapPin, User, ClipboardList, Loader2, ExternalLink } from "lucide-react";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const APP_STATUSES = ["pending", "reviewing", "interview_scheduled", "interview_done", "approved", "rejected", "cancelled", "converted"];
const INTERVIEW_STATUSES = ["pending", "scheduled", "completed", "cancelled", "rescheduled"];
const INTERVIEW_RESULTS = ["__none", "pass", "fail", "pending"];
const INTERVIEW_FORMATS = ["online", "in_person", "phone"];
const GENDERS = ["male", "female", "other", "prefer_not_to_say"];
const ENGLISH_LEVELS = ["beginner", "elementary", "pre_intermediate", "intermediate", "upper_intermediate", "advanced", "proficient"];

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "participants", label: "Participants" },
  { key: "interview", label: "Interview" },
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

// ─── Interview Edit Dialog ────────────────────────────────────────────────────
function InterviewDialog({
  interview,
  applicationId,
  open,
  onClose,
  onSave,
  saving,
}: {
  interview: any | null;
  applicationId: string;
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
          <div className="grid grid-cols-2 gap-3">
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
          <Button size="sm" className="bg-[#F5821F] hover:bg-[#d97706] text-white gap-1.5" onClick={() => onSave({ ...form, applicationId })} disabled={saving || !form.scheduledDatetime}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            {isNew ? "Schedule" : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CampApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  const [editParticipant, setEditParticipant] = useState<any | null>(null);
  const [addParticipant, setAddParticipant] = useState(false);
  const [editInterview, setEditInterview] = useState<any | null>(null);
  const [newInterview, setNewInterview] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["camp-application-detail-page", id],
    queryFn: () => axios.get(`${BASE}/api/applications/${id}`).then(r => r.data),
  });

  const { data: interviewData, isLoading: interviewLoading } = useQuery({
    queryKey: ["camp-app-interviews-page", id],
    queryFn: () => axios.get(`${BASE}/api/interview-schedules?applicationId=${id}`).then(r => r.data),
    enabled: activeTab === "interview",
  });

  const app = data?.data ?? data;
  const participants: any[] = app?.participants ?? [];
  const interviews: any[] = interviewData?.data ?? [];

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

  const updateInterview = useMutation({
    mutationFn: ({ iid, data }: { iid: string; data: Record<string, any> }) =>
      axios.patch(`${BASE}/api/interview-schedules/${iid}`, {
        ...data,
        scheduledDatetime: data.scheduledDatetime ? new Date(data.scheduledDatetime).toISOString() : undefined,
      }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["camp-app-interviews-page", id] });
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
      qc.invalidateQueries({ queryKey: ["camp-app-interviews-page", id] });
      toast({ title: "Interview scheduled" });
      setNewInterview(false);
    },
    onError: () => toast({ variant: "destructive", title: "Failed to schedule interview" }),
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

        {/* ── Interview ── */}
        {activeTab === "interview" && (
          <div className="space-y-4">
            {canEdit && (
              <div className="flex justify-end">
                <Button size="sm" className="bg-[#F5821F] hover:bg-[#d97706] text-white gap-1.5" onClick={() => setNewInterview(true)}>
                  <Plus className="w-3.5 h-3.5" /> Schedule Interview
                </Button>
              </div>
            )}

            {interviewLoading ? (
              <div className="space-y-3">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
            ) : interviews.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Calendar className="w-8 h-8 mb-3 opacity-20" />
                <p className="text-sm">No interview schedules yet.</p>
                {canEdit && <p className="text-xs mt-1">Click "Schedule Interview" to add one.</p>}
              </div>
            ) : interviews.map((iv: any) => (
              <div key={iv.id} className="rounded-xl border bg-white p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 text-sm font-semibold">
                      <Calendar className="w-3.5 h-3.5 text-[#F5821F]" />
                      {iv.scheduledDatetime
                        ? format(new Date(iv.scheduledDatetime), "PPP · HH:mm")
                        : "Date TBD"}
                    </div>
                    {iv.timezone && (
                      <span className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">{iv.timezone}</span>
                    )}
                    {iv.status && (
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[iv.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {iv.status}
                      </span>
                    )}
                    {iv.result && (
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${RESULT_COLORS[iv.result] ?? "bg-gray-100 text-gray-600"}`}>
                        Result: {iv.result}
                      </span>
                    )}
                  </div>
                  {canEdit && (
                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1 shrink-0" onClick={() => setEditInterview(iv)}>
                      <Pencil className="w-3 h-3" /> Edit
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  {iv.format && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
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
                    <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                      <MapPin className="w-3 h-3" /> {iv.location}
                    </div>
                  )}
                </div>

                {(iv.candidateNotes || iv.interviewerNotes) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t">
                    {iv.candidateNotes && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Candidate Notes</p>
                        <p className="text-xs text-foreground">{iv.candidateNotes}</p>
                      </div>
                    )}
                    {iv.interviewerNotes && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Interviewer Notes</p>
                        <p className="text-xs text-foreground">{iv.interviewerNotes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
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

      {/* ── Interview Edit Dialog ── */}
      {editInterview && (
        <InterviewDialog
          interview={editInterview}
          applicationId={id!}
          open={!!editInterview}
          onClose={() => setEditInterview(null)}
          onSave={(data) => updateInterview.mutate({ iid: editInterview.id, data: { ...data, result: data.result === "__none" ? "" : data.result } })}
          saving={updateInterview.isPending}
        />
      )}

      {/* ── New Interview Dialog ── */}
      <InterviewDialog
        interview={null}
        applicationId={id!}
        open={newInterview}
        onClose={() => setNewInterview(false)}
        onSave={(data) => createInterview.mutate(data)}
        saving={createInterview.isPending}
      />
    </>
  );
}
