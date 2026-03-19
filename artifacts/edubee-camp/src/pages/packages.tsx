import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { ListPagination } from "@/components/ui/list-pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Package as PackageIcon, Globe, Clock, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const PAGE_SIZE = 20;

const COUNTRY_FLAG: Record<string, string> = {
  AU: "🇦🇺", PH: "🇵🇭", SG: "🇸🇬", TH: "🇹🇭", KR: "🇰🇷", JP: "🇯🇵", GB: "🇬🇧", US: "🇺🇸",
};

interface PkgRow {
  id: string;
  packageGroupId: string;
  name: string;
  durationDays: number;
  maxParticipants?: number | null;
  priceAud?: string | null;
  priceUsd?: string | null;
  priceKrw?: string | null;
  priceJpy?: string | null;
  priceThb?: string | null;
  pricePhp?: string | null;
  priceSgd?: string | null;
  priceGbp?: string | null;
  status?: string;
  createdAt?: string;
  groupNameEn?: string | null;
  groupNameKo?: string | null;
  groupLocation?: string | null;
  groupCountryCode?: string | null;
  groupStatus?: string | null;
}

function fmtPrice(val: string | null | undefined, decimals = 0) {
  if (!val) return null;
  const n = parseFloat(val);
  if (isNaN(n)) return null;
  return n.toLocaleString("en-AU", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export default function Packages() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["packages-list", search, statusFilter, page],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        ...(search ? { search } : {}),
        ...(statusFilter !== "all" ? { status: statusFilter } : {}),
      });
      return axios.get(`${BASE}/api/packages?${params}`).then(r => r.data);
    },
  });

  const pkgs: PkgRow[] = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  return (
    <div className="space-y-4">
      <ListToolbar
        search={search}
        onSearch={v => { setSearch(v); setPage(1); }}
        total={total}
        statuses={["active", "inactive", "archived"]}
        statusLabels={{ active: "Active", inactive: "Inactive", archived: "Archived" }}
        activeStatus={statusFilter}
        onStatusChange={v => { setStatusFilter(v); setPage(1); }}
      />

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Package Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Package Group</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Days</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Max</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">🇦🇺 AUD</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">🇰🇷 KRW</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">🇯🇵 JPY</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">🇺🇸 USD</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i} className="border-b last:border-0">
                    {[...Array(11)].map((_, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : pkgs.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-16 text-center">
                    <PackageIcon className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
                    <p className="text-muted-foreground text-sm">No packages found</p>
                    {search && (
                      <button onClick={() => setSearch("")} className="mt-2 text-xs text-primary underline">
                        Clear search
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                pkgs.map(pkg => (
                  <tr
                    key={pkg.id}
                    className="border-b last:border-0 hover:bg-[#FEF0E3]/40 cursor-pointer transition-colors"
                    onClick={() => setLocation(`${BASE}/admin/package-groups/${pkg.packageGroupId}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{pkg.name}</div>
                    </td>
                    <td className="px-4 py-3">
                      {pkg.groupNameEn ? (
                        <div>
                          <div className="flex items-center gap-1.5 text-sm">
                            {pkg.groupCountryCode && (
                              <span>{COUNTRY_FLAG[pkg.groupCountryCode] ?? <Globe className="w-3.5 h-3.5" />}</span>
                            )}
                            <span className="font-medium text-[#F5821F]">{pkg.groupNameEn}</span>
                          </div>
                          {pkg.groupNameKo && (
                            <div className="text-[11px] text-muted-foreground mt-0.5">{pkg.groupNameKo}</div>
                          )}
                          {pkg.groupLocation && (
                            <div className="text-[11px] text-muted-foreground">{pkg.groupLocation}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-sm">{pkg.durationDays}d</td>
                    <td className="px-4 py-3 text-center text-muted-foreground text-sm">
                      {pkg.maxParticipants ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm">
                      {fmtPrice(pkg.priceAud, 0) ? (
                        <span className="text-foreground">A${fmtPrice(pkg.priceAud, 0)}</span>
                      ) : <span className="text-muted-foreground/50">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm">
                      {fmtPrice(pkg.priceKrw, 0) ? (
                        <span className="text-foreground">₩{fmtPrice(pkg.priceKrw, 0)}</span>
                      ) : <span className="text-muted-foreground/50">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm">
                      {fmtPrice(pkg.priceJpy, 0) ? (
                        <span className="text-foreground">¥{fmtPrice(pkg.priceJpy, 0)}</span>
                      ) : <span className="text-muted-foreground/50">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm">
                      {fmtPrice(pkg.priceUsd, 2) ? (
                        <span className="text-foreground">${fmtPrice(pkg.priceUsd, 2)}</span>
                      ) : <span className="text-muted-foreground/50">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        pkg.status === "active"
                          ? "bg-green-50 text-green-700"
                          : pkg.status === "archived"
                          ? "bg-red-50 text-red-700"
                          : "bg-amber-50 text-amber-700"
                      }`}>
                        {pkg.status === "active"
                          ? <CheckCircle2 className="w-2.5 h-2.5" />
                          : <Clock className="w-2.5 h-2.5" />}
                        {pkg.status ?? "active"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {pkg.createdAt ? format(new Date(pkg.createdAt), "MMM d, yyyy") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 gap-1 text-xs text-muted-foreground hover:text-[#F5821F]"
                        onClick={e => {
                          e.stopPropagation();
                          setLocation(`${BASE}/admin/package-groups/${pkg.packageGroupId}`);
                        }}
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ListPagination page={page} pageSize={PAGE_SIZE} total={total} onChange={p => setPage(p)} />
    </div>
  );
}
