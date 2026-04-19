import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export type MemoImageSlide = {
  url: string;
  title?: string;
  caption?: string;
};

type MemoImageLightboxProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slides: MemoImageSlide[];
  initialIndex: number;
  /** 슬라이드에 title이 없을 때 상단에 쓸 문구 */
  headerFallback?: string;
};

export function MemoImageLightbox({
  open,
  onOpenChange,
  slides,
  initialIndex,
  headerFallback = "이미지 보기",
}: MemoImageLightboxProps) {
  const safeSlides = slides.filter((s) => s.url);
  const [index, setIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || safeSlides.length === 0) return;
    const clamped = Math.min(Math.max(0, initialIndex), safeSlides.length - 1);
    setIndex(clamped);
  }, [open, initialIndex, safeSlides.length]);

  const goPrev = useCallback(() => {
    setIndex((i) =>
      safeSlides.length <= 1 ? i : (i - 1 + safeSlides.length) % safeSlides.length,
    );
  }, [safeSlides.length]);

  const goNext = useCallback(() => {
    setIndex((i) => (safeSlides.length <= 1 ? i : (i + 1) % safeSlides.length));
  }, [safeSlides.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onOpenChange(false);
        return;
      }
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, goPrev, goNext, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const current = safeSlides[index];
  const barTitle = current?.title?.trim() || headerFallback;

  if (!open || !mounted || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-black/95 text-white"
      role="dialog"
      aria-modal="true"
      aria-label={barTitle}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div
        className="relative flex flex-col max-h-[100dvh] w-full max-w-[min(100vw-1rem,56rem)] mx-auto sm:rounded-lg overflow-hidden border border-white/10 shadow-2xl"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 shrink-0">
          <p className="text-sm font-medium truncate pr-2">{barTitle}</p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-white hover:bg-white/10"
            aria-label="닫기"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="relative flex items-center justify-center min-h-[200px] bg-black flex-1">
          {current?.url ? (
            <img
              src={current.url}
              alt=""
              className="max-h-[min(78vh,800px)] w-auto max-w-full object-contain mx-auto"
            />
          ) : (
            <p className="text-sm text-white/70 p-8">이미지가 없습니다.</p>
          )}

          {safeSlides.length > 1 && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute left-1 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70"
                aria-label="이전 이미지"
                onClick={goPrev}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70"
                aria-label="다음 이미지"
                onClick={goNext}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}
        </div>

        {(current?.caption || safeSlides.length > 1) && (
          <div className="px-3 py-2 border-t border-white/10 text-xs text-white/80 space-y-1 shrink-0">
            {safeSlides.length > 1 && (
              <p>
                {index + 1} / {safeSlides.length}
              </p>
            )}
            {current?.caption ? <p className="text-white/70">{current.caption}</p> : null}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
