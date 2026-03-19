import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { ListPagination } from "@/components/ui/list-pagination";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronRight, FileText, GitMerge, Loader2,
  User, Users, CalendarCheck, Video, MapPin, CheckCircle2, XCircle, Clock, AlertCircle,
  Pencil, X, Check,
} from "lucide-react";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const PAGE_SIZE = 10;

const APP_STATUSES = ["draft", "submitted", "under_review", "approved", "rejected", "contracted", "cancelled"];

interface Application {
  id: string; applicationNumber: string; studentName?: string;
  email?: string; phone?: string; nationality?: string; status: string;
  programType?: string; preferredStartDate?: string; participantCount?: number;
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
    draft: "bg-[#F4F3F1] text-[#57534E]", submitted: "bg-[#FEF0E3] text-[#F5821F]",
    under_review: "bg-[#FEF9C3] text-[#CA8A04]", approved: "bg-[#DCFCE7] text-[#16A34A]",
    rejected: "bg-[#FEF2F2] text-[#DC2626]", contracted: "bg-[#DCFCE7] text-[#16A34A]",
    cancelled: "bg-[#FEF2F2] text-[#DC2626]",
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
  studentName: "", email: "", phone: "", nationality: "", programType: "english_camp",
  preferredStartDate: "", status: "submitted", notes: "",
};

export default function Applications() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [convertDialog, setConvertDialog] = useState(false);
  const [createDialog, setCreateDialog] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [activeTab, setActiveTab] = useState("overview");
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Application>>({});

  const queryKey = ["applications", { search, status: activeStatus, page }];
  const { data: resp, isLoading } = useQuery({
    queryKey,
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (search) params.set("search", search);
      if (activeStatus !== "all") params.set("status", activeStatus);
      return axios.get(`${BASE}/api/applications?${params}`).then(r => r.data);
    },
  });
  const apps: Application[] = resp?.data ?? [];
  const total: number = resp?.meta?.total ?? apps.length;

  const { data: appDetail } = useQuery<{ participants?: Participant[] }>({
    queryKey: ["application-detail", selectedApp?.id],
    queryFn: () => axios.get(`${BASE}/api/applications/${selectedApp!.id}`).then(r => r.data),
    enabled: !!selectedApp?.id && activeTab === "participants",
  });

  const { data: interviewData } = useQuery<{ data: Interview[] }>({
    queryKey: ["app-interviews", selectedApp?.id],
    queryFn: () => axios.get(`${BASE}/api/interview-schedules?applicationId=${selectedApp!.id}`).then(r => r.data),
    enabled: !!selectedApp?.id && activeTab === "interview",
  });

  const convertContract = useMutation({
    mutationFn: (id: string) => axios.post(`${BASE}/api/applications/${id}/convert-contract`).then(r => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["applications"] });
      setConvertDialog(false); setSelectedApp(null);
      toast({ title: "Contract created", description: `Contract ${data.contractNumber} has been created.` });
    },
    onError: (err: any) => toast({ variant: "destructive", title: "Error", description: err.response?.data?.message || "Failed" }),
  });

  const createApp = useMutation({
    mutationFn: (d: any) => axios.post(`${BASE}/api/applications`, d).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["applications"] });
      setCreateDialog(false); setForm(emptyForm);
      toast({ title: "Application created" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to create application" }),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      axios.put(`${BASE}/api/applications/${id}/status`, { status }).then(r => r.data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["applications"] });
      if (selectedApp) setSelectedApp({ ...selectedApp, status: updated.status });
    },
  });

  const updateApp = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Application> }) =>
      axios.put(`${BASE}/api/applications/${id}`, data).then(r => r.data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["applications"] });
      setSelectedApp(prev => prev ? { ...prev, ...updated } : prev);
      setIsEditing(false);
      toast({ title: "Application updated" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to update application" }),
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
        addLabel="New Application"
        onAdd={() => setCreateDialog(true)}
      />

      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {["Application #", "Student", "Nationality", "Program", "Start Date", "Status", ""].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              [...Array(PAGE_SIZE)].map((_, i) => (
                <tr key={i}>{[...Array(7)].map((_, j) => (
                  <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>
                ))}</tr>
              ))
            ) : apps.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-16 text-center text-muted-foreground text-sm">No applications found</td></tr>
            ) : (
              apps.map(app => (
                <tr key={app.id} className="hover:bg-muted/20 transition-colors cursor-pointer"
                  onClick={() => { setSelectedApp(app); setActiveTab("overview"); }}>
                  <td className="px-4 py-3 font-mono text-xs font-medium text-foreground">{app.applicationNumber}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{app.studentName ?? "—"}</div>
                    {app.email && <div className="text-xs text-muted-foreground">{app.email}</div>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{app.nationality ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{app.programType ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {app.preferredStartDate ? format(new Date(app.preferredStartDate), "MMM d, yyyy") : "—"}
                  </td>
                  <td className="px-4 py-3"><AppStatusBadge status={app.status} /></td>
                  <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-muted-foreground" /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ListPagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />

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
                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2 space-y-1">
                            <Label className="text-xs">Student Name</Label>
                            <Input className="h-8 text-sm" value={editForm.studentName ?? ""} onChange={e => setEditForm(f => ({ ...f, studentName: e.target.value }))} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Email</Label>
                            <Input className="h-8 text-sm" type="email" value={editForm.email ?? ""} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Phone</Label>
                            <Input className="h-8 text-sm" value={editForm.phone ?? ""} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Nationality</Label>
                            <Input className="h-8 text-sm" value={editForm.nationality ?? ""} onChange={e => setEditForm(f => ({ ...f, nationality: e.target.value }))} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Program Type</Label>
                            <Select value={editForm.programType ?? ""} onValueChange={v => setEditForm(f => ({ ...f, programType: v }))}>
                              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                              <SelectContent>
                                {["english_camp", "stem_camp", "arts_camp", "sports_camp", "cultural_exchange", "language_school", "university_prep", "other"].map(p => (
                                  <SelectItem key={p} value={p}>{p.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
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
                        <dl className="grid grid-cols-2 gap-4">
                          <DetailRow label="Student Name" value={selectedApp.studentName} />
                          <DetailRow label="Nationality" value={selectedApp.nationality} />
                          <DetailRow label="Email" value={selectedApp.email} />
                          <DetailRow label="Phone" value={selectedApp.phone} />
                          <DetailRow label="Program Type" value={selectedApp.programType} />
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
                        <p>No participants recorded for this application</p>
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
                        <dl className="grid grid-cols-2 gap-3">
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
                        <p>No interview schedules for this application</p>
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
                        <dl className="grid grid-cols-2 gap-3">
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
                    <div className="text-center py-12 text-muted-foreground text-sm">
                      <FileText className="w-8 h-8 mx-auto mb-3 opacity-30" /><p>Documents upload coming soon</p>
                    </div>
                  </TabsContent>

                  <TabsContent value="notes" className="p-6 m-0">
                    {selectedApp.notes ? (
                      <div className="text-sm bg-muted/40 rounded-lg p-4">{selectedApp.notes}</div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground text-sm">
                        <FileText className="w-8 h-8 mx-auto mb-3 opacity-30" /><p>No notes added yet</p>
                      </div>
                    )}
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
              This will create a new contract for <strong>{selectedApp?.studentName ?? selectedApp?.applicationNumber}</strong> and update the application status to "Contracted".
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

      {/* Create Application Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Application</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); createApp.mutate(form); }} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Student Name *</Label>
                <Input value={form.studentName} onChange={e => setForm(f => ({ ...f, studentName: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Nationality</Label>
                <Input value={form.nationality} onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input type="date" value={form.preferredStartDate} onChange={e => setForm(f => ({ ...f, preferredStartDate: e.target.value }))} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Program Type</Label>
                <Select value={form.programType} onValueChange={v => setForm(f => ({ ...f, programType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["english_camp","stem_camp","arts_camp","sports_camp","leadership_camp","language_immersion"].map(t => (
                      <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setCreateDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={createApp.isPending} className="gap-2 bg-[#F5821F] hover:bg-[#d97706] text-white">
                {createApp.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Create
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
