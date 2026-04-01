import { useState, useCallback, useEffect } from "react";
import { formatDate, formatDateTime } from "@/lib/date-format";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ReportSymbol } from "@/components/shared/ReportSymbol";
import { ReportStatusBadge } from "@/components/shared/ReportStatusBadge";
import { Eye, Pencil, Trash2, Upload, Download, ChevronUp } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Report {
  id: string;
  contractId?: string | null;
  contractNumber?: string | null;
  reportTitle?: string | null;
  status?: string | null;
  publishedAt?: string | null;
  createdAt?: string | null;
  summaryNotes?: string | null;
  studentName?: string | null;
  programName?: string | null;
}

function relativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} mo ago`;
  return `${Math.floor(months / 12)} yr ago`;
}

function fmtDate(d: string | null | undefined): string {
  return formatDate(d);
}

export default function ReportsPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const role = user?.role ?? "";
  const canCreate = ["super_admin", "admin", "camp_coordinator"].includes(role);
  const canDelete = role === "super_admin";
  const canUnpublish = ["super_admin", "admin"].includes(role);
  const isViewOnly = false; // all internal staff

  // parent_client sees their programs, not the reports list
  useEffect(() => {
    // parent_client redirect removed
  }, [role, navigate]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ contractId: "", reportTitle: "", summaryNotes: "" });
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["reports"],
    queryFn: () => axios.get(`${BASE}/api/reports`).then(r => r.data),
  });
  const reports: Report[] = data?.data ?? [];

  const filtered = reports.filter(r => {
    const matchSearch = !search ||
      (r.reportTitle ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (r.contractNumber ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (r.studentName ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const createMutation = useMutation({
    mutationFn: (payload: typeof form) => axios.post(`${BASE}/api/reports`, payload).then(r => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["reports"] });
      setShowCreate(false);
      setForm({ contractId: "", reportTitle: "", summaryNotes: "" });
      const id = data?.data?.id;
      if (id) navigate(`/admin/reports/${id}/edit`);
      toast({ title: "Report created", description: "Opening editor…" });
    },
    onError: (err: any) => {
      toast({ title: "Failed", description: err.response?.data?.error ?? err.message, variant: "destructive" });
    },
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => axios.patch(`${BASE}/api/reports/${id}/publish`).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["reports"] }); toast({ title: "Report published" }); },
    onError: (err: any) => toast({ title: "Failed", description: err.response?.data?.error ?? err.message, variant: "destructive" }),
  });

  const unpublishMutation = useMutation({
    mutationFn: (id: string) => axios.patch(`${BASE}/api/reports/${id}/unpublish`).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["reports"] }); toast({ title: "Report unpublished" }); },
    onError: (err: any) => toast({ title: "Failed", description: err.response?.data?.error ?? err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => axios.delete(`${BASE}/api/reports/${id}`).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["reports"] }); setConfirmDeleteId(null); toast({ title: "Report deleted" }); },
    onError: (err: any) => toast({ title: "Failed", description: err.response?.data?.error ?? err.message, variant: "destructive" }),
  });

  const downloadPdf = useCallback(async (reportId: string, reportTitle: string) => {
    setPdfLoadingId(reportId);
    try {
      const token = localStorage.getItem("edubee_token") || "";
      const resp = await fetch(`${BASE}/api/reports/${reportId}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = (reportTitle ?? "Report").replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_");
      a.download = `EdubeeCamp_Report_${safeName}_${new Date().getFullYear()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "PDF downloaded", description: a.download });
    } catch (err: any) {
      toast({ title: "PDF download failed", description: err.message, variant: "destructive" });
    } finally {
      setPdfLoadingId(null);
    }
  }, [toast]);

  return (
    <div className="p-6 space-y-5">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FEF0E3] flex items-center justify-center">
            <ReportSymbol name="report" size={22} color="#F5821F" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1C1917]">Program Reports</h1>
            <p className="text-sm text-[#57534E]">Generate and manage student program reports</p>
          </div>
        </div>
        {canCreate && (
          <Button
            className="bg-[#F5821F] hover:bg-[#d97706] text-white gap-2"
            onClick={() => setShowCreate(true)}
          >
            <ReportSymbol name="report" size={16} color="white" />
            Create Report
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#E8E6E2] rounded-xl p-3 flex flex-wrap gap-3 items-center">
        <Input
          placeholder="Search by student or contract #"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-8 text-sm max-w-xs border-[#E8E6E2]"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 text-sm w-36 border-[#E8E6E2]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
          </SelectContent>
        </Select>
        <span className="ml-auto text-xs text-[#A8A29E]">{filtered.length} report{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E8E6E2] rounded-xl overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-4 py-2.5 bg-[#FAFAF9] border-b border-[#E8E6E2] text-xs font-semibold text-[#57534E] uppercase tracking-wide">
          <span>Student / Program</span>
          <span>Contract #</span>
          <span>Status</span>
          <span>Created</span>
          <span>Published</span>
          <span>Actions</span>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="divide-y divide-[#F4F3F1]">
            {[0, 1, 2].map(i => (
              <div key={i} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-4 py-3 items-center">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-7 w-24" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <ReportSymbol name="report" size={64} color="#E8E6E2" />
            <p className="text-base font-semibold text-[#1C1917]">No reports yet</p>
            <p className="text-sm text-[#57534E]">Reports are generated from contracts.</p>
            {canCreate && (
              <Button
                className="mt-2 bg-[#F5821F] hover:bg-[#d97706] text-white gap-2"
                onClick={() => setShowCreate(true)}
              >
                <ReportSymbol name="report" size={15} color="white" />
                Create First Report
              </Button>
            )}
          </div>
        )}

        {/* Rows */}
        {!isLoading && filtered.map(report => (
          <div
            key={report.id}
            className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-4 py-3 items-center border-b border-[#F4F3F1] hover:bg-[#FEF0E3] transition-colors"
          >
            {/* Student/Program */}
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#1C1917] truncate">
                {report.reportTitle ?? report.studentName ?? "—"}
              </p>
              {report.programName && (
                <p className="text-xs text-[#57534E] truncate">{report.programName}</p>
              )}
            </div>

            {/* Contract # */}
            <div>
              {report.contractNumber ? (
                <span className="text-xs font-mono bg-[#FAFAF9] border border-[#E8E6E2] px-2 py-0.5 rounded">
                  {report.contractNumber}
                </span>
              ) : (
                <span className="text-xs text-[#A8A29E]">—</span>
              )}
            </div>

            {/* Status */}
            <div>
              <ReportStatusBadge status={(report.status ?? "draft") as "draft" | "published"} />
            </div>

            {/* Created */}
            <span className="text-xs text-[#57534E]">{relativeTime(report.createdAt)}</span>

            {/* Published */}
            <span className="text-xs text-[#57534E]">{fmtDate(report.publishedAt)}</span>

            {/* Actions */}
            <div className="flex items-center gap-1 justify-end">
              {isViewOnly ? (
                <>
                  <Button size="icon" variant="ghost" className="h-7 w-7" title="View" onClick={() => navigate(`/admin/reports/${report.id}`)}>
                    <Eye className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" title="Download PDF"
                    disabled={pdfLoadingId === report.id}
                    onClick={() => downloadPdf(report.id, report.reportTitle ?? "Report")}>
                    <ReportSymbol name="pdf" size={14} />
                  </Button>
                </>
              ) : (
                <>
                  {report.status === "draft" ? (
                    <>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-[#57534E]" title="Edit"
                        onClick={() => navigate(`/admin/reports/${report.id}/edit`)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-[#57534E]" title="Preview"
                        onClick={() => navigate(`/admin/reports/${report.id}`)}>
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-[#16A34A]" title="Publish"
                        disabled={publishMutation.isPending}
                        onClick={() => publishMutation.mutate(report.id)}>
                        <ReportSymbol name="publish" size={14} color="#16A34A" />
                      </Button>
                      {canDelete && (
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" title="Delete"
                          onClick={() => setConfirmDeleteId(report.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </>
                  ) : (
                    <>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-[#57534E]" title="View"
                        onClick={() => navigate(`/admin/reports/${report.id}`)}>
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" title="Download PDF"
                        disabled={pdfLoadingId === report.id}
                        onClick={() => downloadPdf(report.id, report.reportTitle ?? "Report")}>
                        <ReportSymbol name="pdf" size={14} />
                      </Button>
                      {canUnpublish && (
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-[#CA8A04]" title="Unpublish"
                          disabled={unpublishMutation.isPending}
                          onClick={() => unpublishMutation.mutate(report.id)}>
                          <ChevronUp className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" title="Delete"
                          onClick={() => setConfirmDeleteId(report.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ReportSymbol name="report" size={18} color="#F5821F" />
              Create New Report
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-xs">Contract ID <span className="text-red-500">*</span></Label>
              <Input
                value={form.contractId}
                onChange={e => setForm(f => ({ ...f, contractId: e.target.value }))}
                className="mt-1 h-8 text-sm"
                placeholder="Paste contract UUID"
              />
            </div>
            <div>
              <Label className="text-xs">Report Title <span className="text-red-500">*</span></Label>
              <Input
                value={form.reportTitle}
                onChange={e => setForm(f => ({ ...f, reportTitle: e.target.value }))}
                className="mt-1 h-8 text-sm"
                placeholder="e.g. John Smith — Summer Camp 2026"
              />
            </div>
            <div>
              <Label className="text-xs">Summary Notes</Label>
              <Textarea
                value={form.summaryNotes}
                onChange={e => setForm(f => ({ ...f, summaryNotes: e.target.value }))}
                className="mt-1 text-sm"
                rows={3}
                placeholder="Overall program summary…"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                className="flex-1 bg-[#F5821F] hover:bg-[#d97706] text-white"
                size="sm"
                onClick={() => createMutation.mutate(form)}
                disabled={createMutation.isPending || !form.reportTitle || !form.contractId}
              >
                {createMutation.isPending ? "Creating…" : "Create & Open Editor"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!confirmDeleteId} onOpenChange={() => setConfirmDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Report?</DialogTitle></DialogHeader>
          <p className="text-sm text-[#57534E]">This action cannot be undone. The report and all its sections will be permanently removed.</p>
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              variant="destructive"
              className="flex-1"
              onClick={() => confirmDeleteId && deleteMutation.mutate(confirmDeleteId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
