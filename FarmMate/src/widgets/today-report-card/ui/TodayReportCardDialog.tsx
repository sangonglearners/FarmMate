import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

type TodayReportCardDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string | null;
  imageBlobAvailable: boolean;
  onDownload: () => void;
  onShare: () => void;
};

export function TodayReportCardDialog({
  open,
  onOpenChange,
  imageUrl,
  imageBlobAvailable,
  onDownload,
  onShare,
}: TodayReportCardDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[460px] w-[460px] max-h-[90vh] overflow-y-hidden">
        <div className="w-full flex items-center justify-center">
          <div
            className="w-full aspect-[437/560] rounded-xl border border-gray-100 bg-gray-50 overflow-hidden"
            aria-label="오늘의 농장 리포트 카드 미리보기"
          >
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="오늘의 농장 리포트 카드"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full bg-gray-50 animate-pulse" />
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            className="flex-1 rounded-xl bg-[#7CA363] text-white hover:bg-[#6F9258]"
            onClick={onDownload}
            disabled={!imageBlobAvailable}
          >
            이미지 저장
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="flex-1 rounded-xl"
            onClick={onShare}
            disabled={!imageBlobAvailable}
          >
            공유하기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

