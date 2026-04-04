import type { Task } from "@shared/schema";
import { format, subDays } from "date-fns";

import type { RecordBadge, TodayReportCardMetrics } from "../../../pages/stats/utils/report-card";
import { isDateInTaskRange } from "@/shared/utils/task-filter";

import { buildRecordBadges } from "./recordBadges";

type Crop = { id?: string | null; name: string };

export type ComputeTodayReportCardMetricsInput = {
  allTasks: Task[];
  crops: Crop[];
  todayDateStr: string;
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
    completedAt: string | null;
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

function deriveCropNameFromTask(task: Task, crops: Crop[]): string | null {
  if (task.cropId) {
    return crops.find((c) => c.id === task.cropId)?.name ?? null;
  }
  const title = task.title ?? "";
  const part = title.split("_")[0] ?? "";
  const trimmed = part.includes("(") ? part.split("(")[0].trim() : part.trim();
  return trimmed || null;
}

function toCropLabel(cropName: string): string {
  if (cropName === "작물 없음") return cropName;
  return cropName.endsWith("반") ? cropName : `${cropName}반`;
}

function topLabelsFromCountMap(countMap: Map<string, number>, fallback: string): string[] {
  const entries = Array.from(countMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([label]) => label)
    .filter(Boolean);
  return entries.length > 0 ? entries : [fallback];
}

export function computeTodayReportCardMetrics({
  allTasks,
  crops,
  todayDateStr,
  taskCompletionsToday: _taskCompletionsToday,
  taskCompletionsRange,
}: ComputeTodayReportCardMetricsInput): TodayReportCardMetrics {
  const todayTodoTasks = allTasks.filter(
    (t) => t.taskType !== "재배" && isDateInTaskRange(t, todayDateStr)
  );

  const plannedCount = todayTodoTasks.length;

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

  const todayMessage =
    plannedCount === 0
      ? "첫 기록을 시작해보세요"
      : completionPercent >= 50
        ? "오늘도 농장을 챙겼어요!)"
        : "오늘은 농장을 잘 못 챙겼어요";

  const cropCountMap = new Map<string, number>();
  todayTodoTasks.forEach((task) => {
    const name = deriveCropNameFromTask(task, crops);
    if (!name) return;
    cropCountMap.set(name, (cropCountMap.get(name) || 0) + 1);
  });

  let primaryCropName = "작물 없음";
  let bestCropCount = -1;
  cropCountMap.forEach((count, name) => {
    if (count > bestCropCount) {
      bestCropCount = count;
      primaryCropName = name;
    }
  });

  const primaryCropLabel = toCropLabel(primaryCropName);

  const farmWorkCountMap = new Map<string, number>();
  todayTodoTasks.forEach((task) => {
    const cropName = deriveCropNameFromTask(task, crops);
    const type = task.taskType || "기타";
    const line = cropName ? `${cropName} ${type}` : type;
    farmWorkCountMap.set(line, (farmWorkCountMap.get(line) || 0) + 1);
  });
  const topFarmWorkLabels = topLabelsFromCountMap(farmWorkCountMap, "기타");

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

  const essentialTypes = ["물주기", "웃거름주기"] as const;
  const taskById = new Map(allTasks.map((t) => [t.id, t]));
  const isEssentialDoneOnDate = (checkDateStr: string): boolean => {
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
    return waterDone > 0 && fertilizerDone > 0;
  };

  const todayLocal = parseLocalDate(todayDateStr);
  const streakStartDateStr = format(subDays(todayLocal, 13), "yyyy-MM-dd");

  let streakDays = 0;
  const maxOffsetDays = 13;
  for (let offset = 0; offset <= maxOffsetDays; offset++) {
    const checkDateStr = format(subDays(todayLocal, offset), "yyyy-MM-dd");
    if (checkDateStr < streakStartDateStr) break;
    if (isEssentialDoneOnDate(checkDateStr)) streakDays++;
    else break;
  }

  const weekStart = new Date(todayLocal);
  weekStart.setDate(todayLocal.getDate() - todayLocal.getDay());
  const weeklyDoneFlags = Array.from({ length: 7 }, (_, idx) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + idx);
    return isEssentialDoneOnDate(format(date, "yyyy-MM-dd"));
  });

  let recordBadges: RecordBadge[] = [];
  try {
    recordBadges = buildRecordBadges({
      taskCompletionsRange,
      allTasks,
      completionPercent,
      plannedCount,
      streakDays,
    });
  } catch (e) {
    console.error("[computeTodayReportCardMetrics] recordBadges", e);
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
    topFarmWorkLabels: plannedCount === 0 ? [] : topFarmWorkLabels,
    weeklyDoneFlags,
    recordBadges,
  };
}
