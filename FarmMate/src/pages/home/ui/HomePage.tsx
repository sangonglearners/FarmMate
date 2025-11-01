import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar as CalendarIcon, ChevronRight, Plus, Clock, ChevronLeft } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { CalendarGrid } from "../../../widgets/calendar-grid";
import MonthCalendar from "../../../widgets/calendar-grid/ui/MonthCalendar";

import { useCrops } from "../../../features/crop-management";
import { useSharedCalendars } from "@/features/calendar-share";
import { getTaskPriority, getTaskColor, getTaskIcon } from "../../../entities/task/model/utils";
import { useLocation } from "wouter";
import AddTaskDialog from "../../../components/add-task-dialog-improved";
import BatchTaskEditDialog from "../../../components/batch-task-edit-dialog";
import TodoList from "../../../components/todo-list";

export default function HomePage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showMonthView, setShowMonthView] = useState(false);
  const [showEditTaskDialog, setShowEditTaskDialog] = useState(false);
  const [showBatchEditDialog, setShowBatchEditDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [, setLocation] = useLocation();

  // 읽기 권한(viewer)으로 공유받은 농장 ID 집합 (Home의 ToDo 연동에서만 제외)
  const { data: sharedCalendars = [] } = useSharedCalendars();
  const viewerFarmIdSet = new Set(
    (sharedCalendars || [])
      .filter((c) => c.role === 'viewer')
      .map((c) => c.calendarId)
  );

  // 중복 제거 함수
  const removeDuplicateTasks = (tasks: any[]) => {
    const seen = new Set();
    return tasks.filter(task => {
      const key = `${task.title}-${task.scheduledDate}-${task.description}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  };

  // Supabase에서 작업 목록 가져오기
  const { data: tasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      try {
        const { taskApi } = await import("@/shared/api/tasks");
        return await taskApi.getTasks();
      } catch (error) {
        console.error("작업 목록 로딩 실패:", error);
        return [];
      }
    },
    staleTime: 0, // 항상 최신 데이터를 가져오도록 설정
    refetchOnWindowFocus: true, // 창 포커스 시 자동 새로고침
  });
  const { data: crops = [] } = useCrops();

  const handleDateClick = (dateStr: string) => {
    setSelectedDate(dateStr);
  };

  const handleFullViewClick = () => {
    setShowMonthView(!showMonthView);
  };
  // 홈 화면 플래너(주/월)에서도 viewer 공유 작업은 제외하여 전달
  const plannerTasks = tasks.filter((task: any) => {
    if (task.farmId && viewerFarmIdSet.has(task.farmId)) return false;
    return true;
  });


  const handleAddTaskClick = () => {
    setShowAddTaskDialog(true);
  };

  const handleTaskClick = (task: any) => {
    console.log("편집할 task 데이터:", task);
    
    // 그룹화된 작업인지 확인
    if (task.isGroup) {
      // 그룹화된 작업의 경우 일괄 수정 다이얼로그 열기
      console.log("그룹화된 작업입니다. 일괄 수정 다이얼로그를 엽니다.");
      setSelectedTask(task);
      setShowBatchEditDialog(true);
    } else if (task.taskGroupId || task.originalTaskGroup) {
      // 일괄등록된 개별 작업의 경우 일괄 수정 다이얼로그 열기
      console.log("일괄등록된 작업입니다. 일괄 수정 다이얼로그를 엽니다.");
      setSelectedTask(task);
      setShowBatchEditDialog(true);
    } else {
      // 개별 작업의 경우 개별 수정 다이얼로그 열기
      setSelectedTask(task);
      setShowEditTaskDialog(true);
    }
  };

  const handlePrevious = () => {
    if (showMonthView) {
      // 1달 보기에서는 1달씩 이동
      const newDate = new Date(currentDate);
      newDate.setMonth(newDate.getMonth() - 1);
      setCurrentDate(newDate);
    } else {
      // 2주 보기에서는 2주씩 이동
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() - 14);
      setCurrentDate(newDate);
    }
  };

  const handleNext = () => {
    if (showMonthView) {
      // 1달 보기에서는 1달씩 이동
      const newDate = new Date(currentDate);
      newDate.setMonth(newDate.getMonth() + 1);
      setCurrentDate(newDate);
    } else {
      // 2주 보기에서는 2주씩 이동
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + 14);
      setCurrentDate(newDate);
    }
  };

  // 일괄등록된 작업들을 그룹화하는 함수
  const groupTasksByGroupId = (tasks: any[]) => {
    const groupedTasks = new Map<string, any[]>();
    const individualTasks: any[] = [];
    
    tasks.forEach(task => {
      if (task.taskGroupId) {
        // 일괄등록된 작업들
        const existing = groupedTasks.get(task.taskGroupId) || [];
        existing.push(task);
        groupedTasks.set(task.taskGroupId, existing);
      } else {
        // 개별 작업들
        individualTasks.push(task);
      }
    });
    
    // 그룹화된 작업들을 대표 작업으로 변환
    const groupRepresentatives: any[] = [];
    groupedTasks.forEach((groupTasks, groupId) => {
      if (groupTasks.length > 0) {
        // 그룹의 첫 번째 작업을 대표로 사용
        const representative = groupTasks[0];
        
        // 그룹의 전체 날짜 범위 계산
        const allDates: Date[] = [];
        groupTasks.forEach(t => {
          allDates.push(new Date(t.scheduledDate));
          if (t.endDate) {
            allDates.push(new Date(t.endDate));
          }
        });
        const startDate = new Date(Math.min(...allDates.map(d => d.getTime())));
        const endDate = new Date(Math.max(...allDates.map(d => d.getTime())));
        
        // 그룹화된 작업을 개별 작업으로 분리하여 표시
        groupTasks.forEach(task => {
          const individualTask = {
            ...task,
            isGroup: false, // 개별 작업으로 표시
            cropName: representative.title?.split('_')[0] || '작물',
            // 원본 작업 정보 유지
            originalTaskGroup: groupTasks,
            groupStartDate: startDate.toISOString().split('T')[0],
            groupEndDate: endDate.toISOString().split('T')[0],
          };
          groupRepresentatives.push(individualTask);
        });
      }
    });
    
    return [...groupRepresentatives, ...individualTasks];
  };

  // Get selected date's tasks (기본값은 오늘) - 날짜 범위 작업 포함
  // "재배" 유형의 작업은 캘린더 연속 박스 표시용이므로 투두리스트에서 제외
  const selectedDateTasks = tasks.filter(task => {
    // 홈 ToDo에는 읽기 권한(viewer)으로 공유받은 농장의 작업은 제외
    if (task.farmId && viewerFarmIdSet.has(task.farmId)) {
      return false;
    }
    // "재배" 유형의 작업은 투두리스트에서 제외
    if (task.taskType === "재배") {
      return false;
    }
    
    // 정확한 날짜 매칭
    if (task.scheduledDate === selectedDate) {
      return true;
    }
    
    // 날짜 범위가 있는 작업의 경우 범위 내 포함 여부 확인
    if ((task as any).endDate) {
      const taskStartDate = new Date(task.scheduledDate);
      const taskEndDate = new Date((task as any).endDate);
      const currentDate = new Date(selectedDate);
      
      return currentDate >= taskStartDate && currentDate <= taskEndDate;
    }
    
    return false;
  });

  // 일괄등록된 작업들을 그룹화하여 표시
  const groupedSelectedDateTasks = groupTasksByGroupId(selectedDateTasks);
  
  // Get upcoming tasks (next 7 days)
  // "재배" 유형의 작업은 투두리스트에서 제외
  const upcomingTasks = tasks
    .filter(task => {
      // "재배" 유형의 작업은 투두리스트에서 제외
      if (task.taskType === "재배") {
        return false;
      }
      
      const taskDate = new Date(task.scheduledDate);
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      return taskDate > new Date() && taskDate <= nextWeek;
    })
    .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
    .slice(0, 5);

  // Get overdue tasks
  // "재배" 유형의 작업은 투두리스트에서 제외
  const overdueTasks = tasks.filter(task => {
    // "재배" 유형의 작업은 투두리스트에서 제외
    if (task.taskType === "재배") {
      return false;
    }
    
    const priority = getTaskPriority(task.scheduledDate);
    return priority === "overdue" && task.completed === 0;
  });

  const getCropName = (cropId: string | null | undefined) => {
    if (!cropId) return "작물 정보 없음";
    const crop = crops.find(c => c.id === cropId);
    return crop ? `${crop.category} > ${crop.name}` : "작물 정보 없음";
  };

  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    if (dateStr === today.toISOString().split('T')[0]) return "오늘";
    if (dateStr === tomorrow.toISOString().split('T')[0]) return "내일";
    
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
  };

  const formatSelectedDate = () => {
    const date = new Date(selectedDate);
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
  };

  const formatCurrentPeriod = () => {
    if (showMonthView) {
      const year = currentDate.getFullYear().toString().slice(-2);
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      return `${year}.${month}`;
    } else {
      // 2주 보기에서는 해당 주의 월요일부터 2주간의 범위를 표시
      const currentDayOfWeek = currentDate.getDay();
      const daysFromMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
      const monday = new Date(currentDate);
      monday.setDate(currentDate.getDate() - daysFromMonday);
      
      const endDate = new Date(monday);
      endDate.setDate(monday.getDate() + 13);
      
      // 날짜 형식: "25.10.27~11.09"
      const formatDateShort = (date: Date) => {
        const year = date.getFullYear().toString().slice(-2);
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}.${month}.${day}`;
      };
      
      const startStr = formatDateShort(monday);
      const endStr = formatDateShort(endDate);
      
      // 같은 년도인지 확인
      if (monday.getFullYear() === endDate.getFullYear()) {
        // 같은 년도: "25.10.27~11.09" (시작일의 년도만 표시)
        const month = String(endDate.getMonth() + 1).padStart(2, '0');
        const day = String(endDate.getDate()).padStart(2, '0');
        return `${startStr}~${month}.${day}`;
      } else {
        // 다른 년도: "25.10.27~26.01.09"
        return `${startStr}~${formatDateShort(endDate)}`;
      }
    }
  };

  if (tasksLoading) {
    return (
      <div className="p-4 space-y-6">
        <div className="h-8 bg-gray-200 rounded mb-4 animate-pulse"></div>
        <div className="h-48 bg-gray-200 rounded animate-pulse"></div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">FarmMate</h1>
          <p className="text-gray-600 text-sm">오늘의 농장 활동을 확인해보세요</p>
        </div>

        {/* Recommendation Banner */}
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="max-w-[70%]">
                <p className="text-xs text-gray-600 mb-1">이번 시즌에는</p>
                <h2 className="text-base font-semibold text-gray-900 leading-snug">
                  무엇을, 언제, 어디에, 얼마나 심지?
                </h2>
                <Button size="sm" className="mt-3" onClick={() => setLocation('/recommendations/input')}>
                  작물 추천 받으러가기
                </Button>
              </div>
              <div className="w-24 h-24 rounded-full bg-green-50 flex items-center justify-center text-4xl select-none">
                🥕
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calendar Planner */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center space-x-1 flex-1 min-w-0">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handlePrevious}
                  className="p-1 h-8 w-8 flex-shrink-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="flex items-center space-x-1 flex-1 min-w-0">
                  <CalendarIcon className="w-4 h-4 flex-shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-sm whitespace-nowrap">{showMonthView ? "한 달 플래너" : "이번 주 플래너"}</span>
                    <span className="text-xs text-gray-500 font-normal whitespace-nowrap">{formatCurrentPeriod()}</span>
                  </div>
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleNext}
                  className="p-1 h-8 w-8 flex-shrink-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-primary"
                onClick={handleFullViewClick}
              >
                {showMonthView ? (
                  <>
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    <span>2주 보기</span>
                  </>
                ) : (
                  <>
                    <span>전체 보기</span>
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="max-h-[500px] overflow-auto">
              {showMonthView ? (
                <MonthCalendar
                  currentDate={currentDate}
                  tasks={plannerTasks}
                  crops={crops}
                  onDateClick={handleDateClick}
                  selectedDate={selectedDate}
                />
              ) : (
                <CalendarGrid
                  currentDate={currentDate}
                  tasks={plannerTasks}
                  crops={crops}
                  onDateClick={handleDateClick}
                  selectedDate={selectedDate}
                />
              )}
            </div>
          </CardContent>
        </Card>



        {/* Selected Date's Schedule */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              <span>{formatSelectedDate()}의 일정</span>
              <Button variant="ghost" size="sm" className="text-primary" onClick={handleAddTaskClick}>
                <Plus className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {selectedDateTasks.length > 0 ? (
              <TodoList 
                tasks={groupedSelectedDateTasks}
                selectedDate={selectedDate}
                onTaskClick={handleTaskClick}
              />
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p>{formatSelectedDate()}에는 예정된 작업이 없습니다.</p>
                <Button className="mt-4" size="sm" onClick={handleAddTaskClick}>
                  <Plus className="w-4 h-4 mr-2" />
                  새 작업 추가하기
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Task Dialog */}
      <AddTaskDialog
        open={showAddTaskDialog}
        onOpenChange={(open) => {
          setShowAddTaskDialog(open);
          if (!open) {
            // 다이얼로그가 닫힐 때 작업 목록 새로고침
            refetchTasks();
          }
        }}
        selectedDate={selectedDate}
      />

      {/* Edit Task Dialog */}
      <AddTaskDialog
        open={showEditTaskDialog}
        onOpenChange={(open) => {
          setShowEditTaskDialog(open);
          if (!open) {
            // 다이얼로그가 닫힐 때 작업 목록 새로고침
            refetchTasks();
          }
        }}
        task={selectedTask}
        selectedDate={selectedDate}
      />

      {/* Batch Edit Task Dialog */}
      <BatchTaskEditDialog
        open={showBatchEditDialog}
        onOpenChange={(open) => {
          setShowBatchEditDialog(open);
          if (!open) {
            // 다이얼로그가 닫힐 때 작업 목록 새로고침
            refetchTasks();
          }
        }}
        taskGroup={selectedTask?.groupTasks || selectedTask?.originalTaskGroup || (selectedTask ? [selectedTask] : [])}
      />
    </>
  );
}