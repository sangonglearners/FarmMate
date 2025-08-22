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
}

export default function CalendarGrid({ currentDate, tasks, crops, onDateClick }: CalendarGridProps) {
  const days = getCalendarDays(currentDate);

  return (
    <div className="grid grid-cols-7 gap-4">
      {/* Week Headers */}
      {weekDays.map(day => (
        <div key={day} className="text-center py-3 text-sm font-medium text-gray-600">
          {day}
        </div>
      ))}

      {/* Calendar Days */}
      {days.map((day, index) => {
        if (day === null) {
          return <div key={index} className="min-h-24"></div>;
        }

        const dayTasks = getTasksForDate(tasks, currentDate, day);
        const todayCheck = isToday(currentDate, day);

        return (
          <div
            key={day}
            className={`min-h-24 p-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 ${
              todayCheck ? 'bg-primary/5 border-primary' : ''
            } ${dayTasks.length > 0 ? 'bg-gray-50' : ''}`}
            onClick={() => {
              const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              onDateClick(dateStr);
            }}
          >
            <div className={`text-xs mb-1 ${todayCheck ? 'font-bold text-primary' : 'text-gray-900'}`}>
              {day}
            </div>
            <div className="space-y-1">
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
                  +{dayTasks.length - 2}개 더
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
