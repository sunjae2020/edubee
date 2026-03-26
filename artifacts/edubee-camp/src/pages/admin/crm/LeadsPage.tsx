import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import axios from "axios";
import { Plus, Search, LayoutGrid, List, Pencil, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { SortableTh, useSortState, useSorted } from "@/components/ui/sortable-th";
import { TableFooter } from "@/components/ui/table-footer";
import { NameFieldGroup } from "@/components/common/NameFieldGroup";
import { ClientNameCell } from "@/components/common/ClientNameCell";
import { nameFromLead, buildFullName } from "@/lib/nameUtils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const KANBAN_COLS = [
  { key: "new",          label: "New" },
  { key: "open",         label: "Open" },
  { key: "in_progress",  label: "In Progress" },
  { key: "qualified",    label: "Qualified" },
  { key: "unqualified",  label: "Unqualified" },
];

const STATUS_COLORS: Record<string, string> = {
  new:         "bg-[#FEF0E3] text-[#F5821F]",
  open:        "bg-[#EFF6FF] text-[#3B82F6]",
  in_progress: "bg-[#FEF9C3] text-[#CA8A04]",
  qualified:   "bg-[#DCFCE7] text-[#16A34A]",
  unqualified: "bg-[#F4F3F1] text-[#57534E]",
};

const INQUIRY_TYPES = ["Summer Camp", "Study Abroad", "Internship", "Accommodation", "Guardian", "Other"];

interface Lead {
  id: string;
  leadRefNumber?: string | null;
  fullName: string;
  firstName?: string | null;
  lastName?: string | null;
  englishName?: string | null;
  originalName?: string | null;
  email?: string | null;
  phone?: string | null;
  nationality?: string | null;
  source?: string | null;
  status?: string | null;
  inquiryType?: string | null;
  budget?: string | null;
  expectedStartDate?: string | null;
  assignedStaffId?: string | null;
  notes?: string | null;
  contactId?: string | null;
  accountId?: string | null;
  createdAt?: string | null;
}

interface FormData {
  firstName: string;
  lastName: string;
  englishName: string;
  originalName: string;
  email: string;
  phone: string;
  nationality: string;
  inquiryType: string;
  budget: string;
  expectedStartDate: string;
  status: string;
  notes: string;
  source: string;
  contactId: string;
  accountId: string;
}

const EMPTY_FORM: FormData = {
  firstName: "", lastName: "", englishName: "", originalName: "",
  email: "", phone: "", nationality: "", inquiryType: "", budget: "",
  expectedStartDate: "", status: "new", notes: "", source: "", contactId: "", accountId: "",
};

function StatusBadge({ status }: { status?: string | null }) {
  const s = status ?? "new";
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[s] ?? "bg-[#F4F3F1] text-[#57534E]"}`}>
      {s.replace(/_/g, " ")}
    </span>
  );
}

function SelectField({ value, onChange, options, placeholder }: {
  value?: string | null; onChange: (v: string) => void; options: string[]; placeholder?: string;
}) {
  return (
    <Select value={value ?? "__none"} onValueChange={v => onChange(v === "__none" ? "" : v)}>
      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder={placeholder ?? "Select…"} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="__none">{placeholder ?? "None"}</SelectItem>
        {options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function KanbanCard({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  const nameF = nameFromLead(lead);
  const fullName = buildFullName(nameF, lead.fullName);
  return (
    <div
      onClick={onClick}
      className="bg-white border border-[#E8E6E2] rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow space-y-2.5"
    >
      <p className="text-[11px] text-[#A8A29E] font-mono">{lead.leadRefNumber ?? "—"}</p>
      <div>
        <p className="text-sm font-bold text-[#1C1917] leading-tight">{fullName}</p>
        {lead.originalName && <p className="text-xs text-[#57534E]">{lead.originalName}</p>}
      </div>
      {lead.inquiryType && (
        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#FEF0E3] text-[#F5821F]">
          {lead.inquiryType}
        </span>
      )}
      {lead.budget && (
        <p className="text-xs font-semibold text-stone-700">
          A${Number(lead.budget).toLocaleString("en-AU")}
        </p>
      )}
      <p className="text-[11px] text-[#A8A29E]">
        {lead.createdAt ? format(new Date(lead.createdAt), "MMM d, yyyy") : "—"}
      </p>
    </div>
  );
}

export default function CrmLeadsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { sortBy, sortDir, onSort } = useSortState();

  const [view, setView]           = useState<"table" | "kanban">("table");
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatus] = useState("all");
  const [page, setPage]           = useState(1);
  const [pageSize, setPageSize]   = useState(20);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editLead, setEditLead]   = useState<Lead | null>(null);
  const [form, setForm]           = useState<FormData>(EMPTY_FORM);

  function patchName(key: string, val: string) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  const tableKey = ["crm-leads-table", { search, status: statusFilter, page, pageSize }];
  const { data: tableResp, isLoading: tableLoading } = useQuery({
    queryKey: tableKey,
    queryFn: () => {
      const p = new URLSearchParams({ page: String(page), limit: String(pageSize) });
      if (search)                  p.set("search", search);
      if (statusFilter !== "all") p.set("leadStatus", statusFilter);
      return axios.get(`${BASE}/api/crm/leads?${p}`).then(r => r.data);
    },
    enabled: view === "table",
  });

  const kanbanKey = ["crm-leads-kanban"];
  const { data: kanbanResp, isLoading: kanbanLoading } = useQuery({
    queryKey: kanbanKey,
    queryFn: () => axios.get(`${BASE}/api/crm/leads/kanban`).then(r => r.data),
    enabled: view === "kanban",
  });

  const rows: Lead[] = tableResp?.data ?? [];
  const sorted = useSorted(rows, sortBy, sortDir);
  const total        = tableResp?.meta?.total ?? 0;

  const kanbanCols: Array<{ status: string; count: number; cards: Lead[] }> =
    kanbanResp?.columns ?? KANBAN_COLS.map(c => ({ status: c.key, count: 0, cards: [] }));

  function openCreate() {
    setEditLead(null);
    setForm(EMPTY_FORM);
    setSheetOpen(true);
  }

  function openEdit(l: Lead) {
    setEditLead(l);
    setForm({
      firstName:        l.firstName ?? "",
      lastName:         l.lastName ?? "",
      englishName:      l.englishName ?? "",
      originalName:     l.originalName ?? "",
      email:            l.email ?? "",
      phone:            l.phone ?? "",
      nationality:      l.nationality ?? "",
      inquiryType:      l.inquiryType ?? "",
      budget:           l.budget ?? "",
      expectedStartDate: l.expectedStartDate ?? "",
      status:           l.status ?? "new",
      notes:            l.notes ?? "",
      source:           l.source ?? "",
      contactId:        l.contactId ?? "",
      accountId:        l.accountId ?? "",
    });
    setSheetOpen(true);
  }

  const saveMutation = useMutation({
    mutationFn: (payload: FormData) =>
      editLead
        ? axios.put(`${BASE}/api/crm/leads/${editLead.id}`, payload).then(r => r.data)
        : axios.post(`${BASE}/api/crm/leads`, payload).then(r => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["crm-leads-table"] });
      qc.invalidateQueries({ queryKey: ["crm-leads-kanban"] });
      toast({ title: editLead ? "Lead updated" : `Lead created: ${data.leadRefNumber}` });
      setSheetOpen(false);
    },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  function handleSave() {
    if (!form.firstName.trim()) {
      toast({ title: "First Name is required", variant: "destructive" });
      return;
    }
    saveMutation.mutate(form);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-800">Leads</h1>
          <p className="text-sm text-stone-500 mt-1">Track and manage your sales pipeline</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-stone-100 rounded-lg p-1">
            <button
              onClick={() => setView("table")}
              className={`p-1.5 rounded-md transition-colors ${view === "table" ? "bg-white shadow-sm text-stone-800" : "text-stone-400 hover:text-stone-600"}`}
              title="Table view"
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setView("kanban")}
              className={`p-1.5 rounded-md transition-colors ${view === "kanban" ? "bg-white shadow-sm text-stone-800" : "text-stone-400 hover:text-stone-600"}`}
              title="Kanban view"
            >
              <LayoutGrid size={16} />
            </button>
          </div>
          <Button
            onClick={openCreate}
            className="flex items-center gap-2 text-white rounded-lg"
            style={{ background: "#F5821F" }}
          >
            <Plus size={16} /> New Lead
          </Button>
        </div>
      </div>

      {view === "table" && (
        <>
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <Input
                placeholder="Search by name, email, or ref…"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <Select value={statusFilter} onValueChange={v => { setStatus(v); setPage(1); }}>
              <SelectTrigger className="w-40 h-9 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {KANBAN_COLS.map(c => (
                  <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-xl border border-stone-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  <SortableTh col="leadRef" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Lead Ref</SortableTh>
                  <SortableTh col="contactName" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Client</SortableTh>
                  <SortableTh col="inquiryType" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Inquiry Type</SortableTh>
                  <SortableTh col="budget" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Budget (AUD)</SortableTh>
                  <SortableTh col="expectedStart" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Expected Start</SortableTh>
                  <SortableTh col="status" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Status</SortableTh>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {tableLoading && (
                  <tr><td colSpan={7} className="text-center py-12 text-stone-400 text-sm">Loading…</td></tr>
                )}
                {!tableLoading && rows.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-12 text-stone-400 text-sm">No leads found</td></tr>
                )}
                {sorted.map(l => (
                  <tr key={l.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-stone-500">{l.leadRefNumber ?? "—"}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => navigate(`/admin/crm/leads/${l.id}`)} className="text-left w-full">
                        <ClientNameCell
                          fields={nameFromLead(l)}
                          accountId={l.accountId}
                          subLabel={l.email ?? undefined}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-stone-600">{l.inquiryType ?? "—"}</td>
                    <td className="px-4 py-3 text-stone-600">
                      {l.budget ? `A$${Number(l.budget).toLocaleString("en-AU")}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {l.expectedStartDate ? format(new Date(l.expectedStartDate), "MMM d, yyyy") : "—"}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => navigate(`/admin/crm/leads/${l.id}`)}
                          className="p-1.5 rounded hover:bg-stone-100 text-stone-500 hover:text-stone-800 transition-colors" title="View">
                          <Eye size={14} />
                        </button>
                        <button onClick={() => openEdit(l)}
                          className="p-1.5 rounded hover:bg-stone-100 text-stone-500 hover:text-stone-800 transition-colors" title="Edit">
                          <Pencil size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <TableFooter page={page} pageSize={pageSize} total={total} label="leads" onPageChange={setPage} onPageSizeChange={v => { setPageSize(v); setPage(1); }} />
        </>
      )}

      {view === "kanban" && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {kanbanLoading && (
            <div className="flex items-center justify-center w-full h-40 text-stone-400 text-sm">Loading kanban…</div>
          )}
          {!kanbanLoading && kanbanCols.map(col => {
            const colMeta = KANBAN_COLS.find(c => c.key === col.status);
            return (
              <div key={col.status} className="flex-shrink-0 w-64 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-stone-800">{colMeta?.label ?? col.status}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#F4F3F1] text-stone-500">
                    {col.count}
                  </span>
                </div>
                <div className="space-y-2.5 min-h-[120px]">
                  {col.cards.map(card => (
                    <KanbanCard
                      key={card.id}
                      lead={card}
                      onClick={() => navigate(`/admin/crm/leads/${card.id}`)}
                    />
                  ))}
                  {col.cards.length === 0 && (
                    <div className="flex items-center justify-center h-20 rounded-xl border-2 border-dashed border-stone-200 text-xs text-stone-400">
                      No leads
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editLead ? "Edit Lead" : "New Lead"}</SheetTitle>
            <SheetDescription>{editLead ? "Update lead details." : "Create a new lead in the pipeline."}</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4 pb-6">
            <NameFieldGroup
              values={{ firstName: form.firstName, lastName: form.lastName, englishName: form.englishName, originalName: form.originalName }}
              onChange={patchName}
              required
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-stone-600">Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-stone-600">Phone</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="h-9 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-stone-600">Nationality</Label>
                <Input value={form.nationality} onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-stone-600">Inquiry Type</Label>
                <SelectField value={form.inquiryType} onChange={v => setForm(f => ({ ...f, inquiryType: v }))} options={INQUIRY_TYPES} placeholder="Type" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-stone-600">Budget (AUD)</Label>
                <Input type="number" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} className="h-9 text-sm" placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-stone-600">Expected Start</Label>
                <Input type="date" value={form.expectedStartDate} onChange={e => setForm(f => ({ ...f, expectedStartDate: e.target.value }))} className="h-9 text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-stone-600">Status</Label>
              <SelectField value={form.status} onChange={v => setForm(f => ({ ...f, status: v }))} options={KANBAN_COLS.map(c => c.key)} placeholder="Status" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-stone-600">Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="text-sm min-h-[70px] resize-none" placeholder="Additional notes…" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={saveMutation.isPending} className="flex-1 text-white" style={{ background: "#F5821F" }}>
                {saveMutation.isPending ? "Saving…" : editLead ? "Save Changes" : "Create Lead"}
              </Button>
              <Button variant="outline" onClick={() => setSheetOpen(false)} className="flex-1">Cancel</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
