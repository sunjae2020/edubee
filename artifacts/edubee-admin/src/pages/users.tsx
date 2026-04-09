import { useState } from "react";
import { formatDate, formatDateTime } from "@/lib/date-format";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useViewAs, ROLE_LABELS, ROLE_EMOJIS, ROLE_HIERARCHY } from "@/hooks/use-view-as";
import { useLocation } from "wouter";
import { MoreVertical, Trash2, Eye, Loader2, ShieldOff, UserCheck } from "lucide-react";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { ListPagination } from "@/components/ui/list-pagination";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface User {
  id: string; email: string; fullName: string; role: string;
  status: string; avatarUrl?: string | null;
  companyName?: string;
  createdAt?: string; lastLoginAt?: string;
}

const ALL_ROLES = [
  "super_admin", "admin", "finance", "admission", "team_manager",
  "consultant", "camp_coordinator",
];

const emptyForm = { fullName: "", email: "", password: "", role: "consultant", status: "active" };

export default function Users() {
  const qc = useQueryClient();
  const { user: currentUser } = useAuth();
  const { viewAsUser, setViewAs, clearViewAs, isImpersonating } = useViewAs();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const [form, setForm] = useState(emptyForm);

  const currentRole = currentUser?.role ?? "consultant";
  const myLevel = ROLE_HIERARCHY[currentRole] ?? 0;

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: () => axios.get(`${BASE}/api/users`).then(r => r.data?.data ?? r.data),
  });

  const createUser = useMutation({
    mutationFn: (data: any) => axios.post(`${BASE}/api/users`, data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); closeModal(); toast({ title: "User created" }); },
    onError: (err: any) => {
      const msg = err.response?.data?.message || "Failed to create user";
      toast({ variant: "destructive", title: "Error", description: msg });
    },
  });

  const deleteUser = useMutation({
    mutationFn: (id: string) => axios.delete(`${BASE}/api/users/${id}`).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); toast({ title: "User removed" }); },
    onError: () => toast({ variant: "destructive", title: "Failed to remove user" }),
  });

  const closeModal = () => { setShowModal(false); setForm(emptyForm); };

  const handleImpersonate = (user: User) => {
    setViewAs({
      id: user.id, email: user.email, fullName: user.fullName,
      role: user.role, avatarUrl: user.avatarUrl,
    });
    toast({ title: `Viewing as ${user.fullName}`, description: `Role: ${ROLE_LABELS[user.role] ?? user.role}` });
    setLocation("/admin/dashboard");
  };

  const canImpersonate = (user: User) => {
    return user.id !== currentUser?.id && (ROLE_HIERARCHY[user.role] ?? 0) < myLevel;
  };

  const filtered = users.filter(u => {
    const matchSearch = !search ||
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });
  const pagedUsers = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const roleStats = ALL_ROLES.map(role => ({
    role, count: users.filter(u => u.role === role).length,
  })).filter(r => r.count > 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createUser.mutate(form);
  };

  const statusBadge = (status: string) => {
    if (status === "active") return "bg-[#DCFCE7] text-[#16A34A]";
    if (status === "inactive") return "bg-[#F4F3F1] text-[#57534E]";
    return "bg-[#FEF2F2] text-[#DC2626]";
  };

  return (
    <div className="space-y-5">
      {/* Active impersonation banner */}
      {isImpersonating && viewAsUser && (
        <div
          className="rounded-xl border px-4 py-3 flex items-center justify-between gap-3"
          style={{ background: "#FEF3C7", borderColor: "#F59E0B" }}
        >
          <div className="flex items-center gap-2 text-sm">
            <Eye className="w-4 h-4" style={{ color: "#D97706" }} />
            <span className="font-medium" style={{ color: "#92400E" }}>
              Currently viewing as <strong>{viewAsUser.fullName}</strong>
              <span className="ml-1.5" style={{ color: "#D97706" }}>({ROLE_LABELS[viewAsUser.role] ?? viewAsUser.role})</span>
            </span>
          </div>
          <button
            onClick={clearViewAs}
            className="text-xs flex items-center gap-1 font-medium"
            style={{ color: "#92400E" }}
          >
            <ShieldOff className="w-3.5 h-3.5" /> Exit View As
          </button>
        </div>
      )}

      {/* Role summary chips */}
      <div className="flex flex-wrap gap-2">
        {roleStats.map(({ role, count }) => (
          <button
            key={role}
            onClick={() => setRoleFilter(f => f === role ? "all" : role)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={{
              background: roleFilter === role ? "var(--e-orange-lt)" : "#F4F3F1",
              color: roleFilter === role ? "var(--e-orange)" : "#57534E",
              border: `1px solid ${roleFilter === role ? "var(--e-orange-shadow-40)" : "#E8E6E2"}`,
              outline: roleFilter === role ? "2px solid var(--e-orange-ring)" : "none",
              outlineOffset: "1px",
            }}
          >
            <span>{ROLE_EMOJIS[role]}</span>
            <span>{ROLE_LABELS[role]}</span>
            <span style={{ opacity: 0.6 }}>({count})</span>
          </button>
        ))}
        {roleFilter !== "all" && (
          <button
            onClick={() => setRoleFilter("all")}
            className="text-xs px-2 py-1.5"
            style={{ color: "#A8A29E" }}
          >
            Clear ×
          </button>
        )}
      </div>

      <ListToolbar
        search={search}
        onSearch={v => { setSearch(v); setPage(1); }}
        total={filtered.length}
        addLabel="Add User"
        onAdd={() => setShowModal(true)}
        csvExportTable="users"
      />

      {/* Table */}
      <div
        className="bg-white rounded-xl overflow-x-auto"
        style={{ border: "1px solid #E8E6E2", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
      >
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid #E8E6E2", background: "#FAFAF9" }}>
              {["User", "Role", "Status", "Last Login", "Created", ""].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium uppercase tracking-[0.05em]" style={{ color: "#57534E" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(PAGE_SIZE)].map((_, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #F4F3F1" }}>
                  {[...Array(6)].map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 rounded animate-pulse" style={{ background: "#F4F3F1" }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : pagedUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center text-sm" style={{ color: "#A8A29E" }}>No users found</td>
              </tr>
            ) : (
              pagedUsers.map(user => (
                <tr
                  key={user.id}
                  className="group transition-colors cursor-pointer"
                  style={{ borderBottom: "1px solid #F4F3F1" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--e-orange-lt)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "")}
                  onClick={() => setLocation(`/admin/users/${user.id}`)}
                >
                  <td className="px-4 py-3" style={{ height: 48 }}>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.fullName} className="object-cover" />}
                        <AvatarFallback className="text-xs font-bold" style={{ background: "var(--e-orange-lt)", color: "var(--e-orange)" }}>
                          {user.fullName.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm flex items-center gap-1.5" style={{ color: "#1C1917" }}>
                          {user.fullName}
                          {viewAsUser?.id === user.id && (
                            <span
                              className="inline-flex items-center gap-0.5 px-1.5 py-0 rounded text-[10px]"
                              style={{ background: "var(--e-orange-lt)", color: "var(--e-orange)" }}
                            >
                              <Eye className="w-2.5 h-2.5" /> viewing
                            </span>
                          )}
                        </div>
                        <div className="text-xs" style={{ color: "#A8A29E" }}>{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium"
                      style={{ background: "#F4F3F1", color: "#57534E" }}
                    >
                      {ROLE_EMOJIS[user.role]} {ROLE_LABELS[user.role] ?? user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge(user.status)}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "#A8A29E" }}>
                    {user.lastLoginAt ? formatDate(user.lastLoginAt) : "Never"}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "#A8A29E" }}>
                    {user.createdAt ? formatDate(user.createdAt) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      {canImpersonate(user) && (
                        <button
                          onClick={() => handleImpersonate(user)}
                          title={`View as ${user.fullName}`}
                          className="opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 rounded flex items-center justify-center"
                          style={{ color: "#A8A29E" }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLButtonElement).style.color = "var(--e-orange)";
                            (e.currentTarget as HTMLButtonElement).style.background = "var(--e-orange-lt)";
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLButtonElement).style.color = "#A8A29E";
                            (e.currentTarget as HTMLButtonElement).style.background = "";
                          }}
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="w-7 h-7 rounded flex items-center justify-center transition-colors"
                            style={{ color: "#A8A29E" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "#F4F3F1")}
                            onMouseLeave={e => (e.currentTarget.style.background = "")}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          {canImpersonate(user) && (
                            <>
                              <DropdownMenuItem className="gap-2 text-xs" onClick={() => handleImpersonate(user)}>
                                <Eye className="w-3.5 h-3.5" style={{ color: "var(--e-orange)" }} /> View As This User
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          <DropdownMenuItem
                            className="gap-2 text-xs text-destructive focus:text-destructive"
                            onClick={() => deleteUser.mutate(user.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ListPagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onChange={setPage} />

      {/* Create Modal */}
      <Dialog open={showModal} onOpenChange={o => !o && closeModal()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} required placeholder="Jane Smith" />
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required placeholder="jane@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Password *</Label>
              <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required placeholder="Min. 8 characters" minLength={8} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Role *</Label>
                <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ALL_ROLES.map(r => (
                      <SelectItem key={r} value={r}>{ROLE_EMOJIS[r]} {ROLE_LABELS[r]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
              <Button type="submit" disabled={createUser.isPending} className="gap-2">
                {createUser.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Create User
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
