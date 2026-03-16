import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useMemo } from "react";
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
  navigation?: {
    enabled: boolean;
    onPrev: () => void;
    onNext: () => void;
    canPrev: boolean;
    canNext: boolean;
  };
}

const DEEP_GREEN = "#4CAF50";

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

const CustomMonthTick = ({ x, y, payload }: any) => {
  if (payload.index % 2 !== 0) return null;
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={16} textAnchor="middle" fill="#6b7280" fontSize="12px">
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
        dy={16}
        textAnchor="middle"
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
        dy={16}
        textAnchor="middle"
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

export function TrendChart({
  chartTitle = "매출액 추이",
  data,
  viewUnit,
  onViewUnitChange,
  criterionLabel,
  viewUnitOptions,
  embedded = false,
  navigation,
}: TrendChartProps) {
  const isMobile = useIsMobile();
  const units = viewUnitOptions ?? VIEW_UNITS;
  const yAxisConfig = useMemo(() => {
    if (!data?.length) {
      return { domain: [0, 5000000] as [number, number], ticks: [0, 1000000, 2000000, 3000000, 4000000, 5000000] };
    }
    const values = data.map((d) => d.value);
    const minVal = Math.min(...values, 0);
    const maxVal = Math.max(...values, 0);
    const step = 500000;
    const minTick = minVal < 0 ? Math.floor(minVal / step) * step : 0;
    const maxTick = Math.ceil(maxVal / step) * step || step;
    const ticks: number[] = [];
    for (let v = minTick; v <= maxTick; v += step) ticks.push(v);
    return { domain: [minTick, maxTick] as [number, number], ticks };
  }, [data]);

  const content = (
    <>
      <div className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="text-lg font-semibold text-gray-900">{chartTitle}</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex w-fit max-w-full rounded-xl bg-gray-100 p-1 gap-0.5 [&_button]:touch-manipulation [&_button]:outline-none [&_button]:[-webkit-tap-highlight-color:transparent]">
              {navigation?.enabled && (
                <button
                  type="button"
                  onClick={navigation.onPrev}
                  disabled={!navigation.canPrev}
                  className="shrink-0 px-2 py-1.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="이전 구간"
                >
                  {"<"}
                </button>
              )}
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
              {navigation?.enabled && (
                <button
                  type="button"
                  onClick={navigation.onNext}
                  disabled={!navigation.canNext}
                  className="shrink-0 px-2 py-1.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="다음 구간"
                >
                  {">"}
                </button>
              )}
            </div>
            {criterionLabel && (
              <span className="text-xs text-gray-500 whitespace-nowrap">{criterionLabel}</span>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">단위: 천원</p>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, bottom: isMobile ? 28 : 20, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="period"
              stroke="#6b7280"
              style={{ fontSize: isMobile ? 14 : 12 }}
              interval={0}
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
            <YAxis
              stroke="#6b7280"
              style={{ fontSize: "12px" }}
              domain={yAxisConfig.domain}
              ticks={yAxisConfig.ticks}
              tickFormatter={(v) => `${Math.round(Number(v) / 1000).toLocaleString()}`}
            />
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
