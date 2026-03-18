import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { ListPagination } from "@/components/ui/list-pagination";
import { useToast } from "@/hooks/use-toast";
import { Building2, Pencil, ChevronRight } from "lucide-react";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const PAGE_SIZE = 10;
const STATUSES = ["pending", "confirmed", "checked_in", "checked_out", "cancelled"];

function StatusBadge({ status }: { status?: string | null }) {
  const s = (status ?? "pending").toLowerCase();
  const map: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800", confirmed: "bg-blue-100 text-blue-800",
    checked_in: "bg-purple-100 text-purple-800", checked_out: "bg-green-100 text-green-800", cancelled: "bg-red-100 text-red-800",
  };
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${map[s] ?? "bg-gray-100 text-gray-700"}`}>{s.replace(/_/g, " ")}</span>;
}

interface Rec {
  id: string; contractId?: string | null; studentName?: string | null;
  roomType?: string | null; confirmationNo?: string | null;
  checkinDate?: string | null; checkoutDate?: string | null;
  specialRequests?: string | null; actualCheckin?: string | null;
  actualCheckout?: string | null; status?: string | null;
}

export default function HotelManagement() {
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

  const queryKey = ["services-hotel", { search, status: activeStatus, page }];
  const { data: resp, isLoading } = useQuery({
    queryKey,
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (search) params.set("search", search);
      if (activeStatus !== "all") params.set("status", activeStatus);
      return axios.get(`${BASE}/api/services/hotel?${params}`).then(r => r.data);
    },
  });
  const rows: Rec[] = resp?.data ?? [];
  const total: number = resp?.meta?.total ?? rows.length;

  const saveMutation = useMutation({
    mutationFn: (payload: Partial<Rec>) => axios.put(`${BASE}/api/services/hotel/${selected!.id}`, payload).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["services-hotel"] }); toast({ title: "Saved successfully" }); setEditing(false); },
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
              {["Contract", "Student", "Room Type", "Confirmation", "Check-in", "Check-out", "Status", ""].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              [...Array(PAGE_SIZE)].map((_, i) => (
                <tr key={i}>{[...Array(8)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>)}</tr>
              ))
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-16 text-center text-muted-foreground text-sm">
                <Building2 className="w-8 h-8 mx-auto mb-3 opacity-30" />No hotel records found
              </td></tr>
            ) : rows.map(r => (
              <tr key={r.id} className="hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => { setSelected(r); setForm({ ...r }); setEditing(false); }}>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.contractId?.slice(0, 8) ?? "—"}</td>
                <td className="px-4 py-3 font-medium text-foreground">{r.studentName ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.roomType ?? "—"}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.confirmationNo ?? "—"}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{r.checkinDate ? format(new Date(r.checkinDate), "MMM d, yyyy") : "—"}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{r.checkoutDate ? format(new Date(r.checkoutDate), "MMM d, yyyy") : "—"}</td>
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
            <SheetTitle className="flex items-center gap-2"><Building2 className="w-4 h-4 text-[#F08301]" /> Hotel Record</SheetTitle>
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
                    ["Student", selected.studentName], ["Room Type", selected.roomType],
                    ["Confirmation No.", selected.confirmationNo],
                    ["Check-in", selected.checkinDate ? format(new Date(selected.checkinDate), "MMM d, yyyy") : null],
                    ["Check-out", selected.checkoutDate ? format(new Date(selected.checkoutDate), "MMM d, yyyy") : null],
                    ["Actual Check-in", selected.actualCheckin ? format(new Date(selected.actualCheckin), "MMM d, yyyy HH:mm") : null],
                    ["Actual Check-out", selected.actualCheckout ? format(new Date(selected.actualCheckout), "MMM d, yyyy HH:mm") : null],
                    ["Special Requests", selected.specialRequests],
                  ].map(([label, val]) => val && (
                    <div key={String(label)}>
                      <dt className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">{label}</dt>
                      <dd className="text-sm text-foreground">{String(val)}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <div className="space-y-3">
                  <div><Label className="text-xs">Room Type</Label><Input value={form.roomType ?? ""} onChange={e => fld("roomType")(e.target.value)} className="mt-1 h-8 text-sm" /></div>
                  <div><Label className="text-xs">Confirmation No.</Label><Input value={form.confirmationNo ?? ""} onChange={e => fld("confirmationNo")(e.target.value)} className="mt-1 h-8 text-sm" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">Check-in</Label><Input type="date" value={form.checkinDate ?? ""} onChange={e => fld("checkinDate")(e.target.value)} className="mt-1 h-8 text-sm" /></div>
                    <div><Label className="text-xs">Check-out</Label><Input type="date" value={form.checkoutDate ?? ""} onChange={e => fld("checkoutDate")(e.target.value)} className="mt-1 h-8 text-sm" /></div>
                  </div>
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
