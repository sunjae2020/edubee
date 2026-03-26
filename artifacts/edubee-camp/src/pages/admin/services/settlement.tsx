import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import axios from "axios";
import { format, parseISO } from "date-fns";
import { Search, Plus, MapPin, Calendar, User, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { SortableTh, useSortState, useSorted } from "@/components/ui/sortable-th";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Rec {
  id: string;
  contractId?: string | null;
  contractNumber?: string | null;
  clientName?: string | null;
  studentName?: string | null;
  clientEmail?: string | null;
  arrivalDate?: string | null;
  overallStatus?: string | null;
  assignedConsultantId?: string | null;
  consultantName?: string | null;
  grossAmount?: string | null;
  notes?: string | null;
  createdAt?: string;
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  try { return format(parseISO(d), "dd MMM yyyy"); } catch { return d; }
}
function fmtMoney(n?: string | number | null) {
  if (n == null || n === "") return "—";
  return `A$${Number(n).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const STATUS_MAP: Record<string, { label: string; bg: string; text: string; icon: typeof Clock }> = {
  pending:     { label: "Pending",     bg: "#F4F3F1", text: "#57534E", icon: Clock        },
  in_progress: { label: "In Progress", bg: "#FEF0E3", text: "#F5821F", icon: AlertCircle  },
  completed:   { label: "Completed",   bg: "#DCFCE7", text: "#16A34A", icon: CheckCircle2 },
};

function StatusBadge({ s }: { s?: string | null }) {
  const cfg = STATUS_MAP[s ?? "pending"] ?? STATUS_MAP.pending;
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ background: cfg.bg, color: cfg.text }}>
      {cfg.label}
    </span>
  );
}

function Initials({ name }: { name?: string | null }) {
  const parts = (name ?? "?").split(" ").filter(Boolean);
  const ini = parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0]?.[0] ?? "?");
  return (
    <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
      style={{ background: "#F5821F" }}>{ini.toUpperCase()}</span>
  );
}

export default function Settlement() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const { sortBy, sortDir, onSort } = useSortState();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<Partial<Rec>>({});

  const role = user?.role ?? "";
  const canCreate = ["super_admin", "admin", "camp_coordinator"].includes(role);

  const { data, isLoading } = useQuery({
    queryKey: ["services-settlement", statusFilter],
    queryFn: () =>
      axios.get(`${BASE}/api/services/settlement`, {
        params: statusFilter !== "all" ? { overallStatus: statusFilter } : {},
      }).then(r => r.data.data ?? []),
  });
  const rows: Rec[] = (data ?? []).filter((r: Rec) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (r.clientName ?? r.studentName ?? "").toLowerCase().includes(q)
        || (r.contractNumber ?? "").toLowerCase().includes(q);
  });
  const sorted = useSorted(rows, sortBy, sortDir);

  const totalByStatus = (s: string) => (data ?? []).filter((r: Rec) => (r.overallStatus ?? "pending") === s).length;

  const createMutation = useMutation({
    mutationFn: (payload: Partial<Rec>) =>
      axios.post(`${BASE}/api/services/settlement`, {
        ...payload,
        overallStatus: "pending",
        checklist: [],
      }).then(r => r.data),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["services-settlement"] });
      setShowCreate(false);
      setForm({});
      navigate(`${BASE}/admin/services/settlement/${created.id}`);
    },
  });

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background:"#FEF0E3" }}>
            <MapPin className="w-5 h-5" style={{ color:"#F5821F" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1C1917]">Settlement</h1>
            <p className="text-xs text-[#A8A29E]">Client arrival & settling-in service management</p>
          </div>
        </div>
        {canCreate && (
          <button
            onClick={() => { setForm({}); setShowCreate(true); }}
            className="flex items-center gap-1.5 h-9 px-4 rounded-lg text-sm font-semibold text-white"
            style={{ background:"#F5821F" }}>
            <Plus size={15} /> New Settlement
          </button>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {(["pending","in_progress","completed"] as const).map(s => {
          const cfg = STATUS_MAP[s];
          const count = totalByStatus(s);
          return (
            <button key={s}
              onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
              className="bg-white border rounded-xl p-4 text-left hover:shadow-sm transition-shadow"
              style={{ borderColor: statusFilter === s ? cfg.text : "#E8E6E2" }}>
              <p className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: cfg.text }}>{cfg.label}</p>
              <p className="text-2xl font-bold text-[#1C1917]">{count}</p>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E]" />
        <input
          type="text"
          placeholder="Search by student name or contract number…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full h-9 pl-9 pr-3 rounded-lg border border-[#E8E6E2] text-sm bg-white focus:outline-none focus:border-[#F5821F]"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-[#F4F3F1] animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white border border-[#E8E6E2] rounded-xl p-16 text-center">
          <MapPin size={32} className="mx-auto mb-3 text-[#E8E6E2]" />
          <p className="text-sm text-[#A8A29E]">No settlement records found</p>
          {canCreate && (
            <button onClick={() => { setForm({}); setShowCreate(true); }}
              className="mt-3 text-sm underline" style={{ color:"#F5821F" }}>
              Create your first settlement
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-[#E8E6E2] rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E8E6E2]" style={{ background:"#FAFAF9" }}>
                <>
              <SortableTh key="Client" col="clientName" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[#A8A29E]">Client</SortableTh>
              <SortableTh key="Arrival Date" col="arrivalDate" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[#A8A29E]">Arrival Date</SortableTh>
              <SortableTh key="Assigned Consultant" col="consultantName" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[#A8A29E]">Assigned Consultant</SortableTh>
              <SortableTh key="Service Fee" col="serviceFee" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[#A8A29E]">Service Fee</SortableTh>
              <SortableTh key="Status" col="overallStatus" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[#A8A29E]">Status</SortableTh>
              <SortableTh key="Created" col="createdAt" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[#A8A29E]">Created</SortableTh>
            </>
              </tr>
            </thead>
            <tbody>
              {sorted.map(r => (
                <tr key={r.id}
                  onClick={() => navigate(`${BASE}/admin/services/settlement/${r.id}`)}
                  className="border-b border-[#E8E6E2] cursor-pointer transition-colors hover:bg-[#FAFAF9]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Initials name={r.clientName ?? r.studentName} />
                      <div>
                        <p className="text-[13px] font-semibold text-[#1C1917]">{r.clientName ?? r.studentName ?? "—"}</p>
                        {r.contractNumber && (
                          <p className="text-[11px] font-mono text-[#A8A29E]">{r.contractNumber}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-[12px] text-[#57534E]">
                      <Calendar size={12} className="text-[#A8A29E]" />
                      {fmtDate(r.arrivalDate)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-[12px] text-[#57534E]">
                      <User size={12} className="text-[#A8A29E]" />
                      {r.consultantName ?? "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[13px] font-semibold text-[#1C1917]">
                    {fmtMoney(r.grossAmount)}
                  </td>
                  <td className="px-4 py-3"><StatusBadge s={r.overallStatus} /></td>
                  <td className="px-4 py-3 text-[12px] text-[#A8A29E]">{fmtDate(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={e => { if (e.target === e.currentTarget) setShowCreate(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E6E2]">
              <h2 className="text-sm font-bold text-[#1C1917]">New Settlement Service</h2>
              <button onClick={() => setShowCreate(false)} className="text-[#A8A29E] hover:text-[#1C1917]">✕</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wide text-[#57534E] block mb-1">Contract ID</label>
                <input type="text" value={form.contractId ?? ""}
                  onChange={e => setForm(f => ({ ...f, contractId: e.target.value }))}
                  placeholder="Paste contract UUID…"
                  className="w-full h-9 px-3 rounded-lg border border-[#E8E6E2] text-sm focus:outline-none focus:border-[#F5821F]" />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wide text-[#57534E] block mb-1">Arrival Date</label>
                <input type="date" value={form.arrivalDate ?? ""}
                  onChange={e => setForm(f => ({ ...f, arrivalDate: e.target.value }))}
                  className="w-full h-9 px-3 rounded-lg border border-[#E8E6E2] text-sm focus:outline-none focus:border-[#F5821F]" />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wide text-[#57534E] block mb-1">Service Fee (A$)</label>
                <input type="number" value={form.grossAmount ?? ""}
                  onChange={e => setForm(f => ({ ...f, grossAmount: e.target.value }))}
                  placeholder="0.00"
                  className="w-full h-9 px-3 rounded-lg border border-[#E8E6E2] text-sm focus:outline-none focus:border-[#F5821F]" />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wide text-[#57534E] block mb-1">Notes</label>
                <textarea rows={2} value={form.notes ?? ""}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-[#E8E6E2] text-sm focus:outline-none focus:border-[#F5821F] resize-none" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[#E8E6E2] flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)}
                className="h-9 px-4 rounded-lg border border-[#E8E6E2] text-sm text-[#57534E] hover:bg-[#F4F3F1]">
                Cancel
              </button>
              <button
                onClick={() => createMutation.mutate(form)}
                disabled={createMutation.isPending || !form.contractId}
                className="h-9 px-4 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                style={{ background:"#F5821F" }}>
                {createMutation.isPending ? "Creating…" : "Create & Open"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
