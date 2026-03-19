import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { DetailPageLayout, DetailSection, DetailRow, EditableField } from "@/components/shared/DetailPageLayout";
import { useDetailEdit } from "@/hooks/useDetailEdit";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const STATUSES = ["pending", "confirmed", "in_progress", "completed", "cancelled"];
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700", confirmed: "bg-orange-100 text-orange-700",
  in_progress: "bg-blue-100 text-blue-700", completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function TourMgtDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["tour-detail", id],
    queryFn: () => axios.get(`${BASE}/api/services/tour/${id}`).then(r => r.data),
  });

  const rec = data?.data ?? data;
  const canEdit = !["partner_institute", "partner_hotel", "partner_pickup"].includes(user?.role ?? "");

  const updateRec = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      axios.put(`${BASE}/api/services/tour/${id}`, payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tour-detail", id] });
      toast({ title: "Tour record updated" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to update" }),
  });

  const { isEditing, isSaving, startEdit, cancelEdit, setField, saveEdit, getValue } = useDetailEdit({
    initialData: rec ?? {},
    onSave: async (data) => { await updateRec.mutateAsync(data); },
  });

  if (isLoading) return <div className="p-6 space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>;
  if (!rec) return <div className="p-6 text-muted-foreground">Record not found.</div>;

  return (
    <DetailPageLayout
      title={rec.studentName ?? "Tour Record"}
      subtitle={rec.contractNumber ?? ""}
      badge={<span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[rec.status ?? ""] ?? "bg-gray-100 text-gray-600"}`}>{(rec.status ?? "—").replace(/_/g, " ")}</span>}
      backPath="/admin/services/tour"
      backLabel="Tour Management"
      canEdit={canEdit}
      isEditing={isEditing}
      isSaving={isSaving}
      onEdit={startEdit}
      onSave={saveEdit}
      onCancel={cancelEdit}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DetailSection title="Tour Info">
          <EditableField label="Status" isEditing={isEditing} value={(rec.status ?? "").replace(/_/g, " ")}
            editChildren={
              <Select value={getValue("status")} onValueChange={v => setField("status", v)}>
                <SelectTrigger className="h-8 text-sm border-[#F5821F]"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            } />
          <DetailRow label="Tour Date" value={rec.tourDate ? format(new Date(rec.tourDate), "PPP") : "—"} />
          <DetailRow label="Tour Name" value={rec.tourName} />
          <DetailRow label="Meeting Point" value={rec.meetingPoint} />
          <DetailRow label="Duration (hrs)" value={rec.durationHours} />
          <DetailRow label="Participants" value={rec.participantCount} />
        </DetailSection>

        <DetailSection title="Client Info">
          <DetailRow label="Student" value={rec.studentName} />
          <DetailRow label="Email" value={rec.clientEmail} />
          <DetailRow label="Contract #" value={rec.contractNumber} />
          <EditableField label="Guide Info" isEditing={isEditing} value={rec.guideInfo}
            editValue={getValue("guideInfo")} onEdit={v => setField("guideInfo", v)} />
        </DetailSection>

        <DetailSection title="Highlights" className="lg:col-span-2">
          {isEditing ? (
            <textarea value={getValue("highlights") ?? ""} onChange={e => setField("highlights", e.target.value)}
              className="w-full border border-[#F5821F] rounded-md px-3 py-2 text-sm resize-none h-24 focus:outline-none focus:ring-1 focus:ring-[#F5821F]" />
          ) : (
            <p className="text-sm text-foreground whitespace-pre-wrap">{rec.highlights || <span className="text-muted-foreground/60">—</span>}</p>
          )}
        </DetailSection>

        <DetailSection title="Tour Notes" className="lg:col-span-2">
          {isEditing ? (
            <textarea value={getValue("tourNotes") ?? ""} onChange={e => setField("tourNotes", e.target.value)}
              className="w-full border border-[#F5821F] rounded-md px-3 py-2 text-sm resize-none h-24 focus:outline-none focus:ring-1 focus:ring-[#F5821F]" />
          ) : (
            <p className="text-sm text-foreground whitespace-pre-wrap">{rec.tourNotes || <span className="text-muted-foreground/60">—</span>}</p>
          )}
        </DetailSection>
      </div>
    </DetailPageLayout>
  );
}
