import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type TodayReportCardDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string | null; // front
  backImageUrl?: string | null;
  reportGenerating: boolean;
  backImageGenerating?: boolean;
  imageBlobAvailable: boolean;
  backImageBlobAvailable?: boolean;
  onDownload: (side: "front" | "back") => void;
  onShare: (side: "front" | "back") => void;
  loadingText?: string;
};

export function TodayReportCardDialog({
  open,
  onOpenChange,
  imageUrl,
  backImageUrl = null,
  reportGenerating,
  backImageGenerating = false,
  imageBlobAvailable,
  backImageBlobAvailable = imageBlobAvailable,
  onDownload,
  onShare,
  loadingText,
}: TodayReportCardDialogProps) {
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    if (!open) setFlipped(false);
  }, [open]);

  const currentSide: "front" | "back" = flipped ? "back" : "front";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[460px] w-[460px] max-h-[90vh] overflow-y-hidden">
        <DialogHeader className="space-y-1">
          <DialogTitle>오늘의 농장 리포트 카드</DialogTitle>
          <div className="text-xs text-gray-500">
            {loadingText ??
              (reportGenerating
                ? "카드를 생성하는 중이에요..."
                : "아래 이미지를 저장하거나 공유할 수 있어요.")}
          </div>
        </DialogHeader>

        <div
          className="w-full flex items-center justify-center"
          onClick={() => {
            if (!backImageUrl) {
              // back 이미지가 준비되지 않았으면 front만 유지
              return;
            }
            setFlipped((v) => !v);
          }}
          role="button"
          tabIndex={0}
          aria-label="리포트 카드 뒤집기"
        >
          <div
            className="w-full aspect-[437/560] rounded-xl border border-gray-100 bg-gray-50 overflow-hidden"
            style={{ perspective: "1000px" }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                position: "relative",
                transformStyle: "preserve-3d",
                transition: "transform 650ms ease",
                transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
              }}
            >
              {/* front */}
              <div
                style={{
                  backfaceVisibility: "hidden",
                  position: "absolute",
                  inset: 0,
                }}
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

              {/* back */}
              <div
                style={{
                  backfaceVisibility: "hidden",
                  position: "absolute",
                  inset: 0,
                  transform: "rotateY(180deg)",
                }}
              >
                {backImageUrl ? (
                  <img
                    src={backImageUrl}
                    alt="오늘의 농장 리포트 카드(도장)"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-50 animate-pulse" />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            className="flex-1 rounded-xl bg-[#4CAF50] text-white hover:bg-[#43A047]"
            onClick={() => onDownload(currentSide)}
            disabled={currentSide === "front" ? !imageBlobAvailable : !backImageBlobAvailable}
          >
            이미지 저장
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="flex-1 rounded-xl"
            onClick={() => onShare(currentSide)}
            disabled={currentSide === "front" ? !imageBlobAvailable : !backImageBlobAvailable}
          >
            공유하기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

