import {
  format,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  eachMonthOfInterval,
  eachQuarterOfInterval,
  eachYearOfInterval,
  parseISO,
  getQuarter,
} from "date-fns";
import type { Task } from "@shared/schema";

export type ViewUnit = "daily" | "monthly" | "quarterly" | "yearly";

export interface RevenueDataPoint {
  period: string;
  value: number;
}

/** 날짜 범위 내 viewUnit별로 그룹화한 추이 데이터 생성 (작업 종료일 기준, value=매출 또는 순수익) */
export function generateRevenueTrendData(
  ledgers: { taskId: string | null; value: number }[],
  tasks: Task[],
  startDateStr: string,
  endDateStr: string,
  viewUnit: ViewUnit
): RevenueDataPoint[] {
  const start = parseISO(startDateStr);
  const end = parseISO(endDateStr);
  const getTaskEndStr = (t: Task) => (t as any).endDate || t.scheduledDate;

  const valueInRange = (s: string, e: string) =>
    ledgers
      .filter((l) => {
        if (!l.taskId) return false;
        const task = tasks.find((x) => x.id === l.taskId);
        if (!task) return false;
        const d = getTaskEndStr(task);
        return d >= s && d <= e;
      })
      .reduce((sum, l) => sum + l.value, 0);

  switch (viewUnit) {
    case "daily": {
      const daySums = [0, 0, 0, 0, 0, 0, 0];
      const dayCounts = [0, 0, 0, 0, 0, 0, 0];
      ledgers.forEach((l) => {
        if (!l.taskId) return;
        const task = tasks.find((x) => x.id === l.taskId);
        if (!task) return;
        const d = getTaskEndStr(task);
        if (d < startDateStr || d > endDateStr) return;
        const dayIndex = new Date(d + "T12:00:00").getDay();
        daySums[dayIndex] += l.value;
        dayCounts[dayIndex] += 1;
      });
      const labels = ["일", "월", "화", "수", "목", "금", "토"];
      const order = [1, 2, 3, 4, 5, 6, 0];
      return order.map((dayIndex) => ({
        period: labels[dayIndex],
        value: dayCounts[dayIndex] > 0 ? daySums[dayIndex] / dayCounts[dayIndex] : 0,
      }));
    }
    case "monthly": {
      const months = eachMonthOfInterval({ start, end });
      return months.map((m) => {
        const ms = format(startOfMonth(m), "yyyy-MM-dd");
        const me = format(endOfMonth(m), "yyyy-MM-dd");
        const yy = m.getFullYear() % 100;
        const mm = String(m.getMonth() + 1).padStart(2, "0");
        return { period: `${yy}.${mm}`, value: valueInRange(ms, me) };
      });
    }
    case "quarterly": {
      const quarters = eachQuarterOfInterval({ start, end });
      return quarters.map((q) => {
        const qs = format(startOfQuarter(q), "yyyy-MM-dd");
        const qe = format(endOfQuarter(q), "yyyy-MM-dd");
        const yearShort = q.getFullYear() % 100;
        const qNum = getQuarter(q);
        return { period: `${yearShort}.Q${qNum}`, value: valueInRange(qs, qe) };
      });
    }
    case "yearly": {
      const years = eachYearOfInterval({ start, end });
      return years.map((y) => {
        const ys = format(startOfYear(y), "yyyy-MM-dd");
        const ye = format(endOfYear(y), "yyyy-MM-dd");
        return { period: `${y.getFullYear()}년`, value: valueInRange(ys, ye) };
      });
    }
  }
}

/** 작물별 비중 (작업 cropId/title → value 합계, value=매출 또는 순수익) */
export function getCropRevenueShare(
  ledgers: { taskId: string | null; value: number }[],
  tasks: Task[],
  startDateStr: string,
  endDateStr: string,
  cropNameById: (id: string) => string
): { name: string; value: number }[] {
  const getTaskEndStr = (t: Task) => (t as any).endDate || t.scheduledDate;
  const map = new Map<string, number>();

  ledgers.forEach((l) => {
    if (!l.taskId) return;
    const task = tasks.find((x) => x.id === l.taskId);
    if (!task) return;
    const d = getTaskEndStr(task);
    if (d < startDateStr || d > endDateStr) return;
    let name = "";
    if (task.cropId) {
      name = cropNameById(task.cropId);
    } else if (task.title) {
      const part = task.title.split("_")[0];
      name = part.includes("(") ? part.split("(")[0].trim() : part.trim();
    }
    if (!name) name = "기타";
    map.set(name, (map.get(name) || 0) + l.value);
  });

  return Array.from(map.entries())
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}
