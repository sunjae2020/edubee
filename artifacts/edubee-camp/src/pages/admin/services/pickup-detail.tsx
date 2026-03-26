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
import { ArTimeline } from "@/components/shared/ArTimeline";
import { ContractPaymentsPanel } from "@/components/finance/ContractPaymentsPanel";
import EntityDocumentsTab from "@/components/shared/EntityDocumentsTab";
import { format, parseISO } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const STATUSES = ["pending", "driver_assigned", "en_route", "completed", "cancelled"];
const PICKUP_TYPES = ["airport_pickup", "airport_dropoff", "hotel_to_school", "school_to_hotel", "custom"];

const STATUS_COLORS: Record<string, string> = {
  pending:         "bg-[#F4F3F1] text-[#57534E]",
  driver_assigned: "bg-[#FEF9C3] text-[#CA8A04]",
  en_route:        "bg-[#FEF0E3] text-[#F5821F]",
  completed:       "bg-[#DCFCE7] text-[#16A34A]",
  cancelled:       "bg-[#FEF2F2] text-[#DC2626]",
};

const TABS = [
  { key: "overview",   label: "Overview" },
  { key: "documents",  label: "Documents" },
  { key: "notes",      label: "Notes" },
  { key: "accounting", label: "Accounting" },
];

export default function PickupMgtDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  const { data, isLoading } = useQuery({
    queryKey: ["pickup-detail", id],
    queryFn: () => axios.get(`${BASE}/api/services/pickup/${id}`).then(r => r.data),
  });

  const rec = data?.data ?? data;
  const canEdit = !["partner_hotel", "partner_tour"].includes(user?.role ?? "");

  const updateRec = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      axios.put(`${BASE}/api/services/pickup/${id}`, payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pickup-detail", id] });
      qc.invalidateQueries({ queryKey: ["pickup"] });
      qc.invalidateQueries({ queryKey: ["pickup-today"] });
      toast({ title: "Pickup record updated" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to update" }),
  });

  const { isEditing, isSaving, startEdit, cancelEdit, setField, saveEdit, getValue } = useDetailEdit({
    initialData: rec ?? {},
    onSave: async (d) => { await updateRec.mutateAsync(d); },
  });

  const fmtDt = (d?: string | null) => {
    if (!d) return "—";
    try { return format(parseISO(d), "PPp"); } catch { return d; }
  };

  if (isLoading) {
    return <div className="p-6 space-y-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>;
  }
  if (!rec) return <div className="p-6 text-muted-foreground">Record not found.</div>;

  return (
    <DetailPageLayout
      title={rec.clientName ?? rec.studentName ?? "Pickup Record"}
      subtitle={rec.contractNumber ? `Contract ${rec.contractNumber}` : (rec.pickupType?.replace(/_/g, " ") ?? "Airport Transfer")}
      badge={
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[rec.status ?? ""] ?? "bg-[#F4F3F1] text-[#57534E]"}`}>
          {(rec.status ?? "pending").replace(/_/g, " ")}
        </span>
      }
      backPath="/admin/services/pickup"
      backLabel="Pickup Management"
      canEdit={canEdit && activeTab === "overview"}
      isEditing={isEditing}
      isSaving={isSaving}
      onEdit={startEdit}
      onSave={saveEdit}
      onCancel={cancelEdit}
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      {/* ── Overview ── */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DetailSection title="Transfer Details">
            <EditableField
              label="Status"
              isEditing={isEditing}
              value={(rec.status ?? "pending").replace(/_/g, " ")}
              editChildren={
                <Select value={getValue("status") ?? "pending"} onValueChange={v => setField("status", v)}>
                  <SelectTrigger className="h-8 text-sm border-[#F5821F]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              }
            />
            <EditableField
              label="Pickup Type"
              isEditing={isEditing}
              value={(rec.pickupType ?? "").replace(/_/g, " ")}
              editChildren={
                <Select value={getValue("pickupType") ?? "airport_pickup"} onValueChange={v => setField("pickupType", v)}>
                  <SelectTrigger className="h-8 text-sm border-[#F5821F]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PICKUP_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              }
            />
            <DetailRow label="Pickup Date & Time" value={fmtDt(rec.pickupDatetime)} />
            <EditableField
              label="From Location"
              isEditing={isEditing}
              value={rec.fromLocation}
              editValue={getValue("fromLocation")}
              onEdit={v => setField("fromLocation", v)}
            />
            <EditableField
              label="To Location"
              isEditing={isEditing}
              value={rec.toLocation}
              editValue={getValue("toLocation")}
              onEdit={v => setField("toLocation", v)}
            />
          </DetailSection>

          <DetailSection title="Client Info">
            <DetailRow label="Client Name" value={rec.clientName ?? rec.studentName} />
            <DetailRow label="Client Email" value={rec.clientEmail} />
            <DetailRow label="Contract #" value={rec.contractNumber} />
          </DetailSection>

          <DetailSection title="Driver / Vehicle">
            <EditableField
              label="Driver Name"
              isEditing={isEditing}
              value={rec.driverName}
              editValue={getValue("driverName")}
              onEdit={v => setField("driverName", v)}
            />
            <EditableField
              label="Driver Contact"
              isEditing={isEditing}
              value={rec.driverContact}
              editValue={getValue("driverContact")}
              onEdit={v => setField("driverContact", v)}
            />
            <EditableField
              label="Vehicle Info"
              isEditing={isEditing}
              value={rec.vehicleInfo}
              editValue={getValue("vehicleInfo")}
              onEdit={v => setField("vehicleInfo", v)}
            />
          </DetailSection>

          <DetailSection title="Driver Notes" className="lg:col-span-2">
            {isEditing ? (
              <textarea
                value={getValue("driverNotes") ?? ""}
                onChange={e => setField("driverNotes", e.target.value)}
                className="w-full border border-[#F5821F] rounded-md px-3 py-2 text-sm resize-none h-24 focus:outline-none focus:ring-1 focus:ring-[#F5821F]"
                placeholder="Notes for the driver…"
              />
            ) : (
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {rec.driverNotes || <span className="text-muted-foreground/60">—</span>}
              </p>
            )}
          </DetailSection>
          <div className="lg:col-span-2">
            <SystemInfoSection owner={rec.clientId ?? null} createdAt={rec.createdAt} updatedAt={rec.updatedAt} />
          </div>
        </div>
      )}

      {/* ── Documents ── */}
      {activeTab === "documents" && (
        <EntityDocumentsTab entityType="pickup_mgt" entityId={id!} mode="full" />
      )}

      {/* ── Notes ── */}
      {activeTab === "notes" && (
        <NotePanel entityType="pickup_mgt" entityId={id!} />
      )}

      {/* ── Accounting ── */}
      {activeTab === "accounting" && (
        <div className="space-y-5">
          {rec.contractId ? (
            <>
              <ArTimeline contractId={rec.contractId} showContractLink />
              <div className="mt-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500 mb-3">Payment Records</h3>
                <ContractPaymentsPanel
                  contractId={rec.contractId}
                  contractNumber={rec.contractNumber}
                  compact
                />
              </div>
            </>
          ) : (
            <div className="text-center py-10 text-muted-foreground text-sm">No contract linked to this record.</div>
          )}
        </div>
      )}
    </DetailPageLayout>
  );
}
