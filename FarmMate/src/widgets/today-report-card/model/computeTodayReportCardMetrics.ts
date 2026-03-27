import type { Task } from "@shared/schema";
import { format, subDays } from "date-fns";

import type { TodayReportCardMetrics } from "../../../pages/stats/utils/report-card";
import { isDateInTaskRange } from "@/shared/utils/task-filter";

type Crop = { id?: string | null; name: string };

export type ComputeTodayReportCardMetricsInput = {
  allTasks: Task[];
  crops: Crop[];
  todayDateStr: string; // YYYY-MM-DD (로컬 기준)
  // streak 계산에 사용(물주기/웃거름주기 완료 이력)
  taskCompletionsToday: Array<{
    taskId: string;
    completed: boolean;
    completionDate: string;
    completedAt: string | null;
  }>;
  taskCompletionsRange: Array<{
    taskId: string;
    completed: boolean;
    completionDate: string;
  }>;
};

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map((v) => Number(v));
  return new Date(y, m - 1, d);
}

function getLocalCompletionsMap(selectedDate: string): Map<string, boolean> {
  if (typeof window === "undefined") return new Map();
  try {
    const storageKey = `task_completions_${selectedDate}`;
    const raw = localStorage.getItem(storageKey);
    if (!raw) return new Map();
    const obj = JSON.parse(raw) as Record<string, boolean>;
    return new Map(Object.entries(obj));
  } catch {
    return new Map();
  }
}

function deriveCropNameFromTask(task: Task, crops: Crop[]): string {
  if (task.cropId) {
    return crops.find((c) => c.id === task.cropId)?.name ?? "기타";
  }
  const title = task.title ?? "";
  const part = title.split("_")[0] ?? "";
  const trimmed = part.includes("(") ? part.split("(")[0].trim() : part.trim();
  return trimmed || "기타";
}

function toCropLabel(cropName: string): string {
  return cropName.endsWith("반") ? cropName : `${cropName}반`;
}

export function computeTodayReportCardMetrics({
  allTasks,
  crops,
  todayDateStr,
  taskCompletionsToday, // 현재 로직에서는 streak만 쓰며, 남겨둔 상태(호환용)
  taskCompletionsRange,
}: ComputeTodayReportCardMetricsInput): TodayReportCardMetrics {
  // 홈의 TodoList 기준(투두에 들어가는 것):
  // - taskType !== "재배"
  // - todayDateStr에 해당하는 scheduled/end 범위
  const todayTodoTasks = allTasks.filter(
    (t) => t.taskType !== "재배" && isDateInTaskRange(t, todayDateStr)
  );

  const plannedCount = todayTodoTasks.length;

  // TodoList의 체크 상태는 localStorage를 우선으로 사용합니다.
  const localCompletionMap = getLocalCompletionsMap(todayDateStr);

  const isDateRangeTask = (task: Task) => !!task.endDate && task.endDate !== task.scheduledDate;
  const getCompletionKey = (task: Task) => (isDateRangeTask(task) ? `${task.id}_${todayDateStr}` : task.id);

  const completedCount = todayTodoTasks.reduce((sum, task) => {
    const completionKey = getCompletionKey(task);
    const localValue = localCompletionMap.get(completionKey);
    const completed = localValue ?? task.completed === 1;
    return sum + (completed ? 1 : 0);
  }, 0);

  const completionPercent =
    plannedCount > 0 ? Math.min(100, Math.max(0, Math.round((completedCount / plannedCount) * 100))) : 0;

  // 요청하신 50% 기준 멘트
  const todayMessage =
    completionPercent >= 50 ? "오늘도 농장을 챙겼어요!)" : "오늘은 농장을 잘 못 챙겼어요";

  // 주요 작물(오늘 Todo에 들어간 task들의 crop)
  const cropCountMap = new Map<string, number>();
  todayTodoTasks.forEach((task) => {
    const name = deriveCropNameFromTask(task, crops);
    cropCountMap.set(name, (cropCountMap.get(name) || 0) + 1);
  });

  let primaryCropName = "농장";
  let bestCropCount = -1;
  cropCountMap.forEach((count, name) => {
    if (count > bestCropCount) {
      bestCropCount = count;
      primaryCropName = name;
    }
  });

  const primaryCropLabel = toCropLabel(primaryCropName);

  // 작업(오늘 Todo에 들어간 task 중 물주기/웃거름주기 비중)
  const waterCount = todayTodoTasks.filter((t) => t.taskType === "물주기").length;
  const fertilizerCount = todayTodoTasks.filter((t) => t.taskType === "웃거름주기").length;

  let primaryTaskType: "물주기" | "웃거름주기" | "혼합" = "혼합";
  if (waterCount > fertilizerCount) primaryTaskType = "물주기";
  else if (fertilizerCount > waterCount) primaryTaskType = "웃거름주기";

  const primaryTaskLabel =
    primaryTaskType === "물주기"
      ? "물주기"
      : primaryTaskType === "웃거름주기"
        ? "웃거름주기"
        : "물주기·웃거름";

  // 연속 기록: task_completion_dates(물주기/웃거름주기) 기반 유지
  const essentialTypes = ["물주기", "웃거름주기"] as const;
  const taskById = new Map(allTasks.map((t) => [t.id, t]));

  const todayLocal = parseLocalDate(todayDateStr);
  const streakStartDateStr = format(subDays(todayLocal, 13), "yyyy-MM-dd");

  let streakDays = 0;
  const maxOffsetDays = 13;
  for (let offset = 0; offset <= maxOffsetDays; offset++) {
    const checkDateStr = format(subDays(todayLocal, offset), "yyyy-MM-dd");
    if (checkDateStr < streakStartDateStr) break;

    const dueTasksForDate = allTasks.filter(
      (t) =>
        essentialTypes.includes(t.taskType as (typeof essentialTypes)[number]) &&
        isDateInTaskRange(t, checkDateStr)
    );
    const dueTaskIdsForDate = new Set(dueTasksForDate.map((t) => t.id));

    const completionsForDate = taskCompletionsRange.filter(
      (c) =>
        c.completed &&
        c.completionDate === checkDateStr &&
        dueTaskIdsForDate.has(c.taskId)
    );

    const waterDone = completionsForDate.filter(
      (c) => taskById.get(c.taskId)?.taskType === "물주기"
    ).length;
    const fertilizerDone = completionsForDate.filter(
      (c) => taskById.get(c.taskId)?.taskType === "웃거름주기"
    ).length;

    if (waterDone > 0 && fertilizerDone > 0) streakDays++;
    else break;
  }

  return {
    dateLabel: todayDateStr.replaceAll("-", "."),
    completedCount,
    plannedCount,
    streakDays,
    completionPercent,
    todayMessage,
    primaryCropLabel,
    primaryTaskType,
    primaryTaskLabel,
  };
}

