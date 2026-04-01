import { useState } from "react";
import { formatDate, formatDateTime } from "@/lib/date-format";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { DetailPageLayout, DetailSection, DetailRow, EditableField } from "@/components/shared/DetailPageLayout";
import { SystemInfoSection } from "@/components/shared/SystemInfoSection";
import { useDetailEdit } from "@/hooks/useDetailEdit";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { TrendingUp, TrendingDown, Minus, Pencil, Plus, Package } from "lucide-react";
import EntityDocumentsTab from "@/components/shared/EntityDocumentsTab";
import ProductDrawer from "@/components/shared/ProductDrawer";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const ALL_ROLES = [
  "super_admin", "admin", "finance", "admission", "team_manager",
  "consultant", "camp_coordinator",
];
const ALL_STATUSES = ["active", "inactive", "suspended", "pending_verification"];
const ADMIN_ROLES = ["super_admin", "admin"];

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-purple-100 text-purple-700",
  admin: "bg-blue-100 text-blue-700",
  camp_coordinator: "bg-orange-100 text-orange-700",
  finance: "bg-emerald-100 text-emerald-700",
  admission: "bg-purple-100 text-purple-700",
  team_manager: "bg-blue-100 text-blue-700",
  consultant: "bg-teal-100 text-teal-700",
};

const ENTRY_TYPE_COLORS: Record<string, string> = {
  debit: "text-red-600 bg-red-50",
  credit: "text-green-600 bg-green-50",
  reversal: "text-gray-600 bg-gray-50",
};

function fmt(amount?: number | string | null) {
  if (amount == null) return "—";
  return `A$${Number(amount).toLocaleString("en-AU", { minimumFractionDigits: 2 })}`;
}

export default function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [tab, setTab] = useState("account");
  const [productDrawerOpen, setProductDrawerOpen] = useState(false);
  const [editProductId, setEditProductId] = useState<string | null>(null);
  const [createProductMode, setCreateProductMode] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["user-detail", id],
    queryFn: () => axios.get(`${BASE}/api/users/${id}`).then(r => r.data),
  });

  const { data: balanceData } = useQuery({
    queryKey: ["ledger-balance", id],
    queryFn: () => axios.get(`${BASE}/api/ledger/balance/${id}`).then(r => r.data),
    enabled: !!id && tab === "ledger",
  });

  const { data: entriesData, isLoading: entriesLoading } = useQuery({
    queryKey: ["ledger-entries", id],
    queryFn: () => axios.get(`${BASE}/api/ledger/account/${id}`).then(r => r.data),
    enabled: !!id && tab === "ledger",
  });

  const { data: userProductsData, isLoading: userProductsLoading } = useQuery({
    queryKey: ["user-products", id],
    queryFn: () => axios.get(`${BASE}/api/users/${id}/products`).then(r => r.data),
    enabled: !!id && tab === "products",
  });
  const userProducts: any[] = userProductsData ?? [];

  const { data: teamsData } = useQuery({
    queryKey: ["teams-for-user-select"],
    queryFn: () => axios.get(`${BASE}/api/teams`).then(r => r.data?.data ?? []),
    enabled: ADMIN_ROLES.includes(currentUser?.role ?? ""),
  });
  const teamList: { id: string; name: string }[] = teamsData ?? [];

  const userRec = data?.data ?? data;
  const canEdit = ADMIN_ROLES.includes(currentUser?.role ?? "");
  const userTeamName = teamList.find(t => t.id === userRec?.teamId)?.name ?? null;

  const balance = balanceData?.data;
  const entries: any[] = entriesData?.data ?? [];

  const updateUser = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      axios.put(`${BASE}/api/users/${id}`, payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-detail", id] });
      qc.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "User updated" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to update" }),
  });

  const { isEditing, isSaving, startEdit, cancelEdit, setField, saveEdit, getValue } = useDetailEdit({
    initialData: userRec ?? {},
    onSave: async (data) => { await updateUser.mutateAsync(data); },
  });

  if (isLoading) return <div className="p-6 space-y-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>;
  if (!userRec) return <div className="p-6 text-muted-foreground">User not found.</div>;

  const initials = (userRec.fullName ?? userRec.email ?? "?").split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
  const roleColor = ROLE_COLORS[userRec.role ?? ""] ?? "bg-gray-100 text-gray-600";

  return (
    <DetailPageLayout
      title={userRec.fullName ?? userRec.email}
      subtitle={userRec.email}
      badge={<span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleColor}`}>{(userRec.role ?? "—").replace(/_/g, " ")}</span>}
      backPath="/admin/users"
      backLabel="Users"
      headerExtra={
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-[#F5821F]/10 text-[#F5821F] text-xs font-bold">{initials}</AvatarFallback>
        </Avatar>
      }
      canEdit={canEdit && tab === "account"}
      isEditing={isEditing}
      isSaving={isSaving}
      onEdit={startEdit}
      onSave={saveEdit}
      onCancel={cancelEdit}
    >
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="ledger">Ledger</TabsTrigger>
          {ADMIN_ROLES.includes(currentUser?.role ?? "") && (
            <TabsTrigger value="documents">Documents</TabsTrigger>
          )}
          {PARTNER_PRODUCT_ROLES.includes(userRec?.role ?? "") &&
            (ADMIN_ROLES.includes(currentUser?.role ?? "") || currentUser?.id === id) && (
            <TabsTrigger value="products">My Products</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="account">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <DetailSection title="Account">
              <EditableField label="Full Name" isEditing={isEditing} value={userRec.fullName}
                editValue={getValue("fullName")} onEdit={v => setField("fullName", v)} />
              <DetailRow label="Email" value={userRec.email} />
              <EditableField label="Role" isEditing={isEditing} value={(userRec.role ?? "").replace(/_/g, " ")}
                editChildren={
                  <Select value={getValue("role")} onValueChange={v => setField("role", v)}>
                    <SelectTrigger className="h-8 text-sm border-[#F5821F]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ALL_ROLES.filter(r => r !== "super_admin" || currentUser?.role === "super_admin")
                        .map(r => <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                } />
              <EditableField label="Status" isEditing={isEditing} value={(userRec.status ?? "").replace(/_/g, " ")}
                editChildren={
                  <Select value={getValue("status")} onValueChange={v => setField("status", v)}>
                    <SelectTrigger className="h-8 text-sm border-[#F5821F]"><SelectValue /></SelectTrigger>
                    <SelectContent>{ALL_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                  </Select>
                } />
              <EditableField label="Team" isEditing={isEditing && canEdit} value={userTeamName ?? "—"}
                editChildren={
                  <Select value={getValue("teamId") ?? "none"} onValueChange={v => setField("teamId", v === "none" ? null : v)}>
                    <SelectTrigger className="h-8 text-sm border-[#F5821F]"><SelectValue placeholder="No team" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No team</SelectItem>
                      {teamList.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                } />
              <DetailRow label="Created" value={userRec.createdAt ? formatDate(userRec.createdAt) : "—"} />
              <DetailRow label="Last Login" value={userRec.lastLoginAt ? formatDateTime(userRec.lastLoginAt) : "—"} />
            </DetailSection>

            <DetailSection title="Profile">
              <EditableField label="Phone" isEditing={isEditing} value={userRec.phone}
                editValue={getValue("phone")} onEdit={v => setField("phone", v)} />
              <EditableField label="Country" isEditing={isEditing} value={userRec.country}
                editValue={getValue("country")} onEdit={v => setField("country", v)} />
              <EditableField label="Language" isEditing={isEditing} value={userRec.preferredLanguage}
                editValue={getValue("preferredLanguage")} onEdit={v => setField("preferredLanguage", v)} />
              <DetailRow label="2FA Enabled" value={userRec.twoFactorEnabled ? "Yes" : "No"} />
            </DetailSection>

            {(userRec.role === "camp_coordinator" || userRec.role === "consultant") && (
              <DetailSection title="Business Info" className="lg:col-span-2">
                <EditableField label="Company Name" isEditing={isEditing} value={userRec.companyName}
                  editValue={getValue("companyName")} onEdit={v => setField("companyName", v)} />
                <EditableField label="Business Reg #" isEditing={isEditing} value={userRec.businessRegNo}
                  editValue={getValue("businessRegNo")} onEdit={v => setField("businessRegNo", v)} />
                <EditableField label="Country of Ops" isEditing={isEditing} value={userRec.countryOfOps}
                  editValue={getValue("countryOfOps")} onEdit={v => setField("countryOfOps", v)} />
                {userRec.role === "camp_coordinator" && (
                  <EditableField label="Platform Commission %" isEditing={isEditing} value={userRec.platformCommRate}
                    editValue={getValue("platformCommRate")} onEdit={v => setField("platformCommRate", v)} type="number" />
                )}
              </DetailSection>
            )}
            <div className="lg:col-span-2">
              <SystemInfoSection owner={userRec.id ?? null} createdAt={userRec.createdAt} updatedAt={userRec.updatedAt} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="ledger">
          <div className="space-y-4">
            {/* Balance Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="text-xs text-muted-foreground font-medium">Total Credits</span>
                </div>
                <div className="text-sm font-bold font-mono text-green-600">
                  {balance ? fmt(balance.totalCredits) : <Skeleton className="h-5 w-20" />}
                </div>
              </div>
              <div className="bg-white border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown className="w-4 h-4 text-red-500" />
                  <span className="text-xs text-muted-foreground font-medium">Total Debits</span>
                </div>
                <div className="text-sm font-bold font-mono text-red-600">
                  {balance ? fmt(balance.totalDebits) : <Skeleton className="h-5 w-20" />}
                </div>
              </div>
              <div className="bg-white border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Minus className="w-4 h-4 text-[#F5821F]" />
                  <span className="text-xs text-muted-foreground font-medium">Net Balance</span>
                </div>
                <div className={`text-sm font-bold font-mono ${balance && balance.netBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {balance ? fmt(balance.netBalance) : <Skeleton className="h-5 w-20" />}
                </div>
              </div>
            </div>

            {/* Ledger Entries */}
            <div className="bg-white border rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b bg-muted/20">
                <span className="text-sm font-semibold text-foreground">Ledger Entries</span>
              </div>
              {entriesLoading ? (
                <div className="p-4 space-y-2">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : entries.length === 0 ? (
                <div className="text-center py-10 text-sm text-muted-foreground">
                  No ledger entries for this account.
                </div>
              ) : (
                <div className="divide-y">
                  {entries.map((entry: any) => (
                    <div key={entry.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[#FEF0E3] text-sm">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase min-w-[52px] text-center ${ENTRY_TYPE_COLORS[entry.entryType] ?? "bg-gray-50 text-gray-600"}`}>
                        {entry.entryType}
                      </span>
                      <span className="font-mono font-semibold min-w-[90px]">{fmt(entry.amount)}</span>
                      <span className="text-muted-foreground truncate flex-1">{entry.description ?? entry.sourceType}</span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {entry.entryDate ? format(new Date(entry.entryDate), "d MMM yyyy") : "—"}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${
                        entry.status === "confirmed" ? "bg-green-100 text-green-700" :
                        entry.status === "pending" ? "bg-orange-100 text-orange-700" :
                        "bg-gray-100 text-gray-500"
                      }`}>
                        {entry.status ?? "—"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {ADMIN_ROLES.includes(currentUser?.role ?? "") && (
          <TabsContent value="documents">
            <EntityDocumentsTab
              entityType="user"
              entityId={id!}
              mode="full"
            />
          </TabsContent>
        )}

        {/* My Products Tab (PART 4) */}
        {PARTNER_PRODUCT_ROLES.includes(userRec?.role ?? "") &&
          (ADMIN_ROLES.includes(currentUser?.role ?? "") || currentUser?.id === id) && (
          <TabsContent value="products">
            {(() => {
              const canEditProducts = ADMIN_ROLES.includes(currentUser?.role ?? "") || currentUser?.id === id;
              const TYPE_BADGE: Record<string, string> = {
                institute:  "bg-blue-50 text-blue-700",
                hotel:      "bg-purple-50 text-purple-700",
                pickup:     "bg-orange-50 text-orange-700",
                tour:       "bg-green-50 text-green-700",
                settlement: "bg-neutral-100 text-neutral-600",
                program:    "bg-sky-50 text-sky-700",
              };

              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">이 Service Provider가 제공하는 상품 목록입니다.</p>
                    {canEditProducts && (
                      <Button size="sm" className="gap-1.5 bg-[#F5821F] hover:bg-[#d97706] text-white"
                        onClick={() => { setCreateProductMode(true); setEditProductId(null); setProductDrawerOpen(true); }}>
                        <Plus className="w-3.5 h-3.5" /> Add Product
                      </Button>
                    )}
                  </div>

                  <div className="bg-card rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-neutral-50">
                          <th className="px-4 py-2.5 text-left text-xs font-medium text-neutral-500 uppercase">Product Name</th>
                          <th className="px-4 py-2.5 text-left text-xs font-medium text-neutral-500 uppercase">Type</th>
                          <th className="px-4 py-2.5 text-left text-xs font-medium text-neutral-500 uppercase">Linked Groups</th>
                          <th className="px-4 py-2.5 text-right text-xs font-medium text-neutral-500 uppercase">Cost</th>
                          <th className="px-4 py-2.5 text-left text-xs font-medium text-neutral-500 uppercase">Status</th>
                          {canEditProducts && <th className="px-4 py-2.5 w-16" />}
                        </tr>
                      </thead>
                      <tbody>
                        {userProductsLoading ? (
                          [...Array(3)].map((_, i) => (
                            <tr key={i} className="border-b">
                              {[...Array(5)].map((_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4" /></td>)}
                            </tr>
                          ))
                        ) : userProducts.length === 0 ? (
                          <tr>
                            <td colSpan={canEditProducts ? 6 : 5} className="px-4 py-16 text-center">
                              <Package className="w-8 h-8 mx-auto mb-3 text-muted-foreground opacity-30" />
                              <p className="text-sm text-muted-foreground mb-3">등록된 상품이 없습니다.</p>
                              {canEditProducts && (
                                <Button size="sm" className="gap-1.5 bg-[#F5821F] hover:bg-[#d97706] text-white"
                                  onClick={() => { setCreateProductMode(true); setEditProductId(null); setProductDrawerOpen(true); }}>
                                  <Plus className="w-3.5 h-3.5" /> 첫 번째 상품 등록하기
                                </Button>
                              )}
                            </td>
                          </tr>
                        ) : (
                          userProducts.map((row: any) => {
                            const p = row.product ?? row;
                            const linkedNames: string[] = [];

                            return (
                              <tr key={p.id} className="border-b hover:bg-[#FEF0E3] h-12">
                                <td className="px-4 py-2 font-medium">{p.productName}</td>
                                <td className="px-4 py-2">
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE[p.productType] ?? "bg-gray-100 text-gray-600"}`}>
                                    {p.productType}
                                  </span>
                                </td>
                                <td className="px-4 py-2">
                                  {row.linkCount > 0 ? (
                                    <TooltipProvider delayDuration={200}>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#FEF0E3] text-[#F5821F] border border-[#F5821F33] cursor-default">
                                            {row.linkCount} group{row.linkCount !== 1 ? "s" : ""}
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">Linked to {row.linkCount} package group(s)</TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-2 text-right font-mono text-sm">
                                  {p.cost ? `${p.currency ?? "AUD"} ${Number(p.cost).toLocaleString("en-AU", { minimumFractionDigits: 2 })}` : "—"}
                                </td>
                                <td className="px-4 py-2">
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                    p.status === "active" ? "bg-green-100 text-green-700" :
                                    p.status === "inactive" ? "bg-gray-100 text-gray-600" :
                                    "bg-red-100 text-red-700"
                                  }`}>{p.status}</span>
                                </td>
                                {canEditProducts && (
                                  <td className="px-4 py-2">
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                                      onClick={() => { setCreateProductMode(false); setEditProductId(p.id); setProductDrawerOpen(true); }}>
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                  </td>
                                )}
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </TabsContent>
        )}
      </Tabs>

      {/* ProductDrawer for My Products tab */}
      <ProductDrawer
        open={productDrawerOpen}
        onClose={() => { setProductDrawerOpen(false); setEditProductId(null); setCreateProductMode(false); }}
        productId={createProductMode ? null : editProductId}
        lockedProviderId={createProductMode ? id : undefined}
        canEdit={ADMIN_ROLES.includes(currentUser?.role ?? "") || currentUser?.id === id}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["user-products", id] });
          if (createProductMode) { setCreateProductMode(false); setProductDrawerOpen(false); }
        }}
      />
    </DetailPageLayout>
  );
}
