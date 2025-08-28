import type { Task, Crop } from "@shared/types/schema";
import { 
  getTaskColor, 
  getTasksForDate, 
  getCropName, 
  weekDays 
} from "../model/calendar.utils";

interface MonthCalendarProps {
  currentDate: Date;
  tasks: Task[];
  crops: Crop[];
  onDateClick: (date: string) => void;
  selectedDate?: string;
}

export default function MonthCalendar({ currentDate, tasks, crops, onDateClick, selectedDate }: MonthCalendarProps) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  // 해당 월의 첫 번째 날과 마지막 날
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDay = firstDay.getDay();
  
  // 주의 시작을 월요일로 설정 (0: 일요일, 1: 월요일)
  const adjustedStartingDay = startingDay === 0 ? 6 : startingDay - 1;
  
  // 캘린더 그리드 생성
  const days = [];
  
  // 이전 달의 마지막 날들
  for (let i = 0; i < adjustedStartingDay; i++) {
    days.push(null);
  }
  
  // 현재 달의 날들
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }
  
  // 다음 달의 첫 번째 날들 (7의 배수로 맞추기)
  const remainingDays = 7 - (days.length % 7);
  if (remainingDays < 7) {
    for (let i = 0; i < remainingDays; i++) {
      days.push(null);
    }
  }

  return (
    <div className="grid grid-cols-7 gap-1">
      {/* 요일 헤더 */}
      {weekDays.map(day => (
        <div key={day} className="text-center py-2 text-sm font-medium text-gray-600">
          {day}
        </div>
      ))}

      {/* 날짜 그리드 */}
      {days.map((day, index) => {
        if (day === null) {
          return <div key={index} className="min-h-16"></div>;
        }

        const currentDate = new Date(year, month, day);
        const dayTasks = getTasksForDate(tasks, currentDate);
        
        // 오늘 날짜인지 확인
        const today = new Date();
        const todayCheck = 
          today.getDate() === day &&
          today.getMonth() === month &&
          today.getFullYear() === year;
          
        const isSelected = selectedDate === currentDate.toISOString().split('T')[0];
        const isCurrentMonth = currentDate.getMonth() === month;

        return (
          <div
            key={index}
            className={`min-h-16 p-1 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
              !isCurrentMonth ? 'text-gray-400' : ''
            } ${todayCheck ? 'bg-primary/5 border-primary' : ''} ${
              isSelected ? 'bg-blue-50 border-blue-300' : ''
            } ${dayTasks.length > 0 ? 'bg-gray-50' : ''}`}
            onClick={() => {
              const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              onDateClick(dateStr);
            }}
          >
            <div className={`text-xs mb-1 ${todayCheck ? 'font-bold text-primary' : ''}`}>
              {day}
            </div>
            {/* 작업이 있는 경우 개수만 표시 */}
            {dayTasks.length > 0 && (
              <div className="text-xs text-gray-500 text-center">
                {dayTasks.length}개
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
