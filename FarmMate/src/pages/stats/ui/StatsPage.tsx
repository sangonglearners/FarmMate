import { useState, useMemo } from "react";
import { useTasks } from "@/features/task-management";
import { useFarms } from "@/features/farm-management/model/farm.hooks";
import { useCrops } from "@/features/crop-management";
import { KPICard } from "./components/KPICard";
import { TrendChart } from "./components/TrendChart";
import { CropMixChart } from "./components/CropMixChart";
import { BlockHealthGrid } from "./components/BlockHealthGrid";
import type { Task } from "@shared/schema";

type PeriodType = "daily" | "weekly" | "monthly" | "yearly";

interface RevenueData {
  period: string;
  value: number;
  change?: number;
}

// 가데이터 생성 함수 (수출액 트렌드 차트용)
const generateRevenueData = (periodType: PeriodType): RevenueData[] => {
  const baseValue = 8000000; // 기본값 800만원
  
  switch (periodType) {
    case "daily":
      return Array.from({ length: 7 }, (_, i) => ({
        period: ["월", "화", "수", "목", "금", "토", "일"][i],
        value: baseValue + Math.random() * 2000000 - 1000000,
        change: Math.random() * 20 - 10, // -10% ~ +10%
      }));
    case "weekly":
      return Array.from({ length: 8 }, (_, i) => ({
        period: `W${i + 1}`,
        value: baseValue + Math.random() * 2000000 - 1000000,
        change: Math.random() * 20 - 10,
      }));
    case "monthly":
      return Array.from({ length: 12 }, (_, i) => ({
        period: ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"][i],
        value: baseValue + Math.random() * 2000000 - 1000000,
        change: Math.random() * 20 - 10,
      }));
    case "yearly":
      return Array.from({ length: 5 }, (_, i) => ({
        period: `${2020 + i}년`,
        value: baseValue + Math.random() * 2000000 - 1000000,
        change: Math.random() * 20 - 10,
      }));
  }
};

export default function StatsPage() {
  const [periodType, setPeriodType] = useState<PeriodType>("monthly");
  
  // 실제 데이터 가져오기
  const { data: tasks = [], isLoading: tasksLoading } = useTasks();
  const { data: farms = [] } = useFarms();
  const { data: crops = [] } = useCrops();

  // 수출액 트렌드 차트 데이터 (가데이터)
  const revenueData = useMemo(() => generateRevenueData(periodType), [periodType]);
  
  // 수출액 KPI 계산 (가데이터 기반)
  const averageRevenue = useMemo(() => {
    if (revenueData.length === 0) return 0;
    return revenueData.reduce((sum, item) => sum + item.value, 0) / revenueData.length;
  }, [revenueData]);

  const previousPeriodAverage = useMemo(() => {
    if (revenueData.length === 0) return 0;
    const halfLength = Math.floor(revenueData.length / 2);
    const firstHalf = revenueData.slice(0, halfLength);
    return firstHalf.reduce((sum, item) => sum + item.value, 0) / firstHalf.length;
  }, [revenueData]);

  const revenueChange = useMemo(() => {
    if (previousPeriodAverage === 0) return 0;
    return ((averageRevenue - previousPeriodAverage) / previousPeriodAverage) * 100;
  }, [averageRevenue, previousPeriodAverage]);

  // 작업 완료율 계산 (실제 데이터 기반)
  const completionRate = useMemo(() => {
    const essentialTaskTypes = ["파종", "수확", "육묘"];
    const essentialTasks = tasks.filter((task) => 
      essentialTaskTypes.includes(task.taskType || "")
    );
    
    if (essentialTasks.length === 0) return 0;
    
    const completedTasks = essentialTasks.filter((task) => task.completed === 1);
    return (completedTasks.length / essentialTasks.length) * 100;
  }, [tasks]);

  // 작물 구성 계산 (실제 데이터 기반)
  const cropMixData = useMemo(() => {
    // 각 작물별 고유 이랑 수 계산 (cropId + farmId + rowNumber 조합으로 고유성 보장)
    const cropRowMap = new Map<string, Set<string>>();
    
    tasks.forEach((task) => {
      if (task.cropId && task.farmId && task.rowNumber) {
        const key = `${task.cropId}`;
        const rowKey = `${task.farmId}-${task.rowNumber}`;
        if (!cropRowMap.has(key)) {
          cropRowMap.set(key, new Set());
        }
        cropRowMap.get(key)!.add(rowKey);
      }
    });

    // 작물별 사용 중인 이랑 수 계산
    const cropData = Array.from(cropRowMap.entries()).map(([cropId, rowSet]) => {
      const crop = crops.find((c) => c.id === cropId);
      const usedRowCount = rowSet.size;
      return {
        cropId,
        cropName: crop?.name || "알 수 없음",
        usedRowCount,
      };
    });

    // 사용 중인 전체 이랑 수 계산
    const totalUsedRows = Array.from(cropRowMap.values()).reduce((sum, rowSet) => {
      return sum + rowSet.size;
    }, 0);

    // 전체 이랑 수 계산
    const totalRows = farms.reduce((sum, farm) => sum + (farm.rowCount || 0), 0);

    // 비율 계산 (사용 중인 이랑 기준) 및 정렬
    return cropData
      .map((item) => ({
        name: item.cropName,
        value: item.usedRowCount,
        percentage: totalUsedRows > 0 ? (item.usedRowCount / totalUsedRows) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // 상위 10개만 표시
  }, [tasks, crops, farms]);

  // 전체 이랑 수 (텍스트 표시용)
  const totalRows = useMemo(() => {
    return farms.reduce((sum, farm) => sum + (farm.rowCount || 0), 0);
  }, [farms]);

  // 사용 중인 이랑 수 (텍스트 표시용)
  const totalUsedRows = useMemo(() => {
    const usedRowSet = new Set<string>();
    tasks.forEach((task) => {
      if (task.farmId && task.rowNumber) {
        usedRowSet.add(`${task.farmId}-${task.rowNumber}`);
      }
    });
    return usedRowSet.size;
  }, [tasks]);

  // 이랑별 작업 상태 계산 (실제 데이터 기반 - 작업 개수 기준)
  const blockStatuses = useMemo(() => {
    const blocks: Array<{
      blockId: string;
      farmName: string;
      farmId: string;
      rowNumber: number;
      status: "good" | "watch" | "danger" | "empty";
      pendingTasks?: number;
    }> = [];

    farms.forEach((farm) => {
      const farmTasks = tasks.filter((task) => task.farmId === farm.id);
      
      for (let rowNum = 1; rowNum <= (farm.rowCount || 0); rowNum++) {
        const rowTasks = farmTasks.filter((task) => task.rowNumber === rowNum);
        
        if (rowTasks.length === 0) {
          blocks.push({
            blockId: `${farm.id}-${rowNum}`,
            farmName: farm.name,
            farmId: farm.id,
            rowNumber: rowNum,
            status: "empty",
            pendingTasks: 0,
          });
          continue;
        }

        // 작업 개수 기준으로 상태 결정
        const taskCount = rowTasks.length;
        let status: "good" | "watch" | "danger";
        
        if (taskCount > 5) {
          status = "danger"; // 5개 초과 빨간색
        } else if (taskCount >= 3 && taskCount <= 5) {
          status = "watch"; // 3개 이상 5개 이하 노란색
        } else {
          status = "good"; // 2개 이하 초록
        }

        blocks.push({
          blockId: `${farm.id}-${rowNum}`,
          farmName: farm.name,
          farmId: farm.id,
          rowNumber: rowNum,
          status,
          pendingTasks: taskCount,
        });
      }
    });

    return blocks;
  }, [farms, tasks]);

  if (tasksLoading) {
    return (
      <div className="p-4 space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-2">통계</h1>
        <p className="text-gray-600 text-sm mb-4">농작업 통계를 확인해 보세요</p>
      </div>
      
      {/* 기간 필터 - 좌측 정렬 */}
      <div className="flex gap-2">
        {(["daily", "weekly", "monthly", "yearly"] as PeriodType[]).map((period) => (
          <button
            key={period}
            onClick={() => setPeriodType(period)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              periodType === period
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {period === "daily" ? "일간" : period === "weekly" ? "주간" : period === "monthly" ? "월간" : "연간"}
          </button>
        ))}
      </div>

      {/* KPI 카드들 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <KPICard
          title="평균 수출액"
          value={`₩${Math.round(averageRevenue).toLocaleString()}`}
          change={revenueChange}
          formula="현재 기간 평균값"
        />
        <KPICard
          title="작업 완료율"
          value={`${completionRate.toFixed(1)}%`}
          formula="(완료된 필수 작업 수 / 계획된 필수 작업 수) × 100"
        />
      </div>

      {/* 수출액 추이 차트 */}
      <TrendChart data={revenueData} periodType={periodType} />

      {/* 작물 구성 차트 */}
      {cropMixData.length > 0 && (
        <CropMixChart 
          data={cropMixData} 
          totalRows={totalRows}
          usedRows={totalUsedRows}
        />
      )}

      {/* 이랑별 작업 상태 */}
      {blockStatuses.length > 0 && (
        <BlockHealthGrid blocks={blockStatuses} />
      )}
    </div>
  );
}
