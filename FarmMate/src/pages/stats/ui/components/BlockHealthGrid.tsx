import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

interface BlockStatus {
  blockId: string;
  farmName: string;
  farmId: string;
  rowNumber: number;
  status: "good" | "watch" | "danger" | "empty";
  pendingTasks?: number;
}

interface BlockHealthGridProps {
  blocks: BlockStatus[];
}

const statusColors = {
  good: "bg-green-100 border-green-300 hover:bg-green-200",
  watch: "bg-yellow-100 border-yellow-300 hover:bg-yellow-200",
  danger: "bg-red-100 border-red-300 hover:bg-red-200",
  empty: "bg-gray-100 border-gray-300 hover:bg-gray-200",
};

const statusTextColors = {
  good: "text-green-800",
  watch: "text-yellow-800",
  danger: "text-red-800",
  empty: "text-gray-600",
};

export function BlockHealthGrid({ blocks }: BlockHealthGridProps) {
  const [, setLocation] = useLocation();

  const handleBlockClick = (farmId: string) => {
    // 해당 농장의 캘린더 페이지로 이동
    setLocation(`/calendar?farmId=${farmId}`);
  };

  // 농장별로 그룹화
  const blocksByFarm = blocks.reduce((acc, block) => {
    if (!acc[block.farmName]) {
      acc[block.farmName] = [];
    }
    acc[block.farmName].push(block);
    return acc;
  }, {} as Record<string, BlockStatus[]>);

  // 농장별로 이랑 번호 순으로 정렬
  Object.keys(blocksByFarm).forEach(farmName => {
    blocksByFarm[farmName].sort((a, b) => a.rowNumber - b.rowNumber);
  });

  return (
    <Card className="rounded-lg shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">이랑별 작업 상태</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6 mb-4">
          {Object.entries(blocksByFarm).map(([farmName, farmBlocks]) => {
            return (
              <div key={farmName} className="space-y-3">
                {/* 농장 제목 - 비활성화 */}
                <h3 className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  {farmName}
                </h3>
                {/* 해당 농장의 이랑들 - 클릭 가능 */}
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3">
                  {farmBlocks.map((block) => (
                    <button
                      key={block.blockId}
                      onClick={() => handleBlockClick(block.farmId)}
                      disabled={block.status === "empty"}
                      className={cn(
                        "rounded-lg border-2 p-3 text-center transition-colors",
                        block.status === "empty" 
                          ? "cursor-not-allowed opacity-75" 
                          : "cursor-pointer",
                        statusColors[block.status]
                      )}
                    >
                      <p className={cn("text-sm font-semibold mb-1", statusTextColors[block.status])}>
                        이랑{block.rowNumber}
                      </p>
                      <p className={cn("text-xs", statusTextColors[block.status])}>
                        {block.pendingTasks}개
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-gray-700">정상</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-gray-700">주의</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-gray-700">조치 필요</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
