import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  "super_admin", "admin", "camp_coordinator", "education_agent",
  "partner_institute", "partner_hotel", "partner_pickup", "partner_tour", "parent_client",
];

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  admin: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  camp_coordinator: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  education_agent: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  partner_institute: "bg-orange-100 text-orange-700",
  partner_hotel: "bg-orange-100 text-orange-700",
  partner_pickup: "bg-orange-100 text-orange-700",
  partner_tour: "bg-orange-100 text-orange-700",
  parent_client: "bg-gray-100 text-gray-700",
};

const emptyForm = { fullName: "", email: "", password: "", role: "education_agent", status: "active" };

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

  const currentRole = currentUser?.role ?? "parent_client";
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

  return (
    <div className="space-y-5">
      {/* Active impersonation banner */}
      {isImpersonating && viewAsUser && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Eye className="w-4 h-4 text-amber-600" />
            <span className="text-amber-800 dark:text-amber-300 font-medium">
              Currently viewing as <strong>{viewAsUser.fullName}</strong>
              <span className="ml-1.5 text-amber-600">({ROLE_LABELS[viewAsUser.role] ?? viewAsUser.role})</span>
            </span>
          </div>
          <button onClick={clearViewAs} className="text-xs text-amber-700 hover:text-amber-900 dark:text-amber-400 flex items-center gap-1 font-medium">
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
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
              roleFilter === role
                ? "ring-2 ring-offset-1 ring-[#F08301] " + (ROLE_COLORS[role] ?? "bg-gray-100 text-gray-700")
                : (ROLE_COLORS[role] ?? "bg-gray-100 text-gray-700")
            }`}
          >
            <span>{ROLE_EMOJIS[role]}</span>
            <span>{ROLE_LABELS[role]}</span>
            <span className="opacity-60">({count})</span>
          </button>
        ))}
        {roleFilter !== "all" && (
          <button onClick={() => setRoleFilter("all")} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1.5">
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
      />

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {["User", "Role", "Status", "Last Login", "Created", ""].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              [...Array(PAGE_SIZE)].map((_, i) => (
                <tr key={i}>
                  {[...Array(6)].map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : pagedUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center text-muted-foreground text-sm">No users found</td>
              </tr>
            ) : (
              pagedUsers.map(user => (
                <tr key={user.id} className="hover:bg-muted/20 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-[#F08301]/10 text-[#F08301] text-xs font-bold">
                          {user.fullName.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm text-foreground flex items-center gap-1.5">
                          {user.fullName}
                          {viewAsUser?.id === user.id && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0 rounded text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                              <Eye className="w-2.5 h-2.5" /> viewing
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[user.role] ?? "bg-gray-100 text-gray-700"}`}>
                      {ROLE_EMOJIS[user.role]} {ROLE_LABELS[user.role] ?? user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      user.status === "active" ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" :
                      user.status === "inactive" ? "bg-gray-100 text-gray-600" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {user.lastLoginAt ? format(new Date(user.lastLoginAt), "MMM d, yyyy") : "Never"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {user.createdAt ? format(new Date(user.createdAt), "MMM d, yyyy") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      {canImpersonate(user) && (
                        <button
                          onClick={() => handleImpersonate(user)}
                          title={`View as ${user.fullName}`}
                          className="opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-[#F08301] hover:bg-[#F08301]/10"
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          {canImpersonate(user) && (
                            <>
                              <DropdownMenuItem className="gap-2 text-xs" onClick={() => handleImpersonate(user)}>
                                <Eye className="w-3.5 h-3.5 text-[#F08301]" /> View As This User
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
              <Button type="submit" disabled={createUser.isPending} className="gap-2 bg-[#F08301] hover:bg-[#d97706] text-white">
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
