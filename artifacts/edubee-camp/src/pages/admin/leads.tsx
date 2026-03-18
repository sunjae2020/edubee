import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, GripVertical, ChevronRight, X } from "lucide-react";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const LEAD_STATUSES = [
  { key: "new", label: "New", color: "bg-blue-50 border-blue-200 text-blue-700" },
  { key: "contacted", label: "Contacted", color: "bg-yellow-50 border-yellow-200 text-yellow-700" },
  { key: "qualified", label: "Qualified", color: "bg-indigo-50 border-indigo-200 text-indigo-700" },
  { key: "proposal", label: "Proposal", color: "bg-purple-50 border-purple-200 text-purple-700" },
  { key: "converted", label: "Converted", color: "bg-teal-50 border-teal-200 text-teal-700" },
  { key: "lost", label: "Lost", color: "bg-red-50 border-red-200 text-red-700" },
];

interface Lead {
  id: string; studentName: string; email?: string; phone?: string;
  nationality?: string; status: string; source?: string; notes?: string;
  assignedAgentId?: string; createdAt: string; updatedAt: string;
}

function StatusDot({ status }: { status: string }) {
  const s = LEAD_STATUSES.find(x => x.key === status);
  const colors: Record<string, string> = {
    new: "bg-blue-500", contacted: "bg-yellow-500", qualified: "bg-indigo-500",
    proposal: "bg-purple-500", converted: "bg-teal-500", lost: "bg-red-500",
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[status] ?? "bg-gray-400"}`} />;
}

export default function Leads() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [form, setForm] = useState({ studentName: "", email: "", phone: "", nationality: "", source: "", notes: "" });

  const { data: leads = [] } = useQuery<Lead[]>({
    queryKey: ["leads"],
    queryFn: () => axios.get(`${BASE}/api/leads`).then(r => r.data?.data ?? r.data),
  });

  const createLead = useMutation({
    mutationFn: (data: any) => axios.post(`${BASE}/api/leads`, data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leads"] }); setShowCreate(false); toast({ title: "Lead created" }); },
    onError: () => toast({ variant: "destructive", title: "Failed to create lead" }),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      axios.put(`${BASE}/api/leads/${id}/status`, { status }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leads"] }); },
  });

  const filtered = leads.filter(l =>
    !search || l.studentName.toLowerCase().includes(search.toLowerCase()) ||
    l.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDrop = (status: string) => {
    if (dragging && dragging !== status) {
      const lead = leads.find(l => l.id === dragging.split(":")[1]);
      if (lead && lead.status !== status) {
        updateStatus.mutate({ id: lead.id, status });
      }
    }
    setDragging(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createLead.mutate({ ...form });
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search leads…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Button size="sm" className="h-9 gap-1.5" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" /> New Lead
        </Button>
      </div>

      {/* Kanban */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {LEAD_STATUSES.map(col => {
          const colLeads = filtered.filter(l => l.status === col.key);
          return (
            <div
              key={col.key}
              className="flex-shrink-0 w-64"
              onDragOver={e => e.preventDefault()}
              onDrop={() => handleDrop(col.key)}
            >
              <div className={`flex items-center justify-between px-3 py-2 rounded-lg border mb-2 ${col.color}`}>
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <StatusDot status={col.key} />
                  {col.label}
                </div>
                <span className="text-xs opacity-70">{colLeads.length}</span>
              </div>
              <div className="space-y-2 min-h-20">
                {colLeads.map(lead => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={() => setDragging(`lead:${lead.id}`)}
                    onDragEnd={() => setDragging(null)}
                    onClick={() => setSelectedLead(lead)}
                    className="bg-white border border-border rounded-lg p-3 cursor-pointer hover:shadow-sm hover:border-[#F08301]/40 transition-all select-none group"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="font-medium text-sm leading-tight">{lead.studentName}</div>
                      <GripVertical className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-50 shrink-0 mt-0.5" />
                    </div>
                    {lead.email && <div className="text-xs text-muted-foreground mt-1 truncate">{lead.email}</div>}
                    {lead.nationality && (
                      <div className="text-xs text-muted-foreground mt-0.5">🌏 {lead.nationality}</div>
                    )}
                    {lead.source && (
                      <div className="mt-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground">
                        {lead.source}
                      </div>
                    )}
                    <div className="text-[10px] text-muted-foreground mt-2">
                      {format(new Date(lead.createdAt), "MMM d, yyyy")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Modal */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Lead</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Student Name *</Label>
              <Input value={form.studentName} onChange={e => setForm(f => ({ ...f, studentName: e.target.value }))} required placeholder="Full name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 234 567 890" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nationality</Label>
                <Input value={form.nationality} onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))} placeholder="e.g. Korean" />
              </div>
              <div className="space-y-1.5">
                <Label>Source</Label>
                <Select value={form.source} onValueChange={v => setForm(f => ({ ...f, source: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {["referral", "website", "instagram", "facebook", "email", "event", "other"].map(s => (
                      <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any initial notes…" rows={3} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={createLead.isPending}>
                {createLead.isPending ? "Creating…" : "Create Lead"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Drawer */}
      <Sheet open={!!selectedLead} onOpenChange={o => !o && setSelectedLead(null)}>
        <SheetContent className="w-full sm:max-w-md">
          {selectedLead && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <StatusDot status={selectedLead.status} />
                  {selectedLead.studentName}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Status", value: selectedLead.status.replace(/_/g, " ") },
                    { label: "Source", value: selectedLead.source || "—" },
                    { label: "Email", value: selectedLead.email || "—" },
                    { label: "Phone", value: selectedLead.phone || "—" },
                    { label: "Nationality", value: selectedLead.nationality || "—" },
                    { label: "Created", value: format(new Date(selectedLead.createdAt), "MMM d, yyyy") },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">{label}</div>
                      <div className="text-sm font-medium capitalize">{value}</div>
                    </div>
                  ))}
                </div>

                {selectedLead.notes && (
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Notes</div>
                    <div className="text-sm bg-muted/40 rounded-lg p-3">{selectedLead.notes}</div>
                  </div>
                )}

                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Move to</div>
                  <div className="flex flex-wrap gap-2">
                    {LEAD_STATUSES.filter(s => s.key !== selectedLead.status).map(s => (
                      <button
                        key={s.key}
                        onClick={() => { updateStatus.mutate({ id: selectedLead.id, status: s.key }); setSelectedLead({ ...selectedLead, status: s.key }); }}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${s.color} hover:opacity-80`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
