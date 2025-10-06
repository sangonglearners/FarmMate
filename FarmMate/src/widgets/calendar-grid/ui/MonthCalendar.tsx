import type { Task, Crop } from "@shared/schema";
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
  
  // 캘린더 그리드 생성 (항상 6주 = 42개 셀)
  const days = [];
  
  // 이전 달의 마지막 날들로 채우기
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const prevMonthLastDay = new Date(prevYear, prevMonth + 1, 0).getDate();
  
  for (let i = adjustedStartingDay - 1; i >= 0; i--) {
    days.push({
      day: prevMonthLastDay - i,
      isCurrentMonth: false,
      month: prevMonth,
      year: prevYear
    });
  }
  
  // 현재 달의 날들
  for (let day = 1; day <= daysInMonth; day++) {
    days.push({
      day: day,
      isCurrentMonth: true,
      month: month,
      year: year
    });
  }
  
  // 다음 달의 첫 번째 날들로 나머지 채우기 (총 42개 셀이 되도록)
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  let nextDay = 1;
  
  while (days.length < 42) {
    days.push({
      day: nextDay,
      isCurrentMonth: false,
      month: nextMonth,
      year: nextYear
    });
    nextDay++;
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
      {days.map((dayInfo, index) => {
        const currentDate = new Date(dayInfo.year, dayInfo.month, dayInfo.day);
        const dayTasks = getTasksForDate(tasks, currentDate);
        
        // 오늘 날짜인지 확인
        const today = new Date();
        const todayCheck = 
          today.getDate() === dayInfo.day &&
          today.getMonth() === dayInfo.month &&
          today.getFullYear() === dayInfo.year;
          
        // 날짜 문자열을 직접 생성하여 시간대 문제 방지
        const dateStr = `${dayInfo.year}-${String(dayInfo.month + 1).padStart(2, '0')}-${String(dayInfo.day).padStart(2, '0')}`;
        const isSelected = selectedDate === dateStr;

        return (
          <div
            key={index}
            className={`min-h-20 p-1 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
              !dayInfo.isCurrentMonth ? 'text-gray-400 bg-gray-25' : ''
            } ${todayCheck ? 'bg-primary/5 border-primary' : ''} ${
              isSelected ? 'bg-blue-50 border-blue-300' : ''
            } ${dayTasks.length > 0 ? 'bg-gray-50' : ''}`}
            onClick={() => {
              onDateClick(dateStr);
            }}
          >
            <div className={`text-xs mb-1 ${todayCheck ? 'font-bold text-primary' : ''} ${
              !dayInfo.isCurrentMonth ? 'text-gray-400' : ''
            }`}>
              {dayInfo.day}
            </div>
            {/* 작업이 있는 경우 개수만 표시 (현재 달만) */}
            {dayInfo.isCurrentMonth && dayTasks.length > 0 && (
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
