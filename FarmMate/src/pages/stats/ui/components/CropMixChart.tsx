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

const COLORS = [
  "#4F86C6", "#6BAA75", "#D38B5D", "#8D7BC7", "#D96C82",
  "#5CA8A6", "#C8B26E", "#9B8579", "#C16FA3", "#6F82B8",
  "#4E9C8F", "#A3B86C", "#7E78B5", "#C97C5A", "#7FBF7A",
  "#5EA4CF", "#C9A25F", "#7B8FA3", "#A0A0A0", "#4F86C6",
];

function getCropColor(cropName: string) {
  if (cropName === "기타") return "#9E9E9E";
  const normalized = cropName.trim().toLowerCase();
  if (normalized.includes("토마토")) return "#D65A5A";
  if (normalized.includes("오이")) return "#5FAF68";
  if (normalized.includes("상추")) return "#8BCF7A";
  if (normalized.includes("파프리카")) return "#E58A4A";
  if (normalized.includes("딸기")) return "#D9687B";
  if (normalized.includes("고추")) return "#C74848";
  if (normalized.includes("감자")) return "#B08A63";
  if (normalized.includes("고구마")) return "#9B6AAE";
  if (normalized.includes("배추")) return "#6FBE7C";
  if (normalized.includes("양파")) return "#C8B26E";
  if (normalized.includes("마늘")) return "#B9A27A";
  if (normalized.includes("브로콜리")) return "#4E9A63";
  if (normalized.includes("시금치")) return "#5AA06D";
  let hash = 0;
  for (let i = 0; i < cropName.length; i++) {
    hash = (hash * 31 + cropName.charCodeAt(i)) >>> 0;
  }
  return COLORS[hash % COLORS.length];
}

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

  if (usedRows === 0) {
    return (
      <Card className="rounded-xl shadow-sm border border-gray-100">
        <CardHeader>
          <CardTitle className="text-base font-semibold">작물 구성</CardTitle>
          <p className="text-xs text-gray-500 font-normal mt-1">
            작물마다 이랑을 몇 줄 쓰는지 원으로 보여 줘요. 가운데는 작업이 있는 이랑 수예요.
          </p>
        </CardHeader>
        <CardContent>
          <p className="rounded-lg border border-gray-100 bg-gray-50/40 py-10 text-center text-sm text-gray-500">
            이랑에 연결된 작업이 없어 표시할 구성이 없어요.
          </p>
        </CardContent>
      </Card>
    );
  }

  const sourceData = data;
  const centerUsedRows = usedRows;

  // 기타를 맨 아래로, 기타 포함 최대 6개
  const nonEtc = sourceData.filter((d) => d.name !== "기타").sort((a, b) => b.value - a.value);
  const etc = sourceData.filter((d) => d.name === "기타");
  const displayRaw = [...nonEtc.slice(0, 5), ...etc];
  const displayTotal = displayRaw.reduce((s, d) => s + d.value, 0);
  const chartData = displayRaw.map((d) => ({
    ...d,
    percentage: displayTotal > 0 ? (d.value / displayTotal) * 100 : 0,
  }));

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
    <Card className="rounded-xl shadow-sm border border-gray-100">
      <CardHeader>
        <CardTitle className="text-base font-semibold">작물 구성</CardTitle>
        <p className="text-xs text-gray-500 font-normal mt-1">
          작물마다 이랑을 몇 줄 쓰는지 원으로 보여 줘요. 가운데는 작업이 있는 이랑 수예요.
        </p>
      </CardHeader>
      <CardContent>
        <div>
        <div className="flex flex-row items-start gap-1">
          {/* 왼쪽: 원그래프 + 호버 시 툴팁(차트 바깥 왼쪽에 고정) */}
          <div
            ref={chartRef}
            className={`flex-shrink-0 relative ${isMobile ? "h-40 w-40 -ml-2" : "h-64 w-64 -ml-6"}`}
          >
            {/* 호버한 조각의 상세 정보 - 차트 바깥 왼쪽에 표시, 범례와 겹치지 않음 */}
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
                  이랑 수: {chartData[activeIndex].value}개
                </p>
                <p className={isMobile ? "text-xs text-gray-600" : "text-sm text-gray-600"}>
                  비율 : {chartData[activeIndex].percentage.toFixed(1)}%
                </p>
                {chartData[activeIndex].name === "기타" &&
                  chartData[activeIndex].others &&
                  chartData[activeIndex].others!.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-xs font-medium text-gray-700 mb-1">
                        포함 작물:
                      </p>
                      <p className="text-xs text-gray-600">
                        {chartData[activeIndex].others!.join(", ")}
                      </p>
                    </div>
                  )}
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
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={getCropColor(entry.name)}
                      stroke="#ffffff"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className={`font-bold text-gray-900 ${isMobile ? "text-lg" : "text-2xl"}`}>{centerUsedRows}</p>
                <p className={`text-gray-600 ${isMobile ? "text-xs" : "text-sm"}`}>사용 이랑</p>
              </div>
            </div>
          </div>
          
          {/* 오른쪽: 작물 구성 텍스트 */}
          <div className={`flex-1 pt-2 min-w-0 ${isMobile ? "space-y-1.5" : "space-y-2.5"}`}>
            {chartData.length > 0 ? (
              chartData.map((crop, index) => (
                <div key={crop.name} className={`flex items-center min-w-0 ${isMobile ? "gap-2" : "gap-2.5"}`}>
                  <div 
                    className={`rounded-full flex-shrink-0 ${isMobile ? "w-3 h-3" : "w-4 h-4"}`}
                    style={{ backgroundColor: getCropColor(crop.name) }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-gray-900 truncate ${isMobile ? "text-xs" : "text-sm"}`}>
                      {crop.name}
                    </p>
                    <p className={`text-gray-600 leading-tight ${isMobile ? "text-[10px]" : "text-xs"}`}>
                      이랑 {crop.value}개 · {crop.percentage.toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className={isMobile ? "text-xs text-gray-500" : "text-sm text-gray-500"}>등록된 작물이 없습니다</p>
            )}
          </div>
        </div>
        </div>
      </CardContent>
    </Card>
  );
}
