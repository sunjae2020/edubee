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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ArTimeline } from "@/components/shared/ArTimeline";
import { ContractPaymentsPanel } from "@/components/finance/ContractPaymentsPanel";
import EntityDocumentsTab from "@/components/shared/EntityDocumentsTab";
import { NotePanel } from "@/components/shared/NotePanel";
import { DollarSign, Map, ExternalLink } from "lucide-react";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const STATUSES = ["pending", "confirmed", "in_progress", "completed", "cancelled"];
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700", confirmed: "bg-orange-100 text-orange-700",
  in_progress: "bg-blue-100 text-blue-700", completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

function fmtMoney(v?: string | null) {
  if (!v || isNaN(Number(v))) return "—";
  return `AUD ${Number(v).toLocaleString("en-AU", { minimumFractionDigits: 2 })}`;
}

// ─── Bill Tab ─────────────────────────────────────────────────────────────────
function BillTab({ record }: { record: any }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [fee, setFee]     = useState(record.serviceFee ?? "");
  const [cost, setCost]   = useState(record.apCost ?? "");

  const margin = record.serviceFee && record.apCost
    ? parseFloat(record.serviceFee) - parseFloat(record.apCost)
    : null;

  const saveMut = useMutation({
    mutationFn: () => axios.patch(`${BASE}/api/services/tour/${record.id}`, {
      serviceFee: fee !== "" ? parseFloat(fee) : null,
      apCost:     cost !== "" ? parseFloat(cost) : null,
    }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tour-detail", record.id] });
      toast({ title: "Bill updated" });
      setEditing(false);
    },
    onError: () => toast({ variant: "destructive", title: "Save failed" }),
  });

  return (
    <div className="space-y-4">
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign size={14} style={{ color: "#F5821F" }} />
            <h3 className="text-xs font-bold uppercase tracking-wide text-stone-500">Billing Summary</h3>
          </div>
          {!editing ? (
            <button onClick={() => { setFee(record.serviceFee ?? ""); setCost(record.apCost ?? ""); setEditing(true); }}
              className="text-xs font-semibold text-[#F5821F] hover:underline">Edit</button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}
                className="text-xs font-semibold text-[#F5821F] hover:underline">
                {saveMut.isPending ? "Saving…" : "Save"}
              </button>
              <button onClick={() => setEditing(false)} className="text-xs text-stone-400 hover:underline">Cancel</button>
            </div>
          )}
        </div>
        <div className="divide-y divide-stone-100">
          <div className="px-5 py-3.5 flex items-center justify-between text-sm">
            <span className="text-stone-500">Service Fee (AR)</span>
            {editing
              ? <input type="number" step="0.01" value={fee} onChange={e => setFee(e.target.value)}
                  className="w-32 border border-[#F5821F] rounded px-2 py-1 text-sm text-right focus:outline-none" placeholder="0.00" />
              : <span className="font-semibold text-stone-800">{fmtMoney(record.serviceFee)}</span>}
          </div>
          <div className="px-5 py-3.5 flex items-center justify-between text-sm">
            <span className="text-stone-500">Partner Cost (AP)</span>
            {editing
              ? <input type="number" step="0.01" value={cost} onChange={e => setCost(e.target.value)}
                  className="w-32 border border-[#F5821F] rounded px-2 py-1 text-sm text-right focus:outline-none" placeholder="0.00" />
              : <span className="font-semibold text-stone-800">{fmtMoney(record.apCost)}</span>}
          </div>
          {margin !== null && !editing && (
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
          <Map size={14} style={{ color: "#F5821F" }} />
          <h3 className="text-xs font-bold uppercase tracking-wide text-stone-500">Tour Info</h3>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-stone-400">Tour Name</span>
            <span className="text-stone-700">{record.tourName || "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-stone-400">Status</span>
            <span className="capitalize text-stone-700">{(record.status ?? "—").replace(/_/g, " ")}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-stone-400">Tour Date</span>
            <span className="text-stone-700 text-xs">
              {record.tourDate ? format(new Date(record.tourDate), "dd MMM yyyy") : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-stone-400">Product</span>
            <span className="text-stone-700">{record.productName || "—"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TourMgtDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [tab, setTab] = useState("details");

  const { data, isLoading } = useQuery({
    queryKey: ["tour-detail", id],
    queryFn: () => axios.get(`${BASE}/api/services/tour/${id}`).then(r => r.data),
  });

  const { data: productsData } = useQuery({
    queryKey: ["products-list-tour"],
    queryFn: () => axios.get(`${BASE}/api/products?limit=200`).then(r => r.data?.data ?? r.data ?? []),
  });
  const productsList: any[] = Array.isArray(productsData) ? productsData : (productsData?.data ?? []);

  const rec = data?.data ?? data;
  const canEdit = !["partner_institute", "partner_hotel", "partner_pickup"].includes(user?.role ?? "");

  const updateRec = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      axios.patch(`${BASE}/api/services/tour/${id}`, payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tour-detail", id] });
      toast({ title: "Tour record updated" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to update" }),
  });

  const { isEditing, isDirty, isSaving, cancelEdit, setField, saveEdit, getValue } = useDetailEdit({
    initialData: rec ?? {},
    onSave: async (data) => { await updateRec.mutateAsync(data); },
    alwaysEdit: true,
  });

  if (isLoading) return <div className="p-6 space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>;
  if (!rec) return <div className="p-6 text-muted-foreground">Record not found.</div>;

  return (
    <DetailPageLayout
      title={rec.clientName ?? rec.studentName ?? "Tour Record"}
      subtitle={rec.contractNumber ?? ""}
      badge={<span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[rec.status ?? ""] ?? "bg-gray-100 text-gray-600"}`}>{(rec.status ?? "—").replace(/_/g, " ")}</span>}
      backPath="/admin/services/tour"
      backLabel="Tour Management"
      isDirty={canEdit && tab === "details" && isDirty}
      isSaving={isSaving}
      onSave={saveEdit}
      onCancel={cancelEdit}
    >
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="bill">Bill</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="accounting">Accounting</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
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
              <EditableField label="Tour Name" isEditing={isEditing} value={rec.tourName}
                editValue={getValue("tourName")} onEdit={v => setField("tourName", v)} />
              <EditableField label="Meeting Point" isEditing={isEditing} value={rec.meetingPoint}
                editValue={getValue("meetingPoint")} onEdit={v => setField("meetingPoint", v)} />
              <EditableField label="Start Time" isEditing={isEditing} value={rec.startTime}
                editValue={getValue("startTime")} onEdit={v => setField("startTime", v)} />
              <EditableField label="End Time" isEditing={isEditing} value={rec.endTime}
                editValue={getValue("endTime")} onEdit={v => setField("endTime", v)} />
              <EditableField label="Guide Info" isEditing={isEditing} value={rec.guideInfo}
                editValue={getValue("guideInfo")} onEdit={v => setField("guideInfo", v)} />
            </DetailSection>

            <DetailSection title="Client Info">
              <DetailRow label="Client" value={rec.clientName ?? rec.studentName} />
              <DetailRow label="Email" value={rec.clientEmail} />
              <DetailRow label="Contract #">
                {rec.contractId ? (
                  <button onClick={() => navigate(`/admin/crm/contracts/${rec.contractId}`)}
                    className="font-mono text-xs text-[#F5821F] hover:underline flex items-center gap-1">
                    {rec.contractNumber ?? "View"} <ExternalLink size={10} />
                  </button>
                ) : <span>{rec.contractNumber ?? "—"}</span>}
              </DetailRow>
            </DetailSection>

            <DetailSection title="Product Linkage">
              <EditableField label="Product" isEditing={isEditing} value={rec.productName ?? "—"}
                editChildren={
                  <Select value={getValue("productId") || "__none__"} onValueChange={v => setField("productId", v === "__none__" ? null : v)}>
                    <SelectTrigger className="h-8 text-sm border-[#F5821F]"><SelectValue placeholder="Select product…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {productsList.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                } />
              <EditableField label="Service Fee (AR)" isEditing={isEditing}
                value={rec.serviceFee ? `AUD ${Number(rec.serviceFee).toLocaleString("en-AU", { minimumFractionDigits: 2 })}` : "—"}
                editValue={getValue("serviceFee")} onEdit={v => setField("serviceFee", v)}
                inputType="number" />
              <EditableField label="Partner Cost (AP)" isEditing={isEditing}
                value={rec.apCost ? `AUD ${Number(rec.apCost).toLocaleString("en-AU", { minimumFractionDigits: 2 })}` : "—"}
                editValue={getValue("apCost")} onEdit={v => setField("apCost", v)}
                inputType="number" />
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
            <div className="lg:col-span-2">
              <SystemInfoSection owner={rec.clientId ?? null} createdAt={rec.createdAt} updatedAt={rec.updatedAt} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="documents">
          <EntityDocumentsTab entityType="tour_mgt" entityId={id!} mode="full" />
        </TabsContent>

        <TabsContent value="bill">
          <BillTab record={rec} />
        </TabsContent>

        <TabsContent value="notes">
          <NotePanel
            entityType="tour_mgt"
            entityId={id!}
            allowedNoteTypes={["internal", "guide"]}
            defaultVisibility="internal"
          />
        </TabsContent>

        <TabsContent value="accounting">
          <div className="space-y-5">
            {rec.contractId ? (
              <>
                <ArTimeline contractId={rec.contractId} showContractLink />
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500 mb-3">Payment Records</h3>
                  <ContractPaymentsPanel contractId={rec.contractId} contractNumber={rec.contractNumber} compact />
                </div>
              </>
            ) : (
              <div className="text-center py-10 text-muted-foreground text-sm">No contract linked to this record.</div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </DetailPageLayout>
  );
}
