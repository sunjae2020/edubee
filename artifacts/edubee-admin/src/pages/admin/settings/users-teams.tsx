import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import {
  Users, UserPlus, Loader2, Trash2, CheckCircle2, Clock, XCircle, Mail,
} from "lucide-react";
import { formatDate } from "@/lib/date-format";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const ROLES = ["admin", "manager", "staff"];

const ROLE_INFO: Record<string, { label: string; color: string; bg: string; desc: string }> = {
  super_admin: { label: "Super Admin", color: "#7C3AED", bg: "#F5F3FF", desc: "All features + Super Admin Panel" },
  admin:       { label: "Admin",       color: "#0369A1", bg: "#EFF6FF", desc: "All CRM features + full Settings access" },
  manager:     { label: "Manager",     color: "#15803D", bg: "#F0FDF4", desc: "CRM features + limited Settings" },
  staff:       { label: "Staff",       color: "#92400E", bg: "#FFFBEB", desc: "CRM features only" },
};

function RoleBadge({ role }: { role: string }) {
  const info = ROLE_INFO[role] ?? { label: role, color: "#57534E", bg: "#F4F3F1" };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize"
      style={{ background: info.bg, color: info.color }}
    >
      {info.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { icon: any; color: string; bg: string }> = {
    Pending:  { icon: Clock,        color: "#92400E", bg: "#FFFBEB" },
    Accepted: { icon: CheckCircle2, color: "#15803D", bg: "#F0FDF4" },
    Expired:  { icon: XCircle,      color: "#9F1239", bg: "#FFF1F2" },
  };
  const s = map[status] ?? map.Pending;
  const Icon = s.icon;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: s.bg, color: s.color }}>
      <Icon size={11} strokeWidth={2} /> {status}
    </span>
  );
}

export default function UsersTeams() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole]   = useState("staff");

  const { data: plan } = useQuery<any>({
    queryKey: ["settings-plan"],
    queryFn: () => axios.get(`${BASE}/api/settings/plan`).then(r => r.data),
  });

  const { data: users = [], isLoading: loadingUsers } = useQuery<any[]>({
    queryKey: ["settings-users"],
    queryFn: () => axios.get(`${BASE}/api/settings/users`).then(r => r.data),
  });

  const { data: invitations = [], isLoading: loadingInvs } = useQuery<any[]>({
    queryKey: ["settings-invitations"],
    queryFn: () => axios.get(`${BASE}/api/settings/invitations`).then(r => r.data),
  });

  const inviteMutation = useMutation({
    mutationFn: (data: any) => axios.post(`${BASE}/api/settings/invitations`, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings-invitations"] });
      setEmail(""); setRole("staff");
      toast({ title: "Invitation sent", description: `Invitation email queued for ${email}` });
    },
    onError: (e: any) => toast({ title: "Error", description: e?.response?.data?.error ?? "Failed to send invitation", variant: "destructive" }),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => axios.delete(`${BASE}/api/settings/invitations/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["settings-invitations"] }); toast({ title: "Invitation cancelled" }); },
  });

  const currentUsers  = plan?.currentUsers  ?? 0;
  const maxUsers      = plan?.maxUsers      ?? 5;

  const inp = "w-full h-10 px-3 border-[1.5px] border-[#E8E6E2] rounded-lg text-sm focus:outline-none focus:border-(--e-orange) bg-white";

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-6 px-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[#1C1917]">Users & Teams</h1>
          <p className="text-sm text-[#57534E] mt-0.5">Manage team members and pending invitations</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium text-[#57534E] uppercase tracking-wide">Users</p>
          <p className="text-2xl font-bold text-[#1C1917]">
            {currentUsers}
            <span className="text-base font-normal text-[#A8A29E]"> / {maxUsers}</span>
          </p>
        </div>
      </div>

      {/* Invite */}
      <div className="bg-white rounded-xl border border-[#E8E6E2] p-6 space-y-4" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <div className="flex items-center gap-2 border-b border-[#E8E6E2] pb-3">
          <UserPlus size={16} className="text-(--e-orange)" strokeWidth={1.5} />
          <h2 className="text-sm font-semibold text-[#1C1917] uppercase tracking-wide">Invite Team Member</h2>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 space-y-1">
            <label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">Email Address</label>
            <input
              type="email" className={inp} value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="colleague@agency.com.au"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-[#57534E] uppercase tracking-wide">Role</label>
            <select className={inp + " cursor-pointer"} value={role} onChange={e => setRole(e.target.value)}>
              {ROLES.map(r => (
                <option key={r} value={r}>{ROLE_INFO[r]?.label ?? r}</option>
              ))}
            </select>
          </div>
        </div>
        {role && ROLE_INFO[role] && (
          <p className="text-xs text-[#A8A29E]">
            <span className="font-medium" style={{ color: ROLE_INFO[role].color }}>{ROLE_INFO[role].label}:</span>{" "}
            {ROLE_INFO[role].desc}
          </p>
        )}
        <button
          onClick={() => inviteMutation.mutate({ email, role })}
          disabled={!email.trim() || inviteMutation.isPending}
          className="h-10 px-5 rounded-lg text-sm font-semibold text-white flex items-center gap-2 disabled:opacity-50"
          style={{ background: "var(--e-orange)" }}
        >
          {inviteMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
          Send Invitation
        </button>
      </div>

      {/* Current Users */}
      <div className="bg-white rounded-xl border border-[#E8E6E2] overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <div className="px-6 py-4 border-b border-[#E8E6E2] flex items-center gap-2">
          <Users size={16} className="text-(--e-orange)" strokeWidth={1.5} />
          <h2 className="text-sm font-semibold text-[#1C1917] uppercase tracking-wide">Current Team ({users.length})</h2>
        </div>
        {loadingUsers ? (
          <div className="flex items-center justify-center h-24"><Loader2 size={20} className="animate-spin text-(--e-orange)" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E8E6E2] bg-[#FAFAF9]">
                {["Name", "Email", "Role", "Status"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#A8A29E]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u: any) => (
                <tr key={u.id} className="border-b border-[#F4F3F1] hover:bg-[#FAFAF9]">
                  <td className="px-4 py-3 font-medium text-[#1C1917]">{u.full_name ?? "—"}</td>
                  <td className="px-4 py-3 text-[#57534E]">{u.email}</td>
                  <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${u.is_active !== false ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                      {u.is_active !== false ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pending Invitations */}
      {(invitations.length > 0 || loadingInvs) && (
        <div className="bg-white rounded-xl border border-[#E8E6E2] overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <div className="px-6 py-4 border-b border-[#E8E6E2] flex items-center gap-2">
            <Clock size={16} className="text-(--e-orange)" strokeWidth={1.5} />
            <h2 className="text-sm font-semibold text-[#1C1917] uppercase tracking-wide">Pending Invitations ({invitations.length})</h2>
          </div>
          {loadingInvs ? (
            <div className="flex items-center justify-center h-20"><Loader2 size={18} className="animate-spin text-(--e-orange)" /></div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E8E6E2] bg-[#FAFAF9]">
                  {["Email", "Role", "Invited", "Expires", "Status", ""].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#A8A29E]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invitations.map((inv: any) => (
                  <tr key={inv.id} className="border-b border-[#F4F3F1] hover:bg-[#FAFAF9]">
                    <td className="px-4 py-3 text-[#1C1917]">{inv.email}</td>
                    <td className="px-4 py-3"><RoleBadge role={inv.role} /></td>
                    <td className="px-4 py-3 text-[#57534E] text-xs">{formatDate(inv.createdOn)}</td>
                    <td className="px-4 py-3 text-[#57534E] text-xs">{formatDate(inv.expiresAt)}</td>
                    <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => cancelMutation.mutate(inv.id)}
                        disabled={cancelMutation.isPending}
                        className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 disabled:opacity-40"
                      >
                        <Trash2 size={12} /> Cancel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
