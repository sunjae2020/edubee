import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { DetailPageLayout, DetailSection, DetailRow, EditableField } from "@/components/shared/DetailPageLayout";
import { useDetailEdit } from "@/hooks/useDetailEdit";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ArTimeline } from "@/components/shared/ArTimeline";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const STATUSES = ["pending", "confirmed", "checked_in", "checked_out", "cancelled"];
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700", confirmed: "bg-orange-100 text-orange-700",
  checked_in: "bg-blue-100 text-blue-700", checked_out: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function HotelMgtDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [tab, setTab] = useState("details");

  const { data, isLoading } = useQuery({
    queryKey: ["hotel-detail", id],
    queryFn: () => axios.get(`${BASE}/api/services/hotel/${id}`).then(r => r.data),
  });

  const rec = data?.data ?? data;
  const canEdit = !["partner_institute", "partner_pickup", "partner_tour"].includes(user?.role ?? "");

  const updateRec = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      axios.put(`${BASE}/api/services/hotel/${id}`, payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hotel-detail", id] });
      toast({ title: "Hotel record updated" });
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
      title={rec.studentName ?? "Hotel Record"}
      subtitle={rec.contractNumber ?? ""}
      badge={<span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[rec.status ?? ""] ?? "bg-gray-100 text-gray-600"}`}>{(rec.status ?? "—").replace(/_/g, " ")}</span>}
      backPath="/admin/services/hotel"
      backLabel="Hotel Management"
      canEdit={canEdit && tab === "details"}
      isEditing={isEditing}
      isSaving={isSaving}
      onEdit={startEdit}
      onSave={saveEdit}
      onCancel={cancelEdit}
    >
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="accounting">Accounting</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <DetailSection title="Stay Info">
              <EditableField label="Status" isEditing={isEditing} value={(rec.status ?? "").replace(/_/g, " ")}
                editChildren={
                  <Select value={getValue("status")} onValueChange={v => setField("status", v)}>
                    <SelectTrigger className="h-8 text-sm border-[#F5821F]"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                  </Select>
                } />
              <EditableField label="Room Type" isEditing={isEditing} value={rec.roomType}
                editValue={getValue("roomType")} onEdit={v => setField("roomType", v)} />
              <EditableField label="Confirmation #" isEditing={isEditing} value={rec.confirmationNo}
                editValue={getValue("confirmationNo")} onEdit={v => setField("confirmationNo", v)} />
              <DetailRow label="Checkin Date" value={rec.checkinDate ? format(new Date(rec.checkinDate), "PPP") : "—"} />
              <DetailRow label="Checkout Date" value={rec.checkoutDate ? format(new Date(rec.checkoutDate), "PPP") : "—"} />
              <EditableField label="Checkin Time" isEditing={isEditing} value={rec.checkinTime}
                editValue={getValue("checkinTime")} onEdit={v => setField("checkinTime", v)} />
              <EditableField label="Checkout Time" isEditing={isEditing} value={rec.checkoutTime}
                editValue={getValue("checkoutTime")} onEdit={v => setField("checkoutTime", v)} />
            </DetailSection>

            <DetailSection title="Guest Info">
              <DetailRow label="Student" value={rec.studentName} />
              <DetailRow label="Email" value={rec.clientEmail} />
              <DetailRow label="Contract #" value={rec.contractNumber} />
              <DetailRow label="Actual Checkin" value={rec.actualCheckin ? format(new Date(rec.actualCheckin), "PPp") : "—"} />
              <DetailRow label="Actual Checkout" value={rec.actualCheckout ? format(new Date(rec.actualCheckout), "PPp") : "—"} />
            </DetailSection>

            <DetailSection title="Guest Notes" className="lg:col-span-2">
              {isEditing ? (
                <textarea value={getValue("guestNotes") ?? ""} onChange={e => setField("guestNotes", e.target.value)}
                  className="w-full border border-[#F5821F] rounded-md px-3 py-2 text-sm resize-none h-24 focus:outline-none focus:ring-1 focus:ring-[#F5821F]" />
              ) : (
                <p className="text-sm text-foreground whitespace-pre-wrap">{rec.guestNotes || <span className="text-muted-foreground/60">—</span>}</p>
              )}
            </DetailSection>
          </div>
        </TabsContent>

        <TabsContent value="accounting">
          <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
            <span>Click any invoice row to expand details and navigate to related records. To edit this record, switch to the <strong>Details</strong> tab.</span>
          </div>
          {rec.contractId ? (
            <ArTimeline contractId={rec.contractId} showContractLink />
          ) : (
            <div className="text-center py-10 text-muted-foreground text-sm">No contract linked to this record.</div>
          )}
        </TabsContent>
      </Tabs>
    </DetailPageLayout>
  );
}
