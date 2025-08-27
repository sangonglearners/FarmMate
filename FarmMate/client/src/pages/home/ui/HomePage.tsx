import { useState } from "react";
import { Calendar as CalendarIcon, ChevronRight, Plus, Clock, ChevronLeft } from "lucide-react";
import { Button } from "@shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/ui/card";
import { CalendarGrid } from "@widgets/calendar-grid";
import MonthCalendar from "@widgets/calendar-grid/ui/MonthCalendar";
import { useTasks } from "@features/task-management";
import { useCrops } from "@features/crop-management";
import { getTaskPriority, getTaskColor, getTaskIcon } from "@entities/task/model/utils";
import { useLocation } from "wouter";
import AddTaskDialog from "../../../components/add-task-dialog-improved";

export default function HomePage() {
  const [currentDate] = useState(new Date());
  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showMonthView, setShowMonthView] = useState(false);
  const [, setLocation] = useLocation();

  const { data: tasks = [], isLoading: tasksLoading } = useTasks();
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

  // Get selected date's tasks (기본값은 오늘)
  const selectedDateTasks = tasks.filter(task => task.scheduledDate === selectedDate);
  
  // Get upcoming tasks (next 7 days)
  const upcomingTasks = tasks
    .filter(task => {
      const taskDate = new Date(task.scheduledDate);
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      return taskDate > new Date() && taskDate <= nextWeek;
    })
    .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
    .slice(0, 5);

  // Get overdue tasks
  const overdueTasks = tasks.filter(task => {
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

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{selectedDateTasks.length}</div>
              <div className="text-xs text-gray-600">선택된 날짜 작업</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{overdueTasks.length}</div>
              <div className="text-xs text-gray-600">지연 작업</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{upcomingTasks.length}</div>
              <div className="text-xs text-gray-600">예정 작업</div>
            </CardContent>
          </Card>
        </div>

        {/* Calendar Planner */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <CalendarIcon className="w-5 h-5" />
                <span>{showMonthView ? "한 달 플래너" : "이번 주 플래너"}</span>
              </span>
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
            <div className="max-h-96 overflow-hidden">
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

        {/* Selected Date's Tasks */}
        {selectedDateTasks.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <Clock className="w-5 h-5" />
                  <span>{formatSelectedDate()}의 작업</span>
                </span>
                <Button variant="ghost" size="sm" onClick={handleAddTaskClick}>
                  <Plus className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              {selectedDateTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-xl">{getTaskIcon(task.taskType)}</div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {getCropName(task.cropId)} - {task.taskType}
                      </h4>
                      {task.description && (
                        <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                      )}
                    </div>
                  </div>
                  <div className={`text-xs px-2 py-1 rounded-full ${getTaskColor(task.taskType)}`}>
                    {task.completed === 1 ? '완료' : '예정'}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Overdue Tasks */}
        {overdueTasks.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <span className="flex items-center space-x-2 text-red-600">
                  <Clock className="w-5 h-5" />
                  <span>지연된 작업</span>
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              {overdueTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 border border-red-200 bg-red-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-xl">{getTaskIcon(task.taskType)}</div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {getCropName(task.cropId)} - {task.taskType}
                      </h4>
                      <p className="text-sm text-red-600">
                        예정일: {formatDisplayDate(task.scheduledDate)}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="text-red-600 border-red-200">
                    처리하기
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

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
              <div className="space-y-3">
                {selectedDateTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="text-lg">{getTaskIcon(task.taskType)}</div>
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {getCropName(task.cropId)} - {task.taskType}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {formatDisplayDate(task.scheduledDate)}
                        </p>
                      </div>
                    </div>
                    <div className={`text-xs px-2 py-1 rounded-full ${getTaskColor(task.taskType)}`}>
                      {formatDisplayDate(task.scheduledDate)}
                    </div>
                  </div>
                ))}
              </div>
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
        onOpenChange={setShowAddTaskDialog}
        selectedDate={selectedDate}
      />
    </>
  );
}