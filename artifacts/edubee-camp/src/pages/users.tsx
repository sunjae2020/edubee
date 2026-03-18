import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, MoreVertical, Trash2, Edit, ShieldCheck, Loader2 } from "lucide-react";
import { ROLE_LABELS, ROLE_EMOJIS } from "@/hooks/use-view-as";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface User {
  id: string; email: string; fullName: string; role: string;
  status: string; avatarUrl?: string | null;
  createdAt?: string; lastLoginAt?: string;
}

const ALL_ROLES = [
  "super_admin", "admin", "camp_coordinator", "education_agent",
  "partner_institute", "partner_hotel", "partner_pickup", "partner_tour", "parent_client",
];

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-purple-100 text-purple-700",
  admin: "bg-blue-100 text-blue-700",
  camp_coordinator: "bg-indigo-100 text-indigo-700",
  education_agent: "bg-green-100 text-green-700",
  partner_institute: "bg-orange-100 text-orange-700",
  partner_hotel: "bg-orange-100 text-orange-700",
  partner_pickup: "bg-orange-100 text-orange-700",
  partner_tour: "bg-orange-100 text-orange-700",
  parent_client: "bg-gray-100 text-gray-700",
};

const emptyForm = { fullName: "", email: "", password: "", role: "education_agent", status: "active" };

export default function Users() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState(emptyForm);

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

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditing(null); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createUser.mutate(form);
  };

  const filtered = users.filter(u => {
    const matchSearch = !search ||
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const roleStats = ALL_ROLES.map(role => ({
    role, count: users.filter(u => u.role === role).length,
  })).filter(r => r.count > 0);

  return (
    <div className="space-y-5">
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
            Clear filter ×
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search users…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{filtered.length} users</span>
          <Button size="sm" className="h-9 gap-1.5" onClick={openCreate}>
            <Plus className="w-4 h-4" /> Add User
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {["User", "Role", "Status", "Created", ""].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {[...Array(5)].map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-16 text-center text-muted-foreground text-sm">No users found</td>
              </tr>
            ) : (
              filtered.map(user => (
                <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-[#F08301]/10 text-[#F08301] text-xs font-bold">
                          {user.fullName.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm">{user.fullName}</div>
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
                      user.status === "active" ? "bg-green-100 text-green-700" :
                      user.status === "inactive" ? "bg-gray-100 text-gray-600" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {user.createdAt ? format(new Date(user.createdAt), "MMM d, yyyy") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem className="gap-2 text-xs">
                          <Edit className="w-3.5 h-3.5" /> Edit User
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 text-xs text-destructive focus:text-destructive"
                          onClick={() => deleteUser.mutate(user.id)}>
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      <Dialog open={showModal} onOpenChange={o => !o && closeModal()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
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
