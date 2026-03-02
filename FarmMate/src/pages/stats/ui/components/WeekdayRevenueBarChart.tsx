import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const DEEP_GREEN = "#4CAF50";

interface WeekdayRevenueBarChartProps {
  title?: string;
  data: { dayName: string; average: number }[];
}

export function WeekdayRevenueBarChart({ title = "요일별 매출 평균", data }: WeekdayRevenueBarChartProps) {
  return (
    <Card className="rounded-xl shadow-sm border border-gray-100">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">{title}</CardTitle>
        <p className="text-xs text-gray-500">선택 기간 내 요일별 평균</p>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="dayName" stroke="#6b7280" style={{ fontSize: "12px" }} />
              <YAxis
                stroke="#6b7280"
                style={{ fontSize: "12px" }}
                tickFormatter={(v) => `${(v / 1000).toLocaleString()}`}
              />
              <Tooltip
                formatter={(value: number) => [`₩${value.toLocaleString()}`, "평균 매출"]}
                labelFormatter={(label) => `${label}요일`}
              />
              <Bar dataKey="average" fill={DEEP_GREEN} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
