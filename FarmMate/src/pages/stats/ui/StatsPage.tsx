import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  format,
  subYears,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  parseISO,
  addDays,
} from "date-fns";
import { useTasks } from "@/features/task-management";
import { useFarms } from "@/features/farm-management/model/farm.hooks";
import { useCrops } from "@/features/crop-management";
import { useAuth } from "@/contexts/AuthContext";
import { listLedgers } from "@/shared/api/ledgers";
import { filterTasksByDateRange } from "@/shared/utils/task-filter";
import {
  getAnyWeatherCache,
  getWeatherDataByCoordinates,
  getCurrentLocation,
  type WeatherData,
} from "@/shared/api/weather";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { useAiCredits, useReferralCode } from "../hooks/useAiCredits";
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
  const [metricPopoverOpen, setMetricPopoverOpen] = useState(false);
  const [aggregatePopoverOpen, setAggregatePopoverOpen] = useState(false);

  // AI 인사이트 상태
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiInsightLoading, setAiInsightLoading] = useState(false);
  const [aiInsightError, setAiInsightError] = useState<string | null>(null);
  const [copyTooltip, setCopyTooltip] = useState(false);

  // 날씨 데이터: 캐시 우선, 없으면 백그라운드 fetch
  const [weatherData, setWeatherData] = useState<WeatherData | null>(() => getAnyWeatherCache());
  useEffect(() => {
    if (weatherData) return;
    getCurrentLocation()
      .then(async (location) => {
        const loc = location ?? { lat: 37.5665, lon: 126.978, name: "서울" };
        const data = await getWeatherDataByCoordinates(loc.lat, loc.lon, loc.name);
        if (data) setWeatherData(data);
      })
      .catch(() => {});
  }, []);

  // 크레딧 & 추천 링크 훅
  const {
    isAdmin,
    remainingCredits,
    totalCredits,
    bonusCredits,
    canUseAI,
    consumeCredit,
  } = useAiCredits();
  const { referralLink, copyReferralLink } = useReferralCode();

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

  const chartStart = normalizedStart;
  const chartEnd = normalizedEnd;

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

    // 날씨 데이터 (state에서 읽기: 캐시 → 백그라운드 fetch 결과 반영)
    const weather = weatherData
      ? {
          temperature: weatherData.temperature,
          minTemperature: weatherData.minTemperature,
          humidity: weatherData.humidity,
          windSpeed: weatherData.windSpeed,
          precipitationType: weatherData.precipitationType,
          skyCondition: weatherData.skyCondition,
          location: weatherData.location,
        }
      : null;

    // 오늘·이번 주 기준 날짜
    const now = new Date();
    const todayStr = format(now, "yyyy-MM-dd");
    const weekLaterStr = format(addDays(now, 7), "yyyy-MM-dd");

    // 내 농장 / 친구 농장 ID 분류
    const ownFarmIds = new Set(farms.filter((f) => f.userId === user?.id).map((f) => f.id));
    const hasFriendFarms = farms.some((f) => f.userId !== user?.id);

    // 이번 달 매출: 내 농장 / 친구 농장 분리
    const ownMonthValue = ledgersWithValue.reduce((sum, l) => {
      if (!l.taskId) return sum;
      const task = allTasks.find((x) => x.id === l.taskId);
      if (!task) return sum;
      if (task.farmId && !ownFarmIds.has(task.farmId)) return sum;
      const d = getTaskEndStr(task);
      if (d < monthStartStr || d > monthEndStr) return sum;
      return sum + l.value;
    }, 0);
    const friendMonthValue = totalValue - ownMonthValue;

    // 내 농장 작업 현황
    const ownTasksAll = allTasks.filter((t) => !t.farmId || ownFarmIds.has(t.farmId));
    const ownCompletedThisMonth = ownTasksAll.filter((t) => {
      if (t.completed !== 1) return false;
      const d = (t as any).completedAt
        ? format(new Date((t as any).completedAt), "yyyy-MM-dd")
        : null;
      return d && d >= monthStartStr && d <= monthEndStr;
    }).length;
    const ownDelayedCount = ownTasksAll.filter((t) => {
      if (t.completed === 1) return false;
      return getTaskEndStr(t) < todayStr;
    }).length;
    const ownUpcomingThisWeek = ownTasksAll.filter((t) => {
      if (t.completed === 1) return false;
      return t.scheduledDate >= todayStr && t.scheduledDate <= weekLaterStr;
    }).length;

    // 친구 농장 작업 현황
    const friendTasksAll = allTasks.filter((t) => t.farmId && !ownFarmIds.has(t.farmId));
    const friendDelayedCount = friendTasksAll.filter((t) => {
      if (t.completed === 1) return false;
      return getTaskEndStr(t) < todayStr;
    }).length;
    const friendUpcomingThisWeek = friendTasksAll.filter((t) => {
      if (t.completed === 1) return false;
      return t.scheduledDate >= todayStr && t.scheduledDate <= weekLaterStr;
    }).length;

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
      weather,
      revenueByFarm: {
        ownValue: ownMonthValue,
        friendValue: hasFriendFarms ? friendMonthValue : null,
      },
      taskStats: {
        own: {
          completedThisMonth: ownCompletedThisMonth,
          delayedCount: ownDelayedCount,
          upcomingThisWeek: ownUpcomingThisWeek,
        },
        friend: hasFriendFarms
          ? { delayedCount: friendDelayedCount, upcomingThisWeek: friendUpcomingThisWeek }
          : null,
      },
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
    weatherData,
    farms,
    user,
  ]);

  // 날짜 범위 + 지표 모드 + 오늘 날짜 조합으로 고유 캐시 키 생성 (날씨·작업 반영을 위해 하루 단위 갱신)
  const aiInsightCacheKey = useMemo(
    () => `farmmate:ai-insight:${metricMode}:${normalizedStart}:${normalizedEnd}:${format(new Date(), "yyyy-MM-dd")}`,
    [metricMode, normalizedStart, normalizedEnd]
  );

  // 캐시 키가 바뀌면 localStorage에서 해당 키의 캐시를 읽어옴
  // (없으면 null로 초기화해 "AI 인사이트 받기" 버튼 노출)
  useEffect(() => {
    const cached = localStorage.getItem(aiInsightCacheKey);
    setAiInsight(cached ?? null);
    setAiInsightError(null);
  }, [aiInsightCacheKey]);

  const fetchAiInsight = useCallback(async () => {
    if (!insights.hasRevenue && !insights.hasCropShare) return;
    if (!canUseAI) return;

    setAiInsightLoading(true);
    setAiInsightError(null);
    try {
      // 크레딧 먼저 소비 (실패해도 API는 막음)
      if (!isAdmin) {
        await consumeCredit();
      }

      const { data, error } = await supabase.functions.invoke("generate-insights", {
        body: { insights },
      });
      if (error) throw error;
      const text: string = data?.insight || "";
      setAiInsight(text || null);
      if (text) {
        localStorage.setItem(aiInsightCacheKey, text);
      }
    } catch {
      setAiInsightError("AI 인사이트를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setAiInsightLoading(false);
    }
  }, [insights, aiInsightCacheKey, canUseAI, isAdmin, consumeCredit]);

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

  // AI 인사이트 텍스트를 문장별로 나누고 작물명을 볼드 처리하여 렌더링
  const renderInsight = (text: string) => {
    const lines = text.includes("\n")
      ? text.split("\n").map((s) => s.trim()).filter(Boolean)
      : text.split(/(?<=[.!?]) /).map((s) => s.trim()).filter(Boolean);

    // AI에게 전달된 topCrops 이름 + 전체 crops 이름을 합쳐 볼드 대상으로 사용
    // (topCrops는 task.title 기반 이름도 포함하므로 crops 배열만으론 누락될 수 있음)
    const allCropNames = insights.topCrops
      .map((c) => c.name)
      .concat(crops.map((c) => c.name))
      .filter((n) => !!n && n !== "기타");
    const nameSet = new Set<string>(allCropNames);
    const cropNameList = Array.from(nameSet).sort((a, b) => b.length - a.length);

    const boldify = (line: string): React.ReactNode => {
      if (cropNameList.length === 0) return line;
      const escaped = cropNameList.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
      const pattern = new RegExp(`(${escaped.join("|")})`, "g");
      const parts = line.split(pattern);
      return parts.map((part, i) =>
        nameSet.has(part) ? (
          <strong key={i} className="font-semibold text-gray-900">
            {part}
          </strong>
        ) : (
          part
        )
      );
    };

    return (
      <div className="space-y-1.5">
        {lines.map((line, i) => (
          <p key={i} className="text-sm text-gray-700 leading-relaxed">
            {boldify(line)}
          </p>
        ))}
      </div>
    );
  };

  if (tasksLoading || ledgersLoading) {
    return (
      <div className="min-h-screen">
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
    <div className="min-h-screen">
      <div className="p-4 space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">통계</h1>
          <p className="text-gray-600 text-sm">농장 현황을 데이터로 확인해 보세요</p>
        </div>

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
            {/* 초대 링크 복사 버튼 */}
            {referralLink && (
              <button
                type="button"
                onClick={async () => {
                  const ok = await copyReferralLink();
                  if (ok) {
                    setCopyTooltip(true);
                    setTimeout(() => setCopyTooltip(false), 2000);
                  }
                }}
                className="relative flex items-center gap-1 text-xs text-[#4CAF50] font-medium hover:text-[#388E3C] transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47A3 3 0 1015 12a2.966 2.966 0 00-.117-.808l-4.94-2.47c.025-.235.025-.474 0-.709l4.94-2.47A3 3 0 0015 8z" />
                </svg>
                초대 링크 복사
                {copyTooltip && (
                  <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-0.5 whitespace-nowrap">
                    복사됨!
                  </span>
                )}
              </button>
            )}
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
              {/* 3. AI 자연어 인사이트 */}
              <div className="flex items-start gap-2 pt-1 border-t border-gray-100">
                <span className="mt-0.5 text-base">✨</span>
                <div className="flex-1 space-y-2">
                  {/* 데이터 없을 때 */}
                  {!insights.hasRevenue && !insights.hasCropShare ? (
                    <p className="text-sm text-gray-400">
                      장부에 거래를 등록하면 AI가 맞춤 인사이트를 제공해 드려요.
                    </p>
                  ) : aiInsightLoading ? (
                    <div className="flex items-center gap-2 py-1">
                      <svg
                        className="h-4 w-4 animate-spin text-[#4CAF50] shrink-0"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span className="text-sm text-gray-500">AI가 농장 데이터를 분석하고 있어요…</span>
                    </div>
                  ) : aiInsightError ? (
                    <p className="text-xs text-red-500">{aiInsightError}</p>
                  ) : aiInsight ? (
                    renderInsight(aiInsight)
                  ) : (
                    <p className="text-xs text-gray-400">버튼을 눌러 AI 요약을 받아보세요.</p>
                  )}

                  {/* 데이터 있을 때 & 로딩 아닐 때: 버튼 + 크레딧 한 줄 */}
                  {(insights.hasRevenue || insights.hasCropShare) && !aiInsightLoading && (
                    canUseAI ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={fetchAiInsight}
                          className="text-xs font-semibold text-[#4CAF50] hover:text-[#388E3C] hover:underline transition-colors"
                        >
                          {aiInsight ? "다시 생성하기" : "AI 인사이트 받기"}
                        </button>
                        {!isAdmin && (
                          <span className="text-xs text-gray-400">
                            · 이번 달{" "}
                            <span className={remainingCredits <= 1 ? "text-orange-500 font-medium" : "text-gray-500"}>
                              {remainingCredits}회
                            </span>{" "}
                            남음
                            {bonusCredits > 0 && (
                              <span className="text-blue-400"> (+{bonusCredits} 보너스)</span>
                            )}
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">
                        이번 달 크레딧을 모두 사용했어요.{" "}
                        {referralLink && (
                          <>
                            친구를 초대하면{" "}
                            <span className="text-[#4CAF50] font-medium">+2 크레딧</span>
                            을 받을 수 있어요.
                          </>
                        )}
                      </p>
                    )
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
                onViewUnitChange={setViewUnit}
                viewUnitOptions={chartViewOptions}
                criterionLabel={rangeLabel}
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
