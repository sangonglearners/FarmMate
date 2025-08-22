import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@shared/ui/button";
import { CalendarGrid } from "@widgets/calendar-grid";
import { useTasks } from "@features/task-management";
import { useCrops } from "@features/crop-management";

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { data: tasks = [], isLoading: tasksLoading } = useTasks();
  const { data: crops = [] } = useCrops();

  const handlePreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDateClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    // TODO: Open task detail modal or navigate to task detail page
  };

  const formatMonth = (date: Date) => {
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
  };

  const getTasksForSelectedDate = () => {
    if (!selectedDate) return [];
    return tasks.filter(task => task.scheduledDate === selectedDate);
  };

  if (tasksLoading) {
    return (
      <div className="p-4">
        <div className="h-8 bg-gray-200 rounded mb-4 animate-pulse"></div>
        <div className="grid grid-cols-7 gap-4 mb-4">
          {Array.from({ length: 35 }, (_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-2">영농일지</h1>
        <p className="text-gray-600 text-sm">작업 일정을 관리해 보세요</p>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePreviousMonth}
          className="flex items-center space-x-1"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        
        <h2 className="text-lg font-semibold text-gray-900">
          {formatMonth(currentDate)}
        </h2>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleNextMonth}
          className="flex items-center space-x-1"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <CalendarGrid
          currentDate={currentDate}
          tasks={tasks}
          crops={crops}
          onDateClick={handleDateClick}
        />
      </div>

      {/* Selected Date Tasks */}
      {selectedDate && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {selectedDate} 작업
            </h3>
            <Button size="sm" className="flex items-center space-x-1">
              <Plus className="w-4 h-4" />
              <span>작업 추가</span>
            </Button>
          </div>
          
          <div className="space-y-3">
            {getTasksForSelectedDate().length > 0 ? (
              getTasksForSelectedDate().map((task) => {
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
                          task.status === 'completed' 
                            ? 'bg-green-100 text-green-800'
                            : task.status === 'in_progress'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {task.status === 'completed' ? '완료' : 
                           task.status === 'in_progress' ? '진행중' : '예정'}
                        </span>
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
                <Button className="mt-4" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  첫 작업 추가하기
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}