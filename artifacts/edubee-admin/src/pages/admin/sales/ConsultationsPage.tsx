import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useAuth } from "@/hooks/use-auth";
import { useBulkSelect } from "@/hooks/use-bulk-select";
import { BulkActionBar } from "@/components/common/BulkActionBar";
import { Plus, Search, Pencil, PhoneCall, Video, Users, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { SortableTh, useSortState, useSorted } from "@/components/ui/sortable-th";
import { TableFooter } from "@/components/ui/table-footer";
import { formatDate } from "@/lib/date-format";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const STATUS_OPTIONS = [
  { value: "scheduled",  label: "Scheduled"  },
  { value: "completed",  label: "Completed"  },
  { value: "cancelled",  label: "Cancelled"  },
  { value: "no_show",    label: "No Show"    },
  { value: "follow_up",  label: "Follow Up"  },
];

const TYPE_OPTIONS = [
  { value: "phone",     label: "Phone",      icon: PhoneCall },
  { value: "video",     label: "Video Call", icon: Video },
  { value: "in_person", label: "In Person",  icon: Users },
  { value: "chat",      label: "Chat",       icon: MessageSquare },
];

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  completed:  "bg-green-100 text-green-700",
  cancelled:  "bg-gray-100 text-gray-600",
  no_show:    "bg-red-100 text-red-700",
  follow_up:  "bg-yellow-100 text-yellow-700",
};

interface Consultation {
  id: string;
  refNumber?: string | null;
  clientName?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  nationality?: string | null;
  consultationType?: string | null;
  consultationDate?: string | null;
  subject?: string | null;
  status?: string | null;
  assignedStaffId?: string | null;
  assignedStaffName?: string | null;
  notes?: string | null;
  outcome?: string | null;
  followUpDate?: string | null;
  followUpAction?: string | null;
  contactId?: string | null;
  accountId?: string | null;
  leadId?: string | null;
  isActive?: boolean;
  createdAt?: string | null;
}

const EMPTY_FORM = {
  clientName: "",
  clientEmail: "",
  clientPhone: "",
  nationality: "",
  consultationType: "phone",
  consultationDate: "",
  subject: "",
  status: "scheduled",
  assignedStaffId: "",
  notes: "",
  outcome: "",
  followUpDate: "",
  followUpAction: "",
  contactId: "",
  accountId: "",
  leadId: "",
};

export default function ConsultationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isSA = user?.role === "super_admin";

  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sheetOpen, setSheetOpen]       = useState(false);
  const [editing, setEditing]           = useState<Consultation | null>(null);
  const [form, setForm]                 = useState({ ...EMPTY_FORM });

  const sortState = useSortState("createdAt", "desc");
  const { selectedIds, toggleSelect, toggleAll, clearSelection, isAllSelected } = useBulkSelect();

  const queryKey = ["consultations", page, search, statusFilter];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const params: Record<string, string> = { page: String(page) };
      if (search) params.search = search;
      if (statusFilter && statusFilter !== "all") params.status = statusFilter;
      const res = await axios.get(`${BASE}/api/consultations`, { params });
      return res.data as { data: Consultation[]; total: number; page: number; totalPages: number };
    },
  });

  const rows      = data?.data ?? [];
  const total     = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const sorted    = useSorted(rows, sortState.sortBy, sortState.sortDir);

  const saveMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      if (editing) {
        await axios.patch(`${BASE}/api/consultations/${editing.id}`, payload);
      } else {
        await axios.post(`${BASE}/api/consultations`, payload);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["consultations"] });
      toast({ title: editing ? "Consultation updated." : "Consultation created." });
      closeSheet();
    },
    onError: () => toast({ title: "Failed to save.", variant: "destructive" }),
  });

  const softDelMutation = useMutation({
    mutationFn: (ids: string[]) => axios.patch(`${BASE}/api/consultations/bulk/soft-delete`, { ids }),
    onSuccess: (_d, ids) => { qc.invalidateQueries({ queryKey: ["consultations"] }); clearSelection(); toast({ title: `${ids.length} moved to trash` }); },
  });

  const hardDelMutation = useMutation({
    mutationFn: (ids: string[]) => axios.delete(`${BASE}/api/consultations/bulk`, { data: { ids } }),
    onSuccess: (_d, ids) => { qc.invalidateQueries({ queryKey: ["consultations"] }); clearSelection(); toast({ title: `${ids.length} permanently deleted` }); },
  });

  function openNew() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setSheetOpen(true);
  }

  function openEdit(c: Consultation) {
    setEditing(c);
    setForm({
      clientName:       c.clientName       ?? "",
      clientEmail:      c.clientEmail      ?? "",
      clientPhone:      c.clientPhone      ?? "",
      nationality:      c.nationality      ?? "",
      consultationType: c.consultationType ?? "phone",
      consultationDate: c.consultationDate ? c.consultationDate.slice(0, 16) : "",
      subject:          c.subject          ?? "",
      status:           c.status           ?? "scheduled",
      assignedStaffId:  c.assignedStaffId  ?? "",
      notes:            c.notes            ?? "",
      outcome:          c.outcome          ?? "",
      followUpDate:     c.followUpDate     ?? "",
      followUpAction:   c.followUpAction   ?? "",
      contactId:        c.contactId        ?? "",
      accountId:        c.accountId        ?? "",
      leadId:           c.leadId           ?? "",
    });
    setSheetOpen(true);
  }

  function closeSheet() {
    setSheetOpen(false);
    setEditing(null);
  }

  function setField(key: keyof typeof form, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  const typeLabel = (t: string) => TYPE_OPTIONS.find(o => o.value === t)?.label ?? t;

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Consultations</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} record{total !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={openNew} className="flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> New Consultation
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Search name, email, subject…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {STATUS_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Bulk Action Bar */}
      {isSA && (
        <BulkActionBar
          count={selectedIds.size}
          onSoftDelete={() => softDelMutation.mutate(Array.from(selectedIds))}
          onHardDelete={() => hardDelMutation.mutate(Array.from(selectedIds))}
          isLoading={softDelMutation.isPending || hardDelMutation.isPending}
        />
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {isSA && (
                <th className="w-10 px-3 py-3">
                  <Checkbox
                    checked={rows.length > 0 && isAllSelected(rows.map(r => r.id))}
                    onCheckedChange={() => toggleAll(rows.map(r => r.id))}
                  />
                </th>
              )}
              <SortableTh sortKey="refNumber"        state={sortState} className="px-4 py-3 text-left font-medium text-gray-600">Ref #</SortableTh>
              <SortableTh sortKey="clientName"       state={sortState} className="px-4 py-3 text-left font-medium text-gray-600">Client</SortableTh>
              <SortableTh sortKey="consultationType" state={sortState} className="px-4 py-3 text-left font-medium text-gray-600">Type</SortableTh>
              <SortableTh sortKey="consultationDate" state={sortState} className="px-4 py-3 text-left font-medium text-gray-600">Date</SortableTh>
              <SortableTh sortKey="subject"          state={sortState} className="px-4 py-3 text-left font-medium text-gray-600">Subject</SortableTh>
              <SortableTh sortKey="status"           state={sortState} className="px-4 py-3 text-left font-medium text-gray-600">Status</SortableTh>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Assigned To</th>
              <SortableTh sortKey="followUpDate"     state={sortState} className="px-4 py-3 text-left font-medium text-gray-600">Follow-up</SortableTh>
              <th className="px-4 py-3 text-left font-medium text-gray-600 w-16">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={isSA ? 10 : 9} className="px-4 py-8 text-center text-gray-400">Loading…</td>
              </tr>
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={isSA ? 10 : 9} className="px-4 py-8 text-center text-gray-400">No consultations found.</td>
              </tr>
            ) : sorted.map(c => (
              <tr key={c.id} className="border-t hover:bg-gray-50 transition-colors">
                {isSA && (
                  <td className="px-3 py-3">
                    <Checkbox
                      checked={selectedIds.has(c.id)}
                      onCheckedChange={() => toggleSelect(c.id)}
                    />
                  </td>
                )}
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{c.refNumber ?? "—"}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{c.clientName ?? "—"}</div>
                  {c.clientEmail && <div className="text-xs text-gray-500">{c.clientEmail}</div>}
                </td>
                <td className="px-4 py-3 text-gray-700">{typeLabel(c.consultationType ?? "")}</td>
                <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                  {c.consultationDate ? formatDate(c.consultationDate) : "—"}
                </td>
                <td className="px-4 py-3 max-w-[200px] truncate text-gray-700">{c.subject ?? "—"}</td>
                <td className="px-4 py-3">
                  <Badge className={`text-xs font-medium px-2 py-0.5 rounded-full border-0 ${STATUS_COLORS[c.status ?? ""] ?? "bg-gray-100 text-gray-600"}`}>
                    {STATUS_OPTIONS.find(o => o.value === c.status)?.label ?? c.status ?? "—"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-gray-700">{c.assignedStaffName ?? "—"}</td>
                <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                  {c.followUpDate ? formatDate(c.followUpDate) : "—"}
                </td>
                <td className="px-4 py-3">
                  <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => openEdit(c)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TableFooter
        page={page}
        total={total}
        pageSize={20}
        onPageChange={setPage}
      />

      {/* Sheet Form */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>{editing ? "Edit Consultation" : "New Consultation"}</SheetTitle>
            <SheetDescription>
              {editing ? `Editing ${editing.refNumber ?? editing.id}` : "Schedule a new consultation"}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5">
            {/* Client Info */}
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-gray-700 border-b pb-1">Client Information</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Client Name</Label>
                <Input
                  placeholder="Full name"
                  value={form.clientName}
                  onChange={e => setField("clientName", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Nationality</Label>
                <Input
                  placeholder="e.g. Korean"
                  value={form.nationality}
                  onChange={e => setField("nationality", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="client@example.com"
                  value={form.clientEmail}
                  onChange={e => setField("clientEmail", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input
                  placeholder="+82 10-0000-0000"
                  value={form.clientPhone}
                  onChange={e => setField("clientPhone", e.target.value)}
                />
              </div>
            </div>

            {/* Consultation Details */}
            <div className="space-y-1 pt-2">
              <h3 className="text-sm font-semibold text-gray-700 border-b pb-1">Consultation Details</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.consultationType} onValueChange={v => setField("consultationType", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setField("status", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Consultation Date & Time</Label>
                <Input
                  type="datetime-local"
                  value={form.consultationDate}
                  onChange={e => setField("consultationDate", e.target.value)}
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Subject</Label>
                <Input
                  placeholder="Consultation topic or subject"
                  value={form.subject}
                  onChange={e => setField("subject", e.target.value)}
                />
              </div>
            </div>

            {/* Notes & Outcome */}
            <div className="space-y-1 pt-2">
              <h3 className="text-sm font-semibold text-gray-700 border-b pb-1">Notes & Outcome</h3>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Consultation notes, client concerns, etc."
                  rows={3}
                  value={form.notes}
                  onChange={e => setField("notes", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Outcome</Label>
                <Textarea
                  placeholder="Result or outcome of the consultation"
                  rows={3}
                  value={form.outcome}
                  onChange={e => setField("outcome", e.target.value)}
                />
              </div>
            </div>

            {/* Follow-up */}
            <div className="space-y-1 pt-2">
              <h3 className="text-sm font-semibold text-gray-700 border-b pb-1">Follow-up</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Follow-up Date</Label>
                <Input
                  type="date"
                  value={form.followUpDate}
                  onChange={e => setField("followUpDate", e.target.value)}
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Follow-up Action</Label>
                <Textarea
                  placeholder="What needs to be done next?"
                  rows={2}
                  value={form.followUpAction}
                  onChange={e => setField("followUpAction", e.target.value)}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={closeSheet} disabled={saveMutation.isPending}>
                Cancel
              </Button>
              <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving…" : editing ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
