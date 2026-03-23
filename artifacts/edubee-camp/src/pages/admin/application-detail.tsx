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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ParticipantEditDialog, ParticipantAddDialog } from "@/components/shared/ParticipantDialogs";
import { Pencil, Plus, ClipboardList, Loader2, ExternalLink, FileText } from "lucide-react";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const APP_STATUSES = ["pending", "reviewing", "approved", "rejected", "cancelled", "converted"];
const GENDERS = ["male", "female", "other", "prefer_not_to_say"];
const ENGLISH_LEVELS = ["beginner", "elementary", "pre_intermediate", "intermediate", "upper_intermediate", "advanced", "proficient"];

const TABS = [
  { key: "overview",     label: "Overview" },
  { key: "services",     label: "Services" },
  { key: "participants", label: "Participants" },
  { key: "documents",    label: "Documents" },
  { key: "notes",        label: "Notes" },
];

const STATUS_COLORS: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-700",
  reviewing: "bg-blue-100 text-blue-700",
  approved:  "bg-green-100 text-green-700",
  rejected:  "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-600",
  converted: "bg-teal-100 text-teal-700",
  quoted:    "bg-[#E0F2FE] text-[#0369A1]",
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  // Edit dialogs state
  const [editParticipant, setEditParticipant] = useState<any | null>(null);
  const [addParticipant, setAddParticipant] = useState(false);
  const [convertQuoteDialog, setConvertQuoteDialog] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["application-detail-page", id],
    queryFn: () => axios.get(`${BASE}/api/applications/${id}`).then(r => r.data),
  });

  const app = data?.data ?? data;
  const participants: any[] = app?.participants ?? [];

  const isContracted = app?.status === "contracted";
  const canEdit = ["super_admin", "admin", "camp_coordinator"].includes(user?.role ?? "") && !isContracted;

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

  const convertToQuote = useMutation({
    mutationFn: () => axios.post(`${BASE}/api/applications/${id}/convert-to-quote`).then(r => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["application-detail-page", id] });
      qc.invalidateQueries({ queryKey: ["applications"] });
      setConvertQuoteDialog(false);
      toast({ title: `Quote created: ${data.quoteRefNumber}` });
      window.location.href = `${BASE}/admin/crm/quotes/${data.quoteId}`;
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error ?? "Failed to convert";
      toast({ variant: "destructive", title: msg });
    },
  });

  const updateParticipant = useMutation({
    mutationFn: ({ pid, data }: { pid: string; data: Record<string, any> }) =>
      axios.patch(`${BASE}/api/applications/participants/${pid}`, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["application-detail-page", id] });
      toast({ title: "Participant updated" });
      setEditParticipant(null);
    },
    onError: () => toast({ variant: "destructive", title: "Failed to update participant" }),
  });

  const createParticipant = useMutation({
    mutationFn: (data: Record<string, any>) =>
      axios.post(`${BASE}/api/applications/participants`, { ...data, applicationId: id }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["application-detail-page", id] });
      toast({ title: "Participant added" });
      setAddParticipant(false);
    },
    onError: () => toast({ variant: "destructive", title: "Failed to add participant" }),
  });

  const { isEditing, isSaving, startEdit, cancelEdit, setField, saveEdit, getValue } = useDetailEdit({
    initialData: app ?? {},
    onSave: async (data) => { await updateApp.mutateAsync(data); },
  });

  if (isLoading) return <div className="p-6 space-y-4">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>;
  if (!app) return <div className="p-6 text-muted-foreground">Application not found.</div>;

  const statusColor = STATUS_COLORS[app.status ?? "pending"] ?? "bg-gray-100 text-gray-600";

  return (
    <>
      <DetailPageLayout
        title={app.applicationNumber ?? "Application"}
        subtitle={app.applicantName ?? app.studentName ?? ""}
        badge={<span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>{(app.applicationStatus ?? app.status ?? "pending").replace(/_/g, " ")}</span>}
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
        headerExtra={
          canEdit ? (
            app.quoteId ? (
              <a
                href={`${BASE}/admin/crm/quotes/${app.quoteId}`}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-[#F5821F] text-[#F5821F] text-xs font-medium hover:bg-[#FEF0E3] transition-colors"
              >
                <FileText className="w-3.5 h-3.5" strokeWidth={1.5} />
                View Quote →
              </a>
            ) : (
              <Button
                size="sm"
                className="h-8 gap-1.5 text-xs bg-[#F5821F] hover:bg-[#D96A0A] text-white"
                onClick={() => setConvertQuoteDialog(true)}
                disabled={convertToQuote.isPending}
              >
                <FileText className="w-3.5 h-3.5" strokeWidth={1.5} />
                Convert to Quote
              </Button>
            )
          ) : null
        }
      >

        {/* ── Overview ── */}
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

            {/* Service Details */}
            {(app.serviceTypes || app.applicationType) && (
              <DetailSection title="Service Details">
                <DetailRow label="Application Type" value={app.applicationType?.replace(/_/g, " ")} />
                <DetailRow label="Service Types" value={
                  Array.isArray(app.serviceTypes) ? (app.serviceTypes as string[]).map((s: string) => s.replace(/_/g, " ")).join(", ") : null
                } />
                {app.applicantName && <DetailRow label="Applicant" value={app.applicantName} />}
                {app.applicantEmail && <DetailRow label="Email" value={app.applicantEmail} />}
                {app.applicantPhone && <DetailRow label="Phone" value={app.applicantPhone} />}
                {app.applicantNationality && <DetailRow label="Nationality" value={app.applicantNationality} />}
                {app.flightNumber && <DetailRow label="Flight #" value={app.flightNumber} />}
                {app.flightDate && <DetailRow label="Flight Date" value={app.flightDate ? format(new Date(app.flightDate), "PPP") : null} />}
                {app.arrivalTime && <DetailRow label="Arrival Time" value={app.arrivalTime} />}
                {app.departureAirport && <DetailRow label="Departure Airport" value={app.departureAirport} />}
                {app.arrivalAirport && <DetailRow label="Arrival Airport" value={app.arrivalAirport} />}
                {app.passengerCount && <DetailRow label="Passengers" value={app.passengerCount} />}
                {app.checkinDate && <DetailRow label="Check-in" value={app.checkinDate ? format(new Date(app.checkinDate), "PPP") : null} />}
                {app.checkoutDate && <DetailRow label="Check-out" value={app.checkoutDate ? format(new Date(app.checkoutDate), "PPP") : null} />}
                {app.roomType && <DetailRow label="Room Type" value={app.roomType} />}
                {app.numRooms && <DetailRow label="Rooms" value={app.numRooms} />}
                {app.accommodationAddress && <DetailRow label="Address" value={app.accommodationAddress} />}
                {app.destinationCountry && <DetailRow label="Destination" value={app.destinationCountry} />}
                {app.studyStartDate && <DetailRow label="Study Start" value={app.studyStartDate ? format(new Date(app.studyStartDate), "PPP") : null} />}
                {app.studyEndDate && <DetailRow label="Study End" value={app.studyEndDate ? format(new Date(app.studyEndDate), "PPP") : null} />}
                {app.institutionName && <DetailRow label="Institution" value={app.institutionName} />}
                {app.courseName && <DetailRow label="Course" value={app.courseName} />}
                {app.internshipStartDate && <DetailRow label="Internship Start" value={app.internshipStartDate ? format(new Date(app.internshipStartDate), "PPP") : null} />}
                {app.internshipEndDate && <DetailRow label="Internship End" value={app.internshipEndDate ? format(new Date(app.internshipEndDate), "PPP") : null} />}
                {app.industry && <DetailRow label="Industry" value={app.industry} />}
                {app.companyPreference && <DetailRow label="Company Preference" value={app.companyPreference} />}
                {app.settlementDate && <DetailRow label="Settlement Date" value={app.settlementDate ? format(new Date(app.settlementDate), "PPP") : null} />}
                {app.suburb && <DetailRow label="Suburb" value={app.suburb} />}
                {app.guardianStartDate && <DetailRow label="Guardian Start" value={app.guardianStartDate ? format(new Date(app.guardianStartDate), "PPP") : null} />}
                {app.guardianEndDate && <DetailRow label="Guardian End" value={app.guardianEndDate ? format(new Date(app.guardianEndDate), "PPP") : null} />}
                {app.guardianType && <DetailRow label="Guardian Type" value={app.guardianType} />}
              </DetailSection>
            )}

            {/* Linked Records */}
            {app.quoteId && (
              <DetailSection title="Linked Records">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Quote</span>
                  <a href={`${BASE}/admin/crm/quotes/${app.quoteId}`}
                    className="flex items-center gap-1 text-sm text-[#F5821F] hover:underline">
                    View Quote <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </DetailSection>
            )}
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
                      No participants on this application.
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

        {/* ── Services ── */}
        {activeTab === "services" && (() => {
          const types: string[] = Array.isArray(app.serviceTypes) ? app.serviceTypes : [];

          if (types.length === 0) {
            return (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <ClipboardList className="w-8 h-8 mb-3 opacity-20" />
                <p className="text-sm">No services selected for this application.</p>
                <p className="text-xs mt-1">Edit the application to add service types.</p>
              </div>
            );
          }

          const SERVICE_META: Record<string, {
            label: string; color: string; icon: string;
            fields: { label: string; key: string; type?: "date" }[];
          }> = {
            pickup: {
              label: "Pickup / Airport Transfer", icon: "🚌", color: "bg-[#FEF9C3] border-yellow-200",
              fields: [
                { label: "Flight Number",      key: "flightNumber" },
                { label: "Flight Date",        key: "flightDate",        type: "date" },
                { label: "Arrival Time",       key: "arrivalTime" },
                { label: "Departure Airport",  key: "departureAirport" },
                { label: "Arrival Airport",    key: "arrivalAirport" },
                { label: "Passengers",         key: "passengerCount" },
              ],
            },
            accommodation: {
              label: "Accommodation", icon: "🏨", color: "bg-[#EFF6FF] border-blue-200",
              fields: [
                { label: "Check-in",  key: "checkinDate",         type: "date" },
                { label: "Check-out", key: "checkoutDate",        type: "date" },
                { label: "Room Type", key: "roomType" },
                { label: "Rooms",     key: "numRooms" },
                { label: "Address",   key: "accommodationAddress" },
              ],
            },
            study_abroad: {
              label: "Study Abroad", icon: "🎓", color: "bg-[#F0FDF4] border-green-200",
              fields: [
                { label: "Destination",  key: "destinationCountry" },
                { label: "Institution",  key: "institutionName" },
                { label: "Course",       key: "courseName" },
                { label: "Start Date",   key: "studyStartDate", type: "date" },
                { label: "End Date",     key: "studyEndDate",   type: "date" },
              ],
            },
            internship: {
              label: "Internship", icon: "💼", color: "bg-[#FDF4FF] border-purple-200",
              fields: [
                { label: "Start Date",         key: "internshipStartDate", type: "date" },
                { label: "End Date",           key: "internshipEndDate",   type: "date" },
                { label: "Industry",           key: "industry" },
                { label: "Company Preference", key: "companyPreference" },
              ],
            },
            settlement: {
              label: "Settlement", icon: "🏠", color: "bg-[#FFF7ED] border-orange-200",
              fields: [
                { label: "Settlement Date", key: "settlementDate", type: "date" },
                { label: "Suburb / Area",   key: "suburb" },
              ],
            },
            guardian: {
              label: "Guardian", icon: "🛡️", color: "bg-[#F0F9FF] border-sky-200",
              fields: [
                { label: "Start Date",    key: "guardianStartDate", type: "date" },
                { label: "End Date",      key: "guardianEndDate",   type: "date" },
                { label: "Guardian Type", key: "guardianType" },
              ],
            },
          };

          return (
            <div className="space-y-4">
              {types.map(t => {
                const meta = SERVICE_META[t];
                if (!meta) return (
                  <div key={t} className="rounded-xl border p-4 bg-muted/30">
                    <p className="text-sm font-medium capitalize">{t.replace(/_/g, " ")}</p>
                    <p className="text-xs text-muted-foreground mt-1">No configuration available for this service type.</p>
                  </div>
                );
                const hasData = meta.fields.some(f => app[f.key]);
                return (
                  <div key={t} className={`rounded-xl border p-5 ${meta.color}`}>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-xl">{meta.icon}</span>
                      <h3 className="font-semibold text-sm text-[#1C1917]">{meta.label}</h3>
                    </div>
                    {!hasData ? (
                      <p className="text-xs text-muted-foreground italic">No details entered yet. Edit the application to add information.</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-3">
                        {meta.fields.map(f => {
                          const val = app[f.key];
                          if (!val) return null;
                          const display = f.type === "date"
                            ? (() => { try { return format(new Date(val), "MMM d, yyyy"); } catch { return val; } })()
                            : String(val);
                          return (
                            <div key={f.key}>
                              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">{f.label}</p>
                              <p className="text-sm text-[#1C1917]">{display}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}

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
      {/* Convert to Quote Dialog */}
      <Dialog open={convertQuoteDialog} onOpenChange={setConvertQuoteDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Convert to Quote?</DialogTitle>
            <DialogDescription>
              This will create a new draft Quote in the CRM from this application's data. The application status will be updated to <strong>Quoted</strong>. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setConvertQuoteDialog(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-[#F5821F] hover:bg-[#D96A0A] text-white"
              onClick={() => convertToQuote.mutate()}
              disabled={convertToQuote.isPending}
            >
              {convertToQuote.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Convert to Quote"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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

    </>
  );
}
