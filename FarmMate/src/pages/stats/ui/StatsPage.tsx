import { useState, useMemo } from "react";
import { useTasks } from "@/features/task-management";
import { useFarms } from "@/features/farm-management/model/farm.hooks";
import { useCrops } from "@/features/crop-management";
import { useAuth } from "@/contexts/AuthContext";
import { KPICard } from "./components/KPICard";
import { TrendChart } from "./components/TrendChart";
import { CropMixChart } from "./components/CropMixChart";
import { BlockHealthGrid } from "./components/BlockHealthGrid";
import { filterTasksByCurrentWeek, filterTasksByDateRange, filterTasksByLast8Weeks, filterTasksByCurrentYear, filterTasksByLast5Years } from "@/shared/utils/task-filter";
import type { Task } from "@shared/schema";

type PeriodType = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";

interface RevenueData {
  period: string;
  value: number;
  change?: number;
}

// 가데이터 생성 함수 (매출액 트렌드 차트용)
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
    case "monthly": {
      // 가장 최신 달(현재 달) 기준으로 이전 12개월
      const now = new Date();
      const currentMonth = now.getMonth(); // 0~11
      const currentYear = now.getFullYear();
      const monthLabels = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];

      // 오래된 달 → 최신 달 순으로 12개월 생성
      return Array.from({ length: 12 }, (_, i) => {
        const date = new Date(currentYear, currentMonth - (11 - i), 1);
        const monthIndex = date.getMonth(); // 보정된 월 인덱스

        return {
          period: monthLabels[monthIndex],
          value: baseValue + Math.random() * 2000000 - 1000000,
          change: Math.random() * 20 - 10,
        };
      });
    }
    case "quarterly":
      return Array.from({ length: 4 }, (_, i) => ({
        period: `Q${i + 1}`,
        value: baseValue + Math.random() * 2000000 - 1000000,
        change: Math.random() * 20 - 10,
      }));
    case "yearly": {
      // 현재 연도를 기준으로 최근 5년 표시 (가장 최근 연도가 현재 연도)
      const currentYear = new Date().getFullYear();
      return Array.from({ length: 5 }, (_, i) => ({
        period: `${currentYear - 4 + i}년`,
        value: baseValue + Math.random() * 2000000 - 1000000,
        change: Math.random() * 20 - 10,
      }));
    }
  }
};

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function StatsPage() {
  const [periodType, setPeriodType] = useState<PeriodType>("daily");
  const today = new Date();
  const oneYearAgo = new Date(today);
  oneYearAgo.setFullYear(today.getFullYear() - 1);

  const [startDate, setStartDate] = useState<string>(formatDate(oneYearAgo));
  const [endDate, setEndDate] = useState<string>(formatDate(today));
  
  // 현재 사용자 정보 가져오기
  const { user } = useAuth();
  
  // 실제 데이터 가져오기
  const { data: allTasks = [], isLoading: tasksLoading } = useTasks();
  const { data: farms = [] } = useFarms();
  const { data: crops = [] } = useCrops();

  // 최상단 날짜 범위에 따른 작업 필터링
  const tasks = useMemo(() => {
    // 최상단 날짜 필터가 설정되지 않은 경우 전체 작업 사용
    if (!startDate || !endDate) {
      return allTasks;
    }

    // YYYY-MM-DD 형식 문자열 비교로 범위 정규화
    const normalizedStart = startDate <= endDate ? startDate : endDate;
    const normalizedEnd = endDate >= startDate ? endDate : startDate;

    return filterTasksByDateRange(allTasks, normalizedStart, normalizedEnd);
  }, [allTasks, startDate, endDate]);

  // 매출액 트렌드 차트 데이터 (가데이터)
  const revenueData = useMemo(() => generateRevenueData(periodType), [periodType]);
  
  // 매출액 KPI 계산 (가데이터 기반)
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

  // 작업 완료율 계산
  // - 일간: 이번 주 월~일 기준 (To-do 총 개수 중 내가 완료한 작업 수)
  // - 그 외: 현재 날짜 필터 범위 내에서 내가 완료한 작업 비율
  const completionRate = useMemo(() => {
    // user가 로드되지 않았으면 0 반환
    if (!user?.id) {
      console.log("작업 완료율: 사용자 정보가 없음");
      return 0;
    }
    
    // 일간 탭인 경우, 이번 주 월~일 범위로 한 번 더 필터링
    const baseTasks =
      periodType === "daily"
        ? filterTasksByCurrentWeek(tasks)
        : tasks;

    console.log("작업 완료율 계산 시작:", {
      totalTasks: baseTasks.length,
      userId: user.id,
      userIdType: typeof user.id,
      sampleTask: baseTasks[0] ? {
        id: baseTasks[0].id,
        userId: baseTasks[0].userId,
        userIdType: typeof baseTasks[0].userId,
        completed: baseTasks[0].completed
      } : null,
    });
    
    // 내가 생성한 작업만 필터링 (타입 변환을 명시적으로 처리)
    const currentUserId = String(user.id);
    const myTasks = baseTasks.filter((task) => {
      const taskUserId = String(task.userId || "");
      const isMatch = taskUserId === currentUserId;
      
      // 첫 번째 불일치만 로그 출력 (너무 많은 로그 방지)
      if (!isMatch && baseTasks.indexOf(task) === 0) {
        console.log("작업 필터링 불일치 예시:", {
          taskId: task.id,
          taskUserId: taskUserId,
          currentUserId: currentUserId,
          match: isMatch,
        });
      }
      return isMatch;
    });
    
    console.log("내 작업 필터링 결과:", {
      myTasksCount: myTasks.length,
      totalTasksCount: baseTasks.length,
      allMyTasks: myTasks.map(t => ({ 
        id: t.id, 
        title: t.title,
        completed: t.completed,
        completedType: typeof t.completed,
        scheduledDate: t.scheduledDate
      })),
    });
    
    if (myTasks.length === 0) {
      console.log("내 작업이 없어서 0% 반환");
      return 0;
    }
    
    // completed 값 확인 (0 또는 1)
    const completedTasks = myTasks.filter((task) => {
      const isCompleted = task.completed === 1 || task.completed === true;
      console.log(`작업 ${task.id} (${task.title}): completed=${task.completed}, 타입=${typeof task.completed}, 완료여부=${isCompleted}`);
      return isCompleted;
    });
    
    const rate = (completedTasks.length / myTasks.length) * 100;
    
    console.log("작업 완료율 계산 결과:", {
      totalMyTasks: myTasks.length,
      completedTasks: completedTasks.length,
      completedTaskIds: completedTasks.map(t => t.id),
      rate: rate.toFixed(1) + "%",
      formula: `(${completedTasks.length} / ${myTasks.length}) × 100 = ${rate.toFixed(1)}%`
    });
    
    return rate;
  }, [tasks, user?.id, periodType]);

  // 작물 구성 계산 (실제 데이터 기반)
  const cropMixData = useMemo(() => {
    // 각 작물별 고유 이랑 수 계산 (cropId + farmId + rowNumber 조합으로 고유성 보장)
    const cropRowMap = new Map<string, Set<string>>();
    
    tasks.forEach((task) => {
      // farmId와 rowNumber가 있어야 작물 구성에 포함
      if (!task.farmId || !task.rowNumber) {
        return;
      }
      
      // 작물 ID 결정: cropId가 있으면 사용, 없으면 title에서 추출
      let cropId = task.cropId;
      let cropName = "";
      
      if (cropId) {
        // cropId가 있으면 crops에서 찾기
        const crop = crops.find((c) => c.id === cropId);
        cropName = crop?.name || "";
      } else if (task.title) {
        // cropId가 없으면 title에서 작물명 추출
        // 형식: "작물명_작업타입" 또는 "작물명(품종)_작업타입"
        const titleParts = task.title.split('_');
        if (titleParts.length > 0) {
          let extractedName = titleParts[0];
          
          // 괄호가 있으면 괄호 앞부분만 사용 (예: "양파(황양파)" -> "양파")
          if (extractedName.includes('(')) {
            extractedName = extractedName.split('(')[0];
          }
          
          cropName = extractedName.trim();
          
          // 작물명을 키로 사용 (같은 이름의 작물은 같은 그룹으로)
          cropId = `custom_${cropName}`;
        }
      }
      
      if (cropId && cropName) {
        const rowKey = `${task.farmId}-${task.rowNumber}`;
        if (!cropRowMap.has(cropId)) {
          cropRowMap.set(cropId, new Set());
        }
        cropRowMap.get(cropId)!.add(rowKey);
      }
    });

    // 작물별 사용 중인 이랑 수 계산
    const cropData = Array.from(cropRowMap.entries()).map(([cropId, rowSet]) => {
      let cropName = "";
      
      if (cropId.startsWith('custom_')) {
        // 커스텀 작물 (title에서 추출한 경우)
        cropName = cropId.replace('custom_', '');
      } else {
        // crops 테이블에서 찾기
        const crop = crops.find((c) => c.id === cropId);
        cropName = crop?.name || "알 수 없음";
      }
      
      const usedRowCount = rowSet.size;
      return {
        cropId,
        cropName,
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
    const sortedData = cropData
      .map((item) => ({
        name: item.cropName,
        value: item.usedRowCount,
        percentage: totalUsedRows > 0 ? (item.usedRowCount / totalUsedRows) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);
    
    // 상위 5개와 나머지 분리
    const top5 = sortedData.slice(0, 5);
    const others = sortedData.slice(5);
    
    // 나머지가 있으면 "기타"로 합치기
    if (others.length > 0) {
      const othersTotal = others.reduce((sum, item) => sum + item.value, 0);
      const othersPercentage = totalUsedRows > 0 ? (othersTotal / totalUsedRows) * 100 : 0;
      const othersNames = others.map(item => item.name);
      
      return [
        ...top5,
        {
          name: "기타",
          value: othersTotal,
          percentage: othersPercentage,
          others: othersNames,
        }
      ];
    }
    
    return top5;
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
      isOwnFarm: boolean; // 내 농장인지 여부
    }> = [];

    // 내 농장과 친구 농장 구분
    const ownFarms = farms.filter(farm => farm.userId === user?.id);
    const friendFarms = farms.filter(farm => farm.userId !== user?.id);
    
    // 내 농장을 먼저 처리, 그 다음 친구 농장 처리
    const sortedFarms = [...ownFarms, ...friendFarms];

    sortedFarms.forEach((farm) => {
      const isOwnFarm = farm.userId === user?.id;
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
            isOwnFarm,
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
          isOwnFarm,
        });
      }
    });

    // 내 농장을 먼저, 친구 농장을 나중에 정렬
    return blocks.sort((a, b) => {
      // 내 농장이 먼저 오도록 정렬
      if (a.isOwnFarm && !b.isOwnFarm) return -1;
      if (!a.isOwnFarm && b.isOwnFarm) return 1;
      
      // 같은 타입 내에서는 농장 이름으로 정렬
      if (a.farmName !== b.farmName) {
        return a.farmName.localeCompare(b.farmName);
      }
      
      // 같은 농장 내에서는 이랑 번호로 정렬
      return a.rowNumber - b.rowNumber;
    });
  }, [farms, tasks, user?.id]);

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

      {/* 날짜 범위 필터 - 소제목 아래 */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-gray-500">날짜 범위</span>
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 bg-white"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <span className="text-gray-400 text-sm">~</span>
          <input
            type="date"
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 bg-white"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>
      
      {/* 기간 필터 - 좌측 정렬 */}
      <div className="flex gap-2">
        {(["daily", "weekly", "monthly", "quarterly", "yearly"] as PeriodType[]).map((period) => (
          <button
            key={period}
            onClick={() => setPeriodType(period)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              periodType === period
                ? "bg-primary text-primary-foreground"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {period === "daily"
              ? "일간"
              : period === "weekly"
              ? "주간"
              : period === "monthly"
              ? "월간"
              : period === "quarterly"
              ? "분기간"
              : "연간"}
          </button>
        ))}
      </div>

      {/* KPI 카드들 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <KPICard
          title="평균 매출액"
          value={`₩${Math.round(averageRevenue).toLocaleString()}`}
          change={revenueChange}
          formula="현재 기간 평균값"
        />
        <KPICard
          title="작업 완료율"
          value={`${completionRate.toFixed(1)}%`}
          formula="(내가 완료한 작업 수 / 내가 적은 전체 작업 수) × 100"
        />
      </div>

      {/* 매출액 추이 차트 */}
      <TrendChart data={revenueData} periodType={periodType} />

      {/* 작물 구성 차트 - 항상 표시 */}
      <CropMixChart 
        data={cropMixData.length > 0 ? cropMixData : []} 
        totalRows={totalRows}
        usedRows={totalUsedRows}
      />

      {/* 이랑별 작업 상태 */}
      {blockStatuses.length > 0 && (
        <BlockHealthGrid blocks={blockStatuses} />
      )}
    </div>
  );
}
