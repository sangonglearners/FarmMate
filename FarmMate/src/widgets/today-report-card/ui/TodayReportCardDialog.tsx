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
      <DialogContent className="w-[calc(100vw-16px)] max-w-[460px] max-h-[calc(100dvh-16px)] overflow-hidden p-3 sm:p-4 flex flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto">
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
        </div>

        <div className="pt-2 flex gap-2 shrink-0">
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

