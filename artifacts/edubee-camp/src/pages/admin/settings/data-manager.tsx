import { useState, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Download, Upload, History, FileText, Users, Target, ClipboardList,
  Package, DollarSign, Building2, RefreshCw, Layers, CheckCircle2,
  AlertTriangle, XCircle, X, Eye, ChevronDown, ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

const EXPORT_GROUPS = [
  {
    label: "Users & Access",
    icon: Users,
    color: "text-blue-500",
    tables: [
      { key: "users", label: "Users" },
    ],
  },
  {
    label: "Sales",
    icon: Target,
    color: "text-orange-500",
    tables: [
      { key: "leads", label: "Leads" },
      { key: "applications", label: "Applications" },
      { key: "application_participants", label: "Participants" },
    ],
  },
  {
    label: "Contracts",
    icon: ClipboardList,
    color: "text-purple-500",
    tables: [
      { key: "contracts", label: "Contracts" },
      { key: "contract_products", label: "Contract Products" },
    ],
  },
  {
    label: "Services",
    icon: Building2,
    color: "text-teal-500",
    tables: [
      { key: "institute_mgt", label: "Institute" },
      { key: "hotel_mgt", label: "Hotel" },
      { key: "pickup_mgt", label: "Pickup" },
      { key: "tour_mgt", label: "Tour" },
      { key: "settlement_mgt", label: "Settlement" },
    ],
  },
  {
    label: "Finance",
    icon: DollarSign,
    color: "text-green-500",
    tables: [
      { key: "invoices", label: "Invoices" },
      { key: "transactions", label: "Transactions" },
      { key: "receipts", label: "Receipts" },
      { key: "exchange_rates", label: "Exchange Rates" },
    ],
  },
  {
    label: "Packages",
    icon: Layers,
    color: "text-amber-500",
    tables: [
      { key: "package_groups", label: "Package Groups" },
      { key: "packages", label: "Packages" },
      { key: "products", label: "Products" },
    ],
  },
];

const IMPORT_TABLES = [
  { key: "users", label: "Users", icon: "👤" },
  { key: "exchange_rates", label: "Exchange Rates", icon: "💱" },
  { key: "products", label: "Products", icon: "📦" },
  { key: "enrollment_spots", label: "Enrollment Spots", icon: "🎓" },
  { key: "transactions", label: "Transactions", icon: "💳" },
];

export default function DataManagerPage() {
  const [tab, setTab] = useState<"export" | "import" | "history">("export");

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b pb-2">
        {(["export", "import", "history"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2 rounded-t-lg font-medium text-sm transition-colors",
              tab === t
                ? "bg-[#F5821F] text-white"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {t === "export" && "📤 Export"}
            {t === "import" && "📥 Import"}
            {t === "history" && "📋 Import History"}
          </button>
        ))}
      </div>

      {tab === "export" && <ExportTab />}
      {tab === "import" && <ImportTab />}
      {tab === "history" && <HistoryTab />}
    </div>
  );
}

function ExportTab() {
  const { toast } = useToast();
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const { data: counts = {} } = useQuery<Record<string, number>>({
    queryKey: ["data-manager-counts"],
    queryFn: () => axios.get(`${BASE}/api/data-manager/row-counts`).then(r => r.data),
    staleTime: 30000,
  });

  const doExport = async (tableKey: string, label: string) => {
    setLoading(p => ({ ...p, [tableKey]: true }));
    try {
      const resp = await axios.post(
        `${BASE}/api/data-manager/export/${tableKey}`,
        {},
        { responseType: "blob" }
      );
      const today = new Date().toISOString().slice(0, 10);
      downloadBlob(resp.data, `${tableKey}_${today}.csv`);
      toast({ title: `✅ ${label} exported`, description: `${tableKey}_${today}.csv downloaded` });
    } catch (err: any) {
      const msg = err.response?.data ? await err.response.data.text() : err.message;
      toast({ title: "Export failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(p => ({ ...p, [tableKey]: false }));
    }
  };

  return (
    <div className="space-y-6">
      {EXPORT_GROUPS.map((group) => {
        const Icon = group.icon;
        return (
          <div key={group.label}>
            <div className="flex items-center gap-2 mb-3">
              <Icon className={cn("h-4 w-4", group.color)} />
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                {group.label}
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {group.tables.map((tbl) => {
                const rowCount = counts[tbl.key] ?? "…";
                const isLoading = loading[tbl.key];
                return (
                  <Card key={tbl.key} className="border hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-sm">{tbl.label}</div>
                        <Badge variant="secondary" className="mt-1 text-xs">
                          {typeof rowCount === "number" ? rowCount.toLocaleString() : rowCount} rows
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isLoading}
                        onClick={() => doExport(tbl.key, tbl.label)}
                        className="shrink-0"
                      >
                        {isLoading ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : (
                          <Download className="h-3 w-3" />
                        )}
                        <span className="ml-1">CSV</span>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ImportTab() {
  const { toast } = useToast();
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [rowCount, setRowCount] = useState(0);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadPreview = useCallback((f: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split(/\r?\n/).filter(Boolean);
      const nonExample = lines.filter(l => !l.startsWith("#EXAMPLE"));
      if (nonExample.length === 0) return;
      const headers = nonExample[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
      const dataLines = nonExample.slice(1).filter(l => !l.startsWith("#"));
      setRowCount(dataLines.length);
      const rows = dataLines.slice(0, 5).map(l =>
        l.split(",").map(v => v.trim().replace(/^"|"$/g, ""))
      );
      setPreview({ headers, rows });
    };
    reader.readAsText(f);
  }, []);

  const handleFile = (f: File) => {
    if (!f.name.endsWith(".csv")) {
      toast({ title: "Only CSV files allowed", variant: "destructive" });
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast({ title: "File too large (max 5MB)", variant: "destructive" });
      return;
    }
    setFile(f);
    setResult(null);
    loadPreview(f);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const doDownloadTemplate = async () => {
    if (!selectedTable) return;
    try {
      const resp = await axios.get(`${BASE}/api/data-manager/template/${selectedTable}`, { responseType: "blob" });
      downloadBlob(resp.data, `template_${selectedTable}.csv`);
      toast({ title: "Template downloaded" });
    } catch {
      toast({ title: "Failed to download template", variant: "destructive" });
    }
  };

  const doImport = async () => {
    if (!file || !selectedTable) return;
    setImporting(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const resp = await axios.post(`${BASE}/api/data-manager/import/${selectedTable}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(resp.data);
    } catch (err: any) {
      const msg = err.response?.data?.error ?? err.message;
      toast({ title: "Import failed", description: msg, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const downloadErrorCsv = () => {
    if (!result?.errorCsv) return;
    const blob = new Blob([atob(result.errorCsv)], { type: "text/csv" });
    downloadBlob(blob, `errors_${selectedTable}.csv`);
  };

  const clearFile = () => { setFile(null); setPreview(null); setResult(null); setRowCount(0); };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-2 space-y-2">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
          Select Table to Import
        </h3>
        {IMPORT_TABLES.map((t) => (
          <button
            key={t.key}
            onClick={() => { setSelectedTable(t.key); clearFile(); }}
            className={cn(
              "w-full text-left px-4 py-3 rounded-lg border text-sm font-medium transition-colors",
              selectedTable === t.key
                ? "border-[#F5821F] bg-orange-50 text-[#F5821F]"
                : "border-border hover:bg-muted"
            )}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="lg:col-span-3 space-y-4">
        {!selectedTable ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm border rounded-lg">
            Select a table on the left to begin
          </div>
        ) : (
          <>
            <Button
              variant="outline"
              className="border-[#F5821F] text-[#F5821F] hover:bg-orange-50 w-full"
              onClick={doDownloadTemplate}
            >
              <Download className="h-4 w-4 mr-2" />
              Download Template for {IMPORT_TABLES.find(t => t.key === selectedTable)?.label}
            </Button>

            {!file ? (
              <div
                onDrop={onDrop}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onClick={() => inputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors",
                  dragging ? "border-[#F5821F] bg-orange-50" : "border-border hover:border-[#F5821F] hover:bg-muted/40"
                )}
              >
                <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                <p className="font-medium text-sm">Drag CSV file here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">CSV only · max 5MB</p>
                <input ref={inputRef} type="file" accept=".csv" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium truncate">{file.name}</span>
                    <Badge variant="secondary">{rowCount} rows</Badge>
                  </div>
                  <Button size="icon" variant="ghost" onClick={clearFile}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {preview && (
                  <div className="overflow-auto rounded-lg border max-h-52">
                    <table className="text-xs w-full">
                      <thead>
                        <tr className="bg-muted">
                          {preview.headers.map((h, i) => (
                            <th key={i} className="px-2 py-1.5 text-left font-semibold border-r last:border-0 whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.rows.map((row, ri) => (
                          <tr key={ri} className="border-t">
                            {row.map((cell, ci) => (
                              <td key={ci} className="px-2 py-1.5 border-r last:border-0 whitespace-nowrap max-w-[160px] truncate">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <Button
                  className="w-full bg-[#F5821F] hover:bg-[#d97706] text-white"
                  disabled={importing}
                  onClick={doImport}
                >
                  {importing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Importing…
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Import {rowCount} rows
                    </>
                  )}
                </Button>
              </div>
            )}

            {result && (
              <ImportResult result={result} onDownloadError={downloadErrorCsv} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ImportResult({ result, onDownloadError }: { result: any; onDownloadError: () => void }) {
  const { totalRows, successRows, errorRows, errors = [] } = result;
  const isComplete = errorRows === 0 && successRows > 0;
  const isPartial = errorRows > 0 && successRows > 0;
  const isFailed = successRows === 0;

  return (
    <div className={cn(
      "rounded-xl p-4 border space-y-3",
      isComplete && "bg-green-50 border-green-200",
      isPartial && "bg-yellow-50 border-yellow-200",
      isFailed && "bg-red-50 border-red-200",
    )}>
      <div className="flex items-center gap-2">
        {isComplete && <CheckCircle2 className="h-5 w-5 text-green-600" />}
        {isPartial && <AlertTriangle className="h-5 w-5 text-yellow-600" />}
        {isFailed && <XCircle className="h-5 w-5 text-red-600" />}
        <div>
          {isComplete && <p className="font-semibold text-green-800">{successRows} rows imported successfully</p>}
          {isPartial && <p className="font-semibold text-yellow-800">{successRows} imported, {errorRows} failed</p>}
          {isFailed && <p className="font-semibold text-red-800">Import failed — {errorRows} errors</p>}
          <p className="text-xs text-muted-foreground mt-0.5">Total: {totalRows} rows processed</p>
        </div>
      </div>
      {errorRows > 0 && (
        <Button size="sm" variant="outline" onClick={onDownloadError} className="border-yellow-400">
          <Download className="h-3 w-3 mr-1" /> Download Error CSV
        </Button>
      )}
      {errors.length > 0 && (
        <div className="overflow-auto rounded-lg border max-h-52">
          <table className="text-xs w-full">
            <thead>
              <tr className="bg-muted">
                <th className="px-2 py-1.5 text-left border-r">Row #</th>
                <th className="px-2 py-1.5 text-left border-r">Field</th>
                <th className="px-2 py-1.5 text-left">Error</th>
              </tr>
            </thead>
            <tbody>
              {errors.map((err: any, i: number) => (
                <tr key={i} className="border-t bg-red-50">
                  <td className="px-2 py-1.5 border-r">{err.row}</td>
                  <td className="px-2 py-1.5 border-r font-mono">{err.field}</td>
                  <td className="px-2 py-1.5 text-red-700">{err.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function HistoryTab() {
  const { toast } = useToast();
  const [tableFilter, setTableFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: history = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["import-history", tableFilter, statusFilter],
    queryFn: () =>
      axios.get(`${BASE}/api/data-manager/import-history`, {
        params: { tableName: tableFilter || undefined, status: statusFilter || undefined },
      }).then(r => r.data?.data ?? []),
    staleTime: 10000,
  });

  const downloadErrorCsv = async (id: string, tableName: string) => {
    try {
      const resp = await axios.get(`${BASE}/api/data-manager/import-history/${id}/error-csv`, { responseType: "blob" });
      downloadBlob(resp.data, `errors_${tableName}_${id.slice(0, 8)}.csv`);
    } catch {
      toast({ title: "Failed to download error CSV", variant: "destructive" });
    }
  };

  const ALL_TABLES = [...IMPORT_TABLES.map(t => t.key)];
  const STATUS_OPTS = ["completed", "partial", "failed"];

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <select
          value={tableFilter}
          onChange={e => setTableFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All Tables</option>
          {ALL_TABLES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All Statuses</option>
          {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-3 w-3 mr-1" /> Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="h-24 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
      ) : history.length === 0 ? (
        <div className="border rounded-xl p-10 text-center text-muted-foreground">
          <History className="h-8 w-8 mx-auto mb-3 opacity-40" />
          <p>No imports yet. Go to Import tab to get started.</p>
        </div>
      ) : (
        <div className="overflow-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                {["Date", "Table", "Filename", "Total", "✅ Success", "❌ Error", "Status", "By", "Actions"].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((row: any) => (
                <>
                  <tr key={row.id} className="border-t hover:bg-[#FEF0E3]">
                    <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                      {row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs">{row.tableName}</td>
                    <td className="px-3 py-2.5 text-xs max-w-[140px] truncate">{row.filename ?? "—"}</td>
                    <td className="px-3 py-2.5 text-center">{row.totalRows ?? 0}</td>
                    <td className="px-3 py-2.5 text-center text-green-600 font-medium">{row.successRows ?? 0}</td>
                    <td className="px-3 py-2.5 text-center text-red-600 font-medium">{row.errorRows ?? 0}</td>
                    <td className="px-3 py-2.5">
                      <Badge className={cn(
                        "text-xs",
                        row.status === "completed" && "bg-green-100 text-green-700",
                        row.status === "partial" && "bg-yellow-100 text-yellow-700",
                        row.status === "failed" && "bg-red-100 text-red-700",
                      )}>
                        {row.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {row.importerName ?? row.importerEmail ?? "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        {(row.errorRows ?? 0) > 0 && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => setExpanded(expanded === row.id ? null : row.id)}
                              title="View errors"
                            >
                              {expanded === row.id ? <ChevronUp className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => downloadErrorCsv(row.id, row.tableName)}
                              title="Download error CSV"
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expanded === row.id && (
                    <tr className="border-t bg-red-50">
                      <td colSpan={9} className="px-3 py-3">
                        <ErrorDetailPanel importId={row.id} />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ErrorDetailPanel({ importId }: { importId: string }) {
  const { data, isLoading } = useQuery<{ errors: any[] }>({
    queryKey: ["import-errors", importId],
    queryFn: () => axios.get(`${BASE}/api/data-manager/import-history/${importId}/errors`).then(r => r.data),
  });
  if (isLoading) return <p className="text-xs text-muted-foreground">Loading errors…</p>;
  const errors = data?.errors ?? [];
  if (errors.length === 0) return <p className="text-xs text-muted-foreground">No error details stored.</p>;
  return (
    <div className="overflow-auto max-h-48">
      <table className="text-xs w-full">
        <thead>
          <tr className="bg-red-100">
            <th className="px-2 py-1.5 text-left border-r">Row #</th>
            <th className="px-2 py-1.5 text-left border-r">Field</th>
            <th className="px-2 py-1.5 text-left">Error Message</th>
          </tr>
        </thead>
        <tbody>
          {errors.map((e: any, i: number) => (
            <tr key={i} className="border-t">
              <td className="px-2 py-1.5 border-r">{e.row}</td>
              <td className="px-2 py-1.5 border-r font-mono">{e.field}</td>
              <td className="px-2 py-1.5 text-red-700">{e.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
