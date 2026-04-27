import { useState } from "react";
import { formatDate } from "@/lib/date-format";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Calendar, TrendingUp, TrendingDown, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { SortableTh, useSortState, useSorted } from "@/components/ui/sortable-th";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ─── Types ────────────────────────────────────────────────────────────────────
interface PaymentScheduleRow {
  id: string;
  contractId: string;
  contractNumber: string | null;
  studentName: string | null;
  accountName: string | null;
  providerName: string | null;
  ownerName: string | null;
  name: string | null;
  sortIndex: number | null;
  arAmount: string | null;
  arDueDate: string | null;
  arStatus: "scheduled" | "invoiced" | "partial" | "paid" | "overdue" | null;
  apAmount: string | null;
  apDueDate: string | null;
  apStatus: "pending" | "ready" | "paid" | "overdue" | null;
  serviceModuleType: string | null;
}

// ─── Status badge configs ─────────────────────────────────────────────────────
const AR_STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  scheduled: { label: "Scheduled", bg: "#F4F3F1", color: "#57534E" },
  invoiced:  { label: "Invoiced",  bg: "var(--e-orange-lt)", color: "var(--e-orange)" },
  partial:   { label: "Partial",   bg: "#FEF9C3", color: "#CA8A04" },
  paid:      { label: "Paid",      bg: "#DCFCE7", color: "#16A34A" },
  overdue:   { label: "Overdue",   bg: "#FEF2F2", color: "#DC2626" },
};

const AP_STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  pending: { label: "Pending", bg: "#F4F3F1", color: "#57534E" },
  ready:   { label: "Ready",   bg: "var(--e-orange-lt)", color: "var(--e-orange)" },
  paid:    { label: "Paid",    bg: "#DCFCE7", color: "#16A34A" },
  overdue: { label: "Overdue", bg: "#FEF2F2", color: "#DC2626" },
};

function StatusBadge({
  status,
  config,
}: {
  status: string | null | undefined;
  config: Record<string, { label: string; bg: string; color: string }>;
}) {
  const key = status ?? "";
  const cfg = config[key] ?? { label: key || "—", bg: "#F4F3F1", color: "#57534E" };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 500,
        backgroundColor: cfg.bg,
        color: cfg.color,
      }}
    >
      {cfg.label}
    </span>
  );
}

// ─── Formatters ───────────────────────────────────────────────────────────────
function fmt(val: string | number | null | undefined): string {
  if (val === null || val === undefined || val === "") return "—";
  return `A$${Number(val).toLocaleString("en-AU", { minimumFractionDigits: 2 })}`;
}

function fmtDate(d: string | null | undefined): string {
  return formatDate(d);
}

// ─── KPI card ─────────────────────────────────────────────────────────────────
function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  subColor,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  subColor?: string;
}) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid #E8E6E2",
        borderRadius: 12,
        padding: "20px 24px",
        display: "flex",
        alignItems: "center",
        gap: 16,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--e-orange-lt)",
          color: "var(--e-orange)",
          flexShrink: 0,
        }}
      >
        <Icon size={20} />
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#1C1917" }}>{value}</div>
        <div style={{ fontSize: 13, color: "#57534E" }}>{label}</div>
        {sub && (
          <div style={{ fontSize: 12, color: subColor ?? "#57534E", marginTop: 2 }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Stable empty array ───────────────────────────────────────────────────────
const EMPTY_ROWS: PaymentScheduleRow[] = [];

function endOfCurrentMonth(): string {
  const now = new Date();
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return last.toISOString().split("T")[0];
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function PaymentScheduleTab() {
  const [, navigate] = useLocation();
  const { sortBy, sortDir, onSort } = useSortState("arDueDate", "desc");
  const [arFilter, setArFilter] = useState<string>("not_paid");
  const [apFilter, setApFilter] = useState<string>("not_paid");
  const [search, setSearch]     = useState("");
  const [dateTo, setDateTo]     = useState(endOfCurrentMonth);
  const [page, setPage]         = useState(1);
  const PAGE_SIZE = 20;

  const { data, isLoading, error } = useQuery<{ success: boolean; data: PaymentScheduleRow[] }>({
    queryKey: ["payment-schedule"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/accounting/payment-schedule`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const allRows = data?.data ?? EMPTY_ROWS;

  const filteredRows = allRows.filter(r => {
    const arOk = arFilter === "all"
      ? true
      : arFilter === "not_paid"
        ? r.arStatus !== "paid"
        : r.arStatus === arFilter;
    const apOk = apFilter === "all"
      ? true
      : apFilter === "not_paid"
        ? r.apStatus !== "paid"
        : r.apStatus === apFilter;
    const dateOk = !dateTo || !r.arDueDate || r.arDueDate <= dateTo;
    const q = search.toLowerCase();
    const searchOk = !search || (
      r.studentName?.toLowerCase().includes(q) ||
      r.accountName?.toLowerCase().includes(q) ||
      r.contractNumber?.toLowerCase().includes(q) ||
      r.name?.toLowerCase().includes(q)
    );
    return arOk && apOk && dateOk && searchOk;
  });

  const sortedRows = useSorted(filteredRows, sortBy, sortDir);
  const totalPages = Math.ceil(sortedRows.length / PAGE_SIZE);
  const rows = sortedRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalAr   = filteredRows.reduce((s, r) => s + Number(r.arAmount ?? 0), 0);
  const totalAp   = filteredRows.reduce((s, r) => s + Number(r.apAmount ?? 0), 0);
  const overdueAr = filteredRows.filter(r => r.arStatus === "overdue").length;
  const readyAp   = filteredRows.filter(r => r.apStatus === "ready").length;

  const thStyle = "text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide whitespace-nowrap";

  if (isLoading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#A8A29E", fontSize: 14 }}>
        Loading payment schedule…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#DC2626", fontSize: 14 }}>
        Failed to load data. Please refresh.
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 0" }}>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <KpiCard icon={TrendingUp}   label="Total AR Outstanding" value={fmt(totalAr)} />
        <KpiCard icon={TrendingDown} label="Total AP Payable"     value={fmt(totalAp)} />
        <KpiCard
          icon={AlertCircle}
          label="Overdue AR"
          value={String(overdueAr)}
          sub={overdueAr > 0 ? "Needs attention" : "All good"}
          subColor={overdueAr > 0 ? "#DC2626" : "#16A34A"}
        />
        <KpiCard
          icon={CheckCircle}
          label="AP Ready to Pay"
          value={String(readyAp)}
          sub={readyAp > 0 ? "Remittance pending" : "None pending"}
          subColor={readyAp > 0 ? "var(--e-orange)" : "#57534E"}
        />
      </div>

      {/* Filter bar */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search student, school, contract…"
          style={{ height: 40, border: "1.5px solid #E8E6E2", borderRadius: 8, padding: "0 12px", fontSize: 14, color: "#1C1917", background: "#FFFFFF", outline: "none", minWidth: 220 }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13, color: "#57534E", whiteSpace: "nowrap" }}>Due by</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); setPage(1); }}
            style={{ height: 40, border: "1.5px solid #E8E6E2", borderRadius: 8, padding: "0 10px", fontSize: 14, color: "#1C1917", background: "#FFFFFF", cursor: "pointer" }}
          />
        </div>

        <select
          value={arFilter}
          onChange={e => { setArFilter(e.target.value); setPage(1); }}
          style={{ height: 40, border: "1.5px solid #E8E6E2", borderRadius: 8, padding: "0 12px", fontSize: 14, color: "#1C1917", background: "#FFFFFF", cursor: "pointer" }}
        >
          <option value="all">AR: All</option>
          <option value="not_paid">AR: Excl. Paid</option>
          <option value="scheduled">AR: Scheduled</option>
          <option value="invoiced">AR: Invoiced</option>
          <option value="partial">AR: Partial</option>
          <option value="paid">AR: Paid</option>
          <option value="overdue">AR: Overdue</option>
        </select>

        <select
          value={apFilter}
          onChange={e => { setApFilter(e.target.value); setPage(1); }}
          style={{ height: 40, border: "1.5px solid #E8E6E2", borderRadius: 8, padding: "0 12px", fontSize: 14, color: "#1C1917", background: "#FFFFFF", cursor: "pointer" }}
        >
          <option value="all">AP: All</option>
          <option value="not_paid">AP: Excl. Paid</option>
          <option value="pending">AP: Pending</option>
          <option value="ready">AP: Ready</option>
          <option value="paid">AP: Paid</option>
          <option value="overdue">AP: Overdue</option>
        </select>

        <span style={{ fontSize: 13, color: "#A8A29E", marginLeft: "auto" }}>
          {filteredRows.length} records
        </span>
      </div>

      {/* Table */}
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E8E6E2",
          borderRadius: 12,
          overflowX: "auto",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        <table style={{ minWidth: 1450, width: "100%", borderCollapse: "collapse" }} className="text-sm">
          <thead className="bg-stone-50 border-b border-stone-200">
            <tr>
              <SortableTh col="contractNumber" sortBy={sortBy} sortDir={sortDir} onSort={c => { onSort(c); setPage(1); }} className={thStyle}>Contract #</SortableTh>
              <SortableTh col="studentName"    sortBy={sortBy} sortDir={sortDir} onSort={c => { onSort(c); setPage(1); }} className={thStyle}>Student</SortableTh>
              <SortableTh col="providerName"   sortBy={sortBy} sortDir={sortDir} onSort={c => { onSort(c); setPage(1); }} className={thStyle}>Provider</SortableTh>
              <SortableTh col="name"           sortBy={sortBy} sortDir={sortDir} onSort={c => { onSort(c); setPage(1); }} className={thStyle}>Product</SortableTh>
              <SortableTh col="arDueDate"      sortBy={sortBy} sortDir={sortDir} onSort={c => { onSort(c); setPage(1); }} className={thStyle}>AR Due</SortableTh>
              <SortableTh col="arAmount"       sortBy={sortBy} sortDir={sortDir} onSort={c => { onSort(c); setPage(1); }} className={thStyle}>AR Amount</SortableTh>
              <SortableTh col="arStatus"       sortBy={sortBy} sortDir={sortDir} onSort={c => { onSort(c); setPage(1); }} className={thStyle}>AR Status</SortableTh>
              <SortableTh col="apDueDate"      sortBy={sortBy} sortDir={sortDir} onSort={c => { onSort(c); setPage(1); }} className={thStyle}>AP Due</SortableTh>
              <SortableTh col="apAmount"       sortBy={sortBy} sortDir={sortDir} onSort={c => { onSort(c); setPage(1); }} className={thStyle}>AP Amount</SortableTh>
              <SortableTh col="apStatus"       sortBy={sortBy} sortDir={sortDir} onSort={c => { onSort(c); setPage(1); }} className={thStyle}>AP Status</SortableTh>
              <SortableTh col="ownerName"      sortBy={sortBy} sortDir={sortDir} onSort={c => { onSort(c); setPage(1); }} className={thStyle}>Owner</SortableTh>
              <th className={thStyle}>Net</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={12} style={{ padding: 40, textAlign: "center", color: "#A8A29E", fontSize: 14 }}>
                  No payment schedule records found.
                </td>
              </tr>
            ) : (
              rows.map((row, i) => {
                const net = Number(row.arAmount ?? 0) - Number(row.apAmount ?? 0);
                return (
                  <tr
                    key={row.id}
                    style={{
                      borderBottom: i < rows.length - 1 ? "1px solid #F4F3F1" : "none",
                      transition: "background 200ms",
                      cursor: row.contractId ? "pointer" : "default",
                    }}
                    onClick={() => row.contractId && navigate(`/admin/crm/contracts/${row.contractId}#schedule`)}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--e-orange-lt)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "14px 16px", fontFamily: "monospace", fontSize: 12, color: "#57534E", whiteSpace: "nowrap" }}>
                      {row.contractNumber || <span style={{ color: "#A8A29E", fontStyle: "italic" }}>No #</span>}
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: 14, fontWeight: 500, color: "#1C1917", whiteSpace: "nowrap" }}>
                      {row.studentName || row.accountName || "—"}
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: 13, color: "#57534E", whiteSpace: "nowrap" }}>
                      {row.providerName || "—"}
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: 13, color: "#1C1917", whiteSpace: "nowrap" }}>
                      {row.name || (row.sortIndex != null ? `Item ${row.sortIndex}` : "—")}
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: 13, color: "#57534E", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Calendar size={13} />
                        {fmtDate(row.arDueDate)}
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: 14, fontWeight: 500, color: "#1C1917", whiteSpace: "nowrap" }}>
                      {fmt(row.arAmount)}
                    </td>
                    <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                      <StatusBadge status={row.arStatus} config={AR_STATUS_CONFIG} />
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: 13, color: "#57534E", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Clock size={13} />
                        {fmtDate(row.apDueDate)}
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: 14, fontWeight: 500, color: "#1C1917", whiteSpace: "nowrap" }}>
                      {fmt(row.apAmount)}
                    </td>
                    <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                      <StatusBadge status={row.apStatus} config={AP_STATUS_CONFIG} />
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: 13, color: "#57534E", whiteSpace: "nowrap" }}>
                      {row.ownerName || "—"}
                    </td>
                    <td
                      style={{
                        padding: "14px 16px",
                        fontSize: 14,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        color: net > 0 ? "#16A34A" : net < 0 ? "#DC2626" : "#57534E",
                      }}
                    >
                      {fmt(net)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16 }}>
          <span style={{ fontSize: 13, color: "#A8A29E" }}>
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sortedRows.length)} / {sortedRows.length} records
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                border: "1.5px solid #E8E6E2",
                background: page === 1 ? "#F4F3F1" : "#FFFFFF",
                color: page === 1 ? "#A8A29E" : "#1C1917",
                fontSize: 13,
                cursor: page === 1 ? "default" : "pointer",
              }}
            >
              Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
              .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push("…");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "…" ? (
                  <span key={`ellipsis-${i}`} style={{ padding: "6px 4px", color: "#A8A29E", fontSize: 13 }}>…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 8,
                      border: "1.5px solid",
                      borderColor: page === p ? "var(--e-orange)" : "#E8E6E2",
                      background: page === p ? "var(--e-orange-lt)" : "#FFFFFF",
                      color: page === p ? "var(--e-orange)" : "#1C1917",
                      fontSize: 13,
                      fontWeight: page === p ? 600 : 400,
                      cursor: "pointer",
                    }}
                  >
                    {p}
                  </button>
                )
              )}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                border: "1.5px solid #E8E6E2",
                background: page === totalPages ? "#F4F3F1" : "#FFFFFF",
                color: page === totalPages ? "#A8A29E" : "#1C1917",
                fontSize: 13,
                cursor: page === totalPages ? "default" : "pointer",
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
