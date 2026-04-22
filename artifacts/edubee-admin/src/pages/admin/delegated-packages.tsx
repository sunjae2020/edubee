import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import axios from "axios";
import { Building2, Package, MapPin, CalendarCheck, ChevronRight, Loader2 } from "lucide-react";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface DelegatedPackage {
  delegationId: string;
  status: string;
  permissions: { view: boolean; edit: boolean; soft_delete: boolean; manage_finance: boolean };
  grantedAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  packageGroupId: string;
  packageGroupName: string | null;
  location: string | null;
  countryCode: string | null;
  pgStatus: string | null;
  ownerOrgId: string | null;
  ownerOrgName: string | null;
  ownerOrgSubdomain: string | null;
  ownerLogoUrl: string | null;
  ownerFaviconUrl: string | null;
  ownerPrimaryColor: string | null;
  ownerSecondaryColor: string | null;
  ownerAccentColor: string | null;
}

export default function DelegatedPackages() {
  const { data, isLoading } = useQuery<{ success: boolean; data: DelegatedPackage[] }>({
    queryKey: ["my-delegated-packages"],
    queryFn: () => axios.get(`${BASE}/api/my-delegated-packages`).then(r => r.data),
  });

  const items = data?.data ?? [];

  // Collect unique owner orgs for the banner
  const ownerOrgs = items.reduce<{ name: string | null; logoUrl: string | null; color: string | null }[]>((acc, item) => {
    if (!acc.find(o => o.name === item.ownerOrgName)) {
      acc.push({ name: item.ownerOrgName, logoUrl: item.ownerLogoUrl, color: item.ownerPrimaryColor });
    }
    return acc;
  }, []);

  return (
    <div className="space-y-6">
      {/* ── Delegated Access Banner ──────────────────────────────────────── */}
      <div
        className="flex items-start gap-3 px-4 py-3 rounded-xl border text-sm font-medium"
        style={{
          background: "rgba(245,130,31,0.08)",
          borderColor: "rgba(245,130,31,0.3)",
          color: "#92400e",
        }}
      >
        <span className="text-base mt-0.5">⚠️</span>
        <div className="flex-1 min-w-0">
          <strong>Delegated Access</strong> — These Package Groups have been delegated to your organisation.
          You can only access resources within the scope of each delegation.
          {ownerOrgs.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {ownerOrgs.map((org, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  {org.logoUrl ? (
                    <img src={org.logoUrl} alt={org.name ?? ""} className="h-5 w-auto object-contain rounded" style={{ maxWidth: 80 }} />
                  ) : (
                    <Building2 className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span className="text-xs font-semibold">{org.name ?? "—"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--e-text-1)" }}>Delegated Packages</h1>
        <p className="text-sm mt-1" style={{ color: "var(--e-text-3)" }}>
          Package Groups delegated to your organisation for operations management.
        </p>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--e-orange)" }} />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border rounded-xl bg-muted/20">
          <Package className="w-10 h-10 mb-3 opacity-30" style={{ color: "var(--e-text-3)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--e-text-2)" }}>No delegated packages yet.</p>
          <p className="text-xs mt-1" style={{ color: "var(--e-text-3)" }}>
            When another organisation delegates a Package Group to you, it will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map(item => (
            <DelegatedPackageCard key={item.delegationId} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function DelegatedPackageCard({ item }: { item: DelegatedPackage }) {
  const accentColor = item.ownerPrimaryColor ?? "#F5821F";

  const permLabels = [
    item.permissions.view        && { label: "View",    color: "bg-blue-50 text-blue-700 border-blue-200" },
    item.permissions.edit        && { label: "Edit",    color: "bg-green-50 text-green-700 border-green-200" },
    item.permissions.soft_delete && { label: "Delete",  color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
    item.permissions.manage_finance && { label: "Finance", color: "bg-purple-50 text-purple-700 border-purple-200" },
  ].filter(Boolean) as { label: string; color: string }[];

  return (
    <Link href={`/admin/package-groups/${item.packageGroupId}?delegated=1`}>
      <div
        className="border rounded-xl p-4 space-y-3 cursor-pointer transition-all duration-150 hover:shadow-md bg-card"
        style={{ borderColor: "var(--e-border)" }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = accentColor; }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--e-border)"; }}
      >
        {/* Title row */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5 min-w-0">
            <p className="font-semibold text-sm truncate" style={{ color: "var(--e-text-1)" }}>
              {item.packageGroupName ?? "—"}
            </p>
            <div className="flex items-center gap-1 text-xs" style={{ color: "var(--e-text-3)" }}>
              {item.location && (
                <>
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span>{item.location}</span>
                  {item.countryCode && <span>· {item.countryCode}</span>}
                </>
              )}
            </div>
          </div>
          <ChevronRight className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "var(--e-text-3)" }} />
        </div>

        {/* Owner org with logo */}
        <div
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium"
          style={{ background: `${accentColor}14`, color: "#92400e" }}
        >
          {item.ownerLogoUrl ? (
            <img src={item.ownerLogoUrl} alt={item.ownerOrgName ?? ""} className="h-4 w-auto object-contain rounded shrink-0" style={{ maxWidth: 56 }} />
          ) : (
            <Building2 className="w-3.5 h-3.5 shrink-0" />
          )}
          <span className="truncate">
            Delegated by: <strong>{item.ownerOrgName ?? item.ownerOrgSubdomain ?? item.ownerOrgId}</strong>
          </span>
        </div>

        {/* Permission badges */}
        <div className="flex flex-wrap gap-1.5">
          {permLabels.map(p => (
            <span
              key={p.label}
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${p.color}`}
            >
              {p.label}
            </span>
          ))}
        </div>

        {/* Date */}
        <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--e-text-3)" }}>
          <CalendarCheck className="w-3 h-3" />
          <span>Delegated {item.grantedAt ? format(new Date(item.grantedAt), "yyyy-MM-dd") : "—"}</span>
          {item.acceptedAt && (
            <span className="ml-1 text-green-600 font-medium">· Accepted</span>
          )}
        </div>
      </div>
    </Link>
  );
}
