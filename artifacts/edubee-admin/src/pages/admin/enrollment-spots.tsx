import { Fragment, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { differenceInDays } from "date-fns";
import { ListChecks, Plus, Pencil, Trash2, X } from "lucide-react";
import { SortableTh, useSortState, useSorted } from "@/components/ui/sortable-th";
import { formatDate } from "@/lib/date-format";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface EnrollmentSpotRow {
  id: string;
  packageGroupId: string | null;
  packageGroupName: string | null;
  enrollName: string | null;
  gradeLabel: string;
  gradeOrder: number | null;
  totalSpots: number;
  reservedSpots: number | null;
  manualReserved: number | null;
  enrollCount: number;
  available: number;
  status: string | null;
  startDate: string | null;
  endDate: string | null;
  dobRangeStart: string | null;
  dobRangeEnd: string | null;
  instituteMgt: string | null;
  note: string | null;
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

interface PackageGroupOption {
  id: string;
  nameEn: string;
}

const EMPTY_FORM = {
  packageGroupId: "",
  enrollName: "",
  gradeLabel: "",
  gradeOrder: "0",
  totalSpots: "0",
  status: "available",
  startDate: "",
  endDate: "",
  dobRangeStart: "",
  dobRangeEnd: "",
  note: "",
};

function formatPeriod(start: string | null, end: string | null): string {
  if (!start && !end) return "—";
  const fmt = (d: string) => {
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`;
  };
  if (start && end) return `${fmt(start)} - ${fmt(end)}`;
  if (start) return `From ${fmt(start)}`;
  return `Until ${fmt(end!)}`;
}

function formatDuration(start: string | null, end: string | null): string {
  if (!start || !end) return "—";
  try {
    const days = differenceInDays(new Date(end), new Date(start));
    if (days < 0) return "—";
    if (days === 0) return "1 day";
    if (days % 7 === 0) {
      const weeks = days / 7;
      return `${weeks} ${weeks === 1 ? "Week" : "Weeks"}`;
    }
    return `${days} ${days === 1 ? "day" : "days"}`;
  } catch {
    return "—";
  }
}

function formatDobRange(start: string | null, end: string | null): string {
  if (!start && !end) return "—";
  const fmt = (d: string) => {
    const dt = new Date(d);
    return `${dt.getMonth() + 1}/${dt.getFullYear()}`;
  };
  if (start && end) return `${fmt(start)} - ${fmt(end)}`;
  if (start) return `From ${fmt(start)}`;
  return `Until ${fmt(end!)}`;
}

function isoDate(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function dateInputVal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

// ── Spot Dialog ────────────────────────────────────────────────────────────
function SpotDialog({
  open,
  editRow,
  packageGroups,
  defaultGroupId,
  onClose,
  onSave,
}: {
  open: boolean;
  editRow: EnrollmentSpotRow | null;
  packageGroups: PackageGroupOption[];
  defaultGroupId?: string;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>, id?: string) => void;
}) {
  const [form, setForm] = useState<typeof EMPTY_FORM>(() =>
    editRow
      ? {
          packageGroupId: editRow.packageGroupId ?? "",
          enrollName: editRow.enrollName ?? "",
          gradeLabel: editRow.gradeLabel ?? "",
          gradeOrder: String(editRow.gradeOrder ?? 0),
          totalSpots: String(editRow.totalSpots ?? 0),
          status: editRow.status ?? "available",
          startDate: dateInputVal(editRow.startDate),
          endDate: dateInputVal(editRow.endDate),
          dobRangeStart: dateInputVal(editRow.dobRangeStart),
          dobRangeEnd: dateInputVal(editRow.dobRangeEnd),
          note: editRow.note ?? "",
        }
      : { ...EMPTY_FORM, packageGroupId: defaultGroupId ?? "" }
  );

  const set = (k: keyof typeof EMPTY_FORM, v: string) =>
    setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.packageGroupId || !form.gradeLabel || !form.totalSpots) return;
    onSave(
      {
        packageGroupId: form.packageGroupId,
        enrollName: form.enrollName || null,
        gradeLabel: form.gradeLabel,
        gradeOrder: Number(form.gradeOrder),
        totalSpots: Number(form.totalSpots),
        status: form.status,
        startDate: isoDate(form.startDate),
        endDate: isoDate(form.endDate),
        dobRangeStart: isoDate(form.dobRangeStart),
        dobRangeEnd: isoDate(form.dobRangeEnd),
        note: form.note || null,
      },
      editRow?.id
    );
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editRow ? "Edit Enrollment Spot" : "Add Enrollment Spot"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {/* Package Group */}
          <div>
            <Label className="text-xs mb-1 block">Package Group *</Label>
            <Select value={form.packageGroupId} onValueChange={v => set("packageGroupId", v)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select package group…" />
              </SelectTrigger>
              <SelectContent>
                {packageGroups.map(g => (
                  <SelectItem key={g.id} value={g.id}>{g.nameEn}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Enroll Name */}
          <div>
            <Label className="text-xs mb-1 block">Enroll Name</Label>
            <Input
              className="h-9 text-sm"
              value={form.enrollName}
              onChange={e => set("enrollName", e.target.value)}
              placeholder="e.g. 2026 Aug-Melbourne_Oakleigh Schooling-Grade 1"
            />
          </div>

          {/* Year Level + Order */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label className="text-xs mb-1 block">Year Level / Grade *</Label>
              <Input
                className="h-9 text-sm"
                value={form.gradeLabel}
                onChange={e => set("gradeLabel", e.target.value)}
                placeholder="e.g. Grade 1, Steiner 5"
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Sort Order</Label>
              <Input
                type="number"
                className="h-9 text-sm"
                value={form.gradeOrder}
                onChange={e => set("gradeOrder", e.target.value)}
              />
            </div>
          </div>

          {/* Period */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs mb-1 block">Period Start</Label>
              <Input type="date" className="h-9 text-sm" value={form.startDate} onChange={e => set("startDate", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Period End</Label>
              <Input type="date" className="h-9 text-sm" value={form.endDate} onChange={e => set("endDate", e.target.value)} />
            </div>
          </div>

          {/* DOB Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs mb-1 block">DOB Range Start</Label>
              <Input type="date" className="h-9 text-sm" value={form.dobRangeStart} onChange={e => set("dobRangeStart", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs mb-1 block">DOB Range End</Label>
              <Input type="date" className="h-9 text-sm" value={form.dobRangeEnd} onChange={e => set("dobRangeEnd", e.target.value)} />
            </div>
          </div>

          {/* Total Spots + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs mb-1 block">Total Spots *</Label>
              <Input
                type="number"
                min={0}
                className="h-9 text-sm"
                value={form.totalSpots}
                onChange={e => set("totalSpots", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Status</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="waitlist">Waitlist</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Note */}
          <div>
            <Label className="text-xs mb-1 block">Note</Label>
            <Input
              className="h-9 text-sm"
              value={form.note}
              onChange={e => set("note", e.target.value)}
              placeholder="Optional note…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            className="bg-[#F5821F] hover:bg-[#d97706] text-white"
            onClick={handleSave}
            disabled={!form.packageGroupId || !form.gradeLabel || !form.totalSpots}
          >
            {editRow ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function EnrollmentSpots() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRow, setEditRow] = useState<EnrollmentSpotRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ data: EnrollmentSpotRow[] }>({
    queryKey: ["enrollment-spots"],
    queryFn: () => axios.get(`${BASE}/api/enrollment-spots`).then(r => r.data),
  });

  const { data: pgData } = useQuery<{ data: PackageGroupOption[] }>({
    queryKey: ["package-groups-options"],
    queryFn: () =>
      axios.get(`${BASE}/api/package-groups?limit=200`).then(r => {
        const raw = r.data?.data ?? r.data ?? [];
        return { data: raw.map((g: any) => ({ id: g.id, nameEn: g.nameEn })) };
      }),
  });

  const packageGroups = pgData?.data ?? [];

  const createMut = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      axios.post(`${BASE}/api/enrollment-spots`, payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["enrollment-spots"] });
      setDialogOpen(false);
      toast({ title: "Enrollment spot created" });
    },
    onError: () => toast({ title: "Failed to create spot", variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      axios.put(`${BASE}/api/enrollment-spots/${id}`, payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["enrollment-spots"] });
      setDialogOpen(false);
      toast({ title: "Enrollment spot updated" });
    },
    onError: () => toast({ title: "Failed to update spot", variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) =>
      axios.delete(`${BASE}/api/enrollment-spots/${id}`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["enrollment-spots"] });
      setDeletingId(null);
      toast({ title: "Enrollment spot deleted" });
    },
    onError: () => toast({ title: "Failed to delete spot", variant: "destructive" }),
  });

  const handleSave = (payload: Record<string, unknown>, id?: string) => {
    if (id) updateMut.mutate({ id, payload });
    else createMut.mutate(payload);
  };

  const { sortBy, sortDir, onSort } = useSortState("gradeOrder");
  const rows = data?.data ?? [];
  const sorted = useSorted(rows, sortBy, sortDir);

  const grouped: GroupedData[] = [];
  const groupMap = new Map<string, GroupedData>();
  for (const row of sorted) {
    const key = row.packageGroupId ?? "__ungrouped__";
    const name = row.packageGroupName ?? "Ungrouped";
    if (!groupMap.has(key)) {
      const g: GroupedData = { groupName: name, groupId: row.packageGroupId, rows: [], totalSpots: 0, totalEnrolled: 0, totalAvailable: 0 };
      groupMap.set(key, g);
      grouped.push(g);
    }
    const g = groupMap.get(key)!;
    g.rows.push(row);
    g.totalSpots += row.totalSpots ?? 0;
    g.totalEnrolled += row.enrollCount ?? 0;
    g.totalAvailable += row.available ?? 0;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Enrollment Spots</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Available spots per Package Group, broken down by year level.
          </p>
        </div>
        <Button
          size="sm"
          className="bg-[#F5821F] hover:bg-[#d97706] text-white gap-1.5"
          onClick={() => { setEditRow(null); setDialogOpen(true); }}
        >
          <Plus className="w-3.5 h-3.5" /> Add Spot
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <div className="bg-card rounded-xl border border-border py-24 text-center">
          <ListChecks className="mx-auto w-10 h-10 text-muted-foreground/40 mb-3" />
          <h3 className="font-semibold mb-1">No Enrollment Spots</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Configure enrollment spots for your Package Groups.
          </p>
          <Button
            size="sm"
            className="bg-[#F5821F] hover:bg-[#d97706] text-white gap-1.5"
            onClick={() => { setEditRow(null); setDialogOpen(true); }}
          >
            <Plus className="w-3.5 h-3.5" /> Add First Spot
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-x-auto bg-card">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <SortableTh col="enrollName" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Enroll Name</SortableTh>
                <SortableTh col="startDate" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Period</SortableTh>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Duration</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">DOB Range</th>
                <SortableTh col="totalSpots" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-center px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Total Spots</SortableTh>
                <SortableTh col="enrollCount" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-center px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Enroll No.</SortableTh>
                <SortableTh col="available" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-center px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Available</SortableTh>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Institute MGT</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Note</th>
                <SortableTh col="updatedAt" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Last Modified</SortableTh>
                <th className="px-4 py-3 w-16" />
              </tr>
            </thead>
            <tbody>
              {grouped.map((group) => (
                <Fragment key={group.groupId ?? group.groupName}>
                  {/* Group header row */}
                  <tr className="bg-orange-50/70 border-b border-border">
                    <td className="px-4 py-2.5 font-semibold text-sm text-foreground" colSpan={4}>
                      <div className="flex items-center gap-2">
                        <span>{group.groupName}</span>
                        <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold">
                          {group.rows.length}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-center font-semibold text-sm">{group.totalSpots}</td>
                    <td className="px-4 py-2.5 text-center font-semibold text-sm">{group.totalEnrolled}</td>
                    <td className="px-4 py-2.5 text-center font-semibold text-sm">
                      <span className={group.totalAvailable > 0 ? "text-emerald-600" : "text-red-500"}>
                        {group.totalAvailable}
                      </span>
                    </td>
                    <td colSpan={4} className="px-4 py-2.5" />
                  </tr>

                  {/* Spot rows */}
                  {group.rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-border last:border-b-0 hover:bg-orange-50/40 transition-colors"
                    >
                      {/* Enroll Name */}
                      <td className="px-4 py-2.5 pl-8">
                        <div className="font-medium text-foreground text-[13px]">
                          {row.enrollName ?? `${row.packageGroupName ?? ""} — ${row.gradeLabel}`}
                        </div>
                        <div className="text-[11px] text-muted-foreground">{row.gradeLabel}</div>
                      </td>

                      {/* Period */}
                      <td className="px-4 py-2.5 text-muted-foreground text-xs whitespace-nowrap">
                        {formatPeriod(row.startDate, row.endDate)}
                      </td>

                      {/* Duration */}
                      <td className="px-4 py-2.5 text-muted-foreground text-xs whitespace-nowrap">
                        {formatDuration(row.startDate, row.endDate)}
                      </td>

                      {/* DOB Range */}
                      <td className="px-4 py-2.5 text-muted-foreground text-xs whitespace-nowrap">
                        {formatDobRange(row.dobRangeStart, row.dobRangeEnd)}
                      </td>

                      {/* Total Spots */}
                      <td className="px-4 py-2.5 text-center font-mono font-semibold text-foreground">
                        {row.totalSpots ?? 0}
                      </td>

                      {/* Enroll No. */}
                      <td className="px-4 py-2.5 text-center font-mono font-semibold text-[#F5821F]">
                        {row.enrollCount ?? 0}
                      </td>

                      {/* Available */}
                      <td className="px-4 py-2.5 text-center">
                        <span
                          className="font-mono font-bold text-sm"
                          style={{ color: (row.available ?? 0) > 0 ? "#16a34a" : "#dc2626" }}
                        >
                          {Math.max(0, row.available ?? 0)}
                        </span>
                      </td>

                      {/* Institute MGT */}
                      <td className="px-4 py-2.5 max-w-[220px]">
                        {row.instituteMgt ? (
                          <div className="space-y-0.5">
                            {row.instituteMgt.split(", ").map((entry, i) => (
                              <div key={i} className="text-[11px] text-muted-foreground truncate" title={entry}>
                                {entry}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>

                      {/* Note */}
                      <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[160px]">
                        <span className="truncate block" title={row.note ?? ""}>
                          {row.note ?? "—"}
                        </span>
                      </td>

                      {/* Last Modified */}
                      <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(row.updatedAt)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => { setEditRow(row); setDialogOpen(true); }}
                            className="p-1.5 rounded hover:bg-orange-50 text-muted-foreground hover:text-[#F5821F] transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingId(row.id)}
                            className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Dialog */}
      {dialogOpen && (
        <SpotDialog
          open={dialogOpen}
          editRow={editRow}
          packageGroups={packageGroups}
          onClose={() => { setDialogOpen(false); setEditRow(null); }}
          onSave={handleSave}
        />
      )}

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deletingId} onOpenChange={v => !v && setDeletingId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Enrollment Spot?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently remove this enrollment spot. This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeletingId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deletingId && deleteMut.mutate(deletingId)}
              disabled={deleteMut.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
