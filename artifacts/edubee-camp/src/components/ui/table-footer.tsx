import { ChevronLeft, ChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

interface TableFooterProps {
  page: number;
  pageSize: number;
  total: number;
  label?: string;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

export function TableFooter({ page, pageSize, total, label, onPageChange, onPageSizeChange }: TableFooterProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end   = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-white">
      <span className="text-sm text-muted-foreground">
        Showing {start}–{end} of {total}{label ? ` ${label}` : ""}
      </span>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Rows per page:</span>
          <Select
            value={String(pageSize)}
            onValueChange={v => { onPageSizeChange?.(Number(v)); }}
          >
            <SelectTrigger className="h-8 w-[68px] text-sm border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map(n => (
                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="w-7 h-7 rounded border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="min-w-[36px] text-center">{page} / {totalPages}</span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="w-7 h-7 rounded border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
