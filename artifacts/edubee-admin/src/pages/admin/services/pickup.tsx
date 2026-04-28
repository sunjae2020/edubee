import { formatDate } from "@/lib/date-format";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import axios from "axios";
import { format, parseISO, isToday } from "date-fns";
import { Car, Clock, MapPin, User, ChevronRight, GraduationCap, Briefcase } from "lucide-react";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { TableFooter } from "@/components/ui/table-footer";
import { SortableTh, useSortState, useSorted } from "@/components/ui/sortable-th";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useBulkSelect } from "@/hooks/use-bulk-select";
import { BulkActionBar } from "@/components/common/BulkActionBar";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const PAGE_SIZE = 15;
const STATUSES = ["pending", "driver_assigned", "en_route", "completed", "cancelled"];

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  pending:         { bg: "#F4F3F1", text: "#57534E" },
  driver_assigned: { bg: "#FEF9C3", text: "#CA8A04" },
  en_route:        { bg: "var(--e-orange-lt)", text: "var(--e-orange)" },
  completed:       { bg: "#DCFCE7", text: "#16A34A" },
  cancelled:       { bg: "#FEF2F2", text: "#DC2626" },
};

type Source = "all" | "camp" | "services";

const SOURCE_TABS: { key: Source; label: string; icon: typeof Car }[] = [
  { key: "all",      label: "All",      icon: Car         },
  { key: "camp",     label: "Camp",     icon: GraduationCap },
  { key: "services", label: "Services", icon: Briefcase   },
];

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
  clientName?: string | null;
  studentName?: string | null;
  pickupType?: string | null;
  fromLocation?: string | null;
  toLocation?: string | null;
  pickupDatetime?: string | null;
  vehicleInfo?: string | null;
  driverName?: string | null;
  driverContact?: string | null;
  status?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

function fmtDatetime(d?: string | null): { date: string; time: string } {
  if (!d) return { date: "—", time: "—" };
  try {
    const dt = parseISO(d);
    return { date: formatDate(dt), time: format(dt, "h:mm a") };
  } catch { return { date: d, time: "" }; }
}

// ─── Today's Pickups Banner ───────────────────────────────────────────────────
function TodayBanner({ rows, onNavigate }: { rows: PickupRow[]; onNavigate: (id: string) => void }) {
  if (rows.length === 0) return null;
  return (
    <div className="rounded-xl p-4 space-y-2" style={{ background: "var(--e-orange-lt)", border: "1.5px solid var(--e-orange-shadow-25)" }}>
      <div className="flex items-center gap-2 mb-2">
        <Car className="w-4 h-4" style={{ color: "var(--e-orange)" }} />
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
              className="w-full text-left bg-white rounded-xl border border-(--e-orange)/20 p-3.5 flex items-center gap-4 shadow-sm hover:bg-[#FEF9F5] transition-colors"
              onClick={() => onNavigate(row.id)}
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--e-orange-lt)", color: "var(--e-orange)" }}>
                <Car className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-semibold text-[#1C1917] text-sm">{row.clientName ?? row.studentName ?? "—"}</span>
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

// ─── Source Tabs ──────────────────────────────────────────────────────────────
function SourceTabs({ active, onChange }: { active: Source; onChange: (s: Source) => void }) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "#F4F3F1", border: "1px solid #E8E6E2" }}>
      {SOURCE_TABS.map(({ key, label, icon: Icon }) => {
        const isActive = active === key;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: isActive ? "#fff" : "transparent",
              color: isActive ? "var(--e-orange)" : "#57534E",
              boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              border: isActive ? "1px solid #E8E6E2" : "1px solid transparent",
            }}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PickupManagement() {
  const [, navigate] = useLocation();
  const { sortBy, sortDir, onSort } = useSortState("createdOn", "desc");
  const [search, setSearch]         = useState("");
  const [activeStatus, setActiveStatus] = useState("all");
  const [source, setSource]         = useState<Source>("all");
  const [page, setPage]             = useState(1);
  const [pageSize, setPageSize]     = useState(PAGE_SIZE);

  const { data: todayData } = useQuery({
    queryKey: ["pickup-today", source],
    queryFn: () => {
      const p = new URLSearchParams({ today: "true", limit: "50" });
      if (source !== "all") p.set("source", source);
      return axios.get(`${BASE}/api/services/pickup?${p}`).then(r => r.data);
    },
  });

  useEffect(() => { setPage(1); }, [sortBy, sortDir]);

  const { data: resp, isLoading } = useQuery({
    queryKey: ["pickup", { search, status: activeStatus, source, page, pageSize, sortBy, sortDir }],
    queryFn: () => {
      const p = new URLSearchParams({ page: String(page), limit: String(pageSize) });
      if (search) p.set("search", search);
      if (activeStatus !== "all") p.set("status", activeStatus);
      if (source !== "all") p.set("source", source);
      p.set("sortBy",  sortBy);
      p.set("sortDir", sortDir);
      return axios.get(`${BASE}/api/services/pickup?${p}`).then(r => r.data);
    },
  });

  const todayRows: PickupRow[] = todayData?.data ?? [];
  const rows: PickupRow[]      = resp?.data ?? [];
  const sorted = useSorted(rows, sortBy, sortDir);
  const total: number          = resp?.meta?.total ?? rows.length;

  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isSA = user?.role === "super_admin";
  const { selectedIds, toggleSelect, toggleAll, clearSelection, isAllSelected } = useBulkSelect();
  const sortedIds = sorted.map((r: PickupRow) => r.id);

  const hardDelMutation = useMutation({
    mutationFn: (ids: string[]) => axios.delete(`${BASE}/api/services/pickup/bulk`, { data: { ids } }).then(r => r.data),
    onSuccess: (_d: any, ids: string[]) => { qc.invalidateQueries({ queryKey: ["pickup"] }); clearSelection(); toast({ title: `${ids.length} permanently deleted` }); },
    onError: () => toast({ title: "Delete failed", variant: "destructive" }),
  });
  const bulkLoading = hardDelMutation.isPending;

  function handleSourceChange(s: Source) {
    setSource(s);
    setPage(1);
    setActiveStatus("all");
    setSearch("");
  }

  return (
    <div className="space-y-4">
      {/* Camp / Services tabs — above the toolbar */}
      <SourceTabs active={source} onChange={handleSourceChange} />

      <ListToolbar
        search={search}
        onSearch={v => { setSearch(v); setPage(1); }}
        statuses={STATUSES}
        activeStatus={activeStatus}
        onStatusChange={s => { setActiveStatus(s); setPage(1); }}
        total={total}
      />

      <TodayBanner rows={todayRows} onNavigate={id => navigate(`/admin/services/pickup/${id}`)} />

      {isSA && selectedIds.size > 0 && (
        <BulkActionBar
          count={selectedIds.size}
          isLoading={bulkLoading}
          onHardDelete={() => hardDelMutation.mutate(Array.from(selectedIds))}
        />
      )}

      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {isSA && <th className="px-3 py-3 w-10"><input type="checkbox" checked={isAllSelected(sortedIds)} onChange={() => toggleAll(sortedIds)} className="rounded border-stone-300" /></th>}
              <>
              <SortableTh key="Contract #" col="contractNumber" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contract #</SortableTh>
              <SortableTh key="Client" col="clientName" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Client</SortableTh>
              <SortableTh key="Type" col="pickupType" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</SortableTh>
              <SortableTh key="Pickup Time" col="pickupTime" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pickup Time</SortableTh>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">From → To</th>
              <SortableTh key="Driver" col="driverName" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Driver</SortableTh>
              <SortableTh key="Vehicle" col="vehicleInfo" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vehicle</SortableTh>
              <SortableTh key="Status" col="status" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</SortableTh>
              <SortableTh key="Created" col="createdAt" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Created</SortableTh>
              <SortableTh key="Updated" col="updatedAt" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Updated</SortableTh>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-20" />
            </>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              [...Array(PAGE_SIZE)].map((_, i) => (
                <tr key={i}>
                  {[...Array(isSA ? 12 : 11)].map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={isSA ? 12 : 11} className="px-4 py-16 text-center text-muted-foreground text-sm">
                  <Car className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  No pickup records found
                </td>
              </tr>
            ) : sorted.map(row => {
              const { date, time } = fmtDatetime(row.pickupDatetime);
              const todayFlag = row.pickupDatetime ? isToday(parseISO(row.pickupDatetime)) : false;
              return (
                <tr
                  key={row.id}
                  className={`hover:bg-(--e-orange-lt) transition-colors cursor-pointer ${todayFlag ? "bg-[#FEF9F5]" : ""}`}
                  onClick={() => navigate(`/admin/services/pickup/${row.id}`)}
                >
                  {isSA && <td className="px-3 py-3 w-10" onClick={e => e.stopPropagation()}><input type="checkbox" checked={selectedIds.has(row.id)} onChange={() => toggleSelect(row.id)} className="rounded border-stone-300" /></td>}
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-(--e-orange)">
                    {row.contractNumber ?? row.contractId?.slice(0, 8) ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {row.clientName ?? row.studentName ?? "—"}
                    {todayFlag && (
                      <span className="ml-2 text-[10px] font-bold text-(--e-orange) bg-(--e-orange-lt) px-1.5 py-0.5 rounded-full">TODAY</span>
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
                  <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{row.createdAt ? formatDate(row.createdAt) : "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{row.updatedAt ? formatDate(row.updatedAt) : "—"}</td>
                  <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-muted-foreground" /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <TableFooter page={page} pageSize={pageSize} total={total} label="records" onPageChange={setPage} onPageSizeChange={v => { setPageSize(v); setPage(1); }} />
    </div>
  );
}
