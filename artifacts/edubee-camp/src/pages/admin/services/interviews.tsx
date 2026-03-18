import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CalendarCheck, Video, MapPin, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-[#FEF9C3] text-[#CA8A04] border-[#CA8A04]/20",
  scheduled: "bg-[#FEF0E3] text-[#F5821F] border-[#F5821F]/20",
  completed: "bg-[#DCFCE7] text-[#16A34A] border-[#16A34A]/20",
  cancelled: "bg-[#FEF2F2] text-[#DC2626] border-[#DC2626]/20",
  rescheduled: "bg-[#FEF9C3] text-[#CA8A04] border-[#CA8A04]/20",
};

const RESULT_COLORS: Record<string, string> = {
  pass: "bg-[#DCFCE7] text-[#16A34A]",
  fail: "bg-[#FEF2F2] text-[#DC2626]",
  waitlist: "bg-[#FEF9C3] text-[#CA8A04]",
  pending: "bg-[#FEF9C3] text-[#CA8A04]",
};

function StatusBadge({ status }: { status?: string | null }) {
  const s = (status ?? "pending").toLowerCase();
  return <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border capitalize ${STATUS_COLORS[s] ?? "bg-[#F4F3F1] text-[#57534E] border-[#E8E6E2]"}`}>{s}</span>;
}

interface Interview {
  id: string; applicationId?: string | null; packageGroupId?: string | null;
  interviewerId?: string | null; scheduledDatetime: string; timezone?: string | null;
  format?: string | null; meetingLink?: string | null; location?: string | null;
  status?: string | null; result?: string | null; interviewerNotes?: string | null;
  candidateNotes?: string | null;
}

export default function Interviews() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selected, setSelected] = useState<Interview | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<Partial<Interview>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["interview-schedules"],
    queryFn: () => axios.get(`${BASE}/api/interview-schedules`).then(r => r.data),
  });
  const rows: Interview[] = data?.data ?? [];

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<Interview>) => axios.patch(`${BASE}/api/interview-schedules/${selected!.id}`, payload).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["interview-schedules"] }); toast({ title: "Interview updated" }); setSelected(null); },
    onError: () => toast({ title: "Update failed", variant: "destructive" }),
  });

  const createMutation = useMutation({
    mutationFn: (payload: Partial<Interview>) => axios.post(`${BASE}/api/interview-schedules`, payload).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["interview-schedules"] }); toast({ title: "Interview scheduled" }); setShowCreate(false); setForm({}); },
    onError: () => toast({ title: "Create failed", variant: "destructive" }),
  });

  function openSheet(r: Interview) { setSelected(r); setForm({ ...r }); }
  const fld = (k: keyof Interview) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#F5821F]/10 flex items-center justify-center"><CalendarCheck className="w-5 h-5 text-[#F5821F]" /></div>
          <div><h1 className="text-lg font-bold">Interviews</h1><p className="text-xs text-muted-foreground">Application interview scheduling & results</p></div>
        </div>
        <Button size="sm" className="bg-[#F5821F] hover:bg-[#d97706] text-white gap-1.5" onClick={() => { setForm({}); setShowCreate(true); }}>
          <Plus className="w-3.5 h-3.5" /> Schedule Interview
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground"><CalendarCheck className="w-10 h-10 mx-auto mb-3 opacity-30" /><p className="text-sm">No interviews scheduled yet</p></div>
      ) : (
        <div className="rounded-lg border overflow-x-auto bg-white">
          <table className="w-full min-w-[860px] text-sm">
            <thead><tr className="border-b bg-muted/30">
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Application</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Scheduled</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Format</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Location / Link</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Result</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
            </tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20 cursor-pointer transition-colors" onClick={() => openSheet(r)}>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.applicationId?.slice(0, 8) ?? "—"}</td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">{new Date(r.scheduledDatetime).toLocaleString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-xs">
                      {r.format === "online" ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                      {r.format ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs max-w-[160px] truncate">{r.meetingLink ?? r.location ?? "—"}</td>
                  <td className="px-4 py-3">
                    {r.result ? <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${RESULT_COLORS[r.result] ?? "bg-[#F4F3F1] text-[#57534E]"}`}>{r.result}</span> : <span className="text-muted-foreground text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={o => { if (!o) setSelected(null); }}>
        <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto">
          <SheetHeader><SheetTitle className="flex items-center gap-2"><CalendarCheck className="w-4 h-4 text-[#F5821F]" /> Interview Detail</SheetTitle></SheetHeader>
          {selected && form && (
            <div className="mt-4 space-y-3">
              <div><Label className="text-xs">Format</Label>
                <Select value={form.format ?? ""} onValueChange={v => fld("format")(v)}>
                  <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select format…" /></SelectTrigger>
                  <SelectContent><SelectItem value="online">Online (Video)</SelectItem><SelectItem value="in-person">In Person</SelectItem><SelectItem value="phone">Phone</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Scheduled Datetime</Label><Input type="datetime-local" value={form.scheduledDatetime?.slice(0, 16) ?? ""} onChange={e => fld("scheduledDatetime")(e.target.value)} className="mt-1 h-8 text-sm" /></div>
              <div><Label className="text-xs">Meeting Link / Location</Label><Input value={form.meetingLink ?? form.location ?? ""} onChange={e => fld("meetingLink")(e.target.value)} className="mt-1 h-8 text-sm" placeholder="https://meet.google.com/... or address" /></div>
              <div><Label className="text-xs">Result</Label>
                <Select value={form.result ?? ""} onValueChange={v => fld("result")(v)}>
                  <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select result…" /></SelectTrigger>
                  <SelectContent>{["pass","fail","waitlist","pending"].map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Status</Label>
                <Select value={form.status ?? "pending"} onValueChange={v => fld("status")(v)}>
                  <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{["pending","scheduled","completed","cancelled","rescheduled"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Interviewer Notes</Label><Textarea value={form.interviewerNotes ?? ""} onChange={e => fld("interviewerNotes")(e.target.value)} className="mt-1 text-sm" rows={3} /></div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" className="flex-1 bg-[#F5821F] hover:bg-[#d97706] text-white" onClick={() => updateMutation.mutate(form)} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving…" : "Save Changes"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setSelected(null)}>Close</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Schedule Interview</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div><Label className="text-xs">Application ID</Label><Input value={form.applicationId ?? ""} onChange={e => fld("applicationId")(e.target.value)} className="mt-1 h-8 text-sm" placeholder="Application UUID…" /></div>
            <div><Label className="text-xs">Format</Label>
              <Select value={form.format ?? ""} onValueChange={v => fld("format")(v)}>
                <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select format…" /></SelectTrigger>
                <SelectContent><SelectItem value="online">Online (Video)</SelectItem><SelectItem value="in-person">In Person</SelectItem><SelectItem value="phone">Phone</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Scheduled Datetime</Label><Input type="datetime-local" value={form.scheduledDatetime?.slice(0, 16) ?? ""} onChange={e => fld("scheduledDatetime")(e.target.value)} className="mt-1 h-8 text-sm" /></div>
            <div><Label className="text-xs">Meeting Link / Location</Label><Input value={form.meetingLink ?? ""} onChange={e => fld("meetingLink")(e.target.value)} className="mt-1 h-8 text-sm" /></div>
            <div className="flex gap-2 pt-2">
              <Button size="sm" className="flex-1 bg-[#F5821F] hover:bg-[#d97706] text-white" onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Scheduling…" : "Schedule"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
