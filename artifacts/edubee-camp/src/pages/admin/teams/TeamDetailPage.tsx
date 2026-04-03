import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Pencil, Check, X, Users, BarChart3, UserPlus, Loader2, Trash2 } from "lucide-react";
import { SystemInfoSection } from "@/components/shared/SystemInfoSection";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const TEAM_TYPES = [
  { key: "agent_team",       label: "Agent Team" },
  { key: "coordinator_team", label: "Coordinator Team" },
  { key: "support_team",     label: "Support Team" },
  { key: "management_team",  label: "Management Team" },
];

const ROLE_COLORS: Record<string, string> = {
  super_admin:       "bg-purple-100 text-purple-700",
  admin:             "bg-blue-100 text-blue-700",
  camp_coordinator:  "bg-orange-100 text-orange-700",
  education_agent:   "bg-teal-100 text-teal-700",
  partner_institute: "bg-green-100 text-green-700",
  partner_hotel:     "bg-yellow-100 text-yellow-700",
  partner_pickup:    "bg-pink-100 text-pink-700",
  partner_tour:      "bg-indigo-100 text-indigo-700",
  parent_client:     "bg-gray-100 text-gray-600",
};

function fmtRole(role: string) {
  return role.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

interface Member {
  id: string; fullName: string; email: string;
  role: string; status: string; avatarUrl?: string | null;
  companyName?: string | null; countryOfOps?: string | null;
}

interface TeamDetail {
  id: string; name: string; description?: string | null;
  type: string; color: string; teamLeadId?: string | null;
  teamLeadName?: string | null; status: string;
  members: Member[];
  createdAt: string; updatedAt: string;
}

interface Performance {
  memberCount: number;
  totalApplications: number;
  approvedApplications: number;
}

interface User {
  id: string; fullName: string; email: string; role: string; status: string; teamId?: string | null;
}

export default function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const isAdmin = ["super_admin", "admin"].includes(currentUser?.role ?? "");

  const [tab, setTab] = useState("members");
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<TeamDetail>>({});
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");

  const { data: team, isLoading } = useQuery<TeamDetail>({
    queryKey: ["team", id],
    queryFn: () => axios.get(`${BASE}/api/teams/${id}`).then(r => r.data),
  });

  const { data: perf } = useQuery<Performance>({
    queryKey: ["team-performance", id],
    queryFn: () => axios.get(`${BASE}/api/teams/${id}/performance`).then(r => r.data),
    enabled: !!id,
  });

  const { data: allUsersData } = useQuery<{ data: User[] }>({
    queryKey: ["users-for-team", memberSearch],
    queryFn: () => axios.get(`${BASE}/api/users`, { params: { search: memberSearch, limit: 50 } }).then(r => r.data),
    enabled: showAddMember,
  });

  const updateTeam = useMutation({
    mutationFn: (body: Partial<TeamDetail>) => axios.patch(`${BASE}/api/teams/${id}`, body).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team", id] });
      qc.invalidateQueries({ queryKey: ["teams"] });
      toast({ title: "Team updated" });
      setIsEditing(false);
    },
    onError: () => toast({ variant: "destructive", title: "Failed to update team" }),
  });

  const manageMember = useMutation({
    mutationFn: ({ add, remove }: { add?: string[]; remove?: string[] }) =>
      axios.patch(`${BASE}/api/teams/${id}/members`, { add: add ?? [], remove: remove ?? [] }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team", id] });
      qc.invalidateQueries({ queryKey: ["team-performance", id] });
      qc.invalidateQueries({ queryKey: ["users-for-team"] });
      toast({ title: "Members updated" });
      setShowAddMember(false);
    },
    onError: () => toast({ variant: "destructive", title: "Failed to update members" }),
  });

  const startEdit = () => {
    if (!team) return;
    setEditForm({ name: team.name, description: team.description, type: team.type, color: team.color, status: team.status, teamLeadId: team.teamLeadId ?? "" });
    setIsEditing(true);
  };

  const cancelEdit = () => setIsEditing(false);
  const saveEdit = () => updateTeam.mutate(editForm);

  const currentMemberIds = new Set(team?.members?.map(m => m.id) ?? []);
  const availableUsers = (allUsersData?.data ?? []).filter(u => !currentMemberIds.has(u.id));

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <p>Team not found.</p>
        <Button variant="link" onClick={() => setLocation(`${BASE}/admin/teams`)}>Back to Teams</Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb + Actions */}
      <div className="flex items-center justify-between">
        <button
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setLocation(`${BASE}/admin/teams`)}
        >
          <ArrowLeft className="w-4 h-4" /> Teams
        </button>
        {isAdmin && !isEditing && (
          <Button variant="outline" size="sm" className="gap-2" onClick={startEdit}>
            <Pencil className="w-3.5 h-3.5" /> Edit
          </Button>
        )}
        {isEditing && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={cancelEdit}>
              <X className="w-3.5 h-3.5 mr-1" /> Cancel
            </Button>
            <Button size="sm" className="bg-[--e-orange] hover:bg-[#e0721a] text-white gap-1"
              onClick={saveEdit} disabled={updateTeam.isPending}>
              {updateTeam.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Save
            </Button>
          </div>
        )}
      </div>

      {/* Team Header Card */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-xl font-bold shrink-0"
            style={{ backgroundColor: isEditing ? (editForm.color ?? team.color) : team.color }}>
            {team.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Team Name</Label>
                    <Input value={editForm.name ?? ""} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Colour</Label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={editForm.color ?? "var(--e-orange)"}
                        onChange={e => setEditForm(f => ({ ...f, color: e.target.value }))}
                        className="w-9 h-9 rounded border border-border cursor-pointer p-0.5" />
                      <Input value={editForm.color ?? ""} onChange={e => setEditForm(f => ({ ...f, color: e.target.value }))}
                        className="font-mono text-sm" />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Type</Label>
                    <Select value={editForm.type ?? "agent_team"} onValueChange={v => setEditForm(f => ({ ...f, type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TEAM_TYPES.map(t => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Status</Label>
                    <Select value={editForm.status ?? "active"} onValueChange={v => setEditForm(f => ({ ...f, status: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Description</Label>
                  <Textarea rows={2} value={editForm.description ?? ""}
                    onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-xl font-bold text-foreground">{team.name}</h1>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {TEAM_TYPES.find(t => t.key === team.type)?.label ?? team.type}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${team.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {team.status}
                  </span>
                </div>
                {team.description && <p className="text-sm text-muted-foreground mt-1">{team.description}</p>}
                {team.teamLeadName && (
                  <p className="text-sm mt-1.5">
                    <span className="text-muted-foreground">Team Lead: </span>
                    <span className="font-medium text-foreground">{team.teamLeadName}</span>
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Performance Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm text-center">
          <p className="text-3xl font-bold text-foreground">{perf?.memberCount ?? team.members.length}</p>
          <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">Members</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm text-center">
          <p className="text-3xl font-bold text-foreground">{perf?.totalApplications ?? "—"}</p>
          <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">Applications</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm text-center">
          <p className="text-3xl font-bold text-[--e-orange]">{perf?.approvedApplications ?? "—"}</p>
          <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">Approved</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="members" className="gap-2">
            <Users className="w-4 h-4" /> Members ({team.members.length})
          </TabsTrigger>
          <TabsTrigger value="info" className="gap-2">
            <BarChart3 className="w-4 h-4" /> Details
          </TabsTrigger>
        </TabsList>

        {/* Members Tab */}
        <TabsContent value="members" className="mt-4 space-y-3">
          {isAdmin && (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowAddMember(true)}>
                <UserPlus className="w-4 h-4" /> Add Member
              </Button>
            </div>
          )}

          {team.members.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No members yet. Add some users to this team.</p>
            </div>
          ) : (
            <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Role</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Company</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                    {isAdmin && <th className="px-4 py-3 w-10" />}
                  </tr>
                </thead>
                <tbody>
                  {team.members.map((m, i) => (
                    <tr key={m.id} className={`border-b border-border last:border-0 hover:bg-muted/20 cursor-pointer transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}
                      onClick={() => setLocation(`${BASE}/admin/users/${m.id}`)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[--e-orange]/10 flex items-center justify-center text-[--e-orange] text-xs font-bold shrink-0">
                            {m.fullName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-foreground">{m.fullName}</div>
                            <div className="text-xs text-muted-foreground">{m.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[m.role] ?? "bg-gray-100 text-gray-600"}`}>
                          {fmtRole(m.role)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{m.companyName ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${m.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {m.status}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <button
                            className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                            onClick={() => manageMember.mutate({ remove: [m.id] })}
                            title="Remove from team"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="info" className="mt-4">
          <SystemInfoSection
            createdAt={team.createdAt}
            updatedAt={team.updatedAt}
          />
        </TabsContent>
      </Tabs>

      {/* Add Member Dialog */}
      <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Member to {team.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Input
              placeholder="Search users by name or email…"
              value={memberSearch}
              onChange={e => setMemberSearch(e.target.value)}
            />
            <div className="border border-border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
              {availableUsers.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">No available users found</div>
              ) : (
                availableUsers.map(u => (
                  <div key={u.id}
                    className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 border-b border-border last:border-0 cursor-pointer"
                    onClick={() => manageMember.mutate({ add: [u.id] })}
                  >
                    <div>
                      <div className="font-medium text-sm text-foreground">{u.fullName}</div>
                      <div className="text-xs text-muted-foreground">{u.email} · {fmtRole(u.role)}</div>
                    </div>
                    <Button variant="outline" size="sm" className="text-xs h-7">
                      {manageMember.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Add"}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
