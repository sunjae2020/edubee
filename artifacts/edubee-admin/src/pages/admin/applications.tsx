import { useState, useEffect } from "react";
import { formatDate, formatDateTime } from "@/lib/date-format";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { ListPagination } from "@/components/ui/list-pagination";
import { useToast } from "@/hooks/use-toast";
import { ChevronRight, FileSpreadsheet, Loader2, Search } from "lucide-react";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SortableTh, useSortState, useSorted } from "@/components/ui/sortable-th";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const PAGE_SIZE = 10;

const SERVICE_TYPES = [
  { key: "all",           label: "All" },
  { key: "study_abroad",  label: "Study Abroad" },
  { key: "pickup",        label: "Pickup" },
  { key: "accommodation", label: "Accommodation" },
  { key: "internship",    label: "Internship" },
  { key: "settlement",    label: "Settlement" },
  { key: "guardian",      label: "Guardian" },
];

const APP_STATUSES = ["all", "submitted", "reviewing", "quoted", "converted", "cancelled"];

const STATUS_STYLES: Record<string, string> = {
  submitted:  "bg-(--e-orange-lt) text-(--e-orange)",
  reviewing:  "bg-[#FEF9C3] text-[#CA8A04]",
  quoted:     "bg-[#E0F2FE] text-[#0369A1]",
  converted:  "bg-[#DCFCE7] text-[#16A34A]",
  cancelled:  "bg-[#FEF2F2] text-[#DC2626]",
};

function AppStatusBadge({ status }: { status?: string | null }) {
  if (!status) return <span className="text-muted-foreground text-xs">—</span>;
  const cls = STATUS_STYLES[status] ?? "bg-[#F4F3F1] text-[#57534E]";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function ServiceChip({ types }: { types?: unknown }) {
  const arr = Array.isArray(types) ? (types as string[]) : [];
  if (arr.length === 0) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {arr.map(t => (
        <span key={t} className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-(--e-orange)/10 text-(--e-orange)">
          {t.replace(/_/g, " ")}
        </span>
      ))}
    </div>
  );
}

function KpiCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-card border border-border rounded-xl px-5 py-4 flex flex-col gap-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

export default function Applications() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { sortBy, sortDir, onSort } = useSortState("createdAt", "desc");
  const [search, setSearch] = useState("");
  const [serviceType, setServiceType] = useState("all");
  const [appStatus, setAppStatus] = useState("all");
  const [page, setPage] = useState(1);

  const { data: stats } = useQuery({
    queryKey: ["applications-stats"],
    queryFn: () => axios.get(`${BASE}/api/applications/stats`).then(r => r.data),
    staleTime: 30_000,
  });

  useEffect(() => { setPage(1); }, [sortBy, sortDir]);

  const queryKey = ["applications", { search, serviceType, appStatus, page, sortBy, sortDir }];
  const { data: resp, isLoading } = useQuery({
    queryKey,
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (search) params.set("search", search);
      if (serviceType !== "all") params.set("applicationType", serviceType);
      if (appStatus !== "all") params.set("appStatus", appStatus);
      params.set("sortBy",  sortBy);
      params.set("sortDir", sortDir);
      return axios.get(`${BASE}/api/applications?${params}`).then(r => r.data);
    },
  });
  const apps: any[] = resp?.data ?? [];
  const total: number = resp?.meta?.total ?? 0;

  return (
    <div className="space-y-5">
      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="Total" value={stats?.total ?? 0} color="text-[#1C1917]" />
        <KpiCard label="Submitted" value={stats?.submitted ?? 0} color="text-(--e-orange)" />
        <KpiCard label="Reviewing" value={stats?.reviewing ?? 0} color="text-[#CA8A04]" />
        <KpiCard label="Converted" value={stats?.converted ?? 0} color="text-[#16A34A]" />
      </div>

      {/* ── Service Type Tabs ── */}
      <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
        {SERVICE_TYPES.map(s => (
          <button
            key={s.key}
            onClick={() => { setServiceType(s.key); setPage(1); }}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              serviceType === s.key
                ? "bg-(--e-orange) text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {s.label}
          </button>
        ))}
        <div className="ml-auto shrink-0">
          <Select value={appStatus} onValueChange={v => { setAppStatus(v); setPage(1); }}>
            <SelectTrigger className="h-8 text-xs w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {APP_STATUSES.map(s => (
                <SelectItem key={s} value={s} className="text-xs">
                  {s === "all" ? "All Statuses" : s.charAt(0).toUpperCase() + s.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <ListToolbar
        search={search}
        onSearch={v => { setSearch(v); setPage(1); }}
        statuses={[]}
        activeStatus="all"
        onStatusChange={() => {}}
        total={total}
        addLabel="New Application"
        onAdd={() => setLocation(`/admin/applications/new`)}
        csvExportTable="applications"
      />

      {/* ── Table ── */}
      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <>
              <SortableTh key="Ref #" col="refNumber" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ref #</SortableTh>
              <SortableTh key="Applicant" col="applicantName" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Applicant</SortableTh>
              <SortableTh key="Service Type" col="serviceType" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Service Type</SortableTh>
              <SortableTh key="Status" col="status" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</SortableTh>
              <SortableTh key="Date" col="createdAt" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</SortableTh>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-20" />
            </>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              [...Array(PAGE_SIZE)].map((_, i) => (
                <tr key={i}>{[...Array(6)].map((_, j) => (
                  <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>
                ))}</tr>
              ))
            ) : apps.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center text-muted-foreground text-sm">
                  <FileSpreadsheet className="w-8 h-8 mx-auto mb-3 opacity-20" />
                  No applications found
                </td>
              </tr>
            ) : (
              apps.map(app => (
                <tr
                  key={app.id}
                  className="hover:bg-(--e-orange-lt) transition-colors cursor-pointer"
                  onClick={() => setLocation(`/admin/applications/${app.id}`)}
                >
                  <td className="px-4 py-3 font-mono text-xs font-medium text-foreground">{app.applicationNumber}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">
                      {app.applicantName || app.studentName || "—"}
                    </div>
                    {(app.applicantEmail || app.email) && (
                      <div className="text-xs text-muted-foreground">{app.applicantEmail || app.email}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {app.serviceTypes ? (
                      <ServiceChip types={app.serviceTypes} />
                    ) : (
                      <span className="text-xs text-muted-foreground">{app.programType ?? "—"}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <AppStatusBadge status={app.applicationStatus ?? app.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {app.createdAt ? formatDate(app.createdAt) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ListPagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />
    </div>
  );
}
