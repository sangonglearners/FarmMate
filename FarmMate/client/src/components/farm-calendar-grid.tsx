import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@shared/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/ui/select";
import AddTaskDialog from "@/components/add-task-dialog-improved";
import type { Task, Crop } from "@shared/types/schema";

interface FarmCalendarGridProps {
  tasks: Task[];
  crops: Crop[];
  onDateClick: (date: string) => void;
}

type ViewMode = "monthly" | "yearly";
type FarmType = "노지" | "시설1" | "시설2";

export default function FarmCalendarGrid({ tasks, crops, onDateClick }: FarmCalendarGridProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("monthly");
  const [selectedFarm, setSelectedFarm] = useState<FarmType>("노지");
  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false);
  const [selectedDateForTask, setSelectedDateForTask] = useState<string>("");
  const [selectedCellDate, setSelectedCellDate] = useState<string | null>(null);
  
  // 월간과 연간 뷰의 날짜 상태를 분리
  const today = new Date();
  const [monthlyDate, setMonthlyDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [yearlyDate, setYearlyDate] = useState(new Date(today.getFullYear(), 0, 1));
  const [monthlyOffset, setMonthlyOffset] = useState(() => {
    // 오늘이 포함된 10일 구간으로 초기화
    const todayDate = today.getDate();
    return Math.floor((todayDate - 1) / 5);
  });

  // 현재 뷰 모드에 따른 날짜
  const currentDate = viewMode === "monthly" ? monthlyDate : yearlyDate;

  // 이랑 번호 (임시로 1-15까지)
  const rowNumbers = Array.from({ length: 15 }, (_, i) => i + 1);

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

  // 연간 뷰: 1-12월
  const getYearlyMonths = () => {
    return Array.from({ length: 12 }, (_, i) => i + 1);
  };

  // 특정 날짜/월의 작업 가져오기
  const getTasksForPeriod = (rowNumber: number, dayInfo: any) => {
    if (viewMode === "monthly") {
      const dateStr = `${dayInfo.year}-${String(dayInfo.month + 1).padStart(2, '0')}-${String(dayInfo.day).padStart(2, '0')}`;
      return tasks.filter(task => 
        task.scheduledDate === dateStr && 
        (task.rowNumber === rowNumber || (!task.rowNumber && rowNumber === 1))
      );
    } else {
      // 연간 뷰: 해당 월의 모든 작업
      const year = currentDate.getFullYear();
      return tasks.filter(task => {
        if (!task.scheduledDate) return false;
        if (task.rowNumber !== rowNumber && !(task.rowNumber === null && rowNumber === 1)) return false;
        const taskDate = new Date(task.scheduledDate);
        return taskDate.getFullYear() === year && taskDate.getMonth() + 1 === dayInfo.month;
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
  const getTaskColor = (taskType: string) => {
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
    setYearlyDate(new Date(yearlyDate.getFullYear() - 1, 0, 1));
  };

  const handleYearlyNext = () => {
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
        <Select value={selectedFarm} onValueChange={(value: FarmType) => setSelectedFarm(value)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="노지">노지</SelectItem>
            <SelectItem value="시설1">시설1</SelectItem>
            <SelectItem value="시설2">시설2</SelectItem>
          </SelectContent>
        </Select>

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
              // 연간 뷰로 전환 시 오늘 년도로 리셋
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
            : `${currentDate.getFullYear()}년`
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
        <div className="overflow-x-auto">
          <div className={viewMode === "yearly" ? "min-w-[800px]" : "min-w-[700px]"}>
            {/* 헤더 */}
            <div className="flex border-b border-gray-200 bg-gray-50">
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
                  className={`flex-1 p-3 text-center font-medium border-r border-gray-200 last:border-r-0 ${
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
            <div className="max-h-[600px] overflow-y-auto">
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
                        className={`flex-1 p-2 border-r border-gray-200 last:border-r-0 min-h-[80px] cursor-pointer hover:bg-gray-50 transition-colors ${
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
                            // 월간 뷰: 작물명과 작업 표시
                            periodTasks.map((task) => {
                              const cropName = getCropName(task.cropId);
                              return (
                                <div key={task.id} className="space-y-0.5">
                                  {cropName && (
                                    <div className="text-xs font-medium text-gray-800 truncate">
                                      {cropName}
                                    </div>
                                  )}
                                  <div className={`text-xs px-1 py-0.5 rounded border truncate ${getTaskColor(task.taskType)}`}>
                                    {task.taskType}
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            // 연간 뷰: 작물명만 표시
                            Array.from(new Set(periodTasks.map(task => getCropName(task.cropId)).filter(Boolean))).map((cropName) => (
                              <div key={cropName} className="text-xs font-medium text-gray-800 bg-green-100 px-1 py-0.5 rounded truncate border border-green-200">
                                {cropName}
                              </div>
                            ))
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
            {tasks
              .filter(task => task.scheduledDate === selectedCellDate)
              .length > 0 ? (
              tasks
                .filter(task => task.scheduledDate === selectedCellDate)
                .map((task) => {
                  const crop = crops.find(c => c.id === task.cropId);
                  return (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                    >
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {crop?.name || '작물 정보 없음'} - {task.taskType}
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
                          {task.rowNumber && (
                            <span className="text-xs text-gray-500">
                              이랑 {task.rowNumber}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
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
    </div>
  );
}
