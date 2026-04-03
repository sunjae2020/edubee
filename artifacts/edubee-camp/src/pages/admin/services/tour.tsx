import { useState, useEffect } from "react";
import { formatDate, formatDateTime } from "@/lib/date-format";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { NotePanel } from "@/components/shared/NotePanel";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { TableFooter } from "@/components/ui/table-footer";
import { useToast } from "@/hooks/use-toast";
import { MapIcon, Pencil, ChevronRight, FileText, ArrowUpRight, CalendarRange, Banknote } from "lucide-react";
import { format } from "date-fns";
import { SortableTh, useSortState, useSorted } from "@/components/ui/sortable-th";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const PAGE_SIZE = 10;
const STATUSES = ["pending", "confirmed", "in_progress", "completed", "cancelled"];

const CONTRACT_STATUS_COLORS: Record<string, string> = {
  draft: "bg-[#F4F3F1] text-[#57534E]", active: "bg-[#DCFCE7] text-[#16A34A]",
  signed: "bg-[--e-orange-lt] text-[--e-orange]", completed: "bg-[#DCFCE7] text-[#16A34A]",
  cancelled: "bg-[#FEF2F2] text-[#DC2626]", suspended: "bg-[#FEF9C3] text-[#CA8A04]",
};

function StatusBadge({ status }: { status?: string | null }) {
  const s = (status ?? "pending").toLowerCase();
  const map: Record<string, string> = {
    pending: "bg-[#FEF9C3] text-[#CA8A04]", confirmed: "bg-[--e-orange-lt] text-[--e-orange]",
    in_progress: "bg-[--e-orange-lt] text-[--e-orange]", completed: "bg-[#DCFCE7] text-[#16A34A]", cancelled: "bg-[#FEF2F2] text-[#DC2626]",
  };
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${map[s] ?? "bg-[#F4F3F1] text-[#57534E]"}`}>{s.replace(/_/g, " ")}</span>;
}

interface Rec {
  id: string; contractId?: string | null; clientName?: string | null; studentName?: string | null; clientEmail?: string | null;
  contractNumber?: string | null; contractStatus?: string | null;
  contractStartDate?: string | null; contractEndDate?: string | null;
  totalAmount?: string | null; currency?: string | null;
  tourName?: string | null; tourDate?: string | null; meetingPoint?: string | null;
  guideId?: string | null; groupSize?: number | null; specialNotes?: string | null; status?: string | null;
}

function ContractCard({ rec, onViewContract }: { rec: Rec; onViewContract: () => void }) {
  if (!rec.contractId) return null;
  const cs = (rec.contractStatus ?? "draft").toLowerCase();
  const ccls = CONTRACT_STATUS_COLORS[cs] ?? "bg-[#F4F3F1] text-[#57534E]";
  const amt = rec.totalAmount ? Number(rec.totalAmount) : null;
  const sym = rec.currency === "AUD" ? "A$" : (rec.currency ?? "A$");
  return (
    <div className="rounded-lg border border-[--e-orange]/30 bg-[--e-orange]/5 p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-[--e-orange]" />
          <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Contract</span>
          {rec.contractNumber && <span className="font-mono text-xs font-bold text-[--e-orange]">{rec.contractNumber}</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${ccls}`}>{cs}</span>
          <button onClick={onViewContract} className="flex items-center gap-0.5 text-[11px] text-[--e-orange] hover:underline font-medium">
            View <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-muted-foreground">Client</span>
          <p className="font-medium text-foreground truncate">{rec.clientName ?? rec.studentName ?? "—"}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Client Email</span>
          <p className="font-medium text-foreground truncate">{rec.clientEmail ?? "—"}</p>
        </div>
        {(rec.contractStartDate || rec.contractEndDate) && (
          <div className="flex items-start gap-1 col-span-2">
            <CalendarRange className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
            <span className="text-muted-foreground">
              {formatDate(rec.contractStartDate)}
              {" · "}
              {formatDate(rec.contractEndDate)}
            </span>
          </div>
        )}
        {amt != null && (
          <div className="flex items-center gap-1 col-span-2">
            <Banknote className="w-3 h-3 text-muted-foreground shrink-0" />
            <span className="font-semibold text-foreground">{sym}{amt.toLocaleString("en-AU", { minimumFractionDigits: 2 })}</span>
            {rec.currency && rec.currency !== "AUD" && <span className="text-muted-foreground ml-1">{rec.currency}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TourManagement() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { sortBy, sortDir, onSort } = useSortState("createdOn", "desc");
  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<Rec | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Rec>>({});
  const isAdmin = ["super_admin","admin","admission","team_manager","camp_coordinator"].includes(user?.role ?? "");

  useEffect(() => { setPage(1); }, [sortBy, sortDir]);

  const queryKey = ["services-tour", { search, status: activeStatus, page, pageSize, sortBy, sortDir }];
  const { data: resp, isLoading } = useQuery({
    queryKey,
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
      if (search) params.set("search", search);
      if (activeStatus !== "all") params.set("status", activeStatus);
      params.set("sortBy",  sortBy);
      params.set("sortDir", sortDir);
      return axios.get(`${BASE}/api/services/tour?${params}`).then(r => r.data);
    },
  });
  const rows: Rec[] = resp?.data ?? [];
  const sorted = useSorted(rows, sortBy, sortDir);
  const total: number = resp?.meta?.total ?? rows.length;

  const saveMutation = useMutation({
    mutationFn: (payload: Partial<Rec>) => axios.put(`${BASE}/api/services/tour/${selected!.id}`, payload).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["services-tour"] }); toast({ title: "Saved successfully" }); setEditing(false); },
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

      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <>
              <SortableTh key="Contract #" col="contractNumber" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contract #</SortableTh>
              <SortableTh key="Client" col="clientName" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Client</SortableTh>
              <SortableTh key="Tour Name" col="tourName" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tour Name</SortableTh>
              <SortableTh key="Date" col="tourDate" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</SortableTh>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Meeting Point</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Group Size</th>
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
                <tr key={i}>{[...Array(10)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>)}</tr>
              ))
            ) : rows.length === 0 ? (
              <tr><td colSpan={10} className="px-4 py-16 text-center text-muted-foreground text-sm">
                <MapIcon className="w-8 h-8 mx-auto mb-3 opacity-30" />No tour records found
              </td></tr>
            ) : sorted.map(r => (
              <tr key={r.id} className="hover:bg-[--e-orange-lt] transition-colors cursor-pointer" onClick={() => navigate(`${BASE}/admin/services/tour/${r.id}`)}>
                <td className="px-4 py-3 font-mono text-xs font-semibold text-[--e-orange]">{r.contractNumber ?? r.contractId?.slice(0, 8) ?? "—"}</td>
                <td className="px-4 py-3 font-medium text-foreground">{r.clientName ?? r.studentName ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.tourName ?? "—"}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(r.tourDate)}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground max-w-[120px] truncate">{r.meetingPoint ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.groupSize ?? "—"}</td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{formatDate(r.createdAt)}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{formatDate(r.updatedAt)}</td>
                <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-muted-foreground" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TableFooter page={page} pageSize={pageSize} total={total} label="records" onPageChange={setPage} onPageSizeChange={v => { setPageSize(v); setPage(1); }} />

      <Sheet open={!!selected} onOpenChange={o => { if (!o) { setSelected(null); setEditing(false); } }}>
        <SheetContent className="w-[520px] sm:max-w-[520px] overflow-y-auto bg-background">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2"><MapIcon className="w-4 h-4 text-[--e-orange]" /> Tour Record</SheetTitle>
            <SheetDescription className="text-xs">{selected?.tourName ?? "Tour service detail"}</SheetDescription>
          </SheetHeader>
          {selected && (
            <div className="mt-4 space-y-4">
              <ContractCard rec={selected} onViewContract={() => { const id = selected.contractId; setSelected(null); navigate(`${BASE}/admin/crm/contracts${id ? `?contractId=${id}` : ""}`); }} />
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
                    ["Tour Name", selected.tourName],
                    ["Date", selected.tourDate ? formatDate(selected.tourDate) : null],
                    ["Meeting Point", selected.meetingPoint],
                    ["Group Size", selected.groupSize ? String(selected.groupSize) : null],
                    ["Notes", selected.specialNotes],
                  ].map(([label, val]) => val && (
                    <div key={String(label)}>
                      <dt className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">{label}</dt>
                      <dd className="text-sm text-foreground">{String(val)}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <div className="space-y-3">
                  <div><Label className="text-xs">Tour Name</Label><Input value={form.tourName ?? ""} onChange={e => fld("tourName")(e.target.value)} className="mt-1 h-8 text-sm" /></div>
                  <div><Label className="text-xs">Tour Date</Label><Input type="date" value={form.tourDate ?? ""} onChange={e => fld("tourDate")(e.target.value)} className="mt-1 h-8 text-sm" /></div>
                  <div><Label className="text-xs">Meeting Point</Label><Input value={form.meetingPoint ?? ""} onChange={e => fld("meetingPoint")(e.target.value)} className="mt-1 h-8 text-sm" /></div>
                  <div><Label className="text-xs">Group Size</Label><Input type="number" value={form.groupSize ?? ""} onChange={e => setForm(f => ({ ...f, groupSize: Number(e.target.value) }))} className="mt-1 h-8 text-sm" /></div>
                  <div><Label className="text-xs">Notes</Label><Textarea value={form.specialNotes ?? ""} onChange={e => fld("specialNotes")(e.target.value)} className="mt-1 text-sm" rows={3} /></div>
                  <div><Label className="text-xs">Status</Label>
                    <Select value={form.status ?? "pending"} onValueChange={v => fld("status")(v)}>
                      <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" className="flex-1 bg-[--e-orange] hover:bg-[#d97706] text-white" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
                      {saveMutation.isPending ? "Saving…" : "Save Changes"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                  </div>
                </div>
              )}
              <div className="border-t border-border pt-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Notes</h4>
                <NotePanel
                  entityType="tour_mgt"
                  entityId={selected.id}
                  allowedNoteTypes={["internal", "guide"]}
                  defaultVisibility="internal"
                />
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
