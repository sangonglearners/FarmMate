import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import type { ViewUnit } from "../../utils/stats-data";

export interface RevenueDataPoint {
  period: string;
  value: number;
}

interface TrendChartProps {
  chartTitle?: string;
  data: RevenueDataPoint[];
  viewUnit: ViewUnit;
  onViewUnitChange: (unit: ViewUnit) => void;
  /** 토글 오른쪽에 표시할 기준 구간 (예: 25.03~26.03 월) */
  criterionLabel?: string;
  viewUnitOptions?: { value: ViewUnit; label: string }[];
  embedded?: boolean;
}

const DEEP_GREEN = "#4CAF50";
const Y_AXIS_WIDTH = 56;
const CHART_MARGIN_TOP = 8;
const CHART_MARGIN_RIGHT = 20;
const CHART_MARGIN_LEFT = 0;
const CHART_MARGIN_BOTTOM = 10;
const X_AXIS_PADDING_LEFT = 30;
const X_AXIS_PADDING_RIGHT = 12;
const MIN_Y_TICKS = 4;
const MAX_Y_TICKS = 6;
const TARGET_Y_TICKS = 5;
const Y_HEADROOM_RATIO = 0.1;

const VIEW_UNITS: { value: ViewUnit; label: string }[] = [
  { value: "daily", label: "일" },
  { value: "monthly", label: "월" },
  { value: "quarterly", label: "분기" },
  { value: "yearly", label: "연" },
];

/** 차트 시리즈: valueK=천원(축·플롯), valueWon=원(툴팁 표기). DB·통계는 원 단위. */
type TrendChartRow = RevenueDataPoint & { valueK: number; valueWon: number };

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload as TrendChartRow;
    const won = typeof d.valueWon === "number" ? d.valueWon : d.valueK * 1000;
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-xl shadow-lg">
        <p className="text-sm font-medium text-gray-900">{d.period}</p>
        <p className="text-lg font-bold text-gray-900">₩{Math.round(won).toLocaleString()}</p>
      </div>
    );
  }
  return null;
};

const CustomMonthTick = ({ x, y, payload, index }: any) => {
  const tickIndex =
    typeof payload?.index === "number"
      ? payload.index
      : typeof index === "number"
        ? index
        : 0;
  if (tickIndex % 2 !== 0) return null;
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={6}
        textAnchor="middle"
        dominantBaseline="hanging"
        fill="#6b7280"
        fontSize="12px"
      >
        {payload.value}
      </text>
    </g>
  );
};

/** 분기: 월처럼 두 개마다 한 번씩만 표시 (24.Q1, 24.Q3, 25.Q1 …) */
const CustomQuarterTick = ({ x, y, payload, isMobile }: any) => {
  const fontSize = isMobile ? 14 : 12;
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={6}
        textAnchor="middle"
        dominantBaseline="hanging"
        fill="#6b7280"
        fontSize={fontSize}
        fontWeight={500}
        style={{ textRendering: "optimizeLegibility" }}
      >
        {payload.value}
      </text>
    </g>
  );
};

/** 연도: 모바일에서 분기/연 라벨이 깨지지 않도록 폰트 보정 */
const CustomYearTick = ({ x, y, payload, isMobile }: any) => {
  const fontSize = isMobile ? 14 : 12;
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={6}
        textAnchor="middle"
        dominantBaseline="hanging"
        fill="#6b7280"
        fontSize={fontSize}
        fontWeight={500}
        style={{ textRendering: "optimizeLegibility" }}
      >
        {payload.value}
      </text>
    </g>
  );
};

function getTargetVisibleCount(viewUnit: ViewUnit) {
  if (viewUnit === "daily") return 7;
  if (viewUnit === "monthly") return 12;
  if (viewUnit === "quarterly" || viewUnit === "yearly") return 6;
  return 6;
}

function getNiceStep(rawStep: number) {
  if (rawStep <= 0 || !Number.isFinite(rawStep)) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  if (normalized <= 1) return 1 * magnitude;
  if (normalized <= 2) return 2 * magnitude;
  if (normalized <= 5) return 5 * magnitude;
  return 10 * magnitude;
}

function buildYAxisConfig(values: number[]) {
  const maxValue = Math.max(...values, 0);
  if (maxValue <= 0) {
    return { domain: [0, 1] as [number, number], ticks: [0, 1] };
  }

  const paddedMax = maxValue * (1 + Y_HEADROOM_RATIO);
  const candidates = [MIN_Y_TICKS, TARGET_Y_TICKS, MAX_Y_TICKS];
  let best: { step: number; niceMax: number; tickCount: number } | null = null;

  for (const wantedTicks of candidates) {
    const step = getNiceStep(paddedMax / Math.max(wantedTicks - 1, 1));
    const niceMax = Math.ceil(paddedMax / step) * step;
    const tickCount = Math.floor(niceMax / step) + 1;
    const isPreferredRange = tickCount >= MIN_Y_TICKS && tickCount <= MAX_Y_TICKS;
    const score = Math.abs(tickCount - TARGET_Y_TICKS);

    if (!best) {
      best = { step, niceMax, tickCount };
      continue;
    }

    const bestInRange = best.tickCount >= MIN_Y_TICKS && best.tickCount <= MAX_Y_TICKS;
    const bestScore = Math.abs(best.tickCount - TARGET_Y_TICKS);

    if ((isPreferredRange && !bestInRange) || (isPreferredRange === bestInRange && score < bestScore)) {
      best = { step, niceMax, tickCount };
    }
  }

  const finalStep = best?.step ?? 1;
  const finalMax = Math.max(best?.niceMax ?? 1, finalStep);
  const ticks = Array.from({ length: Math.floor(finalMax / finalStep) + 1 }, (_, i) => Number((i * finalStep).toFixed(8)));
  if (ticks[0] !== 0) ticks.unshift(0);

  // values는 천원. 약 2만 원(20천원) 미만 데이터가 있으면 저구간 눈금 보강.
  const hasLowBandData = values.some((v) => v > 0 && v < 20);
  if (hasLowBandData) {
    const lowBandTicks = [0, 5, 10, 15, 20].filter((v) => v <= finalMax);
    const merged = Array.from(new Set([...ticks, ...lowBandTicks])).sort((a, b) => a - b);
    return { domain: [0, finalMax] as [number, number], ticks: merged };
  }

  return { domain: [0, finalMax] as [number, number], ticks };
}

function calculateChartInnerWidth({
  totalCount,
  targetVisibleCount,
  plotViewportWidth,
  marginLeft,
  marginRight,
  axisPaddingLeft,
  axisPaddingRight,
}: {
  totalCount: number;
  targetVisibleCount: number;
  plotViewportWidth: number;
  marginLeft: number;
  marginRight: number;
  axisPaddingLeft: number;
  axisPaddingRight: number;
}) {
  if (plotViewportWidth <= 0) {
    return { chartInnerWidth: 0, visibleCount: Math.min(Math.max(totalCount, 1), targetVisibleCount) };
  }

  const safeTotalCount = Math.max(totalCount, 1);
  const visibleCount = Math.min(safeTotalCount, targetVisibleCount);
  const viewportPlotInnerWidth = Math.max(
    plotViewportWidth - marginLeft - marginRight - axisPaddingLeft - axisPaddingRight,
    1
  );
  const bandWidth = viewportPlotInnerWidth / visibleCount;
  const plotInnerWidth = bandWidth * safeTotalCount;
  const chartInnerWidth = Math.round(
    plotInnerWidth + marginLeft + marginRight + axisPaddingLeft + axisPaddingRight
  );

  return { chartInnerWidth, visibleCount, bandWidth };
}

export function TrendChart({
  chartTitle = "매출액 추이",
  data,
  viewUnit,
  onViewUnitChange,
  criterionLabel,
  viewUnitOptions,
  embedded = false,
}: TrendChartProps) {
  const isMobile = useIsMobile();
  const units = viewUnitOptions ?? VIEW_UNITS;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [plotViewportWidth, setPlotViewportWidth] = useState(0);
  const [plotViewportHeight, setPlotViewportHeight] = useState(0);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);

  const targetVisibleCount = useMemo(() => getTargetVisibleCount(viewUnit), [viewUnit]);

  const chartData: TrendChartRow[] = useMemo(
    () =>
      data.map((d) => {
        const valueWon = d.value;
        const valueK = valueWon / 1000;
        return { ...d, valueK, valueWon };
      }),
    [data],
  );

  const yAxisConfig = useMemo(() => buildYAxisConfig(chartData.map((d) => d.valueK)), [chartData]);

  const chartWidthMeta = useMemo(
    () =>
      calculateChartInnerWidth({
        totalCount: chartData.length,
        targetVisibleCount,
        plotViewportWidth,
        marginLeft: CHART_MARGIN_LEFT,
        marginRight: CHART_MARGIN_RIGHT,
        axisPaddingLeft: X_AXIS_PADDING_LEFT,
        axisPaddingRight: X_AXIS_PADDING_RIGHT,
      }),
    [chartData.length, plotViewportWidth, targetVisibleCount]
  );
  const chartInnerWidth = chartWidthMeta.chartInnerWidth;
  const chartMargin = useMemo(
    () => ({ top: CHART_MARGIN_TOP, right: CHART_MARGIN_RIGHT, bottom: CHART_MARGIN_BOTTOM, left: CHART_MARGIN_LEFT }),
    []
  );
  const xAxisHeight = isMobile ? 34 : 28;

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const syncFromScrollport = () => {
      // 스크롤 뷰포트 기준: 가로 스크롤바가 생기면 clientHeight만 줄어듦. 너비 계산은 clientWidth와 동일 스킴으로 맞춤
      setPlotViewportWidth(el.clientWidth);
      setPlotViewportHeight(el.clientHeight);
    };

    syncFromScrollport();
    const observer = new ResizeObserver(() => {
      syncFromScrollport();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const updateFadeVisibility = () => {
    const el = scrollRef.current;
    if (!el) return;
    const maxLeft = el.scrollWidth - el.clientWidth;
    setShowLeftFade(el.scrollLeft > 2);
    setShowRightFade(maxLeft - el.scrollLeft > 2);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = Math.max(0, el.scrollWidth - el.clientWidth);
    updateFadeVisibility();
  }, [viewUnit, chartInnerWidth, chartData.length]);

  useEffect(() => {
    updateFadeVisibility();
  }, [plotViewportWidth, plotViewportHeight]);

  const content = (
    <>
      <div className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="text-base font-semibold text-gray-900">{chartTitle}</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex w-fit max-w-full rounded-xl bg-gray-100 p-1 gap-0.5 [&_button]:touch-manipulation [&_button]:outline-none [&_button]:[-webkit-tap-highlight-color:transparent]">
              {units.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onViewUnitChange(value)}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    viewUnit === value
                      ? "bg-[#4CAF50] text-white shadow-sm active:bg-[#4CAF50] focus:bg-[#4CAF50] focus-visible:ring-2 focus-visible:ring-green-400/60 focus-visible:ring-offset-1"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-200 active:bg-gray-200 focus:bg-gray-200 focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-1"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {criterionLabel && (
              <span className="text-xs text-gray-500 whitespace-nowrap">{criterionLabel}</span>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">단위: 천원</p>
      </div>
      <div className="h-64 relative -ml-4 w-[calc(100%+1rem)]">
        <div className="h-full w-full flex min-h-0 overflow-hidden rounded-lg border border-gray-100 bg-white">
          <div
            className="shrink-0 border-r border-gray-100 bg-white min-h-0 self-stretch flex flex-col"
            style={{ width: `${Y_AXIS_WIDTH}px` }}
          >
            <div className="min-h-0 flex-1 w-full" style={{ height: plotViewportHeight || undefined }}>
              <ResponsiveContainer width="100%" height={plotViewportHeight > 0 ? plotViewportHeight : "100%"}>
                <LineChart data={chartData} margin={chartMargin}>
                  <XAxis
                    dataKey="period"
                    height={xAxisHeight}
                    axisLine={false}
                    tickLine={false}
                    tick={false}
                  />
                  <YAxis
                    stroke="#6b7280"
                    width={Y_AXIS_WIDTH}
                    axisLine={false}
                    tickLine={false}
                    scale="linear"
                    style={{ fontSize: "12px" }}
                    domain={yAxisConfig.domain}
                    ticks={yAxisConfig.ticks}
                    tickFormatter={(v) =>
                      Math.abs(Number(v)) < 1e-9 ? "0" : `${Math.round(Number(v)).toLocaleString()}`
                    }
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="relative flex-1 min-w-0 min-h-0 overflow-hidden flex flex-col">
            <div
              ref={scrollRef}
              className="min-h-0 flex-1 w-full min-w-0 overflow-x-auto overflow-y-hidden"
              onScroll={updateFadeVisibility}
            >
              <div
                className="box-border"
                style={{
                  width: chartInnerWidth > 0 ? chartInnerWidth : "100%",
                  height: plotViewportHeight > 0 ? plotViewportHeight : "100%",
                  minHeight: plotViewportHeight > 0 ? plotViewportHeight : undefined,
                }}
              >
                {chartInnerWidth > 0 && plotViewportHeight > 0 ? (
                  <ResponsiveContainer width={chartInnerWidth} height={plotViewportHeight}>
                    <LineChart data={chartData} margin={chartMargin}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="period"
                        stroke="#6b7280"
                        height={xAxisHeight}
                        style={{ fontSize: isMobile ? 14 : 12 }}
                        interval={0}
                        tickMargin={8}
                        padding={{ left: X_AXIS_PADDING_LEFT, right: X_AXIS_PADDING_RIGHT }}
                        allowDuplicatedCategory={false}
                        minTickGap={8}
                        tick={
                          viewUnit === "monthly"
                            ? <CustomMonthTick />
                            : viewUnit === "quarterly"
                              ? <CustomQuarterTick isMobile={isMobile} />
                              : viewUnit === "yearly"
                                ? <CustomYearTick isMobile={isMobile} />
                                : undefined
                        }
                      />
                      <YAxis hide scale="linear" domain={yAxisConfig.domain} ticks={yAxisConfig.ticks} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="valueK"
                        stroke={DEEP_GREEN}
                        strokeWidth={2}
                        dot={{ fill: DEEP_GREEN, r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full w-full" aria-hidden />
                )}
              </div>
            </div>
            {showLeftFade && (
              <div className="pointer-events-none absolute left-0 top-0 h-full w-8 bg-gradient-to-r from-white to-transparent" />
            )}
            {showRightFade && (
              <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-white to-transparent" />
            )}
          </div>
        </div>
      </div>
    </>
  );

  if (embedded) {
    return <div>{content}</div>;
  }

  return (
    <Card className="rounded-xl shadow-sm border border-gray-100">
      <CardHeader className="pb-2">
        <CardTitle className="sr-only">{chartTitle}</CardTitle>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
