import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Plus, Eye, Upload, Download, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-[#F4F3F1] text-[#57534E] border-[#E8E6E2]",
  published: "bg-[#DCFCE7] text-[#16A34A] border-[#16A34A]/20",
};

interface Report { id: string; contractId?: string | null; reportTitle?: string | null; status?: string | null; publishedAt?: string | null; summaryNotes?: string | null; createdAt?: string | null; sections?: any[]; }

export default function Reports() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selected, setSelected] = useState<Report | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ contractId: "", reportTitle: "", summaryNotes: "" });

  const role = user?.role ?? "";
  const canCreate = ["super_admin", "admin", "camp_coordinator"].includes(role);
  const canEdit = canCreate;
  const isViewOnly = role === "education_agent" || role === "parent_client";

  const { data, isLoading } = useQuery({
    queryKey: ["reports"],
    queryFn: () => axios.get(`${BASE}/api/reports`).then(r => r.data),
  });
  const reports: Report[] = data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (payload: typeof form) => axios.post(`${BASE}/api/reports`, payload).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["reports"] }); toast({ title: "Report created" }); setShowCreate(false); setForm({ contractId: "", reportTitle: "", summaryNotes: "" }); },
    onError: () => toast({ title: "Failed to create report", variant: "destructive" }),
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => axios.patch(`${BASE}/api/reports/${id}/publish`).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["reports"] }); toast({ title: "Report published — agent & client notified" }); setSelected(null); },
  });

  const drafts = reports.filter(r => r.status === "draft");
  const published = reports.filter(r => r.status === "published");

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#F5821F]/10 flex items-center justify-center"><BookOpen className="w-5 h-5 text-[#F5821F]" /></div>
          <div><h1 className="text-lg font-bold">Program Reports</h1><p className="text-xs text-muted-foreground">{isViewOnly ? "Published reports for your programs" : "Create, edit and publish student program reports"}</p></div>
        </div>
        {canCreate && (
          <Button size="sm" className="bg-[#F5821F] hover:bg-[#d97706] text-white gap-1.5" onClick={() => setShowCreate(true)}>
            <Plus className="w-3.5 h-3.5" /> New Report
          </Button>
        )}
      </div>

      {/* Stats */}
      {canEdit && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white rounded-lg border p-3 text-center">
            <div className="text-2xl font-bold text-[#CA8A04]">{drafts.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Drafts</div>
          </div>
          <div className="bg-white rounded-lg border p-3 text-center">
            <div className="text-2xl font-bold text-[#16A34A]">{published.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Published</div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground"><BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" /><p className="text-sm">{isViewOnly ? "No published reports available yet" : "No reports created yet"}</p></div>
      ) : (
        <div className="grid gap-3">
          {reports.map(r => (
            <div key={r.id} className="bg-white rounded-lg border p-4 hover:border-[#F5821F]/40 transition-colors cursor-pointer flex items-start justify-between gap-3" onClick={() => setSelected(r)}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border capitalize ${STATUS_COLORS[r.status ?? "draft"] ?? "bg-[#F4F3F1] text-[#57534E] border-[#E8E6E2]"}`}>{r.status}</span>
                  <span className="text-xs text-muted-foreground font-mono">{r.contractId?.slice(0, 8)}</span>
                </div>
                <h3 className="font-semibold text-sm">{r.reportTitle ?? "Untitled Report"}</h3>
                {r.summaryNotes && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.summaryNotes}</p>}
                <div className="text-[10px] text-muted-foreground mt-1.5">
                  Created: {r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-AU") : "—"}
                  {r.publishedAt && ` · Published: ${new Date(r.publishedAt).toLocaleDateString("en-AU")}`}
                </div>
              </div>
              <div className="flex gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                {r.status === "published" && (
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1"><Download className="w-3 h-3" /> PDF</Button>
                )}
                {canEdit && r.status === "draft" && (
                  <Button size="sm" className="h-7 text-xs bg-[#16A34A] hover:bg-[#15803D] text-white gap-1" onClick={() => publishMutation.mutate(r.id)}>
                    <Upload className="w-3 h-3" /> Publish
                  </Button>
                )}
                {canEdit && (
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setSelected(r)}><Eye className="w-3 h-3" /> View</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={o => { if (!o) setSelected(null); }}>
        <SheetContent className="w-[560px] sm:max-w-[560px] overflow-y-auto">
          <SheetHeader><SheetTitle className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-[#F5821F]" /> {selected?.reportTitle ?? "Report"}</SheetTitle></SheetHeader>
          {selected && (
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border capitalize ${STATUS_COLORS[selected.status ?? "draft"] ?? "bg-[#F4F3F1] text-[#57534E] border-[#E8E6E2]"}`}>{selected.status}</span>
                <span className="text-xs text-muted-foreground font-mono">{selected.contractId?.slice(0, 8)}</span>
              </div>
              <div className="bg-muted/30 rounded-lg p-4 space-y-2 text-sm">
                <div><span className="text-muted-foreground text-xs font-semibold uppercase">Summary Notes</span><p className="mt-1">{selected.summaryNotes ?? "—"}</p></div>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Report Sections</div>
                {!selected.sections || selected.sections.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No sections added yet{canEdit ? " — add sections in the report editor" : ""}</p>
                ) : (
                  <div className="space-y-2">
                    {selected.sections.map((s: any) => (
                      <div key={s.id} className="bg-white border rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{s.sectionTitle}</span>
                          <span className="px-1.5 py-0.5 bg-muted text-[10px] rounded">{s.sectionType}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                {canEdit && selected.status === "draft" && (
                  <Button size="sm" className="bg-[#16A34A] hover:bg-[#15803D] text-white gap-1.5" onClick={() => publishMutation.mutate(selected.id)} disabled={publishMutation.isPending}>
                    <Upload className="w-3.5 h-3.5" /> {publishMutation.isPending ? "Publishing…" : "Publish Report"}
                  </Button>
                )}
                {selected.status === "published" && (
                  <Button size="sm" variant="outline" className="gap-1.5"><Download className="w-3.5 h-3.5" /> Download PDF</Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setSelected(null)}>Close</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create New Report</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div><Label className="text-xs">Contract ID</Label><Input value={form.contractId} onChange={e => setForm(f => ({ ...f, contractId: e.target.value }))} className="mt-1 h-8 text-sm" placeholder="Contract UUID" /></div>
            <div><Label className="text-xs">Report Title</Label><Input value={form.reportTitle} onChange={e => setForm(f => ({ ...f, reportTitle: e.target.value }))} className="mt-1 h-8 text-sm" placeholder="e.g. John Smith — Summer English Camp 2026" /></div>
            <div><Label className="text-xs">Summary Notes</Label><Textarea value={form.summaryNotes} onChange={e => setForm(f => ({ ...f, summaryNotes: e.target.value }))} className="mt-1 text-sm" rows={3} placeholder="Overall program summary…" /></div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" className="flex-1 bg-[#F5821F] hover:bg-[#d97706] text-white" onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending || !form.reportTitle}>
                {createMutation.isPending ? "Creating…" : "Create Report"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
