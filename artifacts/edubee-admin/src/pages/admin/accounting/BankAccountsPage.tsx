import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SortableTh, useSortState, useSorted } from "@/components/ui/sortable-th";
import {
  Plus, Landmark, Star, MoreVertical, Pencil, Power, CheckCircle2,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const CURRENCIES = ["AUD", "USD", "EUR", "GBP", "SGD", "JPY", "KRW", "NZD", "CNY", "THB", "HKD"];
const COUNTRIES = [
  { code: "AU", label: "호주" },
  { code: "US", label: "미국" },
  { code: "GB", label: "영국" },
  { code: "SG", label: "싱가포르" },
  { code: "KR", label: "대한민국" },
  { code: "JP", label: "일본" },
  { code: "NZ", label: "뉴질랜드" },
  { code: "HK", label: "홍콩" },
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

const EMPTY_FORM: Partial<BankAccount> = {
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
  notes: "",
};

// ── 폼 필드 래퍼 ─────────────────────────────────────────────────────────────
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-stone-500">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

// ── 계좌 추가 / 수정 폼 ────────────────────────────────────────────────────────
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
    <div className="space-y-4 pt-1">
      <div className="grid grid-cols-2 gap-3">
        <Field label="계좌 표시명" required>
          <Input
            value={form.accountName ?? ""}
            onChange={e => set("accountName", e.target.value)}
            placeholder="예: ANZ 법인계좌"
            className="text-sm"
          />
        </Field>
        <Field label="은행명" required>
          <Input
            value={form.bankName ?? ""}
            onChange={e => set("bankName", e.target.value)}
            placeholder="예: ANZ, NAB, CBA"
            className="text-sm"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="예금주">
          <Input
            value={form.accountHolder ?? ""}
            onChange={e => set("accountHolder", e.target.value)}
            placeholder="예금주명"
            className="text-sm"
          />
        </Field>
        <Field label="계좌번호">
          <Input
            value={form.accountNumber ?? ""}
            onChange={e => set("accountNumber", e.target.value)}
            placeholder="계좌번호"
            className="text-sm"
          />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label="BSB">
          <Input
            value={form.bsb ?? ""}
            onChange={e => set("bsb", e.target.value)}
            placeholder="xxx-xxx"
            className="text-sm"
          />
        </Field>
        <Field label="SWIFT / BIC">
          <Input
            value={form.swiftCode ?? ""}
            onChange={e => set("swiftCode", e.target.value)}
            placeholder="ANZBAU3M"
            className="text-sm"
          />
        </Field>
        <Field label="은행 코드">
          <Input
            value={form.bankCode ?? ""}
            onChange={e => set("bankCode", e.target.value)}
            placeholder="내부 코드"
            className="text-sm"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="국가">
          <Select value={form.countryCode ?? "AU"} onValueChange={v => set("countryCode", v)}>
            <SelectTrigger className="text-sm h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {COUNTRIES.map(c => (
                <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="기본 통화">
          <Select value={form.defaultCurrency ?? "AUD"} onValueChange={v => set("defaultCurrency", v)}>
            <SelectTrigger className="text-sm h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CURRENCIES.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field label="메모">
        <textarea
          value={form.notes ?? ""}
          onChange={e => set("notes", e.target.value)}
          rows={2}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="추가 메모 (선택)"
        />
      </Field>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isPrimary"
          checked={form.isPrimary ?? false}
          onChange={e => set("isPrimary", e.target.checked)}
          className="h-4 w-4 rounded border-stone-300"
        />
        <label htmlFor="isPrimary" className="text-sm text-stone-600 cursor-pointer">
          주거래 계좌로 설정 (기존 주거래 계좌는 자동 해제)
        </label>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>
          취소
        </Button>
        <Button
          size="sm"
          disabled={saving || !form.accountName?.trim() || !form.bankName?.trim()}
          onClick={() => onSave(form)}
          style={{ background: "var(--e-orange)" }}
          className="text-white hover:opacity-90"
        >
          {saving ? "저장 중..." : "저장"}
        </Button>
      </div>
    </div>
  );
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────
export default function BankAccountsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<BankAccount | null>(null);
  const { sortBy, sortDir, onSort } = useSortState("accountName", "asc");

  const { data: accounts = [], isLoading } = useQuery<BankAccount[]>({
    queryKey: ["bank-accounts"],
    queryFn: () => axios.get(`${BASE}/api/finance/bank-accounts`).then(r => r.data),
  });

  const sorted = useSorted(accounts, sortBy, sortDir);

  const createMutation = useMutation({
    mutationFn: (d: Partial<BankAccount>) =>
      axios.post(`${BASE}/api/finance/bank-accounts`, d).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bank-accounts"] });
      setAddOpen(false);
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

  const setPrimaryMutation = useMutation({
    mutationFn: (id: string) =>
      axios.patch(`${BASE}/api/finance/bank-accounts/${id}`, { isPrimary: true }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bank-accounts"] });
      toast({ title: "주거래 계좌가 변경됐습니다." });
    },
    onError: () => toast({ title: "처리 실패", variant: "destructive" }),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) =>
      axios.delete(`${BASE}/api/finance/bank-accounts/${id}`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bank-accounts"] });
      toast({ title: "계좌가 비활성화됐습니다." });
    },
    onError: () => toast({ title: "처리 실패", variant: "destructive" }),
  });

  const primaryCount = accounts.filter(a => a.isPrimary).length;

  return (
    <div className="p-6 space-y-6">

      {/* ── 페이지 헤더 ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-800">은행 계좌</h1>
          <p className="text-sm text-stone-500 mt-1">
            회사 운영 은행 계좌 관리 — AR/AP Tracker, 거래, 인보이스에 사용
          </p>
        </div>
        <div className="flex items-center gap-2">
          {primaryCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-medium"
              style={{ background: "#DCFCE7", borderColor: "#BBF7D0", color: "#16A34A" }}>
              <CheckCircle2 size={14} />
              주거래 설정됨
            </div>
          )}
          <Button
            size="sm"
            onClick={() => setAddOpen(true)}
            style={{ background: "var(--e-orange)" }}
            className="text-white hover:opacity-90 gap-1.5"
          >
            <Plus className="h-4 w-4" />
            계좌 추가
          </Button>
        </div>
      </div>

      {/* ── 테이블 ──────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-stone-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-200">
              <SortableTh col="isPrimary" sortBy={sortBy} sortDir={sortDir} onSort={onSort}
                className="text-center px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide w-16">
                주거래
              </SortableTh>
              <SortableTh col="accountName" sortBy={sortBy} sortDir={sortDir} onSort={onSort}
                className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                계좌명
              </SortableTh>
              <SortableTh col="bankName" sortBy={sortBy} sortDir={sortDir} onSort={onSort}
                className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                은행
              </SortableTh>
              <SortableTh col="accountHolder" sortBy={sortBy} sortDir={sortDir} onSort={onSort}
                className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                예금주
              </SortableTh>
              <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                BSB
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                계좌번호
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                SWIFT
              </th>
              <SortableTh col="defaultCurrency" sortBy={sortBy} sortDir={sortDir} onSort={onSort}
                className="text-center px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide w-20">
                통화
              </SortableTh>
              <th className="text-center px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide w-14">
                관리
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {isLoading ? (
              <tr>
                <td colSpan={9} className="text-center py-16 text-stone-400 text-sm">
                  불러오는 중…
                </td>
              </tr>
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-16">
                  <div className="flex flex-col items-center gap-3 text-stone-400">
                    <Landmark size={36} strokeWidth={1.2} />
                    <p className="text-sm font-medium">등록된 은행 계좌가 없습니다</p>
                    <button
                      onClick={() => setAddOpen(true)}
                      className="text-xs hover:underline"
                      style={{ color: "var(--e-orange)" }}
                    >
                      첫 계좌 추가하기 →
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              sorted.map(account => (
                <tr
                  key={account.id}
                  className="hover:bg-orange-50 transition-colors"
                >
                  {/* 주거래 */}
                  <td className="px-4 py-3 text-center">
                    {account.isPrimary && (
                      <span className="inline-flex items-center justify-center">
                        <Star
                          size={16}
                          fill="var(--e-orange)"
                          style={{ color: "var(--e-orange)" }}
                        />
                      </span>
                    )}
                  </td>

                  {/* 계좌명 */}
                  <td className="px-4 py-3">
                    <span className="font-semibold text-stone-800">
                      {account.accountName ?? "—"}
                    </span>
                    {account.notes && (
                      <p className="text-xs text-stone-400 truncate max-w-[180px] mt-0.5">
                        {account.notes}
                      </p>
                    )}
                  </td>

                  {/* 은행 */}
                  <td className="px-4 py-3 text-stone-700">
                    {account.bankName ?? "—"}
                  </td>

                  {/* 예금주 */}
                  <td className="px-4 py-3 text-stone-600">
                    {account.accountHolder ?? <span className="text-stone-300">—</span>}
                  </td>

                  {/* BSB */}
                  <td className="px-4 py-3 font-mono text-stone-600 text-xs">
                    {account.bsb ?? <span className="text-stone-300">—</span>}
                  </td>

                  {/* 계좌번호 */}
                  <td className="px-4 py-3 font-mono text-stone-600 text-xs">
                    {account.accountNumber ?? <span className="text-stone-300">—</span>}
                  </td>

                  {/* SWIFT */}
                  <td className="px-4 py-3 font-mono text-stone-500 text-xs">
                    {account.swiftCode ?? <span className="text-stone-300">—</span>}
                  </td>

                  {/* 통화 */}
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-stone-100 text-stone-600">
                      {account.defaultCurrency ?? "AUD"}
                    </span>
                  </td>

                  {/* 관리 */}
                  <td className="px-4 py-3 text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="inline-flex items-center justify-center w-7 h-7 rounded-lg hover:bg-stone-100 transition-colors">
                          <MoreVertical size={14} className="text-stone-400" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="text-sm">
                        <DropdownMenuItem
                          onClick={() => setEditing(account)}
                          className="gap-2 cursor-pointer"
                        >
                          <Pencil size={13} /> 수정
                        </DropdownMenuItem>
                        {!account.isPrimary && (
                          <DropdownMenuItem
                            onClick={() => setPrimaryMutation.mutate(account.id)}
                            className="gap-2 cursor-pointer"
                          >
                            <Star size={13} /> 주거래 계좌로 설정
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => deactivateMutation.mutate(account.id)}
                          className="gap-2 cursor-pointer text-red-600 focus:text-red-600"
                        >
                          <Power size={13} /> 비활성화
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* 테이블 푸터 */}
        {sorted.length > 0 && (
          <div className="px-4 py-3 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
            <span className="text-xs text-stone-500">
              총 {sorted.length}개 계좌
            </span>
            {primaryCount === 0 && (
              <span className="text-xs text-amber-600 font-medium">
                ⚠ 주거래 계좌가 지정되지 않았습니다
              </span>
            )}
          </div>
        )}
      </div>

      {/* 안내 문구 */}
      <div className="flex items-start gap-2.5 bg-stone-50 border border-stone-200 rounded-xl p-4">
        <Landmark size={15} className="text-stone-400 mt-0.5 shrink-0" />
        <p className="text-xs text-stone-500 leading-relaxed">
          등록된 은행 계좌는 <strong className="text-stone-600">거래(Transactions), AR/AP 트래커, 인보이스</strong>에서
          선택할 수 있습니다. 주거래 계좌는 결제 기록 시 기본값으로 사용됩니다.
        </p>
      </div>

      {/* ── 계좌 추가 모달 ──────────────────────────────────────────────────── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>은행 계좌 추가</DialogTitle>
          </DialogHeader>
          <AccountForm
            initial={EMPTY_FORM}
            saving={createMutation.isPending}
            onSave={d => createMutation.mutate(d)}
            onCancel={() => setAddOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* ── 계좌 수정 모달 ──────────────────────────────────────────────────── */}
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
