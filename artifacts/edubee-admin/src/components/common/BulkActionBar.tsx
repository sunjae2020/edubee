import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { AlertTriangle, Trash2, ArchiveX } from "lucide-react";

interface BulkActionBarProps {
  count: number;
  onSoftDelete?: () => void | Promise<void>;
  onHardDelete: () => void | Promise<void>;
  isLoading?: boolean;
  softDeleteLabel?: string;
  hardDeleteLabel?: string;
}

export function BulkActionBar({
  count,
  onSoftDelete,
  onHardDelete,
  isLoading,
  softDeleteLabel = "임시 삭제",
  hardDeleteLabel = "영구 삭제",
}: BulkActionBarProps) {
  const [confirmSoft, setConfirmSoft] = useState(false);
  const [confirmHard, setConfirmHard] = useState(false);

  if (count === 0) return null;

  const handleSoft = async () => {
    await onSoftDelete?.();
    setConfirmSoft(false);
  };

  const handleHard = async () => {
    await onHardDelete();
    setConfirmHard(false);
  };

  return (
    <>
      <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
        <span className="text-sm font-medium text-blue-700">{count}개 선택됨</span>
        <div className="ml-auto flex gap-2">
          {onSoftDelete && (
            <Button
              size="sm"
              variant="outline"
              className="border-orange-300 text-orange-700 hover:bg-orange-50"
              onClick={() => setConfirmSoft(true)}
              disabled={isLoading}
            >
              <ArchiveX className="w-4 h-4 mr-1" />
              {softDeleteLabel} ({count})
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="border-red-300 text-red-700 hover:bg-red-50"
            onClick={() => setConfirmHard(true)}
            disabled={isLoading}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            {hardDeleteLabel} ({count})
          </Button>
        </div>
      </div>

      {/* Soft Delete Confirm */}
      <Dialog open={confirmSoft} onOpenChange={setConfirmSoft}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-700">
              <AlertTriangle className="w-5 h-5" />
              임시 삭제 확인
            </DialogTitle>
            <DialogDescription>
              선택한 <strong>{count}개</strong> 항목을 임시 삭제합니다.
              <br />
              삭제된 항목은 상태가 변경되며 목록에서 숨겨집니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmSoft(false)} disabled={isLoading}>
              취소
            </Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700 text-white"
              onClick={handleSoft}
              disabled={isLoading}
            >
              임시 삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hard Delete Confirm */}
      <Dialog open={confirmHard} onOpenChange={setConfirmHard}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              영구 삭제 확인
            </DialogTitle>
            <DialogDescription>
              선택한 <strong>{count}개</strong> 항목을 영구적으로 삭제합니다.
              <br />
              <span className="text-red-600 font-medium">이 작업은 되돌릴 수 없습니다.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmHard(false)} disabled={isLoading}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleHard}
              disabled={isLoading}
            >
              영구 삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
