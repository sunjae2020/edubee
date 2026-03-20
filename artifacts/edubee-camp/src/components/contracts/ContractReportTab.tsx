import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import axios from "axios";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportSymbol } from "@/components/shared/ReportSymbol";
import { ReportStatusBadge } from "@/components/shared/ReportStatusBadge";
import { useState, useCallback } from "react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Report {
  id: string;
  contractId?: string | null;
  reportTitle?: string | null;
  status?: string | null;
  publishedAt?: string | null;
  createdAt?: string | null;
  summaryNotes?: string | null;
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
}

export function ContractReportTab({ contractId }: { contractId: string }) {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [pdfLoading, setPdfLoading] = useState(false);

  const role = user?.role ?? "";
  const canCreate = ["super_admin", "admin", "camp_coordinator"].includes(role);
  const canEdit = canCreate;
  const canPublish = canCreate;
  const canUnpublish = ["super_admin", "admin"].includes(role);

  const { data, isLoading } = useQuery({
    queryKey: ["reports", "contract", contractId],
    queryFn: () => axios.get(`${BASE}/api/reports`).then(r => {
      const all: Report[] = r.data?.data ?? [];
      return all.find(rep => rep.contractId === contractId) ?? null;
    }),
    enabled: !!contractId,
  });
  const report: Report | null = data ?? null;

  const createMutation = useMutation({
    mutationFn: () => axios.post(`${BASE}/api/reports`, {
      contractId,
      reportTitle: `Program Report`,
      summaryNotes: "",
    }).then(r => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["reports"] });
      qc.invalidateQueries({ queryKey: ["reports", "contract", contractId] });
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reports", "contract", contractId] });
      qc.invalidateQueries({ queryKey: ["reports"] });
      toast({ title: "Report published!" });
    },
    onError: (err: any) => toast({ title: "Failed", description: err.response?.data?.error ?? err.message, variant: "destructive" }),
  });

  const downloadPdf = useCallback(async (id: string, title: string) => {
    setPdfLoading(true);
    try {
      const token = localStorage.getItem("edubee_token") || "";
      const resp = await fetch(`${BASE}/api/reports/${id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `EdubeeCamp_Report_${title.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().getFullYear()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "PDF downloaded" });
    } catch (err: any) {
      toast({ title: "PDF download failed", description: err.message, variant: "destructive" });
    } finally {
      setPdfLoading(false);
    }
  }, [toast]);

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <ReportSymbol name="report" size={48} color="#E8E6E2" />
        <p className="text-base font-semibold text-[#1C1917]">No report generated yet</p>
        <p className="text-sm text-[#57534E] text-center max-w-sm">
          Create a program report to share progress with the agent and client.
        </p>
        {canCreate && (
          <Button
            className="mt-2 bg-[#F5821F] hover:bg-[#d97706] text-white gap-2"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
          >
            <ReportSymbol name="report" size={15} color="white" />
            {createMutation.isPending ? "Generating…" : "Generate Report"}
          </Button>
        )}
      </div>
    );
  }

  const isDraft = report.status === "draft";
  const isPublished = report.status === "published";

  return (
    <div className="p-4 space-y-4">
      {/* Report Summary Card */}
      <div className="bg-white border border-[#E8E6E2] rounded-xl p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-[#1C1917]">{report.reportTitle ?? "Program Report"}</p>
            <ReportStatusBadge status={(report.status ?? "draft") as "draft" | "published"} />
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {canEdit && (
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                onClick={() => navigate(`/admin/reports/${report.id}/edit`)}>
                <ReportSymbol name="edit" size={12} /> Edit
              </Button>
            )}
            {isPublished && (
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                disabled={pdfLoading}
                onClick={() => downloadPdf(report.id, report.reportTitle ?? "Report")}>
                <ReportSymbol name="pdf" size={12} />
                {pdfLoading ? "…" : "PDF"}
              </Button>
            )}
          </div>
        </div>

        {/* Info row */}
        <div className="flex gap-6 text-xs text-[#57534E]">
          <span>Created: {fmtDate(report.createdAt)}</span>
          <span>Published: {isPublished ? fmtDate(report.publishedAt) : "Not yet published"}</span>
        </div>

        {/* Status Banner */}
        {isPublished && (
          <div className="mt-3 flex items-center gap-2 bg-[#DCFCE7] border border-[#16A34A]/30 rounded-lg px-3 py-2.5">
            <ReportSymbol name="publish" size={16} color="#16A34A" />
            <span className="text-sm text-[#16A34A] font-medium">Published — visible to agent and client</span>
          </div>
        )}

        {isDraft && (
          <div className="mt-3 flex items-center justify-between gap-3 bg-[#FEF9C3] border border-[#CA8A04]/30 rounded-lg px-3 py-2.5">
            <div className="flex items-center gap-2">
              <ReportSymbol name="draft" size={16} color="#CA8A04" />
              <span className="text-sm text-[#CA8A04] font-medium">Draft — not yet visible to agent and client</span>
            </div>
            {canPublish && (
              <Button size="sm" className="bg-[#F5821F] hover:bg-[#d97706] text-white h-7 text-xs gap-1"
                onClick={() => publishMutation.mutate(report.id)}
                disabled={publishMutation.isPending}>
                <ReportSymbol name="publish" size={12} color="white" />
                {publishMutation.isPending ? "Publishing…" : "Publish Now"}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
