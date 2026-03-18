import { useListPackageGroups } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Plus, Package as PackageIcon, Globe, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Packages() {
  const { data, isLoading } = useListPackageGroups();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: "#1C1917" }}>Package Groups</h1>
          <p className="mt-1 text-sm" style={{ color: "#57534E" }}>Manage camp packages and pricing.</p>
        </div>
        <Button className="font-semibold">
          <Plus className="mr-2 h-4 w-4" /> New Package Group
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {data?.data.map((group) => (
            <div
              key={group.id}
              className="rounded-xl overflow-hidden flex flex-col h-full group transition-all duration-200 cursor-pointer"
              style={{
                background: "#FFFFFF",
                border: "1px solid #E8E6E2",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.10)";
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)";
                (e.currentTarget as HTMLDivElement).style.transform = "";
              }}
            >
              <div className="h-40 w-full relative overflow-hidden" style={{ background: "#F4F3F1" }}>
                {group.thumbnailUrl ? (
                  <img src={group.thumbnailUrl} alt={group.nameEn} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center" style={{ color: "#A8A29E" }}>
                    <PackageIcon className="h-10 w-10 mb-2 opacity-20" />
                    <span className="text-sm font-medium opacity-50">No Image</span>
                  </div>
                )}
                <div className="absolute top-3 right-3">
                  <StatusBadge status={group.status} />
                </div>
                <div
                  className="absolute bottom-3 left-3 text-xs font-semibold px-2 py-1 rounded-lg flex items-center"
                  style={{ background: "rgba(255,255,255,0.92)", color: "#1C1917" }}
                >
                  <Globe className="h-3 w-3 mr-1" style={{ color: "#F5821F" }} /> {group.countryCode || 'Global'}
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="text-lg font-semibold line-clamp-1" style={{ color: "#1C1917" }}>{group.nameEn}</h3>
                {group.location && (
                  <p className="text-sm flex items-center mt-1" style={{ color: "#57534E" }}>
                    <MapPin className="h-3 w-3 mr-1" /> {group.location}
                  </p>
                )}
                <p className="text-sm mt-3 line-clamp-2 flex-1" style={{ color: "#57534E" }}>
                  {group.descriptionEn || 'No description provided.'}
                </p>
                <div
                  className="mt-6 pt-4 flex justify-between items-center"
                  style={{ borderTop: "1px solid #E8E6E2" }}
                >
                  <span className="text-xs font-medium uppercase tracking-[0.05em]" style={{ color: "#A8A29E" }}>Packages inside</span>
                  <Button variant="outline" size="sm">Manage</Button>
                </div>
              </div>
            </div>
          ))}
          {!data?.data.length && (
            <div
              className="col-span-full py-12 text-center rounded-xl"
              style={{ border: "2px dashed #E8E6E2" }}
            >
              <PackageIcon className="w-12 h-12 mx-auto mb-3" style={{ color: "#E8E6E2" }} />
              <h3 className="text-lg font-semibold" style={{ color: "#1C1917" }}>No Packages Found</h3>
              <p className="mt-1 text-sm" style={{ color: "#57534E" }}>Get started by creating a new package group.</p>
              <Button variant="outline" className="mt-4">Create First Package</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
