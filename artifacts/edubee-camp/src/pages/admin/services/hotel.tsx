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
import { Hotel, Pencil } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  "in-progress": "bg-purple-100 text-purple-800 border-purple-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

function StatusBadge({ status }: { status?: string | null }) {
  const s = (status ?? "pending").toLowerCase();
  return <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border capitalize ${STATUS_COLORS[s] ?? "bg-gray-100 text-gray-700 border-gray-200"}`}>{s.replace(/-/g, " ")}</span>;
}

interface Rec { id: string; contractId?: string | null; hotelId?: string | null; roomType?: string | null; checkinDate?: string | null; checkinTime?: string | null; checkoutDate?: string | null; checkoutTime?: string | null; confirmationNo?: string | null; guestNotes?: string | null; status?: string | null; }

export default function HotelManagement() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selected, setSelected] = useState<Rec | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Rec>>({});

  const isAdmin = ["super_admin", "admin", "camp_coordinator"].includes(user?.role ?? "");

  const { data, isLoading } = useQuery({
    queryKey: ["services-hotel"],
    queryFn: () => axios.get(`${BASE}/api/services/hotel`).then(r => r.data),
  });
  const rows: Rec[] = data?.data ?? [];

  const saveMutation = useMutation({
    mutationFn: (payload: Partial<Rec>) => axios.put(`${BASE}/api/services/hotel/${selected!.id}`, payload).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["services-hotel"] }); toast({ title: "Saved successfully" }); setEditing(false); },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  function openSheet(r: Rec) { setSelected(r); setForm({ ...r }); setEditing(false); }
  const fld = (k: keyof Rec) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-lg bg-[#F08301]/10 flex items-center justify-center"><Hotel className="w-5 h-5 text-[#F08301]" /></div>
        <div><h1 className="text-lg font-bold">Hotel Management</h1><p className="text-xs text-muted-foreground">Accommodation booking & room assignment tracking</p></div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground"><Hotel className="w-10 h-10 mx-auto mb-3 opacity-30" /><p className="text-sm">No hotel records found</p></div>
      ) : (
        <div className="rounded-lg border overflow-x-auto bg-white">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/30">
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contract</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Room Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Check-in</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Check-out</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Confirmation</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
            </tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20 cursor-pointer transition-colors" onClick={() => openSheet(r)}>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.contractId?.slice(0, 8) ?? "—"}</td>
                  <td className="px-4 py-3 font-medium">{r.roomType ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.checkinDate ?? "—"}{r.checkinTime ? ` ${r.checkinTime}` : ""}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.checkoutDate ?? "—"}{r.checkoutTime ? ` ${r.checkoutTime}` : ""}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.confirmationNo ?? "—"}</td>
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
            <SheetTitle className="flex items-center gap-2"><Hotel className="w-4 h-4 text-[#F08301]" /> Hotel Record</SheetTitle>
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
                    ["Room Type", selected.roomType],
                    ["Check-in", selected.checkinDate ? `${selected.checkinDate}${selected.checkinTime ? ` at ${selected.checkinTime}` : ""}` : null],
                    ["Check-out", selected.checkoutDate ? `${selected.checkoutDate}${selected.checkoutTime ? ` at ${selected.checkoutTime}` : ""}` : null],
                    ["Confirmation #", selected.confirmationNo],
                    ["Guest Notes", selected.guestNotes],
                  ].map(([label, val]) => val && (
                    <div key={String(label)}><dt className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">{label}</dt><dd className="text-sm">{String(val)}</dd></div>
                  ))}
                </dl>
              ) : (
                <div className="space-y-3">
                  <div><Label className="text-xs">Room Type</Label><Input value={form.roomType ?? ""} onChange={e => fld("roomType")(e.target.value)} className="mt-1 h-8 text-sm" placeholder="e.g. Twin, Double" /></div>
                  {isAdmin && (
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="text-xs">Check-in Date</Label><Input type="date" value={form.checkinDate ?? ""} onChange={e => fld("checkinDate")(e.target.value)} className="mt-1 h-8 text-sm" /></div>
                      <div><Label className="text-xs">Check-out Date</Label><Input type="date" value={form.checkoutDate ?? ""} onChange={e => fld("checkoutDate")(e.target.value)} className="mt-1 h-8 text-sm" /></div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">Check-in Time</Label><Input type="time" value={form.checkinTime ?? ""} onChange={e => fld("checkinTime")(e.target.value)} className="mt-1 h-8 text-sm" /></div>
                    <div><Label className="text-xs">Check-out Time</Label><Input type="time" value={form.checkoutTime ?? ""} onChange={e => fld("checkoutTime")(e.target.value)} className="mt-1 h-8 text-sm" /></div>
                  </div>
                  <div><Label className="text-xs">Confirmation #</Label><Input value={form.confirmationNo ?? ""} onChange={e => fld("confirmationNo")(e.target.value)} className="mt-1 h-8 text-sm" /></div>
                  <div><Label className="text-xs">Guest Notes</Label><Textarea value={form.guestNotes ?? ""} onChange={e => fld("guestNotes")(e.target.value)} className="mt-1 text-sm" rows={3} /></div>
                  <div><Label className="text-xs">Status</Label>
                    <Select value={form.status ?? "pending"} onValueChange={v => fld("status")(v)}>
                      <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>{["pending","confirmed","in-progress","completed","cancelled"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
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
