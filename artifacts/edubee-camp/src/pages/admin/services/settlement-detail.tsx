import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { DetailPageLayout, DetailSection, DetailRow, EditableField } from "@/components/shared/DetailPageLayout";
import { useDetailEdit } from "@/hooks/useDetailEdit";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const STATUSES = ["pending", "processing", "paid", "cancelled", "disputed"];
const ADMIN_ROLES = ["super_admin", "admin", "camp_coordinator"];
const CURRENCY_SYMBOLS: Record<string, string> = { AUD: "A$", USD: "$", KRW: "₩", JPY: "¥", THB: "฿", PHP: "₱", SGD: "S$", GBP: "£" };
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700", processing: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700", cancelled: "bg-red-100 text-red-700",
  disputed: "bg-orange-100 text-orange-700",
};

export default function SettlementMgtDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["settlement-detail", id],
    queryFn: () => axios.get(`${BASE}/api/services/settlement/${id}`).then(r => r.data),
  });

  const rec = data?.data ?? data;
  const isAdmin = ADMIN_ROLES.includes(user?.role ?? "");
  const canEdit = isAdmin;

  const updateRec = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      axios.put(`${BASE}/api/services/settlement/${id}`, payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settlement-detail", id] });
      toast({ title: "Settlement updated" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to update" }),
  });

  const { isEditing, isSaving, startEdit, cancelEdit, setField, saveEdit, getValue } = useDetailEdit({
    initialData: rec ?? {},
    onSave: async (data) => { await updateRec.mutateAsync(data); },
  });

  if (isLoading) return <div className="p-6 space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>;
  if (!rec) return <div className="p-6 text-muted-foreground">Record not found.</div>;

  const fmtCcy = (amount: any, ccy = "AUD") =>
    amount ? `${CURRENCY_SYMBOLS[ccy] ?? ccy}${Number(amount).toLocaleString()}` : "—";

  return (
    <DetailPageLayout
      title={rec.settlementNumber ?? "Settlement"}
      subtitle={rec.contractNumber ?? ""}
      badge={<span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[rec.status ?? ""] ?? "bg-gray-100 text-gray-600"}`}>{rec.status ?? "—"}</span>}
      backPath="/admin/services/settlement"
      backLabel="Settlement Management"
      canEdit={canEdit}
      isEditing={isEditing}
      isSaving={isSaving}
      onEdit={startEdit}
      onSave={saveEdit}
      onCancel={cancelEdit}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DetailSection title="Settlement Info">
          <DetailRow label="Settlement #" value={rec.settlementNumber} />
          <EditableField label="Status" isEditing={isEditing} value={rec.status}
            editChildren={
              <Select value={getValue("status")} onValueChange={v => setField("status", v)}>
                <SelectTrigger className="h-8 text-sm border-[#F5821F]"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            } />
          <DetailRow label="Currency" value={rec.currency} />
          <DetailRow label="Total Amount" value={fmtCcy(rec.totalAmount, rec.currency)} />
          <DetailRow label="Commission Rate" value={rec.commissionRate ? `${Number(rec.commissionRate) * 100}%` : "—"} />
          <DetailRow label="Commission Amount" value={fmtCcy(rec.commissionAmount, rec.currency)} />
          <DetailRow label="Net Amount" value={fmtCcy(rec.netAmount, rec.currency)} />
        </DetailSection>

        <DetailSection title="Dates &amp; References">
          <DetailRow label="Contract #" value={rec.contractNumber} />
          <DetailRow label="Student Name" value={rec.studentName} />
          <EditableField label="Due Date" isEditing={isEditing} value={rec.dueDate ? format(new Date(rec.dueDate), "PPP") : "—"}
            editValue={getValue("dueDate")} onEdit={v => setField("dueDate", v)} type="date" />
          <DetailRow label="Paid Date" value={rec.paidDate ? format(new Date(rec.paidDate), "PPP") : "—"} />
          <DetailRow label="Payment Method" value={rec.paymentMethod} />
          <DetailRow label="Reference #" value={rec.referenceNumber} />
          <DetailRow label="Created" value={rec.createdAt ? format(new Date(rec.createdAt), "PPP") : "—"} />
        </DetailSection>

        <DetailSection title="Notes" className="lg:col-span-2">
          {isEditing ? (
            <textarea value={getValue("notes") ?? ""} onChange={e => setField("notes", e.target.value)}
              className="w-full border border-[#F5821F] rounded-md px-3 py-2 text-sm resize-none h-24 focus:outline-none focus:ring-1 focus:ring-[#F5821F]" />
          ) : (
            <p className="text-sm text-foreground whitespace-pre-wrap">{rec.notes || <span className="text-muted-foreground/60">—</span>}</p>
          )}
        </DetailSection>
      </div>
    </DetailPageLayout>
  );
}
