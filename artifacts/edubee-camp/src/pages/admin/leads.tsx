import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { NotePanel } from "@/components/shared/NotePanel";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { GripVertical, ClipboardList, Calendar, Mail, Phone, Globe, Tag, FileText, ArrowRight, Loader2, Pencil, X, Check } from "lucide-react";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { format } from "date-fns";
import { useLocation } from "wouter";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const LEAD_STATUSES = [
  { key: "new",       label: "New",       color: "bg-[#F4F3F1] border-[#E8E6E2] text-[#57534E]",   dot: "bg-[#A8A29E]"   },
  { key: "contacted", label: "Contacted", color: "bg-[#FEF9C3] border-[#CA8A04]/20 text-[#CA8A04]", dot: "bg-[#CA8A04]" },
  { key: "qualified", label: "Qualified", color: "bg-[#FEF0E3] border-[#F5821F]/20 text-[#F5821F]", dot: "bg-[#F5821F]" },
  { key: "proposal",  label: "Proposal",  color: "bg-[#FEF9C3] border-[#CA8A04]/20 text-[#CA8A04]", dot: "bg-[#CA8A04]" },
  { key: "converted", label: "Converted", color: "bg-[#DCFCE7] border-[#16A34A]/20 text-[#16A34A]", dot: "bg-[#16A34A]" },
  { key: "lost",      label: "Lost",      color: "bg-[#FEF2F2] border-[#DC2626]/20 text-[#DC2626]", dot: "bg-[#DC2626]" },
];

interface Lead {
  id: string; studentName: string; email?: string; phone?: string;
  nationality?: string; status: string; source?: string; notes?: string;
  assignedAgentId?: string; programInterest?: string; estimatedBudget?: string;
  createdAt: string; updatedAt: string;
}

const DOT_SIZE_MAP: Record<number, string> = { 1: "w-1 h-1", 2: "w-2 h-2", 3: "w-3 h-3", 4: "w-4 h-4" };

function StatusDot({ status, size = 2 }: { status: string; size?: number }) {
  const s = LEAD_STATUSES.find(x => x.key === status);
  const sizeClass = DOT_SIZE_MAP[size] ?? "w-2 h-2";
  return <span className={`inline-block ${sizeClass} rounded-full ${s?.dot ?? "bg-[#A8A29E]"}`} />;
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
        <div className="text-sm font-medium text-foreground">{value}</div>
      </div>
    </div>
  );
}

export default function Leads() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  const [form, setForm] = useState({ studentName: "", email: "", phone: "", nationality: "", source: "", notes: "", programInterest: "" });
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Lead>>({});

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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });

  const updateNotes = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      axios.put(`${BASE}/api/leads/${id}`, { notes }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leads"] }); toast({ title: "Notes saved" }); },
  });

  const updateLead = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Lead> }) =>
      axios.put(`${BASE}/api/leads/${id}`, data).then(r => r.data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      setSelectedLead(updated);
      setIsEditing(false);
      toast({ title: "Lead updated" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to update lead" }),
  });

  const filtered = leads.filter(l =>
    !search || l.studentName.toLowerCase().includes(search.toLowerCase()) ||
    l.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDrop = (status: string) => {
    if (dragging) {
      const lead = leads.find(l => l.id === dragging.split(":")[1]);
      if (lead && lead.status !== status) updateStatus.mutate({ id: lead.id, status });
    }
    setDragging(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createLead.mutate({ ...form });
  };

  const handleConvertToApplication = async () => {
    if (!selectedLead) return;
    setConverting(true);
    try {
      await axios.post(`${BASE}/api/leads/${selectedLead.id}/convert`);
      toast({ title: "Lead converted to application successfully" });
      qc.invalidateQueries({ queryKey: ["leads"] });
      setSelectedLead(null);
      setLocation("/admin/applications");
    } catch {
      toast({ variant: "destructive", title: "Conversion failed", description: "Could not convert lead to application." });
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="space-y-4">
      <ListToolbar
        search={search}
        onSearch={setSearch}
        total={leads.length}
        addLabel="New Lead"
        onAdd={() => setShowCreate(true)}
        csvExportTable="leads"
      />

      {/* Kanban Board */}
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
                  <span className={`inline-block w-2 h-2 rounded-full ${col.dot}`} />
                  {col.label}
                </div>
                <span className="text-xs opacity-70 font-medium">{colLeads.length}</span>
              </div>
              <div className="space-y-2 min-h-20">
                {colLeads.map(lead => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={() => setDragging(`lead:${lead.id}`)}
                    onDragEnd={() => setDragging(null)}
                    onClick={() => setSelectedLead(lead)}
                    className="bg-card border border-border rounded-lg p-3 cursor-pointer hover:shadow-sm hover:border-[#F5821F]/40 transition-all select-none group"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="font-medium text-sm leading-tight text-foreground">{lead.studentName}</div>
                      <GripVertical className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-50 shrink-0 mt-0.5" />
                    </div>
                    {lead.email && <div className="text-xs text-muted-foreground mt-1 truncate">{lead.email}</div>}
                    {lead.nationality && (
                      <div className="text-xs text-muted-foreground mt-0.5">🌏 {lead.nationality}</div>
                    )}
                    {lead.source && (
                      <div className="mt-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground border border-border capitalize">
                        {lead.source}
                      </div>
                    )}
                    <div className="text-[10px] text-muted-foreground mt-2">
                      {format(new Date(lead.createdAt), "MMM d, yyyy")}
                    </div>
                  </div>
                ))}
                {colLeads.length === 0 && (
                  <div className="h-16 rounded-lg border-2 border-dashed border-border/50 flex items-center justify-center">
                    <span className="text-xs text-muted-foreground/40">Drop here</span>
                  </div>
                )}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 234 567 890" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <Label>Program Interest</Label>
              <Input value={form.programInterest} onChange={e => setForm(f => ({ ...f, programInterest: e.target.value }))} placeholder="e.g. English Camp, STEM" />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any initial notes…" rows={3} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#F5821F] hover:bg-[#d97706] text-white" disabled={createLead.isPending}>
                {createLead.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {createLead.isPending ? "Creating…" : "Create Lead"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Drawer */}
      <Sheet open={!!selectedLead} onOpenChange={o => { if (!o) { setSelectedLead(null); setIsEditing(false); } }}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto bg-background">
          {selectedLead && (
            <>
              <SheetHeader className="pb-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusDot status={selectedLead.status} size={2} />
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${LEAD_STATUSES.find(s => s.key === selectedLead.status)?.color ?? ""}`}>
                      {selectedLead.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  {!isEditing ? (
                    <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs"
                      onClick={() => { setEditForm({ ...selectedLead }); setIsEditing(true); }}>
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </Button>
                  ) : (
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => setIsEditing(false)}>
                        <X className="w-3.5 h-3.5" /> Cancel
                      </Button>
                      <Button size="sm" className="h-7 gap-1 text-xs" disabled={updateLead.isPending}
                        onClick={() => updateLead.mutate({ id: selectedLead.id, data: editForm })}>
                        {updateLead.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save
                      </Button>
                    </div>
                  )}
                </div>
                <SheetTitle className="text-xl">{selectedLead.studentName}</SheetTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Lead created {format(new Date(selectedLead.createdAt), "MMMM d, yyyy")}
                </p>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Contact info */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact</h3>
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Student Name</Label>
                        <Input className="h-8 text-sm" value={editForm.studentName ?? ""} onChange={e => setEditForm(f => ({ ...f, studentName: e.target.value }))} />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Email</Label>
                          <Input className="h-8 text-sm" type="email" value={editForm.email ?? ""} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Phone</Label>
                          <Input className="h-8 text-sm" value={editForm.phone ?? ""} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Nationality</Label>
                          <Input className="h-8 text-sm" value={editForm.nationality ?? ""} onChange={e => setEditForm(f => ({ ...f, nationality: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Source</Label>
                          <Select value={editForm.source ?? ""} onValueChange={v => setEditForm(f => ({ ...f, source: v }))}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              {["referral", "website", "instagram", "facebook", "email", "event", "other"].map(s => (
                                <SelectItem key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Program Interest</Label>
                        <Input className="h-8 text-sm" value={(editForm as any).programInterest ?? ""} onChange={e => setEditForm(f => ({ ...f, programInterest: e.target.value } as any))} placeholder="e.g. English Camp, STEM" />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <InfoRow icon={Mail} label="Email" value={selectedLead.email} />
                      <InfoRow icon={Phone} label="Phone" value={selectedLead.phone} />
                      <InfoRow icon={Globe} label="Nationality" value={selectedLead.nationality} />
                      <InfoRow icon={Tag} label="Source" value={selectedLead.source ? selectedLead.source.charAt(0).toUpperCase() + selectedLead.source.slice(1) : undefined} />
                      <InfoRow icon={FileText} label="Program Interest" value={(selectedLead as any).programInterest} />
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lead Notes (Field)</h3>
                  {isEditing ? (
                    <Textarea className="text-sm resize-none" rows={4} value={editForm.notes ?? ""} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} placeholder="Add notes…" />
                  ) : (
                    <div className="bg-muted/40 rounded-lg p-3 text-sm text-foreground min-h-[60px]">
                      {selectedLead.notes || <span className="text-muted-foreground italic">No notes yet</span>}
                    </div>
                  )}
                </div>

                {/* NotePanel */}
                <div className="space-y-2 border-t border-border pt-4">
                  <NotePanel
                    entityType="lead"
                    entityId={selectedLead.id}
                    allowedNoteTypes={["internal"]}
                    defaultVisibility="internal"
                    compact={true}
                  />
                </div>

                {/* Move to */}
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Move to Stage</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {LEAD_STATUSES.filter(s => s.key !== selectedLead.status).map(s => (
                      <button
                        key={s.key}
                        onClick={() => {
                          updateStatus.mutate({ id: selectedLead.id, status: s.key });
                          setSelectedLead({ ...selectedLead, status: s.key });
                        }}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${s.color} hover:opacity-80`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Activity timestamps */}
                <div className="bg-muted/30 rounded-xl p-4 space-y-2 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Created</span>
                    <span className="font-medium text-foreground">{format(new Date(selectedLead.createdAt), "MMM d, yyyy · HH:mm")}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Last Updated</span>
                    <span className="font-medium text-foreground">{format(new Date(selectedLead.updatedAt), "MMM d, yyyy · HH:mm")}</span>
                  </div>
                </div>

                {/* Convert to Application */}
                {selectedLead.status !== "converted" && selectedLead.status !== "lost" && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-3">
                      Ready to move forward? Convert this lead into a formal application.
                    </p>
                    <Button
                      className="w-full bg-[#F5821F] hover:bg-[#d97706] text-white gap-2"
                      onClick={handleConvertToApplication}
                      disabled={converting}
                    >
                      {converting ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Converting…</>
                      ) : (
                        <><ClipboardList className="w-4 h-4" /> Convert to Application <ArrowRight className="w-4 h-4 ml-auto" /></>
                      )}
                    </Button>
                  </div>
                )}

                {selectedLead.status === "converted" && (
                  <div className="pt-2 border-t border-border">
                    <Button variant="outline" className="w-full gap-2" onClick={() => { setSelectedLead(null); setLocation("/admin/applications"); }}>
                      <ClipboardList className="w-4 h-4" /> View Applications <ArrowRight className="w-4 h-4 ml-auto" />
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
