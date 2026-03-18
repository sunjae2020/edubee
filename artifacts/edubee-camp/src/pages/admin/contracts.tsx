import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Search, Filter, ChevronRight, FileText,
  GraduationCap, Building2, Car, Map, Banknote,
  Receipt, ArrowDownLeft, ArrowUpRight, CheckCircle2, Clock, AlertCircle,
} from "lucide-react";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const CONTRACT_STATUSES = ["draft", "active", "completed", "cancelled", "disputed"];

const CURRENCY_SYMBOLS: Record<string, string> = {
  AUD: "A$", SGD: "S$", PHP: "₱", THB: "฿", KRW: "₩", JPY: "¥", GBP: "£", USD: "$", EUR: "€",
};

interface Contract {
  id: string; contractNumber: string; status: string; currency: string;
  totalAmount?: string; applicationId?: string; campProviderId?: string;
  startDate?: string; endDate?: string; createdAt: string; updatedAt: string;
  application?: { studentName?: string; applicationNumber?: string } | null;
}

interface ServiceData {
  institute: any; hotel: any; pickup: any; tour: any;
  settlements: any[];
}

interface AccountingData {
  invoices: any[]; receipts: any[]; transactions: any[];
  summary: { totalPaid: number; totalSent: number; totalReceived: number };
}

function ContractStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700", active: "bg-green-100 text-green-700",
    completed: "bg-slate-100 text-slate-600", cancelled: "bg-red-100 text-red-700",
    disputed: "bg-yellow-100 text-yellow-700",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${map[status] ?? "bg-gray-100 text-gray-700"}`}>
      {status}
    </span>
  );
}

function InvoiceStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700", sent: "bg-orange-100 text-orange-700",
    paid: "bg-green-100 text-green-700", overdue: "bg-red-100 text-red-700",
    cancelled: "bg-slate-100 text-slate-600",
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? "bg-gray-100 text-gray-700"}`}>{status}</span>;
}

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{value ?? "—"}</dd>
    </div>
  );
}

function ServiceStatusDot({ status }: { status?: string }) {
  const colors: Record<string, string> = {
    completed: "bg-green-500", confirmed: "bg-blue-500", in_progress: "bg-amber-500",
    pending: "bg-gray-400", cancelled: "bg-red-500", settled: "bg-teal-500", processing: "bg-purple-500",
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[status ?? "pending"] ?? "bg-gray-400"}`} />;
}

function ServiceCard({ icon: Icon, title, record, fields }: {
  icon: React.ElementType; title: string; record: any | null;
  fields: { key: string; label: string; format?: (v: any) => string }[];
}) {
  if (!record) {
    return (
      <div className="rounded-xl border border-border bg-muted/20 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <span className="font-semibold text-sm text-foreground">{title}</span>
          <span className="ml-auto text-xs text-muted-foreground italic">Not assigned</span>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-[#F08301]" />
        <span className="font-semibold text-sm text-foreground">{title}</span>
        <div className="ml-auto flex items-center gap-1.5">
          <ServiceStatusDot status={record.status} />
          <span className="text-xs text-muted-foreground capitalize">{record.status?.replace(/_/g, " ")}</span>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-3">
        {fields.map(f => record[f.key] != null && (
          <DetailRow key={f.key} label={f.label} value={f.format ? f.format(record[f.key]) : String(record[f.key])} />
        ))}
      </dl>
    </div>
  );
}

export default function Contracts() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<Contract | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const { data: contracts = [], isLoading } = useQuery<Contract[]>({
    queryKey: ["contracts"],
    queryFn: () => axios.get(`${BASE}/api/contracts`).then(r => r.data?.data ?? r.data),
  });

  const { data: services, isLoading: servicesLoading } = useQuery<ServiceData>({
    queryKey: ["contract-services", selected?.id],
    queryFn: () => axios.get(`${BASE}/api/contracts/${selected!.id}/services`).then(r => r.data),
    enabled: !!selected?.id && activeTab === "services",
  });

  const { data: accounting, isLoading: accountingLoading } = useQuery<AccountingData>({
    queryKey: ["contract-accounting", selected?.id],
    queryFn: () => axios.get(`${BASE}/api/contracts/${selected!.id}/accounting`).then(r => r.data),
    enabled: !!selected?.id && activeTab === "accounting",
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      axios.put(`${BASE}/api/contracts/${id}`, { status }).then(r => r.data),
    onSuccess: (updated) => {
      if (selected) setSelected({ ...selected, status: updated.status });
      toast({ title: "Status updated" });
    },
  });

  const filtered = contracts.filter(c => {
    const matchSearch = !search || c.contractNumber.toLowerCase().includes(search.toLowerCase()) ||
      c.application?.studentName?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const fmtCcy = (amount: number | string, ccy = "AUD") =>
    `${CURRENCY_SYMBOLS[ccy] ?? ccy}${Number(amount).toLocaleString()}`;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search contracts…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-40 text-sm">
            <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {CONTRACT_STATUSES.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto text-sm text-muted-foreground">{filtered.length} contracts</div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {["Contract #", "Student", "Status", "Total Amount", "Start Date", "End Date", ""].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              [...Array(4)].map((_, i) => (
                <tr key={i}>
                  {[...Array(7)].map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center text-muted-foreground text-sm">
                  No contracts found. Convert an approved application to create one.
                </td>
              </tr>
            ) : (
              filtered.map(c => (
                <tr
                  key={c.id}
                  className="hover:bg-muted/20 transition-colors cursor-pointer"
                  onClick={() => { setSelected(c); setActiveTab("overview"); }}
                >
                  <td className="px-4 py-3 font-mono text-xs font-medium text-foreground">{c.contractNumber}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{c.application?.studentName ?? "—"}</div>
                    {c.application?.applicationNumber && (
                      <div className="text-xs text-muted-foreground font-mono">{c.application.applicationNumber}</div>
                    )}
                  </td>
                  <td className="px-4 py-3"><ContractStatusBadge status={c.status} /></td>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {c.totalAmount ? fmtCcy(c.totalAmount, c.currency) : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.startDate ? format(new Date(c.startDate), "MMM d, yyyy") : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.endDate ? format(new Date(c.endDate), "MMM d, yyyy") : "—"}
                  </td>
                  <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-muted-foreground" /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col bg-background">
          {selected && (
            <>
              <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <SheetTitle className="text-lg text-foreground">{selected.contractNumber}</SheetTitle>
                    <div className="flex items-center gap-2 mt-1.5">
                      <ContractStatusBadge status={selected.status} />
                      {selected.application?.studentName && (
                        <span className="text-xs text-muted-foreground">{selected.application.studentName}</span>
                      )}
                    </div>
                  </div>
                  {selected.totalAmount && (
                    <div className="text-right">
                      <div className="text-lg font-bold text-foreground">{fmtCcy(selected.totalAmount, selected.currency)}</div>
                      <div className="text-xs text-muted-foreground">{selected.currency}</div>
                    </div>
                  )}
                </div>
              </SheetHeader>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                <TabsList className="shrink-0 mx-6 mt-4 w-auto justify-start bg-muted/60 p-1 rounded-lg h-9">
                  {["overview", "services", "documents", "accounting", "activity"].map(t => (
                    <TabsTrigger key={t} value={t} className="text-xs capitalize px-3 h-7">{t}</TabsTrigger>
                  ))}
                </TabsList>

                <div className="flex-1 overflow-y-auto">
                  {/* Overview Tab */}
                  <TabsContent value="overview" className="p-6 m-0 space-y-5">
                    <dl className="grid grid-cols-2 gap-4">
                      <DetailRow label="Contract #" value={selected.contractNumber} />
                      <DetailRow label="Status" value={selected.status} />
                      <DetailRow label="Currency" value={selected.currency} />
                      <DetailRow label="Total Amount" value={selected.totalAmount ? fmtCcy(selected.totalAmount, selected.currency) : undefined} />
                      <DetailRow label="Start Date" value={selected.startDate ? format(new Date(selected.startDate), "MMM d, yyyy") : undefined} />
                      <DetailRow label="End Date" value={selected.endDate ? format(new Date(selected.endDate), "MMM d, yyyy") : undefined} />
                      <DetailRow label="Student" value={selected.application?.studentName} />
                      <DetailRow label="Application #" value={selected.application?.applicationNumber} />
                      <DetailRow label="Created" value={format(new Date(selected.createdAt), "MMM d, yyyy")} />
                      <DetailRow label="Updated" value={format(new Date(selected.updatedAt), "MMM d, yyyy")} />
                    </dl>
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Change Status</h4>
                      <div className="flex flex-wrap gap-2">
                        {CONTRACT_STATUSES.filter(s => s !== selected.status).map(s => (
                          <button key={s}
                            onClick={() => updateStatus.mutate({ id: selected.id, status: s })}
                            className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors text-foreground">
                            → {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  {/* Services Tab */}
                  <TabsContent value="services" className="p-6 m-0 space-y-4">
                    {servicesLoading ? (
                      [...Array(3)].map((_, i) => <div key={i} className="h-28 bg-muted rounded-xl animate-pulse" />)
                    ) : (
                      <>
                        <ServiceCard icon={GraduationCap} title="Institute / Language School" record={services?.institute} fields={[
                          { key: "programDetails", label: "Program" },
                          { key: "totalHours", label: "Total Hours" },
                          { key: "startDate", label: "Start", format: v => format(new Date(v), "MMM d, yyyy") },
                          { key: "endDate", label: "End", format: v => format(new Date(v), "MMM d, yyyy") },
                          { key: "englishLevelStart", label: "Level (Start)" },
                          { key: "englishLevelEnd", label: "Level (End)" },
                          { key: "teacherComments", label: "Teacher Notes" },
                        ]} />

                        <ServiceCard icon={Building2} title="Hotel / Accommodation" record={services?.hotel} fields={[
                          { key: "roomType", label: "Room Type" },
                          { key: "confirmationNo", label: "Confirmation No." },
                          { key: "checkinDate", label: "Check-in", format: v => format(new Date(v), "MMM d, yyyy") },
                          { key: "checkoutDate", label: "Check-out", format: v => format(new Date(v), "MMM d, yyyy") },
                          { key: "checkinTime", label: "Check-in Time" },
                          { key: "guestNotes", label: "Guest Notes" },
                        ]} />

                        <ServiceCard icon={Car} title="Airport Pickup" record={services?.pickup} fields={[
                          { key: "pickupType", label: "Type" },
                          { key: "fromLocation", label: "From" },
                          { key: "toLocation", label: "To" },
                          { key: "pickupDatetime", label: "Pickup Time", format: v => format(new Date(v), "MMM d, yyyy HH:mm") },
                          { key: "vehicleInfo", label: "Vehicle" },
                          { key: "driverNotes", label: "Notes" },
                        ]} />

                        <ServiceCard icon={Map} title="Tour" record={services?.tour} fields={[
                          { key: "tourName", label: "Tour Name" },
                          { key: "tourDate", label: "Date", format: v => format(new Date(v), "MMM d, yyyy") },
                          { key: "meetingPoint", label: "Meeting Point" },
                          { key: "startTime", label: "Start Time" },
                          { key: "endTime", label: "End Time" },
                          { key: "guideInfo", label: "Guide Info" },
                        ]} />

                        {(services?.settlements ?? []).length > 0 && (
                          <div className="rounded-xl border border-border bg-muted/20 p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <Banknote className="w-4 h-4 text-teal-600" />
                              <span className="font-semibold text-sm text-foreground">Settlements</span>
                            </div>
                            <div className="space-y-2">
                              {services!.settlements.map(s => (
                                <div key={s.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                                  <div>
                                    <div className="text-sm font-medium text-foreground">{s.serviceDescription}</div>
                                    <div className="text-xs text-muted-foreground">{s.providerName ?? s.providerRole?.replace(/_/g, " ")}</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm font-medium text-foreground">A${Number(s.netAmount).toLocaleString()}</div>
                                    <div className="flex items-center gap-1 justify-end">
                                      <ServiceStatusDot status={s.status} />
                                      <span className="text-xs text-muted-foreground capitalize">{s.status}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </TabsContent>

                  {/* Documents Tab */}
                  <TabsContent value="documents" className="p-6 m-0">
                    <div className="text-center py-12 text-muted-foreground text-sm">
                      <FileText className="w-8 h-8 mx-auto mb-3 opacity-30" />
                      <p>Document management will be available soon</p>
                    </div>
                  </TabsContent>

                  {/* Accounting Tab */}
                  <TabsContent value="accounting" className="p-6 m-0 space-y-5">
                    {accountingLoading ? (
                      [...Array(3)].map((_, i) => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)
                    ) : (
                      <>
                        {/* Summary */}
                        {accounting && (
                          <div className="grid grid-cols-3 gap-3">
                            {[
                              { label: "Invoiced (Paid)", value: accounting.summary.totalPaid, color: "text-green-600" },
                              { label: "Invoiced (Sent)", value: accounting.summary.totalSent, color: "text-orange-600" },
                              { label: "Received", value: accounting.summary.totalReceived, color: "text-teal-600" },
                            ].map(s => (
                              <div key={s.label} className="rounded-lg border border-border bg-muted/20 p-3 text-center">
                                <div className={`text-lg font-bold ${s.color}`}>A${s.value.toLocaleString()}</div>
                                <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Invoices */}
                        {(accounting?.invoices ?? []).length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                              <Receipt className="w-3.5 h-3.5" /> Invoices
                            </h4>
                            <div className="rounded-xl border border-border overflow-hidden">
                              {accounting!.invoices.map(inv => (
                                <div key={inv.id} className="px-4 py-3 border-b border-border last:border-0 flex items-center justify-between">
                                  <div>
                                    <div className="text-sm font-medium text-foreground font-mono">{inv.invoiceNumber}</div>
                                    <div className="text-xs text-muted-foreground capitalize">{inv.invoiceType} invoice · {inv.dueDate ? format(new Date(inv.dueDate), "MMM d, yyyy") : "No due date"}</div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <InvoiceStatusBadge status={inv.status} />
                                    <span className="text-sm font-semibold text-foreground">
                                      {fmtCcy(inv.totalAmount, inv.currency)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Receipts */}
                        {(accounting?.receipts ?? []).length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> Receipts
                            </h4>
                            <div className="rounded-xl border border-border overflow-hidden">
                              {accounting!.receipts.map(r => (
                                <div key={r.id} className="px-4 py-3 border-b border-border last:border-0 flex items-center justify-between">
                                  <div>
                                    <div className="text-sm font-medium text-foreground font-mono">{r.receiptNumber}</div>
                                    <div className="text-xs text-muted-foreground capitalize">
                                      {r.paymentMethod?.replace(/_/g, " ")} · {r.receiptDate ? format(new Date(r.receiptDate), "MMM d, yyyy") : "—"}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.status === "confirmed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                                      {r.status}
                                    </span>
                                    <span className="text-sm font-semibold text-foreground">{fmtCcy(r.amount, r.currency)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Transactions */}
                        {(accounting?.transactions ?? []).length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" /> Transactions
                            </h4>
                            <div className="rounded-xl border border-border overflow-hidden">
                              {accounting!.transactions.map(tx => (
                                <div key={tx.id} className="px-4 py-3 border-b border-border last:border-0 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {tx.transactionType === "credit"
                                      ? <ArrowDownLeft className="w-4 h-4 text-green-500 shrink-0" />
                                      : <ArrowUpRight className="w-4 h-4 text-red-500 shrink-0" />
                                    }
                                    <div>
                                      <div className="text-sm font-medium text-foreground">{tx.description}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {tx.bankReference} · {tx.transactionDate ? format(new Date(tx.transactionDate), "MMM d, yyyy") : "—"}
                                      </div>
                                    </div>
                                  </div>
                                  <span className={`text-sm font-semibold ${tx.transactionType === "credit" ? "text-green-600" : "text-red-600"}`}>
                                    {tx.transactionType === "credit" ? "+" : "−"}{fmtCcy(tx.amount, tx.currency)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {!accounting?.invoices?.length && !accounting?.receipts?.length && !accounting?.transactions?.length && (
                          <div className="text-center py-12 text-muted-foreground text-sm">
                            <Receipt className="w-8 h-8 mx-auto mb-3 opacity-30" />
                            <p>No accounting records yet</p>
                          </div>
                        )}
                      </>
                    )}
                  </TabsContent>

                  {/* Activity Tab */}
                  <TabsContent value="activity" className="p-6 m-0">
                    <div className="space-y-3">
                      {[
                        { date: selected.createdAt, label: "Contract created", icon: "📄" },
                        ...(selected.startDate ? [{ date: selected.startDate, label: "Program starts", icon: "🚀" }] : []),
                        ...(selected.endDate ? [{ date: selected.endDate, label: "Program ends", icon: "🏁" }] : []),
                        { date: selected.updatedAt, label: `Status: ${selected.status}`, icon: "🔄" },
                      ]
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .map((ev, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm shrink-0">{ev.icon}</div>
                          <div className="flex-1 pt-1">
                            <div className="text-sm font-medium text-foreground">{ev.label}</div>
                            <div className="text-xs text-muted-foreground">{format(new Date(ev.date), "MMM d, yyyy")}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
