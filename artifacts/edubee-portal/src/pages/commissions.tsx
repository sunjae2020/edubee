import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Clock, CheckCircle, FileText } from "lucide-react";
import { format } from "date-fns";

interface TaxInvoice {
  id: string;
  invoiceRef: string;
  invoiceDate: string;
  programName: string;
  studentName: string;
  commissionAmount: string;
  gstAmount: string;
  totalAmount: string;
  status: string;
  paidAt: string | null;
  dueDate: string | null;
}

interface CommissionSummary {
  total: number;
  pending: number;
  paid: number;
}

function fmt(n: number | string) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
  }).format(Number(n));
}

function statusColor(status: string) {
  const s = status?.toLowerCase();
  if (s === "paid") return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  if (s === "sent") return "bg-blue-50 text-blue-700 border border-blue-200";
  if (s === "draft") return "bg-muted text-muted-foreground border border-border";
  if (s === "overdue") return "bg-red-50 text-red-700 border border-red-200";
  return "bg-amber-50 text-amber-700 border border-amber-200";
}

export default function CommissionsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["portal-commissions"],
    queryFn: () =>
      api
        .get<{ data: TaxInvoice[]; summary: CommissionSummary }>("/portal/commissions")
        .then((r) => r),
  });

  const invoices = data?.data ?? [];
  const summary = data?.summary ?? { total: 0, pending: 0, paid: 0 };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Commissions</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Your commission invoices and payment history
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive mb-6">
          Failed to load commission data. Please try again.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="border-card-border">
              <CardContent className="p-5">
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-7 w-28" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card className="border-card-border shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Earned</p>
                    <p className="text-xl font-bold text-foreground mt-1">{fmt(summary.total)}</p>
                  </div>
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-card-border shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pending</p>
                    <p className="text-xl font-bold text-foreground mt-1">{fmt(summary.pending)}</p>
                  </div>
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-card-border shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Paid</p>
                    <p className="text-xl font-bold text-foreground mt-1">{fmt(summary.paid)}</p>
                  </div>
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Card className="border-card-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Commission Invoices
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex justify-between">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-16 px-6">
              <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">No commission invoices yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Commission invoices will appear here when generated by your administrator.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Invoice</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Student</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Program</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Commission</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-foreground">{inv.invoiceRef}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(inv.invoiceDate), "dd MMM yyyy")}
                        </p>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-foreground">{inv.studentName}</td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground max-w-48 truncate">{inv.programName}</td>
                      <td className="px-5 py-3.5 text-right font-medium text-foreground">{fmt(inv.commissionAmount)}</td>
                      <td className="px-5 py-3.5 text-right font-semibold text-foreground">{fmt(inv.totalAmount)}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColor(inv.status)}`}>
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
