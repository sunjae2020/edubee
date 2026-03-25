import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Pencil, Plus, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { SortableTh, useSortState, useSorted } from "@/components/ui/sortable-th";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface CoaRow {
  id: string;
  code: string;
  name: string;
  accountType: string;
  description?: string | null;
  parentCode?: string | null;
  isActive: boolean;
  createdOn: string;
  modifiedOn: string;
}

const TABS: Array<{ label: string; type: string; prefix: string; badge: string }> = [
  { label: "Assets",        type: "asset",     prefix: "1xxx", badge: "#DCFCE7" },
  { label: "Liabilities",   type: "liability", prefix: "2xxx", badge: "#FEF9C3" },
  { label: "Revenue",       type: "revenue",   prefix: "3xxx", badge: "#FEF0E3" },
  { label: "Cost of Sales", type: "cogs",      prefix: "4xxx", badge: "#FEF2F2" },
  { label: "Expenses",      type: "expense",   prefix: "5xxx", badge: "#F4F3F1" },
];

function codeBadgeColor(code: string): string {
  if (code.startsWith("1")) return "#DCFCE7";
  if (code.startsWith("2")) return "#FEF9C3";
  if (code.startsWith("3")) return "#FEF0E3";
  if (code.startsWith("4")) return "#FEF2F2";
  return "#F4F3F1";
}
function codeTextColor(code: string): string {
  if (code.startsWith("1")) return "#16A34A";
  if (code.startsWith("2")) return "#CA8A04";
  if (code.startsWith("3")) return "#F5821F";
  if (code.startsWith("4")) return "#DC2626";
  return "#57534E";
}

interface EditSheetProps {
  account: CoaRow | null;
  onClose: () => void;
  isNew?: boolean;
  isSuperAdmin: boolean;
}

function EditSheet({ account, onClose, isNew, isSuperAdmin }: EditSheetProps) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [code,        setCode]        = useState(account?.code        ?? "");
  const [name,        setName]        = useState(account?.name        ?? "");
  const [accountType, setAccountType] = useState(account?.accountType ?? "asset");
  const [description, setDescription] = useState(account?.description ?? "");
  const [isActive,    setIsActive]    = useState(account?.isActive    ?? true);

  const saveMutation = useMutation({
    mutationFn: () => isNew
      ? axios.post(`${BASE}/api/accounting/coa`, { code, name, accountType, description }).then(r => r.data)
      : axios.put(`${BASE}/api/accounting/coa/${account!.code}`, { name, accountType, description, isActive }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coa"] });
      toast({ title: isNew ? "Account created" : "Account updated" });
      onClose();
    },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white shadow-2xl flex flex-col h-full">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200">
          <h3 className="text-base font-bold text-stone-800">{isNew ? "New Account" : `Edit ${account?.code}`}</h3>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-stone-100">
            <X size={16} className="text-stone-400" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {isNew && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-stone-600">Account Code</Label>
              <Input value={code} onChange={e => setCode(e.target.value)}
                className="h-9 text-sm font-mono" placeholder="e.g. 1500" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-stone-600">Account Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-stone-600">Account Type</Label>
            <Select value={accountType} onValueChange={setAccountType}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="asset">Asset</SelectItem>
                <SelectItem value="liability">Liability</SelectItem>
                <SelectItem value="revenue">Revenue</SelectItem>
                <SelectItem value="cogs">Cost of Sales</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-stone-600">Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)}
              className="text-sm min-h-[80px] resize-none" />
          </div>
          {!isNew && (
            <div className="flex items-center gap-2">
              <input type="checkbox" id="is-active" checked={isActive}
                onChange={e => setIsActive(e.target.checked)} className="rounded" />
              <label htmlFor="is-active" className="text-sm text-stone-600">Active</label>
            </div>
          )}
        </div>
        <div className="px-5 py-4 border-t border-stone-200">
          {isSuperAdmin ? (
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="w-full text-white"
              style={{ background: "#F5821F" }}
            >
              {saveMutation.isPending ? "Saving…" : "Save Changes"}
            </Button>
          ) : (
            <p className="text-xs text-center text-stone-400">Super Admin access required to edit</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ChartOfAccountsPage() {
  const [activeTab, setActiveTab] = useState("asset");
  const { sortBy, sortDir, onSort } = useSortState();
  const [editAccount, setEditAccount] = useState<CoaRow | null>(null);
  const [showNew, setShowNew] = useState(false);

  // Determine role (assume super_admin for now — wire to auth context if available)
  const isSuperAdmin = true;

  const { data, isLoading } = useQuery({
    queryKey: ["coa"],
    queryFn: () => axios.get(`${BASE}/api/accounting/coa`).then(r => r.data),
  });

  const allRows: CoaRow[] = data?.data ?? [];
  const filtered = allRows.filter(r => r.accountType === activeTab);
  const sorted = useSorted(filtered, sortBy, sortDir);
  const currentTab = TABS.find(t => t.type === activeTab)!;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-800">Chart of Accounts</h1>
          <p className="text-sm text-stone-500 mt-1">
            {allRows.length} accounts across {TABS.length} categories
          </p>
        </div>
        {isSuperAdmin && (
          <Button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 text-white rounded-lg"
            style={{ background: "#F5821F" }}
          >
            <Plus size={16} /> New Account
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-stone-200 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.type}
            onClick={() => setActiveTab(tab.type)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === tab.type
                ? "border-[#F5821F] text-[#F5821F]"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            <span
              className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold"
              style={{ background: tab.badge, color: codeTextColor(tab.prefix) }}
            >
              {tab.prefix}
            </span>
            {tab.label}
            <span className="text-xs text-stone-400 font-normal">
              ({allRows.filter(r => r.accountType === tab.type).length})
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-stone-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 border-b border-stone-200">
            <tr>
              <>
                <SortableTh col="code" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Code</SortableTh>
                <SortableTh col="name" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Account Name</SortableTh>
                <SortableTh col="description" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Description</SortableTh>
                <SortableTh col="isActive" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Active</SortableTh>
                {isSuperAdmin && <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide w-20" />}
              </>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {isLoading && (
              <tr><td colSpan={5} className="text-center py-12 text-stone-400 text-sm">Loading…</td></tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr><td colSpan={5} className="text-center py-12 text-stone-400 text-sm">No accounts in this category</td></tr>
            )}
            {sorted.map(row => (
              <tr key={row.id} className="hover:bg-stone-50 transition-colors">
                <td className="px-4 py-3">
                  <span
                    className="inline-block px-2.5 py-0.5 rounded text-xs font-mono font-bold"
                    style={{
                      background: codeBadgeColor(row.code),
                      color: codeTextColor(row.code),
                    }}
                  >
                    {row.code}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-stone-800">{row.name}</td>
                <td className="px-4 py-3 text-stone-500 text-xs max-w-xs truncate">{row.description ?? "—"}</td>
                <td className="px-4 py-3">
                  {row.isActive ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-green-700">
                      <Check size={12} /> Active
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-stone-400">Inactive</span>
                  )}
                </td>
                {isSuperAdmin && (
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setEditAccount(row)}
                      className="p-1.5 rounded hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors"
                      title="Edit"
                    >
                      <Pencil size={13} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Type summary row */}
      <div className="flex items-center gap-6">
        {TABS.map(tab => {
          const count = allRows.filter(r => r.accountType === tab.type).length;
          const activeCount = allRows.filter(r => r.accountType === tab.type && r.isActive).length;
          return (
            <div key={tab.type} className="flex items-center gap-2 text-xs text-stone-500">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ background: codeTextColor(tab.prefix) }}
              />
              {tab.label}: {activeCount}/{count}
            </div>
          );
        })}
      </div>

      {editAccount && (
        <EditSheet
          account={editAccount}
          onClose={() => setEditAccount(null)}
          isSuperAdmin={isSuperAdmin}
        />
      )}
      {showNew && (
        <EditSheet
          account={null}
          onClose={() => setShowNew(false)}
          isNew
          isSuperAdmin={isSuperAdmin}
        />
      )}
    </div>
  );
}
