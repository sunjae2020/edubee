import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, ChevronRight, FileText } from "lucide-react";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const CONTRACT_STATUSES = ["draft", "active", "completed", "cancelled", "disputed"];

interface Contract {
  id: string; contractNumber: string; status: string; currency: string;
  totalAmount?: string; applicationId?: string; campProviderId?: string;
  startDate?: string; endDate?: string; createdAt: string; updatedAt: string;
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

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</dt>
      <dd className="text-sm font-medium">{value ?? "—"}</dd>
    </div>
  );
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  AUD: "A$", SGD: "S$", PHP: "₱", THB: "฿", KRW: "₩", JPY: "¥", GBP: "£", USD: "$",
};

export default function Contracts() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<Contract | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const { data: contracts = [], isLoading } = useQuery<Contract[]>({
    queryKey: ["contracts"],
    queryFn: () => axios.get(`${BASE}/api/contracts`).then(r => r.data?.data ?? r.data),
  });

  const filtered = contracts.filter(c => {
    const matchSearch = !search || c.contractNumber.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

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
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {["Contract #", "Status", "Currency", "Total Amount", "Start Date", "End Date", "Created", ""].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              [...Array(4)].map((_, i) => (
                <tr key={i}>
                  {[...Array(8)].map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-16 text-center text-muted-foreground text-sm">
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
                  <td className="px-4 py-3 font-mono text-xs font-medium">{c.contractNumber}</td>
                  <td className="px-4 py-3"><ContractStatusBadge status={c.status} /></td>
                  <td className="px-4 py-3 text-muted-foreground">{c.currency}</td>
                  <td className="px-4 py-3 font-medium">
                    {c.totalAmount ? `${CURRENCY_SYMBOLS[c.currency] ?? c.currency}${Number(c.totalAmount).toLocaleString()}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.startDate ? format(new Date(c.startDate), "MMM d, yyyy") : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.endDate ? format(new Date(c.endDate), "MMM d, yyyy") : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{format(new Date(c.createdAt), "MMM d, yyyy")}</td>
                  <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-muted-foreground" /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col">
          {selected && (
            <>
              <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
                <SheetTitle className="text-lg">{selected.contractNumber}</SheetTitle>
                <ContractStatusBadge status={selected.status} />
              </SheetHeader>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                <TabsList className="shrink-0 mx-6 mt-4 w-auto justify-start bg-muted/60 p-1 rounded-lg h-9">
                  {["overview", "services", "documents", "accounting", "activity"].map(t => (
                    <TabsTrigger key={t} value={t} className="text-xs capitalize px-3 h-7">{t}</TabsTrigger>
                  ))}
                </TabsList>

                <div className="flex-1 overflow-y-auto">
                  <TabsContent value="overview" className="p-6 m-0 space-y-4">
                    <dl className="grid grid-cols-2 gap-4">
                      <DetailRow label="Contract #" value={selected.contractNumber} />
                      <DetailRow label="Status" value={selected.status} />
                      <DetailRow label="Currency" value={selected.currency} />
                      <DetailRow label="Total Amount" value={selected.totalAmount ? `${CURRENCY_SYMBOLS[selected.currency] ?? ""}${Number(selected.totalAmount).toLocaleString()}` : undefined} />
                      <DetailRow label="Start Date" value={selected.startDate ? format(new Date(selected.startDate), "MMM d, yyyy") : undefined} />
                      <DetailRow label="End Date" value={selected.endDate ? format(new Date(selected.endDate), "MMM d, yyyy") : undefined} />
                      <DetailRow label="Created" value={format(new Date(selected.createdAt), "MMM d, yyyy")} />
                      <DetailRow label="Updated" value={format(new Date(selected.updatedAt), "MMM d, yyyy")} />
                    </dl>
                  </TabsContent>

                  {["services", "documents", "accounting", "activity"].map(tab => (
                    <TabsContent key={tab} value={tab} className="p-6 m-0">
                      <div className="text-center py-12 text-muted-foreground text-sm">
                        <FileText className="w-8 h-8 mx-auto mb-3 opacity-30" />
                        <p className="capitalize">{tab} details will appear here</p>
                      </div>
                    </TabsContent>
                  ))}
                </div>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
