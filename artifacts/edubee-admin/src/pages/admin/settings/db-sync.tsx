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
    try { return new Date(iso).toLocaleString("ko-KR"); } catch { return iso ?? "-"; }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Database className="size-6" />
          데이터베이스 동기화
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          개발 DB 데이터를 스냅샷으로 저장하고, 프로덕션에 적용합니다.
        </p>
      </div>

      {/* 현재 스냅샷 상태 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="size-4" />
              현재 스냅샷 (dev_seed.sql)
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={fetchStatus} disabled={loadingStatus}>
              <RefreshCw className={`size-3.5 ${loadingStatus ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingStatus ? (
            <p className="text-sm text-muted-foreground">불러오는 중...</p>
          ) : status?.exists ? (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">파일 크기</p>
                <p className="font-medium">{status.sizeKb?.toLocaleString()} KB</p>
              </div>
              <div>
                <p className="text-muted-foreground">총 줄 수</p>
                <p className="font-medium">{status.lineCount?.toLocaleString()}줄</p>
              </div>
              <div>
                <p className="text-muted-foreground">생성 시각</p>
                <p className="font-medium">{formatDate(status.generatedAt)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">파일 수정일</p>
                <p className="font-medium">{formatDate(status.modifiedAt)}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">스냅샷 파일이 없습니다. 먼저 내보내기를 실행하세요.</p>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Step 1: 내보내기 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="size-4" />
            Step 1 — 개발 DB 스냅샷 생성
          </CardTitle>
          <CardDescription>
            현재 데이터베이스 전체를 <code className="text-xs bg-muted px-1 rounded">dev_seed.sql</code> 파일로 내보냅니다.
            이 파일은 배포 시 프로덕션에 자동 적용됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert>
            <AlertTriangle className="size-4" />
            <AlertDescription className="text-xs">
              내보내기는 현재 데이터베이스 전체를 덤프합니다.
              DB 크기에 따라 30초~2분이 소요될 수 있습니다.
            </AlertDescription>
          </Alert>

          <Button onClick={handleExport} disabled={exportLoading} className="gap-2">
            {exportLoading
              ? <><RefreshCw className="size-4 animate-spin" /> 내보내는 중...</>
              : <><Download className="size-4" /> DB 스냅샷 생성</>
            }
          </Button>

          {exportResult && (
            <div className={`rounded-md border p-3 text-sm space-y-1 ${exportResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
              <div className="flex items-center gap-2 font-medium">
                {exportResult.success
                  ? <><CheckCircle2 className="size-4 text-green-600" /> 스냅샷 생성 완료</>
                  : <><XCircle className="size-4 text-red-600" /> 생성 실패</>
                }
                {exportResult.elapsed != null && (
                  <Badge variant="outline" className="ml-auto gap-1 text-xs">
                    <Clock className="size-3" />{formatTime(exportResult.elapsed)}
                  </Badge>
                )}
              </div>
              {exportResult.fileSize && (
                <p className="text-muted-foreground text-xs">파일 크기: {exportResult.fileSize}</p>
              )}
              {exportResult.error && (
                <p className="text-red-700 text-xs font-mono">{exportResult.error}</p>
              )}
              {exportResult.success && (
                <p className="text-green-700 text-xs">
                  배포(Publish)하면 프로덕션에 자동 적용됩니다. 또는 Step 2로 즉시 반영하세요.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: 프로덕션 즉시 임포트 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="size-4" />
            Step 2 — 현재 DB에 즉시 임포트
          </CardTitle>
          <CardDescription>
            저장된 스냅샷을 현재 데이터베이스에 즉시 적용합니다.
            프로덕션 환경에서 실행 시 프로덕션 DB에 반영됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertDescription className="text-xs">
              <strong>주의:</strong> 기존 데이터가 모두 삭제되고 스냅샷 데이터로 교체됩니다.
              이 작업은 되돌릴 수 없습니다.
            </AlertDescription>
          </Alert>

          {!status?.exists && (
            <p className="text-sm text-muted-foreground">스냅샷이 없습니다. 먼저 Step 1을 실행하세요.</p>
          )}

          <div className="flex gap-2 flex-wrap">
            <Button
              variant="destructive"
              onClick={handleImport}
              disabled={importLoading || !status?.exists}
              className="gap-2"
            >
              {importLoading
                ? <><RefreshCw className="size-4 animate-spin" /> 임포트 중...</>
                : importConfirm
                  ? <><AlertTriangle className="size-4" /> 정말 실행하시겠습니까?</>
                  : <><Upload className="size-4" /> 현재 DB에 스냅샷 임포트</>
              }
            </Button>
            {importConfirm && (
              <Button variant="outline" onClick={() => setImportConfirm(false)}>취소</Button>
            )}
          </div>

          {importResult && (
            <div className={`rounded-md border p-3 text-sm space-y-1 ${importResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
              <div className="flex items-center gap-2 font-medium">
                {importResult.success
                  ? <><CheckCircle2 className="size-4 text-green-600" /> 임포트 성공</>
                  : <><XCircle className="size-4 text-red-600" /> 임포트 실패</>
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

      {/* 안내 */}
      <Card className="bg-muted/40">
        <CardContent className="pt-4 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground text-sm">권장 워크플로</p>
          <ol className="list-decimal list-inside space-y-1 mt-2">
            <li>개발 환경에서 <strong>Step 1: 스냅샷 생성</strong> 실행</li>
            <li>Publish(배포) → 프로덕션 서버가 시작 시 자동 임포트</li>
            <li>즉시 적용이 필요한 경우 프로덕션 어드민에서 <strong>Step 2: 즉시 임포트</strong> 실행</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
