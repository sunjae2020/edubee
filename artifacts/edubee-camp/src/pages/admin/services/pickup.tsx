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
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Car, Pencil, MapPin } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  assigned: "bg-blue-100 text-blue-800 border-blue-200",
  "en-route": "bg-purple-100 text-purple-800 border-purple-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

function StatusBadge({ status }: { status?: string | null }) {
  const s = (status ?? "pending").toLowerCase();
  return <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border capitalize ${STATUS_COLORS[s] ?? "bg-gray-100 text-gray-700 border-gray-200"}`}>{s.replace(/-/g, " ")}</span>;
}

interface Rec { id: string; contractId?: string | null; driverId?: string | null; pickupType?: string | null; fromLocation?: string | null; toLocation?: string | null; pickupDatetime?: string | null; vehicleInfo?: string | null; driverNotes?: string | null; status?: string | null; }

export default function PickupManagement() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selected, setSelected] = useState<Rec | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Rec>>({});

  const isAdmin = ["super_admin", "admin", "camp_coordinator"].includes(user?.role ?? "");

  const { data, isLoading } = useQuery({
    queryKey: ["services-pickup"],
    queryFn: () => axios.get(`${BASE}/api/services/pickup`).then(r => r.data),
  });
  const rows: Rec[] = data?.data ?? [];

  const saveMutation = useMutation({
    mutationFn: (payload: Partial<Rec>) => axios.put(`${BASE}/api/services/pickup/${selected!.id}`, payload).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["services-pickup"] }); toast({ title: "Saved successfully" }); setEditing(false); },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  function openSheet(r: Rec) { setSelected(r); setForm({ ...r }); setEditing(false); }
  const fld = (k: keyof Rec) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-lg bg-[#F08301]/10 flex items-center justify-center"><Car className="w-5 h-5 text-[#F08301]" /></div>
        <div><h1 className="text-lg font-bold">Pickup Management</h1><p className="text-xs text-muted-foreground">Airport & location transfers for students</p></div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground"><Car className="w-10 h-10 mx-auto mb-3 opacity-30" /><p className="text-sm">No pickup records found</p></div>
      ) : (
        <div className="rounded-lg border overflow-x-auto bg-white">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/30">
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contract</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">From</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">To</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Datetime</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vehicle</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
            </tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20 cursor-pointer transition-colors" onClick={() => openSheet(r)}>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.contractId?.slice(0, 8) ?? "—"}</td>
                  <td className="px-4 py-3"><span className="px-1.5 py-0.5 bg-muted rounded text-xs font-medium capitalize">{r.pickupType ?? "—"}</span></td>
                  <td className="px-4 py-3 text-sm max-w-[120px] truncate">{r.fromLocation ?? "—"}</td>
                  <td className="px-4 py-3 text-sm max-w-[120px] truncate">{r.toLocation ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{r.pickupDatetime ? new Date(r.pickupDatetime).toLocaleString("en-AU", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                  <td className="px-4 py-3 text-xs">{r.vehicleInfo ?? "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Sheet open={!!selected} onOpenChange={o => { if (!o) { setSelected(null); setEditing(false); } }}>
        <SheetContent className="w-[520px] sm:max-w-[520px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2"><Car className="w-4 h-4 text-[#F08301]" /> Pickup Record</SheetTitle>
            <SheetDescription className="text-xs">Contract: {selected?.contractId?.slice(0, 8)}</SheetDescription>
          </SheetHeader>
          {selected && (
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <StatusBadge status={selected.status} />
                {!editing && (
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { setForm({ ...selected }); setEditing(true); }}>
                    <Pencil className="w-3 h-3" /> Edit
                  </Button>
                )}
              </div>
              {!editing ? (
                <dl className="space-y-3">
                  {[
                    ["Type", selected.pickupType],
                    ["From", selected.fromLocation], ["To", selected.toLocation],
                    ["Datetime", selected.pickupDatetime ? new Date(selected.pickupDatetime).toLocaleString("en-AU") : null],
                    ["Vehicle Info", selected.vehicleInfo],
                    ["Driver Notes", selected.driverNotes],
                  ].map(([label, val]) => val && (
                    <div key={String(label)}><dt className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">{label}</dt><dd className="text-sm">{String(val)}</dd></div>
                  ))}
                </dl>
              ) : (
                <div className="space-y-3">
                  {isAdmin && (
                    <>
                      <div><Label className="text-xs">Pickup Type</Label>
                        <Select value={form.pickupType ?? ""} onValueChange={v => fld("pickupType")(v)}>
                          <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select type…" /></SelectTrigger>
                          <SelectContent>{["airport-arrival","airport-departure","hotel-to-school","school-to-hotel","custom"].map(t => <SelectItem key={t} value={t}>{t.replace(/-/g, " ")}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label className="text-xs">From</Label><Input value={form.fromLocation ?? ""} onChange={e => fld("fromLocation")(e.target.value)} className="mt-1 h-8 text-sm" /></div>
                      <div><Label className="text-xs">To</Label><Input value={form.toLocation ?? ""} onChange={e => fld("toLocation")(e.target.value)} className="mt-1 h-8 text-sm" /></div>
                      <div><Label className="text-xs">Pickup Date & Time</Label><Input type="datetime-local" value={form.pickupDatetime?.slice(0, 16) ?? ""} onChange={e => fld("pickupDatetime")(e.target.value)} className="mt-1 h-8 text-sm" /></div>
                    </>
                  )}
                  <div><Label className="text-xs">Vehicle Info</Label><Input value={form.vehicleInfo ?? ""} onChange={e => fld("vehicleInfo")(e.target.value)} className="mt-1 h-8 text-sm" placeholder="e.g. Toyota HiAce - ABC123" /></div>
                  <div><Label className="text-xs">Driver Notes</Label><Textarea value={form.driverNotes ?? ""} onChange={e => fld("driverNotes")(e.target.value)} className="mt-1 text-sm" rows={3} /></div>
                  <div><Label className="text-xs">Status</Label>
                    <Select value={form.status ?? "pending"} onValueChange={v => fld("status")(v)}>
                      <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>{["pending","assigned","en-route","completed","cancelled"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
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
