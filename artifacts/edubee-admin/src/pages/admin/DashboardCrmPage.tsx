import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
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
  kpi: {
    periodStart: string; periodEnd: string;
    netRevenue: number; arCollected: number; arScheduled: number;
    apPaid: number; totalIncentive: number; incentiveStaffCount: number;
  };
  recentLeads: Array<{ id: string; name: string; status: string; source: string | null; createdAt: string }>;
}
interface OperationData {
  tasksDueCount: number; tasksOverdueCount: number;
  interviewsThisWeek: number; visaPendingCount: number; visaUrgentCount: number;
  enrollmentTotal: number; enrollmentAvailable: number;
  visaStages: Array<{ stage: string; count: number }>;
  pendingTasks: Array<{ id: string; title: string; dueDate: string | null; assignedTo: string | null; priority: string | null; status: string }>;
  upcomingInterviews: Array<{ id: string; contactName: string; initials: string; schoolName: string | null; interviewType: string | null; scheduledAt: string }>;
  recentActivity: Array<{ id: string; type: string; description: string; createdAt: string }>;
}
interface SalesData {
  pipeline: { new: number; inProgress: number; qualified: number; contracted: number; total: number };
  monthlyLeads: Array<{ month: string; year: number; count: number }>;
  leadSources: Array<{ source: string; count: number; percentage: number }>;
  recentQuotes: Array<{ id: string; quoteNumber: string; contactName: string; schoolName: string | null; totalAmount: number; status: string; createdAt: string }>;
  goals: { newLeadsTarget: number; newLeadsActual: number; applicationsTarget: number; applicationsActual: number; contractsTarget: number; contractsActual: number };
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

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab({ data, loading }: { data: OverviewData | undefined; loading: boolean }) {
  const [, navigate] = useLocation();
  if (loading) return <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">{[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}</div>;

  const kpi = data?.kpi;
  const monthLabel = kpi ? new Date(kpi.periodStart).toLocaleDateString("en-AU", { month: "long", year: "numeric" }) : "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Top KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Users}     value={data?.totalLeads ?? 0}     label="Total Leads"     subLabel={`${data?.activeLeads ?? 0} active`} />
        <KpiCard icon={FileText}  value={data?.totalContracts ?? 0}  label="Total Contracts"  subLabel={`${data?.activeContracts ?? 0} active`} />
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
                { label: "New Lead", path: "/admin/leads/new", icon: Plus },
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
            <button onClick={() => navigate("/admin/leads/new")}
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

// ─── Operation Tab ────────────────────────────────────────────────────────────
function OperationTab({ data, loading }: { data: OperationData | undefined; loading: boolean }) {
  if (loading) return <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">{[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}</div>;

  const urgencyColor = { high: T.danger, medium: T.warning, low: T.neutral600 };
  const visaStageColors = [T.orange, T.orange, T.warning, T.success, T.danger];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={CheckSquare} value={data?.tasksDueCount ?? 0}      label="Tasks Due (7d)"
          subLabel={`${data?.tasksOverdueCount ?? 0} overdue`}
          trendType={(data?.tasksOverdueCount ?? 0) > 0 ? "danger" : "neutral"}
          trend={(data?.tasksOverdueCount ?? 0) > 0 ? `${data?.tasksOverdueCount} overdue` : "On track"} />
        <KpiCard icon={Calendar}    value={data?.interviewsThisWeek ?? 0}  label="Interviews (This Week)" />
        <KpiCard icon={Shield}      value={data?.visaPendingCount ?? 0}     label="Visa Pending"
          subLabel={`${data?.visaUrgentCount ?? 0} expiring soon`}
          trendType={(data?.visaUrgentCount ?? 0) > 0 ? "warning" : "neutral"} />
        <KpiCard icon={Target}      value={0}                               label="Enrollment Spots" subLabel="No data yet" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card title="Pending Tasks">
            {(data?.pendingTasks ?? []).length === 0 ? (
              <div style={{ padding: "24px 0", textAlign: "center", fontSize: 13, color: T.neutral400 }}>No pending tasks</div>
            ) : (data?.pendingTasks ?? []).map(task => {
              const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
              return (
                <div key={task.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0", borderBottom: `1px solid ${T.neutral100}` }}>
                  <CheckSquare className="w-4 h-4 mt-0.5 shrink-0" style={{ color: task.status === "done" ? T.orange : T.neutral400 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: T.neutral900 }}>{task.title}</div>
                    <div style={{ fontSize: 11, color: isOverdue ? T.danger : T.neutral400, marginTop: 2 }}>
                      {task.dueDate ? `Due ${fmtDate(task.dueDate)}` : "No due date"}
                      {task.assignedTo ? ` · ${task.assignedTo}` : ""}
                    </div>
                  </div>
                  {task.priority === "urgent" && (
                    <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 999, background: T.warningBg, color: T.warning, fontWeight: 600 }}>Urgent</span>
                  )}
                </div>
              );
            })}
          </Card>

          <Card title="Upcoming Interviews">
            {(data?.upcomingInterviews ?? []).length === 0 ? (
              <div style={{ padding: "24px 0", textAlign: "center", fontSize: 13, color: T.neutral400 }}>No upcoming interviews</div>
            ) : (data?.upcomingInterviews ?? []).map(iv => (
              <div key={iv.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: `1px solid ${T.neutral100}` }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: T.orangeLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: T.orange, flexShrink: 0 }}>
                  {iv.initials}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: T.neutral900 }}>{iv.contactName}</div>
                  <div style={{ fontSize: 11, color: T.neutral400 }}>{iv.interviewType ?? "Interview"}</div>
                </div>
                <div style={{ fontSize: 12, color: T.orange, fontWeight: 500, textAlign: "right" }}>
                  {new Date(iv.scheduledAt).toLocaleDateString("en-AU", { month: "short", day: "numeric" })}
                </div>
              </div>
            ))}
          </Card>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Card title="Visa Status Tracker">
            {(data?.visaStages ?? []).length === 0 ? (
              <div style={{ padding: "16px 0", textAlign: "center", fontSize: 13, color: T.neutral400 }}>No visa data</div>
            ) : (data?.visaStages ?? []).slice(0, 6).map((vs, i) => {
              const total = (data?.visaPendingCount ?? 0) + 1;
              return (
                <div key={vs.stage} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 12, color: T.neutral600, textTransform: "capitalize" }}>{vs.stage.replace(/_/g, " ")}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: visaStageColors[i] ?? T.neutral600 }}>{vs.count}</span>
                  </div>
                  <ProgressBar value={(vs.count / Math.max(total, 1)) * 100} color={visaStageColors[i] ?? T.neutral400} />
                </div>
              );
            })}
          </Card>

          <Card title="Recent Activity">
            {(data?.recentActivity ?? []).length === 0 ? (
              <div style={{ padding: "16px 0", textAlign: "center", fontSize: 13, color: T.neutral400 }}>No activity</div>
            ) : (data?.recentActivity ?? []).map(act => (
              <div key={act.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 0", borderBottom: `1px solid ${T.neutral100}` }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: act.type === "lead" ? T.orange : T.success, marginTop: 4, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: T.neutral900 }}>{act.description}</div>
                  <div style={{ fontSize: 11, color: T.neutral400 }}>{fmtRelative(act.createdAt)}</div>
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Sales Tab ────────────────────────────────────────────────────────────────
function SalesTab({
  salesData, salesLoading,
  funnelData,
}: {
  salesData: SalesData | undefined; salesLoading: boolean;
  funnelData: { data: FunnelRow[] } | undefined;
}) {
  if (salesLoading) return <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">{[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}</div>;

  const pipeline = salesData?.pipeline;
  const funnelRows: FunnelRow[] = funnelData?.data ?? [];

  const stageCards = [
    { label: "New",         value: pipeline?.new        ?? 0, color: T.neutral400,  accent: undefined },
    { label: "In Progress", value: pipeline?.inProgress  ?? 0, color: T.orange,     accent: T.orange  },
    { label: "Qualified",   value: pipeline?.qualified   ?? 0, color: T.warning,    accent: undefined },
    { label: "Contracted",  value: pipeline?.contracted  ?? 0, color: T.success,    accent: T.success },
  ];

  const pipelineTotal = stageCards.reduce((s, c) => s + c.value, 0);
  const goals = salesData?.goals;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Pipeline Stage Cards */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.neutral400, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Sales Pipeline</div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stageCards.map(s => (
            <div key={s.label} style={{
              background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 18px",
              borderTop: s.accent ? `3px solid ${s.accent}` : undefined,
            }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 13, color: T.neutral600, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Funnel bar */}
      {pipelineTotal > 0 && (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 18px" }}>
          <div style={{ fontSize: 12, color: T.neutral600, marginBottom: 8, fontWeight: 500 }}>Pipeline Funnel</div>
          <div style={{ height: 12, borderRadius: 999, overflow: "hidden", display: "flex" }}>
            {stageCards.map(s => (
              <div key={s.label} style={{
                flex: s.value, background: s.color, minWidth: s.value > 0 ? 4 : 0,
                transition: "flex 500ms ease",
              }} title={`${s.label}: ${s.value}`} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
            {stageCards.map(s => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.color }} />
                <span style={{ fontSize: 11, color: T.neutral600 }}>{s.label} ({s.value})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Lead Acquisition Chart */}
          <Card title="Lead Acquisition — Monthly">
            {(salesData?.monthlyLeads ?? []).length === 0 ? (
              <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: T.neutral400 }}>No lead data</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={salesData!.monthlyLeads} barSize={24}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.neutral100} vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} width={30} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${T.border}` }} />
                  <Bar dataKey="count" fill={T.orange} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Recent Quotes */}
          <Card title="Recent Quotes" titleRight={
            <span style={{ fontSize: 12, color: T.neutral600 }}>
              Total: <strong style={{ color: T.orange }}>{fmtAUD(salesData?.totalQuoteValue ?? 0)}</strong>
            </span>
          }>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                  {["Student", "School", "Value", "Status"].map(h => (
                    <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 11, fontWeight: 600, color: T.neutral400, textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(salesData?.recentQuotes ?? []).length === 0 ? (
                  <tr><td colSpan={4} style={{ padding: "24px 10px", textAlign: "center", fontSize: 13, color: T.neutral400 }}>No quotes yet</td></tr>
                ) : (salesData?.recentQuotes ?? []).map(q => (
                  <tr key={q.id} style={{ borderBottom: `1px solid ${T.neutral100}` }}>
                    <td style={{ padding: "10px 10px", fontSize: 13, color: T.neutral900, fontWeight: 500 }}>{q.contactName}</td>
                    <td style={{ padding: "10px 10px", fontSize: 12, color: T.neutral600 }}>{q.schoolName ?? "—"}</td>
                    <td style={{ padding: "10px 10px", fontSize: 13, color: T.orange, fontWeight: 600 }}>{fmtAUD(q.totalAmount)}</td>
                    <td style={{ padding: "10px 10px" }}><StatusBadge status={q.status?.toLowerCase() ?? "draft"} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Lead Sources donut */}
          <Card title="Lead Sources">
            {(salesData?.leadSources ?? []).length === 0 ? (
              <div style={{ padding: "40px 0", textAlign: "center", fontSize: 13, color: T.neutral400 }}>No source data</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={salesData!.leadSources} dataKey="count" nameKey="source" cx="50%" cy="50%" outerRadius={65} innerRadius={35}>
                      {salesData!.leadSources.map((_, i) => (
                        <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: number, name: string) => [v, name]} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ marginTop: 8 }}>
                  {salesData!.leadSources.slice(0, 5).map((s, i) => (
                    <div key={s.source} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: SOURCE_COLORS[i % SOURCE_COLORS.length] }} />
                        <span style={{ fontSize: 12, color: T.neutral600 }}>{s.source}</span>
                      </div>
                      <span style={{ fontSize: 12, color: T.neutral900, fontWeight: 500 }}>{s.percentage}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>

          {/* Monthly Goals */}
          <Card title="Monthly Goals">
            {goals && [
              { label: "New Leads",    actual: goals.newLeadsActual,    target: goals.newLeadsTarget },
              { label: "Applications", actual: goals.applicationsActual, target: goals.applicationsTarget },
              { label: "Contracts",   actual: goals.contractsActual,   target: goals.contractsTarget },
            ].map(g => (
              <div key={g.label} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 12, color: T.neutral600 }}>{g.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: T.neutral900 }}>{g.actual} / {g.target}</span>
                </div>
                <ProgressBar
                  value={g.target > 0 ? (g.actual / g.target) * 100 : 0}
                  color={g.actual >= g.target ? T.success : T.orange}
                />
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Finance Tab ──────────────────────────────────────────────────────────────
function FinanceTab({
  financeData, financeLoading,
  revData, agingData, staffData,
  isSA, selectedIds, toggleSelect, toggleAll, approveMutation,
}: {
  financeData: FinanceData | undefined; financeLoading: boolean;
  revData: { data: RevenueRow[] } | undefined;
  agingData: { data: AgingRow[]; total: number } | undefined;
  staffData: { data: StaffKpiRow[] } | undefined;
  isSA: boolean;
  selectedIds: Set<string>;
  toggleSelect: (id: string) => void;
  toggleAll: () => void;
  approveMutation: any;
}) {
  const agingRows: AgingRow[] = agingData?.data ?? [];
  const staffRows: StaffKpiRow[] = staffData?.data ?? [];

  const revenueChart = useMemo(() => {
    const rows: RevenueRow[] = revData?.data ?? [];
    const months = [...new Set(rows.map(r => r.month))].sort();
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

  if (financeLoading) return <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">{[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}</div>;

  const urgencyColor = { high: T.orange, medium: T.warning, low: T.neutral600 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Top Finance KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={TrendingUp} value={fmtAUD(financeData?.netRevenue ?? 0)}  label="Net Revenue (MTD)"  accentLeft={T.orange} />
        <KpiCard icon={DollarSign} value={fmtAUD(financeData?.arCollected ?? 0)} label="AR Collected"        accentLeft={T.success} iconBg={T.successBg} iconColor={T.success} />
        <KpiCard icon={CreditCard} value={fmtAUD(financeData?.apPaid ?? 0)}       label="AP Paid"             accentLeft={T.neutral400} iconBg={T.neutral100} iconColor={T.neutral600} />
        <KpiCard icon={Award}      value={fmtAUD(financeData?.totalIncentive ?? 0)} label="Total Incentive"   accentLeft={T.warning}  iconBg={T.warningBg}  iconColor={T.warning} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Monthly Revenue Chart (legacy CRM data) */}
          <Card title="Monthly Revenue by Service Type (last 6 months)">
            {revenueChart.length === 0 ? (
              <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: T.neutral400 }}>No revenue data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={revenueChart} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.neutral100} vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${T.border}` }}
                    formatter={(v: number, name: string) => [fmtAUD(v), SERVICE_LABELS[name] ?? name]} />
                  {revenueServiceTypes.map(st => (
                    <Bar key={st} dataKey={st} stackId="a" fill={SERVICE_COLORS[st] ?? T.neutral400}
                      radius={revenueServiceTypes[revenueServiceTypes.length - 1] === st ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Commission Breakdown */}
          <Card title="Commission Breakdown" titleRight={
            <span style={{ fontSize: 12, color: T.neutral600 }}>
              Total: <strong style={{ color: T.orange }}>{fmtAUD(financeData?.totalExpectedCommission ?? 0)}</strong>
            </span>
          }>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                  {["School/Partner", "Student", "Expected", "Status"].map(h => (
                    <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 11, fontWeight: 600, color: T.neutral400, textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(financeData?.commissions ?? []).length === 0 ? (
                  <tr><td colSpan={4} style={{ padding: "24px 10px", textAlign: "center", fontSize: 13, color: T.neutral400 }}>No commission data</td></tr>
                ) : (financeData?.commissions ?? []).map(c => (
                  <tr key={c.id} style={{ borderBottom: `1px solid ${T.neutral100}` }}>
                    <td style={{ padding: "10px 10px", fontSize: 12, color: T.neutral900 }}>{c.schoolName}</td>
                    <td style={{ padding: "10px 10px", fontSize: 12, color: T.neutral600 }}>{c.studentName}</td>
                    <td style={{ padding: "10px 10px", fontSize: 13, color: T.orange, fontWeight: 600 }}>{fmtAUD(c.expectedAmount)}</td>
                    <td style={{ padding: "10px 10px" }}><StatusBadge status={c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* AR Aging (legacy) */}
          <Card title="AR Aging">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                  {["Aging", "Count", "Amount (AUD)", "% of Total"].map(h => (
                    <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 11, fontWeight: 600, color: T.neutral400, textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {agingRows.length === 0 ? (
                  <tr><td colSpan={4} style={{ padding: "24px 10px", textAlign: "center", fontSize: 13, color: T.neutral400 }}>No outstanding AR items</td></tr>
                ) : agingRows.map(row => {
                  const is90plus = row.bucket === "90+";
                  return (
                    <tr key={row.bucket} style={{ borderBottom: `1px solid ${T.neutral100}` }} className="hover:bg-[#FAFAF9]">
                      <td style={{ padding: "10px 10px", fontWeight: is90plus ? 700 : 500, color: is90plus ? T.danger : T.neutral900 }}>
                        {row.bucket === "current" ? "Current" : `${row.bucket} days`}
                      </td>
                      <td style={{ padding: "10px 10px", color: is90plus ? T.danger : T.neutral600 }}>{row.count}</td>
                      <td style={{ padding: "10px 10px", fontWeight: 500, color: is90plus ? T.danger : T.neutral900 }}>{fmtAUD(row.amount)}</td>
                      <td style={{ padding: "10px 10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 80, height: 6, borderRadius: 999, overflow: "hidden", background: T.neutral100 }}>
                            <div style={{ width: `${row.pct}%`, height: "100%", background: is90plus ? T.danger : T.orange, borderRadius: 999 }} />
                          </div>
                          <span style={{ fontSize: 11, color: is90plus ? T.danger : T.neutral600 }}>{row.pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* AR / AP Summary */}
          <Card title="AR / AP Summary">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { label: "Total AR",     value: fmtAUD(financeData?.arSummary.total ?? 0),        color: T.neutral900 },
                { label: "Outstanding",  value: fmtAUD(financeData?.arSummary.outstanding ?? 0),   color: T.warning   },
                { label: "Total AP",     value: fmtAUD(financeData?.apSummary.total ?? 0),         color: T.neutral900 },
                { label: "Overdue AP",   value: fmtAUD(financeData?.apSummary.overdue ?? 0),       color: T.danger    },
              ].map(s => (
                <div key={s.label} style={{ padding: "12px", background: T.neutral100, borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: T.neutral400, marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Staff Incentives */}
          <Card title="Staff Incentives">
            {(financeData?.staffIncentives ?? []).length === 0 ? (
              <div style={{ padding: "24px 0", textAlign: "center", border: `2px dashed ${T.border}`, borderRadius: 8 }}>
                <Award className="w-8 h-8 mx-auto mb-2" style={{ color: T.neutral400 }} />
                <div style={{ fontSize: 12, color: T.neutral400 }}>No incentives calculated yet</div>
                <div style={{ fontSize: 11, color: T.neutral400, marginTop: 4 }}>Generated once contracts are active</div>
              </div>
            ) : (financeData?.staffIncentives ?? []).map(si => (
              <div key={si.staffId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${T.neutral100}` }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: T.neutral900 }}>{si.staffName}</div>
                  <div style={{ fontSize: 11, color: T.neutral400 }}>{si.period}</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.orange }}>{fmtAUD(si.amount)}</div>
              </div>
            ))}
          </Card>

          {/* Upcoming Payments */}
          <Card title="Upcoming Payments">
            {(financeData?.upcomingPayments ?? []).length === 0 ? (
              <div style={{ padding: "16px 0", textAlign: "center", fontSize: 13, color: T.neutral400 }}>No upcoming payments</div>
            ) : (financeData?.upcomingPayments ?? []).map(p => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "8px 0", borderBottom: `1px solid ${T.neutral100}` }}>
                <div style={{ fontSize: 12, color: T.neutral900, flex: 1, marginRight: 8 }}>{p.description}</div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 12, color: urgencyColor[p.urgency], fontWeight: 600 }}>{fmtDate(p.dueDate)}</div>
                  <div style={{ fontSize: 11, color: T.neutral600 }}>{fmtAUD(p.amount)}</div>
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>

      {/* Staff KPI Table (SA/Admin approve) */}
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
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: T.neutral600, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staffRows.length === 0 ? (
                <tr><td colSpan={isSA ? 9 : 8} style={{ padding: "24px 14px", textAlign: "center", fontSize: 13, color: T.neutral400 }}>No staff KPI data for this month</td></tr>
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
                    <td style={{ padding: "10px 14px", color: T.neutral600 }}>{row.conversion_rate != null ? `${(Number(row.conversion_rate) * 100).toFixed(1)}%` : "—"}</td>
                    <td style={{ padding: "10px 14px", fontWeight: 500, color: T.neutral900 }}>{fmtAUD(Number(row.attributed_revenue))}</td>
                    <td style={{ padding: "10px 14px", fontWeight: 500, color: T.orange }}>{fmtAUD(Number(row.incentive_amount))}</td>
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
  const [location, navigate] = useLocation();
  const isSA = user?.role === "super_admin";
  const isSAorAD = isSA || user?.role === "admin";
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ── Tab state synced to URL ──
  const searchParams = new URLSearchParams(location.split("?")[1] ?? "");
  const activeTab = (searchParams.get("tab") as TabId) ?? "overview";

  function setTab(tab: TabId) {
    const base = location.split("?")[0];
    navigate(`${base}?tab=${tab}`);
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
          <span style={{ fontSize: 12, background: T.card, border: `1px solid ${T.border}`, borderRadius: 7, padding: "5px 12px", color: T.neutral600 }}>
            {currentMonthLabel}
          </span>
          <button onClick={() => navigate("/admin/leads/new")}
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
