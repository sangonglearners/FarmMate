import type { Task, Crop } from "@shared/types/schema";
import { 
  getTaskColor, 
  getTasksForDate, 
  getCropName, 
  getCalendarDays,
  weekDays,
  type CalendarDay
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
  const today = new Date();

  return (
    <div className="grid grid-cols-7 gap-2">
      {/* Week Headers */}
      {weekDays.map((day: string) => (
        <div key={day} className="text-center py-2 text-xs font-medium text-gray-600">
          {day}
        </div>
      ))}

      {/* Calendar Days */}
      {days.map((dayInfo: CalendarDay, index: number) => {
        const { day, date } = dayInfo;
        const dayTasks = getTasksForDate(tasks, date);
        
        // 오늘 날짜인지 확인
        const todayCheck = 
          today.getDate() === date.getDate() &&
          today.getMonth() === date.getMonth() &&
          today.getFullYear() === date.getFullYear();
          
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const isSelected = selectedDate === dateStr;

        return (
          <div
            key={index}
            className={`min-h-24 p-1 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
              todayCheck ? 'bg-primary/5 border-primary' : ''
            } ${isSelected ? 'bg-blue-50 border-blue-300' : ''} ${dayTasks.length > 0 ? 'bg-gray-50' : ''}`}
            onClick={() => {
              onDateClick(dateStr);
            }}
          >
            <div className={`text-xs mb-1 ${todayCheck ? 'font-bold text-primary' : 'text-gray-900'}`}>
              {day}
            </div>
            {/* 기본적으로는 작업 개수만 표시, 선택된 날짜일 때만 상세 내용 표시 */}
            {isSelected && dayTasks.length > 0 ? (
              <div className="space-y-0.5">
                {dayTasks.slice(0, 2).map((task: Task) => (
                  <div
                    key={task.id}
                    className={`text-xs px-1 py-0.5 rounded break-words leading-tight ${getTaskColor(task.taskType)}`}
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      wordWrap: 'break-word',
                      maxHeight: '2.5rem'
                    }}
                    title={task.title || `${getCropName(crops, task.cropId)} - ${task.taskType}`}
                  >
                    {task.title || `${getCropName(crops, task.cropId)} ${task.taskType}`}
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
