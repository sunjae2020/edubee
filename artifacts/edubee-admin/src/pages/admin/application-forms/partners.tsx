import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft, Plus, Edit2, Trash2, Copy, Check,
  Loader2, Users, X, RefreshCw,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const APPLY_BASE = (import.meta.env.VITE_APPLY_BASE_URL as string | undefined) ?? "https://edubee.co";

interface PartnerAccount { id: string; name: string; accountType: string; email: string | null; }
interface ApplicationFormPartner {
  id: string; formId: string; partnerAccountId: string; partnerParameter: string;
  displayName: string | null; emailNotification: string; partnerEmailOverride: string | null;
  isActive: boolean; partnerName: string | null; partnerType: string | null; partnerEmail: string | null;
}
interface ApplicationForm { id: string; name: string; slug: string; visibility: string; status: string; }

// ── Helpers ─────────────────────────────────────────────────────────────────
const TYPE_BADGE: Record<string, string> = {
  Agent: "bg-blue-50 text-blue-700",
  Provider: "bg-purple-50 text-purple-700",
  Organisation: "bg-(--e-orange-lt) text-(--e-orange)",
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="shrink-0 p-1.5 rounded hover:bg-(--e-orange-lt) text-[#A8A29E] hover:text-(--e-orange) transition-colors"
      title="Copy URL"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ── Add / Edit Modal ─────────────────────────────────────────────────────────
function PartnerModal({
  formId, formName, partner, existingParameters, onClose,
}: {
  formId: string; formName: string; partner?: ApplicationFormPartner;
  existingParameters: string[]; onClose: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const isEdit = !!partner;

  const [accountSearch, setAccountSearch] = useState(partner?.partnerName ?? "");
  const [selectedAccount, setSelectedAccount] = useState<PartnerAccount | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [parameter, setParameter] = useState(partner?.partnerParameter ?? "");
  const [displayName, setDisplayName] = useState(partner?.displayName ?? "");
  const [emailNotif, setEmailNotif] = useState(partner?.emailNotification ?? "both");
  const [partnerEmail, setPartnerEmail] = useState(partner?.partnerEmailOverride ?? partner?.partnerEmail ?? "");
  const [isActive, setIsActive] = useState(partner?.isActive !== false);

  const paramDuplicate = existingParameters
    .filter(p => !isEdit || p !== partner?.partnerParameter)
    .includes(parameter.trim());

  const { data: accounts = [] } = useQuery<PartnerAccount[]>({
    queryKey: ["partner-accounts", accountSearch],
    queryFn: () => axios.get(`${BASE}/api/partner-accounts?search=${encodeURIComponent(accountSearch)}`).then(r => r.data),
    enabled: accountSearch.length >= 1,
  });

  useEffect(() => {
    if (selectedAccount) {
      setPartnerEmail(selectedAccount.email ?? "");
    }
  }, [selectedAccount]);

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        partnerAccountId: isEdit ? partner!.partnerAccountId : selectedAccount?.id,
        partnerParameter: parameter.trim(),
        displayName: displayName || null,
        emailNotification: emailNotif,
        partnerEmailOverride: partnerEmail || null,
        isActive,
      };
      return isEdit
        ? axios.put(`${BASE}/api/application-forms/${formId}/partners/${partner!.id}`, payload).then(r => r.data)
        : axios.post(`${BASE}/api/application-forms/${formId}/partners`, payload).then(r => r.data);
    },
    onSuccess: () => {
      toast({ title: isEdit ? "Partner Updated" : "Partner Added", description: `Partner link saved.` });
      qc.invalidateQueries({ queryKey: ["form-partners", formId] });
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.response?.data?.error ?? "Save failed", variant: "destructive" });
    },
  });

  const canSave = isEdit
    ? parameter.trim() && !paramDuplicate
    : selectedAccount && parameter.trim() && !paramDuplicate;

  const inputCls = "h-9 text-sm border-[#E8E6E2] focus-visible:ring-(--e-orange)/40 focus-visible:border-(--e-orange) rounded-lg";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg space-y-5 overflow-y-auto max-h-[90vh] p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#1C1917]">{isEdit ? "Edit Partner Link" : "Add Partner Link"}</h2>
          <button onClick={onClose} className="text-[#A8A29E] hover:text-[#1C1917]"><X className="w-5 h-5" /></button>
        </div>

        {/* Partner Account */}
        {!isEdit && (
          <div className="space-y-1.5 relative">
            <label className="block text-[11px] font-semibold text-[#57534E] uppercase tracking-wide">
              Partner Account <span className="text-red-500">*</span>
            </label>
            {selectedAccount ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-(--e-orange-lt) rounded-lg border border-(--e-orange)/30">
                <span className="text-sm text-[#1C1917] flex-1">{selectedAccount.name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${TYPE_BADGE[selectedAccount.accountType] ?? "bg-gray-100 text-gray-700"}`}>
                  {selectedAccount.accountType}
                </span>
                <button onClick={() => { setSelectedAccount(null); setAccountSearch(""); }} className="text-[#A8A29E] hover:text-red-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Input
                  value={accountSearch}
                  onChange={e => { setAccountSearch(e.target.value); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Search Agent, Provider, Organisation..."
                  className={inputCls}
                />
                {showDropdown && accounts.length > 0 && (
                  <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-[#E8E6E2] rounded-xl shadow-lg z-10 max-h-48 overflow-y-auto">
                    {accounts.map(a => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => { setSelectedAccount(a); setAccountSearch(a.name); setShowDropdown(false); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-[#FAFAF9] flex items-center justify-between gap-2 border-b border-[#E8E6E2] last:border-b-0"
                      >
                        <span className="text-sm text-[#1C1917]">{a.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${TYPE_BADGE[a.accountType] ?? "bg-gray-100 text-gray-700"}`}>
                          {a.accountType}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Parameter */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-semibold text-[#57534E] uppercase tracking-wide">
            Partner Parameter <span className="text-red-500">*</span>
          </label>
          <Input
            value={parameter}
            onChange={e => setParameter(e.target.value.replace(/[^a-zA-Z0-9-]/g, "").toUpperCase())}
            placeholder="e.g. TST001 or ABC-EDU"
            className={`${inputCls} font-mono ${paramDuplicate ? "border-red-400 focus-visible:ring-red-400/40" : ""}`}
          />
          {paramDuplicate && <p className="text-xs text-red-500">This parameter is already used in this form.</p>}
          <p className="text-[11px] text-[#A8A29E]">Used in the URL: …?partner={parameter || "PARAM"}</p>
        </div>

        {/* Display Name */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-semibold text-[#57534E] uppercase tracking-wide">Display Name</label>
          <div className="flex gap-2">
            <Input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Auto-generated if empty"
              className={`${inputCls} flex-1`}
            />
          </div>
          <p className="text-[11px] text-[#A8A29E]">Leave blank to auto-generate: FormName-PartnerName(parameter)</p>
        </div>

        {/* Email Notification */}
        <div className="space-y-2">
          <label className="block text-[11px] font-semibold text-[#57534E] uppercase tracking-wide">
            Email Notification <span className="text-red-500">*</span>
          </label>
          {[
            { value: "applicant", label: "Applicant Only", desc: "Confirmation email sent to applicant only" },
            { value: "partner",   label: "Partner Only",   desc: "Notification sent to partner only" },
            { value: "both",      label: "Both",           desc: "Emails sent to both applicant and partner" },
          ].map(opt => (
            <label key={opt.value} className="flex items-start gap-3 cursor-pointer">
              <input type="radio" name="emailNotif" value={opt.value} checked={emailNotif === opt.value}
                onChange={() => setEmailNotif(opt.value)} className="mt-0.5 accent-(--e-orange)" />
              <div>
                <p className="text-sm font-medium text-[#1C1917]">{opt.label}</p>
                <p className="text-xs text-[#A8A29E]">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>

        {/* Partner Email */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-semibold text-[#57534E] uppercase tracking-wide">
            Partner Email {emailNotif !== "applicant" && <span className="text-red-500">*</span>}
          </label>
          <Input
            value={partnerEmail}
            onChange={e => setPartnerEmail(e.target.value)}
            placeholder="partner@example.com"
            disabled={emailNotif === "applicant"}
            className={`${inputCls} ${emailNotif === "applicant" ? "bg-[#F4F3F1] text-[#A8A29E]" : ""}`}
          />
        </div>

        {/* Active */}
        <div className="flex items-center justify-between py-1">
          <div>
            <p className="text-sm font-medium text-[#1C1917]">Active</p>
            <p className="text-xs text-[#A8A29E]">Enable or disable this partner link</p>
          </div>
          <button
            type="button"
            onClick={() => setIsActive(s => !s)}
            className={`relative w-11 h-6 rounded-full transition-colors ${isActive ? "bg-(--e-orange)" : "bg-[#E8E6E2]"}`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${isActive ? "left-6" : "left-1"}`} />
          </button>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            className="bg-(--e-orange) hover:bg-(--e-orange-hover) text-white"
            disabled={!canSave || save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function ApplicationFormPartners() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ApplicationFormPartner | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const { data: form, isLoading: formLoading } = useQuery<ApplicationForm>({
    queryKey: ["application-form", params.id],
    queryFn: () => axios.get(`${BASE}/api/application-forms/${params.id}`).then(r => r.data),
  });

  const { data: partners = [], isLoading: partnersLoading } = useQuery<ApplicationFormPartner[]>({
    queryKey: ["form-partners", params.id],
    queryFn: () => axios.get(`${BASE}/api/application-forms/${params.id}/partners`).then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (pid: string) => axios.delete(`${BASE}/api/application-forms/${params.id}/partners/${pid}`).then(r => r.data),
    onSuccess: () => {
      toast({ title: "Partner Removed" });
      qc.invalidateQueries({ queryKey: ["form-partners", params.id] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.response?.data?.error ?? "Delete failed", variant: "destructive" });
    },
  });

  const toggleActive = useMutation({
    mutationFn: ({ pid, isActive }: { pid: string; isActive: boolean }) =>
      axios.put(`${BASE}/api/application-forms/${params.id}/partners/${pid}`, { isActive }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["form-partners", params.id] }),
  });

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 1500);
  };

  const existingParameters = partners.map(p => p.partnerParameter);

  const NOTIF_LABEL: Record<string, string> = {
    applicant: "Applicant Only",
    partner: "Partner Only",
    both: "Both",
  };

  if (formLoading) return (
    <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-(--e-orange)" />
    </div>
  );

  if (!form) return (
    <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center">
      <p className="text-[#A8A29E]">Form not found.</p>
    </div>
  );

  const baseUrl = `${APPLY_BASE}/${form.slug}`;

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#E8E6E2] px-6 py-4">
        <div className="flex items-center gap-2 text-sm mb-1">
          <button
            onClick={() => setLocation("/admin/application-forms")}
            className="text-[#A8A29E] hover:text-(--e-orange) transition-colors"
          >
            Application Forms
          </button>
          <ChevronLeft className="w-3.5 h-3.5 text-[#A8A29E] rotate-180" />
          <button
            onClick={() => setLocation(`/admin/application-forms/${form.id}/edit`)}
            className="text-[#A8A29E] hover:text-(--e-orange) transition-colors"
          >
            {form.name}
          </button>
          <ChevronLeft className="w-3.5 h-3.5 text-[#A8A29E] rotate-180" />
          <span className="font-semibold text-[#1C1917]">Partner Links</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {/* Form Summary Card */}
        <div className="bg-white rounded-xl border border-[#E8E6E2] p-5 flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#1C1917]">{form.name}</h2>
              {form.visibility === "public" ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-50 text-green-700">Public</span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F4F3F1] text-[#57534E]">Private</span>
              )}
              {form.status !== "active" && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-600">Inactive</span>
              )}
            </div>
            <p className="text-xs font-mono text-[#A8A29E]">{baseUrl}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyUrl(baseUrl)}
              className="text-xs"
            >
              {copiedUrl === baseUrl ? <><Check className="w-3.5 h-3.5 mr-1.5 text-green-600" />Copied!</> : <><Copy className="w-3.5 h-3.5 mr-1.5" />Copy Base URL</>}
            </Button>
            <Button
              size="sm"
              className="bg-(--e-orange) hover:bg-(--e-orange-hover) text-white"
              onClick={() => { setEditTarget(null); setModalOpen(true); }}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add Partner Link
            </Button>
          </div>
        </div>

        {/* Partners Table */}
        <div className="bg-white rounded-xl border border-[#E8E6E2] overflow-hidden">
          {partnersLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-5 h-5 animate-spin text-(--e-orange)" />
            </div>
          ) : partners.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-[#A8A29E]">
              <Users className="w-8 h-8" />
              <p className="text-sm">No partner links yet. Add your first partner.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]">
                <thead>
                  <tr className="border-b border-[#E8E6E2] bg-[#F4F3F1]">
                    {["Display Name", "Partner", "Type", "Parameter", "Email", "Full URL", "Active", "Actions"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-[#57534E] uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {partners.map((p, i) => {
                    const fullUrl = `${baseUrl}?partner=${p.partnerParameter}`;
                    return (
                      <tr key={p.id} className={`border-b border-[#E8E6E2] hover:bg-[#FAFAF9] transition-colors ${i === partners.length - 1 ? "border-b-0" : ""}`}>
                        <td className="px-4 py-3 max-w-[180px]">
                          <p className="text-xs text-[#1C1917] truncate font-medium">{p.displayName || "—"}</p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-[#1C1917]">{p.partnerName ?? "—"}</span>
                        </td>
                        <td className="px-4 py-3">
                          {p.partnerType && (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${TYPE_BADGE[p.partnerType] ?? "bg-gray-100 text-gray-700"}`}>
                              {p.partnerType}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-[#1C1917] bg-[#F4F3F1] px-2 py-0.5 rounded">{p.partnerParameter}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-xs text-[#57534E]">{NOTIF_LABEL[p.emailNotification] ?? p.emailNotification}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 min-w-0">
                            <span className="text-[11px] font-mono text-[#A8A29E] truncate max-w-[160px]">{fullUrl}</span>
                            <CopyButton text={fullUrl} />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleActive.mutate({ pid: p.id, isActive: !p.isActive })}
                            className={`relative w-10 h-5 rounded-full transition-colors ${p.isActive ? "bg-(--e-orange)" : "bg-[#E8E6E2]"}`}
                          >
                            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${p.isActive ? "left-5" : "left-0.5"}`} />
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => { setEditTarget(p); setModalOpen(true); }}
                              className="p-1.5 rounded-lg hover:bg-(--e-orange-lt) text-[#57534E] hover:text-(--e-orange) transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (!window.confirm(`Remove "${p.partnerName}" from this form?`)) return;
                                deleteMutation.mutate(p.id);
                              }}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-[#57534E] hover:text-red-600 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {modalOpen && (
        <PartnerModal
          formId={form.id}
          formName={form.name}
          partner={editTarget ?? undefined}
          existingParameters={existingParameters}
          onClose={() => { setModalOpen(false); setEditTarget(null); }}
        />
      )}
    </div>
  );
}
