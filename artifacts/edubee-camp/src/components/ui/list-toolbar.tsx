import { useState, type ReactNode } from "react";
import { Search, Plus, Download } from "lucide-react";
import { Input } from "./input";
import { Button } from "./button";
import axios from "axios";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
}

interface ListToolbarProps {
  search: string;
  onSearch: (v: string) => void;
  statuses?: string[];
  statusLabels?: Record<string, string>;
  activeStatus?: string;
  onStatusChange?: (s: string) => void;
  total: number;
  addLabel?: string;
  onAdd?: () => void;
  filterLabel?: string;
  csvExportTable?: string;
  children?: ReactNode;
}

export function ListToolbar({
  search, onSearch, statuses = [], statusLabels, activeStatus = "all", onStatusChange,
  total, addLabel, onAdd, filterLabel, csvExportTable, children,
}: ListToolbarProps) {
  const [exporting, setExporting] = useState(false);

  const doExport = async () => {
    if (!csvExportTable) return;
    setExporting(true);
    try {
      const resp = await axios.post(`${BASE}/api/data-manager/export/${csvExportTable}`, {}, { responseType: "blob" });
      const today = new Date().toISOString().slice(0, 10);
      downloadBlob(resp.data, `${csvExportTable}_${today}.csv`);
    } catch {
      alert("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:flex-wrap">
      <div className="relative flex-1 min-w-40 max-w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search…"
          value={search}
          onChange={e => onSearch(e.target.value)}
          className="pl-9 h-9 text-sm bg-background"
        />
      </div>

      {children}

      {statuses.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={() => onStatusChange?.("all")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
              activeStatus === "all"
                ? "bg-foreground text-background border-foreground"
                : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
            }`}
          >
            {filterLabel ?? "All"}
          </button>
          {statuses.map(s => (
            <button
              key={s}
              onClick={() => onStatusChange?.(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border capitalize ${
                activeStatus === s
                  ? "bg-[#F5821F] text-white border-[#F5821F]"
                  : "border-border text-muted-foreground hover:border-[#F5821F]/50 hover:text-foreground"
              }`}
            >
              {statusLabels?.[s] ?? s.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 sm:ml-auto">
        <span className="text-xs text-muted-foreground shrink-0">{total} result{total !== 1 ? "s" : ""}</span>
        {csvExportTable && (
          <Button size="sm" variant="outline" onClick={doExport} disabled={exporting} className="h-9 gap-1.5 text-sm shrink-0">
            <Download className="w-3.5 h-3.5" />
            {exporting ? "…" : "CSV"}
          </Button>
        )}
        {addLabel && onAdd && (
          <Button size="sm" onClick={onAdd} className="h-9 gap-1.5 text-sm bg-[#F5821F] hover:bg-[#d97706] text-white shrink-0">
            <Plus className="w-4 h-4" /> {addLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
