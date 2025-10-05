import { useState, useEffect, useRef, useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@shared/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/ui/select";
import AddTaskDialog from "@/components/add-task-dialog-improved";
import type { Task, Crop } from "@shared/types/schema";
import { useFarms } from "@/features/farm-management/model/farm.hooks";
import type { FarmEntity } from "@shared/api/farm.repository";

interface FarmCalendarGridProps {
  tasks: Task[];
  crops: Crop[];
  onDateClick: (date: string) => void;
}

type ViewMode = "monthly" | "yearly";

export default function FarmCalendarGrid({ tasks, crops, onDateClick }: FarmCalendarGridProps) {
  // tasks가 변경될 때마다 컴포넌트가 리렌더링되도록 의존성 추가
  const memoizedTasks = useMemo(() => tasks, [tasks]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("monthly");
  const [selectedFarm, setSelectedFarm] = useState<FarmEntity | null>(null);
  
  
  // 농장 데이터 가져오기
  const { data: farms = [], isLoading: farmsLoading } = useFarms();
  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false);
  const [selectedDateForTask, setSelectedDateForTask] = useState<string>("");
  const [selectedCellDate, setSelectedCellDate] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // 월간과 연간 뷰의 날짜 상태를 분리
  const today = new Date();
  const [monthlyDate, setMonthlyDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [yearlyDate, setYearlyDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [monthlyOffset, setMonthlyOffset] = useState(() => {
    // 오늘이 포함된 10일 구간으로 초기화
    const todayDate = today.getDate();
    return Math.floor((todayDate - 1) / 5);
  });

  // 현재 뷰 모드에 따른 날짜
  const currentDate = viewMode === "monthly" ? monthlyDate : yearlyDate;

  // 첫 번째 농장을 기본값으로 설정
  useEffect(() => {
    if (farms.length > 0 && !selectedFarm) {
      setSelectedFarm(farms[0]);
    }
  }, [farms, selectedFarm]);

  // 연간 뷰에서 현재 월로 스크롤하는 함수
  const scrollToCurrentMonth = () => {
    if (viewMode === "yearly" && scrollContainerRef.current) {
      const currentMonth = today.getMonth() + 1; // 1-12 (9월 = 9)
      const cellWidth = 120; // w-[120px]
      
      // 현재 월(9월)이 딱 왼쪽에 붙도록 계산
      // 9월이 첫 번째로 보이도록 8개월만큼 스크롤 (1월~8월까지 스크롤)
      const scrollPosition = Math.max(0, (currentMonth - 1) * cellWidth);
      
      scrollContainerRef.current.scrollTo({
        left: scrollPosition,
        behavior: 'auto' // smooth 대신 auto로 즉시 이동
      });
    }
  };

  // 연간 뷰로 전환되거나 컴포넌트가 마운트될 때 현재 월로 스크롤
  useEffect(() => {
    if (viewMode === "yearly") {
      // 약간의 지연을 주어 DOM이 완전히 렌더링된 후 스크롤
      setTimeout(scrollToCurrentMonth, 100);
    }
  }, [viewMode]);

  // 선택된 농장의 이랑 수에 따른 이랑 번호 생성
  const rowNumbers = selectedFarm 
    ? Array.from({ length: selectedFarm.rowCount }, (_, i) => i + 1)
    : Array.from({ length: 15 }, (_, i) => i + 1); // 기본값 15개

  // 월간 뷰: 현재 표시할 10일 계산 (다음 달 날짜 포함)
  const getMonthlyDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const startDay = 1 + monthlyOffset * 5;
    const days = [];
    
    // 10일을 채우기 위해 현재 달과 다음 달 날짜를 조합
    for (let i = 0; i < 10; i++) {
      const currentDay = startDay + i;
      if (currentDay <= daysInMonth) {
        // 현재 달 날짜
        days.push({
          day: currentDay,
          month: month,
          year: year,
          isCurrentMonth: true
        });
      } else {
        // 다음 달 날짜
        const nextMonthDay = currentDay - daysInMonth;
        const nextMonth = month === 11 ? 0 : month + 1;
        const nextYear = month === 11 ? year + 1 : year;
        days.push({
          day: nextMonthDay,
          month: nextMonth,
          year: nextYear,
          isCurrentMonth: false
        });
      }
    }
    
    return days;
  };

  // 연간 뷰: 1-12월 전체 표시
  const getYearlyMonths = () => {
    return Array.from({ length: 12 }, (_, i) => i + 1); // 1-12월
  };

  // 특정 날짜/월의 작업 가져오기
  const getTasksForPeriod = (rowNumber: number, dayInfo: any) => {
    if (viewMode === "monthly") {
      const dateStr = `${dayInfo.year}-${String(dayInfo.month + 1).padStart(2, '0')}-${String(dayInfo.day).padStart(2, '0')}`;
      
      
      const filteredTasks = memoizedTasks.filter(task => {
        // 날짜 매칭 로직: 정확한 날짜 매칭 또는 날짜 범위 내 포함
        let isDateMatch = false;
        
        if (task.scheduledDate === dateStr) {
          // 정확한 날짜 매칭
          isDateMatch = true;
        } else if ((task as any).endDate) {
          // 날짜 범위가 있는 작업의 경우 범위 내 포함 여부 확인
          const taskStartDate = new Date(task.scheduledDate);
          const taskEndDate = new Date((task as any).endDate);
          const currentDate = new Date(dateStr);
          
          isDateMatch = currentDate >= taskStartDate && currentDate <= taskEndDate;
          
        }
        
        if (!isDateMatch) return false;
        if (task.farmId !== selectedFarm?.id) return false; // 선택된 농장의 작업만 표시
        
        // 이랑 번호 매칭 로직 개선
        if (task.rowNumber) {
          // rowNumber가 있으면 정확히 매칭
          return task.rowNumber === rowNumber;
        } else {
          // rowNumber가 없으면 description에서 파싱하여 매칭
          if (task.description && task.description.includes("이랑:")) {
            const match = task.description.match(/이랑:\s*(\d+)번/);
            if (match) {
              return parseInt(match[1]) === rowNumber;
            }
          }
          // 둘 다 없으면 첫 번째 이랑(rowNumber === 1)에 표시
          return rowNumber === 1;
        }
      });
      
      return filteredTasks;
    } else {
      // 연간 뷰: 해당 월의 모든 작업 (날짜 범위 고려)
      const year = currentDate.getFullYear();
      return memoizedTasks.filter(task => {
        if (!task.scheduledDate) return false;
        if (task.farmId !== selectedFarm?.id) return false; // 선택된 농장의 작업만 표시
        
        // 이랑 번호 매칭 로직 개선
        let taskRowNumber = task.rowNumber;
        if (!taskRowNumber && task.description && task.description.includes("이랑:")) {
          const match = task.description.match(/이랑:\s*(\d+)번/);
          if (match) {
            taskRowNumber = parseInt(match[1]);
          }
        }
        
        // 월 매칭 로직: 시작일 또는 종료일이 해당 월에 포함되는지 확인
        const taskStartDate = new Date(task.scheduledDate);
        const isStartMonthMatch = taskStartDate.getFullYear() === year && 
                                 taskStartDate.getMonth() + 1 === dayInfo.month;
        
        let isEndMonthMatch = false;
        if ((task as any).endDate) {
          const taskEndDate = new Date((task as any).endDate);
          isEndMonthMatch = taskEndDate.getFullYear() === year && 
                           taskEndDate.getMonth() + 1 === dayInfo.month;
        }
        
        // 시작일 또는 종료일이 해당 월에 포함되면 표시
        let isMonthMatch = isStartMonthMatch || isEndMonthMatch;
        
        // 같은 월 내에서 날짜 범위가 있는 경우, 해당 월의 모든 날짜에 표시
        if (isStartMonthMatch && (task as any).endDate) {
          const taskEndDate = new Date((task as any).endDate);
          const isEndInSameMonth = taskEndDate.getFullYear() === year && 
                                 taskEndDate.getMonth() + 1 === dayInfo.month;
          if (isEndInSameMonth) {
            // 같은 월 내에서 시작일과 종료일이 모두 있는 경우, 해당 월의 모든 날짜에 표시
            isMonthMatch = true;
          }
        }
        
        return isMonthMatch && 
               (taskRowNumber === rowNumber || (!taskRowNumber && rowNumber === 1));
      });
    }
  };

  // 작물 이름 가져오기
  const getCropName = (cropId: string | null | undefined) => {
    if (!cropId) return "";
    const crop = crops.find(c => c.id === cropId);
    return crop ? crop.name : "";
  };



  // 작업 타입에 따른 색상
  const getTaskColor = (task: Task) => {
    // 제목에서 작업타입 추출 (작물명_작업타입 형태)
    let taskType = task.taskType;
    if (task.title && task.title.includes('_')) {
      const parts = task.title.split('_');
      if (parts.length >= 2) {
        taskType = parts[parts.length - 1]; // 마지막 부분을 작업타입으로 사용
      }
    }
    
    switch (taskType) {
      case "파종": return "bg-blue-100 text-blue-800 border-blue-200";
      case "육묘": return "bg-green-100 text-green-800 border-green-200";
      case "수확-선별": return "bg-orange-100 text-orange-800 border-orange-200";
      case "저장-포장": return "bg-purple-100 text-purple-800 border-purple-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // 월간 뷰 네비게이션
  const handleMonthlyPrevious = () => {
    if (monthlyOffset > 0) {
      setMonthlyOffset(monthlyOffset - 1);
    } else {
      // 이전 달로 이동
      const newDate = new Date(monthlyDate.getFullYear(), monthlyDate.getMonth() - 1, 1);
      setMonthlyDate(newDate);
      const daysInPrevMonth = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0).getDate();
      setMonthlyOffset(Math.floor((daysInPrevMonth - 1) / 5));
    }
  };

  const handleMonthlyNext = () => {
    // 현재 표시되는 10일 구간에서 마지막 날짜 확인
    const currentPeriods = getMonthlyDays();
    const lastDay = currentPeriods[currentPeriods.length - 1];
    
    // 마지막 날이 다음 달로 넘어간 경우, 다음 달로 이동
    if (!lastDay.isCurrentMonth) {
      const newDate = new Date(lastDay.year, lastDay.month, 1);
      setMonthlyDate(newDate);
      setMonthlyOffset(0);
    } else {
      // 현재 달 내에서 5일씩 이동
      const daysInMonth = new Date(monthlyDate.getFullYear(), monthlyDate.getMonth() + 1, 0).getDate();
      const nextStartDay = 1 + (monthlyOffset + 1) * 5;
      
      // 다음 구간이 현재 달을 넘어가는 경우 다음 달로 이동
      if (nextStartDay > daysInMonth) {
        const newDate = new Date(monthlyDate.getFullYear(), monthlyDate.getMonth() + 1, 1);
        setMonthlyDate(newDate);
        setMonthlyOffset(0);
      } else {
        setMonthlyOffset(monthlyOffset + 1);
      }
    }
  };

  // 연간 뷰 네비게이션
  const handleYearlyPrevious = () => {
    // 이전 년도로 이동
    setYearlyDate(new Date(yearlyDate.getFullYear() - 1, 0, 1));
  };

  const handleYearlyNext = () => {
    // 다음 년도로 이동
    setYearlyDate(new Date(yearlyDate.getFullYear() + 1, 0, 1));
  };

  const currentPeriods = viewMode === "monthly" ? getMonthlyDays() : getYearlyMonths().map(month => ({ month }));
  const headerLabel = viewMode === "monthly" ? "이랑\\일" : "이랑\\월";
  
  // 오늘 날짜인지 확인하는 함수
  const isToday = (dayInfo: any) => {
    if (viewMode === "monthly") {
      return (
        today.getFullYear() === dayInfo.year &&
        today.getMonth() === dayInfo.month &&
        today.getDate() === dayInfo.day
      );
    } else {
      return (
        today.getFullYear() === currentDate.getFullYear() &&
        today.getMonth() + 1 === dayInfo.month
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-2">나의 영농일지</h1>
        <p className="text-gray-600 text-sm">오늘의 업무와 월간 영농 일정을 확인할 수 있습니다.</p>
      </div>

      {/* 컨트롤 */}
      <div className="flex items-center justify-between">
        {/* 농장 선택 */}
        {farmsLoading ? (
          <div className="w-32 h-10 bg-gray-200 rounded animate-pulse"></div>
        ) : farms.length > 0 ? (
          <Select 
            value={selectedFarm?.id || "no-farm"} 
            onValueChange={(value) => {
              if (value !== "no-farm") {
                const farm = farms.find(f => f.id === value);
                if (farm) setSelectedFarm(farm);
              }
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="농장 선택" />
            </SelectTrigger>
            <SelectContent>
              {farms.map((farm) => (
                <SelectItem key={farm.id} value={farm.id}>
                  {farm.name} ({farm.environment})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="text-sm text-gray-500">
            등록된 농장이 없습니다
          </div>
        )}

        {/* 뷰 모드 선택 */}
        <div className="flex space-x-2">
          <Button
            variant={viewMode === "monthly" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setViewMode("monthly");
              // 월간 뷰로 전환 시 오늘 날짜로 리셋
              const newMonthlyDate = new Date(today.getFullYear(), today.getMonth(), 1);
              setMonthlyDate(newMonthlyDate);
              setMonthlyOffset(Math.floor((today.getDate() - 1) / 5));
            }}
          >
            월간
          </Button>
          <Button
            variant={viewMode === "yearly" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setViewMode("yearly");
              // 연간 뷰로 전환 시 현재 년도로 리셋
              setYearlyDate(new Date(today.getFullYear(), 0, 1));
            }}
          >
            연간
          </Button>
        </div>
      </div>

      {/* 네비게이션 */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={viewMode === "monthly" ? handleMonthlyPrevious : handleYearlyPrevious}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <h2 className="text-lg font-semibold text-gray-900">
          {viewMode === "monthly" 
            ? (() => {
                const firstDay = currentPeriods[0] as any;
                const lastDay = currentPeriods[currentPeriods.length - 1] as any;
                
                // 첫 날과 마지막 날이 같은 월인 경우
                if (firstDay.month === lastDay.month) {
                  return `${firstDay.year}년 ${firstDay.month + 1}월 ${firstDay.day}일-${lastDay.day}일`;
                } else {
                  // 다른 월인 경우
                  return `${firstDay.year}년 ${firstDay.month + 1}월 ${firstDay.day}일 - ${lastDay.year}년 ${lastDay.month + 1}월 ${lastDay.day}일`;
                }
              })()
            : `${yearlyDate.getFullYear()}년`
          }
        </h2>

        <Button
          variant="outline"
          size="sm"
          onClick={viewMode === "monthly" ? handleMonthlyNext : handleYearlyNext}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* 캘린더 그리드 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div 
          ref={scrollContainerRef} 
          className="overflow-auto max-h-[700px]"
        >
          <div className={viewMode === "yearly" ? "min-w-[1500px]" : "min-w-[700px]"}>
            {/* 헤더 */}
            <div className="flex border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
              <div className="w-[60px] border-r border-gray-200 flex-shrink-0 relative">
                <div className="absolute inset-0 p-1">
                  {/* 대각선 */}
                  <svg className="absolute inset-0 w-full h-full">
                    <line x1="0" y1="0" x2="100%" y2="100%" stroke="#d1d5db" strokeWidth="1"/>
                  </svg>
                  {/* 이랑 텍스트 (왼쪽 하단) */}
                  <div className="absolute bottom-1 left-1 text-xs font-medium text-gray-600">
                    이랑
                  </div>
                  {/* 일/월 텍스트 (오른쪽 상단) */}
                  <div className="absolute top-1 right-1 text-xs font-medium text-gray-600">
                    {viewMode === "monthly" ? "일" : "월"}
                  </div>
                </div>
              </div>
              {currentPeriods.map((dayInfo, index) => (
                <div 
                  key={viewMode === "monthly" ? `${(dayInfo as any).year}-${(dayInfo as any).month}-${(dayInfo as any).day}` : (dayInfo as any).month}
                  className={`${viewMode === "yearly" ? "w-[120px] flex-shrink-0" : "flex-1"} p-3 text-center font-medium border-r border-gray-200 last:border-r-0 ${
                    isToday(dayInfo) 
                      ? "bg-green-100 text-green-800 font-bold" 
                      : "text-gray-600"
                  } ${viewMode === "monthly" && (dayInfo as any).isCurrentMonth === false ? "text-gray-400" : ""}`}
                >
                  {viewMode === "monthly" ? (
                    <div>
                      <div className="text-xs">{(dayInfo as any).day}</div>
                      {!(dayInfo as any).isCurrentMonth && (
                        <div className="text-xs text-gray-400">{(dayInfo as any).month + 1}월</div>
                      )}
                    </div>
                  ) : (
                    (dayInfo as any).month
                  )}
                </div>
              ))}
            </div>

            {/* 이랑별 데이터 */}
            <div>
              {rowNumbers.map((rowNumber) => (
                <div key={rowNumber} className="flex border-b border-gray-200 last:border-b-0">
                  {/* 이랑 번호 */}
                  <div className="w-[60px] p-3 text-center font-medium text-gray-900 border-r border-gray-200 bg-gray-50 flex-shrink-0">
                    {rowNumber}
                  </div>

                  {/* 각 날짜/월의 작업 */}
                  {currentPeriods.map((dayInfo, index) => {
                    const periodTasks = getTasksForPeriod(rowNumber, dayInfo);
                    const isTodayCell = isToday(dayInfo);
                    
                    return (
                      <div
                        key={viewMode === "monthly" ? `${rowNumber}-${(dayInfo as any).year}-${(dayInfo as any).month}-${(dayInfo as any).day}` : `${rowNumber}-${(dayInfo as any).month}`}
                        className={`${viewMode === "yearly" ? "w-[120px] flex-shrink-0" : "flex-1"} p-2 border-r border-gray-200 last:border-r-0 min-h-[100px] cursor-pointer hover:bg-gray-50 transition-colors ${
                          isTodayCell ? "bg-green-50 border-green-200" : ""
                        } ${viewMode === "monthly" && (dayInfo as any).isCurrentMonth === false ? "bg-gray-25" : ""} ${
                          viewMode === "monthly" && selectedCellDate === `${(dayInfo as any).year}-${String((dayInfo as any).month + 1).padStart(2, '0')}-${String((dayInfo as any).day).padStart(2, '0')}` ? "bg-blue-50 border-blue-300 border-2" : ""
                        }`}
                        onClick={() => {
                          if (viewMode === "monthly") {
                            const dateStr = `${(dayInfo as any).year}-${String((dayInfo as any).month + 1).padStart(2, '0')}-${String((dayInfo as any).day).padStart(2, '0')}`;
                            setSelectedCellDate(dateStr);
                            onDateClick(dateStr);
                          }
                        }}
                      >
                        <div className="space-y-1">
                          {viewMode === "monthly" ? (
                            <>
                              {/* 월간 뷰: 작물명과 작업 표시 */}
                              {periodTasks.map((task) => {
                              const cropName = getCropName(task.cropId);
                              return (
                                <div 
                                  key={task.id} 
                                  className="space-y-0.5 cursor-pointer hover:opacity-80"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    console.log("캘린더에서 작업 클릭, task 데이터:", task);
                                    setSelectedTask(task);
                                    setIsEditDialogOpen(true);
                                  }}
                                >
                                  {cropName && (
                                    <div className="text-xs font-medium text-gray-800 truncate">
                                      {cropName}
                                    </div>
                                  )}
                                  <div 
                                    className={`text-xs px-1 py-0.5 rounded border break-words leading-tight ${getTaskColor(task)} ${(task as any).endDate && (task as any).endDate !== task.scheduledDate ? 'border-l-4 border-l-blue-500' : ''}`}
                                    style={{
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical',
                                      overflow: 'hidden',
                                      wordWrap: 'break-word',
                                      maxHeight: '2.5rem'
                                    }}
                                    title={(task as any).endDate && (task as any).endDate !== task.scheduledDate ? `${task.scheduledDate} ~ ${(task as any).endDate}` : task.title || task.taskType}
                                  >
                                    {task.title || task.taskType}
                                  </div>
                                </div>
                              );
                            })}
                            </>
                          ) : (
                            // 반기 뷰: 작물명 표시 (연동 복구)
                            Array.from(new Set(periodTasks.map(task => {
                              // cropId가 있으면 등록된 작물명 사용
                              if (task.cropId) {
                                const crop = crops.find(c => c.id === task.cropId);
                                if (crop) return crop.name;
                              }
                              // cropId가 없으면 title에서 작물명 추출
                              if (task.title && task.title.includes('_')) {
                                return task.title.split('_')[0];
                              }
                              return "";
                            }).filter(Boolean))).map((cropName) => {
                              // 해당 월의 작물 작업들 찾기
                              const currentMonth = (dayInfo as any).month;
                              const monthTasks = memoizedTasks.filter(task => {
                                if (task.farmId !== selectedFarm?.id) return false;
                                if (!task.scheduledDate) return false;
                                
                                const taskDate = new Date(task.scheduledDate);
                                const taskMonth = taskDate.getMonth() + 1;
                                
                                // 작물명 확인
                                let taskCropName = "";
                                if (task.cropId) {
                                  const crop = crops.find(c => c.id === task.cropId);
                                  if (crop) taskCropName = crop.name;
                                }
                                if (!taskCropName && task.title && task.title.includes('_')) {
                                  taskCropName = task.title.split('_')[0];
                                }
                                
                                // 작물명이 일치하는지 확인
                                if (taskCropName !== cropName) return false;
                                
                                // 월 매칭: 시작일이 해당 월이거나, 날짜 범위가 해당 월에 포함되는지 확인
                                let isMonthMatch = taskMonth === currentMonth;
                                
                                if (!isMonthMatch && (task as any).endDate) {
                                  const taskEndDate = new Date((task as any).endDate);
                                  const taskEndMonth = taskEndDate.getMonth() + 1;
                                  
                                  // 시작일과 종료일이 모두 같은 월이면 해당 월에 표시
                                  if (taskMonth === currentMonth && taskEndMonth === currentMonth) {
                                    isMonthMatch = true;
                                  }
                                  // 시작일이 이전 월이고 종료일이 해당 월이면 표시
                                  else if (taskEndMonth === currentMonth) {
                                    isMonthMatch = true;
                                  }
                                }
                                
                                return isMonthMatch;
                              });
                              
                              // 날짜 범위 계산
                              let dateRange = null;
                              if (monthTasks.length > 0) {
                                const allDates: number[] = [];
                                
                                monthTasks.forEach(task => {
                                  const startDate = new Date(task.scheduledDate);
                                  allDates.push(startDate.getDate());
                                  
                                  // 날짜 범위가 있는 경우 종료일도 포함
                                  if ((task as any).endDate) {
                                    const endDate = new Date((task as any).endDate);
                                    // 같은 월 내에서만 종료일 추가
                                    if (endDate.getMonth() + 1 === currentMonth) {
                                      allDates.push(endDate.getDate());
                                    }
                                  }
                                });
                                
                                const uniqueDates = Array.from(new Set(allDates)).sort((a, b) => a - b);
                                
                                if (uniqueDates.length === 1) {
                                  dateRange = `${currentMonth}/${uniqueDates[0]}`;
                                } else {
                                  dateRange = `${currentMonth}/${uniqueDates[0]}-${uniqueDates[uniqueDates.length - 1]}`;
                                }
                              }
                              
                              return (
                                <div 
                                  key={`${cropName}-${currentMonth}`} 
                                  className="text-[10px] font-medium text-gray-800 bg-green-100 px-1 py-0.5 rounded truncate border border-green-200 mb-0.5"
                                  title={dateRange ? `${cropName} (${dateRange})` : cropName}
                                >
                                  <div className="truncate leading-tight">{cropName}</div>
                                  {dateRange && (
                                    <div className="text-[8px] text-gray-600 truncate leading-tight">
                                      {dateRange}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Selected Date Task Section - 월간 뷰에서만 표시 */}
      {viewMode === "monthly" && selectedCellDate && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {selectedCellDate} 작업
            </h3>
            <Button 
              size="sm" 
              className="flex items-center space-x-1"
              onClick={() => {
                setSelectedDateForTask(selectedCellDate);
                setShowAddTaskDialog(true);
              }}
            >
              <Plus className="w-4 h-4" />
              <span>작업 추가</span>
            </Button>
          </div>
          
          <div className="space-y-3">
            {memoizedTasks
              .filter(task => {
                // 정확한 날짜 매칭 또는 날짜 범위 내 포함
                let isDateMatch = task.scheduledDate === selectedCellDate;
                
                if (!isDateMatch && (task as any).endDate) {
                  // 날짜 범위가 있는 작업의 경우 범위 내 포함 여부 확인
                  const taskStartDate = new Date(task.scheduledDate);
                  const taskEndDate = new Date((task as any).endDate);
                  const currentDate = new Date(selectedCellDate);
                  
                  isDateMatch = currentDate >= taskStartDate && currentDate <= taskEndDate;
                }
                
                return isDateMatch && task.farmId === selectedFarm?.id;
              })
              .length > 0 ? (
              memoizedTasks
                .filter(task => {
                  // 정확한 날짜 매칭 또는 날짜 범위 내 포함
                  let isDateMatch = task.scheduledDate === selectedCellDate;
                  
                  if (!isDateMatch && (task as any).endDate) {
                    // 날짜 범위가 있는 작업의 경우 범위 내 포함 여부 확인
                    const taskStartDate = new Date(task.scheduledDate);
                    const taskEndDate = new Date((task as any).endDate);
                    const currentDate = new Date(selectedCellDate);
                    
                    isDateMatch = currentDate >= taskStartDate && currentDate <= taskEndDate;
                  }
                  
                  return isDateMatch && task.farmId === selectedFarm?.id;
                })
                .map((task) => {
                  const crop = crops.find(c => c.id === task.cropId);
                  return (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                    >
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {task.title || (crop?.name ? `${crop.name} - ${task.taskType}` : task.taskType || '작업')}
                        </h4>
                        {task.description && (
                          <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                        )}
                        <div className="flex items-center space-x-2 mt-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            task.completed === 1
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {task.completed === 1 ? '완료' : '예정'}
                          </span>
                          {(task.rowNumber || (task.description && task.description.includes("이랑:"))) && (
                            <span className="text-xs text-gray-500">
                              이랑 {task.rowNumber || (() => {
                                const match = task.description?.match(/이랑:\s*(\d+)번/);
                                return match ? match[1] : "";
                              })()}
                            </span>
                          )}
                          {(task as any).endDate && (task as any).endDate !== task.scheduledDate && (
                            <span className="text-xs text-blue-600">
                              {task.scheduledDate} ~ {(task as any).endDate}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log("수정 버튼 클릭, task 데이터:", task);
                          setSelectedTask(task);
                          setIsEditDialogOpen(true);
                        }}
                      >
                        수정
                      </Button>
                    </div>
                  );
                })
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>이 날짜에 예정된 작업이 없습니다.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Task Dialog */}
      <AddTaskDialog 
        open={showAddTaskDialog} 
        onOpenChange={setShowAddTaskDialog}
        selectedDate={selectedDateForTask}
      />

      {/* Edit Task Dialog */}
      {selectedTask && (
        <AddTaskDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          task={selectedTask}
          selectedDate={selectedTask.scheduledDate}
        />
      )}
    </div>
  );
}
