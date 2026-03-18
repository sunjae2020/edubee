import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Globe, MapPin, Edit, Loader2 } from "lucide-react";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface PackageGroup {
  id: string; name: string; slug?: string; description?: string;
  country?: string; city?: string; status?: string; type?: string;
  minAge?: number; maxAge?: number; minWeeks?: number; maxWeeks?: number;
  createdAt: string;
}

const COUNTRIES = [
  { code: "AU", name: "Australia", currency: "A$" },
  { code: "SG", name: "Singapore", currency: "S$" },
  { code: "PH", name: "Philippines", currency: "₱" },
  { code: "TH", name: "Thailand", currency: "฿" },
  { code: "KR", name: "South Korea", currency: "₩" },
  { code: "JP", name: "Japan", currency: "¥" },
  { code: "GB", name: "United Kingdom", currency: "£" },
];

const PROGRAM_TYPES = [
  "english_camp", "stem_camp", "arts_camp", "sports_camp",
  "leadership_camp", "language_immersion", "academic_prep", "cultural_exchange",
];

const emptyForm = {
  name: "", description: "", country: "", city: "", type: "",
  minAge: "", maxAge: "", minWeeks: "", maxWeeks: "",
};

export default function PackageGroups() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<PackageGroup | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [modalTab, setModalTab] = useState("basic");

  const { data: groups = [], isLoading } = useQuery<PackageGroup[]>({
    queryKey: ["package-groups"],
    queryFn: () => axios.get(`${BASE}/api/package-groups`).then(r => r.data?.data ?? r.data),
  });

  const createGroup = useMutation({
    mutationFn: (data: any) => axios.post(`${BASE}/api/package-groups`, data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["package-groups"] }); closeModal(); toast({ title: "Package group created" }); },
    onError: () => toast({ variant: "destructive", title: "Failed to create package group" }),
  });

  const updateGroup = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => axios.put(`${BASE}/api/package-groups/${id}`, data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["package-groups"] }); closeModal(); toast({ title: "Package group updated" }); },
    onError: () => toast({ variant: "destructive", title: "Failed to update package group" }),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalTab("basic");
    setShowModal(true);
  };

  const openEdit = (g: PackageGroup) => {
    setEditing(g);
    setForm({
      name: g.name ?? "",
      description: g.description ?? "",
      country: g.country ?? "",
      city: g.city ?? "",
      type: g.type ?? "",
      minAge: g.minAge?.toString() ?? "",
      maxAge: g.maxAge?.toString() ?? "",
      minWeeks: g.minWeeks?.toString() ?? "",
      maxWeeks: g.maxWeeks?.toString() ?? "",
    });
    setModalTab("basic");
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditing(null); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      minAge: form.minAge ? parseInt(form.minAge) : undefined,
      maxAge: form.maxAge ? parseInt(form.maxAge) : undefined,
      minWeeks: form.minWeeks ? parseInt(form.minWeeks) : undefined,
      maxWeeks: form.maxWeeks ? parseInt(form.maxWeeks) : undefined,
    };
    if (editing) updateGroup.mutate({ id: editing.id, data: payload });
    else createGroup.mutate(payload);
  };

  const filtered = groups.filter(g =>
    !search ||
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.country?.toLowerCase().includes(search.toLowerCase()) ||
    g.city?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search groups…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Button size="sm" className="h-9 gap-1.5 ml-auto" onClick={openCreate}>
          <Plus className="w-4 h-4" /> New Package Group
        </Button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-40 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-border py-20 text-center">
          <div className="text-4xl mb-3">📦</div>
          <h3 className="font-semibold mb-1">No Package Groups</h3>
          <p className="text-sm text-muted-foreground mb-4">Create your first package group to get started.</p>
          <Button size="sm" onClick={openCreate} className="gap-1.5"><Plus className="w-4 h-4" /> New Package Group</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(g => {
            const countryInfo = COUNTRIES.find(c => c.code === g.country);
            return (
              <div key={g.id} className="bg-white rounded-xl border border-border p-5 hover:shadow-sm hover:border-[#F08301]/30 transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm leading-tight truncate">{g.name}</h3>
                    {g.type && (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] bg-orange-50 text-orange-700 border border-orange-100">
                        {g.type.replace(/_/g, " ")}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => openEdit(g)}
                    className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                </div>

                {g.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{g.description}</p>
                )}

                <div className="space-y-1">
                  {g.country && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Globe className="w-3.5 h-3.5" />
                      <span>{countryInfo?.name ?? g.country}</span>
                    </div>
                  )}
                  {g.city && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{g.city}</span>
                    </div>
                  )}
                  {(g.minAge || g.maxAge) && (
                    <div className="text-xs text-muted-foreground">
                      🎂 Age: {g.minAge ?? "?"} – {g.maxAge ?? "?"} yrs
                    </div>
                  )}
                  {(g.minWeeks || g.maxWeeks) && (
                    <div className="text-xs text-muted-foreground">
                      📅 Duration: {g.minWeeks ?? "?"} – {g.maxWeeks ?? "?"} weeks
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-border text-[10px] text-muted-foreground">
                  Created {format(new Date(g.createdAt), "MMM d, yyyy")}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={o => !o && closeModal()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Package Group" : "New Package Group"}</DialogTitle>
          </DialogHeader>

          <Tabs value={modalTab} onValueChange={setModalTab}>
            <TabsList className="w-full h-9 mb-4">
              <TabsTrigger value="basic" className="flex-1 text-xs">Basic Info</TabsTrigger>
              <TabsTrigger value="details" className="flex-1 text-xs">Details</TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit}>
              <TabsContent value="basic" className="m-0 space-y-4">
                <div className="space-y-1.5">
                  <Label>Group Name *</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. English Adventure Camp AU" />
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Describe this camp program…" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Country</Label>
                    <Select value={form.country} onValueChange={v => setForm(f => ({ ...f, country: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map(c => (
                          <SelectItem key={c.code} value={c.code}>{c.name} ({c.currency})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>City</Label>
                    <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="e.g. Sydney" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Program Type</Label>
                  <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {PROGRAM_TYPES.map(t => (
                        <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="details" className="m-0 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Min Age</Label>
                    <Input type="number" value={form.minAge} onChange={e => setForm(f => ({ ...f, minAge: e.target.value }))} placeholder="e.g. 8" min={1} max={99} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Max Age</Label>
                    <Input type="number" value={form.maxAge} onChange={e => setForm(f => ({ ...f, maxAge: e.target.value }))} placeholder="e.g. 18" min={1} max={99} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Min Weeks</Label>
                    <Input type="number" value={form.minWeeks} onChange={e => setForm(f => ({ ...f, minWeeks: e.target.value }))} placeholder="e.g. 1" min={1} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Max Weeks</Label>
                    <Input type="number" value={form.maxWeeks} onChange={e => setForm(f => ({ ...f, maxWeeks: e.target.value }))} placeholder="e.g. 12" min={1} />
                  </div>
                </div>
              </TabsContent>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
                <Button type="submit" disabled={createGroup.isPending || updateGroup.isPending}>
                  {(createGroup.isPending || updateGroup.isPending) && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {editing ? "Save Changes" : "Create Group"}
                </Button>
              </div>
            </form>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
