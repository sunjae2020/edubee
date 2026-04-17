import { useState, useMemo, useEffect } from "react";
import { formatDate, formatDateTime } from "@/lib/date-format";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import axios from "axios";
import {
  Search, Settings2, ChevronDown, X, ArrowRight,
  FileText, TrendingUp, TrendingDown, BadgeDollarSign,
  MoreHorizontal, ChevronLeft, ChevronRight as ChevronRightIcon,
} from "lucide-react";
import { format, differenceInWeeks } from "date-fns";
import { SortableTh, useSortState, useSorted } from "@/components/ui/sortable-th";
import { ClientNameCell } from "@/components/common/ClientNameCell";
import { nameFromAccount } from "@/lib/nameUtils";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useBulkSelect } from "@/hooks/use-bulk-select";
import { BulkActionBar } from "@/components/common/BulkActionBar";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Types ─────────────────────────────────────────────────────────────────
interface ContractRow {
  id: string;
  contractRefDisplay: string;
  contractStatus: string;
  fromDate?: string;
  toDate?: string;
  contractAmount: number;
  paymentFrequency?: string;
  account?: { id?: string; name?: string; firstName?: string | null; lastName?: string | null; originalName?: string | null; nationality?: string };
  quote?: { id: string; quoteRefNumber?: string } | null;
  owner?: { id: string; name: string } | null;
  primaryService?: { type: string; status?: string } | null;
  primaryServiceModule?: string | null;
  applicationId?: string | null;
  arSummary?: { totalAr: number; collectedAr: number; statusList: string[] };
  apSummary?: { totalAp: number; remittedAp: number; statusList: string[] };
  collectionRate: number;
  clientEmail?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}
interface Pagination { total: number; page: number; pageSize: number; totalPages: number }
interface Summary { activeCount: number; arOutstanding: number; apPayable: number; commissionEstimate: number }

// ── Helpers ───────────────────────────────────────────────────────────────
const fmtDate = (d?: string | null) => formatDate(d);
const fmtMoney = (n: number) => `$${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function duration(from?: string, to?: string) {
  if (!from || !to) return "—";
  const w = differenceInWeeks(new Date(to), new Date(from));
  if (w < 4) return `${w}w`;
  const m = Math.round(w / 4.33);
  return m < 12 ? `${m}mo` : `${Math.round(m / 12)}yr`;
}

const CONTRACT_STATUS_STYLES: Record<string, string> = {
  active:      "bg-[#DCFCE7] text-[#16A34A]",
  "in progress": "bg-(--e-orange-lt) text-(--e-orange)",
  overdue:     "bg-[#FEF2F2] text-[#DC2626]",
  completed:   "bg-[#F4F3F1] text-[#57534E]",
  draft:       "bg-[#F4F3F1] text-[#A8A29E]",
};

const AR_STATUS_STYLES: Record<string, string> = {
  scheduled: "bg-[#F4F3F1] text-[#57534E]",
  invoiced:  "bg-(--e-orange-lt) text-(--e-orange)",
  overdue:   "bg-[#FEF2F2] text-[#DC2626]",
  partial:   "bg-[#FEF9C3] text-[#CA8A04]",
  paid:      "bg-[#DCFCE7] text-[#16A34A]",
};

const AP_STATUS_STYLES: Record<string, string> = {
  pending: "bg-[#F4F3F1] text-[#57534E]",
  ready:   "bg-(--e-orange-lt) text-(--e-orange)",
  paid:    "bg-[#DCFCE7] text-[#16A34A]",
  overdue: "bg-[#FEF2F2] text-[#DC2626]",
};

function StatusBadge({ s, map }: { s: string; map: Record<string, string> }) {
  const cls = map[s?.toLowerCase()] ?? "bg-[#F4F3F1] text-[#57534E]";
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${cls}`}>
      {s}
    </span>
  );
}

// ── StatCard ───────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="bg-white border border-[#E8E6E2] rounded-xl p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#A8A29E] mb-1">{label}</p>
      <p className="text-2xl font-bold" style={{ color: accent ?? "#1C1917" }}>{value}</p>
      {sub && <p className="text-xs text-[#A8A29E] mt-1">{sub}</p>}
    </div>
  );
}

// ── Quick Period ───────────────────────────────────────────────────────────
type Period = "today" | "month" | "last-month" | "term" | "last-term" | "year";
function calcPeriod(p: Period): [string, string] {
  const now  = new Date();
  const y    = now.getFullYear();
  const m    = now.getMonth();
  const todayStr = format(now, "yyyy-MM-dd");
  if (p === "today")      return [todayStr, todayStr];
  if (p === "month")      return [format(new Date(y, m, 1), "yyyy-MM-dd"), format(new Date(y, m + 1, 0), "yyyy-MM-dd")];
  if (p === "last-month") return [format(new Date(y, m - 1, 1), "yyyy-MM-dd"), format(new Date(y, m, 0), "yyyy-MM-dd")];
  if (p === "year")       return [format(new Date(y, 0, 1), "yyyy-MM-dd"), format(new Date(y, 11, 31), "yyyy-MM-dd")];
  const q = Math.floor(m / 3);
  if (p === "term")       return [format(new Date(y, q * 3, 1), "yyyy-MM-dd"), format(new Date(y, q * 3 + 3, 0), "yyyy-MM-dd")];
  const pq = q === 0 ? 3 : q - 1; const py = q === 0 ? y - 1 : y;
  return [format(new Date(py, pq * 3, 1), "yyyy-MM-dd"), format(new Date(py, pq * 3 + 3, 0), "yyyy-MM-dd")];
}

// ── ActiveTag ──────────────────────────────────────────────────────────────
function ActiveTag({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-(--e-orange-lt) text-(--e-orange) border border-(--e-orange)/30">
      {label}
      <button onClick={onRemove} className="hover:text-(--e-orange-hover)"><X size={10} /></button>
    </span>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function ContractListPage() {
  const [, navigate] = useLocation();
  const { sortBy, sortDir, onSort } = useSortState("createdOn", "desc");
  const { user } = useAuth();
  const isSA = user?.role === "super_admin";
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { selectedIds, toggleSelect, toggleAll, clearSelection, isAllSelected } = useBulkSelect();

  const softDelMutation = useMutation({
    mutationFn: (ids: string[]) =>
      axios.delete(`${BASE}/api/crm/contracts/bulk`, { data: { ids, soft: true } }),
    onSuccess: () => {
      clearSelection();
      queryClient.invalidateQueries({ queryKey: ["crm-contracts"] });
      toast({ title: "Moved to trash." });
    },
  });

  const hardDelMutation = useMutation({
    mutationFn: (ids: string[]) =>
      axios.delete(`${BASE}/api/crm/contracts/bulk`, { data: { ids } }),
    onSuccess: () => {
      clearSelection();
      queryClient.invalidateQueries({ queryKey: ["crm-contracts"] });
      toast({ title: "Permanently deleted." });
    },
  });

  const bulkLoading = softDelMutation.isPending || hardDelMutation.isPending;

  // Filter state
  const [search,    setSearch]    = useState("");
  const [status,    setStatus]    = useState("");
  const [dateFrom,  setDateFrom]  = useState("");
  const [dateTo,    setDateTo]    = useState("");
  const [ownerId,   setOwnerId]   = useState("");
  const [payFreq,   setPayFreq]   = useState("");
  const [arStatus,  setArStatus]  = useState("");
  const [apStatus,  setApStatus]  = useState("");
  const [period,    setPeriod]    = useState<Period | "">("");
  const [showAdv,   setShowAdv]   = useState(false);
  const [page,      setPage]      = useState(1);
  const [pageSize,  setPageSize]  = useState(10);

  const [typeFilter, setTypeFilter] = useState<"all" | "camp" | "study_abroad" | "internship" | "other">("all");

  // Applied filters (on Apply click)
  const [applied, setApplied] = useState<Record<string, string>>({});

  // Adv panel draft
  const [draftOwnerId, setDraftOwnerId] = useState("");
  const [draftPayFreq, setDraftPayFreq] = useState("");
  const [draftArStatus, setDraftArStatus] = useState("");
  const [draftApStatus, setDraftApStatus] = useState("");

  const activeAdvCount = [draftOwnerId, draftPayFreq, draftArStatus, draftApStatus].filter(Boolean).length;

  function applyAdv() {
    setOwnerId(draftOwnerId);
    setPayFreq(draftPayFreq);
    setArStatus(draftArStatus);
    setApStatus(draftApStatus);
    setShowAdv(false);
    setPage(1);
    const next: Record<string, string> = {};
    if (draftOwnerId)  next.ownerId  = draftOwnerId;
    if (draftPayFreq)  next.payFreq  = draftPayFreq;
    if (draftArStatus) next.arStatus = draftArStatus;
    if (draftApStatus) next.apStatus = draftApStatus;
    setApplied(next);
  }

  function clearAdv() {
    setDraftOwnerId(""); setDraftPayFreq(""); setDraftArStatus(""); setDraftApStatus("");
    setOwnerId(""); setPayFreq(""); setArStatus(""); setApStatus(""); setApplied({}); setPage(1);
  }

  function selectPeriod(p: Period) {
    setPeriod(p);
    const [f, t] = calcPeriod(p);
    setDateFrom(f); setDateTo(t); setPage(1);
  }

  useEffect(() => { setPage(1); }, [sortBy, sortDir]);

  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (search)   params.set("search", search);
  if (status)   params.set("status", status);
  if (dateFrom) params.set("dateFrom", dateFrom);
  if (dateTo)   params.set("dateTo", dateTo);
  if (ownerId)  params.set("ownerId", ownerId);
  if (payFreq)  params.set("paymentFrequency", payFreq);
  if (arStatus) params.set("arStatus", arStatus);
  if (apStatus) params.set("apStatus", apStatus);
  params.set("sortBy",  sortBy);
  params.set("sortDir", sortDir);

  const { data: resp, isLoading } = useQuery({
    queryKey: ["crm-contracts", params.toString()],
    queryFn: () => axios.get(`${BASE}/api/crm/contracts?${params}`).then(r => r.data),
  });

  const rows: ContractRow[]    = resp?.data       ?? [];
  const sortedAll = useSorted(rows, sortBy, sortDir);
  const sorted = useMemo(() => {
    if (typeFilter === "all") return sortedAll;
    if (typeFilter === "camp") return sortedAll.filter(r =>
      !!r.applicationId || r.primaryServiceModule === "camp"
    );
    if (typeFilter === "study_abroad") return sortedAll.filter(r =>
      r.primaryServiceModule === "study_abroad" || r.primaryServiceModule === "studyAbroad"
    );
    if (typeFilter === "internship") return sortedAll.filter(r =>
      r.primaryServiceModule === "internship"
    );
    if (typeFilter === "other") return sortedAll.filter(r => {
      const m = r.primaryServiceModule ?? "";
      return !r.applicationId && m !== "camp" && m !== "study_abroad" && m !== "studyAbroad" && m !== "internship";
    });
    return sortedAll;
  }, [sortedAll, typeFilter]);
  const pagination: Pagination = resp?.pagination ?? { total: 0, page: 1, pageSize: 10, totalPages: 1 };
  const summary: Summary       = resp?.summary    ?? { activeCount: 0, arOutstanding: 0, apPayable: 0, commissionEstimate: 0 };

  const sortedIds = sorted.map(r => r.id);

  const activeTags = useMemo(() => {
    const tags: { key: string; label: string }[] = [];
    if (status)   tags.push({ key: "status",   label: `Status: ${status}`   });
    if (dateFrom) tags.push({ key: "dateFrom", label: `From: ${dateFrom}`   });
    if (dateTo)   tags.push({ key: "dateTo",   label: `To: ${dateTo}`       });
    if (applied.ownerId)  tags.push({ key: "ownerId",  label: `Owner: set`          });
    if (applied.payFreq)  tags.push({ key: "payFreq",  label: `Freq: ${payFreq}`    });
    if (applied.arStatus) tags.push({ key: "arStatus", label: `AR: ${arStatus}`     });
    if (applied.apStatus) tags.push({ key: "apStatus", label: `AP: ${apStatus}`     });
    return tags;
  }, [status, dateFrom, dateTo, applied, payFreq, arStatus, apStatus]);

  function removeTag(key: string) {
    if (key === "status")   { setStatus(""); }
    if (key === "dateFrom") { setDateFrom(""); setPeriod(""); }
    if (key === "dateTo")   { setDateTo(""); setPeriod(""); }
    if (key === "ownerId")  { setOwnerId(""); setDraftOwnerId(""); setApplied(a => { const n={...a}; delete n.ownerId; return n; }); }
    if (key === "payFreq")  { setPayFreq(""); setDraftPayFreq(""); setApplied(a => { const n={...a}; delete n.payFreq; return n; }); }
    if (key === "arStatus") { setArStatus(""); setDraftArStatus(""); setApplied(a => { const n={...a}; delete n.arStatus; return n; }); }
    if (key === "apStatus") { setApStatus(""); setDraftApStatus(""); setApplied(a => { const n={...a}; delete n.apStatus; return n; }); }
    setPage(1);
  }

  const PERIODS: [Period, string][] = [
    ["today","Today"],["month","This Month"],["last-month","Last Month"],
    ["term","This Term"],["last-term","Last Term"],["year","This Year"],
  ];

  return (
    <div className="min-h-screen bg-[#FAFAF9] p-6 space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#1C1917]">Contracts</h1>
          <p className="text-sm text-[#57534E] mt-1">Manage student contracts and payment schedules</p>
        </div>
      </div>

      {isSA && selectedIds.size > 0 && (
        <BulkActionBar
          count={selectedIds.size}
          isLoading={bulkLoading}
          onSoftDelete={() => softDelMutation.mutate(Array.from(selectedIds))}
          onHardDelete={() => hardDelMutation.mutate(Array.from(selectedIds))}
        />
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Active Contracts" value={String(summary.activeCount)} />
        <StatCard label="AR Outstanding"   value={fmtMoney(summary.arOutstanding)}  accent="var(--e-orange)" />
        <StatCard label="AP Payable"        value={fmtMoney(summary.apPayable)}       accent="#DC2626" />
        <StatCard label="Commission Est."   value={fmtMoney(summary.commissionEstimate)} accent="#16A34A" />
      </div>

      {/* Type Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {([
          { key: "all",         label: "All"          },
          { key: "camp",        label: "Camp"         },
          { key: "study_abroad",label: "Study Abroad" },
          { key: "internship",  label: "Internship"   },
          { key: "other",       label: "Other"        },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTypeFilter(key)}
            style={typeFilter === key
              ? { background: "var(--e-orange-lt)", borderColor: "var(--e-orange)", color: "var(--e-orange)", fontWeight: 600 }
              : { background: "white",   borderColor: "#E8E6E2", color: "#57534E" }}
            className="px-4 py-1.5 rounded-lg border-[1.5px] text-[13px] hover:bg-[#FAFAF9] transition-colors"
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filter Card */}
      <div className="bg-white border border-[#E8E6E2] rounded-xl overflow-x-auto">
        <div className="p-4 flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E]" />
            <input
              className="w-full pl-9 pr-3 h-9 rounded-lg border border-[#E8E6E2] text-sm outline-none focus:border-(--e-orange) bg-white"
              placeholder="Search student, school, ref..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          {/* Quick Period */}
          <div className="flex gap-1 flex-wrap">
            {PERIODS.map(([key, label]) => (
              <button
                key={key}
                onClick={() => selectPeriod(key)}
                className="px-3 h-9 rounded-lg text-xs font-medium border transition-all"
                style={period === key
                  ? { background: "var(--e-orange-lt)", color: "var(--e-orange)", borderColor: "var(--e-orange)" }
                  : { background: "white", color: "#57534E", borderColor: "#E8E6E2" }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Date range */}
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPeriod(""); setPage(1); }}
            className="h-9 px-3 rounded-lg border border-[#E8E6E2] text-sm outline-none focus:border-(--e-orange)" />
          <span className="text-[#A8A29E] text-xs">to</span>
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPeriod(""); setPage(1); }}
            className="h-9 px-3 rounded-lg border border-[#E8E6E2] text-sm outline-none focus:border-(--e-orange)" />

          {/* Status */}
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
            className="h-9 px-3 rounded-lg border border-[#E8E6E2] text-sm outline-none focus:border-(--e-orange) bg-white">
            <option value="">All Status</option>
            {["active","in progress","overdue","completed","draft"].map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>

          {/* Advanced toggle */}
          <button
            onClick={() => setShowAdv(v => !v)}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg border text-sm font-medium transition-all"
            style={showAdv ? { background:"var(--e-orange-lt)", color:"var(--e-orange)", borderColor:"var(--e-orange)" } : { background:"white", color:"#57534E", borderColor:"#E8E6E2" }}
          >
            <Settings2 size={14} />
            Advanced
            {activeAdvCount > 0 && (
              <span className="ml-0.5 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center"
                style={{ background:"var(--e-orange)", color:"white" }}>{activeAdvCount}</span>
            )}
            <ChevronDown size={13} style={{ transform: showAdv ? "rotate(180deg)" : undefined, transition: "transform 150ms" }} />
          </button>
        </div>

        {/* Advanced Panel */}
        {showAdv && (
          <div className="border-t border-[#E8E6E2] px-4 py-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:grid-cols-4">
              <div>
                <label className="block text-xs font-medium text-[#57534E] mb-1">Payment Type</label>
                <select value={draftPayFreq} onChange={e => setDraftPayFreq(e.target.value)}
                  className="w-full h-9 px-2 rounded-lg border border-[#E8E6E2] text-sm outline-none focus:border-(--e-orange) bg-white">
                  <option value="">All</option>
                  {["once","per_term","monthly","custom"].map(v => (
                    <option key={v} value={v}>{v.replace("_"," ").replace(/\b\w/g,c=>c.toUpperCase())}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#57534E] mb-1">AR Status</label>
                <select value={draftArStatus} onChange={e => setDraftArStatus(e.target.value)}
                  className="w-full h-9 px-2 rounded-lg border border-[#E8E6E2] text-sm outline-none focus:border-(--e-orange) bg-white">
                  <option value="">All</option>
                  {["scheduled","invoiced","overdue","partial","paid"].map(v => (
                    <option key={v} value={v}>{v.charAt(0).toUpperCase()+v.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#57534E] mb-1">AP Status</label>
                <select value={draftApStatus} onChange={e => setDraftApStatus(e.target.value)}
                  className="w-full h-9 px-2 rounded-lg border border-[#E8E6E2] text-sm outline-none focus:border-(--e-orange) bg-white">
                  <option value="">All</option>
                  {["pending","ready","paid","overdue"].map(v => (
                    <option key={v} value={v}>{v.charAt(0).toUpperCase()+v.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={clearAdv}
                className="h-8 px-4 rounded-lg border border-[#E8E6E2] text-sm text-[#57534E] hover:bg-[#F4F3F1]">
                Clear All
              </button>
              <button onClick={applyAdv}
                className="h-8 px-4 rounded-lg text-sm text-white font-medium"
                style={{ background: "var(--e-orange)" }}>
                Apply Filters
              </button>
            </div>
          </div>
        )}

        {/* Active tags */}
        {activeTags.length > 0 && (
          <div className="px-4 pb-3 flex flex-wrap gap-2">
            {activeTags.map(t => (
              <ActiveTag key={t.key} label={t.label} onRemove={() => removeTag(t.key)} />
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E8E6E2] rounded-xl overflow-x-auto">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E8E6E2]" style={{ background: "#FAFAF9" }}>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#A8A29E] w-8">
                  {isSA && (
                    <input type="checkbox" className="rounded border-stone-300"
                      checked={isAllSelected(sortedIds)}
                      onChange={() => toggleAll(sortedIds)} />
                  )}
                </th>
                <SortableTh col="contractNumber" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#A8A29E]">Contract Ref</SortableTh>
                <SortableTh col="studentName" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#A8A29E]">Student</SortableTh>
                <SortableTh col="programName" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#A8A29E]">School / Program</SortableTh>
                <SortableTh col="startDate" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#A8A29E]">From</SortableTh>
                <SortableTh col="endDate" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#A8A29E]">To</SortableTh>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#A8A29E]">Dur.</th>
                <SortableTh col="totalValue" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-right px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#A8A29E]">Value</SortableTh>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#A8A29E]">AR</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#A8A29E]">AP</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#A8A29E] min-w-[90px]">Collected</th>
                <SortableTh col="status" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#A8A29E]">Status</SortableTh>
                <SortableTh col="createdAt" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#A8A29E] whitespace-nowrap">Created</SortableTh>
                <SortableTh col="updatedAt" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#A8A29E] whitespace-nowrap">Updated</SortableTh>
                <th className="px-4 py-3 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-[#E8E6E2]">
                  {Array.from({ length: 15 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 rounded animate-pulse" style={{ background: "#F4F3F1", width: `${60 + Math.random()*40}%` }} />
                    </td>
                  ))}
                </tr>
              ))}
              {!isLoading && sorted.length === 0 && (
                <tr>
                  <td colSpan={15} className="text-center py-16 text-[#A8A29E]">
                    <FileText size={32} className="mx-auto mb-3 opacity-40" />
                    <p className="font-medium">No contracts found</p>
                    <button onClick={clearAdv} className="mt-2 text-sm underline" style={{ color:"var(--e-orange)" }}>Clear filters</button>
                  </td>
                </tr>
              )}
              {!isLoading && sorted.map(row => (
                <tr key={row.id}
                  className="border-b border-[#E8E6E2] cursor-pointer hover:bg-(--e-orange-lt) transition-colors"
                  onClick={() => navigate(`/admin/crm/contracts/${row.id}`)}
                >
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    {isSA && (
                      <input type="checkbox" className="rounded"
                        checked={selectedIds.has(row.id)}
                        onChange={() => toggleSelect(row.id)} />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-semibold" style={{ color:"var(--e-orange)" }}>{row.contractRefDisplay ?? "—"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <ClientNameCell
                      fields={nameFromAccount({
                        firstName:    row.account?.firstName,
                        lastName:     row.account?.lastName,
                        originalName: row.account?.originalName,
                        name:         row.account?.name,
                      })}
                      accountId={row.account?.id}
                      subLabel={row.clientEmail ?? undefined}
                    />
                  </td>
                  <td className="px-4 py-3">
                    {row.primaryService ? (
                      <span className="text-[12px] text-[#57534E]">
                        {row.primaryService.type.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}
                      </span>
                    ) : <span className="text-[#A8A29E]">—</span>}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-[#57534E] whitespace-nowrap">{fmtDate(row.fromDate)}</td>
                  <td className="px-4 py-3 text-[12px] text-[#57534E] whitespace-nowrap">{fmtDate(row.toDate)}</td>
                  <td className="px-4 py-3 text-[12px] text-[#57534E]">{duration(row.fromDate, row.toDate)}</td>
                  <td className="px-4 py-3 text-right text-[13px] font-semibold text-[#1C1917]">{fmtMoney(row.contractAmount)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      {(row.arSummary?.statusList ?? []).slice(0,2).map((s,i) => (
                        <StatusBadge key={i} s={s} map={AR_STATUS_STYLES} />
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      {(row.apSummary?.statusList ?? []).slice(0,2).map((s,i) => (
                        <StatusBadge key={i} s={s} map={AP_STATUS_STYLES} />
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 min-w-[90px]">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-[#F4F3F1] overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${row.collectionRate}%`, background:"var(--e-orange)" }} />
                      </div>
                      <span className="text-[11px] text-[#57534E] whitespace-nowrap">{row.collectionRate}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge s={row.contractStatus} map={CONTRACT_STATUS_STYLES} />
                  </td>
                  <td className="px-4 py-3 text-[11px] text-[#A8A29E] whitespace-nowrap">{fmtDate(row.createdAt)}</td>
                  <td className="px-4 py-3 text-[11px] text-[#A8A29E] whitespace-nowrap">{fmtDate(row.updatedAt)}</td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <button className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[#F4F3F1] text-[#A8A29E]">
                      <MoreHorizontal size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[#E8E6E2] flex items-center justify-between">
          <span className="text-sm text-[#57534E]">
            Showing {Math.min((page-1)*pageSize+1, pagination.total)}–{Math.min(page*pageSize, pagination.total)} of {pagination.total} contracts
          </span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-[#57534E]">
              Rows per page:
              <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="h-8 px-2 rounded-lg border border-[#E8E6E2] text-sm outline-none bg-white">
                {[10,20,50,100].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-1">
              <button disabled={page === 1} onClick={() => setPage(p => p-1)}
                className="w-8 h-8 rounded-lg border border-[#E8E6E2] flex items-center justify-center text-[#57534E] disabled:opacity-40 hover:bg-[#F4F3F1]">
                <ChevronLeft size={14} />
              </button>
              <span className="text-sm text-[#57534E] px-2">{page} / {pagination.totalPages}</span>
              <button disabled={page >= pagination.totalPages} onClick={() => setPage(p => p+1)}
                className="w-8 h-8 rounded-lg border border-[#E8E6E2] flex items-center justify-center text-[#57534E] disabled:opacity-40 hover:bg-[#F4F3F1]">
                <ChevronRightIcon size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
