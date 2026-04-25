import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Users, Plus, ChevronRight, Loader2, Trash2, Search } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { ListPagination } from "@/components/ui/list-pagination";
import { useBulkSelect } from "@/hooks/use-bulk-select";
import { BulkActionBar } from "@/components/common/BulkActionBar";

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

interface TeamsResponse {
  data: Team[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const EMPTY_FORM = {
  name: "", description: "", type: "agent_team", color: "var(--e-orange)", teamLeadId: "", status: "active",
};


export default function TeamsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  const { user: currentUser } = useAuth();
  const isAdmin = ["super_admin", "admin"].includes(currentUser?.role ?? "");

  const [searchInput, setSearchInput] = useState("");
  const [search,      setSearch]      = useState("");
  const [typeFilter,  setTypeFilter]  = useState("all");
  const [statusFilter,setStatusFilter]= useState("all");
  const [page,        setPage]        = useState(1);
  const [pageSize,    setPageSize]    = useState(20);
  const [showCreate,  setShowCreate]  = useState(false);
  const [form,        setForm]        = useState(EMPTY_FORM);

  const queryKey = ["teams", { search, type: typeFilter, status: statusFilter, page, pageSize }];

  const { data, isLoading } = useQuery<TeamsResponse>({
    queryKey,
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("page",     String(page));
      params.set("pageSize", String(pageSize));
      if (search                   ) params.set("search", search);
      if (typeFilter   !== "all"   ) params.set("type",   typeFilter);
      if (statusFilter !== "all"   ) params.set("status", statusFilter);
      return axios.get(`${BASE}/api/teams?${params}`).then(r => r.data);
    },
    placeholderData: prev => prev,
  });

  const teams:      Team[] = data?.data       ?? [];
  const total:      number = data?.total      ?? 0;
  const totalPages: number = data?.totalPages ?? 1;

  const isSA = currentUser?.role === "super_admin";
  const { selectedIds, toggleSelect, toggleAll, clearSelection, isAllSelected } = useBulkSelect();
  const sortedIds = teams.map(r => r.id);

  const hardDelMutation = useMutation({
    mutationFn: (ids: string[]) => axios.delete(`${BASE}/api/teams/bulk`, { data: { ids } }).then(r => r.data),
    onSuccess: (_d: any, ids: string[]) => { qc.invalidateQueries({ queryKey: ["teams"] }); clearSelection(); toast({ title: `${ids.length} permanently deleted` }); },
    onError: () => toast({ title: "삭제 실패", variant: "destructive" }),
  });
  const bulkLoading = hardDelMutation.isPending;

  const handleSearch = useCallback(() => { setSearch(searchInput); setPage(1); }, [searchInput]);
  const handleTypeChange   = (v: string) => { setTypeFilter(v);   setPage(1); };
  const handleStatusChange = (v: string) => { setStatusFilter(v); setPage(1); };

  const createTeam = useMutation({
    mutationFn: (body: typeof EMPTY_FORM) => axios.post(`${BASE}/api/teams`, body).then(r => r.data),
    onSuccess: (team) => {
      qc.invalidateQueries({ queryKey: ["teams"] });
      toast({ title: "Team created successfully" });
      setShowCreate(false);
      setForm(EMPTY_FORM);
      setLocation(`/admin/teams/${team.id}`);
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
    <div className="flex flex-col h-full">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="px-6 pt-6 pb-4 border-b border-[var(--e-border)] bg-[var(--e-bg-page)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Teams</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Organise staff into teams and track performance</p>
          </div>
          {isAdmin && (
            <Button
              className="bg-(--e-orange) hover:bg-[#e0721a] text-white gap-2"
              onClick={() => setShowCreate(true)}
            >
              <Plus className="w-4 h-4" /> New Team
            </Button>
          )}
        </div>

        {/* ── Filters ─────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 flex-1 min-w-[200px] max-w-[320px]">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input
                className="pl-8 h-9 text-sm"
                placeholder="Search teams…"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button variant="outline" size="sm" className="h-9 px-3 shrink-0" onClick={handleSearch}>
              Search
            </Button>
          </div>

          <Select value={typeFilter} onValueChange={handleTypeChange}>
            <SelectTrigger className="h-9 w-44 text-sm">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {TEAM_TYPES.map(t => (
                <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="h-9 w-36 text-sm">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          {total > 0 && (
            <span className="text-xs text-muted-foreground ml-1">
              {total.toLocaleString()} team{total !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {isSA && selectedIds.size > 0 && (
        <div className="px-6 pb-2">
          <BulkActionBar
            count={selectedIds.size}
            isLoading={bulkLoading}
            onHardDelete={() => hardDelMutation.mutate(Array.from(selectedIds))}
          />
        </div>
      )}

      {/* ── Table ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-[var(--e-border)] bg-[var(--e-bg-page)]">
              {isSA && <th className="px-3 py-3 w-10"><input type="checkbox" checked={isAllSelected(sortedIds)} onChange={() => toggleAll(sortedIds)} className="rounded border-stone-300" /></th>}
              <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Team</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Team Lead</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Members</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
              {isAdmin && <th className="px-4 py-3 w-10" />}
              <th className="px-4 py-3 w-8" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={isSA ? 8 : isAdmin ? 7 : 6} className="text-center py-12 text-muted-foreground text-sm">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-(--e-orange)" />
                </td>
              </tr>
            )}
            {!isLoading && teams.length === 0 && (
              <tr>
                <td colSpan={isSA ? 8 : isAdmin ? 7 : 6} className="text-center py-16 text-muted-foreground text-sm">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No teams found
                </td>
              </tr>
            )}
            {teams.map((team, i) => (
              <tr
                key={team.id}
                onClick={() => setLocation(`/admin/teams/${team.id}`)}
                className={`border-b border-[var(--e-border)] cursor-pointer transition-colors hover:bg-[#FFF8F5] ${
                  i % 2 === 0 ? "bg-white" : "bg-[#FAFAF9]"
                }`}
              >
                {isSA && <td className="px-3 py-3 w-10" onClick={e => e.stopPropagation()}><input type="checkbox" checked={selectedIds.has(team.id)} onChange={() => toggleSelect(team.id)} className="rounded border-stone-300" /></td>}
                {/* Team name + colour badge + description */}
                <td className="px-6 py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ backgroundColor: team.color || "var(--e-orange)" }}
                    >
                      {team.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-foreground leading-snug">{team.name}</div>
                      {team.description && (
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">{team.description}</div>
                      )}
                    </div>
                  </div>
                </td>

                {/* Type */}
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                  {typeLabelFor(team.type)}
                </td>

                {/* Team Lead */}
                <td className="px-4 py-3">
                  {team.teamLeadName
                    ? <span className="text-foreground">{team.teamLeadName}</span>
                    : <span className="text-muted-foreground">—</span>
                  }
                </td>

                {/* Members */}
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-foreground">
                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                    {team.memberCount}
                  </span>
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[team.status] ?? "bg-gray-100 text-gray-500"}`}>
                    {team.status}
                  </span>
                </td>

                {/* Delete (admin only) */}
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

                {/* Chevron */}
                <td className="px-4 py-3">
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ─────────────────────────────────────────────────── */}
      <div className="px-6 py-3 border-t border-[var(--e-border)] bg-[var(--e-bg-page)]">
        <ListPagination
          page={page}
          pageSize={pageSize}
          total={total}
          onChange={setPage}
          onPageSizeChange={v => { setPageSize(v); setPage(1); }}
          label="teams"
        />
      </div>

      {/* ── Create Dialog ───────────────────────────────────────────────── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Team</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Team Name <span className="text-red-500">*</span></Label>
              <Input
                placeholder="e.g. Bangkok Agents"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe this team's purpose…"
                rows={3}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
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
                  <input
                    type="color"
                    value={form.color}
                    onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                    className="w-10 h-9 rounded border border-border cursor-pointer p-0.5"
                  />
                  <Input
                    value={form.color}
                    onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button
                className="bg-(--e-orange) hover:bg-[#e0721a] text-white"
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
