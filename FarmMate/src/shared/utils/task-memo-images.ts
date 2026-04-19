import type { Task } from "@shared/schema";

const MEMO_IMAGE_URL_RE = /https?:\/\/[^\s)]+?\.(?:png|jpe?g|gif|webp|svg)/gi;

/** 작업 메모(description)에 포함된 이미지 URL 목록 */
export function extractMemoImageUrlsFromText(text: string | null | undefined): string[] {
  if (!text) return [];
  const m = text.match(MEMO_IMAGE_URL_RE);
  return m ? [...m] : [];
}

/** 메모 텍스트에서 이미지 URL만 제거한 본문 */
export function stripMemoImageUrlsFromText(text: string): string {
  return text.replace(MEMO_IMAGE_URL_RE, "").trim();
}

export type TaskMemoPhotoItem = {
  url: string;
  taskId: string;
  title: string;
  scheduledDate: string;
  taskType: string;
};

/** 전체 작업에서 메모 이미지 항목 수집 (최근 일정 우선) */
export function collectMemoPhotosFromTasks(tasks: Task[]): TaskMemoPhotoItem[] {
  const out: TaskMemoPhotoItem[] = [];
  const seen = new Set<string>();

  for (const t of tasks) {
    const urls = extractMemoImageUrlsFromText(t.description ?? undefined);
    for (const url of urls) {
      const key = `${String(t.id)}:${url}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        url,
        taskId: String(t.id),
        title: t.title || t.taskType || "작업",
        scheduledDate: t.scheduledDate,
        taskType: t.taskType || "",
      });
    }
  }

  out.sort((a, b) => {
    if (a.scheduledDate !== b.scheduledDate) {
      return a.scheduledDate < b.scheduledDate ? 1 : -1;
    }
    return a.title.localeCompare(b.title, "ko");
  });

  return out;
}
