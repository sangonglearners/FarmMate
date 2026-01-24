import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string;
  change?: number; // 전주 대비 증감률 (%)
  formula?: string; // 공식 설명
  className?: string;
}

export function KPICard({ title, value, change, formula, className }: KPICardProps) {
  const changeColor = change !== undefined 
    ? change >= 0 ? "text-green-600" : "text-red-600"
    : "";

  return (
    <Card className={cn("rounded-lg shadow-sm", className)}>
      <CardContent className="p-6">
        <div className="flex-1">
          <p className="text-sm text-gray-600 mb-2">{title}</p>
          <div className="flex items-baseline gap-2 mb-1">
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {change !== undefined && (
              <span className={cn("text-sm font-medium", changeColor)}>
                {change >= 0 ? "+" : ""}{change.toFixed(2)}%
              </span>
            )}
          </div>
          {formula && (
            <p className="text-xs text-gray-500 mt-2">{formula}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
