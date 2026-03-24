import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import axios from "axios";
import { format, parseISO, isToday } from "date-fns";
import { Car, Clock, MapPin, User, ChevronRight } from "lucide-react";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { ListPagination } from "@/components/ui/list-pagination";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const PAGE_SIZE = 15;
const STATUSES = ["pending", "driver_assigned", "en_route", "completed", "cancelled"];

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  pending:         { bg: "#F4F3F1", text: "#57534E" },
  driver_assigned: { bg: "#FEF9C3", text: "#CA8A04" },
  en_route:        { bg: "#FEF0E3", text: "#F5821F" },
  completed:       { bg: "#DCFCE7", text: "#16A34A" },
  cancelled:       { bg: "#FEF2F2", text: "#DC2626" },
};

function StatusBadge({ status }: { status?: string | null }) {
  const s = status ?? "pending";
  const style = STATUS_STYLE[s] ?? { bg: "#F4F3F1", text: "#57534E" };
  return (
    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ background: style.bg, color: style.text }}>
      {s.replace(/_/g, " ")}
    </span>
  );
}

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
  driverName?: string | null;
  driverContact?: string | null;
  status?: string | null;
}

function fmtDatetime(d?: string | null): { date: string; time: string } {
  if (!d) return { date: "—", time: "—" };
  try {
    const dt = parseISO(d);
    return { date: format(dt, "MMM d, yyyy"), time: format(dt, "h:mm a") };
  } catch { return { date: d, time: "" }; }
}

// ─── Today's Pickups Banner ───────────────────────────────────────────────────
function TodayBanner({ rows, onNavigate }: { rows: PickupRow[]; onNavigate: (id: string) => void }) {
  if (rows.length === 0) return null;
  return (
    <div className="rounded-xl p-4 space-y-2" style={{ background: "#FEF0E3", border: "1.5px solid rgba(245,130,31,0.25)" }}>
      <div className="flex items-center gap-2 mb-2">
        <Car className="w-4 h-4" style={{ color: "#F5821F" }} />
        <h2 className="text-sm font-bold" style={{ color: "#C2410C" }}>
          Today's Pickups — {rows.length}
        </h2>
      </div>
      <div className="space-y-2">
        {rows.map(row => {
          const { time } = fmtDatetime(row.pickupDatetime);
          const badge = STATUS_STYLE[row.status ?? "pending"] ?? STATUS_STYLE.pending;
          return (
            <button
              key={row.id}
              className="w-full text-left bg-white rounded-xl border border-[#F5821F]/20 p-3.5 flex items-center gap-4 shadow-sm hover:bg-[#FEF9F5] transition-colors"
              onClick={() => onNavigate(row.id)}
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "#FEF0E3", color: "#F5821F" }}>
                <Car className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-semibold text-[#1C1917] text-sm">{row.studentName ?? "—"}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: badge.bg, color: badge.text }}>
                    {(row.status ?? "pending").replace(/_/g, " ")}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-[#57534E] flex-wrap">
                  <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{time}</span>
                  <span className="flex items-center gap-1"><MapPin className="w-2.5 h-2.5" />{row.fromLocation ?? "—"} → {row.toLocation ?? "—"}</span>
                  {row.driverName && <span className="flex items-center gap-1"><User className="w-2.5 h-2.5" />{row.driverName}</span>}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#A8A29E] shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PickupManagement() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState("all");
  const [page, setPage] = useState(1);

  const { data: todayData } = useQuery({
    queryKey: ["pickup-today"],
    queryFn: () => axios.get(`${BASE}/api/services/pickup?today=true&limit=50`).then(r => r.data),
  });

  const { data: resp, isLoading } = useQuery({
    queryKey: ["pickup", { search, status: activeStatus, page }],
    queryFn: () => {
      const p = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (search) p.set("search", search);
      if (activeStatus !== "all") p.set("status", activeStatus);
      return axios.get(`${BASE}/api/services/pickup?${p}`).then(r => r.data);
    },
  });

  const todayRows: PickupRow[] = todayData?.data ?? [];
  const rows: PickupRow[]      = resp?.data ?? [];
  const total: number          = resp?.meta?.total ?? rows.length;

  return (
    <div className="space-y-4">
      <ListToolbar
        search={search}
        onSearch={v => { setSearch(v); setPage(1); }}
        statuses={STATUSES}
        activeStatus={activeStatus}
        onStatusChange={s => { setActiveStatus(s); setPage(1); }}
        total={total}
      />

      <TodayBanner rows={todayRows} onNavigate={id => navigate(`${BASE}/admin/services/pickup/${id}`)} />

      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {["Contract #", "Student", "Type", "Pickup Time", "From → To", "Driver", "Vehicle", "Status", ""].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              [...Array(PAGE_SIZE)].map((_, i) => (
                <tr key={i}>
                  {[...Array(9)].map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-16 text-center text-muted-foreground text-sm">
                  <Car className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  No pickup records found
                </td>
              </tr>
            ) : rows.map(row => {
              const { date, time } = fmtDatetime(row.pickupDatetime);
              const todayFlag = row.pickupDatetime ? isToday(parseISO(row.pickupDatetime)) : false;
              return (
                <tr
                  key={row.id}
                  className={`hover:bg-[#FEF0E3] transition-colors cursor-pointer ${todayFlag ? "bg-[#FEF9F5]" : ""}`}
                  onClick={() => navigate(`${BASE}/admin/services/pickup/${row.id}`)}
                >
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-[#F5821F]">
                    {row.contractNumber ?? row.contractId?.slice(0, 8) ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {row.studentName ?? "—"}
                    {todayFlag && (
                      <span className="ml-2 text-[10px] font-bold text-[#F5821F] bg-[#FEF0E3] px-1.5 py-0.5 rounded-full">TODAY</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground capitalize">
                    {row.pickupType?.replace(/_/g, " ") ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">
                    <div className="font-medium text-foreground">{date}</div>
                    <div className="text-muted-foreground">{time}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-[180px]">
                    <span className="truncate block">{row.fromLocation ?? "—"}</span>
                    <span className="truncate block text-muted-foreground/60">→ {row.toLocation ?? "—"}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {row.driverName ?? <span className="text-muted-foreground/40 italic">Unassigned</span>}
                    {row.driverContact && <div className="text-muted-foreground/60">{row.driverContact}</div>}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{row.vehicleInfo ?? "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                  <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-muted-foreground" /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ListPagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />
    </div>
  );
}
