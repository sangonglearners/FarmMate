import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface CropData {
  name: string;
  value: number; // 이랑 수
  percentage: number; // 전체 대비 %
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
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="text-sm font-medium text-gray-900">{data.name}</p>
        <p className="text-sm text-gray-600">
          이랑 수: {data.value}개
        </p>
        <p className="text-sm text-gray-600">
          비율: {data.payload.percentage.toFixed(2)}%
        </p>
      </div>
    );
  }
  return null;
};

export function CropMixChart({ data, totalRows, usedRows }: CropMixChartProps) {
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
        
        <div className="flex flex-row items-center gap-6">
          {/* 왼쪽: 원그래프 */}
          <div className="h-64 w-64 flex-shrink-0 relative">
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
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
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
          <div className="flex-1 space-y-3 pt-8">
            {data.map((crop, index) => (
              <div key={crop.name} className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{crop.name}</p>
                  <p className="text-xs text-gray-600">
                    이랑 {crop.value}개 · {crop.percentage.toFixed(2)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
