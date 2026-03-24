import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useEffect, useMemo, useRef, useState } from "react";
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

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-xl shadow-lg">
        <p className="text-sm font-medium text-gray-900">{d.period}</p>
        <p className="text-lg font-bold text-gray-900">₩{Math.round(d.value).toLocaleString()}</p>
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

function getPercentile(sortedValues: number[], percentile: number) {
  if (!sortedValues.length) return 0;
  const index = (sortedValues.length - 1) * percentile;
  const low = Math.floor(index);
  const high = Math.ceil(index);
  if (low === high) return sortedValues[low] ?? 0;
  const weight = index - low;
  const lowValue = sortedValues[low] ?? 0;
  const highValue = sortedValues[high] ?? 0;
  return lowValue * (1 - weight) + highValue * weight;
}

function getAdaptiveYAxisScale(values: number[]) {
  const positives = values.filter((v) => v > 0).sort((a, b) => a - b);
  if (!positives.length) return "linear" as const;

  const maxValue = positives[positives.length - 1] ?? 0;
  const medianValue = getPercentile(positives, 0.5);
  const p75Value = getPercentile(positives, 0.75);

  const ratioToMedian = maxValue / Math.max(medianValue, 1);
  const ratioToP75 = maxValue / Math.max(p75Value, 1);

  // 이상치가 큰 분포에서는 sqrt 축으로 작은 값 영역 가시성을 높인다.
  if (ratioToMedian >= 4 || ratioToP75 >= 3) return "sqrt" as const;
  return "linear" as const;
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

  // 20,000 이하 구간에 실제 데이터가 있으면 저구간 축도 명시적으로 보강한다.
  const hasLowBandData = values.some((v) => v > 0 && v < 20000);
  if (hasLowBandData) {
    const lowBandTicks = [0, 5000, 10000, 15000, 20000].filter((v) => v <= finalMax);
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
  const chartInnerWidth = plotInnerWidth + marginLeft + marginRight + axisPaddingLeft + axisPaddingRight;

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
  const plotViewportRef = useRef<HTMLDivElement>(null);
  const [plotViewportWidth, setPlotViewportWidth] = useState(0);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);
  const [scrollbarHeight, setScrollbarHeight] = useState(0);

  const targetVisibleCount = useMemo(() => getTargetVisibleCount(viewUnit), [viewUnit]);

  const yAxisConfig = useMemo(() => buildYAxisConfig(data.map((d) => d.value)), [data]);
  const yAxisScale = useMemo(() => getAdaptiveYAxisScale(data.map((d) => d.value)), [data]);

  const chartWidthMeta = useMemo(
    () =>
      calculateChartInnerWidth({
        totalCount: data.length,
        targetVisibleCount,
        plotViewportWidth,
        marginLeft: CHART_MARGIN_LEFT,
        marginRight: CHART_MARGIN_RIGHT,
        axisPaddingLeft: X_AXIS_PADDING_LEFT,
        axisPaddingRight: X_AXIS_PADDING_RIGHT,
      }),
    [data.length, plotViewportWidth, targetVisibleCount]
  );
  const chartInnerWidth = chartWidthMeta.chartInnerWidth;
  const chartMargin = useMemo(
    () => ({ top: CHART_MARGIN_TOP, right: CHART_MARGIN_RIGHT, bottom: CHART_MARGIN_BOTTOM, left: CHART_MARGIN_LEFT }),
    []
  );
  const xAxisHeight = isMobile ? 34 : 28;

  useEffect(() => {
    if (!plotViewportRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const nextWidth = entries[0]?.contentRect.width ?? 0;
      setPlotViewportWidth(nextWidth);
    });
    observer.observe(plotViewportRef.current);
    return () => observer.disconnect();
  }, []);

  const updateFadeVisibility = () => {
    const el = scrollRef.current;
    if (!el) return;
    const maxLeft = el.scrollWidth - el.clientWidth;
    setShowLeftFade(el.scrollLeft > 2);
    setShowRightFade(maxLeft - el.scrollLeft > 2);
    setScrollbarHeight(el.offsetHeight - el.clientHeight);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = Math.max(0, el.scrollWidth - el.clientWidth);
    updateFadeVisibility();
  }, [viewUnit, chartInnerWidth, data.length]);

  useEffect(() => {
    updateFadeVisibility();
  }, [plotViewportWidth]);

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
        <div className="h-full w-full flex overflow-hidden rounded-lg border border-gray-100 bg-white">
          <div
            className="shrink-0 border-r border-gray-100 bg-white"
            style={{ width: `${Y_AXIS_WIDTH}px` }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={chartMargin}>
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
                  scale={yAxisScale}
                  style={{ fontSize: "12px" }}
                  domain={yAxisConfig.domain}
                  ticks={yAxisConfig.ticks}
                  tickFormatter={(v) => (Math.abs(Number(v)) < 1e-6 ? "0원" : `${Math.round(Number(v) / 1000).toLocaleString()}`)}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="relative flex-1 overflow-hidden" ref={plotViewportRef}>
            <div
              ref={scrollRef}
              className="h-full overflow-x-auto overflow-y-hidden"
              onScroll={updateFadeVisibility}
            >
              <div style={{ width: chartInnerWidth || "100%", height: "100%" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data} margin={chartMargin}>
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
                    <YAxis hide scale={yAxisScale} domain={yAxisConfig.domain} ticks={yAxisConfig.ticks} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={DEEP_GREEN}
                      strokeWidth={2}
                      dot={{ fill: DEEP_GREEN, r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
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
