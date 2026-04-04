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

  if (plannedCount >= 2 && completionPercent >= 85) {
    candidates.push({ id: "check", label: "체크왕", variant: "check", priority: 100 });
  }

  const timed = taskCompletionsRange.filter((c) => c.completed && c.completedAt);
  if (timed.length >= 5) {
    let dawn = 0;
    let night = 0;
    for (const c of timed) {
      const h = localHour(c.completedAt!);
      if (h >= 5 && h < 9) dawn++;
      else if (h >= 22 || h < 5) night++;
    }
    const n = timed.length;
    const dawnRatio = dawn / n;
    const nightRatio = night / n;
    const canDawn = dawn >= 3 && dawnRatio >= 0.32;
    const canNight = night >= 3 && nightRatio >= 0.32;
    if (canDawn || canNight) {
      if (dawn > night && canDawn) {
        candidates.push({ id: "dawn", label: "새벽형 기록가", variant: "dawn", priority: 88 });
      } else if (night > dawn && canNight) {
        candidates.push({ id: "night", label: "올빼미형 기록가", variant: "night", priority: 87 });
      } else if (canDawn) {
        candidates.push({ id: "dawn", label: "새벽형 기록가", variant: "dawn", priority: 88 });
      } else if (canNight) {
        candidates.push({ id: "night", label: "올빼미형 기록가", variant: "night", priority: 87 });
      }
    }
  }

  const memoRich = allTasks.filter((t) => (t.description?.trim().length ?? 0) >= 36);
  const totalTasks = allTasks.length;
  if (
    memoRich.length >= 4 ||
    (memoRich.length >= 2 && totalTasks > 0 && memoRich.length / totalTasks >= 0.18)
  ) {
    candidates.push({ id: "memo", label: "메모왕", variant: "memo", priority: 72 });
  }

  if (streakDays >= 7) {
    candidates.push({ id: "streak", label: "꾸준한 기록가", variant: "streak", priority: 62 });
  }

  if (plannedCount >= 8) {
    candidates.push({ id: "planner", label: "할 일 마스터", variant: "planner", priority: 52 });
  }

  if (candidates.length === 0 && plannedCount > 0) {
    candidates.push({ id: "grow", label: "성장 중인 기록가", variant: "default", priority: 8 });
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
