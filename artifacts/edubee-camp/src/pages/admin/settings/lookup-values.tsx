import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Plus, Pencil, Trash2, GripVertical, Check, X, ToggleLeft, ToggleRight,
  Tags, ChevronRight, ArrowLeft,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (path: string) => `${BASE}${path}`;

interface LookupGroup {
  key: string;
  label: string;
  description: string;
  exists: boolean;
}

interface LookupItem {
  id: string;
  group: string;
  label: string;
  key: string;
  status: string;
  sortOrder: number;
}

// ── Inline edit input ─────────────────────────────────────────────────────────
function InlineEdit({ value, onSave, onCancel }: { value: string; onSave: (v: string) => void; onCancel: () => void }) {
  const [text, setText] = useState(value);
  return (
    <div className="flex items-center gap-1.5 flex-1">
      <input
        autoFocus
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") onSave(text); if (e.key === "Escape") onCancel(); }}
        className="flex-1 px-2 py-0.5 text-sm border border-[#F5821F] rounded focus:outline-none"
      />
      <button onClick={() => onSave(text)} className="text-green-600 hover:text-green-700"><Check className="w-4 h-4" /></button>
      <button onClick={onCancel} className="text-[#A8A29E] hover:text-[#78716C]"><X className="w-4 h-4" /></button>
    </div>
  );
}

// ── Lookup Items panel ────────────────────────────────────────────────────────
function LookupItemsPanel({ group, groupLabel, onBack }: { group: string; groupLabel: string; onBack: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [addingNew, setAddingNew] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const { data: items = [], isLoading } = useQuery<LookupItem[]>({
    queryKey: ["lookups", group, showInactive],
    queryFn: () => axios.get(api(`/api/settings/lookups?group=${group}${showInactive ? "&all=1" : ""}`)).then(r => r.data),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["lookups", group] });

  const createMutation = useMutation({
    mutationFn: (label: string) => axios.post(api("/api/settings/lookups"), { group, label }),
    onSuccess: () => { invalidate(); setNewLabel(""); setAddingNew(false); toast({ title: "Added" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, label, status }: { id: string; label?: string; status?: string }) =>
      axios.put(api(`/api/settings/lookups/${id}`), { label, status }),
    onSuccess: () => { invalidate(); setEditingId(null); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => axios.delete(api(`/api/settings/lookups/${id}`)),
    onSuccess: () => { invalidate(); toast({ title: "Deleted" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const active   = items.filter(i => i.status === "Active");
  const inactive = items.filter(i => i.status === "Inactive");
  const displayed = showInactive ? items.filter(i => i.status !== "Deleted") : active;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="text-[#A8A29E] hover:text-[#F5821F] transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-base font-semibold text-[#1C1917]">{groupLabel}</h2>
            <p className="text-xs text-[#A8A29E]">{active.length} active · {inactive.length} inactive</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowInactive(v => !v)}
            className={`text-xs flex items-center gap-1 px-2 py-1 rounded border transition-colors ${showInactive ? "bg-[#F4F3F1] border-[#E8E6E2] text-[#78716C]" : "border-transparent text-[#A8A29E] hover:text-[#78716C]"}`}
          >
            {showInactive ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
            Show inactive
          </button>
          <Button size="sm" className="h-8 bg-[#F5821F] hover:bg-[#e07010] text-white text-xs gap-1.5"
            onClick={() => setAddingNew(true)}>
            <Plus className="w-3.5 h-3.5" /> Add Value
          </Button>
        </div>
      </div>

      {/* Add new */}
      {addingNew && (
        <div className="flex items-center gap-2 mb-3 p-2 bg-[#FAFAF9] border border-[#E8E6E2] rounded-lg">
          <input
            autoFocus
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && newLabel.trim()) createMutation.mutate(newLabel.trim()); if (e.key === "Escape") { setAddingNew(false); setNewLabel(""); }}}
            placeholder="Enter value name…"
            className="flex-1 px-2 py-1 text-sm border border-[#E8E6E2] rounded focus:outline-none focus:ring-1 focus:ring-[#F5821F]"
          />
          <Button size="sm" className="h-7 text-xs bg-[#F5821F] hover:bg-[#e07010] text-white"
            disabled={!newLabel.trim() || createMutation.isPending}
            onClick={() => createMutation.mutate(newLabel.trim())}>
            Save
          </Button>
          <button onClick={() => { setAddingNew(false); setNewLabel(""); }} className="text-[#A8A29E] hover:text-[#78716C]">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Items list */}
      {isLoading ? (
        <div className="text-center py-8 text-sm text-[#A8A29E]">Loading…</div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-10 text-sm text-[#A8A29E]">
          <Tags className="w-8 h-8 mx-auto mb-2 opacity-30" />
          No values yet — click "Add Value" to get started.
        </div>
      ) : (
        <div className="space-y-1">
          {displayed.map(item => (
            <div
              key={item.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors group ${
                item.status === "Inactive" ? "bg-[#FAFAF9] border-[#E8E6E2] opacity-60" : "bg-white border-[#E8E6E2] hover:border-[#F5821F]/30"
              }`}
            >
              <GripVertical className="w-3.5 h-3.5 text-[#D6D3D1] cursor-grab shrink-0" />

              {editingId === item.id ? (
                <InlineEdit
                  value={item.label}
                  onSave={label => updateMutation.mutate({ id: item.id, label })}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium text-[#1C1917]">{item.label}</span>
                  {item.status === "Inactive" && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-[#A8A29E] border-[#E8E6E2]">Inactive</Badge>
                  )}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setEditingId(item.id)}
                      className="p-1 rounded hover:bg-[#F4F3F1] text-[#A8A29E] hover:text-[#78716C]"
                      title="Rename"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => updateMutation.mutate({ id: item.id, status: item.status === "Active" ? "Inactive" : "Active" })}
                      className="p-1 rounded hover:bg-[#F4F3F1] text-[#A8A29E] hover:text-[#78716C]"
                      title={item.status === "Active" ? "Deactivate" : "Activate"}
                    >
                      {item.status === "Active" ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => { if (confirm(`Delete "${item.label}"?`)) deleteMutation.mutate(item.id); }}
                      className="p-1 rounded hover:bg-red-50 text-[#A8A29E] hover:text-red-500"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function LookupValuesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selectedGroup, setSelectedGroup] = useState<LookupGroup | null>(null);

  const { data: groups = [], isLoading } = useQuery<LookupGroup[]>({
    queryKey: ["lookup-groups"],
    queryFn: () => axios.get(api("/api/settings/lookups/groups")).then(r => r.data),
  });

  const seedMutation = useMutation({
    mutationFn: () => axios.post(api("/api/settings/lookups/seed")),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["lookup-groups"] });
      qc.invalidateQueries({ queryKey: ["lookups"] });
      toast({ title: `Default values loaded (${res.data.seeded} entries seeded)` });
    },
    onError: () => toast({ title: "Seed failed", variant: "destructive" }),
  });

  const hasAny = groups.some(g => g.exists);

  if (selectedGroup) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <LookupItemsPanel
          group={selectedGroup.key}
          groupLabel={selectedGroup.label}
          onBack={() => setSelectedGroup(null)}
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#1C1917]">Lookup Values</h1>
          <p className="text-sm text-[#A8A29E] mt-0.5">
            Manage the dropdown options used across the system — account types, categories, channels, and more.
          </p>
        </div>
        {!hasAny && (
          <Button
            size="sm"
            variant="outline"
            className="text-xs gap-1.5 border-[#F5821F] text-[#F5821F] hover:bg-[#FEF0E3]"
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
          >
            <Plus className="w-3.5 h-3.5" />
            {seedMutation.isPending ? "Loading…" : "Load Default Values"}
          </Button>
        )}
      </div>

      {/* Group cards */}
      {isLoading ? (
        <div className="text-center py-12 text-sm text-[#A8A29E]">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {groups.map(group => (
            <Card
              key={group.key}
              className="cursor-pointer hover:border-[#F5821F]/50 hover:shadow-sm transition-all border-[#E8E6E2]"
              onClick={() => setSelectedGroup(group)}
            >
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-sm font-semibold text-[#1C1917]">{group.label}</CardTitle>
                  <ChevronRight className="w-4 h-4 text-[#A8A29E] mt-0.5 shrink-0" />
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                <p className="text-xs text-[#A8A29E] leading-relaxed">{group.description}</p>
                <div className="mt-2">
                  {group.exists ? (
                    <Badge className="text-[10px] bg-[#F0FDF4] text-green-700 border-green-200 font-normal">
                      Values configured
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-[#A8A29E] border-[#E8E6E2] font-normal">
                      No values yet
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {hasAny && (
        <div className="mt-4 text-right">
          <button
            className="text-xs text-[#A8A29E] hover:text-[#F5821F] transition-colors"
            onClick={() => { if (confirm("Re-seed default values? Existing entries will be preserved.")) seedMutation.mutate(); }}
          >
            Re-seed default values
          </button>
        </div>
      )}
    </div>
  );
}
