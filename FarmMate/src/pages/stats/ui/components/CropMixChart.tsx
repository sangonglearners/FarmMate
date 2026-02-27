import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from "recharts";
import { useState } from "react";
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

  const handleSliceClick = (_: unknown, index: number) => {
    if (isMobile) {
      setActiveIndex((prev) => (prev === index ? undefined : index));
    }
  };

  const handleMouseEnter = (_: unknown, index: number) => {
    if (!isMobile) setActiveIndex(index);
  };

  const handleMouseLeave = () => {
    if (!isMobile) setActiveIndex(undefined);
  };

  return (
    <Card className="rounded-lg shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">작물 구성</CardTitle>
      </CardHeader>
      <CardContent>
        {/* 실제 사용 중인 이랑 & 전체 이랑 텍스트 표시 */}
        <div className="mb-4 text-sm text-gray-600">
          <span className="font-medium">사용 중인 이랑: {usedRows}개</span>
          <span className="mx-2">·</span>
          <span className="font-medium">전체 이랑: {totalRows}개</span>
        </div>
        
        <div className="flex flex-row items-start gap-1">
          {/* 왼쪽: 원그래프 + 호버 시 툴팁(차트 바깥 왼쪽에 고정) */}
          <div className="h-64 w-64 flex-shrink-0 relative -ml-6">
            {/* 호버한 조각의 상세 정보 - 차트 바깥 왼쪽에 표시, 범례와 겹치지 않음 */}
            {activeIndex !== undefined && data[activeIndex] && (
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-[140px] bg-white p-3 border border-gray-200 rounded-lg shadow-lg pointer-events-none"
                style={{ marginLeft: 4 }}
              >
                <p className="text-sm font-medium text-gray-900">
                  {data[activeIndex].name}
                </p>
                <p className="text-sm text-gray-600">
                  이랑 수: {data[activeIndex].value}개
                </p>
                <p className="text-sm text-gray-600">
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
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  activeIndex={activeIndex}
                  activeShape={(props: React.ComponentProps<typeof Sector>) => <Sector {...props} outerRadius={110} />}
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
                <p className="text-2xl font-bold text-gray-900">{usedRows}</p>
                <p className="text-sm text-gray-600">사용 중인 이랑</p>
              </div>
            </div>
          </div>
          
          {/* 오른쪽: 작물 구성 텍스트 */}
          <div className="flex-1 space-y-2.5 pt-2 min-w-0">
            {data.length > 0 ? (
              data.map((crop, index) => (
                <div key={crop.name} className="flex items-center gap-2.5 min-w-0">
                  <div 
                    className="w-4 h-4 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 whitespace-nowrap truncate">
                      {crop.name}
                    </p>
                    <p className="text-xs text-gray-600 whitespace-nowrap">
                      이랑 {crop.value}개 · {crop.percentage.toFixed(2)}%
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">등록된 작물이 없습니다</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
