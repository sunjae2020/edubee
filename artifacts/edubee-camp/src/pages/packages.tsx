import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import axios from "axios";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ListPagination } from "@/components/ui/list-pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Search, Package as PackageIcon, Globe, CheckCircle2, Clock, ChevronRight, Users, GraduationCap, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const PAGE_SIZE = 20;

const COUNTRY_FLAG: Record<string, string> = {
  AU: "🇦🇺", PH: "🇵🇭", SG: "🇸🇬", TH: "🇹🇭", KR: "🇰🇷", JP: "🇯🇵", GB: "🇬🇧", US: "🇺🇸",
};

const COUNTRY_CURRENCY: Record<string, { field: string; sym: string; dec: number }> = {
  PH: { field: "pricePhp", sym: "₱", dec: 0 },
  TH: { field: "priceThb", sym: "฿", dec: 0 },
  SG: { field: "priceSgd", sym: "S$", dec: 2 },
  JP: { field: "priceJpy", sym: "¥", dec: 0 },
  KR: { field: "priceKrw", sym: "₩", dec: 0 },
  GB: { field: "priceGbp", sym: "£", dec: 2 },
  US: { field: "priceUsd", sym: "$", dec: 2 },
  AU: { field: "priceAud", sym: "A$", dec: 0 },
};

interface PackageGroup {
  id: string;
  nameEn: string;
  nameKo?: string | null;
  countryCode?: string | null;
  packageCount?: number;
  status?: string | null;
}

interface PkgRow {
  id: string;
  packageGroupId: string;
  name: string;
  adults?: number | null;
  children?: number | null;
  priceAud?: string | null;
  priceUsd?: string | null;
  priceKrw?: string | null;
  priceJpy?: string | null;
  priceThb?: string | null;
  pricePhp?: string | null;
  priceSgd?: string | null;
  priceGbp?: string | null;
  createdAt?: string;
  groupNameEn?: string | null;
  groupNameKo?: string | null;
  groupLocation?: string | null;
  groupCountryCode?: string | null;
  groupStatus?: string | null;
}

const EMPTY_FORM = {
  packageGroupId: "",
  name: "",
  durationDays: "7",
  maxAdults: "",
  maxStudents: "",
  priceAud: "",
  status: "active",
};

function fmtPrice(val: string | null | undefined, sym: string, dec: number) {
  if (!val) return null;
  const n = parseFloat(val);
  if (isNaN(n)) return null;
  return `${sym}${n.toLocaleString("en-AU", { minimumFractionDigits: dec, maximumFractionDigits: dec })}`;
}

export default function Packages() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const [search, setSearch] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  // ── Add dialog state ──────────────────────────────────────────────
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [formError, setFormError] = useState<string | null>(null);

  const canEdit = ["super_admin", "admin", "camp_coordinator"].includes(user?.role ?? "");

  const { data: groupsData } = useQuery({
    queryKey: ["pkg-groups-filter"],
    queryFn: () => axios.get(`${BASE}/api/package-groups?limit=200`).then(r => r.data),
    staleTime: 60_000,
  });
  const groups: PackageGroup[] = groupsData?.data ?? [];

  const { data, isLoading } = useQuery({
    queryKey: ["packages-list", search, selectedGroupId, statusFilter, page],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        ...(search ? { search } : {}),
        ...(selectedGroupId !== "all" ? { packageGroupId: selectedGroupId } : {}),
        ...(statusFilter !== "all" ? { status: statusFilter } : {}),
      });
      return axios.get(`${BASE}/api/packages?${params}`).then(r => r.data);
    },
  });

  const pkgs: PkgRow[] = data?.data ?? [];
  const total = data?.meta?.total ?? 0;
  const selectedGroup = groups.find(g => g.id === selectedGroupId);

  // ── Create mutation ───────────────────────────────────────────────
  const createPkg = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      axios.post(`${BASE}/api/packages`, payload).then(r => r.data),
    onSuccess: (newPkg) => {
      qc.invalidateQueries({ queryKey: ["packages-list"] });
      qc.invalidateQueries({ queryKey: ["pkg-groups-filter"] });
      setShowAdd(false);
      setForm({ ...EMPTY_FORM });
      setFormError(null);
      toast({ title: "Package created", description: `"${newPkg.name}" has been created.` });
      setLocation(`${BASE}/admin/packages/${newPkg.id}`);
    },
    onError: (e: any) => {
      setFormError(e?.response?.data?.error ?? "Failed to create package");
    },
  });

  const handleCreate = () => {
    if (!form.packageGroupId) return setFormError("Please select a Package Group.");
    if (!form.name.trim()) return setFormError("Package name is required.");
    const dur = parseInt(form.durationDays);
    if (!form.durationDays || isNaN(dur) || dur < 1) return setFormError("Duration Days must be at least 1.");
    setFormError(null);
    createPkg.mutate({
      packageGroupId: form.packageGroupId,
      name: form.name.trim(),
      durationDays: dur,
      maxAdults: form.maxAdults ? parseInt(form.maxAdults) : null,
      maxStudents: form.maxStudents ? parseInt(form.maxStudents) : null,
      priceAud: form.priceAud || null,
      status: form.status,
    });
  };

  return (
    <div className="flex gap-4 h-full">
      {/* Left sidebar: Package Group categories */}
      <aside className="w-56 shrink-0">
        <div className="bg-card border border-border rounded-xl overflow-hidden sticky top-0">
          <div className="px-3 py-2.5 border-b border-border bg-muted/20">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Package Groups</p>
          </div>
          <div className="overflow-y-auto max-h-[calc(100vh-200px)]">
            <button
              onClick={() => { setSelectedGroupId("all"); setPage(1); }}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2.5 text-left text-sm transition-colors border-b border-border/50",
                selectedGroupId === "all"
                  ? "bg-[#FEF0E3] text-[#F5821F] font-semibold"
                  : "hover:bg-muted/40 text-foreground"
              )}
            >
              <div className="flex items-center gap-2">
                <PackageIcon className="w-3.5 h-3.5 shrink-0 opacity-60" />
                <span>All Groups</span>
              </div>
              <span className={cn(
                "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                selectedGroupId === "all" ? "bg-[#F5821F]/20 text-[#F5821F]" : "bg-muted text-muted-foreground"
              )}>
                {groupsData ? groups.reduce((a, g) => a + (g.packageCount ?? 0), 0) : "…"}
              </span>
            </button>

            {groups.length === 0
              ? [...Array(4)].map((_, i) => (
                  <div key={i} className="px-3 py-2.5 border-b border-border/50">
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))
              : groups.map(g => (
                  <button
                    key={g.id}
                    onClick={() => { setSelectedGroupId(g.id); setPage(1); }}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2.5 text-left text-sm transition-colors border-b border-border/50 last:border-0",
                      selectedGroupId === g.id
                        ? "bg-[#FEF0E3] text-[#F5821F] font-semibold"
                        : "hover:bg-muted/40 text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="shrink-0 text-base leading-none">
                        {g.countryCode ? (COUNTRY_FLAG[g.countryCode] ?? "🌐") : "🌐"}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-xs font-medium">{g.nameEn}</div>
                        {g.nameKo && (
                          <div className="truncate text-[10px] text-muted-foreground">{g.nameKo}</div>
                        )}
                      </div>
                    </div>
                    <span className={cn(
                      "shrink-0 ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                      selectedGroupId === g.id
                        ? "bg-[#F5821F]/20 text-[#F5821F]"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {g.packageCount ?? 0}
                    </span>
                  </button>
                ))
            }
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-3">
        {/* Toolbar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              className="pl-8 h-8 text-sm"
              placeholder="Search packages…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          {/* Status tabs */}
          <div className="flex gap-1 bg-muted/40 rounded-lg p-0.5 border border-border">
            {(["all", "active", "inactive", "archived"] as const).map(s => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium transition-colors capitalize",
                  statusFilter === s
                    ? "bg-white shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          <span className="text-xs text-muted-foreground">
            {total} package{total !== 1 ? "s" : ""}
            {selectedGroupId !== "all" && selectedGroup && (
              <span className="text-[#F5821F]"> · {selectedGroup.nameEn}</span>
            )}
          </span>

          {canEdit && (
            <Button
              size="sm"
              className="ml-auto gap-1.5 bg-[#F5821F] hover:bg-[#d97706] text-white h-8"
              onClick={() => {
                setForm({
                  ...EMPTY_FORM,
                  packageGroupId: selectedGroupId !== "all" ? selectedGroupId : "",
                });
                setFormError(null);
                setShowAdd(true);
              }}
            >
              <Plus className="w-3.5 h-3.5" /> Add Package
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Package Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Package Group</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">
                  <div className="flex items-center justify-center gap-1">
                    <Users className="w-3 h-3" /> Adults
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">
                  <div className="flex items-center justify-center gap-1">
                    <GraduationCap className="w-3 h-3" /> Children
                  </div>
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Price (AUD)</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Status</th>
                <th className="px-4 py-3 w-8" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="border-b last:border-0">
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : pkgs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <PackageIcon className="w-10 h-10 mx-auto mb-2 text-muted-foreground/20" />
                    <p className="text-muted-foreground text-sm">No packages found</p>
                    {(search || selectedGroupId !== "all") && (
                      <button
                        onClick={() => { setSearch(""); setSelectedGroupId("all"); }}
                        className="mt-2 text-xs text-primary underline"
                      >
                        Clear filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                pkgs.map(pkg => {
                  const cc = pkg.groupCountryCode ?? "AU";
                  const currInfo = COUNTRY_CURRENCY[cc] ?? COUNTRY_CURRENCY["AU"];
                  const priceVal = (pkg as any)[currInfo.field];
                  const priceStr = fmtPrice(priceVal, currInfo.sym, currInfo.dec);
                  const audStr = fmtPrice(pkg.priceAud, "A$", 0);
                  const showAudAlso = cc !== "AU" && audStr && priceStr;
                  const status = pkg.groupStatus ?? "active";
                  return (
                    <tr
                      key={pkg.id}
                      className="border-b last:border-0 hover:bg-[#FEF0E3]/40 cursor-pointer transition-colors"
                      onClick={() => setLocation(`${BASE}/admin/packages/${pkg.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{pkg.name}</div>
                      </td>
                      <td className="px-4 py-3">
                        {pkg.groupNameEn ? (
                          <div>
                            <div className="flex items-center gap-1.5">
                              {pkg.groupCountryCode && (
                                <span className="text-base leading-none">
                                  {COUNTRY_FLAG[pkg.groupCountryCode] ?? <Globe className="w-3.5 h-3.5" />}
                                </span>
                              )}
                              <span className="text-sm font-medium text-[#F5821F]">{pkg.groupNameEn}</span>
                            </div>
                            {pkg.groupNameKo && (
                              <div className="text-[11px] text-muted-foreground mt-0.5 pl-5">{pkg.groupNameKo}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {pkg.adults != null ? (
                          <span className="inline-flex items-center gap-1 text-blue-600 font-medium text-sm">
                            <Users className="w-3 h-3" /> {pkg.adults}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {pkg.children != null ? (
                          <span className="inline-flex items-center gap-1 text-green-600 font-medium text-sm">
                            <GraduationCap className="w-3 h-3" /> {pkg.children}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {priceStr ? (
                          <div>
                            <div className="font-semibold text-foreground">{priceStr}</div>
                            {showAudAlso && (
                              <div className="text-[11px] text-muted-foreground">{audStr}</div>
                            )}
                          </div>
                        ) : audStr ? (
                          <span className="font-semibold text-foreground">{audStr}</span>
                        ) : (
                          <span className="text-muted-foreground/40 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium",
                          status === "active"
                            ? "bg-green-50 text-green-700"
                            : status === "archived"
                            ? "bg-red-50 text-red-700"
                            : "bg-amber-50 text-amber-700"
                        )}>
                          {status === "active"
                            ? <CheckCircle2 className="w-2.5 h-2.5" />
                            : <Clock className="w-2.5 h-2.5" />}
                          {status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <ListPagination page={page} pageSize={PAGE_SIZE} total={total} onChange={p => setPage(p)} />
      </div>

      {/* ── Add Package Dialog ──────────────────────────────────────── */}
      <Dialog open={showAdd} onOpenChange={o => { if (!o) { setShowAdd(false); setFormError(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackageIcon className="w-4 h-4 text-[#F5821F]" />
              Add New Package
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-1">
            {/* Package Group */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Package Group <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.packageGroupId}
                onValueChange={v => setForm(f => ({ ...f, packageGroupId: v }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select a package group…" />
                </SelectTrigger>
                <SelectContent className="max-h-56 overflow-y-auto">
                  {groups.map(g => (
                    <SelectItem key={g.id} value={g.id}>
                      <span className="flex items-center gap-2">
                        <span>{g.countryCode ? (COUNTRY_FLAG[g.countryCode] ?? "🌐") : "🌐"}</span>
                        <span>{g.nameEn}</span>
                        {g.nameKo && <span className="text-muted-foreground text-xs">· {g.nameKo}</span>}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Package Name */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Package Name <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="e.g. 2-Week Language Camp"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="h-9"
              />
            </div>

            {/* Duration Days */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Duration (Days) <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                min={1}
                placeholder="7"
                value={form.durationDays}
                onChange={e => setForm(f => ({ ...f, durationDays: e.target.value }))}
                className="h-9"
              />
            </div>

            {/* Adults / Children row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-blue-500" /> Adults
                </Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="—"
                  value={form.maxAdults}
                  onChange={e => setForm(f => ({ ...f, maxAdults: e.target.value }))}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5 text-green-500" /> Children
                </Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="—"
                  value={form.maxStudents}
                  onChange={e => setForm(f => ({ ...f, maxStudents: e.target.value }))}
                  className="h-9"
                />
              </div>
            </div>

            {/* Price AUD */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Price (AUD)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">A$</span>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  placeholder="0.00"
                  value={form.priceAud}
                  onChange={e => setForm(f => ({ ...f, priceAud: e.target.value }))}
                  className="h-9 pl-9 font-mono"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">Additional currency prices can be set in Package Detail.</p>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formError && (
              <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{formError}</p>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-1 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setShowAdd(false); setFormError(null); }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-[#F5821F] hover:bg-[#d97706] text-white min-w-[100px]"
                onClick={handleCreate}
                disabled={createPkg.isPending}
              >
                {createPkg.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Package"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
