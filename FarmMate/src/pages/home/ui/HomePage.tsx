import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar as CalendarIcon, ChevronRight, Plus, Clock, ChevronLeft } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { CalendarGrid } from "../../../widgets/calendar-grid";
import MonthCalendar from "../../../widgets/calendar-grid/ui/MonthCalendar";

import { useCrops } from "../../../features/crop-management";
import { getTaskPriority, getTaskColor, getTaskIcon } from "../../../entities/task/model/utils";
import { useLocation } from "wouter";
import AddTaskDialog from "../../../components/add-task-dialog-improved";
import TodoList from "../../../components/todo-list";

export default function HomePage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showMonthView, setShowMonthView] = useState(false);
  const [showEditTaskDialog, setShowEditTaskDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [, setLocation] = useLocation();

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

  const handleAddTaskClick = () => {
    setShowAddTaskDialog(true);
  };

  const handleTaskClick = (task: any) => {
    console.log("편집할 task 데이터:", task);
    setSelectedTask(task);
    setShowEditTaskDialog(true);
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

  // Get selected date's tasks (기본값은 오늘) - 날짜 범위 작업 포함
  // "재배" 유형의 작업은 캘린더 연속 박스 표시용이므로 투두리스트에서 제외
  const selectedDateTasks = tasks.filter(task => {
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
      return `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월`;
    } else {
      // 2주 보기에서는 해당 주의 월요일부터 2주간의 범위를 표시
      const currentDayOfWeek = currentDate.getDay();
      const daysFromMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
      const monday = new Date(currentDate);
      monday.setDate(currentDate.getDate() - daysFromMonday);
      
      const endDate = new Date(monday);
      endDate.setDate(monday.getDate() + 13);
      
      return `${monday.getMonth() + 1}월 ${monday.getDate()}일 - ${endDate.getMonth() + 1}월 ${endDate.getDate()}일`;
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
            <CardTitle className="text-lg flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handlePrevious}
                  className="p-1 h-8 w-8"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="flex items-center space-x-2">
                  <CalendarIcon className="w-5 h-5" />
                  <div className="flex flex-col">
                    <span>{showMonthView ? "한 달 플래너" : "이번 주 플래너"}</span>
                    <span className="text-sm text-gray-500 font-normal">{formatCurrentPeriod()}</span>
                  </div>
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleNext}
                  className="p-1 h-8 w-8"
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
                  tasks={tasks}
                  crops={crops}
                  onDateClick={handleDateClick}
                  selectedDate={selectedDate}
                />
              ) : (
                <CalendarGrid
                  currentDate={currentDate}
                  tasks={tasks}
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
                tasks={selectedDateTasks}
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
    </>
  );
}