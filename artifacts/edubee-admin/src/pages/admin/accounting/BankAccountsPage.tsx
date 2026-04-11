import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Landmark, Star, MoreVertical, Power } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const CURRENCIES = ["AUD", "USD", "EUR", "GBP", "SGD", "JPY", "KRW", "NZD", "CNY", "THB", "HKD"];
const COUNTRIES   = [
  { code: "AU", label: "Australia" }, { code: "US", label: "United States" },
  { code: "GB", label: "United Kingdom" }, { code: "SG", label: "Singapore" },
  { code: "KR", label: "South Korea" }, { code: "JP", label: "Japan" },
  { code: "NZ", label: "New Zealand" }, { code: "HK", label: "Hong Kong" },
];

interface BankAccount {
  id: string;
  organisationId: string | null;
  accountName: string | null;
  bankName: string | null;
  accountNumber: string | null;
  accountHolder: string | null;
  bsb: string | null;
  bankCode: string | null;
  swiftCode: string | null;
  countryCode: string | null;
  defaultCurrency: string | null;
  isPrimary: boolean;
  status: string;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

const EMPTY: Partial<BankAccount> = {
  accountName: "",
  bankName: "",
  accountNumber: "",
  accountHolder: "",
  bsb: "",
  bankCode: "",
  swiftCode: "",
  countryCode: "AU",
  defaultCurrency: "AUD",
  isPrimary: false,
  status: "active",
  notes: "",
};

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-[#78716C]">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

function AccountForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: Partial<BankAccount>;
  onSave: (data: Partial<BankAccount>) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<Partial<BankAccount>>(initial);
  const set = (k: keyof BankAccount, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Account Display Name" required>
          <Input value={form.accountName ?? ""} onChange={e => set("accountName", e.target.value)}
            placeholder="예: ANZ 법인계좌" className="text-sm" />
        </FormField>
        <FormField label="Bank Name" required>
          <Input value={form.bankName ?? ""} onChange={e => set("bankName", e.target.value)}
            placeholder="예: ANZ, NAB, CBA" className="text-sm" />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Account Holder">
          <Input value={form.accountHolder ?? ""} onChange={e => set("accountHolder", e.target.value)}
            placeholder="예금주명" className="text-sm" />
        </FormField>
        <FormField label="Account Number">
          <Input value={form.accountNumber ?? ""} onChange={e => set("accountNumber", e.target.value)}
            placeholder="계좌번호" className="text-sm" />
        </FormField>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <FormField label="BSB">
          <Input value={form.bsb ?? ""} onChange={e => set("bsb", e.target.value)}
            placeholder="xxx-xxx" className="text-sm" />
        </FormField>
        <FormField label="SWIFT / BIC">
          <Input value={form.swiftCode ?? ""} onChange={e => set("swiftCode", e.target.value)}
            placeholder="ANZBAU3M" className="text-sm" />
        </FormField>
        <FormField label="Bank Code">
          <Input value={form.bankCode ?? ""} onChange={e => set("bankCode", e.target.value)}
            placeholder="내부 코드" className="text-sm" />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Country">
          <Select value={form.countryCode ?? "AU"} onValueChange={v => set("countryCode", v)}>
            <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {COUNTRIES.map(c => (
                <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Default Currency">
          <Select value={form.defaultCurrency ?? "AUD"} onValueChange={v => set("defaultCurrency", v)}>
            <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CURRENCIES.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </div>

      <FormField label="Notes">
        <textarea
          value={form.notes ?? ""}
          onChange={e => set("notes", e.target.value)}
          rows={2}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="메모 (선택)"
        />
      </FormField>

      <div className="flex items-center gap-2 pt-1">
        <input
          type="checkbox"
          id="isPrimary"
          checked={form.isPrimary ?? false}
          onChange={e => set("isPrimary", e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-(--e-orange) focus:ring-(--e-orange)"
        />
        <label htmlFor="isPrimary" className="text-sm text-[#57534E] cursor-pointer">
          주거래 계좌로 설정 (기존 주거래 계좌는 자동 해제됩니다)
        </label>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>취소</Button>
        <Button
          size="sm"
          disabled={saving || !form.accountName || !form.bankName}
          onClick={() => onSave(form)}
          className="bg-(--e-orange) hover:bg-[#d97706] text-white"
        >
          {saving ? "저장 중..." : "저장"}
        </Button>
      </div>
    </div>
  );
}

export default function BankAccountsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BankAccount | null>(null);

  const { data: accounts = [], isLoading } = useQuery<BankAccount[]>({
    queryKey: ["bank-accounts"],
    queryFn: () => axios.get(`${BASE}/api/finance/bank-accounts`).then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (d: Partial<BankAccount>) => axios.post(`${BASE}/api/finance/bank-accounts`, d).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bank-accounts"] });
      setModalOpen(false);
      toast({ title: "은행 계좌가 추가됐습니다." });
    },
    onError: () => toast({ title: "저장 실패", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BankAccount> }) =>
      axios.patch(`${BASE}/api/finance/bank-accounts/${id}`, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bank-accounts"] });
      setEditing(null);
      toast({ title: "계좌 정보가 수정됐습니다." });
    },
    onError: () => toast({ title: "저장 실패", variant: "destructive" }),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => axios.delete(`${BASE}/api/finance/bank-accounts/${id}`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bank-accounts"] });
      toast({ title: "계좌가 비활성화됐습니다." });
    },
    onError: () => toast({ title: "처리 실패", variant: "destructive" }),
  });

  const setPrimaryMutation = useMutation({
    mutationFn: (id: string) =>
      axios.patch(`${BASE}/api/finance/bank-accounts/${id}`, { isPrimary: true }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bank-accounts"] });
      toast({ title: "주거래 계좌가 변경됐습니다." });
    },
    onError: () => toast({ title: "처리 실패", variant: "destructive" }),
  });

  const primaryAccount = accounts.find(a => a.isPrimary);
  const otherAccounts  = accounts.filter(a => !a.isPrimary);
  const sorted = primaryAccount ? [primaryAccount, ...otherAccounts] : otherAccounts;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#1C1917]">Bank Accounts</h1>
          <p className="text-sm text-[#78716C] mt-0.5">회사 운영 은행 계좌 관리</p>
        </div>
        <Button
          size="sm"
          onClick={() => setModalOpen(true)}
          className="bg-(--e-orange) hover:bg-[#d97706] text-white gap-1.5"
        >
          <Plus className="h-4 w-4" />
          계좌 추가
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-[#78716C]">
          <Landmark className="h-12 w-12 mb-3 opacity-20" />
          <p className="font-medium">등록된 은행 계좌가 없습니다</p>
          <p className="text-sm mt-1">계좌 추가 버튼을 눌러 첫 계좌를 등록하세요.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(account => (
            <div
              key={account.id}
              className={`rounded-xl border bg-white px-5 py-4 flex items-center gap-4 shadow-sm ${
                account.isPrimary ? "border-(--e-orange) ring-1 ring-(--e-orange)/20" : "border-[#E7E5E4]"
              }`}
            >
              {/* Icon */}
              <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                account.isPrimary ? "bg-(--e-orange)/10" : "bg-[#F4F3F1]"
              }`}>
                <Landmark className={`h-5 w-5 ${account.isPrimary ? "text-(--e-orange)" : "text-[#78716C]"}`} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-[#1C1917] truncate">
                    {account.accountName ?? account.bankName}
                  </span>
                  {account.isPrimary && (
                    <Badge className="bg-(--e-orange)/10 text-(--e-orange) border-0 text-[10px] px-1.5 py-0 gap-1">
                      <Star className="h-2.5 w-2.5" />주거래
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-[#78716C]">
                    {account.defaultCurrency ?? "AUD"}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                  <span className="text-xs text-[#78716C]">{account.bankName}</span>
                  {account.bsb && (
                    <span className="text-xs text-[#78716C]">BSB: {account.bsb}</span>
                  )}
                  {account.accountNumber && (
                    <span className="text-xs text-[#78716C]">계좌: {account.accountNumber}</span>
                  )}
                  {account.accountHolder && (
                    <span className="text-xs text-[#78716C]">예금주: {account.accountHolder}</span>
                  )}
                  {account.swiftCode && (
                    <span className="text-xs text-[#78716C]">SWIFT: {account.swiftCode}</span>
                  )}
                </div>
                {account.notes && (
                  <p className="text-xs text-[#A8A29E] mt-1 truncate">{account.notes}</p>
                )}
              </div>

              {/* Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                    <MoreVertical className="h-4 w-4 text-[#78716C]" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="text-sm">
                  <DropdownMenuItem onClick={() => setEditing(account)} className="gap-2">
                    <Pencil className="h-3.5 w-3.5" />수정
                  </DropdownMenuItem>
                  {!account.isPrimary && (
                    <DropdownMenuItem
                      onClick={() => setPrimaryMutation.mutate(account.id)}
                      className="gap-2"
                    >
                      <Star className="h-3.5 w-3.5" />주거래 계좌로 설정
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => deactivateMutation.mutate(account.id)}
                    className="gap-2 text-red-600 focus:text-red-600"
                  >
                    <Power className="h-3.5 w-3.5" />비활성화
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>은행 계좌 추가</DialogTitle>
          </DialogHeader>
          <AccountForm
            initial={EMPTY}
            saving={createMutation.isPending}
            onSave={d => createMutation.mutate(d)}
            onCancel={() => setModalOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!editing} onOpenChange={open => !open && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>계좌 수정</DialogTitle>
          </DialogHeader>
          {editing && (
            <AccountForm
              initial={editing}
              saving={updateMutation.isPending}
              onSave={d => updateMutation.mutate({ id: editing.id, data: d })}
              onCancel={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
