import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, PieChart, Pie, Legend,
} from "recharts";
import {
  FileText, Users, TrendingUp, DollarSign, BarChart2, Briefcase,
  CheckSquare, Calendar, Shield, Target, ArrowRight, Plus,
  AlertTriangle, Clock, Activity, BookOpen, CreditCard, Award,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ─── Design Tokens ───────────────────────────────────────────────────────────
const T = {
  orange:      "#F5821F",
  orangeDark:  "#D96A0A",
  orangeLight: "#FEF0E3",
  card:        "#FFFFFF",
  border:      "#E8E6E2",
  neutral100:  "#F4F3F1",
  neutral400:  "#A8A29E",
  neutral600:  "#57534E",
  neutral900:  "#1C1917",
  success:     "#16A34A",
  successBg:   "#DCFCE7",
  warning:     "#CA8A04",
  warningBg:   "#FEF9C3",
  danger:      "#DC2626",
  dangerBg:    "#FEF2F2",
};

type TabId = "overview" | "operation" | "sales" | "finance";
const TABS: { id: TabId; label: string }[] = [
  { id: "overview",  label: "Overview"  },
  { id: "operation", label: "Operation" },
  { id: "sales",     label: "Sales"     },
  { id: "finance",   label: "Finance"   },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtAUD = (n: number) =>
  n >= 1_000_000 ? `A$${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000   ? `A$${(n / 1_000).toFixed(1)}K`
  :                `A$${n.toLocaleString("en-AU", { minimumFractionDigits: 0 })}`;

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return "morning";
  if (h >= 12 && h < 18) return "afternoon";
  if (h >= 18 && h < 23) return "evening";
  return "night";
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtRelative(d: string | null | undefined) {
  if (!d) return "";
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function KpiCard({
  icon: Icon, value, label, subLabel, trend, trendType, accentLeft, iconBg, iconColor, progressValue, progressColor,
}: {
  icon: React.ElementType; value: string | number; label: string;
  subLabel?: string; trend?: string; trendType?: "up" | "down" | "neutral" | "warning" | "danger";
  accentLeft?: string; iconBg?: string; iconColor?: string;
  progressValue?: number; progressColor?: string;
}) {
  const trendColors = { up: T.success, down: T.danger, neutral: T.neutral400, warning: T.warning, danger: T.danger };
  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 12, padding: "18px 20px",
      borderLeft: accentLeft ? `3px solid ${accentLeft}` : undefined,
      transition: "all 200ms cubic-bezier(0.4,0,0.2,1)",
    }}
      className="hover:shadow-md hover:-translate-y-0.5"
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: iconBg ?? T.orangeLight,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Icon className="w-5 h-5" style={{ color: iconColor ?? T.orange }} strokeWidth={1.8} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: T.neutral900, lineHeight: 1 }}>{value}</div>
          <div style={{ fontSize: 13, color: T.neutral600, marginTop: 4 }}>{label}</div>
          {subLabel && <div style={{ fontSize: 11, color: T.neutral400, marginTop: 2 }}>{subLabel}</div>}
          {trend && (
            <div style={{ fontSize: 11, color: trendColors[trendType ?? "neutral"], marginTop: 4, fontWeight: 500 }}>
              {trend}
            </div>
          )}
          {progressValue !== undefined && (
            <div style={{ height: 5, background: T.neutral100, borderRadius: 999, overflow: "hidden", marginTop: 8 }}>
              <div style={{
                width: `${Math.min(100, Math.max(0, progressValue))}%`,
                height: "100%", background: progressColor ?? T.orange,
                borderRadius: 999, transition: "width 600ms ease",
              }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Card({ title, titleRight, children }: { title: string; titleRight?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12 }}>
      <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: T.neutral900 }}>{title}</h3>
        {titleRight}
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    new:           { bg: T.orangeLight, color: T.orange,   label: "New"         },
    in_progress:   { bg: T.orangeLight, color: T.orange,   label: "In Progress" },
    open:          { bg: T.orangeLight, color: T.orange,   label: "Open"        },
    qualified:     { bg: T.successBg,   color: T.success,  label: "Qualified"   },
    pending:       { bg: T.warningBg,   color: T.warning,  label: "Pending"     },
    cancelled:     { bg: T.dangerBg,    color: T.danger,   label: "Cancelled"   },
    draft:         { bg: T.neutral100,  color: T.neutral600, label: "Draft"     },
    active:        { bg: T.successBg,   color: T.success,  label: "Active"      },
    approved:      { bg: T.successBg,   color: T.success,  label: "Approved"    },
    urgent:        { bg: T.warningBg,   color: T.warning,  label: "Urgent"      },
    converted:     { bg: T.successBg,   color: T.success,  label: "Contracted"  },
  };
  const s = map[status?.toLowerCase()] ?? map["draft"];
  return (
    <span style={{
      display: "inline-block", fontSize: 11, fontWeight: 500,
      padding: "2px 9px", borderRadius: 999,
      background: s.bg, color: s.color,
    }}>{s.label}</span>
  );
}

function ProgressBar({ value, color = T.orange, height = 5 }: { value: number; color?: string; height?: number }) {
  return (
    <div style={{ height, background: T.neutral100, borderRadius: 999, overflow: "hidden", marginTop: 6 }}>
      <div style={{
        width: `${Math.min(100, Math.max(0, value))}%`,
        height: "100%", background: color, borderRadius: 999, transition: "width 600ms ease",
      }} />
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "18px 20px" }}>
      <div style={{ width: "60%", height: 28, borderRadius: 6, background: T.neutral100 }} className="animate-pulse mb-2" />
      <div style={{ width: "40%", height: 16, borderRadius: 6, background: T.neutral100 }} className="animate-pulse" />
    </div>
  );
}

// ─── Legacy data types (from original DashboardCrmPage) ─────────────────────
interface KpiData {
  activeContracts: number; newLeads: number;
  arOutstanding: number; apPending: number;
  commissionYtd: number; campRevenueYtd: number;
}
interface RevenueRow   { month: string; service_type: string; total: string }
interface FunnelRow    { status: string; count: number }
interface AgingRow     { bucket: string; count: number; amount: number; pct: number }
interface StaffKpiRow  {
  id: string; staff_name: string; staff_id: string;
  lead_count: number; conversion_count: number; conversion_rate: string | null;
  attributed_revenue: string; incentive_amount: string;
  bonus_tier: string | null; status: string;
}

const SERVICE_COLORS: Record<string, string> = {
  study_abroad: T.orange, camp: T.success, guardian: T.warning, other: T.neutral400,
};
const SERVICE_LABELS: Record<string, string> = {
  study_abroad: "Study Abroad", camp: "Camp", guardian: "Guardian", other: "Other",
};
const FUNNEL_COLORS: Record<string, string> = {
  new: T.neutral400, open: "#3B82F6", in_progress: T.orange, qualified: T.success, unqualified: T.danger, converted: "#6366F1",
};
const TIER_STYLES: Record<string, string> = {
  platinum: "bg-(--e-orange-lt) text-(--e-orange)",
  gold:     "bg-[#FEF9C3] text-[#CA8A04]",
  silver:   "bg-[#F4F3F1] text-[#57534E]",
  standard: "bg-[#F4F3F1] text-[#A8A29E]",
};
const MONTH_FMT = (ym: string) => {
  const [y, m] = ym.split("-");
  return new Date(Number(y), Number(m) - 1).toLocaleString("en-AU", { month: "short", year: "2-digit" });
};

// ─── NEW API Types ────────────────────────────────────────────────────────────
interface OverviewData {
  totalLeads: number; activeLeads: number;
  totalContracts: number; activeContracts: number;
  totalUsers: number; activeUsers: number;
  thisMonthLeads: number; lastMonthLeads: number; leadMoMPct: number;
  thisMonthContracts: number; lastMonthContracts: number; contractMoMPct: number;
  kpi: {
    periodStart: string; periodEnd: string;
    netRevenue: number; arCollected: number; arScheduled: number;
    apPaid: number; totalIncentive: number; incentiveStaffCount: number;
  };
  recentLeads: Array<{ id: string; name: string; status: string; source: string | null; createdAt: string }>;
}
interface OperationData {
  tasksDueCount: number; tasksOverdueCount: number; tasksUrgentCount: number;
  interviewsThisWeek: number; visaPendingCount: number; visaUrgentCount: number;
  enrollmentTotal: number; enrollmentAvailable: number;
  visaStages: Array<{ stage: string; count: number }>;
  pendingTasks: Array<{ id: string; title: string; dueDate: string | null; assignedTo: string | null; priority: string | null; status: string }>;
  upcomingInterviews: Array<{ id: string; contactName: string; initials: string; location: string | null; interviewType: string | null; scheduledAt: string }>;
  recentActivity: Array<{ id: string; type: string; description: string; createdAt: string }>;
}
interface SalesData {
  pipeline: { new: number; open: number; inProgress: number; qualified: number; contracted: number; total: number };
  monthlyLeads: Array<{ month: string; year: number; count: number; contracts: number }>;
  leadSources: Array<{ source: string; count: number; percentage: number }>;
  recentQuotes: Array<{ id: string; quoteNumber: string; contactName: string; totalAmount: number; status: string; createdAt: string }>;
  goals: { newLeadsTarget: number; newLeadsActual: number; contractsTarget: number; contractsActual: number; conversionRate: number };
  totalQuoteValue: number;
}
interface FinanceData {
  netRevenue: number; arCollected: number; arScheduled: number; apPaid: number; apScheduled: number; totalIncentive: number;
  monthlyRevenue: Array<{ month: string; year: number; ar: number; ap: number }>;
  arSummary: { total: number; outstanding: number; overdueCount: number; invoiceCount: number };
  apSummary: { total: number; overdue: number; urgentCount: number; payableCount: number };
  commissions: Array<{ id: string; schoolName: string; studentName: string; expectedAmount: number; status: string }>;
  totalExpectedCommission: number;
  staffIncentives: Array<{ staffId: string; staffName: string; amount: number; period: string }>;
  upcomingPayments: Array<{ id: string; description: string; dueDate: string; amount: number; urgency: "high" | "medium" | "low" }>;
}

// ─── Source colors for pie chart ──────────────────────────────────────────────
const SOURCE_COLORS = [T.orange, T.orangeDark, T.neutral400, T.border, T.success, T.warning, "#6366F1", "#EC4899"];

// ─── MoM badge ───────────────────────────────────────────────────────────────
function MoMBadge({ pct, thisMonth }: { pct: number; thisMonth: number }) {
  if (thisMonth === 0 && pct === 0) return null;
  const up = pct >= 0;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 600,
      padding: "2px 7px", borderRadius: 999,
      background: up ? T.successBg : T.dangerBg,
      color: up ? T.success : T.danger,
    }}>
      {up ? "↑" : "↓"} {Math.abs(pct)}% vs last month
    </span>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab({ data, loading }: { data: OverviewData | undefined; loading: boolean }) {
  const [, navigate] = useLocation();
  if (loading) return <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">{[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}</div>;

  const kpi = data?.kpi;
  const monthLabel = kpi ? new Date(kpi.periodStart).toLocaleDateString("en-AU", { month: "long", year: "numeric" }) : "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Top KPIs with MoM */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "18px 20px" }} className="hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: T.orangeLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Users className="w-5 h-5" style={{ color: T.orange }} strokeWidth={1.8} />
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: T.neutral900, lineHeight: 1 }}>{data?.totalLeads ?? 0}</div>
              <div style={{ fontSize: 13, color: T.neutral600, marginTop: 4 }}>Total Leads</div>
              <div style={{ fontSize: 11, color: T.neutral400, marginTop: 2 }}>{data?.activeLeads ?? 0} active</div>
              <div style={{ marginTop: 6 }}>
                <MoMBadge pct={data?.leadMoMPct ?? 0} thisMonth={data?.thisMonthLeads ?? 0} />
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "18px 20px" }} className="hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: T.orangeLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <FileText className="w-5 h-5" style={{ color: T.orange }} strokeWidth={1.8} />
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: T.neutral900, lineHeight: 1 }}>{data?.totalContracts ?? 0}</div>
              <div style={{ fontSize: 13, color: T.neutral600, marginTop: 4 }}>Total Contracts</div>
              <div style={{ fontSize: 11, color: T.neutral400, marginTop: 2 }}>{data?.activeContracts ?? 0} active</div>
              <div style={{ marginTop: 6 }}>
                <MoMBadge pct={data?.contractMoMPct ?? 0} thisMonth={data?.thisMonthContracts ?? 0} />
              </div>
            </div>
          </div>
        </div>

        <KpiCard icon={Users}     value={data?.totalUsers ?? 0}      label="Total Users"      subLabel={`${data?.activeUsers ?? 0} active`} />
        <KpiCard icon={TrendingUp} value={fmtAUD(kpi?.netRevenue ?? 0)} label="Net Revenue (MTD)" accentLeft={T.orange} />
      </div>

      {/* This Month's KPI */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: T.neutral400, textTransform: "uppercase", letterSpacing: 1 }}>
              THIS MONTH'S KPI
            </span>
            {monthLabel && (
              <span style={{ fontSize: 11, background: T.card, border: `1px solid ${T.border}`, borderRadius: 7, padding: "3px 10px", color: T.neutral600 }}>
                {monthLabel}
              </span>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard icon={DollarSign} value={fmtAUD(kpi?.netRevenue ?? 0)} label="Net Revenue" accentLeft={T.orange}
            progressValue={kpi && kpi.arScheduled > 0 ? (kpi.arCollected / kpi.arScheduled) * 100 : 0} />
          <KpiCard icon={TrendingUp} value={fmtAUD(kpi?.arCollected ?? 0)} label="AR Collected"
            subLabel={`Scheduled: ${fmtAUD(kpi?.arScheduled ?? 0)}`} accentLeft={T.success}
            iconBg={T.successBg} iconColor={T.success}
            progressValue={kpi && kpi.arScheduled > 0 ? (kpi.arCollected / kpi.arScheduled) * 100 : 0}
            progressColor={T.success} />
          <KpiCard icon={Award} value={fmtAUD(kpi?.totalIncentive ?? 0)} label="Total Incentives"
            subLabel={`${kpi?.incentiveStaffCount ?? 0} staff members`} accentLeft={T.warning}
            iconBg={T.warningBg} iconColor={T.warning} />
        </div>
      </div>

      {/* Recent Leads + Quick Actions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
        <Card title="Recent Leads">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                {["Name", "Status", "Source", "Date"].map(h => (
                  <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 11, fontWeight: 600, color: T.neutral400, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data?.recentLeads ?? []).length === 0 ? (
                <tr><td colSpan={4} style={{ padding: "24px 10px", textAlign: "center", fontSize: 13, color: T.neutral400 }}>No leads yet</td></tr>
              ) : (data?.recentLeads ?? []).map(lead => (
                <tr key={lead.id} style={{ borderBottom: `1px solid ${T.neutral100}` }}
                  className="hover:bg-[#FAFAF9] cursor-pointer"
                  onClick={() => navigate(`/admin/leads/${lead.id}`)}>
                  <td style={{ padding: "10px 10px", fontSize: 13, fontWeight: 500, color: T.neutral900 }}>{lead.name}</td>
                  <td style={{ padding: "10px 10px" }}><StatusBadge status={lead.status ?? "new"} /></td>
                  <td style={{ padding: "10px 10px", fontSize: 12, color: T.neutral600 }}>{lead.source ?? "—"}</td>
                  <td style={{ padding: "10px 10px", fontSize: 12, color: T.neutral400 }}>{fmtRelative(lead.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Card title="Quick Actions">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
              {[
                { label: "New Lead", path: "/admin/crm/leads?new=1", icon: Plus },
                { label: "New Quote", path: "/admin/crm/quotes/new", icon: FileText },
                { label: "Applications", path: "/admin/applications", icon: CheckSquare },
                { label: "Contracts", path: "/admin/crm/contracts", icon: Briefcase },
              ].map(({ label, path, icon: Icon }) => (
                <button key={label} onClick={() => navigate(path)}
                  style={{ padding: "10px 8px", border: `1px solid ${T.border}`, borderRadius: 8, background: T.neutral100, fontSize: 12, color: T.neutral600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontWeight: 500 }}
                  className="hover:border-[#F5821F] hover:text-[#F5821F] hover:bg-[#FEF0E3] transition-colors"
                >
                  <Icon className="w-3.5 h-3.5" /> {label}
                </button>
              ))}
            </div>
            <button onClick={() => navigate("/admin/crm/leads?new=1")}
              style={{ width: "100%", padding: "9px 14px", background: T.orange, color: "#FFFFFF", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
            >
              <Plus className="w-3.5 h-3.5" /> New Lead
            </button>
          </Card>

          <Card title="System Status">
            {[
              { label: "Platform Health", value: "Online",   color: T.success },
              { label: "Database",        value: "Connected", color: T.success },
              { label: "Last Sync",       value: "Just now", color: T.neutral400 },
            ].map(r => (
              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${T.neutral100}` }}>
                <span style={{ fontSize: 12, color: T.neutral600 }}>{r.label}</span>
                <span style={{ fontSize: 12, color: r.color, fontWeight: 500 }}>{r.value}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

// Task priority styles
const PRIORITY_STYLES: Record<string, { bg: string; color: string; dot: string }> = {
  urgent: { bg: "#FEF2F2", color: "#DC2626", dot: "#DC2626" },
  high:   { bg: "#FEF0E3", color: "#C2410C", dot: "#F5821F" },
  normal: { bg: "#F4F3F1", color: "#57534E", dot: "#A8A29E" },
  low:    { bg: "#F4F3F1", color: "#A8A29E", dot: "#D4D0CB" },
};

const VISA_STAGE_COLORS = [T.orange, T.warning, "#6366F1", T.success, T.danger, T.neutral400];

function EmptyState({ icon: Icon, title, sub }: { icon: React.ElementType; title: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-2">
      <Icon className="w-8 h-8" style={{ color: T.neutral400 }} strokeWidth={1.5} />
      <p style={{ fontSize: 13, color: T.neutral400, fontWeight: 500 }}>{title}</p>
      {sub && <p style={{ fontSize: 11, color: T.neutral400 }}>{sub}</p>}
    </div>
  );
}

// ─── Operation Tab ─────────────────────────────────────────────────────────
function OperationTab({ data, loading }: { data: OperationData | undefined; loading: boolean }) {
  if (loading) return <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">{[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}</div>;

  const tasks      = data?.pendingTasks       ?? [];
  const interviews = data?.upcomingInterviews ?? [];
  const visaStages = data?.visaStages         ?? [];
  const activity   = data?.recentActivity     ?? [];

  const urgentTasks    = data?.tasksUrgentCount  ?? 0;
  const overdueTasks   = data?.tasksOverdueCount ?? 0;
  const urgentVisa     = data?.visaUrgentCount   ?? 0;

  const DEFAULT_VISA_STAGES = ["Applied", "Docs Submitted", "Under Review", "Approved", "Issued", "Rejected"];
  const displayVisaStages   = visaStages.length > 0
    ? visaStages
    : DEFAULT_VISA_STAGES.map(s => ({ stage: s, count: 0 }));
  const visaTotal = displayVisaStages.reduce((s, v) => s + v.count, 0) || 1;

  return (
    <div className="flex flex-col gap-5">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={CheckSquare} value={data?.tasksDueCount ?? 0} label="Tasks Due (7 days)"
          subLabel={urgentTasks > 0 ? `${urgentTasks} urgent` : `${overdueTasks} overdue`}
          trendType={urgentTasks > 0 ? "danger" : overdueTasks > 0 ? "warning" : "neutral"}
          trend={urgentTasks > 0 ? `${urgentTasks} urgent!` : overdueTasks > 0 ? `${overdueTasks} overdue` : "All on track"} />
        <KpiCard icon={Activity} value={overdueTasks} label="Overdue Tasks"
          accentLeft={overdueTasks > 0 ? T.danger : T.border}
          iconBg={overdueTasks > 0 ? T.dangerBg : T.neutral100}
          iconColor={overdueTasks > 0 ? T.danger : T.neutral400}
          trend={overdueTasks > 0 ? "Requires attention" : "None overdue"}
          trendType={overdueTasks > 0 ? "danger" : "neutral"} />
        <KpiCard icon={Calendar} value={data?.interviewsThisWeek ?? 0} label="Interviews This Week"
          trend={(data?.interviewsThisWeek ?? 0) === 0 ? "None scheduled" : `${data?.interviewsThisWeek} scheduled`}
          trendType="neutral" />
        <KpiCard icon={Shield} value={data?.visaPendingCount ?? 0} label="Visa Pending"
          subLabel={`${urgentVisa} expiring ≤ 30 days`}
          trendType={urgentVisa > 0 ? "warning" : "neutral"}
          iconBg={urgentVisa > 0 ? T.warningBg : T.orangeLight}
          iconColor={urgentVisa > 0 ? T.warning : T.orange}
          trend={urgentVisa > 0 ? `${urgentVisa} expiring soon` : "All clear"} />
      </div>

      {/* 3-column grid: tasks+interviews (2/3) | visa+activity (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 flex flex-col gap-4">

          {/* Pending Tasks */}
          <Card title="Pending Tasks" titleRight={
            tasks.length > 0
              ? <span style={{ fontSize: 12, color: T.neutral400 }}>{tasks.length} task{tasks.length !== 1 ? "s" : ""}</span>
              : undefined
          }>
            {tasks.length === 0
              ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 8, background: T.neutral100 }}>
                  <CheckSquare className="w-4 h-4 shrink-0" style={{ color: T.neutral400 }} strokeWidth={1.5} />
                  <span style={{ fontSize: 13, color: T.neutral400 }}>No pending tasks — all caught up</span>
                </div>
              )
              : tasks.map(task => {
                  const overdue   = task.dueDate && new Date(task.dueDate) < new Date();
                  const pri       = task.priority?.toLowerCase() ?? "normal";
                  const priStyle  = PRIORITY_STYLES[pri] ?? PRIORITY_STYLES.normal;
                  return (
                    <div key={task.id} style={{
                      display: "flex", alignItems: "flex-start", gap: 12,
                      padding: "10px 12px", marginBottom: 6,
                      borderRadius: 8, background: priStyle.bg,
                      borderLeft: `3px solid ${priStyle.dot}`,
                    }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: priStyle.dot, marginTop: 5, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: T.neutral900 }}>{task.title}</div>
                        <div style={{ display: "flex", gap: 8, marginTop: 3, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 11, color: overdue ? T.danger : T.neutral400 }}>
                            {task.dueDate ? `Due ${fmtDate(task.dueDate)}` : "No due date"}
                          </span>
                          {task.assignedTo && <span style={{ fontSize: 11, color: T.neutral400 }}>· {task.assignedTo}</span>}
                        </div>
                      </div>
                      <span style={{
                        fontSize: 10, padding: "2px 8px", borderRadius: 999,
                        background: "rgba(255,255,255,0.8)", color: priStyle.color,
                        fontWeight: 700, flexShrink: 0, border: `1px solid ${priStyle.dot}30`,
                        textTransform: "capitalize",
                      }}>{pri}</span>
                    </div>
                  );
                })}
          </Card>

          {/* Upcoming Interviews */}
          <Card title="Upcoming Interviews" titleRight={
            interviews.length > 0
              ? <span style={{ fontSize: 12, color: T.neutral400 }}>This week</span>
              : undefined
          }>
            {interviews.length === 0
              ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 8, background: T.neutral100 }}>
                  <Calendar className="w-4 h-4 shrink-0" style={{ color: T.neutral400 }} strokeWidth={1.5} />
                  <span style={{ fontSize: 13, color: T.neutral400 }}>No interviews scheduled this week</span>
                </div>
              )
              : interviews.map(iv => (
                  <div key={iv.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${T.neutral100}` }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: "50%",
                      background: T.orangeLight, display: "flex", alignItems: "center",
                      justifyContent: "center", fontSize: 12, fontWeight: 700,
                      color: T.orange, flexShrink: 0, letterSpacing: -0.5,
                    }}>{iv.initials}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: T.neutral900 }}>{iv.contactName}</div>
                      <div style={{ fontSize: 11, color: T.neutral400, marginTop: 1 }}>
                        {iv.interviewType ?? "Interview"}{iv.location ? ` · ${iv.location}` : ""}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: T.orange }}>
                        {new Date(iv.scheduledAt).toLocaleDateString("en-AU", { weekday: "short", month: "short", day: "numeric" })}
                      </div>
                      <div style={{ fontSize: 11, color: T.neutral400 }}>
                        {new Date(iv.scheduledAt).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                ))}
          </Card>
        </div>

        {/* Right: Visa Tracker + Activity */}
        <div className="flex flex-col gap-4">

          {/* Visa Stage Tracker */}
          <Card title="Visa Stage Tracker">
            <div className="flex flex-col gap-3 pt-1">
              {displayVisaStages.slice(0, 6).map((vs, i) => {
                const pct = Math.round((vs.count / visaTotal) * 100);
                return (
                  <div key={vs.stage}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: 12, color: T.neutral600, textTransform: "capitalize" }}>
                        {vs.stage.replace(/_/g, " ")}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, color: T.neutral400 }}>{pct}%</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: VISA_STAGE_COLORS[i] ?? T.neutral600 }}>
                          {vs.count}
                        </span>
                      </div>
                    </div>
                    <div style={{ height: 6, background: T.neutral100, borderRadius: 999, overflow: "hidden" }}>
                      <div style={{
                        width: `${pct}%`, height: "100%",
                        background: VISA_STAGE_COLORS[i] ?? T.neutral400,
                        borderRadius: 999, transition: "width 600ms ease",
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Recent Activity */}
          <Card title="Recent Activity">
            {activity.length === 0
              ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 8, background: T.neutral100 }}>
                  <Activity className="w-4 h-4 shrink-0" style={{ color: T.neutral400 }} strokeWidth={1.5} />
                  <span style={{ fontSize: 13, color: T.neutral400 }}>No recent activity recorded</span>
                </div>
              )
              : activity.map(act => (
                  <div key={act.id} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: `1px solid ${T.neutral100}` }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                      background: act.type === "lead" ? T.orangeLight : T.successBg,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: act.type === "lead" ? T.orange : T.success }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: T.neutral900, lineHeight: 1.4 }}>{act.description}</div>
                      <div style={{ fontSize: 11, color: T.neutral400, marginTop: 2 }}>{fmtRelative(act.createdAt)}</div>
                    </div>
                  </div>
                ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Sales Tab ─────────────────────────────────────────────────────────────
function SalesTab({
  salesData, salesLoading, funnelData,
}: {
  salesData: SalesData | undefined; salesLoading: boolean;
  funnelData: { data: FunnelRow[] } | undefined;
}) {
  if (salesLoading) return <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">{[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}</div>;

  const pipeline = salesData?.pipeline;
  const goals    = salesData?.goals;
  const quotes   = salesData?.recentQuotes   ?? [];
  const sources  = salesData?.leadSources    ?? [];
  const monthly  = salesData?.monthlyLeads   ?? [];

  const stageCards = [
    { label: "New",         value: pipeline?.new        ?? 0, color: T.neutral400, bar: "#A8A29E" },
    { label: "Open",        value: pipeline?.open       ?? 0, color: "#3B82F6",    bar: "#3B82F6" },
    { label: "In Progress", value: pipeline?.inProgress ?? 0, color: T.orange,     bar: T.orange  },
    { label: "Qualified",   value: pipeline?.qualified  ?? 0, color: T.warning,    bar: T.warning },
    { label: "Contracted",  value: pipeline?.contracted ?? 0, color: T.success,    bar: T.success },
  ];
  const pipelineTotal = stageCards.reduce((s, c) => s + c.value, 0);

  // Placeholder monthly data (last 6 months, 0 values) shown when no real data
  const monthlyDisplay = monthly.length > 0 ? monthly : Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
    return { month: d.toLocaleDateString("en-AU", { month: "short" }), year: d.getFullYear(), count: 0, contracts: 0 };
  });

  return (
    <div className="flex flex-col gap-5">
      {/* Pipeline header */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.neutral400, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
          Sales Pipeline — {pipelineTotal} total leads
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {stageCards.map((s, i) => {
            const pct = pipelineTotal > 0 ? Math.round((s.value / pipelineTotal) * 100) : 0;
            return (
              <div key={s.label} style={{
                background: T.card, border: `1px solid ${T.border}`, borderRadius: 12,
                padding: "16px 18px", position: "relative", overflow: "hidden",
              }} className="hover:shadow-md transition-shadow">
                {/* Stage progress bar at bottom */}
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: T.neutral100 }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: s.bar, transition: "width 600ms ease" }} />
                </div>
                <div style={{ fontSize: 30, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 12, color: T.neutral600, marginTop: 4 }}>{s.label}</div>
                <div style={{ fontSize: 11, color: T.neutral400, marginTop: 2 }}>{pct}% of pipeline</div>
              </div>
            );
          })}
        </div>

        {/* Visual funnel bar — always visible */}
        <div style={{ marginTop: 12, background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 16px" }}>
          <div style={{ height: 10, borderRadius: 999, overflow: "hidden", display: "flex", gap: 2 }}>
            {pipelineTotal > 0
              ? stageCards.filter(s => s.value > 0).map(s => (
                  <div key={s.label} style={{
                    flex: s.value, background: s.bar, minWidth: 4,
                    borderRadius: 999, transition: "flex 500ms ease",
                  }} title={`${s.label}: ${s.value}`} />
                ))
              : <div style={{ flex: 1, background: T.neutral100, borderRadius: 999 }} />
            }
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", marginTop: 8 }}>
            {stageCards.map(s => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: s.bar }} />
                <span style={{ fontSize: 11, color: T.neutral600 }}>{s.label} ({s.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3-col grid: chart+quotes (2/3) | sources+goals (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 flex flex-col gap-4">

          {/* Monthly Leads vs Contracts */}
          <Card title="Leads vs Contracts — Monthly">
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={monthlyDisplay} barSize={14} barGap={3} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke={T.neutral100} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} width={28} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${T.border}` }}
                  formatter={(v: number, name: string) => [v, name === "count" ? "Leads" : "Contracts"]} />
                <Legend formatter={(v: string) => v === "count" ? "Leads" : "Contracts"} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="count"     name="count"     fill={T.orange}  radius={[4, 4, 0, 0]} />
                <Bar dataKey="contracts" name="contracts" fill={T.success} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Recent Quotes */}
          <Card title="Recent Quotes" titleRight={
            <span style={{ fontSize: 12, color: T.neutral600 }}>
              Total: <strong style={{ color: T.orange }}>{fmtAUD(salesData?.totalQuoteValue ?? 0)}</strong>
            </span>
          }>
            {quotes.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 8, background: T.neutral100 }}>
                <FileText className="w-4 h-4 shrink-0" style={{ color: T.neutral400 }} strokeWidth={1.5} />
                <span style={{ fontSize: 13, color: T.neutral400 }}>No quotes created yet</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                      {["Student", "Value", "Status", "Date"].map(h => (
                        <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 11, fontWeight: 600, color: T.neutral400, textTransform: "uppercase", letterSpacing: 0.4 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {quotes.map(q => (
                      <tr key={q.id} style={{ borderBottom: `1px solid ${T.neutral100}` }} className="hover:bg-[#FAFAF9]">
                        <td style={{ padding: "10px 10px", fontSize: 13, color: T.neutral900, fontWeight: 500 }}>{q.contactName}</td>
                        <td style={{ padding: "10px 10px", fontSize: 13, color: T.orange, fontWeight: 600 }}>{fmtAUD(q.totalAmount)}</td>
                        <td style={{ padding: "10px 10px" }}><StatusBadge status={q.status?.toLowerCase() ?? "draft"} /></td>
                        <td style={{ padding: "10px 10px", fontSize: 11, color: T.neutral400 }}>{fmtRelative(q.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Right: Sources + Goals */}
        <div className="flex flex-col gap-4">

          {/* Lead Sources */}
          <Card title="Lead Sources">
            {sources.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 8, background: T.neutral100 }}>
                <Users className="w-4 h-4 shrink-0" style={{ color: T.neutral400 }} strokeWidth={1.5} />
                <span style={{ fontSize: 13, color: T.neutral400 }}>No lead sources recorded yet</span>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={sources} dataKey="count" nameKey="source" cx="50%" cy="50%" outerRadius={60} innerRadius={32}>
                      {sources.map((_, i) => (
                        <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: number, name: string) => [v, name]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-1 mt-2">
                  {sources.slice(0, 6).map((s, i) => (
                    <div key={s.source} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <div style={{ width: 9, height: 9, borderRadius: "50%", background: SOURCE_COLORS[i % SOURCE_COLORS.length], flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: T.neutral600 }}>{s.source}</span>
                      </div>
                      <span style={{ fontSize: 12, color: T.neutral900, fontWeight: 600 }}>{s.percentage}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>

          {/* Monthly Goals */}
          <Card title="Monthly Goals">
            {!goals ? (
              <EmptyState icon={Target} title="No goals set" sub="Set targets in settings" />
            ) : (
              <div className="flex flex-col gap-5 pt-1">
                {[
                  { label: "New Leads",  actual: goals.newLeadsActual,  target: goals.newLeadsTarget  },
                  { label: "Contracts",  actual: goals.contractsActual, target: goals.contractsTarget },
                ].map(g => {
                  const pct = g.target > 0 ? Math.min(100, Math.round((g.actual / g.target) * 100)) : 0;
                  const met = g.actual >= g.target;
                  return (
                    <div key={g.label}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ fontSize: 12, color: T.neutral600 }}>{g.label}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: met ? T.success : T.neutral900 }}>
                          {g.actual} <span style={{ fontWeight: 400, color: T.neutral400 }}>/ {g.target}</span>
                        </span>
                      </div>
                      <div style={{ height: 8, background: T.neutral100, borderRadius: 999, overflow: "hidden" }}>
                        <div style={{
                          width: `${pct}%`, height: "100%", borderRadius: 999,
                          background: met ? T.success : T.orange,
                          transition: "width 600ms ease",
                        }} />
                      </div>
                      <div style={{ fontSize: 11, color: T.neutral400, marginTop: 3 }}>{pct}% of target</div>
                    </div>
                  );
                })}

                {/* Conversion Rate */}
                <div style={{ padding: "14px 16px", borderRadius: 10, background: T.orangeLight, textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: T.neutral600, marginBottom: 4 }}>Lead → Contract Rate</div>
                  <div style={{ fontSize: 30, fontWeight: 800, color: T.orange }}>{goals.conversionRate}<span style={{ fontSize: 16 }}>%</span></div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Finance Tab ───────────────────────────────────────────────────────────
function FinanceTab({
  financeData, financeLoading,
  revData, agingData, staffData,
  isSA, selectedIds, toggleSelect, toggleAll, approveMutation,
}: {
  financeData: FinanceData | undefined; financeLoading: boolean;
  revData:   { data: RevenueRow[]  } | undefined;
  agingData: { data: AgingRow[]; total: number } | undefined;
  staffData: { data: StaffKpiRow[] } | undefined;
  isSA: boolean;
  selectedIds: Set<string>;
  toggleSelect: (id: string) => void;
  toggleAll: () => void;
  approveMutation: any;
}) {
  const agingRows: AgingRow[]    = agingData?.data ?? [];
  const staffRows: StaffKpiRow[] = staffData?.data ?? [];

  const revenueChart = useMemo(() => {
    const rows: RevenueRow[] = revData?.data ?? [];
    const months      = [...new Set(rows.map(r => r.month))].sort();
    const serviceTypes = [...new Set(rows.map(r => r.service_type))];
    return months.map(m => {
      const entry: Record<string, any> = { month: MONTH_FMT(m) };
      for (const st of serviceTypes) {
        const row = rows.find(r => r.month === m && r.service_type === st);
        entry[st] = row ? Number(row.total) : 0;
      }
      return entry;
    });
  }, [revData]);

  const revenueServiceTypes = useMemo(() => {
    const rows: RevenueRow[] = revData?.data ?? [];
    return [...new Set(rows.map(r => r.service_type))];
  }, [revData]);

  // Placeholder revenue data (last 6 months, 0) shown when no real data
  const displayRevChart = useMemo(() => {
    if (revenueChart.length > 0) return revenueChart;
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
      return { month: MONTH_FMT(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`), study_abroad: 0 };
    });
  }, [revenueChart]);
  const displayRevServiceTypes = revenueServiceTypes.length > 0 ? revenueServiceTypes : ["study_abroad"];

  if (financeLoading) return <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">{[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}</div>;

  const urgencyColor: Record<string, string> = { high: T.danger, medium: T.warning, low: T.neutral600 };

  const fd = financeData;
  const arOutstanding = fd?.arSummary.outstanding ?? 0;
  const apOverdue     = fd?.apSummary.overdue     ?? 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Top 4 KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={TrendingUp} value={fmtAUD(fd?.netRevenue ?? 0)}    label="Net Revenue (MTD)"  accentLeft={T.orange} />
        <KpiCard icon={DollarSign} value={fmtAUD(fd?.arCollected ?? 0)}   label="AR Collected"
          subLabel={`Scheduled: ${fmtAUD(fd?.arScheduled ?? 0)}`}
          accentLeft={T.success} iconBg={T.successBg} iconColor={T.success} />
        <KpiCard icon={CreditCard} value={fmtAUD(fd?.apPaid ?? 0)}         label="AP Paid"
          subLabel={apOverdue > 0 ? `${fmtAUD(apOverdue)} overdue` : "No overdue payments"}
          accentLeft={apOverdue > 0 ? T.danger : T.neutral400}
          iconBg={apOverdue > 0 ? T.dangerBg : T.neutral100}
          iconColor={apOverdue > 0 ? T.danger : T.neutral600} />
        <KpiCard icon={Award}      value={fmtAUD(fd?.totalIncentive ?? 0)} label="Staff Incentives"
          subLabel={`${fd?.staffIncentives?.length ?? 0} staff members`}
          accentLeft={T.warning} iconBg={T.warningBg} iconColor={T.warning} />
      </div>

      {/* AR / AP quick summary tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total AR",        value: fmtAUD(fd?.arSummary.total       ?? 0), sub: `${fd?.arSummary.invoiceCount ?? 0} invoices`,  color: T.neutral900, bg: T.card },
          { label: "AR Outstanding",  value: fmtAUD(arOutstanding),                  sub: `${fd?.arSummary.overdueCount ?? 0} overdue`,   color: arOutstanding > 0 ? T.warning : T.neutral900, bg: arOutstanding > 0 ? T.warningBg : T.card },
          { label: "Total AP",        value: fmtAUD(fd?.apSummary.total       ?? 0), sub: `${fd?.apSummary.payableCount ?? 0} payables`,  color: T.neutral900, bg: T.card },
          { label: "AP Overdue",      value: fmtAUD(apOverdue),                      sub: `${fd?.apSummary.urgentCount ?? 0} urgent`,     color: apOverdue > 0 ? T.danger : T.neutral900, bg: apOverdue > 0 ? T.dangerBg : T.card },
        ].map(s => (
          <div key={s.label} style={{ padding: "14px 16px", background: s.bg, border: `1px solid ${T.border}`, borderRadius: 10 }}>
            <div style={{ fontSize: 11, color: T.neutral400, marginBottom: 5 }}>{s.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: T.neutral400, marginTop: 3 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Main 3-col grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 flex flex-col gap-4">

          {/* Monthly Revenue Chart */}
          <Card title="Monthly Revenue by Service Type">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={displayRevChart} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.neutral100} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)}
                  tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${T.border}` }}
                  formatter={(v: number, name: string) => [fmtAUD(v), SERVICE_LABELS[name] ?? name]} />
                <Legend formatter={(v: string) => SERVICE_LABELS[v] ?? v} wrapperStyle={{ fontSize: 11 }} />
                {displayRevServiceTypes.map(st => (
                  <Bar key={st} dataKey={st} stackId="a" fill={SERVICE_COLORS[st] ?? T.neutral400}
                    radius={displayRevServiceTypes[displayRevServiceTypes.length - 1] === st ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* AR Aging */}
          <Card title="AR Aging">
            {agingRows.length === 0 ? (
              <EmptyState icon={DollarSign} title="No outstanding AR items" sub="All accounts receivable are current" />
            ) : (
              <div className="overflow-x-auto">
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                      {["Aging Bucket", "Invoices", "Amount", "% of Total"].map(h => (
                        <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 11, fontWeight: 600, color: T.neutral400, textTransform: "uppercase", letterSpacing: 0.4 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {agingRows.map(row => {
                      const critical = row.bucket === "90+";
                      const rowColor = critical ? T.danger : T.neutral900;
                      return (
                        <tr key={row.bucket} style={{ borderBottom: `1px solid ${T.neutral100}` }} className="hover:bg-[#FAFAF9]">
                          <td style={{ padding: "10px 10px", fontWeight: 600, color: rowColor }}>
                            {row.bucket === "current" ? "Current" : `${row.bucket} days`}
                          </td>
                          <td style={{ padding: "10px 10px", color: critical ? T.danger : T.neutral600 }}>{row.count}</td>
                          <td style={{ padding: "10px 10px", fontWeight: 600, color: rowColor }}>{fmtAUD(row.amount)}</td>
                          <td style={{ padding: "10px 10px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ flex: 1, height: 6, background: T.neutral100, borderRadius: 999, overflow: "hidden" }}>
                                <div style={{ width: `${row.pct}%`, height: "100%", background: critical ? T.danger : T.orange, borderRadius: 999 }} />
                              </div>
                              <span style={{ fontSize: 11, color: critical ? T.danger : T.neutral600, width: 32, textAlign: "right" }}>{row.pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Commission Breakdown */}
          <Card title="Commission Breakdown" titleRight={
            <span style={{ fontSize: 12, color: T.neutral600 }}>
              Expected: <strong style={{ color: T.orange }}>{fmtAUD(fd?.totalExpectedCommission ?? 0)}</strong>
            </span>
          }>
            {(fd?.commissions ?? []).length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 8, background: T.neutral100 }}>
                <BookOpen className="w-4 h-4 shrink-0" style={{ color: T.neutral400 }} strokeWidth={1.5} />
                <span style={{ fontSize: 13, color: T.neutral400 }}>No commission records this period</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                      {["School / Partner", "Student", "Expected", "Status"].map(h => (
                        <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 11, fontWeight: 600, color: T.neutral400, textTransform: "uppercase", letterSpacing: 0.4 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {fd!.commissions.map(c => (
                      <tr key={c.id} style={{ borderBottom: `1px solid ${T.neutral100}` }} className="hover:bg-[#FAFAF9]">
                        <td style={{ padding: "10px 10px", fontSize: 13, fontWeight: 500, color: T.neutral900 }}>{c.schoolName}</td>
                        <td style={{ padding: "10px 10px", fontSize: 12, color: T.neutral600 }}>{c.studentName}</td>
                        <td style={{ padding: "10px 10px", fontSize: 13, fontWeight: 600, color: T.orange }}>{fmtAUD(c.expectedAmount)}</td>
                        <td style={{ padding: "10px 10px" }}><StatusBadge status={c.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">

          {/* Staff Incentives */}
          <Card title="Staff Incentives">
            {(fd?.staffIncentives ?? []).length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 8, background: T.neutral100 }}>
                <Award className="w-4 h-4 shrink-0" style={{ color: T.neutral400 }} strokeWidth={1.5} />
                <span style={{ fontSize: 13, color: T.neutral400 }}>No incentives this period</span>
              </div>
            ) : fd!.staffIncentives.map(si => (
              <div key={si.staffId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${T.neutral100}` }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: T.neutral900 }}>{si.staffName}</div>
                  <div style={{ fontSize: 11, color: T.neutral400, marginTop: 1 }}>{si.period}</div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.orange }}>{fmtAUD(si.amount)}</div>
              </div>
            ))}
          </Card>

          {/* Upcoming Payments */}
          <Card title="Upcoming Payments">
            {(fd?.upcomingPayments ?? []).length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 8, background: T.neutral100 }}>
                <CreditCard className="w-4 h-4 shrink-0" style={{ color: T.neutral400 }} strokeWidth={1.5} />
                <span style={{ fontSize: 13, color: T.neutral400 }}>No upcoming payments scheduled</span>
              </div>
            ) : fd!.upcomingPayments.map(p => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "9px 0", borderBottom: `1px solid ${T.neutral100}`, gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: T.neutral900, lineHeight: 1.4 }}>{p.description}</div>
                  <div style={{ fontSize: 11, color: T.neutral400, marginTop: 2 }}>{fmtAUD(p.amount)}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: urgencyColor[p.urgency] ?? T.neutral600 }}>
                    {fmtDate(p.dueDate)}
                  </div>
                  <span style={{
                    fontSize: 10, padding: "1px 7px", borderRadius: 999, marginTop: 3, display: "inline-block",
                    background: p.urgency === "high" ? T.dangerBg : p.urgency === "medium" ? T.warningBg : T.neutral100,
                    color: urgencyColor[p.urgency] ?? T.neutral600, fontWeight: 600, textTransform: "capitalize",
                  }}>{p.urgency}</span>
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>

      {/* Staff KPI Table */}
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12 }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: T.neutral900 }}>Staff KPI — Current Month</h3>
            {selectedIds.size > 0 && <p style={{ fontSize: 11, color: T.neutral600, marginTop: 2 }}>{selectedIds.size} selected</p>}
          </div>
          {isSA && selectedIds.size > 0 && (
            <Button onClick={() => approveMutation.mutate([...selectedIds])} disabled={approveMutation.isPending}
              className="text-white text-sm h-8 px-4" style={{ background: T.orange }}>
              {approveMutation.isPending ? "Approving…" : `Approve (${selectedIds.size})`}
            </Button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                {isSA && <th style={{ padding: "10px 14px", width: 32 }}>
                  <input type="checkbox" className="rounded"
                    checked={staffRows.filter(r => r.status === "draft").length > 0 && selectedIds.size === staffRows.filter(r => r.status === "draft").length}
                    onChange={toggleAll} />
                </th>}
                {["Staff", "Leads", "Converted", "Conv. Rate", "Revenue", "Incentive", "Tier", "Status"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: T.neutral600, textTransform: "uppercase", letterSpacing: 0.4 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staffRows.length === 0 ? (
                <tr>
                  <td colSpan={isSA ? 9 : 8} style={{ padding: "24px 14px", textAlign: "center", fontSize: 13, color: T.neutral400 }}>
                    No staff KPI data for this month
                  </td>
                </tr>
              ) : staffRows.map(row => {
                const tier    = (row.bonus_tier ?? "standard").toLowerCase();
                const tierCls = TIER_STYLES[tier] ?? TIER_STYLES.standard;
                return (
                  <tr key={row.id} style={{ borderBottom: `1px solid ${T.neutral100}` }} className="hover:bg-[#FAFAF9]">
                    {isSA && <td style={{ padding: "10px 14px" }}>
                      {row.status === "draft" && (
                        <input type="checkbox" className="rounded" checked={selectedIds.has(row.id)} onChange={() => toggleSelect(row.id)} />
                      )}
                    </td>}
                    <td style={{ padding: "10px 14px", fontWeight: 500, color: T.neutral900 }}>{row.staff_name}</td>
                    <td style={{ padding: "10px 14px", color: T.neutral600 }}>{row.lead_count}</td>
                    <td style={{ padding: "10px 14px", color: T.neutral600 }}>{row.conversion_count}</td>
                    <td style={{ padding: "10px 14px", color: T.neutral600 }}>
                      {row.conversion_rate != null ? `${(Number(row.conversion_rate) * 100).toFixed(1)}%` : "—"}
                    </td>
                    <td style={{ padding: "10px 14px", fontWeight: 500, color: T.neutral900 }}>{fmtAUD(Number(row.attributed_revenue))}</td>
                    <td style={{ padding: "10px 14px", fontWeight: 600, color: T.orange }}>{fmtAUD(Number(row.incentive_amount))}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${tierCls}`}>{tier}</span>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                        row.status === "approved" ? "bg-[#DCFCE7] text-[#16A34A]" :
                        row.status === "paid"     ? "bg-[#EFF6FF] text-[#3B82F6]" :
                        "bg-[#F4F3F1] text-[#57534E]"
                      }`}>{row.status}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DashboardCrmPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const search = useSearch();
  const isSA = user?.role === "super_admin";
  const isSAorAD = isSA || user?.role === "admin";
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ── Tab state synced to URL (wouter v3: useSearch() returns query string without "?") ──
  const searchParams = new URLSearchParams(search);
  const activeTab = (searchParams.get("tab") as TabId) ?? "overview";

  function setTab(tab: TabId) {
    navigate(`/admin/dashboard/crm?tab=${tab}`);
  }

  // ── New V2 API queries ──
  const { data: overviewData, isLoading: overviewLoading } = useQuery<OverviewData>({
    queryKey: ["dashboard-v2-overview"],
    queryFn: () => axios.get(`${BASE}/api/dashboard/v2/overview`).then(r => r.data),
    enabled: isSAorAD,
    staleTime: 60_000,
  });

  const { data: operationData, isLoading: operationLoading } = useQuery<OperationData>({
    queryKey: ["dashboard-v2-operation"],
    queryFn: () => axios.get(`${BASE}/api/dashboard/v2/operation`).then(r => r.data),
    enabled: isSAorAD && activeTab === "operation",
    staleTime: 60_000,
  });

  const { data: salesData, isLoading: salesLoading } = useQuery<SalesData>({
    queryKey: ["dashboard-v2-sales"],
    queryFn: () => axios.get(`${BASE}/api/dashboard/v2/sales`).then(r => r.data),
    enabled: isSAorAD && activeTab === "sales",
    staleTime: 60_000,
  });

  const { data: financeData, isLoading: financeLoading } = useQuery<FinanceData>({
    queryKey: ["dashboard-v2-finance"],
    queryFn: () => axios.get(`${BASE}/api/dashboard/v2/finance`).then(r => r.data),
    enabled: isSAorAD && activeTab === "finance",
    staleTime: 60_000,
  });

  // ── Legacy CRM queries (used in Finance/Sales tabs) ──
  const { data: revData }    = useQuery<{ data: RevenueRow[] }>({
    queryKey: ["crm-revenue"],
    queryFn:  () => axios.get(`${BASE}/api/dashboard/crm/revenue`).then(r => r.data),
    enabled: isSAorAD && activeTab === "finance",
  });
  const { data: funnelData } = useQuery<{ data: FunnelRow[] }>({
    queryKey: ["crm-funnel"],
    queryFn:  () => axios.get(`${BASE}/api/dashboard/crm/funnel`).then(r => r.data),
    enabled: isSAorAD && activeTab === "sales",
  });
  const { data: agingData }  = useQuery<{ data: AgingRow[]; total: number }>({
    queryKey: ["crm-ar-aging"],
    queryFn:  () => axios.get(`${BASE}/api/dashboard/crm/ar-aging`).then(r => r.data),
    enabled: isSAorAD && activeTab === "finance",
  });
  const { data: staffData }  = useQuery<{ data: StaffKpiRow[] }>({
    queryKey: ["crm-staff-kpi"],
    queryFn:  () => axios.get(`${BASE}/api/dashboard/crm/staff-kpi`).then(r => r.data),
    enabled: isSAorAD && activeTab === "finance",
  });

  const approveMutation = useMutation({
    mutationFn: (ids: string[]) =>
      axios.patch(`${BASE}/api/dashboard/crm/staff-kpi/approve`, { ids }).then(r => r.data),
    onSuccess: (data: any) => {
      toast({ title: `${data.approved} incentive(s) approved` });
      setSelectedIds(new Set());
      qc.invalidateQueries({ queryKey: ["crm-staff-kpi"] });
    },
    onError: () => toast({ title: "Approval failed", variant: "destructive" }),
  });

  const staffRows: StaffKpiRow[] = staffData?.data ?? [];
  function toggleSelect(id: string) {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAll() {
    const pending = staffRows.filter(r => r.status === "draft").map(r => r.id);
    setSelectedIds(selectedIds.size === pending.length ? new Set() : new Set(pending));
  }

  const currentMonthLabel = new Date().toLocaleDateString("en-AU", { month: "short", year: "numeric" });

  return (
    <div style={{ padding: "24px", minHeight: "100vh", background: "#FAFAF9" }}>
      {/* Page Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: T.neutral900 }}>
            Good {getTimeOfDay()}, {user?.fullName?.split(" ")[0] ?? "there"} 👋
          </h1>
          <p style={{ fontSize: 12, color: T.neutral600, marginTop: 2 }}>
            Full platform overview — Edubee Admin
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => navigate("/admin/crm/leads?new=1")}
            style={{ fontSize: 12, background: T.orange, borderRadius: 7, padding: "5px 14px", color: "#FFFFFF", fontWeight: 600, border: "none", cursor: "pointer" }}>
            + New Lead
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          display: "inline-flex", gap: 3,
          background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 4,
        }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              style={{
                padding: "7px 18px", borderRadius: 7, fontSize: 13, border: "none", cursor: "pointer",
                fontWeight: activeTab === tab.id ? 600 : 400,
                background: activeTab === tab.id ? T.orangeLight : "transparent",
                color: activeTab === tab.id ? T.orange : T.neutral600,
                transition: "all 150ms ease",
              }}
              onMouseEnter={e => { if (activeTab !== tab.id) { (e.target as HTMLElement).style.background = T.neutral100; (e.target as HTMLElement).style.color = T.neutral900; }}}
              onMouseLeave={e => { if (activeTab !== tab.id) { (e.target as HTMLElement).style.background = "transparent"; (e.target as HTMLElement).style.color = T.neutral600; }}}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "overview"  && <OverviewTab  data={overviewData}  loading={overviewLoading}  />}
      {activeTab === "operation" && <OperationTab data={operationData} loading={operationLoading} />}
      {activeTab === "sales"     && <SalesTab     salesData={salesData} salesLoading={salesLoading} funnelData={funnelData} />}
      {activeTab === "finance"   && (
        <FinanceTab
          financeData={financeData} financeLoading={financeLoading}
          revData={revData} agingData={agingData} staffData={staffData}
          isSA={isSA}
          selectedIds={selectedIds} toggleSelect={toggleSelect} toggleAll={toggleAll}
          approveMutation={approveMutation}
        />
      )}
    </div>
  );
}
