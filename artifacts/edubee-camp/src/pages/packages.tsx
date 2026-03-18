import { useListPackageGroups } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
          <h1 className="text-3xl font-display font-bold text-foreground">Package Groups</h1>
          <p className="text-muted-foreground mt-1">Manage camp packages and pricing.</p>
        </div>
        <Button className="hover-elevate active-elevate-2 shadow-md shadow-primary/20">
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
            <Card key={group.id} className="hover-elevate transition-all overflow-hidden flex flex-col h-full group">
              <div className="h-40 w-full bg-muted/50 relative overflow-hidden">
                {group.thumbnailUrl ? (
                  <img src={group.thumbnailUrl} alt={group.nameEn} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                    <PackageIcon className="h-10 w-10 mb-2 opacity-20" />
                    <span className="text-sm font-medium opacity-50">No Image</span>
                  </div>
                )}
                <div className="absolute top-3 right-3">
                  <StatusBadge status={group.status} />
                </div>
                <div className="absolute bottom-3 left-3 bg-background/90 backdrop-blur-sm text-xs font-semibold px-2 py-1 rounded-md flex items-center">
                  <Globe className="h-3 w-3 mr-1 text-primary" /> {group.countryCode || 'Global'}
                </div>
              </div>
              <CardContent className="pt-5 flex-1 flex flex-col">
                <h3 className="text-lg font-display font-bold text-foreground line-clamp-1">{group.nameEn}</h3>
                {group.location && (
                  <p className="text-sm text-muted-foreground flex items-center mt-1">
                    <MapPin className="h-3 w-3 mr-1" /> {group.location}
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-3 line-clamp-2 flex-1">
                  {group.descriptionEn || 'No description provided.'}
                </p>
                <div className="mt-6 pt-4 border-t border-border flex justify-between items-center">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Packages inside</span>
                  <Button variant="outline" size="sm" className="hover-elevate">Manage</Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {!data?.data.length && (
            <div className="col-span-full py-12 text-center border-2 border-dashed border-border rounded-xl">
              <PackageIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-foreground">No Packages Found</h3>
              <p className="text-muted-foreground">Get started by creating a new package group.</p>
              <Button variant="outline" className="mt-4 hover-elevate">Create First Package</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
