import type { Task } from "@shared/schema";

import type { RecordBadge, RecordBadgeVariant } from "../../../pages/stats/utils/report-card";

type CompletionRow = {
  completed: boolean;
  completedAt: string | null;
};

type BuildRecordBadgesParams = {
  taskCompletionsRange: CompletionRow[];
  allTasks: Task[];
  completionPercent: number;
  plannedCount: number;
  streakDays: number;
};

type Candidate = {
  id: string;
  label: string;
  variant: RecordBadgeVariant;
  priority: number;
};

function localHour(iso: string): number {
  return new Date(iso).getHours();
}

/**
 * 최근 완료 시각 패턴·메모·완료율·연속 기록 등으로 "기록 태그" 후보를 만듭니다.
 * (토스 소비 태그처럼 서비스 이용 패턴을 짧은 배지로 보여 주는 방향)
 */
export function buildRecordBadges({
  taskCompletionsRange,
  allTasks,
  completionPercent,
  plannedCount,
  streakDays,
}: BuildRecordBadgesParams): RecordBadge[] {
  const candidates: Candidate[] = [];

  // 1) 흙을 지키는 농부: 7일 이상 연속 기록
  if (streakDays >= 7) {
    candidates.push({
      id: "steady_farmer",
      label: "흙을 지키는 농부",
      variant: "steady_farmer",
      priority: 100,
    });
  }

  // 2) 아침/밤 패턴: 최근 완료 5건 이상에서 시간대 비중 비교
  const timed = taskCompletionsRange.filter((c) => c.completed && c.completedAt);
  if (timed.length >= 5) {
    let morning = 0;
    let night = 0;
    for (const c of timed) {
      const h = localHour(c.completedAt!);
      if (h >= 5 && h < 10) morning++;
      else if (h >= 22 || h < 5) night++;
    }
    const n = timed.length;
    const morningRatio = morning / n;
    const nightRatio = night / n;
    const canMorning = morning >= 3 && morningRatio >= 0.32;
    const canNight = night >= 3 && nightRatio >= 0.32;

    if (canMorning || canNight) {
      if (morning > night && canMorning) {
        candidates.push({
          id: "morning_farmer",
          label: "아침을 여는 농부",
          variant: "morning_farmer",
          priority: 94,
        });
      } else if (night > morning && canNight) {
        candidates.push({
          id: "night_farmer",
          label: "밤을 지키는 농부",
          variant: "night_farmer",
          priority: 93,
        });
      } else if (canMorning) {
        candidates.push({
          id: "morning_farmer",
          label: "아침을 여는 농부",
          variant: "morning_farmer",
          priority: 94,
        });
      } else if (canNight) {
        candidates.push({
          id: "night_farmer",
          label: "밤을 지키는 농부",
          variant: "night_farmer",
          priority: 93,
        });
      }
    }
  }

  // 3) 오늘을 끝내는 농부: 오늘 할 일 2개 이상 + 완료율 85% 이상
  if (plannedCount >= 2 && completionPercent >= 85) {
    candidates.push({
      id: "finisher_farmer",
      label: "오늘을 끝내는 농부",
      variant: "finisher_farmer",
      priority: 88,
    });
  }

  // 4) 이야기를 남기는 농부: 긴 설명 기록이 많거나 비율이 높음
  const memoRich = allTasks.filter((t) => (t.description?.trim().length ?? 0) >= 36);
  const totalTasks = allTasks.length;
  if (
    memoRich.length >= 4 ||
    (memoRich.length >= 2 && totalTasks > 0 && memoRich.length / totalTasks >= 0.18)
  ) {
    candidates.push({
      id: "story_farmer",
      label: "이야기를 남기는 농부",
      variant: "story_farmer",
      priority: 74,
    });
  }

  // 5) 바쁜 하루의 농부: 오늘 할 일 5개 이상
  if (plannedCount >= 5) {
    candidates.push({
      id: "busy_day_farmer",
      label: "바쁜 하루의 농부",
      variant: "busy_day_farmer",
      priority: 64,
    });
  }

  // 6) 기본값: 위 조건 미충족이지만 최근 기록/오늘 할 일이 있을 때
  const hasRecentActivity =
    plannedCount > 0 ||
    taskCompletionsRange.some((c) => c.completed) ||
    allTasks.length > 0;
  if (candidates.length === 0 && hasRecentActivity) {
    candidates.push({
      id: "sprouting_farmer",
      label: "싹을 틔우는 농부",
      variant: "sprouting_farmer",
      priority: 8,
    });
  }

  candidates.sort((a, b) => b.priority - a.priority);

  const seen = new Set<string>();
  const out: RecordBadge[] = [];
  for (const c of candidates) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    out.push({ id: c.id, label: c.label, variant: c.variant });
    if (out.length >= 4) break;
  }
  return out;
}
