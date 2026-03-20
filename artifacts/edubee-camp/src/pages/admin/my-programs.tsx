import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import axios from "axios";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { GraduationCap, Calendar, CheckCircle2, Clock } from "lucide-react";
import { ReportSymbol } from "@/components/shared/ReportSymbol";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  active: { bg: "bg-[#DCFCE7]", text: "text-[#16A34A]", border: "border-[#16A34A]/20" },
  completed: { bg: "bg-[#DCFCE7]", text: "text-[#16A34A]", border: "border-[#16A34A]/20" },
  pending: { bg: "bg-[#FEF9C3]", text: "text-[#CA8A04]", border: "border-[#CA8A04]/20" },
  cancelled: { bg: "bg-[#FAFAF9]", text: "text-[#57534E]", border: "border-[#E8E6E2]" },
};

interface Contract { id: string; contractNumber?: string | null; status?: string | null; startDate?: string | null; endDate?: string | null; totalAmount?: string | null; currency?: string | null; campProviderId?: string | null; }
interface Report { id: string; contractId?: string | null; reportTitle?: string | null; status?: string | null; publishedAt?: string | null; }

export default function MyPrograms() {
  const { user } = useAuth();

  const { data: contractsData, isLoading: loadingContracts } = useQuery({
    queryKey: ["my-contracts"],
    queryFn: () => axios.get(`${BASE}/api/contracts`).then(r => r.data),
  });

  const { data: reportsData } = useQuery({
    queryKey: ["my-reports"],
    queryFn: () => axios.get(`${BASE}/api/reports`).then(r => r.data),
  });

  const contracts: Contract[] = contractsData?.data ?? [];
  const reports: Report[] = reportsData?.data?.filter((r: Report) => r.status === "published") ?? [];

  const reportByContract = reports.reduce<Record<string, Report>>((acc, r) => {
    if (r.contractId) acc[r.contractId] = r;
    return acc;
  }, {});

  const isParent = user?.role === "parent_client";
  const isAgent = user?.role === "education_agent";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-lg bg-[#F5821F]/10 flex items-center justify-center"><GraduationCap className="w-5 h-5 text-[#F5821F]" /></div>
        <div>
          <h1 className="text-lg font-bold">{isAgent ? "My Client Programs" : "My Programs"}</h1>
          <p className="text-xs text-muted-foreground">
            {isParent ? "Track your program progress and download your final report" : "Overview of all your client programs and published reports"}
          </p>
        </div>
      </div>

      {/* Welcome Banner */}
      <div className="bg-[#FEF0E3] rounded-xl border border-[#F5821F]/20 p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-[#F5821F] flex items-center justify-center text-white font-bold text-lg shrink-0">
          {user?.fullName?.substring(0, 2).toUpperCase() ?? "?"}
        </div>
        <div>
          <h2 className="font-semibold">Welcome back, {user?.fullName?.split(" ")[0]}!</h2>
          <p className="text-xs text-muted-foreground">
            {contracts.length > 0
              ? `You have ${contracts.length} program${contracts.length !== 1 ? "s" : ""} enrolled${reports.length > 0 ? ` · ${reports.length} report${reports.length !== 1 ? "s" : ""} available` : ""}`
              : "No programs enrolled yet"}
          </p>
        </div>
      </div>

      {loadingContracts ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-36 w-full rounded-xl" />)}</div>
      ) : contracts.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <GraduationCap className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-sm font-medium">No programs found</p>
          <p className="text-xs mt-1">Contact your education agent to enroll in a program</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {contracts.map(c => {
            const s = c.status ?? "pending";
            const sc = STATUS_COLORS[s] ?? STATUS_COLORS.pending;
            const report = reportByContract[c.id];
            const hasStarted = c.startDate && new Date(c.startDate) <= new Date();
            const hasEnded = c.endDate && new Date(c.endDate) < new Date();
            const progressPct = (c.startDate && c.endDate)
              ? Math.min(100, Math.max(0, Math.round((Date.now() - new Date(c.startDate).getTime()) / (new Date(c.endDate).getTime() - new Date(c.startDate).getTime()) * 100)))
              : 0;

            return (
              <div key={c.id} className="bg-white rounded-xl border hover:border-[#F5821F]/30 transition-colors">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-muted-foreground">{c.contractNumber}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border capitalize ${sc.bg} ${sc.text} ${sc.border}`}>{s}</span>
                      </div>
                      <h3 className="font-semibold text-sm">Educational Camp Program</h3>
                    </div>
                    {c.totalAmount && (
                      <div className="text-right shrink-0">
                        <div className="text-xs text-muted-foreground">Total</div>
                        <div className="font-bold text-sm">{c.currency === "AUD" ? "A$" : c.currency}{Number(c.totalAmount).toLocaleString("en-AU", { minimumFractionDigits: 2 })}</div>
                      </div>
                    )}
                  </div>

                  {/* Timeline */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span>{c.startDate ?? "TBD"} → {c.endDate ?? "TBD"}</span>
                  </div>

                  {/* Progress bar */}
                  {hasStarted && !hasEnded && (
                    <div className="mb-3">
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-1"><span>Program Progress</span><span>{progressPct}%</span></div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-[#F5821F] rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
                      </div>
                    </div>
                  )}

                  {hasEnded && (
                    <div className="flex items-center gap-1.5 text-xs text-[#16A34A] font-medium mb-3">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Program completed
                    </div>
                  )}

                  {!hasStarted && c.startDate && (
                    <div className="flex items-center gap-1.5 text-xs text-[#F5821F] mb-3">
                      <Clock className="w-3.5 h-3.5" /> Starts {new Date(c.startDate).toLocaleDateString("en-AU", { day: "numeric", month: "long" })}
                    </div>
                  )}
                </div>

                {/* Report section */}
                {report ? (
                  <div className="border-t bg-[#DCFCE7]/30 px-4 py-3 flex items-center justify-between rounded-b-xl">
                    <div className="flex items-center gap-2">
                      <ReportSymbol name="report" size={14} color="#16A34A" />
                      <span className="text-xs font-medium text-[#16A34A]">Program Report Available</span>
                      <span className="text-[10px] text-[#16A34A]">Published {new Date(report.publishedAt!).toLocaleDateString("en-AU")}</span>
                    </div>
                    <Button
                      size="sm"
                      className="h-7 text-xs gap-1 bg-[#16A34A] hover:bg-[#15803D] text-white"
                      onClick={() => {
                        const token = localStorage.getItem("edubee_token");
                        fetch(`${BASE}/api/reports/${report.id}/pdf`, { headers: { Authorization: `Bearer ${token}` } })
                          .then(r => r.blob())
                          .then(blob => {
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `report-${report.id}.pdf`;
                            a.click();
                            URL.revokeObjectURL(url);
                          });
                      }}
                    >
                      <ReportSymbol name="pdf" size={12} color="white" /> Download PDF
                    </Button>
                  </div>
                ) : hasEnded ? (
                  <div className="border-t bg-muted/20 px-4 py-3 rounded-b-xl">
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Final report is being prepared — you'll be notified when ready</p>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
