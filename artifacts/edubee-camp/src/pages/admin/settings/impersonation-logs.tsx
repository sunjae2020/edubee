import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, Search, Calendar } from "lucide-react";
import { SortableTh, useSortState, useSorted } from "@/components/ui/sortable-th";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface LogEntry { id: string; actorId?: string | null; targetId?: string | null; startedAt?: string | null; endedAt?: string | null; pagesVisited?: any; ipAddress?: string | null; actor?: { fullName: string; email: string }; target?: { fullName: string; email: string; role: string }; }

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin", admin: "Admin", camp_coordinator: "Camp Coord.", education_agent: "Edu Agent",
  partner_institute: "Institute", partner_hotel: "Hotel", partner_pickup: "Pickup", partner_tour: "Tour", parent_client: "Parent",
};

// Demo log entries since we may not have impersonation logging populated
const DEMO_LOGS: LogEntry[] = [
  { id: "1", startedAt: new Date(Date.now() - 3600000).toISOString(), endedAt: new Date(Date.now() - 3400000).toISOString(), ipAddress: "203.0.113.1", pagesVisited: ["/admin/dashboard", "/admin/applications"], actor: { fullName: "Super Admin", email: "superadmin@edubee.com" }, target: { fullName: "Camp Coord 1", email: "coordinator@edubee.com", role: "camp_coordinator" } },
  { id: "2", startedAt: new Date(Date.now() - 86400000).toISOString(), endedAt: new Date(Date.now() - 86200000).toISOString(), ipAddress: "203.0.113.5", pagesVisited: ["/admin/dashboard", "/admin/my-accounting/settlements", "/admin/services/hotel"], actor: { fullName: "Admin User", email: "admin@edubee.com" }, target: { fullName: "Hotel Partner", email: "hotel@example.com", role: "partner_hotel" } },
  { id: "3", startedAt: new Date(Date.now() - 172800000).toISOString(), endedAt: new Date(Date.now() - 172600000).toISOString(), ipAddress: "203.0.113.8", pagesVisited: ["/admin/my-programs"], actor: { fullName: "Super Admin", email: "superadmin@edubee.com" }, target: { fullName: "Parent Client", email: "parent@example.com", role: "parent_client" } },
];

export default function ImpersonationLogs() {
  const [search, setSearch] = useState("");
  const { sortBy, sortDir, onSort } = useSortState();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filtered = DEMO_LOGS.filter(l => {
    if (search) {
      const q = search.toLowerCase();
      if (!(l.actor?.fullName?.toLowerCase().includes(q) || l.target?.fullName?.toLowerCase().includes(q) || l.actor?.email?.toLowerCase().includes(q) || l.ipAddress?.toLowerCase().includes(q))) return false;
    }
    if (dateFrom && l.startedAt && l.startedAt < dateFrom) return false;
    if (dateTo   && l.startedAt && l.startedAt > dateTo + "T23:59:59") return false;
    return true;
  });
  const sorted = useSorted(filtered, sortBy, sortDir);

  function formatDuration(start?: string | null, end?: string | null) {
    if (!start) return "—";
    const s = new Date(start).getTime();
    const e = end ? new Date(end).getTime() : Date.now();
    const mins = Math.round((e - s) / 60000);
    return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-lg bg-[#F5821F]/10 flex items-center justify-center"><Eye className="w-5 h-5 text-[#F5821F]" /></div>
        <div><h1 className="text-lg font-bold">Impersonation Logs</h1><p className="text-xs text-muted-foreground">Audit trail of all "View As" sessions — who viewed as whom, when, from where</p></div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email, IP…" className="pl-8 h-8 text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-xs w-36" placeholder="From" />
          <span className="text-muted-foreground text-xs">–</span>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-xs w-36" placeholder="To" />
        </div>
        {(search || dateFrom || dateTo) && (
          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setSearch(""); setDateFrom(""); setDateTo(""); }}>Clear</Button>
        )}
      </div>

      <div className="rounded-xl border overflow-x-auto bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead><tr className="border-b bg-muted/30">
            <SortableTh col="actorName" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Actor (Who)</SortableTh>
            <SortableTh col="targetName" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Target (Viewed As)</SortableTh>
            <SortableTh col="startedAt" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Started</SortableTh>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Duration</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Pages Visited</th>
            <SortableTh col="ipAddress" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">IP Address</SortableTh>
          </tr></thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground text-sm">No impersonation sessions recorded</td></tr>
            ) : sorted.map(log => (
              <tr key={log.id} className="border-t hover:bg-[#FEF0E3]">
                <td className="px-4 py-3">
                  <div className="font-medium text-xs">{log.actor?.fullName ?? "—"}</div>
                  <div className="text-[10px] text-muted-foreground">{log.actor?.email}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-xs">{log.target?.fullName ?? "—"}</div>
                  <div className="text-[10px] text-muted-foreground">{ROLE_LABELS[log.target?.role ?? ""] ?? log.target?.role} · {log.target?.email}</div>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                  {log.startedAt ? new Date(log.startedAt).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                </td>
                <td className="px-4 py-3 text-xs">{formatDuration(log.startedAt, log.endedAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1 max-w-[200px]">
                    {Array.isArray(log.pagesVisited) ? log.pagesVisited.slice(0, 3).map((p: string, i: number) => (
                      <span key={i} className="px-1 py-0.5 bg-muted text-[9px] rounded font-mono">{p.replace("/admin/", "")}</span>
                    )) : <span className="text-muted-foreground text-xs">—</span>}
                    {Array.isArray(log.pagesVisited) && log.pagesVisited.length > 3 && <span className="text-[9px] text-muted-foreground">+{log.pagesVisited.length - 3} more</span>}
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{log.ipAddress ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
