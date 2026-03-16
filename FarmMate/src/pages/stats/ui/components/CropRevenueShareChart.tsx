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

interface CropRevenueShareChartProps {
  title?: string;
  data: { name: string; value: number }[];
  embedded?: boolean;
}

export function CropRevenueShareChart({ title = "작물별 매출 비중", data, embedded = false }: CropRevenueShareChartProps) {
  const fullTotal = data.reduce((s, d) => s + d.value, 0);
  const withPercentage = data.map((d) => ({
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

  if (chartData.length === 0 || total === 0) {
    const emptyContent = (
      <div className="py-8 text-center">
        <p className="text-lg font-semibold text-gray-900">₩0</p>
        <p className="text-sm text-gray-500 mt-1">조건에 해당하는 데이터가 없습니다</p>
      </div>
    );

    if (embedded) {
      return (
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-3">{title}</h3>
          {emptyContent}
        </div>
      );
    }

    return (
      <Card className="rounded-lg shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-gray-900">{title}</CardTitle>
      </CardHeader>
        <CardContent>{emptyContent}</CardContent>
      </Card>
    );
  }

  const chartBody = (
    <>
      <h3 className="text-base font-semibold text-gray-900 mb-3">{title}</h3>
      <div>
        <div className="flex flex-row items-start gap-1">
          {/* 왼쪽: 원그래프 (작물 구성과 동일 크기·배치) */}
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
                  비율: {chartData[activeIndex].percentage.toFixed(2)}%
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
                  paddingAngle={2}
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
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
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
