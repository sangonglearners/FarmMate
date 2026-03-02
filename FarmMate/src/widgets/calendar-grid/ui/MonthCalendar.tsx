import type { Task, Crop } from "@shared/schema";
import { 
  getCropCategoryColor,
  getTasksForDate, 
  getCropName, 
  weekDays
} from "../model/calendar.utils";

interface MonthCalendarProps {
  currentDate: Date;
  tasks: Task[];
  crops: Crop[];
  onDateClick: (date: string) => void;
  onTaskClick?: (task: Task) => void; // 일지 클릭 핸들러
  selectedDate?: string;
}

export default function MonthCalendar({ currentDate, tasks, crops, onDateClick, onTaskClick, selectedDate }: MonthCalendarProps) {
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

  // 홈 캘린더에서는 모든 일정을 개별적으로 표시하므로 연속 일정 박스는 렌더링하지 않음
  // const taskGroups = getTaskGroups(tasks, days);

  return (
    <div className="relative">
      {/* 홈 캘린더에서는 연속된 일정 박스들을 렌더링하지 않음 - 모든 일정을 개별적으로 표시 */}
      
      {/* 캘린더 그리드 */}
      <div className="grid grid-cols-7 gap-1">
        {/* 요일 헤더 */}
        {weekDays.map(day => (
          <div key={day} className="text-center py-1 md:py-2 text-xs md:text-sm font-medium text-gray-600">
            {day}
          </div>
        ))}

        {/* 날짜 그리드 */}
        {days.map((dayInfo, index) => {
          const currentDate = new Date(dayInfo.year, dayInfo.month, dayInfo.day);
          const dayTasks = getTasksForDate(tasks, currentDate);
          
          // 홈화면에서는 모든 일정을 개별적으로 표시
          const singleDayTasks = dayTasks;
          
          // 오늘 날짜인지 확인
          const today = new Date();
          const todayCheck = 
            today.getDate() === dayInfo.day &&
            today.getMonth() === dayInfo.month &&
            today.getFullYear() === dayInfo.year;
            
          // 날짜 문자열을 직접 생성하여 시간대 문제 방지
          const dateStr = `${dayInfo.year}-${String(dayInfo.month + 1).padStart(2, '0')}-${String(dayInfo.day).padStart(2, '0')}`;
          const isSelected = selectedDate === dateStr;

          // 배경색 우선순위: 오늘 날짜 > 선택된 날짜 > 작업 있는 날짜 > 기본
          let backgroundColor = '';
          let borderColor = 'border-gray-200';
          
          if (todayCheck) {
            backgroundColor = 'bg-green-50';
            borderColor = 'border-green-200 border-2';
          } else if (isSelected) {
            backgroundColor = 'bg-blue-50';
            borderColor = 'border-blue-200 border-2';
          } else if (dayTasks.length > 0 && dayInfo.isCurrentMonth) {
            backgroundColor = 'bg-gray-50';
          } else if (!dayInfo.isCurrentMonth) {
            backgroundColor = 'bg-gray-25';
          }

          return (
            <div
              key={index}
              className={`h-12 md:h-14 p-0.5 md:p-1 ${borderColor} rounded-lg cursor-pointer transition-colors flex flex-col items-center overflow-hidden ${backgroundColor} ${
                !isSelected && !todayCheck ? 'hover:bg-gray-50' : ''
              } ${
                !dayInfo.isCurrentMonth ? 'text-gray-400' : ''
              }`}
              onClick={() => {
                onDateClick(dateStr);
              }}
            >
              <div className={`text-xs mb-1 flex-shrink-0 w-full text-center ${todayCheck ? 'font-bold text-primary' : ''} ${
                !dayInfo.isCurrentMonth ? 'text-gray-400' : ''
              }`}>
                {dayInfo.day}
              </div>
              
              {/* 점 형태 일정 표시 */}
              {dayInfo.isCurrentMonth && singleDayTasks.length > 0 && (
                <div className="flex flex-wrap gap-0.5 justify-center items-center">
                  {singleDayTasks.slice(0, 3).map((task) => (
                    <div
                      key={`${task.id}-${dayInfo.day}`}
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: getCropCategoryColor(crops, task.cropId, task.title) }}
                      title={task.title || `${getCropName(crops, task.cropId)} - ${task.taskType}`}
                    />
                  ))}
                  {singleDayTasks.length > 3 && (
                    <span className="text-[7px] text-gray-400 leading-none">
                      +{singleDayTasks.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
