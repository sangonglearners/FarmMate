import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useState } from "react";

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
  /** false면 작업 블록이 없을 때 예시 이랑 대신 빈 상태 */
  useSampleDataWhenEmpty?: boolean;
}

const PLACEHOLDER_FARM_ID = "__farmmate_placeholder__";

const PLACEHOLDER_BLOCKS: BlockStatus[] = [
  {
    blockId: "ph-1",
    farmName: "예시 농장",
    farmId: PLACEHOLDER_FARM_ID,
    rowNumber: 1,
    status: "good",
    pendingTasks: 3,
  },
  {
    blockId: "ph-2",
    farmName: "예시 농장",
    farmId: PLACEHOLDER_FARM_ID,
    rowNumber: 2,
    status: "watch",
    pendingTasks: 5,
  },
  {
    blockId: "ph-3",
    farmName: "예시 농장",
    farmId: PLACEHOLDER_FARM_ID,
    rowNumber: 3,
    status: "danger",
    pendingTasks: 7,
  },
  {
    blockId: "ph-4",
    farmName: "예시 농장",
    farmId: PLACEHOLDER_FARM_ID,
    rowNumber: 4,
    status: "empty",
    pendingTasks: 0,
  },
];

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

export function BlockHealthGrid({
  blocks,
  useSampleDataWhenEmpty = true,
}: BlockHealthGridProps) {
  const [, setLocation] = useLocation();
  const [expandedFarms, setExpandedFarms] = useState<Record<string, boolean>>({});

  const useDemo = blocks.length === 0 && useSampleDataWhenEmpty;
  const displayBlocks = useDemo ? PLACEHOLDER_BLOCKS : blocks;

  const handleBlockClick = (farmId: string) => {
    if (farmId === PLACEHOLDER_FARM_ID) return;
    setLocation(`/calendar?farmId=${farmId}`);
  };

  // 농장별로 그룹화
  const blocksByFarm = displayBlocks.reduce((acc, block) => {
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

  // 전체 이랑 사용률 (empty가 아닌 블록 = 사용 이랑)
  const totalBlocks = displayBlocks.length;
  const usedBlocks = displayBlocks.filter((b) => b.status !== "empty").length;
  const overallUsagePct = totalBlocks > 0 ? ((usedBlocks / totalBlocks) * 100).toFixed(1) : "0";
  const formatUsage = (pct: string, used: number, total: number) => `${pct}% (${used}개/${total}개)`;

  // 농장별 이랑 사용률
  const getFarmUsage = (farmBlocks: BlockStatus[]) => {
    const total = farmBlocks.length;
    const used = farmBlocks.filter(b => b.status !== "empty").length;
    const pct = total > 0 ? ((used / total) * 100).toFixed(1) : "0";
    return { used, total, pct };
  };

  // 농장별 최고 심각도 상태 (조치 필요 > 주의, 정상/empty는 농장 색깔 없음)
  const getFarmStatus = (farmBlocks: BlockStatus[]): "danger" | "watch" | null => {
    const hasDanger = farmBlocks.some(b => b.status === "danger");
    const hasWatch = farmBlocks.some(b => b.status === "watch");
    if (hasDanger) return "danger";
    if (hasWatch) return "watch";
    return null;
  };

  const farmHeaderBorderClass = (farmBlocks: BlockStatus[]) => {
    const status = getFarmStatus(farmBlocks);
    if (status === "danger") return "border-l-4 border-l-red-500";
    if (status === "watch") return "border-l-4 border-l-yellow-500";
    return "";
  };

  if (blocks.length === 0 && !useSampleDataWhenEmpty) {
    return (
      <Card className="rounded-xl shadow-sm border border-gray-100">
        <CardHeader>
          <div className="flex flex-col gap-0.5">
            <CardTitle className="text-base font-semibold">농장별 작업 상태</CardTitle>
            <p className="text-xs text-gray-500">
              이랑마다 작업이 많으면 색이 진해져요. 농장 이름을 누르면 이랑이 펼쳐져요.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 text-center py-8 rounded-lg border border-gray-100 bg-gray-50/50 px-3 leading-relaxed">
            표시할 이랑·작업이 없어요. 농장을 등록하고 캘린더에 작업을 추가하면 상태가 표시돼요.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl shadow-sm border border-gray-100">
      <CardHeader>
        <div className="flex flex-col gap-0.5">
          <CardTitle className="text-base font-semibold">농장별 작업 상태</CardTitle>
          <p className="text-xs text-gray-500">
            이랑마다 작업이 많으면 색이 진해져요. 농장 이름을 누르면 이랑이 펼쳐져요.
          </p>
          <span className="text-xs text-gray-600">
            이랑 사용 {formatUsage(overallUsagePct, usedBlocks, totalBlocks)}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {useDemo && (
          <p className="text-[clamp(9px,2.2vw,12px)] text-gray-600 mb-3 rounded-lg border border-dashed border-gray-200 bg-gray-50/80 px-3 py-2 leading-tight whitespace-nowrap">
            아래 이랑 칸은 예시예요. 작업이 쌓이면 실제 상태가 표시돼요.
          </p>
        )}
        <div
          className={`space-y-6 mb-4 ${useDemo ? "rounded-lg border border-dashed border-gray-200 bg-white p-3" : ""}`}
        >
          {Object.entries(blocksByFarm).map(([farmName, farmBlocks]) => {
            const isExpanded = expandedFarms[farmName] ?? true;
            const farmUsage = getFarmUsage(farmBlocks);

            return (
              <div key={farmName} className="space-y-3">
                {/* 농장 제목 + 토글 */}
                <button
                  type="button"
                  onClick={() =>
                    setExpandedFarms((prev) => ({
                      ...prev,
                      [farmName]: !isExpanded,
                    }))
                  }
                  className={cn(
                    "w-full flex items-center justify-between border-b border-gray-200 pb-2 text-left rounded-t px-2 -mx-2",
                    farmHeaderBorderClass(farmBlocks)
                  )}
                >
                  <h3 className="text-base font-normal text-gray-900">
                    {farmName}
                  </h3>
                  <span className="text-xs text-gray-600 shrink-0">
                    {formatUsage(farmUsage.pct, farmUsage.used, farmUsage.total)}
                  </span>
                </button>

                {/* 해당 농장의 이랑들 - 토글 열었을 때만 표시 */}
                {isExpanded && (
                  <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3">
                    {farmBlocks.map((block) => (
                      <button
                        key={block.blockId}
                        type="button"
                        onClick={() => handleBlockClick(block.farmId)}
                        disabled={block.status === "empty"}
                        className={cn(
                          "rounded-lg border-2 p-3 text-center transition-colors",
                          block.status === "empty"
                            ? "cursor-not-allowed opacity-75"
                            : block.farmId === PLACEHOLDER_FARM_ID
                              ? "cursor-default"
                              : "cursor-pointer",
                          statusColors[block.status]
                        )}
                      >
                        <p
                          className={cn(
                            "text-sm font-semibold mb-1",
                            statusTextColors[block.status]
                          )}
                        >
                          이랑{block.rowNumber}
                        </p>
                        <p
                          className={cn(
                            "text-xs",
                            statusTextColors[block.status]
                          )}
                        >
                          {block.pendingTasks}개
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 text-xs">
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
