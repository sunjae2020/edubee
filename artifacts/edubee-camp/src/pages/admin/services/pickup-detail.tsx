import { formatDate, formatDateTime } from "@/lib/date-format";
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
import { ArTimeline } from "@/components/shared/ArTimeline";
import { ContractPaymentsPanel } from "@/components/finance/ContractPaymentsPanel";
import EntityDocumentsTab from "@/components/shared/EntityDocumentsTab";
import { DollarSign, Car, ExternalLink } from "lucide-react";
import { format, parseISO } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const STATUSES = ["pending", "driver_assigned", "en_route", "completed", "cancelled"];
const PICKUP_TYPES = ["airport_pickup", "airport_dropoff", "hotel_to_school", "school_to_hotel", "custom"];
const TIMEZONES = [
  "Australia/Sydney", "Australia/Melbourne", "Australia/Brisbane", "Australia/Adelaide",
  "Australia/Perth", "Asia/Seoul", "Asia/Tokyo", "Asia/Singapore",
  "Asia/Bangkok", "Asia/Manila", "Asia/Hong_Kong", "UTC",
];

const STATUS_COLORS: Record<string, string> = {
  pending:         "bg-[#F4F3F1] text-[#57534E]",
  driver_assigned: "bg-[#FEF9C3] text-[#CA8A04]",
  en_route:        "bg-(--e-orange-lt) text-(--e-orange)",
  completed:       "bg-[#DCFCE7] text-[#16A34A]",
  cancelled:       "bg-[#FEF2F2] text-[#DC2626]",
};

const TABS = [
  { key: "overview",   label: "Overview" },
  { key: "documents",  label: "Documents" },
  { key: "bill",       label: "Bill" },
  { key: "notes",      label: "Notes" },
  { key: "accounting", label: "Accounting" },
];

function fmtMoney(v?: string | null) {
  if (!v || isNaN(Number(v))) return "—";
  return `AUD ${Number(v).toLocaleString("en-AU", { minimumFractionDigits: 2 })}`;
}

// ─── Bill Tab ─────────────────────────────────────────────────────────────────
function BillTab({ record }: { record: any }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [fee, setFee]   = useState(record.serviceFee ?? "");
  const [cost, setCost] = useState(record.apCost ?? "");

  const margin = record.serviceFee && record.apCost
    ? parseFloat(record.serviceFee) - parseFloat(record.apCost)
    : null;

  const saveMut = useMutation({
    mutationFn: () => axios.patch(`${BASE}/api/services/pickup/${record.id}`, {
      serviceFee: fee !== "" ? parseFloat(fee) : null,
      apCost:     cost !== "" ? parseFloat(cost) : null,
    }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pickup-detail", record.id] });
      qc.invalidateQueries({ queryKey: ["pickup"] });
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
            <DollarSign size={14} style={{ color: "var(--e-orange)" }} />
            <h3 className="text-xs font-bold uppercase tracking-wide text-(--e-orange)">Billing Summary</h3>
          </div>
          {!editing ? (
            <button onClick={() => { setFee(record.serviceFee ?? ""); setCost(record.apCost ?? ""); setEditing(true); }}
              className="text-xs font-semibold text-(--e-orange) hover:underline">Edit</button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}
                className="text-xs font-semibold text-(--e-orange) hover:underline">
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
                  className="w-32 border border-(--e-orange) rounded px-2 py-1 text-sm text-right focus:outline-none" placeholder="0.00" />
              : <span className="font-semibold text-stone-800">{fmtMoney(record.serviceFee)}</span>}
          </div>
          <div className="px-5 py-3.5 flex items-center justify-between text-sm">
            <span className="text-stone-500">Partner Cost (AP)</span>
            {editing
              ? <input type="number" step="0.01" value={cost} onChange={e => setCost(e.target.value)}
                  className="w-32 border border-(--e-orange) rounded px-2 py-1 text-sm text-right focus:outline-none" placeholder="0.00" />
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
          <Car size={14} style={{ color: "var(--e-orange)" }} />
          <h3 className="text-xs font-bold uppercase tracking-wide text-(--e-orange)">Transfer Info</h3>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-stone-400">Type</span>
            <span className="text-stone-700 capitalize">{(record.pickupType ?? "—").replace(/_/g, " ")}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-stone-400">Status</span>
            <span className="capitalize text-stone-700">{(record.status ?? "—").replace(/_/g, " ")}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-stone-400">From</span>
            <span className="text-stone-700 text-xs">{record.fromLocation || "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-stone-400">To</span>
            <span className="text-stone-700 text-xs">{record.toLocation || "—"}</span>
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

export default function PickupMgtDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  const { data, isLoading } = useQuery({
    queryKey: ["pickup-detail", id],
    queryFn: () => axios.get(`${BASE}/api/services/pickup/${id}`).then(r => r.data),
  });

  const { data: productsData } = useQuery({
    queryKey: ["products-list-pickup"],
    queryFn: () => axios.get(`${BASE}/api/products?limit=200`).then(r => r.data?.data ?? r.data ?? []),
  });
  const productsList: any[] = Array.isArray(productsData) ? productsData : (productsData?.data ?? []);

  const rec = data?.data ?? data;
  const canEdit = true;

  const updateRec = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      axios.patch(`${BASE}/api/services/pickup/${id}`, payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pickup-detail", id] });
      qc.invalidateQueries({ queryKey: ["pickup"] });
      qc.invalidateQueries({ queryKey: ["pickup-today"] });
      toast({ title: "Pickup record updated" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to update" }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: () =>
      axios.patch(`${BASE}/api/services/pickup/${id}/toggle-active`).then(r => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["pickup-detail", id] });
      qc.invalidateQueries({ queryKey: ["pickup"] });
      toast({ title: data.isActive ? "Record activated" : "Record deactivated" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to toggle status" }),
  });

  const { isEditing, isDirty, isSaving, cancelEdit, setField, saveEdit, getValue } = useDetailEdit({
    initialData: rec ?? {},
    onSave: async (d) => { await updateRec.mutateAsync(d); },
    alwaysEdit: true,
  });

  const fmtDt = (d?: string | null, tz?: string | null) => {
    if (!d) return "—";
    const formatted = formatDateTime(d);
    return tz ? `${formatted} (${tz})` : formatted;
  };

  const toDatetimeLocal = (d?: string | null) => {
    if (!d) return "";
    try { return format(parseISO(d), "yyyy-MM-dd'T'HH:mm"); } catch { return d ?? ""; }
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
      isDirty={canEdit && activeTab === "overview" && isDirty}
      isSaving={isSaving}
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
                  <SelectTrigger className="h-8 text-sm border-(--e-orange)"><SelectValue /></SelectTrigger>
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
                  <SelectTrigger className="h-8 text-sm border-(--e-orange)"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PICKUP_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              }
            />
            <EditableField
              label="Pickup Date & Time"
              isEditing={isEditing}
              value={fmtDt(rec.pickupDatetime, rec.timezone)}
              editChildren={
                <input
                  type="datetime-local"
                  value={toDatetimeLocal(getValue("pickupDatetime"))}
                  onChange={e => setField("pickupDatetime", e.target.value)}
                  className="w-full h-8 text-sm border border-(--e-orange) rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-(--e-orange)"
                />
              }
            />
            <EditableField
              label="Timezone"
              isEditing={isEditing}
              value={rec.timezone ?? "—"}
              editChildren={
                <Select value={getValue("timezone") || "__none__"} onValueChange={v => setField("timezone", v === "__none__" ? null : v)}>
                  <SelectTrigger className="h-8 text-sm border-(--e-orange)"><SelectValue placeholder="Select timezone…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None —</SelectItem>
                    {TIMEZONES.map(tz => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
                  </SelectContent>
                </Select>
              }
            />
            <EditableField
              label="Flight No"
              isEditing={isEditing}
              value={rec.flightNo}
              editValue={getValue("flightNo")}
              onEdit={v => setField("flightNo", v)}
            />
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
            <DetailRow label="Contract #">
              {rec.contractId ? (
                <button onClick={() => navigate(`/admin/crm/contracts/${rec.contractId}`)}
                  className="font-mono text-xs text-(--e-orange) hover:underline flex items-center gap-1">
                  {rec.contractNumber ?? "View"} <ExternalLink size={10} />
                </button>
              ) : <span>{rec.contractNumber ?? "—"}</span>}
            </DetailRow>
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

          <DetailSection title="Product Linkage">
            <EditableField label="Product" isEditing={isEditing} value={rec.productName ?? "—"}
              editChildren={
                <Select value={getValue("productId") || "__none__"} onValueChange={v => setField("productId", v === "__none__" ? null : v)}>
                  <SelectTrigger className="h-8 text-sm border-(--e-orange)"><SelectValue placeholder="Select product…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None —</SelectItem>
                    {productsList.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              } />
            <EditableField
              label="Service Fee (AR)"
              isEditing={isEditing}
              value={rec.serviceFee ? `AUD ${Number(rec.serviceFee).toLocaleString("en-AU", { minimumFractionDigits: 2 })}` : "—"}
              editValue={getValue("serviceFee")}
              onEdit={v => setField("serviceFee", v)}
              inputType="number"
            />
            <EditableField
              label="Partner Cost (AP)"
              isEditing={isEditing}
              value={rec.apCost ? `AUD ${Number(rec.apCost).toLocaleString("en-AU", { minimumFractionDigits: 2 })}` : "—"}
              editValue={getValue("apCost")}
              onEdit={v => setField("apCost", v)}
              inputType="number"
            />
          </DetailSection>

          <DetailSection title="Driver Notes" className="lg:col-span-2">
            {isEditing ? (
              <textarea
                value={getValue("driverNotes") ?? ""}
                onChange={e => setField("driverNotes", e.target.value)}
                className="w-full border border-(--e-orange) rounded-md px-3 py-2 text-sm resize-none h-24 focus:outline-none focus:ring-1 focus:ring-(--e-orange)"
                placeholder="Notes for the driver…"
              />
            ) : (
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {rec.driverNotes || <span className="text-muted-foreground/60">—</span>}
              </p>
            )}
          </DetailSection>
          <div className="lg:col-span-2">
            <SystemInfoSection
              id={rec.id}
              recordIdLabel="Pickup ID"
              createdAt={rec.createdAt}
              updatedAt={rec.updatedAt}
              isActive={rec.isActive ?? true}
              onToggleActive={() => toggleActiveMutation.mutate()}
              isToggling={toggleActiveMutation.isPending}
            />
          </div>
        </div>
      )}

      {/* ── Documents ── */}
      {activeTab === "documents" && (
        <EntityDocumentsTab entityType="pickup_mgt" entityId={id!} mode="full" />
      )}

      {/* ── Bill ── */}
      {activeTab === "bill" && <BillTab record={rec} />}

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
