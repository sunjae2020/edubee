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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Globe, MapPin, Edit, Loader2, Trash2, Package, ImageIcon, CheckCircle2, Clock } from "lucide-react";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { ListPagination } from "@/components/ui/list-pagination";
import { format } from "date-fns";

const PAGE_SIZE = 12;
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface PackageGroup {
  id: string;
  nameEn: string;
  nameKo?: string | null;
  nameJa?: string | null;
  nameTh?: string | null;
  descriptionEn?: string | null;
  descriptionKo?: string | null;
  descriptionJa?: string | null;
  descriptionTh?: string | null;
  thumbnailUrl?: string | null;
  location?: string | null;
  countryCode?: string | null;
  status?: string | null;
  sortOrder?: number | null;
  campProviderId?: string | null;
  createdAt: string;
  updatedAt?: string;
}

interface Pkg {
  id: string;
  packageGroupId: string;
  name: string;
  durationDays: number;
  maxParticipants?: number | null;
  priceAud?: string | null;
  priceUsd?: string | null;
  priceKrw?: string | null;
  priceJpy?: string | null;
  priceThb?: string | null;
  pricePhp?: string | null;
  priceSgd?: string | null;
  priceGbp?: string | null;
  status?: string;
  createdAt?: string;
}

const COUNTRIES = [
  { code: "AU", name: "Australia", currency: "AUD", symbol: "A$", flag: "🇦🇺" },
  { code: "SG", name: "Singapore", currency: "SGD", symbol: "S$", flag: "🇸🇬" },
  { code: "PH", name: "Philippines", currency: "PHP", symbol: "₱", flag: "🇵🇭" },
  { code: "TH", name: "Thailand", currency: "THB", symbol: "฿", flag: "🇹🇭" },
  { code: "KR", name: "South Korea", currency: "KRW", symbol: "₩", flag: "🇰🇷" },
  { code: "JP", name: "Japan", currency: "JPY", symbol: "¥", flag: "🇯🇵" },
  { code: "GB", name: "United Kingdom", currency: "GBP", symbol: "£", flag: "🇬🇧" },
];

const LANG_TABS = [
  { key: "en", label: "🇦🇺 English", nameProp: "nameEn" as const, descProp: "descriptionEn" as const, required: true },
  { key: "ko", label: "🇰🇷 한국어", nameProp: "nameKo" as const, descProp: "descriptionKo" as const, required: false },
  { key: "ja", label: "🇯🇵 日本語", nameProp: "nameJa" as const, descProp: "descriptionJa" as const, required: false },
  { key: "th", label: "🇹🇭 ภาษาไทย", nameProp: "nameTh" as const, descProp: "descriptionTh" as const, required: false },
];

type GroupForm = {
  nameEn: string; nameKo: string; nameJa: string; nameTh: string;
  descriptionEn: string; descriptionKo: string; descriptionJa: string; descriptionTh: string;
  thumbnailUrl: string; location: string; countryCode: string; status: string; sortOrder: string;
};

type PkgForm = {
  name: string; durationDays: string; maxParticipants: string;
  priceAud: string; priceUsd: string; priceKrw: string; priceJpy: string;
  priceThb: string; pricePhp: string; priceSgd: string; priceGbp: string;
};

const emptyGroupForm: GroupForm = {
  nameEn: "", nameKo: "", nameJa: "", nameTh: "",
  descriptionEn: "", descriptionKo: "", descriptionJa: "", descriptionTh: "",
  thumbnailUrl: "", location: "", countryCode: "", status: "draft", sortOrder: "0",
};

const emptyPkgForm: PkgForm = {
  name: "", durationDays: "", maxParticipants: "",
  priceAud: "", priceUsd: "", priceKrw: "", priceJpy: "",
  priceThb: "", pricePhp: "", priceSgd: "", priceGbp: "",
};

export default function PackageGroups() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<PackageGroup | null>(null);
  const [form, setForm] = useState<GroupForm>(emptyGroupForm);
  const [modalTab, setModalTab] = useState("info");
  const [langTab, setLangTab] = useState("en");

  const [editingPkg, setEditingPkg] = useState<Pkg | null>(null);
  const [showPkgForm, setShowPkgForm] = useState(false);
  const [pkgForm, setPkgForm] = useState<PkgForm>(emptyPkgForm);

  const { data: groups = [], isLoading } = useQuery<PackageGroup[]>({
    queryKey: ["package-groups"],
    queryFn: () => axios.get(`${BASE}/api/package-groups`).then(r => r.data?.data ?? r.data),
  });

  const { data: pkgData } = useQuery<{ data: Pkg[] }>({
    queryKey: ["packages", editing?.id],
    queryFn: () => axios.get(`${BASE}/api/packages?packageGroupId=${editing!.id}&limit=50`).then(r => r.data),
    enabled: !!editing?.id && modalTab === "packages",
  });
  const subPackages = pkgData?.data ?? [];

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

  const createPkg = useMutation({
    mutationFn: (data: any) => axios.post(`${BASE}/api/packages`, data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["packages", editing?.id] }); closePkgForm(); toast({ title: "Package added" }); },
    onError: () => toast({ variant: "destructive", title: "Failed to add package" }),
  });

  const updatePkg = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => axios.put(`${BASE}/api/packages/${id}`, data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["packages", editing?.id] }); closePkgForm(); toast({ title: "Package updated" }); },
    onError: () => toast({ variant: "destructive", title: "Failed to update package" }),
  });

  const deletePkg = useMutation({
    mutationFn: (id: string) => axios.delete(`${BASE}/api/packages/${id}`).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["packages", editing?.id] }); toast({ title: "Package removed" }); },
    onError: () => toast({ variant: "destructive", title: "Failed to remove package" }),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyGroupForm);
    setModalTab("info");
    setLangTab("en");
    setShowModal(true);
  };

  const openEdit = (g: PackageGroup) => {
    setEditing(g);
    setForm({
      nameEn: g.nameEn ?? "",
      nameKo: g.nameKo ?? "",
      nameJa: g.nameJa ?? "",
      nameTh: g.nameTh ?? "",
      descriptionEn: g.descriptionEn ?? "",
      descriptionKo: g.descriptionKo ?? "",
      descriptionJa: g.descriptionJa ?? "",
      descriptionTh: g.descriptionTh ?? "",
      thumbnailUrl: g.thumbnailUrl ?? "",
      location: g.location ?? "",
      countryCode: g.countryCode ?? "",
      status: g.status ?? "draft",
      sortOrder: g.sortOrder?.toString() ?? "0",
    });
    setModalTab("info");
    setLangTab("en");
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditing(null); closePkgForm(); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      nameEn: form.nameEn,
      nameKo: form.nameKo || null,
      nameJa: form.nameJa || null,
      nameTh: form.nameTh || null,
      descriptionEn: form.descriptionEn || null,
      descriptionKo: form.descriptionKo || null,
      descriptionJa: form.descriptionJa || null,
      descriptionTh: form.descriptionTh || null,
      thumbnailUrl: form.thumbnailUrl || null,
      location: form.location || null,
      countryCode: form.countryCode || null,
      status: form.status,
      sortOrder: form.sortOrder ? parseInt(form.sortOrder) : 0,
    };
    if (editing) updateGroup.mutate({ id: editing.id, data: payload });
    else createGroup.mutate(payload);
  };

  const openAddPkg = () => {
    setEditingPkg(null);
    setPkgForm(emptyPkgForm);
    setShowPkgForm(true);
  };

  const openEditPkg = (pkg: Pkg) => {
    setEditingPkg(pkg);
    setPkgForm({
      name: pkg.name ?? "",
      durationDays: pkg.durationDays?.toString() ?? "",
      maxParticipants: pkg.maxParticipants?.toString() ?? "",
      priceAud: pkg.priceAud ?? "",
      priceUsd: pkg.priceUsd ?? "",
      priceKrw: pkg.priceKrw ?? "",
      priceJpy: pkg.priceJpy ?? "",
      priceThb: pkg.priceThb ?? "",
      pricePhp: pkg.pricePhp ?? "",
      priceSgd: pkg.priceSgd ?? "",
      priceGbp: pkg.priceGbp ?? "",
    });
    setShowPkgForm(true);
  };

  const closePkgForm = () => { setShowPkgForm(false); setEditingPkg(null); setPkgForm(emptyPkgForm); };

  const handlePkgSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      packageGroupId: editing!.id,
      name: pkgForm.name,
      durationDays: parseInt(pkgForm.durationDays),
      maxParticipants: pkgForm.maxParticipants ? parseInt(pkgForm.maxParticipants) : null,
      priceAud: pkgForm.priceAud || null,
      priceUsd: pkgForm.priceUsd || null,
      priceKrw: pkgForm.priceKrw || null,
      priceJpy: pkgForm.priceJpy || null,
      priceThb: pkgForm.priceThb || null,
      pricePhp: pkgForm.pricePhp || null,
      priceSgd: pkgForm.priceSgd || null,
      priceGbp: pkgForm.priceGbp || null,
    };
    if (editingPkg) updatePkg.mutate({ id: editingPkg.id, data: payload });
    else createPkg.mutate(payload);
  };

  const countryPriceFields: { label: string; field: keyof PkgForm; flag: string }[] = [
    { label: "AUD (Australia)", field: "priceAud", flag: "🇦🇺" },
    { label: "SGD (Singapore)", field: "priceSgd", flag: "🇸🇬" },
    { label: "PHP (Philippines)", field: "pricePhp", flag: "🇵🇭" },
    { label: "THB (Thailand)", field: "priceThb", flag: "🇹🇭" },
    { label: "KRW (South Korea)", field: "priceKrw", flag: "🇰🇷" },
    { label: "JPY (Japan)", field: "priceJpy", flag: "🇯🇵" },
    { label: "GBP (United Kingdom)", field: "priceGbp", flag: "🇬🇧" },
    { label: "USD (United States)", field: "priceUsd", flag: "🇺🇸" },
  ];

  const filtered = groups.filter(g => {
    const matchSearch = !search ||
      (g.nameEn ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (g.countryCode ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (g.location ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || g.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const getCountryInfo = (code?: string | null) => COUNTRIES.find(c => c.code === code);

  return (
    <div className="space-y-4">
      <ListToolbar
        search={search}
        onSearch={v => { setSearch(v); setPage(1); }}
        total={filtered.length}
        addLabel="New Package Group"
        onAdd={openCreate}
        statuses={["active", "draft", "archived"]}
        statusLabels={{ active: "Active", draft: "Draft", archived: "Archived" }}
        activeStatus={statusFilter}
        onStatusChange={v => { setStatusFilter(v); setPage(1); }}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-40 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border py-20 text-center">
          <div className="text-4xl mb-3">📦</div>
          <h3 className="font-semibold mb-1">No Package Groups</h3>
          <p className="text-sm text-muted-foreground mb-4">Create your first package group to get started.</p>
          <Button size="sm" onClick={openCreate} className="gap-1.5 bg-[#F5821F] hover:bg-[#d97706] text-white">
            <Plus className="w-4 h-4" /> New Package Group
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paged.map(g => {
            const country = getCountryInfo(g.countryCode);
            const isActive = g.status === "active";
            return (
              <div key={g.id} className="bg-white rounded-xl border border-border p-5 hover:shadow-sm hover:border-[#F5821F]/30 transition-all group relative overflow-hidden">
                {g.thumbnailUrl && (
                  <div className="absolute inset-0 opacity-5">
                    <img src={g.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="relative">
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${isActive ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                          {isActive ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                          {g.status ?? "draft"}
                        </span>
                      </div>
                      <h3 className="font-semibold text-sm leading-tight">{g.nameEn}</h3>
                      {g.nameKo && <p className="text-[11px] text-muted-foreground mt-0.5">{g.nameKo}</p>}
                    </div>
                    <button
                      onClick={() => openEdit(g)}
                      className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {g.descriptionEn && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{g.descriptionEn}</p>
                  )}

                  <div className="space-y-1">
                    {g.countryCode && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Globe className="w-3.5 h-3.5" />
                        <span>{country ? `${country.flag} ${country.name}` : g.countryCode}</span>
                      </div>
                    )}
                    {g.location && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{g.location}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t border-border text-[10px] text-muted-foreground">
                    Created {format(new Date(g.createdAt), "MMM d, yyyy")}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ListPagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onChange={setPage} />

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={o => !o && closeModal()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit: ${editing.nameEn}` : "New Package Group"}</DialogTitle>
          </DialogHeader>

          <Tabs value={modalTab} onValueChange={setModalTab}>
            <TabsList className="w-full h-9 mb-4">
              <TabsTrigger value="info" className="flex-1 text-xs">Program Info</TabsTrigger>
              <TabsTrigger value="media" className="flex-1 text-xs">Image & Settings</TabsTrigger>
              {editing && <TabsTrigger value="packages" className="flex-1 text-xs">Packages & Pricing</TabsTrigger>}
            </TabsList>

            {/* Tab 1: Program Info (multi-language) */}
            <TabsContent value="info" className="m-0">
              <Tabs value={langTab} onValueChange={setLangTab}>
                <TabsList className="h-8 mb-4 bg-muted/50">
                  {LANG_TABS.map(lt => (
                    <TabsTrigger key={lt.key} value={lt.key} className="text-[11px] px-3">
                      {lt.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {LANG_TABS.map(lt => (
                  <TabsContent key={lt.key} value={lt.key} className="m-0 space-y-3">
                    <div className="space-y-1.5">
                      <Label>
                        Program Name {lt.required ? "*" : <span className="text-muted-foreground text-xs">(optional)</span>}
                      </Label>
                      <Input
                        value={form[lt.nameProp] ?? ""}
                        onChange={e => setForm(f => ({ ...f, [lt.nameProp]: e.target.value }))}
                        required={lt.required}
                        placeholder={lt.required ? "e.g. Sydney Summer English Camp 2025" : "Name in this language…"}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>
                        Description {!lt.required && <span className="text-muted-foreground text-xs">(optional)</span>}
                      </Label>
                      <Textarea
                        value={form[lt.descProp] ?? ""}
                        onChange={e => setForm(f => ({ ...f, [lt.descProp]: e.target.value }))}
                        rows={4}
                        placeholder={lt.required ? "Describe this camp program…" : "Description in this language…"}
                      />
                    </div>
                  </TabsContent>
                ))}
              </Tabs>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="space-y-1.5">
                  <Label>Country *</Label>
                  <Select value={form.countryCode} onValueChange={v => setForm(f => ({ ...f, countryCode: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map(c => (
                        <SelectItem key={c.code} value={c.code}>{c.flag} {c.name} ({c.symbol})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>City / Location</Label>
                  <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Sydney, Australia" />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
                <Button
                  type="button"
                  className="bg-[#F5821F] hover:bg-[#d97706] text-white"
                  disabled={createGroup.isPending || updateGroup.isPending || !form.nameEn}
                  onClick={handleSubmit as any}
                >
                  {(createGroup.isPending || updateGroup.isPending) && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {editing ? "Save Changes" : "Create Group"}
                </Button>
              </div>
            </TabsContent>

            {/* Tab 2: Image & Settings */}
            <TabsContent value="media" className="m-0 space-y-5">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5" /> Thumbnail Image URL</Label>
                <Input
                  value={form.thumbnailUrl}
                  onChange={e => setForm(f => ({ ...f, thumbnailUrl: e.target.value }))}
                  placeholder="https://example.com/image.jpg"
                />
                <p className="text-xs text-muted-foreground">Paste a direct image URL (jpg, png, webp). Displayed on the landing page.</p>
                {form.thumbnailUrl && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-border w-[200px]">
                    <img
                      src={form.thumbnailUrl}
                      alt="Preview"
                      className="w-full h-[120px] object-cover"
                      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">
                        <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-amber-500" /> Draft (hidden)</span>
                      </SelectItem>
                      <SelectItem value="active">
                        <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> Active (visible on landing)</span>
                      </SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Only "Active" groups appear on the public landing page.</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Sort Order</Label>
                  <Input
                    type="number"
                    value={form.sortOrder}
                    onChange={e => setForm(f => ({ ...f, sortOrder: e.target.value }))}
                    placeholder="0"
                    min={0}
                  />
                  <p className="text-xs text-muted-foreground">Lower numbers appear first on landing page.</p>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
                <Button
                  type="button"
                  className="bg-[#F5821F] hover:bg-[#d97706] text-white"
                  disabled={createGroup.isPending || updateGroup.isPending || !form.nameEn}
                  onClick={handleSubmit as any}
                >
                  {(createGroup.isPending || updateGroup.isPending) && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {editing ? "Save Changes" : "Create Group"}
                </Button>
              </div>
            </TabsContent>

            {/* Tab 3: Packages & Pricing (edit only) */}
            {editing && (
              <TabsContent value="packages" className="m-0 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Sub-packages define duration and pricing shown on the landing page.</p>
                  <Button size="sm" onClick={openAddPkg} className="gap-1.5 bg-[#F5821F] hover:bg-[#d97706] text-white">
                    <Plus className="w-3.5 h-3.5" /> Add Package
                  </Button>
                </div>

                {subPackages.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground border border-dashed border-border rounded-xl">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No packages yet. Add at least one to show pricing on the landing page.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {subPackages.map(pkg => {
                      const country = getCountryInfo(editing.countryCode);
                      const priceField = `price${country?.currency.charAt(0).toUpperCase()}${country?.currency.slice(1).toLowerCase()}` as keyof Pkg;
                      const displayPrice = pkg[priceField] ?? pkg.priceAud;
                      const symbol = country?.symbol ?? "A$";
                      const days = pkg.durationDays;
                      const weeks = Math.round(days / 7);
                      return (
                        <div key={pkg.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/30">
                          <div>
                            <p className="text-sm font-medium">{pkg.name}</p>
                            <p className="text-xs text-muted-foreground">{days} days ({weeks} weeks){displayPrice ? ` · ${symbol}${Number(displayPrice).toLocaleString()}` : ""}</p>
                          </div>
                          <div className="flex gap-1.5">
                            <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => openEditPkg(pkg)}>
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm" variant="outline" className="h-7 px-2 text-destructive hover:text-destructive"
                              onClick={() => { if (window.confirm("Remove this package?")) deletePkg.mutate(pkg.id); }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Package add/edit inline form */}
                {showPkgForm && (
                  <form onSubmit={handlePkgSubmit} className="border border-[#F5821F]/40 rounded-xl p-4 bg-[#FEF0E3]/30 space-y-4">
                    <h4 className="text-sm font-semibold text-[#F5821F]">{editingPkg ? "Edit Package" : "New Package"}</h4>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2 space-y-1.5">
                        <Label>Package Name *</Label>
                        <Input value={pkgForm.name} onChange={e => setPkgForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. 4-Week Program" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Duration (days) *</Label>
                        <Input type="number" value={pkgForm.durationDays} onChange={e => setPkgForm(f => ({ ...f, durationDays: e.target.value }))} required placeholder="28" min={1} />
                      </div>
                    </div>

                    <div>
                      <Label className="mb-2 block">Pricing by Currency</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {countryPriceFields.map(({ label, field, flag }) => (
                          <div key={field} className="space-y-1">
                            <Label className="text-[11px] text-muted-foreground">{flag} {label}</Label>
                            <Input
                              type="number"
                              value={pkgForm[field]}
                              onChange={e => setPkgForm(f => ({ ...f, [field]: e.target.value }))}
                              placeholder="0"
                              className="h-8 text-sm"
                              min={0}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="outline" size="sm" onClick={closePkgForm}>Cancel</Button>
                      <Button type="submit" size="sm" className="bg-[#F5821F] hover:bg-[#d97706] text-white" disabled={createPkg.isPending || updatePkg.isPending}>
                        {(createPkg.isPending || updatePkg.isPending) && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                        {editingPkg ? "Save Package" : "Add Package"}
                      </Button>
                    </div>
                  </form>
                )}
              </TabsContent>
            )}
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
