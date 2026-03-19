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

const CONTRACT_STATUSES = ["draft", "sent", "signed", "active", "completed", "cancelled", "suspended"];
const CURRENCY_SYMBOLS: Record<string, string> = { AUD: "A$", USD: "$", KRW: "₩", JPY: "¥", THB: "฿", PHP: "₱", SGD: "S$", GBP: "£" };

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "services", label: "Services" },
  { key: "accounting", label: "Accounting" },
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
            <DetailRow label="Currency" value={contract.currency} />
            <DetailRow label="Total Amount" value={fmtCcy(contract.totalAmount, contract.currency)} />
            <DetailRow label="Paid Amount" value={fmtCcy(contract.paidAmount, contract.currency)} />
            <DetailRow label="Balance" value={fmtCcy(contract.balanceAmount ?? (Number(contract.totalAmount ?? 0) - Number(contract.paidAmount ?? 0)), contract.currency)} />
          </DetailSection>

          <DetailSection title="Dates">
            <EditableField label="Start Date" isEditing={isEditing} value={contract.startDate ? format(new Date(contract.startDate), "PPP") : "—"}
              editValue={getValue("startDate")} onEdit={v => setField("startDate", v)} type="date" />
            <EditableField label="End Date" isEditing={isEditing} value={contract.endDate ? format(new Date(contract.endDate), "PPP") : "—"}
              editValue={getValue("endDate")} onEdit={v => setField("endDate", v)} type="date" />
            <DetailRow label="Signed At" value={contract.signedAt ? format(new Date(contract.signedAt), "PPP") : "—"} />
            <DetailRow label="Created" value={contract.createdAt ? format(new Date(contract.createdAt), "PPP") : "—"} />
          </DetailSection>

          <DetailSection title="Student / Client">
            <DetailRow label="Student Name" value={contract.studentName ?? contract.application?.studentName} />
            <DetailRow label="Email" value={contract.clientEmail ?? contract.application?.clientEmail} />
            <DetailRow label="Country" value={contract.clientCountry} />
          </DetailSection>

          <DetailSection title="Package">
            <DetailRow label="Package Group" value={contract.packageGroupName ?? "—"} />
            <DetailRow label="Package" value={contract.packageName ?? "—"} />
            <DetailRow label="Agent" value={contract.agentName ?? "—"} />
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
          {accounting?.transactions && (
            <DetailSection title="Transactions">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left py-2">Date</th>
                    <th className="text-left py-2">Type</th>
                    <th className="text-right py-2">Amount</th>
                    <th className="text-left py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {accounting.transactions.map((t: any) => (
                    <tr key={t.id} className="border-b last:border-0">
                      <td className="py-2">{t.transactionDate ? format(new Date(t.transactionDate), "MMM d, yyyy") : "—"}</td>
                      <td className="py-2 capitalize">{t.transactionType?.replace(/_/g, " ") ?? "—"}</td>
                      <td className="py-2 text-right font-mono">{fmtCcy(t.amount, t.currency)}</td>
                      <td className="py-2"><span className={`px-1.5 py-0.5 rounded text-xs ${STATUS_COLORS[t.status ?? ""] ?? "bg-gray-100 text-gray-600"}`}>{t.status ?? "—"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DetailSection>
          )}
        </div>
      )}

      {activeTab === "notes" && (
        <NotePanel entityType="contract" entityId={id!} />
      )}
    </DetailPageLayout>
  );
}
