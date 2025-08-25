import type { Task, Crop } from "@shared/types/schema";
import { 
  getTaskColor, 
  getTasksForDate, 
  getCropName, 
  isToday,
  getCalendarDays,
  weekDays 
} from "../model/calendar.utils";

interface CalendarGridProps {
  currentDate: Date;
  tasks: Task[];
  crops: Crop[];
  onDateClick: (date: string) => void;
  selectedDate?: string;
}

export default function CalendarGrid({ currentDate, tasks, crops, onDateClick, selectedDate }: CalendarGridProps) {
  const days = getCalendarDays(currentDate);

  return (
    <div className="grid grid-cols-7 gap-2">
      {/* Week Headers */}
      {weekDays.map(day => (
        <div key={day} className="text-center py-2 text-xs font-medium text-gray-600">
          {day}
        </div>
      ))}

      {/* Calendar Days */}
      {days.map((day, index) => {
        const today = new Date();
        const currentDay = new Date(today);
        currentDay.setDate(today.getDate() + index);
        
        const dayTasks = getTasksForDate(tasks, currentDay, day);
        const todayCheck = index === 0; // 첫 번째 날이 오늘
        const isSelected = selectedDate === currentDay.toISOString().split('T')[0];

        return (
          <div
            key={index}
            className={`min-h-20 p-1 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
              todayCheck ? 'bg-primary/5 border-primary' : ''
            } ${isSelected ? 'bg-blue-50 border-blue-300' : ''} ${dayTasks.length > 0 ? 'bg-gray-50' : ''}`}
            onClick={() => {
              const dateStr = `${currentDay.getFullYear()}-${String(currentDay.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              onDateClick(dateStr);
            }}
          >
            <div className={`text-xs mb-1 ${todayCheck ? 'font-bold text-primary' : 'text-gray-900'}`}>
              {day}
            </div>
            {/* 기본적으로는 작업 개수만 표시, 선택된 날짜일 때만 상세 내용 표시 */}
            {isSelected && dayTasks.length > 0 ? (
              <div className="space-y-0.5">
                {dayTasks.slice(0, 2).map(task => (
                  <div
                    key={task.id}
                    className={`text-xs px-1 py-0.5 rounded truncate ${getTaskColor(task.taskType)}`}
                    title={`${getCropName(crops, task.cropId)} - ${task.taskType}`}
                  >
                    {getCropName(crops, task.cropId)} {task.taskType}
                  </div>
                ))}
                {dayTasks.length > 2 && (
                  <div className="text-xs text-gray-500">
                    +{dayTasks.length - 2}개
                  </div>
                )}
              </div>
            ) : dayTasks.length > 0 ? (
              <div className="text-xs text-gray-500 text-center">
                {dayTasks.length}개
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
