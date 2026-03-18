import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearch } from "wouter";
import axios from "axios";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { ListPagination } from "@/components/ui/list-pagination";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronRight, FileText, GraduationCap, Building2, Car, Map, Banknote,
  Receipt, ArrowDownLeft, ArrowUpRight, CheckCircle2, Clock,
} from "lucide-react";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const PAGE_SIZE = 10;

const CONTRACT_STATUSES = ["draft", "active", "completed", "cancelled", "disputed"];
const CURRENCY_SYMBOLS: Record<string, string> = {
  AUD: "A$", SGD: "S$", PHP: "₱", THB: "฿", KRW: "₩", JPY: "¥", GBP: "£", USD: "$", EUR: "€",
};

interface Contract {
  id: string; contractNumber: string; status: string; currency: string;
  totalAmount?: string; startDate?: string; endDate?: string;
  createdAt: string; updatedAt: string;
  studentName?: string | null;
  application?: { studentName?: string; applicationNumber?: string } | null;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-[#F4F3F1] text-[#57534E]", active: "bg-[#DCFCE7] text-[#16A34A]",
    completed: "bg-[#F4F3F1] text-[#57534E]", cancelled: "bg-[#FEF2F2] text-[#DC2626]",
    disputed: "bg-[#FEF9C3] text-[#CA8A04]",
  };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${map[status] ?? "bg-[#F4F3F1] text-[#57534E]"}`}>{status}</span>;
}

function InvoiceBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-[#F4F3F1] text-[#57534E]", sent: "bg-[#FEF0E3] text-[#F5821F]",
    paid: "bg-[#DCFCE7] text-[#16A34A]", overdue: "bg-[#FEF2F2] text-[#DC2626]",
    cancelled: "bg-[#F4F3F1] text-[#57534E]",
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? "bg-[#F4F3F1] text-[#57534E]"}`}>{status}</span>;
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
    completed: "bg-[#16A34A]", confirmed: "bg-[#F5821F]", in_progress: "bg-[#CA8A04]",
    pending: "bg-[#A8A29E]", cancelled: "bg-[#DC2626]", settled: "bg-[#16A34A]",
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[status ?? "pending"] ?? "bg-[#A8A29E]"}`} />;
}

function ServiceCard({ icon: Icon, title, record, fields }: {
  icon: React.ElementType; title: string; record: any | null;
  fields: { key: string; label: string; format?: (v: any) => string }[];
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`w-4 h-4 ${record ? "text-[#F5821F]" : "text-muted-foreground"}`} />
        <span className="font-semibold text-sm text-foreground">{title}</span>
        {record ? (
          <div className="ml-auto flex items-center gap-1.5">
            <ServiceStatusDot status={record.status} />
            <span className="text-xs text-muted-foreground capitalize">{record.status?.replace(/_/g, " ")}</span>
          </div>
        ) : (
          <span className="ml-auto text-xs text-muted-foreground italic">Not assigned</span>
        )}
      </div>
      {record && (
        <dl className="grid grid-cols-2 gap-3">
          {fields.map(f => record[f.key] != null && (
            <DetailRow key={f.key} label={f.label} value={f.format ? f.format(record[f.key]) : String(record[f.key])} />
          ))}
        </dl>
      )}
    </div>
  );
}

export default function Contracts() {
  const { toast } = useToast();
  const searchStr = useSearch();
  const targetContractId = new URLSearchParams(searchStr).get("contractId");
  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Contract | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [autoOpened, setAutoOpened] = useState<string | null>(null);

  const queryKey = ["contracts", { search, status: activeStatus, page }];
  const { data: resp, isLoading } = useQuery({
    queryKey,
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (search) params.set("search", search);
      if (activeStatus !== "all") params.set("status", activeStatus);
      return axios.get(`${BASE}/api/contracts?${params}`).then(r => r.data);
    },
  });
  const contracts: Contract[] = resp?.data ?? [];
  const total: number = resp?.meta?.total ?? contracts.length;

  const { data: targetContract } = useQuery({
    queryKey: ["contract-by-id", targetContractId],
    queryFn: () => axios.get(`${BASE}/api/contracts/${targetContractId}`).then(r => r.data),
    enabled: !!targetContractId && autoOpened !== targetContractId,
  });

  useEffect(() => {
    if (!targetContractId || autoOpened === targetContractId) return;
    const match = contracts.find(c => c.id === targetContractId) ?? targetContract ?? null;
    if (match) {
      setSelected(match);
      setActiveTab("overview");
      setAutoOpened(targetContractId);
    }
  }, [targetContractId, contracts, targetContract, autoOpened]);

  const { data: services, isLoading: servicesLoading } = useQuery({
    queryKey: ["contract-services", selected?.id],
    queryFn: () => axios.get(`${BASE}/api/contracts/${selected!.id}/services`).then(r => r.data),
    enabled: !!selected?.id && activeTab === "services",
  });

  const { data: accounting, isLoading: accountingLoading } = useQuery({
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

  const fmtCcy = (amount: number | string, ccy = "AUD") =>
    `${CURRENCY_SYMBOLS[ccy] ?? ccy}${Number(amount).toLocaleString()}`;

  const getStudentName = (c: Contract) =>
    c.studentName ?? c.application?.studentName ?? "—";

  return (
    <div className="space-y-4">
      <ListToolbar
        search={search}
        onSearch={v => { setSearch(v); setPage(1); }}
        statuses={CONTRACT_STATUSES}
        activeStatus={activeStatus}
        onStatusChange={s => { setActiveStatus(s); setPage(1); }}
        total={total}
      />

      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {["Contract #", "Student", "Status", "Total Amount", "Start Date", "End Date", ""].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              [...Array(PAGE_SIZE)].map((_, i) => (
                <tr key={i}>{[...Array(7)].map((_, j) => (
                  <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>
                ))}</tr>
              ))
            ) : contracts.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-16 text-center text-muted-foreground text-sm">No contracts found</td></tr>
            ) : contracts.map(c => (
              <tr key={c.id} className="hover:bg-muted/20 transition-colors cursor-pointer"
                onClick={() => { setSelected(c); setActiveTab("overview"); }}>
                <td className="px-4 py-3 font-mono text-xs font-medium text-foreground">{c.contractNumber}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">{getStudentName(c)}</div>
                  {c.application?.applicationNumber && (
                    <div className="text-xs text-muted-foreground font-mono">{c.application.applicationNumber}</div>
                  )}
                </td>
                <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                <td className="px-4 py-3 font-medium text-foreground">{c.totalAmount ? fmtCcy(c.totalAmount, c.currency) : "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.startDate ? format(new Date(c.startDate), "MMM d, yyyy") : "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.endDate ? format(new Date(c.endDate), "MMM d, yyyy") : "—"}</td>
                <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-muted-foreground" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ListPagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />

      <Sheet open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col bg-background">
          {selected && (
            <>
              <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <SheetTitle className="text-lg text-foreground">{selected.contractNumber}</SheetTitle>
                    <div className="flex items-center gap-2 mt-1.5">
                      <StatusBadge status={selected.status} />
                      <span className="text-xs text-muted-foreground">{getStudentName(selected)}</span>
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
                  <TabsContent value="overview" className="p-6 m-0 space-y-5">
                    <dl className="grid grid-cols-2 gap-4">
                      <DetailRow label="Contract #" value={selected.contractNumber} />
                      <DetailRow label="Status" value={selected.status} />
                      <DetailRow label="Currency" value={selected.currency} />
                      <DetailRow label="Total Amount" value={selected.totalAmount ? fmtCcy(selected.totalAmount, selected.currency) : undefined} />
                      <DetailRow label="Start Date" value={selected.startDate ? format(new Date(selected.startDate), "MMM d, yyyy") : undefined} />
                      <DetailRow label="End Date" value={selected.endDate ? format(new Date(selected.endDate), "MMM d, yyyy") : undefined} />
                      <DetailRow label="Student" value={getStudentName(selected)} />
                      <DetailRow label="Created" value={format(new Date(selected.createdAt), "MMM d, yyyy")} />
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

                  <TabsContent value="services" className="p-6 m-0 space-y-4">
                    {servicesLoading ? [...Array(3)].map((_, i) => <div key={i} className="h-28 bg-muted rounded-xl animate-pulse" />) : (
                      <>
                        <ServiceCard icon={GraduationCap} title="Institute / Language School" record={services?.institute} fields={[
                          { key: "programDetails", label: "Program" },
                          { key: "totalHours", label: "Total Hours" },
                          { key: "startDate", label: "Start", format: v => format(new Date(v), "MMM d, yyyy") },
                          { key: "endDate", label: "End", format: v => format(new Date(v), "MMM d, yyyy") },
                          { key: "englishLevelStart", label: "Level (Start)" },
                          { key: "englishLevelEnd", label: "Level (End)" },
                        ]} />
                        <ServiceCard icon={Building2} title="Hotel / Accommodation" record={services?.hotel} fields={[
                          { key: "roomType", label: "Room Type" },
                          { key: "confirmationNo", label: "Confirmation No." },
                          { key: "checkinDate", label: "Check-in", format: v => format(new Date(v), "MMM d, yyyy") },
                          { key: "checkoutDate", label: "Check-out", format: v => format(new Date(v), "MMM d, yyyy") },
                        ]} />
                        <ServiceCard icon={Car} title="Airport Pickup" record={services?.pickup} fields={[
                          { key: "pickupType", label: "Type" },
                          { key: "fromLocation", label: "From" },
                          { key: "toLocation", label: "To" },
                          { key: "pickupDatetime", label: "Pickup Time", format: v => format(new Date(v), "MMM d, yyyy HH:mm") },
                        ]} />
                        <ServiceCard icon={Map} title="Tour" record={services?.tour} fields={[
                          { key: "tourName", label: "Tour Name" },
                          { key: "tourDate", label: "Date", format: v => format(new Date(v), "MMM d, yyyy") },
                          { key: "meetingPoint", label: "Meeting Point" },
                        ]} />
                        {(services?.settlements ?? []).length > 0 && (
                          <div className="rounded-xl border border-border bg-muted/20 p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <Banknote className="w-4 h-4 text-[#16A34A]" />
                              <span className="font-semibold text-sm text-foreground">Settlements</span>
                            </div>
                            <div className="space-y-2">
                              {services!.settlements.map((s: any) => (
                                <div key={s.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                                  <div>
                                    <div className="text-sm font-medium text-foreground">{s.serviceDescription}</div>
                                    <div className="text-xs text-muted-foreground">{s.providerName ?? s.providerRole?.replace(/_/g, " ")}</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm font-medium">A${Number(s.netAmount).toLocaleString()}</div>
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

                  <TabsContent value="documents" className="p-6 m-0">
                    <div className="text-center py-12 text-muted-foreground text-sm">
                      <FileText className="w-8 h-8 mx-auto mb-3 opacity-30" /><p>Documents coming soon</p>
                    </div>
                  </TabsContent>

                  <TabsContent value="accounting" className="p-6 m-0 space-y-5">
                    {accountingLoading ? [...Array(2)].map((_, i) => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />) : (
                      <>
                        {accounting && (
                          <div className="grid grid-cols-3 gap-3">
                            {[
                              { label: "Paid", value: accounting.summary.totalPaid, color: "text-[#16A34A]" },
                              { label: "Sent", value: accounting.summary.totalSent, color: "text-[#F5821F]" },
                              { label: "Received", value: accounting.summary.totalReceived, color: "text-[#16A34A]" },
                            ].map(s => (
                              <div key={s.label} className="rounded-lg border border-border bg-muted/20 p-3 text-center">
                                <div className={`text-lg font-bold ${s.color}`}>A${s.value.toLocaleString()}</div>
                                <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
                              </div>
                            ))}
                          </div>
                        )}
                        {(accounting?.invoices ?? []).length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                              <Receipt className="w-3.5 h-3.5" /> Invoices
                            </h4>
                            <div className="rounded-xl border border-border overflow-hidden">
                              {accounting!.invoices.map((inv: any) => (
                                <div key={inv.id} className="px-4 py-3 border-b border-border last:border-0 flex items-center justify-between">
                                  <div>
                                    <div className="text-sm font-medium font-mono">{inv.invoiceNumber}</div>
                                    <div className="text-xs text-muted-foreground capitalize">{inv.invoiceType} · {inv.dueDate ? format(new Date(inv.dueDate), "MMM d, yyyy") : "—"}</div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <InvoiceBadge status={inv.status} />
                                    <span className="text-sm font-semibold">{fmtCcy(inv.totalAmount, inv.currency)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {(accounting?.transactions ?? []).length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" /> Transactions
                            </h4>
                            <div className="rounded-xl border border-border overflow-hidden">
                              {accounting!.transactions.map((tx: any) => (
                                <div key={tx.id} className="px-4 py-3 border-b border-border last:border-0 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {tx.transactionType === "credit"
                                      ? <ArrowDownLeft className="w-4 h-4 text-[#22C55E] shrink-0" />
                                      : <ArrowUpRight className="w-4 h-4 text-[#DC2626] shrink-0" />}
                                    <div>
                                      <div className="text-sm font-medium">{tx.description}</div>
                                      <div className="text-xs text-muted-foreground">{tx.transactionDate ? format(new Date(tx.transactionDate), "MMM d, yyyy") : "—"}</div>
                                    </div>
                                  </div>
                                  <span className={`text-sm font-semibold ${tx.transactionType === "credit" ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
                                    {tx.transactionType === "credit" ? "+" : "−"}{fmtCcy(tx.amount, tx.currency)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </TabsContent>

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
