import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  format,
  subMonths,
  subDays,
  subYears,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  parseISO,
} from "date-fns";
import { useTasks } from "@/features/task-management";
import { useFarms } from "@/features/farm-management/model/farm.hooks";
import { useCrops } from "@/features/crop-management";
import { useAuth } from "@/contexts/AuthContext";
import { listLedgers } from "@/shared/api/ledgers";
import { filterTasksByDateRange } from "@/shared/utils/task-filter";
import { Card, CardContent } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  generateRevenueTrendData,
  getCropRevenueShare,
  type AggregateMode,
  type ViewUnit,
} from "../utils/stats-data";
import { TrendChart } from "./components/TrendChart";
import { CropRevenueShareChart } from "./components/CropRevenueShareChart";
import { CropMixChart } from "./components/CropMixChart";
import { BlockHealthGrid } from "./components/BlockHealthGrid";
import type { Task } from "@shared/schema";

type MetricMode = "revenue" | "netProfit" | "cost";

export default function StatsPage() {
  const metricLabelMap: Record<MetricMode, string> = {
    revenue: "매출",
    cost: "비용",
    netProfit: "순수익",
  };
  const aggregateLabelMap: Record<AggregateMode, string> = {
    detail: "상세",
    average: "평균",
  };

  const { user } = useAuth();
  const today = new Date();
  const initialEndDateStr = format(today, "yyyy-MM-dd");

  const [endDateStr, setEndDateStr] = useState(() => initialEndDateStr);
  const [startDateStr, setStartDateStr] = useState(() =>
    format(subYears(parseISO(initialEndDateStr), 1), "yyyy-MM-dd")
  );
  const [viewUnit, setViewUnit] = useState<ViewUnit>("monthly");
  const [metricMode, setMetricMode] = useState<MetricMode>("revenue");
  const [aggregateMode, setAggregateMode] = useState<AggregateMode>("detail");
  const [detailPeriodOffset, setDetailPeriodOffset] = useState(0);
  const [metricPopoverOpen, setMetricPopoverOpen] = useState(false);
  const [aggregatePopoverOpen, setAggregatePopoverOpen] = useState(false);

  const { data: allTasks = [], isLoading: tasksLoading } = useTasks();
  const { data: farms = [] } = useFarms();
  const { data: crops = [] } = useCrops();
  const { data: allLedgers = [], isLoading: ledgersLoading } = useQuery({
    queryKey: ["ledgers"],
    queryFn: () => listLedgers(),
  });

  const { normalizedStart, normalizedEnd } = useMemo(() => {
    if (startDateStr <= endDateStr) {
      return { normalizedStart: startDateStr, normalizedEnd: endDateStr };
    }
    return { normalizedStart: endDateStr, normalizedEnd: startDateStr };
  }, [startDateStr, endDateStr]);

  useEffect(() => {
    if (aggregateMode === "average" && viewUnit === "yearly") {
      setViewUnit("quarterly");
    }
  }, [aggregateMode, viewUnit]);

  const chartViewOptions = useMemo(
    () =>
      aggregateMode === "average"
        ? [
            { value: "daily" as const, label: "일" },
            { value: "monthly" as const, label: "월" },
            { value: "quarterly" as const, label: "분기" },
          ]
        : [
            { value: "daily" as const, label: "일" },
            { value: "monthly" as const, label: "월" },
            { value: "quarterly" as const, label: "분기" },
            { value: "yearly" as const, label: "연" },
          ],
    [aggregateMode]
  );

  const { chartStart, chartEnd } = useMemo(() => {
    const endBaseRaw = parseISO(normalizedEnd);
    const startBaseRaw = parseISO(normalizedStart);
    if (aggregateMode === "average") {
      return {
        chartStart: normalizedStart,
        chartEnd: normalizedEnd,
      };
    }

    let start: Date;
    let end: Date;

    switch (viewUnit) {
      case "daily": {
        const shiftedEnd = subDays(endBaseRaw, detailPeriodOffset * 7);
        end = shiftedEnd < startBaseRaw ? startBaseRaw : shiftedEnd;
        const startCandidate = subDays(end, 6);
        start = startCandidate < startBaseRaw ? startBaseRaw : startCandidate;
        break;
      }
      case "monthly": {
        const shiftedEnd = subMonths(endBaseRaw, detailPeriodOffset);
        end = shiftedEnd < startBaseRaw ? startBaseRaw : shiftedEnd;
        const startCandidate = subMonths(end, 11);
        start = startCandidate < startBaseRaw ? startBaseRaw : startCandidate;
        break;
      }
      case "quarterly": {
        const shiftedEnd = subMonths(endBaseRaw, detailPeriodOffset * 3);
        end = shiftedEnd < startBaseRaw ? startBaseRaw : shiftedEnd;
        const startCandidate = subMonths(end, 9);
        start = startCandidate < startBaseRaw ? startBaseRaw : startCandidate;
        break;
      }
      case "yearly": {
        end = endBaseRaw;
        const cappedStart = subYears(end, 4);
        const selectedStart = startBaseRaw;
        start = selectedStart > cappedStart ? selectedStart : cappedStart;
        break;
      }
    }

    return {
      chartStart: format(start, "yyyy-MM-dd"),
      chartEnd: format(end, "yyyy-MM-dd"),
    };
  }, [aggregateMode, viewUnit, normalizedStart, normalizedEnd, detailPeriodOffset]);

  const canGoPrev = useMemo(() => {
    if (aggregateMode !== "detail" || viewUnit === "yearly") return false;
    return chartStart > normalizedStart;
  }, [aggregateMode, viewUnit, chartStart, normalizedStart]);

  const rangeLabel = useMemo(() => {
    const start = parseISO(chartStart);
    const end = parseISO(chartEnd);
    const startYY = format(start, "yy");
    const endYY = format(end, "yy");
    const startMM = format(start, "MM");
    const endMM = format(end, "MM");
    const startDD = format(start, "dd");
    const endDD = format(end, "dd");
    const startQ = Math.floor(start.getMonth() / 3) + 1;
    const endQ = Math.floor(end.getMonth() / 3) + 1;

    if (viewUnit === "daily") {
      return `${startYY}.${startMM}.${startDD}~${endYY}.${endMM}.${endDD}`;
    }
    if (viewUnit === "monthly") {
      return `${startYY}.${startMM}~${endYY}.${endMM}`;
    }
    if (viewUnit === "quarterly") {
      return `${startYY}.Q${startQ}~${endYY}.Q${endQ}`;
    }
    return `${startYY}~${endYY}`;
  }, [chartStart, chartEnd, viewUnit]);

  const tasks = useMemo(
    () => filterTasksByDateRange(allTasks, normalizedStart, normalizedEnd),
    [allTasks, normalizedStart, normalizedEnd]
  );

  const ledgersWithValue = useMemo(() => {
    return allLedgers.map((l: { taskId?: string | null; revenueAmount?: number | null; expenseItems?: { cost: number }[] }) => {
      const revenue = l.revenueAmount ?? 0;
      const cost = l.expenseItems?.reduce((s: number, e: { cost: number }) => s + e.cost, 0) ?? 0;
      const value =
        metricMode === "revenue" ? revenue : metricMode === "cost" ? cost : revenue - cost;
      return { taskId: l.taskId ?? null, value };
    });
  }, [allLedgers, metricMode]);

  const revenueTrendData = useMemo(
    () =>
      generateRevenueTrendData(
        ledgersWithValue,
        allTasks,
        chartStart,
        chartEnd,
        viewUnit,
        aggregateMode
      ),
    [ledgersWithValue, allTasks, chartStart, chartEnd, viewUnit, aggregateMode]
  );

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

  const insights = useMemo(() => {
    const metricLabel = metricLabelMap[metricMode];

    // 이번 달(달력 기준) 총 {매출/비용/순수익}
    const endDate = parseISO(normalizedEnd);
    const monthStartStr = format(startOfMonth(endDate), "yyyy-MM-dd");
    const monthEndStr = format(endOfMonth(endDate), "yyyy-MM-dd");

    const getTaskEndStr = (t: Task) => (t as any).endDate || t.scheduledDate;

    const totalValue = ledgersWithValue.reduce((sum, l) => {
      if (!l.taskId) return sum;
      const task = allTasks.find((x) => x.id === l.taskId);
      if (!task) return sum;
      const d = getTaskEndStr(task);
      if (d < monthStartStr || d > monthEndStr) return sum;
      return sum + l.value;
    }, 0);

    // 선택한 기간 기준 단위별 평균 (기존 로직 유지: 차트 데이터 기반)
    const avgValue =
      revenueTrendData.length > 0
        ? revenueTrendData.reduce((sum, p) => sum + p.value, 0) /
          revenueTrendData.length
        : 0;

    // 텍스트용 기간/단위 레이블 (예: 25.01~26.01, 분기별)
    const periodStart = parseISO(normalizedStart);
    const periodEnd = parseISO(normalizedEnd);
    const periodLabel = `${format(periodStart, "yy.MM")}~${format(
      periodEnd,
      "yy.MM"
    )}`;
    const unitLabel =
      viewUnit === "daily"
        ? "요일별"
        : viewUnit === "monthly"
        ? "월별"
        : viewUnit === "quarterly"
        ? "분기별"
        : "연도별";

    // 이번 달 기준 작물별 상위 매출
    const monthlyCropRevenue = getCropRevenueShare(
      ledgersWithValue,
      allTasks,
      monthStartStr,
      monthEndStr,
      cropNameById
    );

    const cropsExcludingOthers = monthlyCropRevenue.filter(
      (c) => c.name !== "기타"
    );
    const cropTotal = cropsExcludingOthers.reduce((sum, c) => sum + c.value, 0);
    const topCrops = cropsExcludingOthers.slice(0, 3);
    const topShare =
      cropTotal > 0
        ? (topCrops.reduce((sum, c) => sum + c.value, 0) / cropTotal) * 100
        : 0;

    return {
      metricLabel,
      totalValue,
      avgValue,
      periodLabel,
      unitLabel,
      hasRevenue: totalValue > 0,
      hasCropShare: monthlyCropRevenue.length > 0 && cropTotal > 0,
      topCrops,
      topShare,
    };
  }, [
    metricMode,
    metricLabelMap,
    revenueTrendData,
    cropRevenueData,
    ledgersWithValue,
    allTasks,
    normalizedStart,
    normalizedEnd,
    viewUnit,
  ]);

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
        {/* 기간 선택 (라벨 없이 날짜만) */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={startDateStr}
            onChange={(e) => setStartDateStr(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-900 bg-white focus:ring-2 focus:ring-[#4CAF50]/30 focus:border-[#4CAF50] outline-none"
          />
          <span className="text-sm text-gray-400">~</span>
          <input
            type="date"
            value={endDateStr}
            onChange={(e) => setEndDateStr(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-900 bg-white focus:ring-2 focus:ring-[#4CAF50]/30 focus:border-[#4CAF50] outline-none"
          />
        </div>

        {/* 이번 달 인사이트 */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">
              이번 달 인사이트
            </h2>
          </div>
          <Card className="rounded-xl border border-gray-100 shadow-sm">
            <CardContent className="p-4 space-y-3">
              {/* 1. 총 매출/평균 매출 카드형 요약 */}
              <div className="flex items-start gap-2">
                <span className="mt-0.5 text-base">✓</span>
                <div className="flex-1 space-y-1">
                  {insights.hasRevenue ? (
                    <>
                      <p className="text-xs text-gray-600">
                        이번 달 <span className="font-semibold">총 {insights.metricLabel}</span>
                      </p>
                      <p className="text-xl font-bold text-[#4CAF50]">
                        ₩{Math.round(insights.totalValue).toLocaleString()}원
                      </p>
                      <p className="text-xs text-gray-600">
                        {insights.periodLabel} 기간 동안{" "}
                        <span className="font-semibold">
                          {insights.unitLabel} 평균 {insights.metricLabel}
                        </span>
                        은
                        <br className="block md:hidden" />
                        {" "}
                        <span className="font-semibold text-gray-900">
                          약 ₩{Math.round(insights.avgValue).toLocaleString()}원
                        </span>
                        이에요.
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-700">
                      이번 달 {insights.metricLabel} 데이터가 아직 없어요. 기간을 넓혀보거나 장부에
                      거래를 등록해보세요.
                    </p>
                  )}
                </div>
              </div>

              {/* 2. 상위 작물 카드형 요약 */}
              <div className="flex items-start gap-2 pt-1 border-t border-gray-100">
                <span className="mt-0.5 text-base">✓</span>
                <div className="flex-1 space-y-1">
                  {insights.hasCropShare ? (
                    <>
                      <p className="text-xs text-gray-600">
                        이번 달{" "}
                        <span className="font-semibold">
                          {insights.metricLabel} 상위 작물 순위
                        </span>
                        예요.
                      </p>
                      <ol className="mt-1 space-y-0.5 text-sm text-gray-900">
                        {insights.topCrops.map((crop, index) => (
                          <li key={crop.name} className="flex items-baseline gap-1">
                            <span className="text-xs text-gray-500">
                              {index + 1}.
                            </span>
                            <span>{crop.name}</span>
                            <span className="mx-1 text-gray-500">:</span>
                            <span className="font-semibold">
                              ₩{Math.round(crop.value).toLocaleString()}원
                            </span>
                          </li>
                        ))}
                      </ol>
                      <p className="text-xs text-gray-600">
                        상위 3개 작물이 전체 {insights.metricLabel}의 약{" "}
                        <span className="font-semibold">
                          {insights.topShare.toFixed(1)}%
                        </span>
                        을 차지하고 있어요.
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-700">
                      이번 달 작물별 {insights.metricLabel} 비중을 계산할 수 있는 데이터가 없어요.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 내 농장의 수익 현황은? */}
        <section className="space-y-3">
          <div className="w-full rounded-xl bg-[#E8F5E9] px-4 py-2">
            <h2 className="text-xl font-bold text-gray-900">내 농장의 수익 현황은?</h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-medium text-gray-500">조회 기준</span>
            <Popover open={metricPopoverOpen} onOpenChange={setMetricPopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex h-8 items-center whitespace-nowrap rounded-full border border-green-300 bg-green-50 px-3 text-sm text-green-800 hover:bg-green-100"
                >
                  {metricLabelMap[metricMode]}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="start">
                <div className="flex flex-col gap-1 min-w-[96px]">
                  {[
                    { value: "revenue" as const, label: "매출" },
                    { value: "cost" as const, label: "비용" },
                    { value: "netProfit" as const, label: "순수익" },
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => {
                        setMetricMode(item.value);
                        setMetricPopoverOpen(false);
                      }}
                      className={`h-8 rounded-md px-3 text-left text-sm ${
                        metricMode === item.value
                          ? "bg-green-100 text-green-800"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <Popover open={aggregatePopoverOpen} onOpenChange={setAggregatePopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex h-8 items-center whitespace-nowrap rounded-full border border-orange-300 bg-orange-50 px-3 text-sm text-orange-800 hover:bg-orange-100"
                >
                  {aggregateLabelMap[aggregateMode]}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="start">
                <div className="flex flex-col gap-1 min-w-[96px]">
                  {[
                    { value: "detail" as const, label: "상세" },
                    { value: "average" as const, label: "평균" },
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => {
                        setAggregateMode(item.value);
                        setDetailPeriodOffset(0);
                        setAggregatePopoverOpen(false);
                      }}
                      className={`h-8 rounded-md px-3 text-left text-sm ${
                        aggregateMode === item.value
                          ? "bg-orange-100 text-orange-800"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <Card className="rounded-xl shadow-sm border border-gray-100">
            <CardContent className="p-4 space-y-6">
              <TrendChart
                embedded
                chartTitle={
                  metricMode === "revenue" ? "매출액 추이" : metricMode === "cost" ? "비용 추이" : "순수익 추이"
                }
                data={revenueTrendData}
                viewUnit={viewUnit}
                onViewUnitChange={(unit) => {
                  setViewUnit(unit);
                  setDetailPeriodOffset(0);
                }}
                viewUnitOptions={chartViewOptions}
                criterionLabel={rangeLabel}
                navigation={{
                  enabled: aggregateMode === "detail",
                  onPrev: () => {
                    if (viewUnit === "yearly" || !canGoPrev) return;
                    setDetailPeriodOffset((v) => v + 1);
                  },
                  onNext: () => {
                    if (viewUnit === "yearly") return;
                    setDetailPeriodOffset((v) => Math.max(v - 1, 0));
                  },
                  canPrev: canGoPrev,
                  canNext: viewUnit === "yearly" ? false : detailPeriodOffset > 0,
                }}
              />
              <div className="border-t border-gray-100 pt-4">
                <CropRevenueShareChart
                  embedded
                  title={
                    metricMode === "revenue"
                      ? "작물별 매출 비중"
                      : metricMode === "cost"
                        ? "작물별 비용 비중"
                        : "작물별 순수익 비중"
                  }
                  data={cropRevenueData}
                />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 내 농장의 작업 현황은? */}
        <section className="space-y-4">
          <div className="w-full rounded-xl bg-[#E8F5E9] px-4 py-2">
            <h2 className="text-xl font-bold text-gray-900">내 농장의 작업 현황은?</h2>
          </div>
          {cropMixData.totalRows > 0 && (
            <CropMixChart
              data={cropMixData.data}
              totalRows={cropMixData.totalRows}
              usedRows={cropMixData.usedRows}
            />
          )}
          {blockStatuses.length > 0 && <BlockHealthGrid blocks={blockStatuses} />}
        </section>
      </div>
    </div>
  );
}
