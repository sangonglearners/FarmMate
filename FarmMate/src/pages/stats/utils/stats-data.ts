import {
  format,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  eachDayOfInterval,
  eachMonthOfInterval,
  eachQuarterOfInterval,
  eachYearOfInterval,
  parseISO,
  getQuarter,
} from "date-fns";
import type { Task } from "@shared/schema";

export type ViewUnit = "daily" | "monthly" | "quarterly" | "yearly";
export type AggregateMode = "detail" | "average";

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
  viewUnit: ViewUnit,
  aggregateMode: AggregateMode
): RevenueDataPoint[] {
  const start = parseISO(startDateStr);
  const end = parseISO(endDateStr);
  const getTaskEndStr = (t: Task) => (t as any).endDate || t.scheduledDate;

  const dailyTotals = new Map<string, number>();
  ledgers.forEach((l) => {
    if (!l.taskId) return;
    const task = tasks.find((x) => x.id === l.taskId);
    if (!task) return;
    const d = getTaskEndStr(task);
    if (d < startDateStr || d > endDateStr) return;
    dailyTotals.set(d, (dailyTotals.get(d) || 0) + l.value);
  });

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

  if (aggregateMode === "average") {
    switch (viewUnit) {
      case "daily": {
        const labels = ["일", "월", "화", "수", "목", "금", "토"];
        const order = [1, 2, 3, 4, 5, 6, 0];
        const sums = [0, 0, 0, 0, 0, 0, 0];
        const counts = [0, 0, 0, 0, 0, 0, 0];

        eachDayOfInterval({ start, end }).forEach((date) => {
          const dateStr = format(date, "yyyy-MM-dd");
          const dayIndex = date.getDay();
          sums[dayIndex] += dailyTotals.get(dateStr) || 0;
          counts[dayIndex] += 1;
        });

        return order.map((dayIndex) => ({
          period: labels[dayIndex],
          value: counts[dayIndex] > 0 ? sums[dayIndex] / counts[dayIndex] : 0,
        }));
      }
      case "monthly": {
        const sums = new Array<number>(12).fill(0);
        const counts = new Array<number>(12).fill(0);

        eachMonthOfInterval({ start, end }).forEach((monthDate) => {
          const monthIndex = monthDate.getMonth();
          const ms = format(startOfMonth(monthDate), "yyyy-MM-dd");
          const me = format(endOfMonth(monthDate), "yyyy-MM-dd");
          sums[monthIndex] += valueInRange(ms, me);
          counts[monthIndex] += 1;
        });

        return Array.from({ length: 12 }, (_, i) => ({
          period: `${i + 1}월`,
          value: counts[i] > 0 ? sums[i] / counts[i] : 0,
        }));
      }
      case "quarterly": {
        const sums = new Array<number>(4).fill(0);
        const counts = new Array<number>(4).fill(0);

        eachQuarterOfInterval({ start, end }).forEach((quarterDate) => {
          const quarterIndex = getQuarter(quarterDate) - 1;
          const qs = format(startOfQuarter(quarterDate), "yyyy-MM-dd");
          const qe = format(endOfQuarter(quarterDate), "yyyy-MM-dd");
          sums[quarterIndex] += valueInRange(qs, qe);
          counts[quarterIndex] += 1;
        });

        return Array.from({ length: 4 }, (_, i) => ({
          period: `Q${i + 1}`,
          value: counts[i] > 0 ? sums[i] / counts[i] : 0,
        }));
      }
      case "yearly":
        return [];
    }
  }

  switch (viewUnit) {
    case "daily": {
      return eachDayOfInterval({ start, end }).map((day) => {
        const ds = format(day, "yyyy-MM-dd");
        return {
          period: format(day, "MM.dd"),
          value: dailyTotals.get(ds) || 0,
        };
      });
    }
    case "monthly": {
      const months = eachMonthOfInterval({ start, end });
      return months.map((m) => {
        const ms = format(startOfMonth(m), "yyyy-MM-dd");
        const me = format(endOfMonth(m), "yyyy-MM-dd");
        const clippedStart = ms < startDateStr ? startDateStr : ms;
        const clippedEnd = me > endDateStr ? endDateStr : me;
        const yy = m.getFullYear() % 100;
        const mm = String(m.getMonth() + 1).padStart(2, "0");
        return { period: `${yy}.${mm}`, value: valueInRange(clippedStart, clippedEnd) };
      });
    }
    case "quarterly": {
      const quarters = eachQuarterOfInterval({ start, end });
      return quarters.map((q) => {
        const qs = format(startOfQuarter(q), "yyyy-MM-dd");
        const qe = format(endOfQuarter(q), "yyyy-MM-dd");
        const clippedStart = qs < startDateStr ? startDateStr : qs;
        const clippedEnd = qe > endDateStr ? endDateStr : qe;
        const yearShort = q.getFullYear() % 100;
        const qNum = getQuarter(q);
        return { period: `${yearShort}.Q${qNum}`, value: valueInRange(clippedStart, clippedEnd) };
      });
    }
    case "yearly": {
      const years = eachYearOfInterval({ start, end });
      return years.map((y) => {
        const ys = format(startOfYear(y), "yyyy-MM-dd");
        const ye = format(endOfYear(y), "yyyy-MM-dd");
        const clippedStart = ys < startDateStr ? startDateStr : ys;
        const clippedEnd = ye > endDateStr ? endDateStr : ye;
        return { period: `${y.getFullYear()}년`, value: valueInRange(clippedStart, clippedEnd) };
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
