import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, TrendingUp, TrendingDown, AlertCircle, CheckCircle, Clock } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ─── Types ────────────────────────────────────────────────────────────────────
interface PaymentScheduleRow {
  id: string;
  contractId: string;
  contractNumber: string | null;
  studentName: string | null;
  accountName: string | null;
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
  invoiced:  { label: "Invoiced",  bg: "#FEF0E3", color: "#F5821F" },
  partial:   { label: "Partial",   bg: "#FEF9C3", color: "#CA8A04" },
  paid:      { label: "Paid",      bg: "#DCFCE7", color: "#16A34A" },
  overdue:   { label: "Overdue",   bg: "#FEF2F2", color: "#DC2626" },
};

const AP_STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  pending: { label: "Pending", bg: "#F4F3F1", color: "#57534E" },
  ready:   { label: "Ready",   bg: "#FEF0E3", color: "#F5821F" },
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
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
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
          backgroundColor: "#FEF0E3",
          color: "#F5821F",
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

// ─── Main component ───────────────────────────────────────────────────────────
export default function PaymentScheduleTab() {
  const [arFilter, setArFilter] = useState<string>("all");
  const [apFilter, setApFilter] = useState<string>("all");
  const [search, setSearch]     = useState("");

  const { data, isLoading, error } = useQuery<{ success: boolean; data: PaymentScheduleRow[] }>({
    queryKey: ["payment-schedule", arFilter, apFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (arFilter !== "all") params.set("arStatus", arFilter);
      if (apFilter !== "all") params.set("apStatus", apFilter);
      const res = await fetch(`${BASE}/api/accounting/payment-schedule?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const allRows = data?.data ?? EMPTY_ROWS;

  const rows = search
    ? allRows.filter(r => {
        const q = search.toLowerCase();
        return (
          r.studentName?.toLowerCase().includes(q) ||
          r.accountName?.toLowerCase().includes(q) ||
          r.contractNumber?.toLowerCase().includes(q) ||
          r.name?.toLowerCase().includes(q)
        );
      })
    : allRows;

  // KPI aggregates
  const totalAr  = rows.reduce((s, r) => s + Number(r.arAmount ?? 0), 0);
  const totalAp  = rows.reduce((s, r) => s + Number(r.apAmount ?? 0), 0);
  const overdueAr = rows.filter(r => r.arStatus === "overdue").length;
  const readyAp   = rows.filter(r => r.apStatus === "ready").length;

  const TABLE_HEADERS = [
    "Student / School",
    "Item",
    "AR Due",
    "AR Amount",
    "AR Status",
    "AP Due",
    "AP Amount",
    "AP Status",
    "Net",
  ];

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
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <KpiCard
          icon={TrendingUp}
          label="Total AR Outstanding"
          value={fmt(totalAr)}
        />
        <KpiCard
          icon={TrendingDown}
          label="Total AP Payable"
          value={fmt(totalAp)}
        />
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
          subColor={readyAp > 0 ? "#F5821F" : "#57534E"}
        />
      </div>

      {/* Filter bar */}
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search student, school, contract…"
          style={{
            height: 40,
            border: "1.5px solid #E8E6E2",
            borderRadius: 8,
            padding: "0 12px",
            fontSize: 14,
            color: "#1C1917",
            background: "#FFFFFF",
            outline: "none",
            minWidth: 240,
          }}
        />

        <select
          value={arFilter}
          onChange={e => setArFilter(e.target.value)}
          style={{
            height: 40,
            border: "1.5px solid #E8E6E2",
            borderRadius: 8,
            padding: "0 12px",
            fontSize: 14,
            color: "#1C1917",
            background: "#FFFFFF",
            cursor: "pointer",
          }}
        >
          <option value="all">All AR Status</option>
          <option value="scheduled">Scheduled</option>
          <option value="invoiced">Invoiced</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
        </select>

        <select
          value={apFilter}
          onChange={e => setApFilter(e.target.value)}
          style={{
            height: 40,
            border: "1.5px solid #E8E6E2",
            borderRadius: 8,
            padding: "0 12px",
            fontSize: 14,
            color: "#1C1917",
            background: "#FFFFFF",
            cursor: "pointer",
          }}
        >
          <option value="all">All AP Status</option>
          <option value="pending">Pending</option>
          <option value="ready">Ready</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
        </select>

        <span style={{ fontSize: 13, color: "#A8A29E", marginLeft: "auto" }}>
          {rows.length} records
        </span>
      </div>

      {/* Table */}
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E8E6E2",
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#FAFAF9" }}>
              {TABLE_HEADERS.map(h => (
                <th
                  key={h}
                  style={{
                    padding: "10px 16px",
                    textAlign: "left",
                    fontSize: 12,
                    fontWeight: 500,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "#57534E",
                    borderBottom: "1px solid #E8E6E2",
                    whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  style={{
                    padding: 40,
                    textAlign: "center",
                    color: "#A8A29E",
                    fontSize: 14,
                  }}
                >
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
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#FEF0E3")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    {/* Student / School */}
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: "#1C1917" }}>
                        {row.studentName || row.accountName || "—"}
                      </div>
                      <div style={{ fontSize: 12, color: "#57534E", marginTop: 2 }}>
                        {row.contractNumber || "—"}
                      </div>
                    </td>

                    {/* Item */}
                    <td style={{ padding: "14px 16px", fontSize: 14, color: "#1C1917" }}>
                      {row.name || (row.sortIndex != null ? `Item ${row.sortIndex}` : "—")}
                    </td>

                    {/* AR Due */}
                    <td style={{ padding: "14px 16px", fontSize: 13, color: "#57534E", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Calendar size={13} />
                        {fmtDate(row.arDueDate)}
                      </div>
                    </td>

                    {/* AR Amount */}
                    <td style={{ padding: "14px 16px", fontSize: 14, fontWeight: 500, color: "#1C1917" }}>
                      {fmt(row.arAmount)}
                    </td>

                    {/* AR Status */}
                    <td style={{ padding: "14px 16px" }}>
                      <StatusBadge status={row.arStatus} config={AR_STATUS_CONFIG} />
                    </td>

                    {/* AP Due */}
                    <td style={{ padding: "14px 16px", fontSize: 13, color: "#57534E", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Clock size={13} />
                        {fmtDate(row.apDueDate)}
                      </div>
                    </td>

                    {/* AP Amount */}
                    <td style={{ padding: "14px 16px", fontSize: 14, fontWeight: 500, color: "#1C1917" }}>
                      {fmt(row.apAmount)}
                    </td>

                    {/* AP Status */}
                    <td style={{ padding: "14px 16px" }}>
                      <StatusBadge status={row.apStatus} config={AP_STATUS_CONFIG} />
                    </td>

                    {/* Net */}
                    <td
                      style={{
                        padding: "14px 16px",
                        fontSize: 14,
                        fontWeight: 600,
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
    </div>
  );
}
