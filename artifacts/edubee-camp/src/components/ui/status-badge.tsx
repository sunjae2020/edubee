import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalized = status.toLowerCase().replace(/_/g, ' ');
  
  let variantClass = "bg-muted text-muted-foreground border-transparent";
  
  // Maps statuses to colors
  if (['active', 'approved', 'contracted', 'qualified', 'converted', 'completed', 'confirmed'].includes(normalized)) {
    variantClass = "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/50";
  } else if (['pending', 'under review', 'draft', 'processing', 'new'].includes(normalized)) {
    variantClass = "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50";
  } else if (['rejected', 'cancelled', 'lost', 'disputed'].includes(normalized)) {
    variantClass = "bg-destructive/10 text-destructive border-destructive/20 dark:bg-destructive/20 dark:text-red-400";
  } else if (['interview scheduled', 'contacted', 'in progress'].includes(normalized)) {
    variantClass = "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50";
  }

  return (
    <Badge variant="outline" className={cn("capitalize font-semibold shadow-sm no-default-active-elevate", variantClass, className)}>
      {normalized}
    </Badge>
  );
}
