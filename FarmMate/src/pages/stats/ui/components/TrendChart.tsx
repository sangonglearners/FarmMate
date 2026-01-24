import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface RevenueData {
  period: string; // week, day, month, year
  value: number;
  change?: number; // 전주/전일/전월/전년 대비 증감률
}

interface TrendChartProps {
  data: RevenueData[];
  periodType: "daily" | "weekly" | "monthly" | "yearly";
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="text-sm font-medium text-gray-900 mb-1">
          {data.period}
        </p>
        <p className="text-lg font-bold text-gray-900">
          ₩{data.value.toLocaleString()}
        </p>
        {data.change !== undefined && (
          <p className={`text-sm font-medium ${data.change >= 0 ? "text-green-600" : "text-red-600"}`}>
            {data.change >= 0 ? "+" : ""}{data.change.toFixed(2)}%
          </p>
        )}
      </div>
    );
  }
  return null;
};

export function TrendChart({ data, periodType }: TrendChartProps) {
  return (
    <Card className="rounded-lg shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">수출액 추이</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="period" 
                stroke="#6b7280"
                style={{ fontSize: "12px" }}
              />
              <YAxis 
                stroke="#6b7280"
                style={{ fontSize: "12px" }}
                tickFormatter={(value) => `₩${(value / 1000).toFixed(0)}K`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ fill: "#3b82f6", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
