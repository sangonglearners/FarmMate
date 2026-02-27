import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { useState } from "react";

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

const COLORS = ["#3b82f6", "#10b981", "#f59e0b"]; // Blue, Green, Orange

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const cropData = data.payload as CropData;
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="text-sm font-medium text-gray-900">{data.name}</p>
        <p className="text-sm text-gray-600">
          이랑 수: {data.value}개
        </p>
        <p className="text-sm text-gray-600">
          비율: {cropData.percentage.toFixed(2)}%
        </p>
        {cropData.name === "기타" && cropData.others && cropData.others.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <p className="text-xs font-medium text-gray-700 mb-1">포함 작물:</p>
            <p className="text-xs text-gray-600">
              {cropData.others.join(", ")}
            </p>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export function CropMixChart({ data, totalRows, usedRows }: CropMixChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

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
          {/* 왼쪽: 원그래프 */}
          <div className="h-64 w-64 flex-shrink-0 relative -ml-6">
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
                  activeShape={{ outerRadius: 110 }}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(undefined)}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  content={<CustomTooltip />} 
                  cursor={{ fill: 'transparent' }}
                  wrapperStyle={{ outline: 'none' }}
                />
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
