import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, RotateCcw, Loader2, BookOpen } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface CoaRow {
  id: string;
  code: string;
  name: string;
  accountType: string;
  description?: string | null;
  parentCode?: string | null;
  isActive: boolean;
  createdOn?: string | null;
  modifiedOn?: string | null;
}

interface FormState {
  name: string;
  accountType: string;
  description: string;
  isActive: boolean;
}

const ACCOUNT_TYPE_OPTS = [
  { value: "asset",     label: "Asset" },
  { value: "liability", label: "Liability" },
  { value: "equity",    label: "Equity" },
  { value: "revenue",   label: "Revenue" },
  { value: "cogs",      label: "Cost of Sales" },
  { value: "expense",   label: "Expense" },
];

const EMPTY_FORM: FormState = { name: "", accountType: "asset", description: "", isActive: true };

function codeBadgeColor(code: string): string {
  if (code.startsWith("1")) return "#DCFCE7";
  if (code.startsWith("2")) return "#FEF9C3";
  if (code.startsWith("3")) return "#EDE9FE";
  if (code.startsWith("4")) return "var(--e-orange-lt)";
  if (code.startsWith("5")) return "#FEF2F2";
  return "#F4F3F1";
}
function codeTextColor(code: string): string {
  if (code.startsWith("1")) return "#16A34A";
  if (code.startsWith("2")) return "#CA8A04";
  if (code.startsWith("3")) return "#7C3AED";
  if (code.startsWith("4")) return "var(--e-orange)";
  if (code.startsWith("5")) return "#DC2626";
  return "#57534E";
}

export default function CoaDetailPage() {
  const { code } = useParams<{ code: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [form, setForm]         = useState<FormState>(EMPTY_FORM);
  const [original, setOriginal] = useState<FormState>(EMPTY_FORM);
  const [nameError, setNameError] = useState("");

  const isDirty = JSON.stringify(form) !== JSON.stringify(original);

  const { data: account, isLoading } = useQuery<CoaRow>({
    queryKey: ["coa-detail", code],
    queryFn: () => axios.get(`${BASE}/api/accounting/coa/${code}`).then(r => r.data),
    enabled: !!code,
  });

  useEffect(() => {
    if (!account) return;
    const snap: FormState = {
      name:        account.name,
      accountType: account.accountType,
      description: account.description ?? "",
      isActive:    account.isActive,
    };
    setForm(snap);
    setOriginal(snap);
  }, [account]);

  const discard = () => { setForm(original); setNameError(""); };

  const save = useMutation({
    mutationFn: () => {
      if (!form.name.trim()) { setNameError("Name is required"); return Promise.reject(); }
      setNameError("");
      return axios.put(`${BASE}/api/accounting/coa/${code}`, {
        name:        form.name,
        accountType: form.accountType,
        description: form.description,
        isActive:    form.isActive,
      }).then(r => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coa-detail", code] });
      qc.invalidateQueries({ queryKey: ["coa"] });
      toast({ title: "Account saved" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to save account" }),
  });

  if (isLoading) {
    return (
      <div className="space-y-5 animate-pulse max-w-3xl">
        <div className="h-8 w-48 bg-[#F4F3F1] rounded" />
        <div className="h-64 bg-[#F4F3F1] rounded-xl" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-[#A8A29E]">
        <BookOpen className="w-10 h-10 mb-3" strokeWidth={1} />
        <p className="text-sm">Account not found.</p>
        <Button variant="link" className="text-(--e-orange) mt-2" onClick={() => navigate("/admin/accounting/coa")}>
          Back to Chart of Accounts
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost" size="icon"
            className="h-8 w-8 text-[#57534E] hover:bg-[#F4F3F1] rounded-lg"
            onClick={() => navigate("/admin/accounting/coa")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="inline-block px-2.5 py-0.5 rounded text-sm font-mono font-bold"
              style={{ background: codeBadgeColor(account.code), color: codeTextColor(account.code) }}
            >
              {account.code}
            </span>
            <h1 className="text-xl font-bold text-[#1C1917] leading-none">{account.name}</h1>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              form.isActive ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#F4F3F1] text-[#57534E]"
            }`}>{form.isActive ? "Active" : "Inactive"}</span>
          </div>
        </div>

        {isDirty && (
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={discard} className="h-9 gap-1.5 text-stone-600">
              <RotateCcw size={13} /> Discard
            </Button>
            <Button size="sm" disabled={save.isPending} onClick={() => save.mutate()}
              className="h-9 gap-1.5 text-white" style={{ background: "var(--e-orange)" }}>
              {save.isPending
                ? <><Loader2 size={13} className="animate-spin" /> Saving…</>
                : <><Save size={13} /> Save Changes</>}
            </Button>
          </div>
        )}
      </div>

      {/* Unsaved changes banner */}
      {isDirty && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-[#FEF9C3] border border-[#CA8A04]/30 rounded-xl text-sm text-[#854D0E]">
          <span className="w-2 h-2 rounded-full bg-[#CA8A04] shrink-0" />
          You have unsaved changes — click <strong className="mx-1">Save Changes</strong> to apply.
        </div>
      )}

      {/* Detail card */}
      <div className="bg-white rounded-xl border border-[#E8E6E2] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6 space-y-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[#A8A29E] border-b border-[#F4F3F1] pb-3">
          Account Info
        </h2>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">Account Code</Label>
          <Input
            value={account.code}
            readOnly
            className="h-10 border-[#E8E6E2] bg-[#FAFAF9] text-[#57534E] font-mono"
          />
          <p className="text-xs text-[#A8A29E]">Account code cannot be changed.</p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">
            Account Name <span className="text-[#DC2626]">*</span>
          </Label>
          <Input
            value={form.name}
            onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setNameError(""); }}
            className={`h-10 border-[#E8E6E2] focus:border-(--e-orange) focus-visible:ring-0 ${nameError ? "border-[#DC2626]" : ""}`}
          />
          {nameError && <p className="text-xs text-[#DC2626]">{nameError}</p>}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">Account Type</Label>
          <Select value={form.accountType} onValueChange={v => setForm(f => ({ ...f, accountType: v }))}>
            <SelectTrigger className="h-10 border-[#E8E6E2] focus:ring-0 w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACCOUNT_TYPE_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">Description</Label>
          <Textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={3}
            className="border-[#E8E6E2] focus:border-(--e-orange) focus-visible:ring-0 text-sm resize-none"
            placeholder="Describe this account..."
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="is-active"
            checked={form.isActive}
            onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
            className="h-4 w-4 rounded border-[#E8E6E2] accent-(--e-orange)"
          />
          <Label htmlFor="is-active" className="text-sm text-[#57534E] cursor-pointer">
            Active
          </Label>
        </div>
      </div>
    </div>
  );
}
