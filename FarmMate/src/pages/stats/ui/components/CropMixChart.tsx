import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from "recharts";
import { useState, useRef, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface CropData {
  name: string;
  value: number; // 이랑 수
  percentage: number; // 전체 대비 %
  others?: string[]; // 기타 항목에 포함된 작물 목록
}

interface CropMixChartProps {
  data: CropData[];
  totalRows: number;
  usedRows: number;
}

// 농업/자연 테마 색상 팔레트 (잎·흙·밀·하늘 톤)
const COLORS = [
  "#166534", // forest green (잎)
  "#0d9488", // teal (녹물/물)
  "#ca8a04", // wheat (밀/골드)
  "#b45309", // amber (흙/갈색)
  "#1e3a2f", // sage (잎진한 녹색)
  "#78716c", // warm stone (기타 - 중립적 흙톤)
  "#0f766e", // teal green
  "#4d7c0f", // lime (연한 잎)
  "#92400e", // brown (흙)
  "#1e40af", // sky blue (하늘)
  "#15803d", // green
  "#65a30d", // light green
];

export function CropMixChart({ data, totalRows, usedRows }: CropMixChartProps) {
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

  return (
    <Card className="rounded-lg shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">작물 구성</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-row items-start gap-1">
          {/* 왼쪽: 원그래프 + 호버 시 툴팁(차트 바깥 왼쪽에 고정) */}
          <div
            ref={chartRef}
            className={`flex-shrink-0 relative ${isMobile ? "h-40 w-40 -ml-2" : "h-64 w-64 -ml-6"}`}
          >
            {/* 호버한 조각의 상세 정보 - 차트 바깥 왼쪽에 표시, 범례와 겹치지 않음 */}
            {activeIndex !== undefined && data[activeIndex] && (
              <div
                className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white border border-gray-200 rounded-lg shadow-lg pointer-events-none ${
                  isMobile ? "w-[120px] p-2" : "w-[140px] p-3"
                }`}
                style={{ marginLeft: 4 }}
              >
                <p className={isMobile ? "text-xs font-medium text-gray-900" : "text-sm font-medium text-gray-900"}>
                  {data[activeIndex].name}
                </p>
                <p className={isMobile ? "text-xs text-gray-600" : "text-sm text-gray-600"}>
                  이랑 수: {data[activeIndex].value}개
                </p>
                <p className={isMobile ? "text-xs text-gray-600" : "text-sm text-gray-600"}>
                  비율: {data[activeIndex].percentage.toFixed(2)}%
                </p>
                {data[activeIndex].name === "기타" &&
                  data[activeIndex].others &&
                  data[activeIndex].others!.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-xs font-medium text-gray-700 mb-1">
                        포함 작물:
                      </p>
                      <p className="text-xs text-gray-600">
                        {data[activeIndex].others!.join(", ")}
                      </p>
                    </div>
                  )}
              </div>
            )}
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
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
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className={`font-bold text-gray-900 ${isMobile ? "text-lg" : "text-2xl"}`}>{usedRows}</p>
                <p className={`text-gray-600 ${isMobile ? "text-xs" : "text-sm"}`}>사용 이랑</p>
              </div>
            </div>
          </div>
          
          {/* 오른쪽: 작물 구성 텍스트 */}
          <div className={`flex-1 pt-2 min-w-0 ${isMobile ? "space-y-1.5" : "space-y-2.5"}`}>
            {data.length > 0 ? (
              data.map((crop, index) => (
                <div key={crop.name} className={`flex items-center min-w-0 ${isMobile ? "gap-2" : "gap-2.5"}`}>
                  <div 
                    className={`rounded-full flex-shrink-0 ${isMobile ? "w-3 h-3" : "w-4 h-4"}`}
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-gray-900 truncate ${isMobile ? "text-xs" : "text-sm"}`}>
                      {crop.name}
                    </p>
                    <p className={`text-gray-600 truncate ${isMobile ? "text-[10px]" : "text-xs"}`}>
                      이랑 {crop.value}개 · {crop.percentage.toFixed(2)}%
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className={isMobile ? "text-xs text-gray-500" : "text-sm text-gray-500"}>등록된 작물이 없습니다</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
