import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useEffect, useState } from "react";

interface RevenueData {
  period: string; // week, day, month, year
  value: number;
  change?: number; // 전주/전일/전월/전년 대비 증감률
}

interface TrendChartProps {
  data: RevenueData[];
  periodType: "daily" | "weekly" | "monthly" | "yearly";
}

// CSS 변수에서 primary 색상을 읽어오는 함수
const getPrimaryColor = (): string => {
  if (typeof window === "undefined") return "#5cb85c"; // 기본값 (hsl(122, 39%, 49%)의 hex 근사값)
  
  const root = document.documentElement;
  const primaryHsl = getComputedStyle(root).getPropertyValue("--primary").trim();
  
  // hsl(122, 39%, 49%) 형식을 hex로 변환
  if (primaryHsl.startsWith("hsl")) {
    const matches = primaryHsl.match(/\d+/g);
    if (matches && matches.length >= 3) {
      const h = parseInt(matches[0]);
      const s = parseInt(matches[1]) / 100;
      const l = parseInt(matches[2]) / 100;
      
      // HSL to RGB 변환
      const c = (1 - Math.abs(2 * l - 1)) * s;
      const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
      const m = l - c / 2;
      
      let r = 0, g = 0, b = 0;
      
      if (h >= 0 && h < 60) {
        r = c; g = x; b = 0;
      } else if (h >= 60 && h < 120) {
        r = x; g = c; b = 0;
      } else if (h >= 120 && h < 180) {
        r = 0; g = c; b = x;
      } else if (h >= 180 && h < 240) {
        r = 0; g = x; b = c;
      } else if (h >= 240 && h < 300) {
        r = x; g = 0; b = c;
      } else {
        r = c; g = 0; b = x;
      }
      
      r = Math.round((r + m) * 255);
      g = Math.round((g + m) * 255);
      b = Math.round((b + m) * 255);
      
      return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
    }
  }
  
  return "#5cb85c"; // 기본값
};

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
  const [primaryColor, setPrimaryColor] = useState<string>("#5cb85c");

  useEffect(() => {
    setPrimaryColor(getPrimaryColor());
  }, []);

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
                stroke={primaryColor} 
                strokeWidth={2}
                dot={{ fill: primaryColor, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
