import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SystemInfoSection } from "@/components/shared/SystemInfoSection";
import axios from "axios";
import {
  ArrowLeft, Plus, Pencil, Trash2, ExternalLink, Search, X, Check, Building2,
  Loader2, Save, RotateCcw, Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useRef } from "react";
import { ImageCropDialog } from "@/components/shared/ImageCropDialog";
import { fileToDataUrl } from "@/lib/imageResize";
import { formatDate } from "@/lib/date-format";
import { useLookup } from "@/hooks/use-lookup";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const ACCOUNT_STATUSES = ["Active", "Inactive"];
const CONTACT_STATUSES = ["Active", "Inactive"];
const GENDERS = ["Male", "Female", "Other", "Prefer not to say"];
const TITLES = ["Mr", "Mrs", "Ms", "Miss", "Dr", "Prof"];

const ROLE_LABELS: Record<string, string> = { primary: "Primary", secondary: "Secondary", both: "Both" };
const ROLE_COLORS: Record<string, string> = {
  primary:   "bg-(--e-orange-lt) text-(--e-orange)",
  secondary: "bg-[#EFF6FF] text-[#1D4ED8]",
  both:      "bg-[#DCFCE7] text-[#16A34A]",
};

const INPUT_CLS = "h-9 text-sm border-[#E8E6E2] focus:border-(--e-orange) focus-visible:ring-0 focus-visible:ring-offset-0";

function Avatar({
  firstName, lastName, imageUrl,
}: {
  firstName?: string; lastName?: string; imageUrl?: string | null;
}) {
  const initials = [firstName?.charAt(0), lastName?.charAt(0)]
    .filter(Boolean).join("").toUpperCase() || "?";

  if (imageUrl) {
    return (
      <div className="w-14 h-14 rounded-full shrink-0 overflow-hidden border-2 border-(--e-orange)/30">
        <img src={imageUrl} alt="Profile" className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold shrink-0"
         style={{ background: "var(--e-orange-lt)", color: "var(--e-orange)" }}>
      {initials}
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-bold text-(--e-orange) uppercase tracking-widest mb-4 pb-2 border-b border-(--e-orange)/20">
      {children}
    </h3>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-semibold text-stone-500 uppercase tracking-wide">{label}</Label>
      {children}
    </div>
  );
}

function FormRow({ children, cols = 2 }: { children: React.ReactNode; cols?: number }) {
  const cls = cols === 1 ? "" : cols === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2";
  return <div className={`grid gap-4 ${cls}`}>{children}</div>;
}

// ─── Account Search ────────────────────────────────────────────────────────
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
        <Input className="pl-9 h-9" placeholder="Search accounts by name…"
          value={q} onChange={e => setQ(e.target.value)} />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white border border-stone-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {results.map(r => (
            <button key={r.id} type="button"
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-(--e-orange-lt) transition-colors flex items-center gap-2"
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
    onSuccess: () => { toast({ title: "Account created and linked" }); onSuccess(); },
    onError: () => toast({ title: "Failed to create account", variant: "destructive" }),
  });

  const linkMut = useMutation({
    mutationFn: () => axios.post(`${BASE}/api/crm/contacts/${contactId}/link-account`, {
      accountId: linkAccountId, role,
    }).then(r => r.data),
    onSuccess: () => { toast({ title: "Account linked successfully" }); onSuccess(); },
    onError: () => toast({ title: "Failed to link account", variant: "destructive" }),
  });

  const isPending = createMut.isPending || linkMut.isPending;

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader><DialogTitle>Add Account</DialogTitle></DialogHeader>
      <div className="flex gap-2 mb-4">
        {(["create", "link"] as const).map(m => (
          <button key={m} onClick={() => setMode(m)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
              mode === m ? "bg-(--e-orange) text-white border-(--e-orange)" : "border-stone-200 text-stone-600 hover:bg-stone-50"
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
                  {contactTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </>
        ) : (
          <div className="space-y-1">
            <Label className="text-xs">Search Account</Label>
            <AccountSearchBox excludeIds={existingIds}
              onSelect={(aid, name) => { setLinkAccountId(aid); setLinkAccountName(name); }} />
            {linkAccountName && (
              <div className="flex items-center gap-2 mt-1 px-3 py-2 rounded-lg bg-(--e-orange-lt) text-sm">
                <Building2 className="w-3.5 h-3.5 text-(--e-orange)" />
                <span className="font-medium text-(--e-orange)">{linkAccountName}</span>
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
        <Button className="bg-(--e-orange) hover:bg-[#d97706] text-white"
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
  contactId: string; account: any; onClose: () => void; onSuccess: () => void;
}) {
  const [name, setName] = useState(account.name ?? "");
  const [accountType, setAccountType] = useState(account.accountType ?? "");
  const [status, setStatus] = useState(account.status ?? "Active");
  const { toast } = useToast();
  const contactTypes = useLookup("contact_type");

  const updateMut = useMutation({
    mutationFn: () => axios.patch(
      `${BASE}/api/crm/contacts/${contactId}/accounts/${account.id}`,
      { name, accountType, status }
    ).then(r => r.data),
    onSuccess: () => { toast({ title: "Account updated" }); onSuccess(); },
    onError: () => toast({ title: "Failed to update account", variant: "destructive" }),
  });

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader><DialogTitle>Edit Account</DialogTitle></DialogHeader>
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
              {contactTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
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
        <Button className="bg-(--e-orange) hover:bg-[#d97706] text-white"
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
  contactId: string; contactName: string; accounts: any[]; onRefresh: () => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [editAccount, setEditAccount] = useState<any>(null);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const unlinkMut = useMutation({
    mutationFn: (accountId: string) =>
      axios.delete(`${BASE}/api/crm/contacts/${contactId}/accounts/${accountId}`).then(r => r.data),
    onSuccess: () => { toast({ title: "Account unlinked" }); onRefresh(); },
    onError: () => toast({ title: "Failed to unlink account", variant: "destructive" }),
  });

  const existingIds = accounts.map(a => a.id);

  return (
    <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 bg-stone-50">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-(--e-orange)" />
          <span className="text-sm font-semibold text-stone-800">Linked Accounts</span>
          {accounts.length > 0 && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-(--e-orange-lt) text-(--e-orange)">
              {accounts.length}
            </span>
          )}
        </div>
        <Button size="sm" className="h-7 px-2.5 text-xs gap-1 bg-(--e-orange) hover:bg-[#d97706] text-white"
          onClick={() => setShowAdd(true)}>
          <Plus className="w-3.5 h-3.5" /> Add Account
        </Button>
      </div>

      {accounts.length === 0 ? (
        <div className="py-10 text-center text-sm text-stone-400">
          <Building2 className="w-8 h-8 mx-auto mb-2 text-stone-200" />
          No accounts linked yet
          <button onClick={() => setShowAdd(true)}
            className="block mx-auto mt-2 text-(--e-orange) hover:underline text-xs font-medium">
            + Add first account
          </button>
        </div>
      ) : (
        <div className="divide-y divide-stone-100">
          {accounts.map(acc => (
            <div key={acc.id} className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50 transition-colors">
              <div className="w-8 h-8 rounded-full bg-(--e-orange-lt) flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4 text-(--e-orange)" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => navigate(`/admin/crm/accounts/${acc.id}`)}
                    className="text-sm font-semibold text-stone-800 hover:text-(--e-orange) transition-colors truncate">
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
                <button onClick={() => navigate(`/admin/crm/accounts/${acc.id}`)}
                  title="View account"
                  className="p-1.5 rounded-lg text-stone-400 hover:text-(--e-orange) hover:bg-(--e-orange-lt) transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setEditAccount(acc)} title="Edit account"
                  className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => { if (confirm(`Unlink "${acc.name}" from this contact?`)) unlinkMut.mutate(acc.id); }}
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
          <AddAccountModal contactId={contactId} contactName={contactName} existingIds={existingIds}
            onClose={() => setShowAdd(false)} onSuccess={() => { setShowAdd(false); onRefresh(); }} />
        )}
      </Dialog>
      <Dialog open={!!editAccount} onOpenChange={open => !open && setEditAccount(null)}>
        {editAccount && (
          <EditAccountModal contactId={contactId} account={editAccount}
            onClose={() => setEditAccount(null)} onSuccess={() => { setEditAccount(null); onRefresh(); }} />
        )}
      </Dialog>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  firstName: "", lastName: "", englishName: "", originalName: "", fullName: "",
  title: "", dob: "", gender: "", nationality: "",
  email: "", mobile: "", officeNumber: "",
  snsType: "", snsId: "", influxChannel: "",
  importantDate1: "", importantDate2: "",
  description: "", status: "Active", accountType: "",
};

export default function ContactDetailPage() {
  const [, params]   = useRoute("/admin/crm/contacts/:id");
  const [, navigate] = useLocation();
  const { toast }    = useToast();
  const contactTypes   = useLookup("contact_type");
  const snsTypes       = useLookup("sns_type");
  const influxChannels = useLookup("influx_channel");
  const qc           = useQueryClient();
  const id           = params?.id ?? "";

  const [form, setForm]       = useState(EMPTY_FORM);
  const [isDirty, setIsDirty] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const set = (key: keyof typeof EMPTY_FORM, value: string) => {
    setForm(f => ({ ...f, [key]: value }));
    setIsDirty(true);
  };

  const { data: contact, isLoading, refetch } = useQuery({
    queryKey: ["crm-contact", id],
    queryFn: () => axios.get(`${BASE}/api/crm/contacts/${id}`).then(r => r.data),
    enabled: !!id,
  });

  useEffect(() => {
    if (!contact) return;
    setForm({
      firstName:      contact.firstName      ?? "",
      lastName:       contact.lastName       ?? "",
      englishName:    contact.englishName    ?? "",
      originalName:   contact.originalName   ?? "",
      fullName:       contact.fullName       ?? "",
      title:          contact.title          ?? "",
      dob:            contact.dob            ?? "",
      gender:         contact.gender         ?? "",
      nationality:    contact.nationality    ?? "",
      email:          contact.email          ?? "",
      mobile:         contact.mobile         ?? "",
      officeNumber:   contact.officeNumber   ?? "",
      snsType:        contact.snsType        ?? "",
      snsId:          contact.snsId          ?? "",
      influxChannel:  contact.influxChannel  ?? "",
      importantDate1: contact.importantDate1 ?? "",
      importantDate2: contact.importantDate2 ?? "",
      description:    contact.description    ?? "",
      status:         contact.status         ?? "Active",
      accountType:    contact.accountType    ?? "",
    });
    setIsDirty(false);
  }, [contact]);

  const cancelEdit = () => {
    if (!contact) return;
    setForm({
      firstName:      contact.firstName      ?? "",
      lastName:       contact.lastName       ?? "",
      englishName:    contact.englishName    ?? "",
      originalName:   contact.originalName   ?? "",
      fullName:       contact.fullName       ?? "",
      title:          contact.title          ?? "",
      dob:            contact.dob            ?? "",
      gender:         contact.gender         ?? "",
      nationality:    contact.nationality    ?? "",
      email:          contact.email          ?? "",
      mobile:         contact.mobile         ?? "",
      officeNumber:   contact.officeNumber   ?? "",
      snsType:        contact.snsType        ?? "",
      snsId:          contact.snsId          ?? "",
      influxChannel:  contact.influxChannel  ?? "",
      importantDate1: contact.importantDate1 ?? "",
      importantDate2: contact.importantDate2 ?? "",
      description:    contact.description    ?? "",
      status:         contact.status         ?? "Active",
      accountType:    contact.accountType    ?? "",
    });
    setIsDirty(false);
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const fn = form.firstName.trim();
      const ln = form.lastName.trim();
      return axios.put(`${BASE}/api/crm/contacts/${id}`, {
        ...form,
        firstName:   fn || null,
        lastName:    ln || null,
        fullName:    fn && ln ? `${fn} ${ln}` : (fn || ln || contact?.fullName),
        englishName:    form.englishName    || null,
        originalName:   form.originalName   || null,
        title:          form.title          || null,
        dob:            form.dob            || null,
        gender:         form.gender         || null,
        nationality:    form.nationality    || null,
        email:          form.email          || null,
        mobile:         form.mobile         || null,
        officeNumber:   form.officeNumber   || null,
        snsType:        form.snsType        || null,
        snsId:          form.snsId          || null,
        influxChannel:  form.influxChannel  || null,
        importantDate1: form.importantDate1 || null,
        importantDate2: form.importantDate2 || null,
        description:    form.description    || null,
        accountType:    form.accountType    || null,
      }).then(r => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-contact", id] });
      setIsDirty(false);
      toast({ title: "Contact saved" });
    },
    onError: () => toast({ title: "Failed to save contact", variant: "destructive" }),
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Image files only (JPG, PNG, etc.)", variant: "destructive" });
      return;
    }
    if (photoInputRef.current) photoInputRef.current.value = "";
    setPendingFile(file);
  };

  const doUploadContact = async (cropped: File) => {
    setPendingFile(null);
    setUploadingPhoto(true);
    try {
      const dataUrl = await fileToDataUrl(cropped);
      await axios.patch(`${BASE}/api/crm/contacts/${id}/profile-image`, { dataUrl });
      qc.invalidateQueries({ queryKey: ["crm-contact", id] });
      toast({ title: "Profile photo updated" });
    } catch {
      toast({ title: "Failed to upload photo", variant: "destructive" });
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center h-64 text-stone-400 text-sm">Loading contact…</div>;
  if (!contact)  return <div className="flex items-center justify-center h-64 text-stone-400 text-sm">Contact not found.</div>;

  const displayName = `${form.firstName} ${form.lastName}`.trim() || contact.fullName || "—";
  const linkedAccounts: any[] = contact.linkedAccounts ?? [];

  const profileImageSrc = contact.profileImageUrl || null;

  return (
    <div className="p-6 space-y-6">
      <button onClick={() => navigate("/admin/crm/contacts")}
        className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors">
        <ArrowLeft size={16} /> Back to Contacts
      </button>

      {/* ── Header ── */}
      <div className="flex items-start gap-4 justify-between flex-wrap">
        <div className="flex items-start gap-4">
          {/* Clickable avatar with camera overlay */}
          <div className="relative shrink-0 group cursor-pointer" onClick={() => !uploadingPhoto && photoInputRef.current?.click()} title="Change profile photo">
            <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            <Avatar firstName={form.firstName || contact.firstName} lastName={form.lastName || contact.lastName} imageUrl={profileImageSrc} />
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {uploadingPhoto
                ? <Loader2 size={18} className="text-white animate-spin" />
                : <Camera size={18} className="text-white" />
              }
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-stone-800">{displayName}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {form.accountType && <span className="text-sm text-stone-500">{form.accountType}</span>}
              {form.accountType && <span className="text-stone-300">·</span>}
              <StatusBadge status={form.status} />
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
        {isDirty && (
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <Button variant="outline" size="sm" onClick={cancelEdit} className="h-9 gap-1.5 text-stone-600">
              <RotateCcw size={13} /> Discard
            </Button>
            <Button size="sm" disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
              className="h-9 gap-1.5 text-white" style={{ background: "var(--e-orange)" }}>
              {saveMutation.isPending
                ? <><Loader2 size={13} className="animate-spin" /> Saving…</>
                : <><Save size={13} /> Save Changes</>}
            </Button>
          </div>
        )}
      </div>

      {/* ── Unsaved banner ── */}
      {isDirty && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-[#FEF9C3] border border-[#CA8A04]/30 rounded-xl text-sm text-[#854D0E]">
          <span className="w-2 h-2 rounded-full bg-[#CA8A04] shrink-0" />
          You have unsaved changes — click <strong className="mx-1">Save Changes</strong> to apply.
        </div>
      )}

      {/* ── Name ── */}
      <div className="bg-white border border-[#E8E6E2] rounded-xl p-5 space-y-4">
        <SectionTitle>Name</SectionTitle>
        <FormRow>
          <FieldGroup label="First Name">
            <Input value={form.firstName} onChange={e => set("firstName", e.target.value)}
              placeholder="First name" className={INPUT_CLS} />
          </FieldGroup>
          <FieldGroup label="Last Name">
            <Input value={form.lastName} onChange={e => set("lastName", e.target.value)}
              placeholder="Last name" className={INPUT_CLS} />
          </FieldGroup>
        </FormRow>
        <FormRow>
          <FieldGroup label="English Name (Nickname)">
            <Input value={form.englishName} onChange={e => set("englishName", e.target.value)}
              placeholder="e.g. James" className={INPUT_CLS} />
          </FieldGroup>
          <FieldGroup label="Original Name (Native)">
            <Input value={form.originalName} onChange={e => set("originalName", e.target.value)}
              placeholder="e.g. Kim Minjun" className={INPUT_CLS} />
          </FieldGroup>
        </FormRow>
      </div>

      {/* ── Personal Info ── */}
      <div className="bg-white border border-[#E8E6E2] rounded-xl p-5 space-y-4">
        <SectionTitle>Personal Info</SectionTitle>
        <FormRow cols={3}>
          <FieldGroup label="Title">
            <Select value={form.title || "none"} onValueChange={v => set("title", v === "none" ? "" : v)}>
              <SelectTrigger className={INPUT_CLS}><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {TITLES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldGroup>
          <FieldGroup label="Gender">
            <Select value={form.gender || "none"} onValueChange={v => set("gender", v === "none" ? "" : v)}>
              <SelectTrigger className={INPUT_CLS}><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {GENDERS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldGroup>
          <FieldGroup label="Date of Birth">
            <Input type="date" value={form.dob} onChange={e => set("dob", e.target.value)}
              className={INPUT_CLS} />
          </FieldGroup>
        </FormRow>
        <FormRow>
          <FieldGroup label="Nationality">
            <Input value={form.nationality} onChange={e => set("nationality", e.target.value)}
              placeholder="e.g. Korean" className={INPUT_CLS} />
          </FieldGroup>
          <FieldGroup label="Status">
            <Select value={form.status || "Active"} onValueChange={v => set("status", v)}>
              <SelectTrigger className={INPUT_CLS}><SelectValue /></SelectTrigger>
              <SelectContent>
                {CONTACT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldGroup>
        </FormRow>
      </div>

      {/* ── Contact Info ── */}
      <div className="bg-white border border-[#E8E6E2] rounded-xl p-5 space-y-4">
        <SectionTitle>Contact Info</SectionTitle>
        <FormRow>
          <FieldGroup label="Email">
            <Input type="email" value={form.email} onChange={e => set("email", e.target.value)}
              placeholder="email@example.com" className={INPUT_CLS} />
          </FieldGroup>
          <FieldGroup label="Mobile">
            <Input value={form.mobile} onChange={e => set("mobile", e.target.value)}
              placeholder="+61 4xx xxx xxx" className={INPUT_CLS} />
          </FieldGroup>
        </FormRow>
        <FormRow>
          <FieldGroup label="Office Number">
            <Input value={form.officeNumber} onChange={e => set("officeNumber", e.target.value)}
              placeholder="Office / home number" className={INPUT_CLS} />
          </FieldGroup>
          <FieldGroup label="Influx Channel">
            <Select value={form.influxChannel || "none"} onValueChange={v => set("influxChannel", v === "none" ? "" : v)}>
              <SelectTrigger className={INPUT_CLS}><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {influxChannels.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldGroup>
        </FormRow>
      </div>

      {/* ── SNS & Dates ── */}
      <div className="bg-white border border-[#E8E6E2] rounded-xl p-5 space-y-4">
        <SectionTitle>SNS & Important Dates</SectionTitle>
        <FormRow>
          <FieldGroup label="SNS Type">
            <Select value={form.snsType || "none"} onValueChange={v => set("snsType", v === "none" ? "" : v)}>
              <SelectTrigger className={INPUT_CLS}><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {snsTypes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldGroup>
          <FieldGroup label="SNS ID">
            <Input value={form.snsId} onChange={e => set("snsId", e.target.value)}
              placeholder="Username / ID" className={INPUT_CLS} />
          </FieldGroup>
        </FormRow>
        <FormRow>
          <FieldGroup label="Important Date 1">
            <Input type="date" value={form.importantDate1}
              onChange={e => set("importantDate1", e.target.value)} className={INPUT_CLS} />
            {form.importantDate1 && (
              <p className="text-xs text-muted-foreground mt-1">{formatDate(form.importantDate1)}</p>
            )}
          </FieldGroup>
          <FieldGroup label="Important Date 2">
            <Input type="date" value={form.importantDate2}
              onChange={e => set("importantDate2", e.target.value)} className={INPUT_CLS} />
            {form.importantDate2 && (
              <p className="text-xs text-muted-foreground mt-1">{formatDate(form.importantDate2)}</p>
            )}
          </FieldGroup>
        </FormRow>
      </div>

      {/* ── Notes ── */}
      <div className="bg-white border border-[#E8E6E2] rounded-xl p-5">
        <SectionTitle>Notes</SectionTitle>
        <Textarea value={form.description}
          onChange={e => set("description", e.target.value)}
          placeholder="Additional notes about this contact…"
          rows={6}
          className="text-sm border-[#E8E6E2] focus:border-(--e-orange) focus-visible:ring-0 resize-y" />
      </div>

      {/* ── Linked Accounts ── */}
      <LinkedAccountsSection
        contactId={id}
        contactName={displayName}
        accounts={linkedAccounts}
        onRefresh={() => refetch()}
      />

      <SystemInfoSection
        id={contact.id}
        recordIdLabel="Contact ID"
        createdAt={contact.createdAt}
        updatedAt={contact.updatedAt}
        dateOnly
      />

      <ImageCropDialog
        file={pendingFile}
        onConfirm={doUploadContact}
        onCancel={() => setPendingFile(null)}
      />
    </div>
  );
}
