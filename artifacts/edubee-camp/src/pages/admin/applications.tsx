import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Filter, ChevronRight, FileText, GitMerge, Loader2 } from "lucide-react";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const APP_STATUSES = [
  "draft", "submitted", "under_review", "approved", "rejected", "contracted", "cancelled"
];

interface Application {
  id: string; applicationNumber: string; studentName: string;
  email?: string; phone?: string; nationality?: string; status: string;
  programType?: string; preferredStartDate?: string; participantCount?: number;
  notes?: string; createdAt: string; updatedAt: string;
}

function AppStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700", submitted: "bg-orange-100 text-orange-700",
    under_review: "bg-amber-100 text-amber-700", approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700", contracted: "bg-teal-100 text-teal-700",
    cancelled: "bg-slate-100 text-slate-600",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${map[status] ?? "bg-gray-100 text-gray-700"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</dt>
      <dd className="text-sm font-medium">{value ?? "—"}</dd>
    </div>
  );
}

export default function Applications() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [convertDialog, setConvertDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const { data: apps = [], isLoading } = useQuery<Application[]>({
    queryKey: ["applications"],
    queryFn: () => axios.get(`${BASE}/api/applications`).then(r => r.data?.data ?? r.data),
  });

  const convertContract = useMutation({
    mutationFn: (id: string) => axios.post(`${BASE}/api/applications/${id}/convert-contract`).then(r => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["applications"] });
      setConvertDialog(false);
      setSelectedApp(null);
      toast({ title: "Contract created", description: `Contract ${data.contractNumber} has been created.` });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || "Failed to create contract";
      toast({ variant: "destructive", title: "Error", description: msg });
    },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      axios.put(`${BASE}/api/applications/${id}/status`, { status }).then(r => r.data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["applications"] });
      if (selectedApp) setSelectedApp({ ...selectedApp, status: updated.status });
    },
  });

  const filtered = apps.filter(a => {
    const matchSearch = !search ||
      a.studentName.toLowerCase().includes(search.toLowerCase()) ||
      a.applicationNumber.toLowerCase().includes(search.toLowerCase()) ||
      a.email?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search applications…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-40 text-sm">
            <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {APP_STATUSES.map(s => (
              <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto text-sm text-muted-foreground">{filtered.length} results</div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {["Application #", "Student", "Nationality", "Program", "Start Date", "Status", ""].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {[...Array(7)].map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-muted rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-16 text-center text-muted-foreground text-sm">No applications found</td></tr>
            ) : (
              filtered.map(app => (
                <tr
                  key={app.id}
                  className="hover:bg-muted/20 transition-colors cursor-pointer"
                  onClick={() => { setSelectedApp(app); setActiveTab("overview"); }}
                >
                  <td className="px-4 py-3 font-mono text-xs font-medium">{app.applicationNumber}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{app.studentName}</div>
                    {app.email && <div className="text-xs text-muted-foreground">{app.email}</div>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{app.nationality || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{app.programType || "—"}</td>
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

      {/* Detail Sheet */}
      <Sheet open={!!selectedApp} onOpenChange={o => !o && setSelectedApp(null)}>
        <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col">
          {selectedApp && (
            <>
              <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
                <div className="flex items-start justify-between">
                  <div>
                    <SheetTitle className="text-lg">{selectedApp.studentName}</SheetTitle>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="font-mono text-xs text-muted-foreground">{selectedApp.applicationNumber}</span>
                      <AppStatusBadge status={selectedApp.status} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {selectedApp.status === "approved" && (
                      <Button size="sm" onClick={() => setConvertDialog(true)} className="gap-1.5 text-xs h-8">
                        <GitMerge className="w-3.5 h-3.5" /> Convert to Contract
                      </Button>
                    )}
                  </div>
                </div>
              </SheetHeader>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                <TabsList className="shrink-0 mx-6 mt-4 w-auto justify-start bg-muted/60 p-1 rounded-lg h-9">
                  {["overview", "participants", "interview", "documents", "notes"].map(t => (
                    <TabsTrigger key={t} value={t} className="text-xs capitalize px-3 h-7">
                      {t}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <div className="flex-1 overflow-y-auto">
                  <TabsContent value="overview" className="p-6 m-0 space-y-6">
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
                          <button
                            key={s}
                            onClick={() => updateStatus.mutate({ id: selectedApp.id, status: s })}
                            className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors"
                          >
                            → {s.replace(/_/g, " ")}
                          </button>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="participants" className="p-6 m-0">
                    <div className="text-center py-12 text-muted-foreground text-sm">
                      <FileText className="w-8 h-8 mx-auto mb-3 opacity-30" />
                      <p>Participant details will appear here</p>
                    </div>
                  </TabsContent>

                  <TabsContent value="interview" className="p-6 m-0">
                    <div className="text-center py-12 text-muted-foreground text-sm">
                      <FileText className="w-8 h-8 mx-auto mb-3 opacity-30" />
                      <p>Interview schedule and notes will appear here</p>
                    </div>
                  </TabsContent>

                  <TabsContent value="documents" className="p-6 m-0">
                    <div className="text-center py-12 text-muted-foreground text-sm">
                      <FileText className="w-8 h-8 mx-auto mb-3 opacity-30" />
                      <p>Documents will appear here</p>
                    </div>
                  </TabsContent>

                  <TabsContent value="notes" className="p-6 m-0">
                    {selectedApp.notes ? (
                      <div className="text-sm bg-muted/40 rounded-lg p-4">{selectedApp.notes}</div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground text-sm">
                        <FileText className="w-8 h-8 mx-auto mb-3 opacity-30" />
                        <p>No notes added yet</p>
                      </div>
                    )}
                  </TabsContent>
                </div>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Convert to Contract Dialog */}
      <Dialog open={convertDialog} onOpenChange={setConvertDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert to Contract</DialogTitle>
            <DialogDescription>
              This will create a new contract for <strong>{selectedApp?.studentName}</strong> (
              {selectedApp?.applicationNumber}) and update the application status to "Contracted".
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setConvertDialog(false)}>Cancel</Button>
            <Button
              onClick={() => selectedApp && convertContract.mutate(selectedApp.id)}
              disabled={convertContract.isPending}
              className="gap-2"
            >
              {convertContract.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitMerge className="w-4 h-4" />}
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
