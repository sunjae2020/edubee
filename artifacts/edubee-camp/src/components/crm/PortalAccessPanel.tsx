import { useState, useEffect, useCallback } from "react";
import { Shield, Key, RefreshCw, Unlock, Eye, EyeOff, Copy, Check, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatDateTime } from "@/lib/date-format";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface PortalInfo {
  portalAccess: boolean;
  portalRole: string | null;
  portalEmail: string | null;
  portalLastLoginAt: string | null;
  portalMustChangePw: boolean;
  portalLockedUntil: string | null;
  portalFailedAttempts: number;
  portalInvitedAt: string | null;
  portalTempPwExpires: string | null;
  hasTempPassword: boolean;
}

function getToken() {
  return localStorage.getItem("accessToken") ?? sessionStorage.getItem("accessToken") ?? "";
}

function authHeaders(extra?: Record<string, string>) {
  return { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json", ...extra };
}

function fmtDate(value: string | null | undefined) {
  return formatDateTime(value);
}

function getUserRole() {
  try {
    const token = getToken();
    if (!token) return null;
    const payload = JSON.parse(atob(token.split(".")[1]));
    return (payload.staffRole ?? payload.role ?? "") as string;
  } catch {
    return null;
  }
}

const PORTAL_ROLES = [
  { value: "institute",     label: "Institute"      },
  { value: "hotel",         label: "Hotel"          },
  { value: "pickup",        label: "Pickup"         },
  { value: "tour",          label: "Tour"           },
  { value: "consultant", label: "Consultant (Account Portal)" },
];

interface Props {
  accountId: string;
  accountType?: string | null;
}

export function PortalAccessPanel({ accountId, accountType }: Props) {
  const { toast } = useToast();
  const [data, setData] = useState<PortalInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ portalAccess: false, portalRole: "", portalEmail: "" });
  const [tempPw, setTempPw] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [copied, setCopied] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [settingPw, setSettingPw] = useState(false);

  const isSuperAdmin = ["super_admin"].includes(getUserRole() ?? "");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/crm/accounts/${accountId}/portal`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setForm({
          portalAccess: json.data.portalAccess,
          portalRole: json.data.portalRole ?? "",
          portalEmail: json.data.portalEmail ?? "",
        });
      }
    } catch {
      toast({ title: "Failed to load portal info", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => { load(); }, [load]);

  async function saveBasicInfo() {
    setSaving(true);
    try {
      const res = await fetch(`${BASE}/api/crm/accounts/${accountId}/portal`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast({ title: "Portal settings saved" });
      setEditing(false);
      load();
    } catch (err: any) {
      toast({ title: err.message ?? "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function generateTempPassword() {
    if (!window.confirm("Generate a new temporary password? The previous one will be invalidated.")) return;
    try {
      const res = await fetch(`${BASE}/api/crm/accounts/${accountId}/portal/temp-password`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setTempPw(json.tempPassword);
      setShowPw(true);
      load();
      toast({ title: "Temporary password generated" });
    } catch (err: any) {
      toast({ title: err.message ?? "Failed", variant: "destructive" });
    }
  }

  async function setDirectPassword() {
    if (newPw !== confirmPw) return toast({ title: "Passwords do not match", variant: "destructive" });
    if (newPw.length < 8) return toast({ title: "Password must be at least 8 characters", variant: "destructive" });
    setSettingPw(true);
    try {
      const res = await fetch(`${BASE}/api/crm/accounts/${accountId}/portal/set-password`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ newPassword: newPw }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast({ title: "Password set successfully" });
      setNewPw(""); setConfirmPw("");
    } catch (err: any) {
      toast({ title: err.message ?? "Failed", variant: "destructive" });
    } finally {
      setSettingPw(false);
    }
  }

  async function unlockAccount() {
    try {
      const res = await fetch(`${BASE}/api/crm/accounts/${accountId}/portal/unlock`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast({ title: "Account unlocked" });
      load();
    } catch {
      toast({ title: "Failed to unlock", variant: "destructive" });
    }
  }

  function copyTempPw() {
    if (tempPw) navigator.clipboard.writeText(tempPw);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (accountType === "Student") {
    return (
      <div className="bg-white rounded-xl border border-[#E8E6E2] p-8 text-center text-stone-400">
        <Shield size={32} strokeWidth={1.5} className="mx-auto mb-3" />
        <p className="text-sm font-medium text-stone-600 mb-1">Portal Access</p>
        <p className="text-sm">Student accounts do not have portal access.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-[#E8E6E2] p-8 text-center text-stone-400 text-sm">
        Loading portal info…
      </div>
    );
  }

  const isLocked = !!(data?.portalLockedUntil && new Date(data.portalLockedUntil) > new Date());

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-[#F5821F]/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-[#F5821F]" />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-stone-800">Portal Access</h2>
          <p className="text-xs text-stone-400">Manage external partner login credentials</p>
        </div>
        <span
          className="text-xs font-semibold px-2.5 py-1 rounded-full"
          style={data?.portalAccess
            ? { background: "#DCFCE7", color: "#16A34A" }
            : { background: "#F4F3F1", color: "#A8A29E" }}
        >
          {data?.portalAccess ? "Enabled" : "Disabled"}
        </span>
      </div>

      {/* Access Settings */}
      <div className="bg-white rounded-xl border border-[#E8E6E2] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-stone-400">Access Settings</h3>
          {!editing
            ? <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setEditing(true)}>Edit</Button>
            : (
              <div className="flex gap-2">
                <Button
                  size="sm" className="h-7 text-xs bg-[#F5821F] hover:bg-[#d97706] text-white gap-1"
                  onClick={saveBasicInfo} disabled={saving}
                >
                  <Save size={11} /> {saving ? "Saving…" : "Save"}
                </Button>
                <Button
                  variant="outline" size="sm" className="h-7 text-xs gap-1"
                  onClick={() => { setEditing(false); setForm({ portalAccess: data?.portalAccess ?? false, portalRole: data?.portalRole ?? "", portalEmail: data?.portalEmail ?? "" }); }}
                >
                  <X size={11} /> Cancel
                </Button>
              </div>
            )
          }
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Portal Access toggle */}
          <div className="col-span-2 flex items-center gap-3">
            <button
              type="button"
              disabled={!editing}
              onClick={() => editing && setForm(f => ({ ...f, portalAccess: !f.portalAccess }))}
              className="w-10 h-6 rounded-full transition-colors relative shrink-0"
              style={{ background: form.portalAccess ? "#F5821F" : "#E8E6E2", opacity: editing ? 1 : 0.8 }}
            >
              <span
                className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                style={{ left: form.portalAccess ? "calc(100% - 22px)" : "2px" }}
              />
            </button>
            <div>
              <p className="text-sm font-medium text-stone-700">Enable Portal Access</p>
              <p className="text-xs text-stone-400">Allow this account to log into the partner portal</p>
            </div>
          </div>

          {/* Portal Role */}
          <div>
            <Label className="text-xs font-medium text-stone-500 mb-1.5 block">Portal Role</Label>
            {editing ? (
              <Select value={form.portalRole} onValueChange={v => setForm(f => ({ ...f, portalRole: v }))}>
                <SelectTrigger className="h-9 text-sm border-[#E8E6E2]">
                  <SelectValue placeholder="— Select Role —" />
                </SelectTrigger>
                <SelectContent>
                  {PORTAL_ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm font-medium text-stone-800 py-1.5">
                {PORTAL_ROLES.find(r => r.value === data?.portalRole)?.label ?? <span className="text-stone-400">—</span>}
              </p>
            )}
          </div>

          {/* Login Email */}
          <div>
            <Label className="text-xs font-medium text-stone-500 mb-1.5 block">Login Email</Label>
            {editing ? (
              <Input
                value={form.portalEmail}
                onChange={e => setForm(f => ({ ...f, portalEmail: e.target.value }))}
                placeholder="portal-login@example.com"
                className="h-9 text-sm border-[#E8E6E2] focus:border-[#F5821F]"
                type="email"
              />
            ) : (
              <p className="text-sm font-medium text-stone-800 py-1.5">
                {data?.portalEmail ?? <span className="text-stone-400">—</span>}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Password Management */}
      <div className="bg-white rounded-xl border border-[#E8E6E2] p-5 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-stone-400 flex items-center gap-1.5">
          <Key size={12} /> Password Management
        </h3>

        {/* Temp Password */}
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-stone-700 mb-0.5">Temporary Password</p>
            <p className="text-xs text-stone-400">
              Generate a one-time password to share with the partner. They must change it on first login. Expires in 72 hours.
            </p>
          </div>

          {data?.hasTempPassword && !tempPw && (
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <span className="font-medium">⚠</span>
              A temporary password is active — expires {fmtDate(data.portalTempPwExpires)}
            </div>
          )}

          {tempPw && (
            <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium text-stone-600">Temporary Password — copy now, shown only once</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm font-mono bg-white border border-stone-200 rounded px-3 py-1.5 tracking-widest">
                  {showPw ? tempPw : "•".repeat(tempPw.length)}
                </code>
                <button
                  onClick={() => setShowPw(v => !v)}
                  className="w-8 h-8 rounded-lg border border-stone-200 bg-white flex items-center justify-center text-stone-500 hover:text-stone-800 transition-colors"
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button
                  onClick={copyTempPw}
                  className="w-8 h-8 rounded-lg border border-stone-200 bg-white flex items-center justify-center text-stone-500 hover:text-stone-800 transition-colors"
                >
                  {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          )}

          <Button
            variant="outline" size="sm" className="gap-1.5 text-xs"
            onClick={generateTempPassword}
          >
            <RefreshCw size={12} /> Generate Temp Password
          </Button>
        </div>

        {/* Direct Password Set — Super Admin only */}
        {isSuperAdmin && (
          <div className="border-t border-[#E8E6E2] pt-4 space-y-3">
            <div>
              <p className="text-sm font-medium text-stone-700 mb-0.5">Set Password Directly</p>
              <p className="text-xs text-stone-400">Super Admin only. Immediately sets a new password for this portal account.</p>
            </div>
            <div className="space-y-2 max-w-xs">
              <Input
                type="password"
                placeholder="New Password (min 8 characters)"
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                className="h-9 text-sm border-[#E8E6E2] focus:border-[#F5821F]"
              />
              <Input
                type="password"
                placeholder="Confirm Password"
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                className="h-9 text-sm border-[#E8E6E2] focus:border-[#F5821F]"
              />
              <Button
                size="sm"
                className="bg-[#F5821F] hover:bg-[#d97706] text-white gap-1.5 text-xs"
                onClick={setDirectPassword}
                disabled={!newPw || newPw !== confirmPw || settingPw}
              >
                <Key size={12} /> {settingPw ? "Setting…" : "Set Password"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Login Status */}
      <div className="bg-white rounded-xl border border-[#E8E6E2] p-5">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-4">Login Status</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Last Login",       value: fmtDate(data?.portalLastLoginAt) },
            { label: "Failed Attempts",  value: `${data?.portalFailedAttempts ?? 0} / 5`, warn: (data?.portalFailedAttempts ?? 0) >= 3 },
            { label: "Account Lock",     value: isLocked ? `Locked until ${fmtDate(data?.portalLockedUntil)}` : "Normal", danger: isLocked },
            { label: "Password Status",  value: data?.portalMustChangePw ? "⚠ Must change on next login" : "Normal", warn: !!data?.portalMustChangePw },
          ].map(item => (
            <div key={item.label} className="bg-stone-50 rounded-lg border border-[#E8E6E2] px-3 py-2.5">
              <p className="text-[11px] text-stone-400 mb-0.5">{item.label}</p>
              <p className={`text-sm font-medium ${item.danger ? "text-red-600" : item.warn ? "text-amber-600" : "text-stone-800"}`}>
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {isLocked && (
          <Button
            variant="outline" size="sm"
            className="mt-3 border-red-200 text-red-600 hover:bg-red-50 gap-1.5 text-xs"
            onClick={unlockAccount}
          >
            <Unlock size={12} /> Unlock Account
          </Button>
        )}
      </div>
    </div>
  );
}
