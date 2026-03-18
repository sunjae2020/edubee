import { Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { differenceInDays } from "date-fns";
import { format } from "date-fns";
import { ListChecks } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface EnrollmentSpotRow {
  id: string;
  packageGroupId: string | null;
  packageGroupName: string | null;
  gradeLabel: string;
  gradeOrder: number | null;
  totalSpots: number;
  reservedSpots: number | null;
  manualReserved: number | null;
  available: number;
  status: string | null;
  startDate: string | null;
  endDate: string | null;
  dobRangeStart: string | null;
  dobRangeEnd: string | null;
  updatedAt: string | null;
}

interface GroupedData {
  groupName: string;
  groupId: string | null;
  rows: EnrollmentSpotRow[];
  totalSpots: number;
  totalEnrolled: number;
  totalAvailable: number;
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  try {
    return format(new Date(d), "MMM d, yyyy");
  } catch {
    return "—";
  }
}

function formatPeriod(start: string | null, end: string | null): string {
  if (!start && !end) return "—";
  if (start && end) return `${formatDate(start)} – ${formatDate(end)}`;
  if (start) return `From ${formatDate(start)}`;
  return `Until ${formatDate(end)}`;
}

function formatDuration(start: string | null, end: string | null): string {
  if (!start || !end) return "—";
  try {
    const days = differenceInDays(new Date(end), new Date(start));
    if (days < 0) return "—";
    if (days === 0) return "1 day";
    if (days % 7 === 0) {
      const weeks = days / 7;
      return `${weeks} ${weeks === 1 ? "week" : "weeks"}`;
    }
    return `${days} ${days === 1 ? "day" : "days"}`;
  } catch {
    return "—";
  }
}

function formatDobRange(start: string | null, end: string | null): string {
  if (!start && !end) return "—";
  if (start && end) return `${formatDate(start)} – ${formatDate(end)}`;
  if (start) return `From ${formatDate(start)}`;
  return `Until ${formatDate(end)}`;
}

export default function EnrollmentSpots() {
  const { data, isLoading } = useQuery<{ data: EnrollmentSpotRow[] }>({
    queryKey: ["enrollment-spots"],
    queryFn: () => axios.get(`${BASE}/api/enrollment-spots`).then(r => r.data),
  });

  const rows = data?.data ?? [];

  const grouped: GroupedData[] = [];
  const groupMap = new Map<string, GroupedData>();

  for (const row of rows) {
    const key = row.packageGroupId ?? "__ungrouped__";
    const name = row.packageGroupName ?? "Ungrouped";
    if (!groupMap.has(key)) {
      const g: GroupedData = {
        groupName: name,
        groupId: row.packageGroupId,
        rows: [],
        totalSpots: 0,
        totalEnrolled: 0,
        totalAvailable: 0,
      };
      groupMap.set(key, g);
      grouped.push(g);
    }
    const g = groupMap.get(key)!;
    g.rows.push(row);
    g.totalSpots += row.totalSpots ?? 0;
    g.totalEnrolled += (row.reservedSpots ?? 0) + (row.manualReserved ?? 0);
    g.totalAvailable += row.available ?? 0;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Enrollment Spots</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Available spots per school / package group, broken down by grade.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <div className="bg-card rounded-xl border border-border py-24 text-center">
          <ListChecks className="mx-auto w-10 h-10 text-muted-foreground/40 mb-3" />
          <h3 className="font-semibold mb-1">No Enrollment Spots</h3>
          <p className="text-sm text-muted-foreground">
            Enrollment spots will appear here once they have been configured.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden bg-card">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  Enroll Name
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  Period
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  Duration
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  DOB Range
                </th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  Total Spots
                </th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  Enroll No.
                </th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  Available
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  Last Modified
                </th>
              </tr>
            </thead>
            <tbody>
              {grouped.map((group) => (
                <Fragment key={group.groupId ?? group.groupName}>
                  <tr className="bg-orange-50/60 border-b border-border">
                    <td className="px-4 py-2.5 font-semibold text-sm text-foreground" colSpan={4}>
                      <div className="flex items-center gap-2">
                        <span>{group.groupName}</span>
                        <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold">
                          {group.rows.length}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-center font-semibold text-sm text-foreground">
                      {group.totalSpots}
                    </td>
                    <td className="px-4 py-2.5 text-center font-semibold text-sm text-foreground">
                      {group.totalEnrolled}
                    </td>
                    <td className="px-4 py-2.5 text-center font-semibold text-sm">
                      <span
                        className={
                          group.totalAvailable > 0
                            ? "text-emerald-600"
                            : "text-red-500"
                        }
                      >
                        {group.totalAvailable}
                      </span>
                    </td>
                    <td className="px-4 py-2.5" />
                  </tr>
                  {group.rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-2.5 text-foreground pl-8">
                        {row.packageGroupName} — {row.gradeLabel}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">
                        {formatPeriod(row.startDate, row.endDate)}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">
                        {formatDuration(row.startDate, row.endDate)}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">
                        {formatDobRange(row.dobRangeStart, row.dobRangeEnd)}
                      </td>
                      <td className="px-4 py-2.5 text-center text-foreground">
                        {row.totalSpots}
                      </td>
                      <td className="px-4 py-2.5 text-center text-foreground">
                        {(row.reservedSpots ?? 0) + (row.manualReserved ?? 0)}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span
                          className={
                            row.available > 0
                              ? "text-emerald-600 font-medium"
                              : "text-red-500 font-medium"
                          }
                        >
                          {row.available}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">
                        {formatDate(row.updatedAt)}
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
