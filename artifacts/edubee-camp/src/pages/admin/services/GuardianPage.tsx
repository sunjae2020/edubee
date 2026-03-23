import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import axios from "axios";
import { Search, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format, parseISO } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface GuardianRow {
  id: string;
  contractNumber?: string | null;
  studentName?: string | null;
  agentName?: string | null;
  billingCycle?: string | null;
  serviceStartDate?: string | null;
  serviceEndDate?: string | null;
  status?: string | null;
  staffFirstName?: string | null;
  staffLastName?: string | null;
  serviceFee?: string | null;
}

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  pending:    { bg: "#F4F3F1", text: "#57534E" },
  active:     { bg: "#DCFCE7", text: "#16A34A" },
  on_hold:    { bg: "#FEF9C3", text: "#CA8A04" },
  completed:  { bg: "#F4F3F1", text: "#57534E" },
  cancelled:  { bg: "#FEF2F2", text: "#DC2626" },
};

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  try { return format(parseISO(d), "MMM d, yyyy"); } catch { return d; }
}

export default function GuardianPage() {
  const [, navigate]    = useLocation();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage]     = useState(1);

  const { data: billingData } = useQuery({
    queryKey: ["guardian-billing-due"],
    queryFn: () => axios.get(`${BASE}/api/services/guardian/billing-due`).then(r => r.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["guardian", search, status, page],
    queryFn: () => {
      const p = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) p.set("search", search);
      if (status) p.set("status", status);
      return axios.get(`${BASE}/api/services/guardian?${p}`).then(r => r.data);
    },
  });

  const rows: GuardianRow[] = data?.data ?? [];
  const totalPages          = data?.meta?.totalPages ?? 1;
  const billingDueCount     = billingData?.count ?? 0;

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-3xl font-bold text-stone-800">Guardian</h1>
        <p className="text-sm text-stone-500 mt-1">Manage student guardian services and billing</p>
      </div>

      {/* Billing alert banner */}
      {billingDueCount > 0 && (
        <div
          className="flex items-center justify-between px-4 py-3 rounded-xl text-sm"
          style={{ background: "#FEF0E3", borderLeft: "4px solid #F5821F" }}
        >
          <div className="flex items-center gap-2 font-medium" style={{ color: "#C2410C" }}>
            <AlertCircle size={16} style={{ color: "#F5821F" }} />
            이번 달 가디언 청구 예정: {billingDueCount}건
          </div>
          <button
            onClick={() => navigate("/admin/services/guardian?billingDue=1")}
            className="text-xs font-bold underline hover:no-underline"
            style={{ color: "#C2410C" }}
          >
            Process →
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <Input
            placeholder="Search student, contract…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="h-9 text-sm pl-9"
          />
        </div>
        <select
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="h-9 text-sm border border-stone-200 rounded-lg px-3 bg-white text-stone-700"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="on_hold">On Hold</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-stone-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 border-b border-stone-200">
            <tr>
              {["Student", "Guardian Staff", "Billing Cycle", "Service Period", "Fee (A$)", "Status"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {isLoading && (
              <tr><td colSpan={6} className="text-center py-12 text-stone-400 text-sm">Loading…</td></tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr><td colSpan={6} className="text-center py-12 text-stone-400 text-sm">No records found</td></tr>
            )}
            {rows.map(row => {
              const badge = STATUS_STYLE[row.status ?? "pending"] ?? STATUS_STYLE.pending;
              const staffName = row.staffFirstName
                ? `${row.staffFirstName} ${row.staffLastName ?? ""}`.trim()
                : "—";

              return (
                <tr
                  key={row.id}
                  className="hover:bg-stone-50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/admin/services/guardian/${row.id}`)}
                >
                  <td className="px-4 py-3 font-medium text-stone-800">{row.studentName ?? "—"}</td>
                  <td className="px-4 py-3 text-stone-600 text-sm">{staffName}</td>
                  <td className="px-4 py-3 text-stone-500 text-xs capitalize">{row.billingCycle?.replace(/_/g, " ") ?? "—"}</td>
                  <td className="px-4 py-3 text-stone-600 text-xs whitespace-nowrap">
                    {fmtDate(row.serviceStartDate)} → {fmtDate(row.serviceEndDate)}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-stone-700">
                    {row.serviceFee ? `$${Number(row.serviceFee).toLocaleString("en-AU", { minimumFractionDigits: 2 })}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium capitalize"
                      style={{ background: badge.bg, color: badge.text }}>
                      {row.status ?? "—"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="px-3 py-1.5 text-xs border border-stone-200 rounded-lg hover:bg-stone-50 disabled:opacity-40">Prev</button>
          <span className="text-sm text-stone-500">Page {page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 text-xs border border-stone-200 rounded-lg hover:bg-stone-50 disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}
