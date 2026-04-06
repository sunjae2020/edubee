import { useState, useMemo } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

export type SortDir = "asc" | "desc";

interface SortableTh {
  col: string;
  sortBy: string;
  sortDir: SortDir;
  onSort: (col: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function SortableTh({ col, sortBy, sortDir, onSort, children, className = "" }: SortableTh) {
  const active = sortBy === col;
  return (
    <th
      className={`cursor-pointer select-none group ${className}`}
      onClick={() => onSort(col)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        <span className="opacity-50 group-hover:opacity-100 transition-opacity">
          {active ? (
            sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />
          ) : (
            <ChevronsUpDown size={12} />
          )}
        </span>
      </span>
    </th>
  );
}

export function useSortState(defaultCol = "createdAt", defaultDir: SortDir = "desc") {
  const [sortBy, setSortBy]   = useState(defaultCol);
  const [sortDir, setSortDir] = useState<SortDir>(defaultDir);

  const onSort = (col: string) => {
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir("asc");
    }
  };

  return { sortBy, sortDir, onSort };
}

function getVal(obj: Record<string, any>, key: string): any {
  return key.split(".").reduce((acc, k) => acc?.[k], obj);
}

export function useSorted<T extends Record<string, any>>(
  data: T[],
  sortBy: string,
  sortDir: SortDir,
): T[] {
  return useMemo(() => {
    if (!data?.length) return data ?? [];
    return [...data].sort((a, b) => {
      if (sortBy) {
        const av = getVal(a, sortBy);
        const bv = getVal(b, sortBy);
        if (av != null || bv != null) {
          if (av == null) return 1;
          if (bv == null) return -1;
          const cmp =
            typeof av === "number" && typeof bv === "number"
              ? av - bv
              : String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: "base" });
          if (cmp !== 0) return sortDir === "asc" ? cmp : -cmp;
        }
      }
      const ua = getVal(a, "updatedAt") ?? getVal(a, "updatedOn") ?? getVal(a, "createdAt") ?? getVal(a, "createdOn");
      const ub = getVal(b, "updatedAt") ?? getVal(b, "updatedOn") ?? getVal(b, "createdAt") ?? getVal(b, "createdOn");
      if (ua == null && ub == null) return 0;
      if (ua == null) return 1;
      if (ub == null) return -1;
      return -String(ua).localeCompare(String(ub), undefined, { numeric: true, sensitivity: "base" });
    });
  }, [data, sortBy, sortDir]);
}
