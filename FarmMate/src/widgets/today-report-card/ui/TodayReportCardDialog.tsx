import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, Share2, Sparkles } from "lucide-react";

function FarmReportGeneratingPlaceholder() {
  return (
    <div
      className="relative w-full h-full overflow-hidden bg-[#F3F5E0]/40"
      role="status"
      aria-live="polite"
    >
      <div
        className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-primary/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-primary/5 blur-3xl"
        aria-hidden
      />
      <div className="relative flex h-full flex-col items-center justify-center px-6 py-8">
        <div className="mb-5 flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-2xl bg-white/90 shadow-lg shadow-primary/8">
          <Sparkles className="h-9 w-9 text-primary" strokeWidth={1.5} aria-hidden />
        </div>
        <h3 className="text-center text-[0.95rem] font-semibold tracking-tight text-foreground">
          농장 레포트를 만들고 있어요
        </h3>
        <p className="mt-2 max-w-[248px] text-center text-sm leading-relaxed text-muted-foreground">
          저장해서 자랑할 수 있는 카드로 정리 중이에요.
        </p>
        <div className="mt-7 flex items-center gap-1.5" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-2 w-2 rounded-full bg-primary/35 animate-pulse"
              style={{ animationDelay: `${i * 180}ms`, animationDuration: "1.2s" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

type TodayReportCardDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string | null;
  imageBlobAvailable: boolean;
  showGeneratingNotice?: boolean;
  onDownload: () => void;
  onShare: () => void;
};

export function TodayReportCardDialog({
  open,
  onOpenChange,
  imageUrl,
  imageBlobAvailable,
  showGeneratingNotice = false,
  onDownload,
  onShare,
}: TodayReportCardDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92dvh,720px)] w-[min(440px,calc(100vw-24px))] max-w-[min(440px,calc(100vw-24px))] flex-col gap-0 overflow-hidden rounded-[22px] border-0 bg-white p-0 shadow-2xl shadow-black/10">
        <div className="relative shrink-0 bg-[#F3F5E0]/70 px-5 pb-4 pt-11 sm:px-6 sm:pt-12">
          <DialogHeader className="space-y-1.5 text-center sm:text-center">
            <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
              오늘의 농장 레포트
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed text-muted-foreground">
              오늘의 농장 기록을 한 장으로 담았어요.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[#F2F3F1] px-3 py-4 sm:px-5">
          <div className="flex min-h-[min(48vh,400px)] w-full items-center justify-center">
            <div className="w-full overflow-hidden rounded-[18px] bg-white p-2 sm:p-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
              <div
                className="aspect-[437/632] w-full overflow-hidden rounded-[14px] bg-white"
                aria-label="오늘의 농장 리포트 카드 미리보기"
              >
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="오늘의 농장 리포트 카드"
                    className="h-full w-full object-contain"
                  />
                ) : showGeneratingNotice ? (
                  <FarmReportGeneratingPlaceholder />
                ) : (
                  <div className="h-full w-full animate-pulse bg-[#F3F5E0]/50" />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 gap-2.5 bg-white px-4 py-4 sm:px-6">
          <Button
            type="button"
            className="h-11 flex-1 gap-2 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/18 hover:bg-primary/90"
            onClick={onDownload}
            disabled={!imageBlobAvailable}
          >
            <Download className="h-4 w-4 shrink-0 opacity-95" aria-hidden />
            이미지 저장
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-11 flex-1 gap-2 rounded-2xl bg-[#F3F5E0] text-sm font-semibold text-primary hover:bg-[#E9EECF]"
            onClick={onShare}
            disabled={!imageBlobAvailable}
          >
            <Share2 className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
            공유하기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
