import { Card, CardContent } from "@/components/ui/card";

interface NetProfitCardProps {
  mode: "revenue" | "netProfit" | "cost";
  averageValue: number;
  totalRevenue: number;
  totalCost: number;
  className?: string;
}

export function NetProfitCard({
  mode,
  averageValue,
  totalRevenue,
  totalCost,
  className,
}: NetProfitCardProps) {
  const netProfit = totalRevenue - totalCost;
  const isRevenueMode = mode === "revenue";
  const isCostMode = mode === "cost";
  const cumulativeValue = isRevenueMode ? totalRevenue : isCostMode ? totalCost : netProfit;

  const avgLabel = isRevenueMode ? "평균 매출" : isCostMode ? "평균 비용" : "평균 순수익";
  const cumLabel = isRevenueMode ? "누적 매출" : isCostMode ? "누적 비용" : "누적 순수익";
  const isPositive = !isRevenueMode && !isCostMode ? netProfit >= 0 : true;

  return (
    <Card className={`rounded-xl shadow-sm border border-gray-100 ${className ?? ""}`}>
      <CardContent className="p-6">
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs text-gray-500">{avgLabel}</span>
            <p
              className={`text-lg font-semibold ${
                isRevenueMode || isCostMode ? "text-gray-900" : isPositive ? "text-[#4CAF50]" : "text-red-600"
              }`}
            >
              ₩{Math.round(averageValue).toLocaleString()}
            </p>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs text-gray-500">{cumLabel}</span>
            <p
              className={`text-lg font-semibold ${
                isRevenueMode || isCostMode ? "text-gray-900" : isPositive ? "text-[#4CAF50]" : "text-red-600"
              }`}
            >
              {!isRevenueMode && !isCostMode && isPositive ? "+" : ""}
              ₩{cumulativeValue.toLocaleString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
