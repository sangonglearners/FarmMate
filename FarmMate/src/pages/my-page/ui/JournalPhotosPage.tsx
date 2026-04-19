import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Images } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { taskApi } from "@/shared/api/tasks";
import { collectMemoPhotosFromTasks } from "@/shared/utils/task-memo-images";
import { MemoImageLightbox, type MemoImageSlide } from "@/components/memo-image-lightbox";
import { sendPageView } from "@/shared/ga";
import { format, isValid, parseISO } from "date-fns";
import { ko } from "date-fns/locale";

function shortScheduleLabel(dateStr: string) {
  const d = parseISO(dateStr.length > 10 ? dateStr : `${dateStr}T12:00:00`);
  if (!isValid(d)) return "";
  return format(d, "M/d", { locale: ko });
}

export default function JournalPhotosPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  useEffect(() => {
    sendPageView("journal_photos");
  }, []);

  const { data: tasks = [], isLoading, isError } = useQuery({
    queryKey: ["tasks", "journal-photos"],
    queryFn: () => taskApi.getTasks(),
    enabled: !!user,
  });

  const photos = useMemo(() => collectMemoPhotosFromTasks(tasks), [tasks]);

  const slides: MemoImageSlide[] = useMemo(
    () =>
      photos.map((p) => ({
        url: p.url,
        title: p.title,
        caption: `${p.scheduledDate} · ${p.taskType}`,
      })),
    [photos],
  );

  if (!user) {
    return (
      <div className="p-4 space-y-4">
        <Button type="button" variant="ghost" className="-ml-2" onClick={() => setLocation("/my-page")}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          마이페이지
        </Button>
        <p className="text-sm text-gray-600">로그인 후 일지에 첨부한 사진을 모아볼 수 있습니다.</p>
        <Button type="button" onClick={() => setLocation("/login")}>
          로그인
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      <div className="flex items-center gap-2">
        <Button type="button" variant="ghost" size="icon" aria-label="뒤로" onClick={() => setLocation("/my-page")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-lg font-bold text-gray-900">일지 사진 모아보기</h1>
          <p className="text-xs text-gray-500">작업 메모에 넣은 사진만 모았습니다</p>
        </div>
      </div>

      {isLoading && <p className="text-sm text-gray-500">불러오는 중…</p>}
      {isError && (
        <p className="text-sm text-red-600">목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
      )}

      {!isLoading && !isError && photos.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
          <Images className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-600">아직 메모에 사진이 없습니다.</p>
          <p className="text-xs text-gray-400 mt-1">캘린더에서 작업을 등록·수정할 때 메모에 이미지를 추가해 보세요.</p>
        </div>
      )}

      {photos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {photos.map((p, i) => (
            <button
              key={`${p.taskId}-${p.url}-${i}`}
              type="button"
              className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => setPreviewIndex(i)}
            >
              <img src={p.url} alt="" className="w-full h-full object-cover" loading="lazy" />
              <span className="absolute bottom-0 left-0 right-0 bg-black/55 text-[10px] text-white px-1 py-0.5 truncate text-left">
                {shortScheduleLabel(p.scheduledDate) || "·"}
              </span>
            </button>
          ))}
        </div>
      )}

      {previewIndex !== null && slides.length > 0 && (
        <MemoImageLightbox
          open
          onOpenChange={(open) => {
            if (!open) setPreviewIndex(null);
          }}
          slides={slides}
          initialIndex={previewIndex}
          headerFallback="일지 사진"
        />
      )}
    </div>
  );
}
