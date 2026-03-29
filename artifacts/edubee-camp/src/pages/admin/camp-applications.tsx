import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { NotePanel } from "@/components/shared/NotePanel";
import EntityDocumentsTab from "@/components/shared/EntityDocumentsTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { TableFooter } from "@/components/ui/table-footer";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronRight, FileText, GitMerge, Loader2,
  User, Users, CalendarCheck, Video, MapPin, CheckCircle2, XCircle, Clock, AlertCircle,
  Pencil, X, Check, Plus, Trash2, Package, ChevronLeft, ListChecks, FileSignature,
} from "lucide-react";
import { format } from "date-fns";
import { SortableTh, useSortState, useSorted } from "@/components/ui/sortable-th";
import { ClientNameCell } from "@/components/common/ClientNameCell";
import { nameFromCampApplication } from "@/lib/nameUtils";
import { NameFieldGroup } from "@/components/common/NameFieldGroup";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const PAGE_SIZE = 10;

const APP_STATUSES = ["submitted", "reviewing", "quoted", "confirmed", "cancelled"];

interface Application {
  id: string; applicationNumber: string; studentName?: string;
  applicantName?: string; applicantFirstName?: string | null;
  applicantLastName?: string | null; applicantOriginalName?: string | null;
  applicantEnglishName?: string | null;
  applicantEmail?: string; applicantPhone?: string;
  applicantNationality?: string; status: string; applicationStatus?: string;
  preferredStartDate?: string; participantCount?: number;
  packageName?: string | null;
  notes?: string; createdAt: string; updatedAt: string; clientId?: string;
}
interface Participant {
  id: string; applicationId: string; participantType: string;
  fullName: string; fullNameNative?: string; dateOfBirth?: string; gender?: string;
  nationality?: string; passportNumber?: string; passportExpiry?: string;
  grade?: string; schoolName?: string; englishLevel?: string; email?: string; phone?: string;
}
interface Interview {
  id: string; scheduledDatetime: string; timezone: string; format: string;
  meetingLink?: string; status: string; result?: string;
  interviewerNotes?: string; candidateNotes?: string;
}

function AppStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    submitted:  "bg-[#F4F3F1] text-[#57534E]",
    reviewing:  "bg-[#FEF0E3] text-[#F5821F]",
    quoted:     "bg-[#FEF9C3] text-[#CA8A04]",
    confirmed:  "bg-[#DCFCE7] text-[#16A34A]",
    cancelled:  "bg-[#FEF2F2] text-[#DC2626]",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${map[status] ?? "bg-[#F4F3F1] text-[#57534E]"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function InterviewResultBadge({ result }: { result?: string }) {
  if (!result) return null;
  const map: Record<string, { cls: string; icon: React.ElementType }> = {
    pass: { cls: "bg-[#DCFCE7] text-[#16A34A]", icon: CheckCircle2 },
    fail: { cls: "bg-[#FEF2F2] text-[#DC2626]", icon: XCircle },
    waitlist: { cls: "bg-[#FEF9C3] text-[#CA8A04]", icon: AlertCircle },
  };
  const conf = map[result] ?? { cls: "bg-[#F4F3F1] text-[#57534E]", icon: Clock };
  const Icon = conf.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${conf.cls}`}>
      <Icon className="w-3.5 h-3.5" />{result.charAt(0).toUpperCase() + result.slice(1)}
    </span>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{value ?? "—"}</dd>
    </div>
  );
}

const emptyForm = {
  applicantFirstName: "", applicantLastName: "", applicantOriginalName: "", applicantEnglishName: "",
  applicantEmail: "", applicantPhone: "", applicantNationality: "",
  preferredStartDate: "", status: "submitted", notes: "",
};

export default function CampApplications() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { sortBy, sortDir, onSort } = useSortState("createdOn", "desc");
  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [convertDialog, setConvertDialog] = useState(false);
  const [createDialog, setCreateDialog] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [activeTab, setActiveTab] = useState("overview");

  // Create form state (single-page)
  const [wizardParticipants, setWizardParticipants] = useState<Array<{
    fullName: string; dateOfBirth: string; gender: string; nationality: string;
    passportNumber: string; grade: string; schoolName: string; englishLevel: string;
    email: string; phone: string;
  }>>([]);
  const [wizardPackageId, setWizardPackageId] = useState("");
  const [wizardPackageSearch, setWizardPackageSearch] = useState("");
  const [wizardOptions, setWizardOptions] = useState<string[]>([]);
  const [wizardAgreed, setWizardAgreed] = useState(false);

  const WIZARD_OPTIONS = [
    { key: "airport_pickup", label: "Airport Pickup" },
    { key: "accommodation", label: "Accommodation" },
    { key: "guardian_service", label: "Guardian Service" },
    { key: "settlement_service", label: "Settlement Service" },
    { key: "insurance", label: "Travel Insurance" },
  ];

  const { data: packagesResp } = useQuery({
    queryKey: ["packages-wizard", wizardPackageSearch],
    queryFn: () => {
      const p = new URLSearchParams({ limit: "20" });
      if (wizardPackageSearch) p.set("search", wizardPackageSearch);
      return axios.get(`${BASE}/api/packages?${p}`).then(r => r.data);
    },
    enabled: createDialog,
  });
  const wizardPackages: Array<{ id: string; name: string; priceAud?: number }> = packagesResp?.data ?? packagesResp ?? [];
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Application>>({});

  useEffect(() => { setPage(1); }, [sortBy, sortDir]);

  const queryKey = ["camp-applications", { search, status: activeStatus, page, pageSize, sortBy, sortDir }];
  const { data: resp, isLoading } = useQuery({
    queryKey,
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
      if (search) params.set("search", search);
      if (activeStatus !== "all") params.set("applicationStatus", activeStatus);
      params.set("sortBy",  sortBy);
      params.set("sortDir", sortDir);
      return axios.get(`${BASE}/api/camp-applications?${params}`).then(r => ({
        ...r.data,
        data: (r.data.data ?? []).map((a: any) => ({
          ...a,
          applicationNumber: a.applicationRef,
          studentName: a.applicantName,
          status: a.applicationStatus,
        })),
      }));
    },
  });
  const apps: Application[] = resp?.data ?? [];
  const sorted = useSorted(apps, sortBy, sortDir);
  const total: number = resp?.meta?.total ?? sorted.length;

  const { data: appDetail } = useQuery<{ participants?: Participant[] }>({
    queryKey: ["camp-application-detail", selectedApp?.id],
    queryFn: () => axios.get(`${BASE}/api/camp-applications/${selectedApp!.id}`).then(r => r.data),
    enabled: !!selectedApp?.id && activeTab === "participants",
  });

  const { data: interviewData } = useQuery<{ data: Interview[] }>({
    queryKey: ["camp-app-interviews", selectedApp?.id],
    queryFn: () => axios.get(`${BASE}/api/interview-schedules?applicationId=${selectedApp!.id}`).then(r => r.data),
    enabled: !!selectedApp?.id && activeTab === "interview",
  });

  const convertContract = useMutation({
    mutationFn: (id: string) => axios.post(`${BASE}/api/applications/${id}/convert-contract`).then(r => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["camp-applications"] });
      setConvertDialog(false); setSelectedApp(null);
      toast({ title: "Contract created", description: `Contract ${data.contractNumber} has been created.` });
    },
    onError: (err: any) => toast({ variant: "destructive", title: "Error", description: err.response?.data?.message || "Failed" }),
  });

  const resetWizard = () => {
    setForm(emptyForm);
    setWizardParticipants([]); setWizardPackageId("");
    setWizardPackageSearch(""); setWizardOptions([]); setWizardAgreed(false);
  };

  const createApp = useMutation({
    mutationFn: async (d: any) => {
      const app = await axios.post(`${BASE}/api/applications`, d).then(r => r.data);
      // Post each participant
      for (const p of wizardParticipants) {
        if (p.fullName.trim()) {
          await axios.post(`${BASE}/api/applications/participants`, {
            applicationId: app.id,
            participantType: "student",
            fullName: p.fullName, dateOfBirth: p.dateOfBirth || undefined,
            gender: p.gender || undefined, nationality: p.nationality || undefined,
            passportNumber: p.passportNumber || undefined, grade: p.grade || undefined,
            schoolName: p.schoolName || undefined, englishLevel: p.englishLevel || undefined,
            email: p.email || undefined, phone: p.phone || undefined,
          });
        }
      }
      return app;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["camp-applications"] });
      setCreateDialog(false); resetWizard();
      toast({ title: "Camp Application created" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to create camp application" }),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      axios.patch(`${BASE}/api/camp-applications/${id}/status`, { applicationStatus: status }).then(r => r.data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["camp-applications"] });
      if (selectedApp) setSelectedApp({ ...selectedApp, status: updated.applicationStatus ?? updated.status });
    },
  });

  const updateApp = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Application> }) =>
      axios.put(`${BASE}/api/applications/${id}`, data).then(r => r.data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["camp-applications"] });
      setSelectedApp(prev => prev ? { ...prev, ...updated } : prev);
      setIsEditing(false);
      toast({ title: "Camp Application updated" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to update camp application" }),
  });

  const participants = appDetail?.participants ?? [];
  const interviews = interviewData?.data ?? [];

  return (
    <div className="space-y-4">
      <ListToolbar
        search={search}
        onSearch={v => { setSearch(v); setPage(1); }}
        statuses={APP_STATUSES}
        activeStatus={activeStatus}
        onStatusChange={s => { setActiveStatus(s); setPage(1); }}
        total={total}
        addLabel="New Camp Application"
        onAdd={() => setCreateDialog(true)}
        csvExportTable="applications"
      />

      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full min-w-[960px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <>
              <SortableTh key="Client" col="applicantName" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Client</SortableTh>
              <SortableTh key="Package" col="packageName" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Package</SortableTh>
              <SortableTh key="Nationality" col="applicantNationality" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nationality</SortableTh>
              <SortableTh key="Start Date" col="preferredStartDate" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Start Date</SortableTh>
              <SortableTh key="Created Date" col="createdAt" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Created Date</SortableTh>
              <SortableTh key="Status" col="status" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</SortableTh>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-20" />
            </>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              [...Array(pageSize)].map((_, i) => (
                <tr key={i}>{[...Array(7)].map((_, j) => (
                  <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>
                ))}</tr>
              ))
            ) : sorted.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-16 text-center text-muted-foreground text-sm">No camp applications found</td></tr>
            ) : (
              sorted.map(app => (
                <tr key={app.id} className="hover:bg-[#FEF0E3] transition-colors cursor-pointer"
                  onClick={() => setLocation(`${BASE}/admin/camp-applications/${app.id}`)}>
                  <td className="px-4 py-3">
                    <ClientNameCell
                      fields={nameFromCampApplication({
                        applicantFirstName:   app.applicantFirstName,
                        applicantLastName:    app.applicantLastName,
                        applicantOriginalName: app.applicantOriginalName,
                        applicantEnglishName: app.applicantEnglishName,
                        applicantName:        app.applicantName,
                      })}
                      subLabel={app.applicantEmail}
                    />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{app.packageName ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{app.applicantNationality ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {app.preferredStartDate ? format(new Date(app.preferredStartDate), "MMM d, yyyy") : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {app.createdAt ? format(new Date(app.createdAt), "MMM d, yyyy") : "—"}
                  </td>
                  <td className="px-4 py-3"><AppStatusBadge status={app.status} /></td>
                  <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-muted-foreground" /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <TableFooter page={page} pageSize={pageSize} total={total} label="applications" onPageChange={setPage} onPageSizeChange={v => { setPageSize(v); setPage(1); }} />

      {/* Detail Sheet */}
      <Sheet open={!!selectedApp} onOpenChange={o => { if (!o) { setSelectedApp(null); setIsEditing(false); } }}>
        <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col bg-background">
          {selectedApp && (
            <>
              <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
                <div className="flex items-start justify-between">
                  <div>
                    <SheetTitle className="text-lg text-foreground">{selectedApp.studentName ?? selectedApp.applicationNumber}</SheetTitle>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="font-mono text-xs text-muted-foreground">{selectedApp.applicationNumber}</span>
                      <AppStatusBadge status={selectedApp.status} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isEditing ? (
                      <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs"
                        onClick={() => { setEditForm({ ...selectedApp }); setIsEditing(true); setActiveTab("overview"); }}>
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </Button>
                    ) : (
                      <>
                        <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => setIsEditing(false)}>
                          <X className="w-3.5 h-3.5" /> Cancel
                        </Button>
                        <Button size="sm" className="h-7 gap-1 text-xs bg-[#F5821F] hover:bg-[#d97706] text-white"
                          disabled={updateApp.isPending}
                          onClick={() => updateApp.mutate({ id: selectedApp.id, data: editForm })}>
                          {updateApp.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save
                        </Button>
                      </>
                    )}
                    {!isEditing && selectedApp.status === "approved" && (
                      <Button size="sm" onClick={() => setConvertDialog(true)}
                        className="gap-1.5 text-xs h-8 bg-[#F5821F] hover:bg-[#d97706] text-white">
                        <GitMerge className="w-3.5 h-3.5" /> Convert to Contract
                      </Button>
                    )}
                  </div>
                </div>
              </SheetHeader>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                <TabsList className="shrink-0 mx-6 mt-4 w-auto justify-start bg-muted/60 p-1 rounded-lg h-9">
                  {["overview", "participants", "interview", "documents", "notes"].map(t => (
                    <TabsTrigger key={t} value={t} className="text-xs capitalize px-3 h-7">{t}</TabsTrigger>
                  ))}
                </TabsList>
                <div className="flex-1 overflow-y-auto">
                  <TabsContent value="overview" className="p-6 m-0 space-y-6">
                    {isEditing ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="col-span-2 space-y-1">
                            <Label className="text-xs">Client Name</Label>
                            <Input className="h-8 text-sm" value={editForm.applicantName ?? ""} onChange={e => setEditForm(f => ({ ...f, applicantName: e.target.value }))} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Email</Label>
                            <Input className="h-8 text-sm" type="email" value={editForm.applicantEmail ?? ""} onChange={e => setEditForm(f => ({ ...f, applicantEmail: e.target.value }))} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Phone</Label>
                            <Input className="h-8 text-sm" value={editForm.applicantPhone ?? ""} onChange={e => setEditForm(f => ({ ...f, applicantPhone: e.target.value }))} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Nationality</Label>
                            <Input className="h-8 text-sm" value={editForm.applicantNationality ?? ""} onChange={e => setEditForm(f => ({ ...f, applicantNationality: e.target.value }))} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Preferred Start Date</Label>
                            <Input className="h-8 text-sm" type="date" value={editForm.preferredStartDate ? editForm.preferredStartDate.slice(0, 10) : ""} onChange={e => setEditForm(f => ({ ...f, preferredStartDate: e.target.value }))} />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Notes</Label>
                          <Textarea className="text-sm resize-none" rows={3} value={editForm.notes ?? ""} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} placeholder="Add notes…" />
                        </div>
                      </div>
                    ) : (
                      <>
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <DetailRow label="Client Name" value={selectedApp.studentName} />
                          <DetailRow label="Nationality" value={selectedApp.applicantNationality} />
                          <DetailRow label="Email" value={selectedApp.applicantEmail} />
                          <DetailRow label="Phone" value={selectedApp.applicantPhone} />
                          <DetailRow label="Participants" value={selectedApp.participantCount} />
                          <DetailRow label="Preferred Start" value={selectedApp.preferredStartDate ? format(new Date(selectedApp.preferredStartDate), "MMM d, yyyy") : undefined} />
                          <DetailRow label="Created" value={format(new Date(selectedApp.createdAt), "MMM d, yyyy")} />
                        </dl>
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Change Status</h4>
                          <div className="flex flex-wrap gap-2">
                            {APP_STATUSES.filter(s => s !== selectedApp.status).map(s => (
                              <button key={s}
                                onClick={() => updateStatus.mutate({ id: selectedApp.id, status: s })}
                                className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors text-foreground">
                                → {s.replace(/_/g, " ")}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </TabsContent>

                  <TabsContent value="participants" className="p-6 m-0 space-y-4">
                    {participants.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground text-sm">
                        <Users className="w-8 h-8 mx-auto mb-3 opacity-30" />
                        <p>No participants recorded for this camp application</p>
                      </div>
                    ) : participants.map(p => (
                      <div key={p.id} className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-[#F5821F]/20 flex items-center justify-center">
                            <User className="w-4 h-4 text-[#F5821F]" />
                          </div>
                          <div>
                            <div className="font-semibold text-sm text-foreground">{p.fullName}</div>
                            {p.fullNameNative && <div className="text-xs text-muted-foreground">{p.fullNameNative}</div>}
                          </div>
                          <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-medium ${p.participantType === "student" ? "bg-[#FEF0E3] text-[#F5821F]" : "bg-[#F4F3F1] text-[#57534E]"}`}>
                            {p.participantType}
                          </span>
                        </div>
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {p.dateOfBirth && <DetailRow label="Date of Birth" value={format(new Date(p.dateOfBirth), "MMM d, yyyy")} />}
                          {p.gender && <DetailRow label="Gender" value={p.gender} />}
                          {p.nationality && <DetailRow label="Nationality" value={p.nationality} />}
                          {p.passportNumber && <DetailRow label="Passport No." value={p.passportNumber} />}
                          {p.passportExpiry && <DetailRow label="Passport Expiry" value={format(new Date(p.passportExpiry), "MMM d, yyyy")} />}
                          {p.grade && <DetailRow label="Grade" value={p.grade} />}
                          {p.schoolName && <DetailRow label="School" value={p.schoolName} />}
                          {p.englishLevel && <DetailRow label="English Level" value={p.englishLevel} />}
                        </dl>
                      </div>
                    ))}
                  </TabsContent>

                  <TabsContent value="interview" className="p-6 m-0 space-y-4">
                    {interviews.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground text-sm">
                        <CalendarCheck className="w-8 h-8 mx-auto mb-3 opacity-30" />
                        <p>No interview schedules for this camp application</p>
                      </div>
                    ) : interviews.map(iv => (
                      <div key={iv.id} className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            {iv.format === "video" ? <Video className="w-4 h-4 text-[#F5821F]" /> : <MapPin className="w-4 h-4 text-[#22C55E]" />}
                            <span className="font-semibold text-sm text-foreground capitalize">{iv.format} Interview</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${iv.status === "completed" ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#FEF0E3] text-[#F5821F]"}`}>{iv.status}</span>
                            <InterviewResultBadge result={iv.result} />
                          </div>
                        </div>
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <DetailRow label="Scheduled" value={format(new Date(iv.scheduledDatetime), "MMM d, yyyy HH:mm")} />
                          <DetailRow label="Timezone" value={iv.timezone} />
                          {iv.meetingLink && (
                            <div className="col-span-2 flex flex-col gap-0.5">
                              <dt className="text-[11px] text-muted-foreground uppercase tracking-wide">Meeting Link</dt>
                              <dd><a href={iv.meetingLink} target="_blank" rel="noopener noreferrer" className="text-sm text-[#F5821F] hover:underline break-all">{iv.meetingLink}</a></dd>
                            </div>
                          )}
                        </dl>
                        {iv.interviewerNotes && <div><p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">Interviewer Notes</p><p className="text-sm bg-muted/40 rounded-lg p-3">{iv.interviewerNotes}</p></div>}
                        {iv.candidateNotes && <div><p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">Candidate Notes</p><p className="text-sm bg-muted/40 rounded-lg p-3">{iv.candidateNotes}</p></div>}
                      </div>
                    ))}
                  </TabsContent>

                  <TabsContent value="documents" className="p-6 m-0">
                    <EntityDocumentsTab
                      entityType="application"
                      entityId={selectedApp.id}
                      mode="full"
                    />
                  </TabsContent>

                  <TabsContent value="notes" className="p-6 m-0">
                    {selectedApp.notes && (
                      <div className="text-sm bg-muted/40 rounded-lg p-4 mb-4">{selectedApp.notes}</div>
                    )}
                    <NotePanel
                      entityType="application"
                      entityId={selectedApp.id}
                      allowedNoteTypes={["internal", "special_request"]}
                      defaultVisibility="internal"
                    />
                  </TabsContent>
                </div>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Convert Dialog */}
      <Dialog open={convertDialog} onOpenChange={setConvertDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert to Contract</DialogTitle>
            <DialogDescription>
              This will create a new contract for <strong>{selectedApp?.studentName ?? selectedApp?.applicationNumber}</strong> and update the camp application status to "Contracted".
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setConvertDialog(false)}>Cancel</Button>
            <Button onClick={() => selectedApp && convertContract.mutate(selectedApp.id)}
              disabled={convertContract.isPending}
              className="gap-2 bg-[#F5821F] hover:bg-[#d97706] text-white">
              {convertContract.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitMerge className="w-4 h-4" />}
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Camp Application — Single-page form */}
      <Dialog open={createDialog} onOpenChange={open => { if (!open) { setCreateDialog(false); resetWizard(); } }}>
        <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="bg-[#F5821F] px-6 py-4 shrink-0">
            <DialogTitle className="text-white text-base font-semibold">New Camp Application</DialogTitle>
            <p className="text-white/80 text-xs mt-0.5">Fill in the details below and submit</p>
          </div>

          {/* Scrollable form body */}
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

            {/* ── Section 1: Application Details ─────────────────────── */}
            <div>
              <div className="bg-[#F5821F]/10 border border-[#F5821F]/20 rounded-lg px-4 py-2 mb-3">
                <span className="text-xs font-bold uppercase tracking-widest text-[#F5821F]">Application Details</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="col-span-2">
                  <NameFieldGroup
                    values={{
                      firstName:    form.applicantFirstName    ?? "",
                      lastName:     form.applicantLastName     ?? "",
                      originalName: form.applicantOriginalName ?? undefined,
                      englishName:  form.applicantEnglishName  ?? undefined,
                    }}
                    onChange={(key, value) => setForm(f => ({
                      ...f,
                      ...(key === "firstName"    && { applicantFirstName:    value }),
                      ...(key === "lastName"     && { applicantLastName:     value }),
                      ...(key === "originalName" && { applicantOriginalName: value }),
                      ...(key === "englishName"  && { applicantEnglishName:  value }),
                    }))}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email</Label>
                  <Input className="h-9 text-sm" type="email" value={form.applicantEmail} onChange={e => setForm(f => ({ ...f, applicantEmail: e.target.value }))} placeholder="email@example.com" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Phone</Label>
                  <Input className="h-9 text-sm" value={form.applicantPhone} onChange={e => setForm(f => ({ ...f, applicantPhone: e.target.value }))} placeholder="+82 10 xxxx xxxx" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Nationality</Label>
                  <Input className="h-9 text-sm" value={form.applicantNationality} onChange={e => setForm(f => ({ ...f, applicantNationality: e.target.value }))} placeholder="e.g. Korean" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Preferred Start Date</Label>
                  <Input className="h-9 text-sm" type="date" value={form.preferredStartDate} onChange={e => setForm(f => ({ ...f, preferredStartDate: e.target.value }))} />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs">Program Type</Label>
                  <Select value={form.notes?.match(/Program: (.+)/)?.[1] ?? "english_camp"} onValueChange={v => setForm(f => ({ ...f, notes: `Program: ${v}` }))}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[
                        { v: "english_camp", l: "English Camp" },
                        { v: "stem_camp", l: "STEM Camp" },
                        { v: "arts_camp", l: "Arts Camp" },
                        { v: "sports_camp", l: "Sports Camp" },
                        { v: "leadership_camp", l: "Leadership Camp" },
                        { v: "language_immersion", l: "Language Immersion" },
                      ].map(t => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* ── Section 2: Participating Students ──────────────────── */}
            <div>
              <div className="bg-[#F5821F]/10 border border-[#F5821F]/20 rounded-lg px-4 py-2 mb-3 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-[#F5821F]">Participating Students</span>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 text-[#F5821F] hover:bg-[#F5821F]/10"
                  onClick={() => setWizardParticipants(p => [...p, { fullName: "", dateOfBirth: "", gender: "", nationality: "", passportNumber: "", grade: "", schoolName: "", englishLevel: "", email: "", phone: "" }])}>
                  <Plus className="w-3 h-3" /> Add Student
                </Button>
              </div>
              {wizardParticipants.length === 0 ? (
                <div className="border border-dashed border-border rounded-lg py-8 flex flex-col items-center gap-2 text-muted-foreground">
                  <Users className="w-7 h-7 opacity-30" />
                  <span className="text-xs">Click "Add Student" to register participants (optional)</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {wizardParticipants.map((p, i) => (
                    <div key={i} className="border border-border rounded-lg p-3 space-y-2 bg-muted/20">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-foreground">Student {i + 1}</span>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500"
                          onClick={() => setWizardParticipants(prev => prev.filter((_, j) => j !== i))}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="col-span-2 space-y-1">
                          <Label className="text-[11px]">Full Name *</Label>
                          <Input className="h-8 text-sm" value={p.fullName} onChange={e => setWizardParticipants(prev => prev.map((x, j) => j === i ? { ...x, fullName: e.target.value } : x))} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px]">Date of Birth</Label>
                          <Input className="h-8 text-sm" type="date" value={p.dateOfBirth} onChange={e => setWizardParticipants(prev => prev.map((x, j) => j === i ? { ...x, dateOfBirth: e.target.value } : x))} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px]">Gender</Label>
                          <Select value={p.gender} onValueChange={v => setWizardParticipants(prev => prev.map((x, j) => j === i ? { ...x, gender: v } : x))}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                            <SelectContent>
                              {["male","female","other"].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px]">Nationality</Label>
                          <Input className="h-8 text-sm" value={p.nationality} onChange={e => setWizardParticipants(prev => prev.map((x, j) => j === i ? { ...x, nationality: e.target.value } : x))} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px]">Grade / Year</Label>
                          <Input className="h-8 text-sm" value={p.grade} onChange={e => setWizardParticipants(prev => prev.map((x, j) => j === i ? { ...x, grade: e.target.value } : x))} />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <Label className="text-[11px]">School Name</Label>
                          <Input className="h-8 text-sm" value={p.schoolName} onChange={e => setWizardParticipants(prev => prev.map((x, j) => j === i ? { ...x, schoolName: e.target.value } : x))} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Section 3: Camp Package ─────────────────────────────── */}
            <div>
              <div className="bg-[#F5821F]/10 border border-[#F5821F]/20 rounded-lg px-4 py-2 mb-3">
                <span className="text-xs font-bold uppercase tracking-widest text-[#F5821F]">Camp Package <span className="text-[#F5821F]/60 font-normal normal-case tracking-normal">(optional)</span></span>
              </div>
              <Input className="h-9 text-sm mb-2" placeholder="Search packages…" value={wizardPackageSearch} onChange={e => setWizardPackageSearch(e.target.value)} />
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                <div
                  className={`rounded-lg border p-3 cursor-pointer transition-colors ${!wizardPackageId ? "border-[#F5821F] bg-[#FEF0E3]" : "border-border hover:border-[#F5821F]/50"}`}
                  onClick={() => setWizardPackageId("")}>
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${!wizardPackageId ? "border-[#F5821F]" : "border-muted-foreground"}`}>
                      {!wizardPackageId && <div className="w-2 h-2 rounded-full bg-[#F5821F]" />}
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">No package</span>
                  </div>
                </div>
                {wizardPackages.map((pkg: any) => (
                  <div key={pkg.id}
                    className={`rounded-lg border p-3 cursor-pointer transition-colors ${wizardPackageId === pkg.id ? "border-[#F5821F] bg-[#FEF0E3]" : "border-border hover:border-[#F5821F]/50"}`}
                    onClick={() => setWizardPackageId(pkg.id)}>
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${wizardPackageId === pkg.id ? "border-[#F5821F]" : "border-muted-foreground"}`}>
                        {wizardPackageId === pkg.id && <div className="w-2 h-2 rounded-full bg-[#F5821F]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{pkg.name}</div>
                        {pkg.priceAud && <div className="text-xs text-muted-foreground">AUD {Number(pkg.priceAud).toLocaleString()}</div>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Section 4: Additional Options ──────────────────────── */}
            <div>
              <div className="bg-[#F5821F]/10 border border-[#F5821F]/20 rounded-lg px-4 py-2 mb-3">
                <span className="text-xs font-bold uppercase tracking-widest text-[#F5821F]">Additional Options <span className="text-[#F5821F]/60 font-normal normal-case tracking-normal">(optional)</span></span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {WIZARD_OPTIONS.map(opt => {
                  const checked = wizardOptions.includes(opt.key);
                  return (
                    <label key={opt.key}
                      className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${checked ? "border-[#F5821F] bg-[#FEF0E3]" : "border-border hover:border-[#F5821F]/50"}`}>
                      <input type="checkbox" className="accent-[#F5821F] w-4 h-4 shrink-0" checked={checked}
                        onChange={() => setWizardOptions(prev => checked ? prev.filter(k => k !== opt.key) : [...prev, opt.key])} />
                      <span className="text-sm">{opt.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* ── Section 5: Terms & Agreement ───────────────────────── */}
            <div>
              <div className="bg-[#F5821F]/10 border border-[#F5821F]/20 rounded-lg px-4 py-2 mb-3">
                <span className="text-xs font-bold uppercase tracking-widest text-[#F5821F]">Terms &amp; Agreement</span>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 p-4 text-xs text-muted-foreground space-y-2 leading-relaxed mb-3">
                <p>This application is the official document for enrolling in the Edubee Camp program. By agreeing below, your application will be submitted for review.</p>
                <p>1. All information provided is true and accurate.</p>
                <p>2. I agree to the camp program cancellation and refund policy.</p>
                <p>3. Participant photos and videos may be used for promotional purposes.</p>
                <p>4. Medical and other expenses incurred during the camp are the responsibility of the applicant.</p>
                <p>5. I agree to comply with Edubee Camp's operational rules and instructions.</p>
              </div>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" className="accent-[#F5821F] w-4 h-4 mt-0.5 shrink-0" checked={wizardAgreed} onChange={e => setWizardAgreed(e.target.checked)} />
                <span className="text-sm text-foreground">I have read and agree to the terms and conditions above.</span>
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/20 shrink-0">
            <Button variant="outline" className="gap-1.5 h-9 text-sm"
              onClick={() => { setCreateDialog(false); resetWizard(); }}>
              <X className="w-3.5 h-3.5" /> Cancel
            </Button>
            <Button className="gap-1.5 h-9 text-sm bg-[#F5821F] hover:bg-[#d97706] text-white"
              disabled={!form.applicantFirstName.trim() || !form.applicantLastName.trim() || !wizardAgreed || createApp.isPending}
              onClick={() => createApp.mutate({
                ...form,
                notes: [form.notes, wizardOptions.length > 0 ? `Options: ${wizardOptions.join(", ")}` : "", wizardPackageId ? `PackageId: ${wizardPackageId}` : ""].filter(Boolean).join("\n"),
              })}>
              {createApp.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Submit Application
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
