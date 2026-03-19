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
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const APP_STATUSES = ["pending", "reviewing", "interview_scheduled", "interview_done", "approved", "rejected", "cancelled", "converted"];

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "participants", label: "Participants" },
  { key: "interview", label: "Interview" },
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
};

export default function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  const { data, isLoading } = useQuery({
    queryKey: ["application-detail-page", id],
    queryFn: () => axios.get(`${BASE}/api/applications/${id}`).then(r => r.data),
  });
  const { data: interviewData } = useQuery({
    queryKey: ["app-interviews-page", id],
    queryFn: () => axios.get(`${BASE}/api/interview-schedules?applicationId=${id}`).then(r => r.data),
    enabled: activeTab === "interview",
  });

  const app = data?.data ?? data;
  const participants = app?.participants ?? [];
  const interviews = interviewData?.data ?? [];

  const canEdit = ["super_admin", "admin", "camp_coordinator"].includes(user?.role ?? "");

  const updateApp = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      axios.put(`${BASE}/api/applications/${id}`, payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["application-detail-page", id] });
      qc.invalidateQueries({ queryKey: ["applications"] });
      toast({ title: "Application updated" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to update" }),
  });

  const { isEditing, isSaving, startEdit, cancelEdit, setField, saveEdit, getValue } = useDetailEdit({
    initialData: app ?? {},
    onSave: async (data) => { await updateApp.mutateAsync(data); },
  });

  if (isLoading) return <div className="p-6 space-y-4">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>;
  if (!app) return <div className="p-6 text-muted-foreground">Application not found.</div>;

  const statusColor = STATUS_COLORS[app.status ?? "pending"] ?? "bg-gray-100 text-gray-600";

  return (
    <DetailPageLayout
      title={app.applicationNumber ?? "Application"}
      subtitle={app.studentName ?? ""}
      badge={<span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>{(app.status ?? "pending").replace(/_/g, " ")}</span>}
      backPath="/admin/applications"
      backLabel="Applications"
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
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DetailSection title="Application Info">
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

      {activeTab === "participants" && (
        <div className="bg-card rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                <th className="px-4 py-2.5 text-left">#</th>
                <th className="px-4 py-2.5 text-left">Name</th>
                <th className="px-4 py-2.5 text-left">Type</th>
                <th className="px-4 py-2.5 text-left">DOB</th>
                <th className="px-4 py-2.5 text-left">Gender</th>
                <th className="px-4 py-2.5 text-left">Nationality</th>
                <th className="px-4 py-2.5 text-left">Grade</th>
              </tr>
            </thead>
            <tbody>
              {participants.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-xs">No participants loaded</td></tr>
              ) : participants.map((p: any, i: number) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-[#FEF0E3]">
                  <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                  <td className="px-4 py-3 font-medium">{p.firstName} {p.lastName}</td>
                  <td className="px-4 py-3 capitalize">{p.participantType ?? "child"}</td>
                  <td className="px-4 py-3">{p.dateOfBirth ? format(new Date(p.dateOfBirth), "MMM d, yyyy") : "—"}</td>
                  <td className="px-4 py-3 capitalize">{p.gender ?? "—"}</td>
                  <td className="px-4 py-3">{p.nationality ?? "—"}</td>
                  <td className="px-4 py-3">{p.grade ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "interview" && (
        <div className="space-y-4">
          {interviews.length === 0 ? (
            <div className="text-sm text-muted-foreground">No interview schedules.</div>
          ) : interviews.map((iv: any) => (
            <DetailSection key={iv.id} title={`Interview — ${iv.scheduledAt ? format(new Date(iv.scheduledAt), "PPp") : "TBD"}`}>
              <DetailRow label="Status" value={iv.status} />
              <DetailRow label="Format" value={iv.interviewFormat} />
              <DetailRow label="Meeting Link" value={iv.meetingLink} />
              <DetailRow label="Interviewer" value={iv.interviewerName} />
              <DetailRow label="Notes" value={iv.notes} />
            </DetailSection>
          ))}
        </div>
      )}

      {activeTab === "notes" && (
        <NotePanel entityType="application" entityId={id!} />
      )}
    </DetailPageLayout>
  );
}
