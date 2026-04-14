import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from "recharts";
import { useState, useRef, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

const COLORS = [
  "#4CAF50", "#2196F3", "#FF9800", "#9C27B0", "#F44336",
  "#00BCD4", "#FFEB3B", "#795548", "#E91E63", "#3F51B5",
  "#009688", "#CDDC39", "#673AB7", "#FF5722", "#8BC34A",
  "#03A9F4", "#FFC107", "#607D8B", "#9E9E9E", "#4CAF50",
];

/** 장부 합이 없을 때 원·목록에 채워 넣는 예시(원 단위) */
const DEMO_CROP_REVENUE_SHARE: { name: string; value: number }[] = [
  { name: "토마토", value: 320_000 },
  { name: "상추", value: 180_000 },
  { name: "오이", value: 95_000 },
  { name: "가지", value: 72_000 },
  { name: "기타", value: 48_000 },
];

interface CropRevenueShareChartProps {
  title?: string;
  /** 빈 화면 안내용: 매출 · 비용 · 순수익 등 */
  metricLabel?: string;
  data: { name: string; value: number }[];
  embedded?: boolean;
  /** false면 거래가 없을 때 예시 원·목록 대신 빈 상태 */
  useSampleDataWhenEmpty?: boolean;
  /** 비로그인(둘러보기)일 때만 제목 아래 회색 안내 문구 표시 */
  showGuideSubtitle?: boolean;
}

export function CropRevenueShareChart({
  title = "작물별 매출 비중",
  metricLabel = "매출",
  data,
  embedded = false,
  useSampleDataWhenEmpty = true,
  showGuideSubtitle = false,
}: CropRevenueShareChartProps) {
  const rawTotal = data.reduce((s, d) => s + d.value, 0);
  const noData = data.length === 0 || rawTotal === 0;
  const useDemo = noData && useSampleDataWhenEmpty;
  const sourceData = useDemo ? DEMO_CROP_REVENUE_SHARE : data;

  const fullTotal = sourceData.reduce((s, d) => s + d.value, 0);
  const withPercentage = sourceData.map((d) => ({
    ...d,
    percentage: fullTotal > 0 ? (d.value / fullTotal) * 100 : 0,
  }));
  // 기타를 맨 아래로, 기타 포함 최대 6개
  const nonEtc = withPercentage.filter((d) => d.name !== "기타").sort((a, b) => b.value - a.value);
  const etc = withPercentage.filter((d) => d.name === "기타");
  const displayRaw = [...nonEtc.slice(0, 5), ...etc];
  const displayTotal = displayRaw.reduce((s, d) => s + d.value, 0);
  const chartData = displayRaw.map((d) => ({
    ...d,
    percentage: displayTotal > 0 ? (d.value / displayTotal) * 100 : 0,
  }));
  const total = fullTotal;

  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);
  const isMobile = useIsMobile();
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMobile) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (activeIndex !== undefined && chartRef.current && !chartRef.current.contains(target)) {
        setActiveIndex(undefined);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isMobile, activeIndex]);

  const handleMouseEnter = (_: unknown, index: number) => {
    if (!isMobile) setActiveIndex(index);
  };

  const handleMouseLeave = () => {
    if (!isMobile) setActiveIndex(undefined);
  };

  const handleSliceClick = (_: unknown, index: number) => {
    if (isMobile) {
      setActiveIndex((prev) => (prev === index ? undefined : index));
    }
  };

  if (noData && !useSampleDataWhenEmpty) {
    const emptyInner = (
      <>
        <div className="mb-3">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          {showGuideSubtitle && (
            <p className="text-xs text-gray-500 mt-1">
              왼쪽 원은 작물별 {metricLabel} 비율, 오른쪽은 작물마다 금액이에요.
            </p>
          )}
        </div>
        <p className="text-sm text-gray-500 text-center py-8 rounded-lg border border-gray-100 bg-gray-50/50 px-3 leading-relaxed">
          이 기간에 집계된 {metricLabel}이 없어요. 장부에 거래를 입력하면 여기에 표시돼요.
        </p>
      </>
    );
    if (embedded) {
      return <div>{emptyInner}</div>;
    }
    return (
      <Card className="rounded-lg shadow-sm">
        <CardHeader>
          <CardTitle className="sr-only">{title}</CardTitle>
        </CardHeader>
        <CardContent>{emptyInner}</CardContent>
      </Card>
    );
  }

  const chartBody = (
    <>
      <div className="mb-3">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        {showGuideSubtitle && (
          <p className="text-xs text-gray-500 mt-1">
            왼쪽 원은 작물별 {metricLabel} 비율, 오른쪽은 작물마다 금액이에요.
          </p>
        )}
      </div>
      {useDemo && (
        <p className="text-[clamp(9px,2.2vw,12px)] text-gray-600 mt-2 rounded-lg border border-dashed border-gray-200 bg-gray-50/80 px-3 py-2 leading-tight whitespace-nowrap">
          아래 원과 목록은 예시예요. 거래가 쌓이면 실제 비중이 표시돼요.
        </p>
      )}
      <div className={useDemo ? "mt-2 rounded-lg border border-dashed border-gray-200 bg-white p-3" : ""}>
        <div className="flex flex-row items-start gap-1">
          {/* 왼쪽: 원그래프 */}
          <div
            ref={chartRef}
            className={`flex-shrink-0 relative ${isMobile ? "h-40 w-40 -ml-2" : "h-64 w-64 -ml-6"}`}
          >
            {activeIndex !== undefined && chartData[activeIndex] && (
              <div
                className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white border border-gray-200 rounded-lg shadow-lg pointer-events-none ${
                  isMobile ? "w-[120px] p-2" : "w-[140px] p-3"
                }`}
                style={{ marginLeft: 4 }}
              >
                <p className={isMobile ? "text-xs font-medium text-gray-900" : "text-sm font-medium text-gray-900"}>
                  {chartData[activeIndex].name}
                </p>
                <p className={isMobile ? "text-xs text-gray-600" : "text-sm text-gray-600"}>
                  ₩{chartData[activeIndex].value.toLocaleString()}
                </p>
                <p className={isMobile ? "text-xs text-gray-600" : "text-sm text-gray-600"}>
                  전체의 {chartData[activeIndex].percentage.toFixed(1)}%
                </p>
              </div>
            )}
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={isMobile ? 40 : 60}
                  outerRadius={isMobile ? 65 : 100}
                  paddingAngle={2.5}
                  dataKey="value"
                  activeIndex={activeIndex}
                  activeShape={(props: React.ComponentProps<typeof Sector>) => (
                    <Sector {...props} outerRadius={isMobile ? 75 : 110} />
                  )}
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                  onClick={handleSliceClick}
                >
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="#ffffff" strokeWidth={2} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className={`font-bold text-gray-900 ${isMobile ? "text-lg" : "text-2xl"}`}>
                  {total >= 10000 ? `₩${(total / 10000).toFixed(0)}만` : `₩${total.toLocaleString()}`}
                </p>
                <p className={`text-gray-600 ${isMobile ? "text-xs" : "text-sm"}`}>총액</p>
              </div>
            </div>
          </div>

          {/* 오른쪽: 작물별 목록 (기타 맨 아래) */}
          <div className={`flex-1 pt-2 min-w-0 ${isMobile ? "space-y-1.5" : "space-y-2.5"}`}>
            {chartData.map((d, index) => (
              <div key={`${d.name}-${index}`} className={`flex items-center min-w-0 ${isMobile ? "gap-2" : "gap-2.5"}`}>
                <div
                  className={`rounded-full flex-shrink-0 ${isMobile ? "w-3 h-3" : "w-4 h-4"}`}
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-gray-900 truncate ${isMobile ? "text-xs" : "text-sm"}`}>
                    {d.name}
                  </p>
                  <p className={`text-gray-600 truncate ${isMobile ? "text-[10px]" : "text-xs"}`}>
                    ₩{d.value.toLocaleString()} · {d.percentage.toFixed(2)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );

  if (embedded) {
    return <div>{chartBody}</div>;
  }

  return (
    <Card className="rounded-lg shadow-sm">
      <CardHeader>
        <CardTitle className="sr-only">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {chartBody}
      </CardContent>
    </Card>
  );
}
