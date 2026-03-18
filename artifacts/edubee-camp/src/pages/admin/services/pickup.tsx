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
import { Car, Pencil, ChevronRight } from "lucide-react";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const PAGE_SIZE = 10;
const STATUSES = ["pending", "confirmed", "in_transit", "completed", "cancelled"];

function StatusBadge({ status }: { status?: string | null }) {
  const s = (status ?? "pending").toLowerCase();
  const map: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800", confirmed: "bg-blue-100 text-blue-800",
    in_transit: "bg-purple-100 text-purple-800", completed: "bg-green-100 text-green-800", cancelled: "bg-red-100 text-red-800",
  };
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${map[s] ?? "bg-gray-100 text-gray-700"}`}>{s.replace(/_/g, " ")}</span>;
}

interface Rec {
  id: string; contractId?: string | null; studentName?: string | null;
  pickupType?: string | null; fromLocation?: string | null; toLocation?: string | null;
  pickupDatetime?: string | null; vehicleType?: string | null; driverName?: string | null;
  driverPhone?: string | null; flightNumber?: string | null; specialNotes?: string | null; status?: string | null;
}

export default function PickupManagement() {
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

  const queryKey = ["services-pickup", { search, status: activeStatus, page }];
  const { data: resp, isLoading } = useQuery({
    queryKey,
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (search) params.set("search", search);
      if (activeStatus !== "all") params.set("status", activeStatus);
      return axios.get(`${BASE}/api/services/pickup?${params}`).then(r => r.data);
    },
  });
  const rows: Rec[] = resp?.data ?? [];
  const total: number = resp?.meta?.total ?? rows.length;

  const saveMutation = useMutation({
    mutationFn: (payload: Partial<Rec>) => axios.put(`${BASE}/api/services/pickup/${selected!.id}`, payload).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["services-pickup"] }); toast({ title: "Saved successfully" }); setEditing(false); },
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
              {["Contract", "Student", "Type", "From", "To", "Pickup Time", "Driver", "Status", ""].map(h => (
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
                <Car className="w-8 h-8 mx-auto mb-3 opacity-30" />No pickup records found
              </td></tr>
            ) : rows.map(r => (
              <tr key={r.id} className="hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => { setSelected(r); setForm({ ...r }); setEditing(false); }}>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.contractId?.slice(0, 8) ?? "—"}</td>
                <td className="px-4 py-3 font-medium text-foreground">{r.studentName ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground capitalize">{r.pickupType ?? "—"}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground max-w-[100px] truncate">{r.fromLocation ?? "—"}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground max-w-[100px] truncate">{r.toLocation ?? "—"}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{r.pickupDatetime ? format(new Date(r.pickupDatetime), "MMM d, HH:mm") : "—"}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{r.driverName ?? "—"}</td>
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
            <SheetTitle className="flex items-center gap-2"><Car className="w-4 h-4 text-[#F08301]" /> Pickup Record</SheetTitle>
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
                    ["Student", selected.studentName], ["Pickup Type", selected.pickupType],
                    ["From", selected.fromLocation], ["To", selected.toLocation],
                    ["Pickup Time", selected.pickupDatetime ? format(new Date(selected.pickupDatetime), "MMM d, yyyy HH:mm") : null],
                    ["Vehicle", selected.vehicleType], ["Driver", selected.driverName],
                    ["Driver Phone", selected.driverPhone], ["Flight No.", selected.flightNumber],
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
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">From</Label><Input value={form.fromLocation ?? ""} onChange={e => fld("fromLocation")(e.target.value)} className="mt-1 h-8 text-sm" /></div>
                    <div><Label className="text-xs">To</Label><Input value={form.toLocation ?? ""} onChange={e => fld("toLocation")(e.target.value)} className="mt-1 h-8 text-sm" /></div>
                  </div>
                  <div><Label className="text-xs">Pickup Date/Time</Label><Input type="datetime-local" value={form.pickupDatetime?.slice(0, 16) ?? ""} onChange={e => fld("pickupDatetime")(e.target.value)} className="mt-1 h-8 text-sm" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">Driver Name</Label><Input value={form.driverName ?? ""} onChange={e => fld("driverName")(e.target.value)} className="mt-1 h-8 text-sm" /></div>
                    <div><Label className="text-xs">Driver Phone</Label><Input value={form.driverPhone ?? ""} onChange={e => fld("driverPhone")(e.target.value)} className="mt-1 h-8 text-sm" /></div>
                  </div>
                  <div><Label className="text-xs">Flight Number</Label><Input value={form.flightNumber ?? ""} onChange={e => fld("flightNumber")(e.target.value)} className="mt-1 h-8 text-sm" /></div>
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
