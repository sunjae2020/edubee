import { useState, useRef, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SystemInfoSection } from "@/components/shared/SystemInfoSection";
import axios from "axios";
import {
  ArrowLeft,
  Plus, Pencil, Trash2, ExternalLink, Search, X, Check, Building2,
  ChevronDown, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");


const ACCOUNT_TYPES = ["Student", "Organisation", "Agent", "School", "Staff", "Other"];
const ACCOUNT_STATUSES = ["Active", "Inactive"];
const ROLE_LABELS: Record<string, string> = { primary: "Primary", secondary: "Secondary", both: "Both" };
const ROLE_COLORS: Record<string, string> = {
  primary:   "bg-[#FEF0E3] text-[#F5821F]",
  secondary: "bg-[#EFF6FF] text-[#1D4ED8]",
  both:      "bg-[#DCFCE7] text-[#16A34A]",
};

function DetailField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-stone-400 mb-0.5">{label}</p>
      <p className="text-sm text-stone-800 font-medium">{value || "—"}</p>
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold"
         style={{ background: "#FEF0E3", color: "#F5821F" }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function StatusBadge({ status }: { status?: string | null }) {
  const active = (status ?? "").toLowerCase() === "active";
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
      active ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#F4F3F1] text-[#57534E]"
    }`}>
      {status ?? "—"}
    </span>
  );
}

// ─── Account Search for linking existing accounts ──────────────────────────
function AccountSearchBox({ onSelect, excludeIds = [] }: {
  onSelect: (id: string, name: string) => void;
  excludeIds?: string[];
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    const t = setTimeout(async () => {
      try {
        const token = localStorage.getItem("edubee_token");
        const res = await fetch(`${BASE}/api/crm/accounts-search?search=${encodeURIComponent(q)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setResults((data ?? []).filter((a: any) => !excludeIds.includes(a.id)));
        setOpen(true);
      } catch { setResults([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        <Input
          className="pl-9 h-9"
          placeholder="Search accounts by name…"
          value={q}
          onChange={e => setQ(e.target.value)}
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white border border-stone-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {results.map(r => (
            <button key={r.id} type="button"
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-[#FEF0E3] transition-colors flex items-center gap-2"
              onMouseDown={() => { onSelect(r.id, r.name); setQ(""); setOpen(false); }}>
              <Building2 className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span className="font-medium text-stone-800">{r.name}</span>
              {r.accountType && <span className="text-xs text-stone-400 ml-auto">{r.accountType}</span>}
            </button>
          ))}
        </div>
      )}
      {open && results.length === 0 && q.trim() && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white border border-stone-200 rounded-xl shadow-lg p-3 text-sm text-stone-400 text-center">
          No accounts found
        </div>
      )}
    </div>
  );
}

// ─── Add Account Modal ─────────────────────────────────────────────────────
function AddAccountModal({ contactId, contactName, existingIds, onClose, onSuccess }: {
  contactId: string; contactName: string;
  existingIds: string[];
  onClose: () => void; onSuccess: () => void;
}) {
  const [mode, setMode] = useState<"create" | "link">("create");
  const [accountType, setAccountType] = useState("Student");
  const [accountName, setAccountName] = useState(contactName);
  const [role, setRole] = useState("primary");
  const [linkAccountId, setLinkAccountId] = useState("");
  const [linkAccountName, setLinkAccountName] = useState("");
  const { toast } = useToast();

  const createMut = useMutation({
    mutationFn: () => axios.post(`${BASE}/api/crm/contacts/${contactId}/accounts`, {
      accountType, name: accountName, role,
    }).then(r => r.data),
    onSuccess: () => {
      toast({ title: "Account created and linked" });
      onSuccess();
    },
    onError: () => toast({ title: "Failed to create account", variant: "destructive" }),
  });

  const linkMut = useMutation({
    mutationFn: () => axios.post(`${BASE}/api/crm/contacts/${contactId}/link-account`, {
      accountId: linkAccountId, role,
    }).then(r => r.data),
    onSuccess: () => {
      toast({ title: "Account linked successfully" });
      onSuccess();
    },
    onError: () => toast({ title: "Failed to link account", variant: "destructive" }),
  });

  const isPending = createMut.isPending || linkMut.isPending;

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Add Account</DialogTitle>
      </DialogHeader>

      <div className="flex gap-2 mb-4">
        {(["create", "link"] as const).map(m => (
          <button key={m} onClick={() => setMode(m)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
              mode === m ? "bg-[#F5821F] text-white border-[#F5821F]" : "border-stone-200 text-stone-600 hover:bg-stone-50"
            }`}>
            {m === "create" ? "Create New" : "Link Existing"}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {mode === "create" ? (
          <>
            <div className="space-y-1">
              <Label className="text-xs">Account Name</Label>
              <Input value={accountName} onChange={e => setAccountName(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Account Type</Label>
              <Select value={accountType} onValueChange={setAccountType}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </>
        ) : (
          <div className="space-y-1">
            <Label className="text-xs">Search Account</Label>
            <AccountSearchBox
              excludeIds={existingIds}
              onSelect={(id, name) => { setLinkAccountId(id); setLinkAccountName(name); }}
            />
            {linkAccountName && (
              <div className="flex items-center gap-2 mt-1 px-3 py-2 rounded-lg bg-[#FEF0E3] text-sm">
                <Building2 className="w-3.5 h-3.5 text-[#F5821F]" />
                <span className="font-medium text-[#F5821F]">{linkAccountName}</span>
                <button onClick={() => { setLinkAccountId(""); setLinkAccountName(""); }}
                  className="ml-auto text-stone-400 hover:text-stone-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        <div className="space-y-1">
          <Label className="text-xs">Role in Account</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="primary">Primary Contact</SelectItem>
              <SelectItem value="secondary">Secondary Contact</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-4">
        <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
        <Button
          className="bg-[#F5821F] hover:bg-[#d97706] text-white"
          disabled={isPending || (mode === "link" && !linkAccountId) || (mode === "create" && !accountName.trim())}
          onClick={() => mode === "create" ? createMut.mutate() : linkMut.mutate()}>
          {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
          {mode === "create" ? "Create & Link" : "Link Account"}
        </Button>
      </div>
    </DialogContent>
  );
}

// ─── Edit Account Modal ────────────────────────────────────────────────────
function EditAccountModal({ contactId, account, onClose, onSuccess }: {
  contactId: string; account: any;
  onClose: () => void; onSuccess: () => void;
}) {
  const [name, setName] = useState(account.name ?? "");
  const [accountType, setAccountType] = useState(account.accountType ?? "");
  const [status, setStatus] = useState(account.status ?? "Active");
  const { toast } = useToast();

  const updateMut = useMutation({
    mutationFn: () => axios.patch(
      `${BASE}/api/crm/contacts/${contactId}/accounts/${account.id}`,
      { name, accountType, status }
    ).then(r => r.data),
    onSuccess: () => {
      toast({ title: "Account updated" });
      onSuccess();
    },
    onError: () => toast({ title: "Failed to update account", variant: "destructive" }),
  });

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Edit Account</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Account Name</Label>
          <Input value={name} onChange={e => setName(e.target.value)} className="h-9" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Account Type</Label>
          <Select value={accountType} onValueChange={setAccountType}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>
              {ACCOUNT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ACCOUNT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="outline" onClick={onClose} disabled={updateMut.isPending}>Cancel</Button>
        <Button
          className="bg-[#F5821F] hover:bg-[#d97706] text-white"
          onClick={() => updateMut.mutate()}
          disabled={updateMut.isPending || !name.trim()}>
          {updateMut.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
          Save Changes
        </Button>
      </div>
    </DialogContent>
  );
}

// ─── Linked Accounts Section ───────────────────────────────────────────────
function LinkedAccountsSection({ contactId, contactName, accounts, onRefresh }: {
  contactId: string; contactName: string;
  accounts: any[]; onRefresh: () => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [editAccount, setEditAccount] = useState<any>(null);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const unlinkMut = useMutation({
    mutationFn: (accountId: string) => axios.delete(
      `${BASE}/api/crm/contacts/${contactId}/accounts/${accountId}`
    ).then(r => r.data),
    onSuccess: () => {
      toast({ title: "Account unlinked" });
      onRefresh();
    },
    onError: () => toast({ title: "Failed to unlink account", variant: "destructive" }),
  });

  const existingIds = accounts.map(a => a.id);

  return (
    <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 bg-stone-50">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[#F5821F]" />
          <span className="text-sm font-semibold text-stone-800">Linked Accounts</span>
          {accounts.length > 0 && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#FEF0E3] text-[#F5821F]">
              {accounts.length}
            </span>
          )}
        </div>
        <Button size="sm" className="h-7 px-2.5 text-xs gap-1 bg-[#F5821F] hover:bg-[#d97706] text-white"
          onClick={() => setShowAdd(true)}>
          <Plus className="w-3.5 h-3.5" /> Add Account
        </Button>
      </div>

      {accounts.length === 0 ? (
        <div className="py-10 text-center text-sm text-stone-400">
          <Building2 className="w-8 h-8 mx-auto mb-2 text-stone-200" />
          No accounts linked yet
          <button onClick={() => setShowAdd(true)}
            className="block mx-auto mt-2 text-[#F5821F] hover:underline text-xs font-medium">
            + Add first account
          </button>
        </div>
      ) : (
        <div className="divide-y divide-stone-100">
          {accounts.map(acc => (
            <div key={acc.id} className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50 transition-colors">
              <div className="w-8 h-8 rounded-full bg-[#FEF0E3] flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4 text-[#F5821F]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => navigate(`/admin/crm/accounts/${acc.id}`)}
                    className="text-sm font-semibold text-stone-800 hover:text-[#F5821F] transition-colors truncate">
                    {acc.name}
                  </button>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${ROLE_COLORS[acc.role] ?? "bg-stone-100 text-stone-500"}`}>
                    {ROLE_LABELS[acc.role] ?? acc.role}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-stone-400 flex-wrap">
                  {acc.accountType && <span>{acc.accountType}</span>}
                  {acc.email && <span>{acc.email}</span>}
                  {acc.city && <span>{acc.city}</span>}
                  <StatusBadge status={acc.status} />
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => navigate(`/admin/crm/accounts/${acc.id}`)}
                  title="View account"
                  className="p-1.5 rounded-lg text-stone-400 hover:text-[#F5821F] hover:bg-[#FEF0E3] transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setEditAccount(acc)}
                  title="Edit account"
                  className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Unlink "${acc.name}" from this contact?`)) {
                      unlinkMut.mutate(acc.id);
                    }
                  }}
                  disabled={unlinkMut.isPending}
                  title="Unlink account"
                  className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={open => !open && setShowAdd(false)}>
        {showAdd && (
          <AddAccountModal
            contactId={contactId}
            contactName={contactName}
            existingIds={existingIds}
            onClose={() => setShowAdd(false)}
            onSuccess={() => { setShowAdd(false); onRefresh(); }}
          />
        )}
      </Dialog>

      <Dialog open={!!editAccount} onOpenChange={open => !open && setEditAccount(null)}>
        {editAccount && (
          <EditAccountModal
            contactId={contactId}
            account={editAccount}
            onClose={() => setEditAccount(null)}
            onSuccess={() => { setEditAccount(null); onRefresh(); }}
          />
        )}
      </Dialog>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function ContactDetailPage() {
  const [, params] = useRoute("/admin/crm/contacts/:id");
  const [, navigate] = useLocation();
  const id = params?.id ?? "";
  const qc = useQueryClient();

  const { data: contact, isLoading, refetch } = useQuery({
    queryKey: ["crm-contact", id],
    queryFn: () => axios.get(`${BASE}/api/crm/contacts/${id}`).then(r => r.data),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-stone-400 text-sm">
        Loading contact…
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="flex items-center justify-center h-64 text-stone-400 text-sm">
        Contact not found.
      </div>
    );
  }

  const fullName = `${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim();
  const linkedAccounts: any[] = contact.linkedAccounts ?? [];

  return (
    <div className="p-6 space-y-6">
      <button
        onClick={() => navigate("/admin/crm/contacts")}
        className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors"
      >
        <ArrowLeft size={16} /> Back to Contacts
      </button>

      {/* Header */}
      <div className="flex items-start gap-4">
        <Avatar name={fullName || "?"} />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-stone-800">{fullName || "—"}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-stone-500">{contact.accountType}</span>
            <span className="text-stone-300">·</span>
            <StatusBadge status={contact.status} />
            {linkedAccounts.length > 0 && (
              <>
                <span className="text-stone-300">·</span>
                <span className="text-sm text-stone-400">
                  {linkedAccounts.length} account{linkedAccounts.length > 1 ? "s" : ""} linked
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-6">
        {/* Contact Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <DetailField label="Full Name"        value={contact.fullName} />
          <DetailField label="First Name"       value={contact.firstName} />
          <DetailField label="Last Name"        value={contact.lastName} />
          <DetailField label="Original Name"    value={contact.originalName} />
          <DetailField label="Title"            value={contact.title} />
          <DetailField label="Date of Birth"    value={contact.dob} />
          <DetailField label="Gender"           value={contact.gender} />
          <DetailField label="Nationality"      value={contact.nationality} />
          <DetailField label="Email"            value={contact.email} />
          <DetailField label="Mobile"           value={contact.mobile} />
          <DetailField label="Office Number"    value={contact.officeNumber} />
          <DetailField label="SNS Type"         value={contact.snsType} />
          <DetailField label="SNS ID"           value={contact.snsId} />
          <DetailField label="Influx Channel"   value={contact.influxChannel} />
          <DetailField label="Important Date 1" value={contact.importantDate1} />
          <DetailField label="Important Date 2" value={contact.importantDate2} />
          {contact.description && (
            <div className="col-span-full">
              <p className="text-xs text-stone-400 mb-0.5">Notes</p>
              <p className="text-sm text-stone-700 whitespace-pre-wrap">{contact.description}</p>
            </div>
          )}
        </div>

        {/* Linked Accounts */}
        <LinkedAccountsSection
          contactId={id}
          contactName={fullName}
          accounts={linkedAccounts}
          onRefresh={() => refetch()}
        />
        <SystemInfoSection owner={contact.createdBy ?? null} createdAt={contact.createdAt} updatedAt={contact.updatedAt} />
      </div>
    </div>
  );
}
