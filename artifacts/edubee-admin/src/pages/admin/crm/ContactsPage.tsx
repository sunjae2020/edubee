import { useState, useEffect } from "react";
import { formatDate, formatDateTime } from "@/lib/date-format";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import axios from "axios";
import { Plus, Search, Pencil, Eye } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useBulkSelect } from "@/hooks/use-bulk-select";
import { BulkActionBar } from "@/components/common/BulkActionBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { SortableTh, useSortState, useSorted } from "@/components/ui/sortable-th";
import { TableFooter } from "@/components/ui/table-footer";
import { useLookup } from "@/hooks/use-lookup";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const PAGE_SIZE = 20;

const TITLES = ["Mr", "Mrs", "Ms", "Dr", "Prof"];
const CHANNELS     = ["Online Ads", "Referral", "Walk-in", "Camp", "Other"];

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  title?: string | null;
  dob?: string | null;
  gender?: string | null;
  nationality?: string | null;
  email?: string | null;
  mobile?: string | null;
  officeNumber?: string | null;
  snsType?: string | null;
  snsId?: string | null;
  influxChannel?: string | null;
  importantDate1?: string | null;
  importantDate2?: string | null;
  originalName?: string | null;
  fullName?: string | null;
  description?: string | null;
  status: string;
  accountType: string;
  createdOn?: string | null;
  modifiedOn?: string | null;
  profileImageUrl?: string | null;
}

type FormData = Partial<Omit<Contact, "id" | "createdOn" | "modifiedOn">>;

const fmtDate = (d?: string | null) => formatDate(d);

function Avatar({ name }: { name: string }) {
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold shrink-0"
      style={{ background: "var(--e-orange-lt)", color: "var(--e-orange)" }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const active = status.toLowerCase() === "active";
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
      active ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#F4F3F1] text-[#57534E]"
    }`}>
      {status}
    </span>
  );
}

function FormField({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-stone-600">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest pt-2 pb-1 border-b border-stone-100">
      {children}
    </p>
  );
}

function SelectField({
  value, onChange, options, placeholder,
}: {
  value?: string | null;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  return (
    <Select value={value ?? "__none"} onValueChange={v => onChange(v === "__none" ? "" : v)}>
      <SelectTrigger className="h-9 text-sm">
        <SelectValue placeholder={placeholder ?? "Select…"} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none">{placeholder ?? "None"}</SelectItem>
        {options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export default function ContactsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const contactTypes = useLookup("contact_type");
  const snsTypes     = useLookup("sns_type");
  const { sortBy, sortDir, onSort } = useSortState("createdOn", "desc");

  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter]       = useState("all");
  const [typeFilter, setTypeFilter]   = useState("all");
  const [page, setPage]               = useState(1);
  const [pageSize, setPageSize]       = useState(PAGE_SIZE);
  const [sheetOpen, setSheetOpen]     = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [form, setForm]               = useState<FormData>({});

  useEffect(() => { setPage(1); }, [sortBy, sortDir]);

  const queryKey = ["crm-contacts", { search, status: statusFilter, accountType: typeFilter, page, pageSize, sortBy, sortDir }];

  const { data: resp, isLoading } = useQuery({
    queryKey,
    queryFn: () => {
      const p = new URLSearchParams({ page: String(page), limit: String(pageSize) });
      if (search)                      p.set("search", search);
      if (statusFilter !== "all")      p.set("status", statusFilter);
      if (typeFilter !== "all")        p.set("accountType", typeFilter);
      p.set("sortBy", sortBy);
      p.set("sortDir", sortDir);
      return axios.get(`${BASE}/api/crm/contacts?${p}`).then(r => r.data);
    },
  });

  const rows: Contact[]   = resp?.data ?? [];
  const sorted = useSorted(rows, sortBy, sortDir);
  const total: number     = resp?.meta?.total ?? rows.length;

  function openCreate() {
    setEditContact(null);
    setForm({ status: "Active", accountType: "Student" });
    setSheetOpen(true);
  }

  function openEdit(c: Contact) {
    setEditContact(c);
    setForm({ ...c });
    setSheetOpen(true);
  }

  function patch<K extends keyof FormData>(key: K, val: FormData[K]) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  const saveMutation = useMutation({
    mutationFn: (payload: FormData) =>
      editContact
        ? axios.put(`${BASE}/api/crm/contacts/${editContact.id}`, payload).then(r => r.data)
        : axios.post(`${BASE}/api/crm/contacts`, payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-contacts"] });
      toast({ title: editContact ? "Contact updated" : "Contact created" });
      setSheetOpen(false);
    },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  function handleSave() {
    if (!form.firstName?.trim() || !form.lastName?.trim()) {
      toast({ title: "First name and last name are required", variant: "destructive" });
      return;
    }
    saveMutation.mutate(form);
  }

  const { user } = useAuth();
  const isSA = user?.role === "super_admin";
  const { selectedIds, toggleSelect, toggleAll, clearSelection, isAllSelected } = useBulkSelect();

  const softDelMutation = useMutation({
    mutationFn: (ids: string[]) => axios.delete(`${BASE}/api/crm/contacts/bulk`, { data: { ids, soft: true } }).then(r => r.data),
    onSuccess: (_d, ids) => { qc.invalidateQueries({ queryKey: ["crm-contacts"] }); clearSelection(); toast({ title: `${ids.length}개 임시 삭제됨` }); },
    onError: () => toast({ title: "삭제 실패", variant: "destructive" }),
  });
  const hardDelMutation = useMutation({
    mutationFn: (ids: string[]) => axios.delete(`${BASE}/api/crm/contacts/bulk`, { data: { ids } }).then(r => r.data),
    onSuccess: (_d, ids) => { qc.invalidateQueries({ queryKey: ["crm-contacts"] }); clearSelection(); toast({ title: `${ids.length}개 영구 삭제됨` }); },
    onError: () => toast({ title: "삭제 실패", variant: "destructive" }),
  });
  const bulkLoading = softDelMutation.isPending || hardDelMutation.isPending;
  const sortedIds = sorted.map(r => r.id);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-800">Contacts</h1>
          <p className="text-sm text-stone-500 mt-1">Manage students, agents, and partners</p>
        </div>
        <Button
          onClick={openCreate}
          className="flex items-center gap-2 text-white rounded-lg px-4 py-2"
          style={{ background: "var(--e-orange)" }}
        >
          <Plus size={16} /> New Contact
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <Input
            placeholder="Search by name or email…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 h-9 text-sm"
          />
        </div>

        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-36 h-9 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={v => { setTypeFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40 h-9 text-sm">
            <SelectValue placeholder="Account Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {contactTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isSA && selectedIds.size > 0 && (
        <BulkActionBar
          count={selectedIds.size}
          isLoading={bulkLoading}
          onSoftDelete={() => softDelMutation.mutate(Array.from(selectedIds))}
          onHardDelete={() => hardDelMutation.mutate(Array.from(selectedIds))}
        />
      )}

      <div className="rounded-xl border border-stone-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 border-b border-stone-200">
            <tr>
              {isSA && (
                <th className="px-3 py-3 w-10">
                  <input type="checkbox" checked={isAllSelected(sortedIds)} onChange={() => toggleAll(sortedIds)} className="rounded border-stone-300" />
                </th>
              )}
              <SortableTh col="fullName" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Full Name</SortableTh>
              <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Original Name</th>
              <SortableTh col="nationality" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Nationality</SortableTh>
              <SortableTh col="primaryAccountName" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Account</SortableTh>
              <SortableTh col="status" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Status</SortableTh>
              <SortableTh col="createdOn" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide whitespace-nowrap">Created</SortableTh>
              <SortableTh col="modifiedOn" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide whitespace-nowrap">Modified</SortableTh>
              <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {isLoading && (
              <tr><td colSpan={isSA ? 9 : 8} className="text-center py-12 text-stone-400 text-sm">Loading…</td></tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr><td colSpan={isSA ? 9 : 8} className="text-center py-12 text-stone-400 text-sm">No contacts found</td></tr>
            )}
            {sorted.map(c => {
              const displayName = c.fullName || `${c.firstName} ${c.lastName}`.trim();
              const initials = [`${c.firstName ?? ""}`.charAt(0), `${c.lastName ?? ""}`.charAt(0)]
                .filter(Boolean).join("").toUpperCase() || (displayName || "?").slice(0, 2).toUpperCase();
              const imgSrc = c.profileImageUrl || null;
              return (
                <tr key={c.id} className="hover:bg-(--e-orange-lt) cursor-pointer transition-colors">
                  {isSA && (
                    <td className="px-3 py-3 w-10" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleSelect(c.id)} className="rounded border-stone-300" />
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {imgSrc ? (
                        <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-stone-200">
                          <img src={imgSrc} alt="" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 bg-[#FDE8D2] text-[#C2460A]">
                          {initials}
                        </div>
                      )}
                      <button
                        onClick={() => navigate(`/admin/crm/contacts/${c.id}`)}
                        className="font-medium text-stone-800 hover:text-(--e-orange) transition-colors text-left"
                      >
                        {displayName}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-stone-600">{c.originalName ?? "—"}</td>
                  <td className="px-4 py-3 text-stone-600">{c.nationality ?? "—"}</td>
                  <td className="px-4 py-3 text-stone-600">{c.accountType}</td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3 text-stone-500 text-xs whitespace-nowrap">{fmtDate(c.createdOn)}</td>
                  <td className="px-4 py-3 text-stone-500 text-xs whitespace-nowrap">{fmtDate(c.modifiedOn)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => navigate(`/admin/crm/contacts/${c.id}`)}
                        className="p-1.5 rounded hover:bg-stone-100 text-stone-500 hover:text-stone-800 transition-colors"
                        title="View"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => openEdit(c)}
                        className="p-1.5 rounded hover:bg-stone-100 text-stone-500 hover:text-stone-800 transition-colors"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <TableFooter page={page} pageSize={pageSize} total={total} label="contacts" onPageChange={setPage} onPageSizeChange={v => { setPageSize(v); setPage(1); }} />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editContact ? "Edit Contact" : "New Contact"}</SheetTitle>
            <SheetDescription>
              {editContact ? "Update contact details below." : "Fill in the details to create a new contact."}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4 pb-6">
            <SectionHeading>Personal</SectionHeading>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField label="Title">
                <SelectField value={form.title} onChange={v => patch("title", v)} options={TITLES} placeholder="Title" />
              </FormField>
              <FormField label="First Name" required>
                <Input
                  value={form.firstName ?? ""}
                  onChange={e => {
                    const v = e.target.value;
                    patch("firstName", v.length > 0 ? v.charAt(0).toUpperCase() + v.slice(1) : v);
                  }}
                  className="h-9 text-sm"
                  placeholder="Minjun"
                />
              </FormField>
              <FormField label="Last Name" required>
                <Input
                  value={form.lastName ?? ""}
                  onChange={e => patch("lastName", e.target.value.toUpperCase())}
                  className="h-9 text-sm uppercase"
                  placeholder="KIM"
                />
              </FormField>
            </div>

            <FormField label="Original Name">
              <Input value={form.originalName ?? ""} onChange={e => patch("originalName", e.target.value)} className="h-9 text-sm" placeholder="e.g. 김소희" />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Date of Birth">
                <Input type="date" value={form.dob ?? ""} onChange={e => patch("dob", e.target.value)} className="h-9 text-sm" />
              </FormField>
              <FormField label="Gender">
                <SelectField value={form.gender} onChange={v => patch("gender", v)} options={["Male", "Female", "Non-binary", "Prefer not to say"]} placeholder="Gender" />
              </FormField>
            </div>

            <FormField label="Nationality">
              <Input value={form.nationality ?? ""} onChange={e => patch("nationality", e.target.value)} className="h-9 text-sm" placeholder="e.g. Korean" />
            </FormField>

            <SectionHeading>Contact</SectionHeading>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Email">
                <Input type="email" value={form.email ?? ""} onChange={e => patch("email", e.target.value)} className="h-9 text-sm" placeholder="email@example.com" />
              </FormField>
              <FormField label="Mobile">
                <Input value={form.mobile ?? ""} onChange={e => patch("mobile", e.target.value)} className="h-9 text-sm" placeholder="+82 10 0000 0000" />
              </FormField>
              <FormField label="Office Number">
                <Input value={form.officeNumber ?? ""} onChange={e => patch("officeNumber", e.target.value)} className="h-9 text-sm" placeholder="+82 2 0000 0000" />
              </FormField>
              <FormField label="SNS Type">
                <SelectField value={form.snsType} onChange={v => patch("snsType", v)} options={snsTypes} placeholder="SNS Type" />
              </FormField>
            </div>

            <FormField label="SNS ID">
              <Input value={form.snsId ?? ""} onChange={e => patch("snsId", e.target.value)} className="h-9 text-sm" placeholder="@username or ID" />
            </FormField>

            <SectionHeading>Source</SectionHeading>

            <FormField label="Influx Channel">
              <SelectField value={form.influxChannel} onChange={v => patch("influxChannel", v)} options={CHANNELS} placeholder="How did they find us?" />
            </FormField>

            <SectionHeading>Dates</SectionHeading>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Important Date 1">
                <Input type="date" value={form.importantDate1 ?? ""} onChange={e => patch("importantDate1", e.target.value)} className="h-9 text-sm" />
              </FormField>
              <FormField label="Important Date 2">
                <Input type="date" value={form.importantDate2 ?? ""} onChange={e => patch("importantDate2", e.target.value)} className="h-9 text-sm" />
              </FormField>
            </div>

            <SectionHeading>Classification</SectionHeading>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Account Type">
                <SelectField value={form.accountType} onChange={v => patch("accountType", v)} options={contactTypes} placeholder="Account Type" />
              </FormField>
              <FormField label="Status">
                <SelectField value={form.status} onChange={v => patch("status", v)} options={["Active", "Inactive"]} placeholder="Status" />
              </FormField>
            </div>

            <SectionHeading>Notes</SectionHeading>

            <FormField label="Description">
              <Textarea
                value={form.description ?? ""}
                onChange={e => patch("description", e.target.value)}
                className="text-sm min-h-[80px] resize-none"
                placeholder="Additional notes about this contact…"
              />
            </FormField>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="flex-1 text-white"
                style={{ background: "var(--e-orange)" }}
              >
                {saveMutation.isPending ? "Saving…" : editContact ? "Save Changes" : "Create Contact"}
              </Button>
              <Button variant="outline" onClick={() => setSheetOpen(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
