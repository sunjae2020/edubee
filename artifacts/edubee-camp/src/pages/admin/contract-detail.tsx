import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { DetailPageLayout, DetailSection, DetailRow, EditableField } from "@/components/shared/DetailPageLayout";
import { useDetailEdit } from "@/hooks/useDetailEdit";
import { ArTimeline } from "@/components/shared/ArTimeline";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { NotePanel } from "@/components/shared/NotePanel";
import EntityDocumentsTab from "@/components/shared/EntityDocumentsTab";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const CONTRACT_STATUSES = ["draft", "sent", "signed", "active", "completed", "cancelled", "suspended"];
const CURRENCIES = ["AUD", "USD", "KRW", "JPY", "THB", "PHP", "SGD", "GBP"];
const CURRENCY_SYMBOLS: Record<string, string> = { AUD: "A$", USD: "$", KRW: "₩", JPY: "¥", THB: "฿", PHP: "₱", SGD: "S$", GBP: "£" };

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "services", label: "Services" },
  { key: "accounting", label: "Accounting" },
  { key: "documents", label: "Documents" },
  { key: "notes", label: "Notes" },
];

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600", sent: "bg-blue-100 text-blue-700",
  signed: "bg-orange-100 text-orange-700", active: "bg-green-100 text-green-700",
  completed: "bg-teal-100 text-teal-700", cancelled: "bg-red-100 text-red-700",
  suspended: "bg-yellow-100 text-yellow-700",
};

function ServiceCard({ service }: { service: any }) {
  return (
    <div className="border rounded-lg p-3 text-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium capitalize">{service.serviceType ?? service.type ?? "Service"}</span>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[service.status ?? ""] ?? "bg-gray-100 text-gray-600"}`}>{service.status ?? "—"}</span>
      </div>
      {service.providerName && <div className="text-muted-foreground text-xs mb-1">Provider: {service.providerName}</div>}
      {service.startDate && <div className="text-muted-foreground text-xs">Start: {format(new Date(service.startDate), "PPP")}</div>}
      {service.endDate && <div className="text-muted-foreground text-xs">End: {format(new Date(service.endDate), "PPP")}</div>}
      {service.amount && <div className="text-muted-foreground text-xs font-mono">Amount: {CURRENCY_SYMBOLS[service.currency ?? "AUD"] ?? ""}{Number(service.amount).toLocaleString()}</div>}
    </div>
  );
}

export default function ContractDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  const { data, isLoading } = useQuery({
    queryKey: ["contract-detail-page", id],
    queryFn: () => axios.get(`${BASE}/api/contracts/${id}`).then(r => r.data),
  });
  const { data: servicesData } = useQuery({
    queryKey: ["contract-services-page", id],
    queryFn: () => axios.get(`${BASE}/api/contracts/${id}/services`).then(r => r.data),
    enabled: activeTab === "services",
  });
  const { data: accountingData } = useQuery({
    queryKey: ["contract-accounting-page", id],
    queryFn: () => axios.get(`${BASE}/api/contracts/${id}/accounting`).then(r => r.data),
    enabled: activeTab === "accounting",
  });

  const contract = data?.data ?? data;
  // API returns {institute, hotel, pickup, tour, settlements} — NOT an array
  const servicesObj = servicesData ?? null;
  const accounting = accountingData?.data ?? accountingData;

  const canEdit = ["super_admin", "admin", "camp_coordinator"].includes(user?.role ?? "");

  const updateContract = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      axios.put(`${BASE}/api/contracts/${id}`, payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contract-detail-page", id] });
      qc.invalidateQueries({ queryKey: ["contracts"] });
      toast({ title: "Contract updated" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to update" }),
  });

  const { isEditing, isSaving, startEdit, cancelEdit, setField, saveEdit, getValue } = useDetailEdit({
    initialData: contract ?? {},
    onSave: async (data) => { await updateContract.mutateAsync(data); },
  });

  if (isLoading) return <div className="p-6 space-y-4">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>;
  if (!contract) return <div className="p-6 text-muted-foreground">Contract not found.</div>;

  const fmtCcy = (amount: string | number | null, ccy = "AUD") =>
    amount ? `${CURRENCY_SYMBOLS[ccy] ?? ccy}${Number(amount).toLocaleString()}` : "—";

  const statusColor = STATUS_COLORS[contract.status ?? "draft"] ?? "bg-gray-100 text-gray-600";

  return (
    <DetailPageLayout
      title={contract.contractNumber ?? "Contract"}
      subtitle={contract.studentName ?? contract.application?.studentName ?? ""}
      badge={<span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>{contract.status ?? "—"}</span>}
      backPath="/admin/contracts"
      backLabel="Contracts"
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
          <DetailSection title="Contract Info">
            <DetailRow label="Contract #" value={contract.contractNumber} />
            <EditableField label="Status" isEditing={isEditing} value={contract.status}
              editChildren={
                <Select value={getValue("status")} onValueChange={v => setField("status", v)}>
                  <SelectTrigger className="h-8 text-sm border-[#F5821F]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONTRACT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              } />
            <EditableField label="Currency" isEditing={isEditing}
              value={contract.currency ?? "AUD"}
              editChildren={
                <Select value={getValue("currency") ?? "AUD"} onValueChange={v => setField("currency", v)}>
                  <SelectTrigger className="h-8 text-sm border-[#F5821F]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map(c => (
                      <SelectItem key={c} value={c}>{CURRENCY_SYMBOLS[c] ?? ""} {c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              } />
            <EditableField label="Total Amount" isEditing={isEditing}
              value={fmtCcy(contract.totalAmount, contract.currency)}
              editValue={getValue("totalAmount")} onEdit={v => setField("totalAmount", v)} type="number" />
            <EditableField label="Paid Amount" isEditing={isEditing}
              value={fmtCcy(contract.paidAmount, contract.currency)}
              editValue={getValue("paidAmount")} onEdit={v => setField("paidAmount", v)} type="number" />
            <DetailRow label="Balance">
              <span className="font-mono text-sm">
                {fmtCcy(
                  isEditing
                    ? String(Number(getValue("totalAmount") ?? contract.totalAmount ?? 0) - Number(getValue("paidAmount") ?? contract.paidAmount ?? 0))
                    : String(Number(contract.totalAmount ?? 0) - Number(contract.paidAmount ?? 0)),
                  isEditing ? (getValue("currency") ?? contract.currency) : contract.currency
                )}
              </span>
            </DetailRow>
          </DetailSection>

          <DetailSection title="Dates">
            <EditableField label="Start Date" isEditing={isEditing} value={contract.startDate ? format(new Date(contract.startDate), "PPP") : "—"}
              editValue={getValue("startDate")} onEdit={v => setField("startDate", v)} type="date" />
            <EditableField label="End Date" isEditing={isEditing} value={contract.endDate ? format(new Date(contract.endDate), "PPP") : "—"}
              editValue={getValue("endDate")} onEdit={v => setField("endDate", v)} type="date" />
            <EditableField label="Signed At" isEditing={isEditing} value={contract.signedAt ? format(new Date(contract.signedAt), "PPP") : "—"}
              editValue={getValue("signedAt")} onEdit={v => setField("signedAt", v)} type="date" />
            <DetailRow label="Created" value={contract.createdAt ? format(new Date(contract.createdAt), "PPP") : "—"} />
          </DetailSection>

          <DetailSection title="Student / Client">
            <EditableField label="Student Name" isEditing={isEditing}
              value={contract.studentName ?? contract.application?.studentName ?? "—"}
              editValue={getValue("studentName")} onEdit={v => setField("studentName", v)} />
            <EditableField label="Email" isEditing={isEditing}
              value={contract.clientEmail ?? contract.application?.clientEmail ?? "—"}
              editValue={getValue("clientEmail")} onEdit={v => setField("clientEmail", v)} type="email" />
            <EditableField label="Country" isEditing={isEditing}
              value={contract.clientCountry ?? "—"}
              editValue={getValue("clientCountry")} onEdit={v => setField("clientCountry", v)} />
          </DetailSection>

          <DetailSection title="Package">
            <EditableField label="Package Group" isEditing={isEditing}
              value={contract.packageGroupName ?? "—"}
              editValue={getValue("packageGroupName")} onEdit={v => setField("packageGroupName", v)} />
            <EditableField label="Package" isEditing={isEditing}
              value={contract.packageName ?? "—"}
              editValue={getValue("packageName")} onEdit={v => setField("packageName", v)} />
            <EditableField label="Agent" isEditing={isEditing}
              value={contract.agentName ?? "—"}
              editValue={getValue("agentName")} onEdit={v => setField("agentName", v)} />
            <EditableField label="Notes" isEditing={isEditing} value={contract.notes}
              editValue={getValue("notes")} onEdit={v => setField("notes", v)} />
          </DetailSection>
        </div>
      )}

      {activeTab === "services" && (
        <div className="space-y-4">
          {!servicesObj ? (
            <div className="text-sm text-muted-foreground">Loading services…</div>
          ) : (
            <>
              {/* Institute service */}
              {servicesObj.institute && (
                <DetailSection title="Institute / Language School">
                  <DetailRow label="Program" value={servicesObj.institute.programDetails} />
                  <DetailRow label="Start Date" value={servicesObj.institute.startDate ? format(new Date(servicesObj.institute.startDate), "PPP") : "—"} />
                  <DetailRow label="End Date" value={servicesObj.institute.endDate ? format(new Date(servicesObj.institute.endDate), "PPP") : "—"} />
                  <DetailRow label="Total Hours" value={servicesObj.institute.totalHours ? `${servicesObj.institute.totalHours} hrs` : "—"} />
                  <DetailRow label="English Level" value={servicesObj.institute.englishLevelStart ? `${servicesObj.institute.englishLevelStart} → ${servicesObj.institute.englishLevelEnd ?? "?"}` : "—"} />
                  <DetailRow label="Status">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[servicesObj.institute.status ?? ""] ?? "bg-gray-100 text-gray-600"}`}>{servicesObj.institute.status ?? "—"}</span>
                  </DetailRow>
                  {servicesObj.institute.progressNotes && <DetailRow label="Notes" value={servicesObj.institute.progressNotes} />}
                </DetailSection>
              )}

              {/* Hotel service */}
              {servicesObj.hotel && (
                <DetailSection title="Accommodation">
                  <DetailRow label="Room Type" value={servicesObj.hotel.roomType} />
                  <DetailRow label="Check-in" value={servicesObj.hotel.checkinDate ? `${format(new Date(servicesObj.hotel.checkinDate), "PPP")} ${servicesObj.hotel.checkinTime ?? ""}`.trim() : "—"} />
                  <DetailRow label="Check-out" value={servicesObj.hotel.checkoutDate ? `${format(new Date(servicesObj.hotel.checkoutDate), "PPP")} ${servicesObj.hotel.checkoutTime ?? ""}`.trim() : "—"} />
                  <DetailRow label="Confirmation #" value={servicesObj.hotel.confirmationNo ?? "—"} />
                  <DetailRow label="Status">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[servicesObj.hotel.status ?? ""] ?? "bg-gray-100 text-gray-600"}`}>{servicesObj.hotel.status ?? "—"}</span>
                  </DetailRow>
                  {servicesObj.hotel.guestNotes && <DetailRow label="Notes" value={servicesObj.hotel.guestNotes} />}
                </DetailSection>
              )}

              {/* Pickup service */}
              {servicesObj.pickup && (
                <DetailSection title="Airport Pickup / Transfer">
                  <DetailRow label="Type" value={servicesObj.pickup.pickupType?.replace(/_/g, " ") ?? "—"} />
                  <DetailRow label="From" value={servicesObj.pickup.fromLocation} />
                  <DetailRow label="To" value={servicesObj.pickup.toLocation} />
                  <DetailRow label="Date & Time" value={servicesObj.pickup.pickupDatetime ? format(new Date(servicesObj.pickup.pickupDatetime), "PPP HH:mm") : "—"} />
                  <DetailRow label="Status">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[servicesObj.pickup.status ?? ""] ?? "bg-gray-100 text-gray-600"}`}>{servicesObj.pickup.status ?? "—"}</span>
                  </DetailRow>
                  {servicesObj.pickup.driverNotes && <DetailRow label="Notes" value={servicesObj.pickup.driverNotes} />}
                </DetailSection>
              )}

              {/* Tour service */}
              {servicesObj.tour && (
                <DetailSection title="Tour / Activity">
                  <DetailRow label="Tour Name" value={servicesObj.tour.tourName} />
                  <DetailRow label="Date" value={servicesObj.tour.tourDate ? format(new Date(servicesObj.tour.tourDate), "PPP") : "—"} />
                  <DetailRow label="Time" value={servicesObj.tour.startTime ? `${servicesObj.tour.startTime} – ${servicesObj.tour.endTime ?? "?"}` : "—"} />
                  <DetailRow label="Meeting Point" value={servicesObj.tour.meetingPoint} />
                  <DetailRow label="Status">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[servicesObj.tour.status ?? ""] ?? "bg-gray-100 text-gray-600"}`}>{servicesObj.tour.status ?? "—"}</span>
                  </DetailRow>
                  {servicesObj.tour.tourNotes && <DetailRow label="Notes" value={servicesObj.tour.tourNotes} />}
                </DetailSection>
              )}

              {/* Settlements */}
              {Array.isArray(servicesObj.settlements) && servicesObj.settlements.length > 0 && (
                <DetailSection title="Settlements">
                  <div className="space-y-2">
                    {servicesObj.settlements.map((s: any) => (
                      <div key={s.id} className="border rounded-lg p-3 text-sm grid grid-cols-2 gap-1">
                        <div className="col-span-2 font-medium text-xs text-muted-foreground uppercase mb-1">{s.providerRole?.replace(/_/g, " ")} — {s.providerName ?? "—"}</div>
                        <div><span className="text-muted-foreground">Gross:</span> {CURRENCY_SYMBOLS[s.currency ?? "AUD"] ?? s.currency}{Number(s.grossAmount ?? 0).toLocaleString()}</div>
                        <div><span className="text-muted-foreground">Commission:</span> {s.commissionRate}%</div>
                        <div><span className="text-muted-foreground">Net:</span> {CURRENCY_SYMBOLS[s.currency ?? "AUD"] ?? s.currency}{Number(s.netAmount ?? 0).toLocaleString()}</div>
                        <div><span className={`px-1.5 py-0.5 rounded text-xs ${STATUS_COLORS[s.status ?? ""] ?? "bg-gray-100 text-gray-600"}`}>{s.status ?? "—"}</span></div>
                      </div>
                    ))}
                  </div>
                </DetailSection>
              )}

              {!servicesObj.institute && !servicesObj.hotel && !servicesObj.pickup && !servicesObj.tour && (
                <div className="text-sm text-muted-foreground">No services linked to this contract yet.</div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === "accounting" && (
        <div className="space-y-4">
          <ArTimeline contractId={id!} />
        </div>
      )}

      {activeTab === "documents" && (
        <EntityDocumentsTab
          entityType="contract"
          entityId={id!}
          mode="full"
        />
      )}

      {activeTab === "notes" && (
        <NotePanel entityType="contract" entityId={id!} />
      )}
    </DetailPageLayout>
  );
}
