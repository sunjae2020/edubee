import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { useLocation } from "wouter";
import { Users, Plus, ChevronRight, Loader2, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const TEAM_TYPES = [
  { key: "agent_team",       label: "Agent Team" },
  { key: "coordinator_team", label: "Coordinator Team" },
  { key: "support_team",     label: "Support Team" },
  { key: "management_team",  label: "Management Team" },
];

const STATUS_COLORS: Record<string, string> = {
  active:   "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-gray-500",
  archived: "bg-red-100 text-red-600",
};

interface Team {
  id: string;
  name: string;
  description?: string | null;
  type: string;
  color: string;
  teamLeadId?: string | null;
  teamLeadName?: string | null;
  status: string;
  memberCount: number;
  createdAt: string;
}

const EMPTY_FORM = {
  name: "", description: "", type: "agent_team", color: "#F5821F", teamLeadId: "", status: "active",
};

export default function TeamsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  const { user: currentUser } = useAuth();
  const isAdmin = ["super_admin", "admin"].includes(currentUser?.role ?? "");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data, isLoading } = useQuery<{ data: Team[]; total: number }>({
    queryKey: ["teams", { search, type: typeFilter, status: statusFilter }],
    queryFn: () => {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (typeFilter !== "all") params.type = typeFilter;
      if (statusFilter !== "all") params.status = statusFilter;
      return axios.get(`${BASE}/api/teams`, { params }).then(r => r.data);
    },
  });

  const teams: Team[] = data?.data ?? [];

  const createTeam = useMutation({
    mutationFn: (body: typeof EMPTY_FORM) => axios.post(`${BASE}/api/teams`, body).then(r => r.data),
    onSuccess: (team) => {
      qc.invalidateQueries({ queryKey: ["teams"] });
      toast({ title: "Team created successfully" });
      setShowCreate(false);
      setForm(EMPTY_FORM);
      setLocation(`${BASE}/admin/teams/${team.id}`);
    },
    onError: () => toast({ variant: "destructive", title: "Failed to create team" }),
  });

  const deleteTeam = useMutation({
    mutationFn: (id: string) => axios.delete(`${BASE}/api/teams/${id}`).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["teams"] }); toast({ title: "Team deleted" }); },
    onError: () => toast({ variant: "destructive", title: "Failed to delete team" }),
  });

  const typeLabelFor = (type: string) => TEAM_TYPES.find(t => t.key === type)?.label ?? type;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Teams</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Organise staff into teams and track performance</p>
        </div>
        {isAdmin && (
          <Button className="bg-[#F5821F] hover:bg-[#e0721a] text-white gap-2" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" /> New Team
          </Button>
        )}
      </div>

      {/* Filters */}
      <ListToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search teams…"
        filters={[
          {
            value: typeFilter, onChange: setTypeFilter,
            options: [{ value: "all", label: "All Types" }, ...TEAM_TYPES.map(t => ({ value: t.key, label: t.label }))],
          },
          {
            value: statusFilter, onChange: setStatusFilter,
            options: [
              { value: "all", label: "All Statuses" },
              { value: "active",   label: "Active" },
              { value: "inactive", label: "Inactive" },
            ],
          },
        ]}
      />

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-[#F5821F]" />
        </div>
      ) : teams.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No teams found</p>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Team</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Team Lead</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Members</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                {isAdmin && <th className="px-4 py-3 w-10" />}
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {teams.map((team, i) => (
                <tr
                  key={team.id}
                  className={`border-b border-border last:border-0 hover:bg-muted/20 cursor-pointer transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}
                  onClick={() => setLocation(`${BASE}/admin/teams/${team.id}`)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ backgroundColor: team.color || "#F5821F" }}>
                        {team.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{team.name}</div>
                        {team.description && (
                          <div className="text-xs text-muted-foreground truncate max-w-[220px]">{team.description}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{typeLabelFor(team.type)}</td>
                  <td className="px-4 py-3 text-foreground">{team.teamLeadName ?? <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 text-sm font-medium">
                      <Users className="w-3.5 h-3.5 text-muted-foreground" />
                      {team.memberCount}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[team.status] ?? "bg-gray-100 text-gray-500"}`}>
                      {team.status}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <button
                        className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                        onClick={() => {
                          if (confirm(`Delete team "${team.name}"? Members will be unassigned.`)) {
                            deleteTeam.mutate(team.id);
                          }
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Team</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Team Name <span className="text-red-500">*</span></Label>
              <Input placeholder="e.g. Bangkok Agents" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea placeholder="Describe this team's purpose…" rows={3} value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TEAM_TYPES.map(t => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Colour</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.color}
                    onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                    className="w-10 h-9 rounded border border-border cursor-pointer p-0.5" />
                  <Input value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="font-mono text-sm" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button
                className="bg-[#F5821F] hover:bg-[#e0721a] text-white"
                disabled={!form.name.trim() || createTeam.isPending}
                onClick={() => createTeam.mutate(form)}
              >
                {createTeam.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Team"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
