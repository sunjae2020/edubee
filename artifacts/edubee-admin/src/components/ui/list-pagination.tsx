import { ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

interface ListPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  label?: string;
}

export function ListPagination({ page, pageSize, total, onChange, onPageSizeChange, label }: ListPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between py-3 border-t border-[#E8E6E2]">
      <span className="text-xs text-[#A8A29E]">
        Showing {start}–{end} of {total}{label ? ` ${label}` : ""}
      </span>
      <div className="flex items-center gap-4">
        {onPageSizeChange && (
          <div className="flex items-center gap-2 text-xs text-[#A8A29E]">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={e => onPageSizeChange(Number(e.target.value))}
              className="h-7 rounded-lg border border-[#E8E6E2] text-xs px-2 pr-6 focus:outline-none focus:border-(--e-orange) bg-white text-[#1C1917] appearance-none cursor-pointer"
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23A8A29E' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 6px center" }}
            >
              {PAGE_SIZE_OPTIONS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onChange(page - 1)}
            disabled={page === 1}
            className="w-7 h-7 rounded-lg flex items-center justify-center border border-[#E8E6E2] text-[#A8A29E] hover:bg-[#F4F3F1] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs px-2 text-[#57534E] tabular-nums">{page} / {totalPages}</span>
          <button
            onClick={() => onChange(page + 1)}
            disabled={page === totalPages}
            className="w-7 h-7 rounded-lg flex items-center justify-center border border-[#E8E6E2] text-[#A8A29E] hover:bg-[#F4F3F1] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
