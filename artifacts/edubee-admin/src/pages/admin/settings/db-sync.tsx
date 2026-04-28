import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Database, Upload, Download, RefreshCw,
  CheckCircle2, XCircle, AlertTriangle, Clock, FileText
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface SyncStatus {
  exists: boolean;
  sizeKb?: number;
  lineCount?: number;
  generatedAt?: string;
  modifiedAt?: string;
}

interface OperationResult {
  success: boolean;
  elapsed?: number;
  fileSize?: string;
  errors?: string[];
  error?: string;
}

export default function DbSync() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  const [exportResult, setExportResult] = useState<OperationResult | null>(null);
  const [importResult, setImportResult] = useState<OperationResult | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importConfirm, setImportConfirm] = useState(false);

  const fetchStatus = async () => {
    setLoadingStatus(true);
    try {
      const res = await axios.get(`${BASE}/api/admin/db-sync-status`);
      setStatus(res.data as SyncStatus);
    } catch {
      setStatus(null);
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => { fetchStatus(); }, []);

  const handleExport = async () => {
    setExportLoading(true);
    setExportResult(null);
    try {
      const res = await axios.post(`${BASE}/api/admin/export-dev-data`, {});
      setExportResult(res.data as OperationResult);
      fetchStatus();
    } catch (err: any) {
      setExportResult({
        success: false,
        error: err?.response?.data?.error ?? err.message,
      });
    } finally {
      setExportLoading(false);
    }
  };

  const handleImport = async () => {
    if (!importConfirm) { setImportConfirm(true); return; }
    setImportLoading(true);
    setImportResult(null);
    setImportConfirm(false);
    try {
      const res = await axios.post(`${BASE}/api/admin/import-dev-data`, {});
      setImportResult(res.data as OperationResult);
    } catch (err: any) {
      setImportResult({
        success: false,
        error: err?.response?.data?.error ?? err.message,
        errors: err?.response?.data?.errors,
      });
    } finally {
      setImportLoading(false);
    }
  };

  const formatTime = (ms?: number) =>
    ms != null ? (ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`) : "-";

  const formatDate = (iso?: string | null) => {
    if (!iso) return "-";
    try { return new Date(iso).toLocaleString("en-AU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return iso ?? "-"; }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Database className="size-6" />
          Database Sync
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Save a snapshot of the development DB and apply it to production.
        </p>
      </div>

      {/* Current snapshot status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="size-4" />
              Current Snapshot (dev_seed.sql)
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={fetchStatus} disabled={loadingStatus}>
              <RefreshCw className={`size-3.5 ${loadingStatus ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingStatus ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : status?.exists ? (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">File Size</p>
                <p className="font-medium">{status.sizeKb?.toLocaleString()} KB</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Lines</p>
                <p className="font-medium">{status.lineCount?.toLocaleString()} lines</p>
              </div>
              <div>
                <p className="text-muted-foreground">Created At</p>
                <p className="font-medium">{formatDate(status.generatedAt)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">File Modified</p>
                <p className="font-medium">{formatDate(status.modifiedAt)}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No snapshot file found. Run an export first.</p>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Step 1: Export */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="size-4" />
            Step 1 — Create Dev DB Snapshot
          </CardTitle>
          <CardDescription>
            Exports the entire current database to a <code className="text-xs bg-muted px-1 rounded">dev_seed.sql</code> file.
            This file is automatically applied to production on deployment.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert>
            <AlertTriangle className="size-4" />
            <AlertDescription className="text-xs">
              The export dumps the entire current database.
              This may take 30 seconds to 2 minutes depending on DB size.
            </AlertDescription>
          </Alert>

          <Button onClick={handleExport} disabled={exportLoading} className="gap-2">
            {exportLoading
              ? <><RefreshCw className="size-4 animate-spin" /> Exporting...</>
              : <><Download className="size-4" /> Create DB Snapshot</>
            }
          </Button>

          {exportResult && (
            <div className={`rounded-md border p-3 text-sm space-y-1 ${exportResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
              <div className="flex items-center gap-2 font-medium">
                {exportResult.success
                  ? <><CheckCircle2 className="size-4 text-green-600" /> Snapshot created successfully</>
                  : <><XCircle className="size-4 text-red-600" /> Creation failed</>
                }
                {exportResult.elapsed != null && (
                  <Badge variant="outline" className="ml-auto gap-1 text-xs">
                    <Clock className="size-3" />{formatTime(exportResult.elapsed)}
                  </Badge>
                )}
              </div>
              {exportResult.fileSize && (
                <p className="text-muted-foreground text-xs">File size: {exportResult.fileSize}</p>
              )}
              {exportResult.error && (
                <p className="text-red-700 text-xs font-mono">{exportResult.error}</p>
              )}
              {exportResult.success && (
                <p className="text-green-700 text-xs">
                  Deploy (Publish) to apply automatically to production, or proceed to Step 2 to apply immediately.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Immediate production import */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="size-4" />
            Step 2 — Import Snapshot to Current DB
          </CardTitle>
          <CardDescription>
            Immediately applies the saved snapshot to the current database.
            When run in production, it will be applied to the production DB.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertDescription className="text-xs">
              <strong>Warning:</strong> All existing data will be deleted and replaced with the snapshot data.
              This action cannot be undone.
            </AlertDescription>
          </Alert>

          {!status?.exists && (
            <p className="text-sm text-muted-foreground">No snapshot available. Run Step 1 first.</p>
          )}

          <div className="flex gap-2 flex-wrap">
            <Button
              variant="destructive"
              onClick={handleImport}
              disabled={importLoading || !status?.exists}
              className="gap-2"
            >
              {importLoading
                ? <><RefreshCw className="size-4 animate-spin" /> Importing...</>
                : importConfirm
                  ? <><AlertTriangle className="size-4" /> Are you sure?</>
                  : <><Upload className="size-4" /> Import Snapshot to Current DB</>
              }
            </Button>
            {importConfirm && (
              <Button variant="outline" onClick={() => setImportConfirm(false)}>Cancel</Button>
            )}
          </div>

          {importResult && (
            <div className={`rounded-md border p-3 text-sm space-y-1 ${importResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
              <div className="flex items-center gap-2 font-medium">
                {importResult.success
                  ? <><CheckCircle2 className="size-4 text-green-600" /> Import successful</>
                  : <><XCircle className="size-4 text-red-600" /> Import failed</>
                }
                {importResult.elapsed != null && (
                  <Badge variant="outline" className="ml-auto gap-1 text-xs">
                    <Clock className="size-3" />{formatTime(importResult.elapsed)}
                  </Badge>
                )}
              </div>
              {importResult.error && (
                <p className="text-red-700 text-xs font-mono">{importResult.error}</p>
              )}
              {importResult.errors?.length ? (
                <pre className="text-xs text-red-700 bg-red-100 p-2 rounded overflow-auto max-h-32">
                  {importResult.errors.join("\n")}
                </pre>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Guide */}
      <Card className="bg-muted/40">
        <CardContent className="pt-4 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground text-sm">Recommended Workflow</p>
          <ol className="list-decimal list-inside space-y-1 mt-2">
            <li>Run <strong>Step 1: Create Snapshot</strong> in the development environment</li>
            <li>Publish (deploy) → the production server auto-imports on startup</li>
            <li>For immediate application, run <strong>Step 2: Import Snapshot</strong> from the production admin</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
