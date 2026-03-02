import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subMonths, subDays, subYears, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, parseISO, getQuarter } from "date-fns";
import { useTasks } from "@/features/task-management";
import { useFarms } from "@/features/farm-management/model/farm.hooks";
import { useCrops } from "@/features/crop-management";
import { useAuth } from "@/contexts/AuthContext";
import { listLedgers } from "@/shared/api/ledgers";
import { filterTasksByDateRange } from "@/shared/utils/task-filter";
import {
  generateRevenueTrendData,
  getCropRevenueShare,
  type ViewUnit,
} from "../utils/stats-data";
import { KPICard } from "./components/KPICard";
import { NetProfitCard } from "./components/NetProfitCard";
import { TrendChart } from "./components/TrendChart";
import { CropRevenueShareChart } from "./components/CropRevenueShareChart";
import { CropMixChart } from "./components/CropMixChart";
import { BlockHealthGrid } from "./components/BlockHealthGrid";
import type { Task } from "@shared/schema";

export default function StatsPage() {
  const { user } = useAuth();
  const today = new Date();

  const [referenceDateStr, setReferenceDateStr] = useState(() => format(today, "yyyy-MM-dd"));
  const [viewUnit, setViewUnit] = useState<ViewUnit>("quarterly");
  const [metricMode, setMetricMode] = useState<"revenue" | "netProfit">("revenue");

  const referenceDate = useMemo(() => parseISO(referenceDateStr), [referenceDateStr]);

  const { data: allTasks = [], isLoading: tasksLoading } = useTasks();
  const { data: farms = [] } = useFarms();
  const { data: crops = [] } = useCrops();
  const { data: allLedgers = [], isLoading: ledgersLoading } = useQuery({
    queryKey: ["ledgers"],
    queryFn: () => listLedgers(),
  });

  // 선택한 기준 날짜 기준 고정 기간: 일 90일 / 월 12개월 / 분기 12분기(3년) / 연 5년
  const { normalizedStart, normalizedEnd } = useMemo(() => {
    let start: Date;
    let end: Date;
    switch (viewUnit) {
      case "daily":
        end = referenceDate;
        start = subDays(end, 89);
        break;
      case "monthly":
        end = endOfMonth(referenceDate);
        start = startOfMonth(subMonths(end, 11));
        break;
      case "quarterly":
        end = endOfQuarter(referenceDate);
        start = startOfQuarter(subMonths(end, 33));
        break;
      case "yearly":
        end = endOfYear(referenceDate);
        start = startOfYear(subYears(end, 4));
        break;
    }
    return {
      normalizedStart: format(start, "yyyy-MM-dd"),
      normalizedEnd: format(end, "yyyy-MM-dd"),
    };
  }, [viewUnit, referenceDate]);

  const tasks = useMemo(
    () => filterTasksByDateRange(allTasks, normalizedStart, normalizedEnd),
    [allTasks, normalizedStart, normalizedEnd]
  );

  const ledgersInRange = useMemo(() => {
    const getTaskEndStr = (t: Task) => (t as any).endDate || t.scheduledDate;
    return allLedgers.filter((l: { taskId?: string | null }) => {
      if (!l.taskId) return false;
      const task = allTasks.find((x) => x.id === l.taskId);
      if (!task) return false;
      const d = getTaskEndStr(task);
      return d >= normalizedStart && d <= normalizedEnd;
    });
  }, [allLedgers, allTasks, normalizedStart, normalizedEnd]);

  // 데이터가 처음 기록된 시점부터 차트 시작 (월/분기/연만 적용)
  const { chartStart, chartEnd } = useMemo(() => {
    const getTaskEndStr = (t: Task) => (t as any).endDate || t.scheduledDate;
    const taskIdsInLedgers = new Set(
      ledgersInRange.map((l: { taskId?: string | null }) => l.taskId).filter(Boolean) as string[]
    );
    const datesWithData = allTasks
      .filter((t: Task) => taskIdsInLedgers.has(t.id))
      .map((t: Task) => getTaskEndStr(t))
      .filter((d: string) => d >= normalizedStart && d <= normalizedEnd) as string[];
    const minDateStr = datesWithData.length > 0 ? datesWithData.sort()[0] : null;

    if (viewUnit === "daily" || !minDateStr) {
      return { chartStart: normalizedStart, chartEnd: normalizedEnd };
    }
    const minDate = parseISO(minDateStr);
    let start: string;
    switch (viewUnit) {
      case "monthly":
        start = format(startOfMonth(minDate), "yyyy-MM-dd");
        break;
      case "quarterly":
        start = format(startOfQuarter(minDate), "yyyy-MM-dd");
        break;
      case "yearly":
        start = format(startOfYear(minDate), "yyyy-MM-dd");
        break;
      default:
        start = normalizedStart;
    }
    return { chartStart: start, chartEnd: normalizedEnd };
  }, [viewUnit, normalizedStart, normalizedEnd, ledgersInRange, allTasks]);

  const ledgersWithValue = useMemo(() => {
    return allLedgers.map((l: { taskId?: string | null; revenueAmount?: number | null; expenseItems?: { cost: number }[] }) => {
      const revenue = l.revenueAmount ?? 0;
      const cost = l.expenseItems?.reduce((s: number, e: { cost: number }) => s + e.cost, 0) ?? 0;
      const value =
        metricMode === "revenue" ? revenue : metricMode === "cost" ? cost : revenue - cost;
      return { taskId: l.taskId ?? null, value };
    });
  }, [allLedgers, metricMode]);

  const totalRevenue = useMemo(
    () =>
      ledgersInRange.reduce((s: number, l: { revenueAmount?: number | null }) => s + (l.revenueAmount || 0), 0),
    [ledgersInRange]
  );
  const totalCost = useMemo(
    () =>
      ledgersInRange.reduce(
        (s: number, l: { expenseItems?: { cost: number }[] }) =>
          s + (l.expenseItems?.reduce((sum, e) => sum + e.cost, 0) ?? 0),
        0
      ),
    [ledgersInRange]
  );

  const revenueTrendData = useMemo(
    () =>
      generateRevenueTrendData(
        ledgersWithValue,
        allTasks,
        chartStart,
        chartEnd,
        viewUnit
      ),
    [ledgersWithValue, allTasks, chartStart, chartEnd, viewUnit]
  );

  const averageRevenue = useMemo(() => {
    if (revenueTrendData.length === 0) return 0;
    const total = revenueTrendData.reduce((s, d) => s + d.value, 0);
    return total / revenueTrendData.length;
  }, [revenueTrendData]);

  const previousHalfAverage = useMemo(() => {
    if (revenueTrendData.length < 2) return 0;
    const half = Math.floor(revenueTrendData.length / 2);
    const first = revenueTrendData.slice(0, half);
    const sum = first.reduce((s, d) => s + d.value, 0);
    return sum / first.length;
  }, [revenueTrendData]);

  const revenueChange = useMemo(() => {
    if (previousHalfAverage === 0) return 0;
    return ((averageRevenue - previousHalfAverage) / previousHalfAverage) * 100;
  }, [averageRevenue, previousHalfAverage]);

  const completionRate = useMemo(() => {
    if (!user?.id) return 0;
    const currentUserId = String(user.id);
    const myTasks = tasks.filter((t) => String(t.userId || "") === currentUserId);
    if (myTasks.length === 0) return 0;
    const completed = myTasks.filter((t) => Number(t.completed) === 1 || t.completed === true);
    return (completed.length / myTasks.length) * 100;
  }, [tasks, user?.id]);

  const cropNameById = (id: string) => crops.find((c) => c.id === id)?.name ?? "기타";
  const cropRevenueData = useMemo(
    () =>
      getCropRevenueShare(
        ledgersWithValue,
        allTasks,
        normalizedStart,
        normalizedEnd,
        cropNameById
      ),
    [ledgersWithValue, allTasks, normalizedStart, normalizedEnd, crops]
  );

  const blockStatuses = useMemo(() => {
    const blocks: Array<{
      blockId: string;
      farmName: string;
      farmId: string;
      rowNumber: number;
      status: "good" | "watch" | "danger" | "empty";
      pendingTasks?: number;
      isOwnFarm: boolean;
    }> = [];
    const ownFarms = farms.filter((f) => f.userId === user?.id);
    const friendFarms = farms.filter((f) => f.userId !== user?.id);
    const sortedFarms = [...ownFarms, ...friendFarms];

    sortedFarms.forEach((farm) => {
      const isOwnFarm = farm.userId === user?.id;
      const farmTasks = tasks.filter((t) => t.farmId === farm.id);
      for (let rowNum = 1; rowNum <= (farm.rowCount || 0); rowNum++) {
        const rowTasks = farmTasks.filter((t) => t.rowNumber === rowNum);
        if (rowTasks.length === 0) {
          blocks.push({
            blockId: `${farm.id}-${rowNum}`,
            farmName: farm.name,
            farmId: farm.id,
            rowNumber: rowNum,
            status: "empty",
            pendingTasks: 0,
            isOwnFarm,
          });
          continue;
        }
        const taskCount = rowTasks.length;
        const status: "good" | "watch" | "danger" =
          taskCount > 5 ? "danger" : taskCount >= 3 ? "watch" : "good";
        blocks.push({
          blockId: `${farm.id}-${rowNum}`,
          farmName: farm.name,
          farmId: farm.id,
          rowNumber: rowNum,
          status,
          pendingTasks: taskCount,
          isOwnFarm,
        });
      }
    });
    return blocks.sort((a, b) => {
      if (a.isOwnFarm && !b.isOwnFarm) return -1;
      if (!a.isOwnFarm && b.isOwnFarm) return 1;
      if (a.farmName !== b.farmName) return a.farmName.localeCompare(b.farmName);
      return a.rowNumber - b.rowNumber;
    });
  }, [farms, tasks, user?.id]);

  // 작물 구성도: 작물별 사용 이랑 수 (날짜 범위 내 작업 기준, 농장·이랑 조합 고유 개수)
  const cropMixData = useMemo(() => {
    const totalRows = farms.reduce((s, f) => s + (f.rowCount || 0), 0);
    const cropToRowKeys = new Map<string, Set<string>>();
    const allUsedKeys = new Set<string>();

    tasks.forEach((task) => {
      if (!task.farmId || !task.rowNumber) return;
      const key = `${task.farmId}-${task.rowNumber}`;
      allUsedKeys.add(key);
      const cropKey = task.cropId ?? "__기타__";
      if (!cropToRowKeys.has(cropKey)) cropToRowKeys.set(cropKey, new Set());
      cropToRowKeys.get(cropKey)!.add(key);
    });

    const usedRows = allUsedKeys.size;
    const data: Array<{ name: string; value: number; percentage: number; others?: string[] }> = [];
    const etcRows = new Set<string>();
    const etcOthers: string[] = [];

    cropToRowKeys.forEach((rowSet, cropKey) => {
      const value = rowSet.size;
      const crop = crops.find((c) => c.id === cropKey);
      const name = cropKey === "__기타__" ? "기타" : (crop?.name ?? "기타");
      if (name === "기타") {
        rowSet.forEach((k) => etcRows.add(k));
        if (cropKey !== "__기타__") etcOthers.push(cropKey);
        return;
      }
      const percentage = totalRows > 0 ? (value / totalRows) * 100 : 0;
      data.push({ name, value, percentage });
    });

    if (etcRows.size > 0) {
      const percentage = totalRows > 0 ? (etcRows.size / totalRows) * 100 : 0;
      data.push({ name: "기타", value: etcRows.size, percentage, others: etcOthers.length > 0 ? etcOthers : undefined });
    }
    data.sort((a, b) => b.value - a.value);
    return { data, totalRows, usedRows };
  }, [tasks, farms, crops]);

  if (tasksLoading || ledgersLoading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="p-4 space-y-6">
          <div className="h-8 bg-gray-200 rounded-xl animate-pulse w-32" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* 페이지 타이틀 (캘린더·장부처럼 중앙 정렬) */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900 text-center">통계</h1>
        </div>
      </div>

      <div className="p-4 space-y-6 max-w-5xl mx-auto">
        {/* 기준 날짜 선택 */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-500">기준 날짜</span>
          <input
            type="date"
            value={referenceDateStr}
            onChange={(e) => setReferenceDateStr(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-900 bg-white focus:ring-2 focus:ring-[#4CAF50]/30 focus:border-[#4CAF50] outline-none"
          />
        </div>

        {/* 매출 / 순수익 / 비용 선택 */}
        <div className="flex rounded-xl bg-gray-100 p-1 gap-0.5 w-fit">
            <button
              type="button"
              onClick={() => setMetricMode("revenue")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                metricMode === "revenue"
                  ? "bg-[#4CAF50] text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
              }`}
            >
              매출
            </button>
            <button
              type="button"
              onClick={() => setMetricMode("netProfit")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                metricMode === "netProfit"
                  ? "bg-[#4CAF50] text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
              }`}
            >
              순수익
            </button>
            <button
              type="button"
              onClick={() => setMetricMode("cost")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                metricMode === "cost"
                  ? "bg-[#4CAF50] text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
              }`}
            >
              비용
            </button>
        </div>

        {/* Summary Section: 매출/순수익/비용 카드 */}
        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <NetProfitCard
              mode={metricMode}
              averageValue={averageRevenue}
              totalRevenue={totalRevenue}
              totalCost={totalCost}
              className="rounded-xl shadow-sm border border-gray-100"
            />
          </div>
        </section>

        {/* Main Chart: 매출/순수익 추이 (내부 세그먼트 컨트롤) */}
        <section>
          {(() => {
            const start = parseISO(chartStart);
            const end = parseISO(chartEnd);
            const yy = (d: Date) => String(d.getFullYear()).slice(-2);
            const MM = (d: Date) => String(d.getMonth() + 1).padStart(2, "0");
            const dd = (d: Date) => String(d.getDate()).padStart(2, "0");
            const qNum = (d: Date) => getQuarter(d);
            const criterionLabel =
              viewUnit === "daily"
                ? `${yy(start)}.${MM(start)}.${dd(start)}~${yy(end)}.${MM(end)}.${dd(end)} 일`
                : viewUnit === "monthly"
                  ? `${yy(start)}.${MM(start)}~${yy(end)}.${MM(end)} 월`
                  : viewUnit === "quarterly"
                    ? `${yy(start)}.Q${qNum(start)}~${yy(end)}.Q${qNum(end)} 분기`
                    : `${yy(start)}~${yy(end)} 연`;
            return (
              <TrendChart
                chartTitle={
                  metricMode === "revenue" ? "매출액 추이" : metricMode === "cost" ? "비용 추이" : "순수익 추이"
                }
                data={revenueTrendData}
                viewUnit={viewUnit}
                onViewUnitChange={setViewUnit}
                criterionLabel={criterionLabel}
              />
            );
          })()}
        </section>

        {/* Analysis Section: 작물별 비중 */}
        <section>
          <CropRevenueShareChart
            title={
              metricMode === "revenue"
                ? "작물별 매출 비중"
                : metricMode === "cost"
                  ? "작물별 비용 비중"
                  : "작물별 순수익 비중"
            }
            data={cropRevenueData}
          />
        </section>

        {/* 작업 완료율 */}
        <section>
          <KPICard
            title="작업 완료율"
            value={`${completionRate.toFixed(1)}%`}
            formula="완료 수 / 전체 수"
            className="rounded-xl shadow-sm border border-gray-100"
          />
        </section>

        {/* 농장별 작업 상태 (기존 유지) */}
        {blockStatuses.length > 0 && (
          <section>
            <BlockHealthGrid blocks={blockStatuses} />
          </section>
        )}

        {/* 작물 구성도: 어떤 작물이 몇 개의 이랑을 사용하는지 */}
        {cropMixData.totalRows > 0 && (
          <section>
            <CropMixChart
              data={cropMixData.data}
              totalRows={cropMixData.totalRows}
              usedRows={cropMixData.usedRows}
            />
          </section>
        )}
      </div>
    </div>
  );
}
