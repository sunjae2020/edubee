import { useState } from "react";
import { formatDate, formatDateTime } from "@/lib/date-format";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PaymentScheduleTab from "./PaymentScheduleTab";
import { useLocation } from "wouter";
import axios from "axios";
import {
  DollarSign, Clock, CheckCircle2, AlertTriangle,
  ChevronDown, Eye, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { SortableTh, useSortState, useSorted } from "@/components/ui/sortable-th";
import { TableFooter } from "@/components/ui/table-footer";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ─── Types ───────────────────────────────────────────────────────────────────
interface ArRow {
  id: string;
  contractId?: string | null;
  contractNumber?: string | null;
  studentName?: string | null;
  serviceModuleType?: string | null;
  arDueDate?: string | null;
  arAmount?: string | null;
  arStatus?: string | null;
}

interface ApRow {
  id: string;
  contractId?: string | null;
  contractNumber?: string | null;
  studentName?: string | null;
  agentName?: string | null;
  serviceModuleType?: string | null;
  apDueDate?: string | null;
  apAmount?: string | null;
  apStatus?: string | null;
}

interface Summary {
  [status: string]: { total: number; count: number };
}

// ─── Constants ───────────────────────────────────────────────────────────────
const AR_STATUSES = ["scheduled", "invoiced", "paid", "overdue"];
const AP_STATUSES = ["pending", "ready", "paid"];

const AR_BADGE: Record<string, { bg: string; text: string; bold?: boolean }> = {
  scheduled: { bg: "var(--e-orange-lt)", text: "var(--e-orange)" },
  invoiced:  { bg: "#FEF9C3", text: "#CA8A04" },
  paid:      { bg: "#DCFCE7", text: "#16A34A" },
  overdue:   { bg: "#FEF2F2", text: "#DC2626", bold: true },
};

const AP_BADGE: Record<string, { bg: string; text: string }> = {
  pending: { bg: "#F4F3F1", text: "#57534E" },
  ready:   { bg: "var(--e-orange-lt)", text: "var(--e-orange)" },
  paid:    { bg: "#DCFCE7", text: "#16A34A" },
};

const MODULE_LABELS: Record<string, string> = {
  study_abroad:  "Study Abroad",
  pickup:        "Pickup",
  accommodation: "Accommodation",
  internship:    "Internship",
  settlement:    "Settlement",
  guardian:      "Guardian",
  camp:          "Camp",
};

function fmt(amount: string | null | undefined): string {
  if (!amount) return "—";
  return `A$${Number(amount).toLocaleString("en-AU", { minimumFractionDigits: 2 })}`;
}

function fmtDate(d: string | null | undefined): string {
  return formatDate(d);
}

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, icon: Icon, iconColor = "var(--e-orange)", accent = "var(--e-orange-lt)",
}: {
  label: string; value: string; icon: React.ElementType; iconColor?: string; accent?: string;
}) {
  return (
    <div className="bg-white border rounded-xl p-5 flex items-center gap-4"
      style={{ borderColor: "#E8E6E2", borderRadius: 12 }}>
      <div className="flex items-center justify-center rounded-[10px] shrink-0"
        style={{ width: 40, height: 40, background: accent }}>
        <Icon size={18} color={iconColor} />
      </div>
      <div>
        <p className="text-xs text-stone-500 mb-0.5">{label}</p>
        <p className="font-bold text-stone-800" style={{ fontSize: 22 }}>{value}</p>
      </div>
    </div>
  );
}

// ─── AR Actions dropdown ─────────────────────────────────────────────────────
function ArActions({ row }: { row: ArRow }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();

  const updateMutation = useMutation({
    mutationFn: (arStatus: string) =>
      axios.patch(`${BASE}/api/accounting/ar/${row.id}/status`, { arStatus }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ar"] });
      qc.invalidateQueries({ queryKey: ["ar-summary"] });
      toast({ title: "Status updated" });
      setOpen(false);
    },
    onError: () => toast({ title: "Update failed", variant: "destructive" }),
  });

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs text-stone-600 hover:bg-stone-50 transition-colors"
      >
        Actions <ChevronDown size={11} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 w-48 bg-white border border-stone-200 rounded-xl shadow-lg py-1 text-sm">
            {row.arStatus !== "invoiced" && row.arStatus !== "paid" && (
              <button
                onClick={() => updateMutation.mutate("invoiced")}
                className="w-full text-left px-3 py-2 hover:bg-stone-50 text-stone-700"
              >
                Mark as Invoiced
              </button>
            )}
            <button
              onClick={() => updateMutation.mutate("paid")}
              className="w-full text-left px-3 py-2 hover:bg-stone-50 text-stone-700"
            >
              Record Payment
            </button>
            {row.contractId && (
              <button
                onClick={() => { setOpen(false); navigate(`/admin/crm/contracts/${row.contractId}`); }}
                className="w-full text-left px-3 py-2 hover:bg-stone-50 text-stone-700 flex items-center gap-2"
              >
                <Eye size={12} /> View Contract
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── AP Actions dropdown ─────────────────────────────────────────────────────
function ApActions({ row }: { row: ApRow }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();

  const updateMutation = useMutation({
    mutationFn: (apStatus: string) =>
      axios.patch(`${BASE}/api/accounting/ap/${row.id}/status`, { apStatus }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ap"] });
      toast({ title: "Status updated" });
      setOpen(false);
    },
    onError: () => toast({ title: "Update failed", variant: "destructive" }),
  });

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs text-stone-600 hover:bg-stone-50 transition-colors"
      >
        Actions <ChevronDown size={11} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 w-44 bg-white border border-stone-200 rounded-xl shadow-lg py-1 text-sm">
            {row.apStatus === "pending" && (
              <button onClick={() => updateMutation.mutate("ready")}
                className="w-full text-left px-3 py-2 hover:bg-stone-50 text-stone-700">
                Mark as Ready
              </button>
            )}
            <button onClick={() => updateMutation.mutate("paid")}
              className="w-full text-left px-3 py-2 hover:bg-stone-50 text-stone-700">
              Mark as Paid
            </button>
            {row.contractId && (
              <button
                onClick={() => { setOpen(false); navigate(`/admin/crm/contracts/${row.contractId}`); }}
                className="w-full text-left px-3 py-2 hover:bg-stone-50 text-stone-700 flex items-center gap-2">
                <Eye size={12} /> View Contract
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Filter Bar ──────────────────────────────────────────────────────────────
function FilterBar({
  tab,
  search, onSearch,
  dateFrom, onDateFrom,
  dateTo, onDateTo,
  statusFilter, onStatusFilter,
  onExport,
}: {
  tab: "ar" | "ap";
  search: string; onSearch: (v: string) => void;
  dateFrom: string; onDateFrom: (v: string) => void;
  dateTo: string; onDateTo: (v: string) => void;
  statusFilter: string[]; onStatusFilter: (v: string[]) => void;
  onExport: () => void;
}) {
  const statuses = tab === "ar" ? AR_STATUSES : AP_STATUSES;

  function toggleStatus(s: string) {
    onStatusFilter(
      statusFilter.includes(s) ? statusFilter.filter(x => x !== s) : [...statusFilter, s]
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        placeholder="Search contract or student…"
        value={search}
        onChange={e => onSearch(e.target.value)}
        className="h-9 text-sm w-56"
      />
      <Input type="date" value={dateFrom} onChange={e => onDateFrom(e.target.value)}
        className="h-9 text-sm w-36" />
      <span className="text-stone-400 text-sm">—</span>
      <Input type="date" value={dateTo} onChange={e => onDateTo(e.target.value)}
        className="h-9 text-sm w-36" />
      <div className="flex items-center gap-1.5 flex-wrap">
        {statuses.map(s => (
          <button
            key={s}
            onClick={() => toggleStatus(s)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all capitalize ${
              statusFilter.includes(s)
                ? "border-(--e-orange) bg-(--e-orange-lt) text-(--e-orange)"
                : "border-stone-200 text-stone-500 hover:border-stone-400"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      <Button variant="outline" size="sm" onClick={onExport}
        className="ml-auto flex items-center gap-1.5 h-9 text-xs">
        <Download size={13} /> Export CSV
      </Button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ArApTrackerPage() {
  const [tab, setTab]                   = useState<"ar" | "ap" | "schedule">("ar");
  const { sortBy, sortDir, onSort } = useSortState();
  const [search, setSearch]             = useState("");
  const [dateFrom, setDateFrom]         = useState("");
  const [dateTo, setDateTo]             = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [page, setPage]                 = useState(1);
  const [pageSize, setPageSize]         = useState(20);

  const { data: summaryData } = useQuery({
    queryKey: ["ar-summary"],
    queryFn: () => axios.get(`${BASE}/api/accounting/ar/summary`).then(r => r.data),
  });

  const summary: Summary = summaryData?.summary ?? {};

  const { data: arData, isLoading: arLoading } = useQuery({
    queryKey: ["ar", statusFilter, search, dateFrom, dateTo, page, pageSize],
    queryFn: () => {
      const p = new URLSearchParams({ page: String(page), limit: String(pageSize) });
      if (statusFilter.length) p.set("ar_status", statusFilter.join(","));
      if (search) p.set("search", search);
      if (dateFrom) p.set("date_from", dateFrom);
      if (dateTo) p.set("date_to", dateTo);
      return axios.get(`${BASE}/api/accounting/ar?${p}`).then(r => r.data);
    },
    enabled: tab === "ar",
  });

  const { data: apData, isLoading: apLoading } = useQuery({
    queryKey: ["ap", statusFilter, search, dateFrom, dateTo, page, pageSize],
    queryFn: () => {
      const p = new URLSearchParams({ page: String(page), limit: String(pageSize) });
      if (statusFilter.length) p.set("ap_status", statusFilter.join(","));
      if (search) p.set("search", search);
      if (dateFrom) p.set("date_from", dateFrom);
      if (dateTo) p.set("date_to", dateTo);
      return axios.get(`${BASE}/api/accounting/ap?${p}`).then(r => r.data);
    },
    enabled: tab === "ap",
  });

  const arRows: ArRow[] = arData?.data ?? [];
  const sortedAr = useSorted(arRows, sortBy, sortDir);
  const apRows: ApRow[] = apData?.data ?? [];
  const sortedAp = useSorted(apRows, sortBy, sortDir);
  const total = (tab === "ar" ? arData?.meta?.total : apData?.meta?.total) ?? 0;

  function handleTabChange(t: "ar" | "ap" | "schedule") {
    setTab(t);
    setStatusFilter([]);
    setPage(1);
  }

  function exportCsv() {
    const rows = tab === "ar" ? arRows : apRows;
    if (!rows.length) return;
    const headers = tab === "ar"
      ? ["Contract", "Student", "Module", "Due Date", "Amount", "Status"]
      : ["Contract", "Student/Agent", "Module", "Due Date", "Amount", "Status"];
    const lines = rows.map(r =>
      tab === "ar"
        ? [
            (r as ArRow).contractNumber ?? "",
            (r as ArRow).studentName ?? "",
            MODULE_LABELS[(r as ArRow).serviceModuleType ?? ""] ?? (r as ArRow).serviceModuleType ?? "",
            (r as ArRow).arDueDate ?? "",
            (r as ArRow).arAmount ?? "",
            (r as ArRow).arStatus ?? "",
          ].join(",")
        : [
            (r as ApRow).contractNumber ?? "",
            (r as ApRow).studentName ?? (r as ApRow).agentName ?? "",
            MODULE_LABELS[(r as ApRow).serviceModuleType ?? ""] ?? (r as ApRow).serviceModuleType ?? "",
            (r as ApRow).apDueDate ?? "",
            (r as ApRow).apAmount ?? "",
            (r as ApRow).apStatus ?? "",
          ].join(",")
    );
    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `${tab}-export.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const kpiCards = [
    {
      label: "Scheduled",
      value: fmt(String(summary.scheduled?.total ?? 0)),
      icon: Clock,
      iconColor: "var(--e-orange)",
      accent: "var(--e-orange-lt)",
    },
    {
      label: "Invoiced",
      value: fmt(String(summary.invoiced?.total ?? 0)),
      icon: DollarSign,
      iconColor: "#CA8A04",
      accent: "#FEF9C3",
    },
    {
      label: "Paid",
      value: fmt(String(summary.paid?.total ?? 0)),
      icon: CheckCircle2,
      iconColor: "#16A34A",
      accent: "#DCFCE7",
    },
    {
      label: "Overdue",
      value: fmt(String(summary.overdue?.total ?? 0)),
      icon: AlertTriangle,
      iconColor: "#DC2626",
      accent: "#FEF2F2",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-stone-800">AR / AP Tracker</h1>
        <p className="text-sm text-stone-500 mt-1">Monitor receivables and payables across all contracts</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpiCards.map(c => <KpiCard key={c.label} {...c} />)}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-stone-200 overflow-x-auto">
        {(
          [
            ["ar",       "Accounts Receivable"],
            ["ap",       "Accounts Payable"],
            ["schedule", "Payment Schedule"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => handleTabChange(key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === key
                ? "border-(--e-orange) text-(--e-orange)"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filter Bar — hidden for Payment Schedule tab (has its own filters) */}
      {tab !== "schedule" && (
        <FilterBar
          tab={tab as "ar" | "ap"}
          search={search} onSearch={v => { setSearch(v); setPage(1); }}
          dateFrom={dateFrom} onDateFrom={v => { setDateFrom(v); setPage(1); }}
          dateTo={dateTo} onDateTo={v => { setDateTo(v); setPage(1); }}
          statusFilter={statusFilter} onStatusFilter={v => { setStatusFilter(v); setPage(1); }}
          onExport={exportCsv}
        />
      )}

      {/* AR Table */}
      {tab === "ar" && (
        <div className="rounded-xl border border-stone-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <>
                    <SortableTh col="contractNumber" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Contract</SortableTh>
                    <SortableTh col="studentName" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Student</SortableTh>
                    <SortableTh col="serviceModuleType" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Product</SortableTh>
                    <SortableTh col="arDueDate" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Due Date</SortableTh>
                    <SortableTh col="arAmount" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Amount (AUD)</SortableTh>
                    <SortableTh col="arStatus" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Status</SortableTh>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Actions</th>
                  </>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {arLoading && (
                <tr><td colSpan={7} className="text-center py-12 text-stone-400 text-sm">Loading…</td></tr>
              )}
              {!arLoading && arRows.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-stone-400 text-sm">No AR records found</td></tr>
              )}
              {sortedAr.map(row => {
                const isOverdue = row.arStatus === "overdue";
                const badge = AR_BADGE[row.arStatus ?? "scheduled"] ?? AR_BADGE.scheduled;
                return (
                  <tr key={row.id}
                    className="transition-colors"
                    style={isOverdue ? { backgroundColor: "#FEF2F2" } : undefined}
                    onMouseEnter={e => { if (!isOverdue) e.currentTarget.style.backgroundColor = "var(--e-orange-lt)"; }}
                    onMouseLeave={e => { if (!isOverdue) e.currentTarget.style.backgroundColor = ""; }}>
                    <td className="px-4 py-3 font-mono text-xs text-stone-500">
                      {row.contractNumber ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-medium text-stone-800">{row.studentName ?? "—"}</td>
                    <td className="px-4 py-3 text-stone-600 text-xs">
                      {MODULE_LABELS[row.serviceModuleType ?? ""] ?? row.serviceModuleType ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-stone-600">{fmtDate(row.arDueDate)}</td>
                    <td className="px-4 py-3 font-medium text-stone-800">{fmt(row.arAmount)}</td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2.5 py-0.5 rounded-full text-xs capitalize"
                        style={{
                          background: badge.bg,
                          color: badge.text,
                          fontWeight: badge.bold ? 700 : 500,
                        }}
                      >
                        {row.arStatus ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ArActions row={row} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* AP Table */}
      {tab === "ap" && (
        <div className="rounded-xl border border-stone-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <>
                    <SortableTh col="contractNumber" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Contract</SortableTh>
                    <SortableTh col="partnerName" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">School / Partner</SortableTh>
                    <SortableTh col="serviceModuleType" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Product</SortableTh>
                    <SortableTh col="apDueDate" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Due Date</SortableTh>
                    <SortableTh col="apAmount" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Amount (AUD)</SortableTh>
                    <SortableTh col="apStatus" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Status</SortableTh>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Actions</th>
                  </>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {apLoading && (
                <tr><td colSpan={7} className="text-center py-12 text-stone-400 text-sm">Loading…</td></tr>
              )}
              {!apLoading && apRows.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-stone-400 text-sm">No AP records found</td></tr>
              )}
              {sortedAp.map(row => {
                const badge = AP_BADGE[row.apStatus ?? "pending"] ?? AP_BADGE.pending;
                return (
                  <tr key={row.id} className="hover:bg-(--e-orange-lt) cursor-pointer transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-stone-500">
                      {row.contractNumber ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-medium text-stone-800">
                      {row.agentName ?? row.studentName ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-stone-600 text-xs">
                      {MODULE_LABELS[row.serviceModuleType ?? ""] ?? row.serviceModuleType ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-stone-600">{fmtDate(row.apDueDate)}</td>
                    <td className="px-4 py-3 font-medium text-stone-800">{fmt(row.apAmount)}</td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2.5 py-0.5 rounded-full text-xs font-medium capitalize"
                        style={{ background: badge.bg, color: badge.text }}
                      >
                        {row.apStatus ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ApActions row={row} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Payment Schedule Tab */}
      {tab === "schedule" && <PaymentScheduleTab />}

      {/* Pagination — hidden for Payment Schedule tab */}
      {tab !== "schedule" && (
        <TableFooter page={page} pageSize={pageSize} total={total} label="records" onPageChange={setPage} onPageSizeChange={v => { setPageSize(v); setPage(1); }} />
      )}
    </div>
  );
}
