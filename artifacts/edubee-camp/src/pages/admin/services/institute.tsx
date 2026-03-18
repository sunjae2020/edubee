import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { ListPagination } from "@/components/ui/list-pagination";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, Pencil, ChevronRight } from "lucide-react";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const PAGE_SIZE = 10;
const STATUSES = ["pending", "confirmed", "in_progress", "completed", "cancelled"];

function StatusBadge({ status }: { status?: string | null }) {
  const s = (status ?? "pending").toLowerCase();
  const map: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800", confirmed: "bg-blue-100 text-blue-800",
    in_progress: "bg-purple-100 text-purple-800", completed: "bg-green-100 text-green-800", cancelled: "bg-red-100 text-red-800",
  };
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${map[s] ?? "bg-gray-100 text-gray-700"}`}>{s.replace(/_/g, " ")}</span>;
}

interface Rec {
  id: string; contractId?: string | null; studentName?: string | null;
  programDetails?: string | null; startDate?: string | null; endDate?: string | null;
  totalHours?: number | null; englishLevelStart?: string | null; englishLevelEnd?: string | null;
  teacherComments?: string | null; status?: string | null; progressNotes?: string | null;
}

export default function InstituteManagement() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Rec | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Rec>>({});
  const isAdmin = ["super_admin", "admin", "camp_coordinator"].includes(user?.role ?? "");

  const queryKey = ["services-institute", { search, status: activeStatus, page }];
  const { data: resp, isLoading } = useQuery({
    queryKey,
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (search) params.set("search", search);
      if (activeStatus !== "all") params.set("status", activeStatus);
      return axios.get(`${BASE}/api/services/institute?${params}`).then(r => r.data);
    },
  });
  const rows: Rec[] = resp?.data ?? [];
  const total: number = resp?.meta?.total ?? rows.length;

  const saveMutation = useMutation({
    mutationFn: (payload: Partial<Rec>) => axios.put(`${BASE}/api/services/institute/${selected!.id}`, payload).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["services-institute"] }); toast({ title: "Saved successfully" }); setEditing(false); },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  const fld = (k: keyof Rec) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <ListToolbar
        search={search} onSearch={v => { setSearch(v); setPage(1); }}
        statuses={STATUSES} activeStatus={activeStatus} onStatusChange={s => { setActiveStatus(s); setPage(1); }}
        total={total} addLabel="Add Record" onAdd={() => toast({ title: "Coming soon" })}
      />

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {["Contract", "Student", "Program", "Start", "End", "Hours", "Level", "Status", ""].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              [...Array(PAGE_SIZE)].map((_, i) => (
                <tr key={i}>{[...Array(9)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>)}</tr>
              ))
            ) : rows.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-16 text-center text-muted-foreground text-sm">
                <GraduationCap className="w-8 h-8 mx-auto mb-3 opacity-30" />No institute records found
              </td></tr>
            ) : rows.map(r => (
              <tr key={r.id} className="hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => { setSelected(r); setForm({ ...r }); setEditing(false); }}>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.contractId?.slice(0, 8) ?? "—"}</td>
                <td className="px-4 py-3 font-medium text-foreground">{r.studentName ?? "—"}</td>
                <td className="px-4 py-3 max-w-[160px] truncate text-muted-foreground">{r.programDetails ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{r.startDate ? format(new Date(r.startDate), "MMM d, yyyy") : "—"}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{r.endDate ? format(new Date(r.endDate), "MMM d, yyyy") : "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.totalHours ? `${r.totalHours}h` : "—"}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{r.englishLevelStart ?? "?"} → {r.englishLevelEnd ?? "?"}</td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-muted-foreground" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ListPagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />

      <Sheet open={!!selected} onOpenChange={o => { if (!o) { setSelected(null); setEditing(false); } }}>
        <SheetContent className="w-[520px] sm:max-w-[520px] overflow-y-auto bg-background">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2"><GraduationCap className="w-4 h-4 text-[#F08301]" /> Institute Record</SheetTitle>
            <SheetDescription className="text-xs">{selected?.studentName ?? "—"} · Contract: {selected?.contractId?.slice(0, 8)}</SheetDescription>
          </SheetHeader>
          {selected && (
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <StatusBadge status={selected.status} />
                {!editing && isAdmin && (
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { setForm({ ...selected }); setEditing(true); }}>
                    <Pencil className="w-3 h-3" /> Edit
                  </Button>
                )}
              </div>
              {!editing ? (
                <dl className="space-y-3">
                  {[
                    ["Student", selected.studentName], ["Program Details", selected.programDetails],
                    ["Start Date", selected.startDate ? format(new Date(selected.startDate), "MMM d, yyyy") : null],
                    ["End Date", selected.endDate ? format(new Date(selected.endDate), "MMM d, yyyy") : null],
                    ["Total Hours", selected.totalHours ? `${selected.totalHours}h` : null],
                    ["Level Start", selected.englishLevelStart], ["Level End", selected.englishLevelEnd],
                    ["Teacher Comments", selected.teacherComments], ["Progress Notes", selected.progressNotes],
                  ].map(([label, val]) => val && (
                    <div key={String(label)}>
                      <dt className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">{label}</dt>
                      <dd className="text-sm text-foreground">{String(val)}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <div className="space-y-3">
                  <div><Label className="text-xs">Program Details</Label><Textarea value={form.programDetails ?? ""} onChange={e => fld("programDetails")(e.target.value)} className="mt-1 text-sm" rows={2} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">Start Date</Label><Input type="date" value={form.startDate ?? ""} onChange={e => fld("startDate")(e.target.value)} className="mt-1 h-8 text-sm" /></div>
                    <div><Label className="text-xs">End Date</Label><Input type="date" value={form.endDate ?? ""} onChange={e => fld("endDate")(e.target.value)} className="mt-1 h-8 text-sm" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">Total Hours</Label><Input type="number" value={form.totalHours ?? ""} onChange={e => setForm(f => ({ ...f, totalHours: Number(e.target.value) }))} className="mt-1 h-8 text-sm" /></div>
                    <div><Label className="text-xs">Level Start</Label><Input value={form.englishLevelStart ?? ""} onChange={e => fld("englishLevelStart")(e.target.value)} className="mt-1 h-8 text-sm" placeholder="e.g. A2" /></div>
                  </div>
                  <div><Label className="text-xs">Level End</Label><Input value={form.englishLevelEnd ?? ""} onChange={e => fld("englishLevelEnd")(e.target.value)} className="mt-1 h-8 text-sm" placeholder="e.g. B1" /></div>
                  <div><Label className="text-xs">Teacher Comments</Label><Textarea value={form.teacherComments ?? ""} onChange={e => fld("teacherComments")(e.target.value)} className="mt-1 text-sm" rows={3} /></div>
                  <div><Label className="text-xs">Progress Notes</Label><Textarea value={form.progressNotes ?? ""} onChange={e => fld("progressNotes")(e.target.value)} className="mt-1 text-sm" rows={2} /></div>
                  <div><Label className="text-xs">Status</Label>
                    <Select value={form.status ?? "pending"} onValueChange={v => fld("status")(v)}>
                      <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" className="flex-1 bg-[#F08301] hover:bg-[#d97706] text-white" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
                      {saveMutation.isPending ? "Saving…" : "Save Changes"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
