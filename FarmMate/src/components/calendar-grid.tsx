import type { Task, Crop } from "@shared/types/schema";

interface CalendarGridProps {
  currentDate: Date;
  tasks: Task[];
  crops: Crop[];
  onDateClick: (date: string) => void;
}

export default function CalendarGrid({ currentDate, tasks, crops, onDateClick }: CalendarGridProps) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  // Get first day of month and number of days
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDay = firstDay.getDay();
  
  // Create calendar grid
  const days = [];
  
  // Add empty cells for days before month starts
  for (let i = 0; i < (startingDay === 0 ? 6 : startingDay - 1); i++) {
    days.push(null);
  }
  
  // Add days of month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }
  
  const getTasksForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return tasks.filter(task => task.scheduledDate === dateStr);
  };

  const getCropName = (cropId: string | null | undefined) => {
    if (!cropId) return "";
    const crop = crops.find(c => c.id === cropId);
    return crop ? crop.name : "";
  };

  const getTaskColor = (taskType: string) => {
    switch (taskType) {
      case "파종":
        return "bg-blue-200 text-blue-800";
      case "육묘":
        return "bg-green-200 text-green-800";
      case "수확-선별":
        return "bg-orange-200 text-orange-800";
      case "저장-포장":
        return "bg-purple-200 text-purple-800";
      default:
        return "bg-gray-200 text-gray-800";
    }
  };

  const weekDays = ['월', '화', '수', '목', '금', '토', '일'];

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

        const dayTasks = getTasksForDate(day);
        const isToday = 
          new Date().getDate() === day &&
          new Date().getMonth() === month &&
          new Date().getFullYear() === year;

        return (
          <div
            key={day}
            className={`min-h-24 p-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 ${
              isToday ? 'bg-primary/5 border-primary' : ''
            } ${dayTasks.length > 0 ? 'bg-gray-50' : ''}`}
            onClick={() => onDateClick(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`)}
          >
            <div className={`text-xs mb-1 ${isToday ? 'font-bold text-primary' : 'text-gray-900'}`}>
              {day}
            </div>
            <div className="space-y-1">
              {dayTasks.slice(0, 2).map(task => (
                <div
                  key={task.id}
                  className={`text-xs px-1 py-0.5 rounded truncate ${getTaskColor(task.taskType)}`}
                  title={`${getCropName(task.cropId)} - ${task.taskType}`}
                >
                  {getCropName(task.cropId)} {task.taskType}
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
