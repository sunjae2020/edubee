import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import axios from "axios";
import { Search, Car, Clock, MapPin, User, CheckCircle2, X, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, isToday } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface PickupRow {
  id: string;
  contractId?: string | null;
  contractNumber?: string | null;
  studentName?: string | null;
  pickupType?: string | null;
  fromLocation?: string | null;
  toLocation?: string | null;
  pickupDatetime?: string | null;
  vehicleInfo?: string | null;
  driverNotes?: string | null;
  driverName?: string | null;
  driverContact?: string | null;
  status?: string | null;
}

function fmtDatetime(d: string | null | undefined): { date: string; time: string } {
  if (!d) return { date: "—", time: "—" };
  try {
    const dt = parseISO(d);
    return { date: format(dt, "MMM d"), time: format(dt, "h:mm a") };
  } catch { return { date: d, time: "" }; }
}

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  pending:         { bg: "#F4F3F1", text: "#57534E" },
  driver_assigned: { bg: "#FEF9C3", text: "#CA8A04" },
  en_route:        { bg: "#FEF0E3", text: "#F5821F" },
  completed:       { bg: "#DCFCE7", text: "#16A34A" },
  cancelled:       { bg: "#FEF2F2", text: "#DC2626" },
};

// ─── Assign Driver Modal ──────────────────────────────────────────────────────
function AssignDriverModal({
  pickupId,
  existingVehicle,
  onClose,
}: {
  pickupId: string;
  existingVehicle?: string | null;
  onClose: () => void;
}) {
  const [driverName,    setDriverName]    = useState("");
  const [driverContact, setDriverContact] = useState("");
  const [vehicleInfo,   setVehicleInfo]   = useState(existingVehicle ?? "");
  const { toast } = useToast();
  const qc = useQueryClient();

  const assignMutation = useMutation({
    mutationFn: () =>
      axios.patch(`${BASE}/api/services/pickup/${pickupId}/assign`, {
        driverName, driverContact, vehicleInfo,
      }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pickup"] });
      qc.invalidateQueries({ queryKey: ["pickup-today"] });
      toast({ title: "Driver assigned successfully" });
      onClose();
    },
    onError: () => toast({ title: "Failed to assign driver", variant: "destructive" }),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Car size={16} className="text-[#F5821F]" />
            <h3 className="text-base font-bold text-stone-800">Assign Driver</h3>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700"><X size={16} /></button>
        </div>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-stone-600">Driver Name</Label>
            <Input value={driverName} onChange={e => setDriverName(e.target.value)} className="h-9 text-sm" placeholder="Full name" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-stone-600">Driver Contact</Label>
            <Input value={driverContact} onChange={e => setDriverContact(e.target.value)} className="h-9 text-sm" placeholder="Phone number" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-stone-600">Vehicle Info</Label>
            <Input value={vehicleInfo} onChange={e => setVehicleInfo(e.target.value)} className="h-9 text-sm" placeholder="e.g. Toyota Hiace — ABC123" />
          </div>
        </div>
        <div className="flex gap-3 pt-1">
          <Button
            onClick={() => assignMutation.mutate()}
            disabled={!driverName || assignMutation.isPending}
            className="flex-1 text-white" style={{ background: "#F5821F" }}
          >
            {assignMutation.isPending ? "Saving…" : "Assign Driver"}
          </Button>
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Mark Complete Modal ──────────────────────────────────────────────────────
function CompleteModal({ pickupId, onClose }: { pickupId: string; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const completeMutation = useMutation({
    mutationFn: () =>
      axios.patch(`${BASE}/api/services/pickup/${pickupId}`, { status: "completed" }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pickup"] });
      qc.invalidateQueries({ queryKey: ["pickup-today"] });
      toast({ title: "Pickup marked as completed" });
      onClose();
    },
    onError: () => toast({ title: "Failed to update", variant: "destructive" }),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={16} className="text-[#16A34A]" />
          <h3 className="text-base font-bold text-stone-800">Mark Complete</h3>
        </div>
        <p className="text-sm text-stone-600">
          Confirm this pickup has been completed. This will update the status to <strong>Completed</strong>.
        </p>
        <div className="flex items-center gap-2 p-3 rounded-lg border border-dashed border-stone-300 text-stone-400 text-sm cursor-not-allowed select-none">
          <Upload size={14} />
          <span>Completion photo upload (coming soon)</span>
        </div>
        <div className="flex gap-3 pt-1">
          <Button
            onClick={() => completeMutation.mutate()}
            disabled={completeMutation.isPending}
            className="flex-1 text-white" style={{ background: "#16A34A" }}
          >
            {completeMutation.isPending ? "Saving…" : "Mark Complete"}
          </Button>
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Today Card ───────────────────────────────────────────────────────────────
function TodayCard({
  row,
  onAssign,
  onComplete,
}: {
  row: PickupRow;
  onAssign: () => void;
  onComplete: () => void;
}) {
  const { time } = fmtDatetime(row.pickupDatetime);
  const badge = STATUS_STYLE[row.status ?? "pending"] ?? STATUS_STYLE.pending;

  return (
    <div className="bg-white rounded-xl border border-[#F5821F]/30 p-4 flex items-center gap-4 shadow-sm">
      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "#FEF0E3", color: "#F5821F" }}>
        <Car size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-semibold text-stone-800 text-sm">{row.studentName ?? "—"}</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: badge.bg, color: badge.text }}>
            {row.status?.replace(/_/g, " ") ?? "—"}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-stone-500 flex-wrap">
          <span className="flex items-center gap-1"><Clock size={10} />{time}</span>
          <span className="flex items-center gap-1"><MapPin size={10} />{row.fromLocation ?? "—"} → {row.toLocation ?? "—"}</span>
          {row.driverName && (
            <span className="flex items-center gap-1"><User size={10} />{row.driverName}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {row.status !== "completed" && row.status !== "cancelled" && (
          <>
            {(!row.driverName || row.status === "pending") && (
              <button onClick={onAssign}
                className="px-3 py-1.5 text-xs font-medium rounded-lg text-white" style={{ background: "#F5821F" }}>
                Assign Driver
              </button>
            )}
            {row.driverName && row.status !== "completed" && (
              <button onClick={onComplete}
                className="px-3 py-1.5 text-xs font-medium rounded-lg text-white" style={{ background: "#16A34A" }}>
                Complete
              </button>
            )}
          </>
        )}
        {row.status === "completed" && <CheckCircle2 size={18} className="text-[#16A34A]" />}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PickupManagement() {
  const [search, setSearch]               = useState("");
  const [status, setStatus]               = useState("");
  const [page, setPage]                   = useState(1);
  const [assignId, setAssignId]           = useState<string | null>(null);
  const [assignVehicle, setAssignVehicle] = useState<string | null>(null);
  const [completeId, setCompleteId]       = useState<string | null>(null);

  const { data: todayData } = useQuery({
    queryKey: ["pickup-today"],
    queryFn: () => axios.get(`${BASE}/api/services/pickup?today=true&limit=50`).then(r => r.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["pickup", search, status, page],
    queryFn: () => {
      const p = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) p.set("search", search);
      if (status) p.set("status", status);
      return axios.get(`${BASE}/api/services/pickup?${p}`).then(r => r.data);
    },
  });

  const todayRows: PickupRow[] = todayData?.data ?? [];
  const rows: PickupRow[]      = data?.data ?? [];
  const totalPages             = data?.meta?.totalPages ?? 1;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-stone-800">Pickup Management</h1>
        <p className="text-sm text-stone-500 mt-1">Airport pickups and student transfers</p>
      </div>

      {/* Today's Pickups banner */}
      {todayRows.length > 0 && (
        <div className="rounded-xl p-5 space-y-3" style={{ background: "#FEF0E3", border: "1.5px solid #F5821F40" }}>
          <div className="flex items-center gap-2 mb-1">
            <Car size={16} style={{ color: "#F5821F" }} />
            <h2 className="text-sm font-bold" style={{ color: "#C2410C" }}>
              Today's Pickups — {todayRows.length}
            </h2>
          </div>
          <div className="space-y-2">
            {todayRows.map(row => (
              <TodayCard
                key={row.id}
                row={row}
                onAssign={() => { setAssignId(row.id); setAssignVehicle(row.vehicleInfo ?? null); }}
                onComplete={() => setCompleteId(row.id)}
              />
            ))}
          </div>
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
          <option value="driver_assigned">Driver Assigned</option>
          <option value="en_route">En Route</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-stone-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 border-b border-stone-200">
            <tr>
              {["Student", "Type", "Pickup Time", "From → To", "Driver", "Vehicle", "Status", "Actions"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {isLoading && (
              <tr><td colSpan={8} className="text-center py-12 text-stone-400 text-sm">Loading…</td></tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr><td colSpan={8} className="text-center py-12 text-stone-400 text-sm">No records found</td></tr>
            )}
            {rows.map(row => {
              const { date, time } = fmtDatetime(row.pickupDatetime);
              const badge = STATUS_STYLE[row.status ?? "pending"] ?? STATUS_STYLE.pending;
              const todayFlag = row.pickupDatetime ? isToday(parseISO(row.pickupDatetime)) : false;

              return (
                <tr key={row.id} className={`hover:bg-stone-50 transition-colors ${todayFlag ? "bg-[#FEF9F5]" : ""}`}>
                  <td className="px-4 py-3 font-medium text-stone-800">
                    {row.studentName ?? "—"}
                    {todayFlag && (
                      <span className="ml-2 text-[10px] font-bold text-[#F5821F] bg-[#FEF0E3] px-1.5 py-0.5 rounded-full">TODAY</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-500 capitalize">{row.pickupType?.replace(/_/g, " ") ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-stone-700 whitespace-nowrap">
                    <div className="font-medium">{date}</div>
                    <div className="text-stone-400">{time}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-600 max-w-[180px]">
                    <span className="truncate block">{row.fromLocation ?? "—"}</span>
                    <span className="truncate block text-stone-400">→ {row.toLocation ?? "—"}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-600">
                    {row.driverName ?? <span className="text-stone-300">Unassigned</span>}
                    {row.driverContact && <div className="text-stone-400">{row.driverContact}</div>}
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-500">{row.vehicleInfo ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium"
                      style={{ background: badge.bg, color: badge.text }}>
                      {row.status?.replace(/_/g, " ") ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {row.status !== "completed" && row.status !== "cancelled" && (
                        <>
                          <button
                            onClick={() => { setAssignId(row.id); setAssignVehicle(row.vehicleInfo ?? null); }}
                            className="text-xs font-medium text-[#F5821F] hover:underline"
                          >
                            Assign
                          </button>
                          {row.driverName && (
                            <button
                              onClick={() => setCompleteId(row.id)}
                              className="text-xs font-medium text-[#16A34A] hover:underline"
                            >
                              Complete
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="px-3 py-1.5 text-xs border border-stone-200 rounded-lg hover:bg-stone-50 disabled:opacity-40">Prev</button>
          <span className="text-sm text-stone-500">Page {page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 text-xs border border-stone-200 rounded-lg hover:bg-stone-50 disabled:opacity-40">Next</button>
        </div>
      )}

      {/* Modals */}
      {assignId && (
        <AssignDriverModal
          pickupId={assignId}
          existingVehicle={assignVehicle}
          onClose={() => { setAssignId(null); setAssignVehicle(null); }}
        />
      )}
      {completeId && (
        <CompleteModal
          pickupId={completeId}
          onClose={() => setCompleteId(null)}
        />
      )}
    </div>
  );
}
