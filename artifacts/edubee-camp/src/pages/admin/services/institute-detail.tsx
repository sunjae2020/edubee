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
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const STATUSES = ["pending", "active", "completed", "cancelled"];
const LEVELS = ["beginner", "elementary", "intermediate", "upper_intermediate", "advanced"];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700", active: "bg-green-100 text-green-700",
  completed: "bg-teal-100 text-teal-700", cancelled: "bg-red-100 text-red-700",
};

export default function InstituteMgtDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["institute-detail", id],
    queryFn: () => axios.get(`${BASE}/api/services/institute/${id}`).then(r => r.data),
  });

  const rec = data?.data ?? data;
  const isPartner = (user?.role ?? "").startsWith("partner_");
  const canEdit = !isPartner || user?.role === "partner_institute";

  const updateRec = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      axios.put(`${BASE}/api/services/institute/${id}`, payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["institute-detail", id] });
      toast({ title: "Record updated" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to update" }),
  });

  const { isEditing, isSaving, startEdit, cancelEdit, setField, saveEdit, getValue } = useDetailEdit({
    initialData: rec ?? {},
    onSave: async (data) => { await updateRec.mutateAsync(data); },
  });

  if (isLoading) return <div className="p-6 space-y-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>;
  if (!rec) return <div className="p-6 text-muted-foreground">Record not found.</div>;

  return (
    <DetailPageLayout
      title={rec.studentName ?? "Institute Record"}
      subtitle={rec.contractNumber ?? ""}
      badge={<span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[rec.status ?? ""] ?? "bg-gray-100 text-gray-600"}`}>{rec.status ?? "—"}</span>}
      backPath="/admin/services/institute"
      backLabel="Institute Management"
      canEdit={canEdit}
      isEditing={isEditing}
      isSaving={isSaving}
      onEdit={startEdit}
      onSave={saveEdit}
      onCancel={cancelEdit}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DetailSection title="Contract Info">
          <DetailRow label="Contract #" value={rec.contractNumber} />
          <DetailRow label="Student" value={rec.studentName} />
          <DetailRow label="Email" value={rec.clientEmail} />
          <DetailRow label="Start Date" value={rec.contractStartDate ? format(new Date(rec.contractStartDate), "PPP") : "—"} />
          <DetailRow label="End Date" value={rec.contractEndDate ? format(new Date(rec.contractEndDate), "PPP") : "—"} />
        </DetailSection>

        <DetailSection title="Program Details">
          <EditableField label="Status" isEditing={isEditing} value={rec.status}
            editChildren={
              <Select value={getValue("status")} onValueChange={v => setField("status", v)}>
                <SelectTrigger className="h-8 text-sm border-[#F5821F]"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            } />
          <EditableField label="Schedule" isEditing={isEditing} value={rec.schedule}
            editValue={getValue("schedule")} onEdit={v => setField("schedule", v)} />
          <EditableField label="English Level (End)" isEditing={isEditing} value={rec.englishLevelEnd}
            editChildren={
              <Select value={getValue("englishLevelEnd") ?? ""} onValueChange={v => setField("englishLevelEnd", v)}>
                <SelectTrigger className="h-8 text-sm border-[#F5821F]"><SelectValue placeholder="Select level" /></SelectTrigger>
                <SelectContent>{LEVELS.map(l => <SelectItem key={l} value={l}>{l.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            } />
          <DetailRow label="English Level (Start)" value={rec.englishLevelStart} />
          <DetailRow label="Program Details" value={rec.programDetails} />
        </DetailSection>

        <DetailSection title="Teacher Notes" className="lg:col-span-2">
          {isEditing ? (
            <textarea value={getValue("teacherComments") ?? ""} onChange={e => setField("teacherComments", e.target.value)}
              className="w-full border border-[#F5821F] rounded-md px-3 py-2 text-sm resize-none h-24 focus:outline-none focus:ring-1 focus:ring-[#F5821F]" />
          ) : (
            <p className="text-sm text-foreground whitespace-pre-wrap">{rec.teacherComments || <span className="text-muted-foreground/60">—</span>}</p>
          )}
        </DetailSection>

        <DetailSection title="Progress Notes" className="lg:col-span-2">
          {isEditing ? (
            <textarea value={getValue("progressNotes") ?? ""} onChange={e => setField("progressNotes", e.target.value)}
              className="w-full border border-[#F5821F] rounded-md px-3 py-2 text-sm resize-none h-24 focus:outline-none focus:ring-1 focus:ring-[#F5821F]" />
          ) : (
            <p className="text-sm text-foreground whitespace-pre-wrap">{rec.progressNotes || <span className="text-muted-foreground/60">—</span>}</p>
          )}
        </DetailSection>
      </div>
    </DetailPageLayout>
  );
}
