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
              className={`h-16 md:h-22 p-0.5 md:p-1.5 ${borderColor} rounded-lg cursor-pointer transition-colors flex flex-col overflow-hidden ${backgroundColor} ${
                !isSelected && !todayCheck ? 'hover:bg-gray-50' : ''
              } ${
                !dayInfo.isCurrentMonth ? 'text-gray-400' : ''
              }`}
              onClick={() => {
                onDateClick(dateStr);
              }}
            >
              <div className={`text-xs mb-0.5 md:mb-1 flex-shrink-0 ${todayCheck ? 'font-bold text-primary' : ''} ${
                !dayInfo.isCurrentMonth ? 'text-gray-400' : ''
              }`}>
                {dayInfo.day}
              </div>
              
              {/* 홈 캘린더: 모든 일정을 개별적으로 표시 */}
              {dayInfo.isCurrentMonth && singleDayTasks.length > 0 && (
                <div className="space-y-0.5 flex-1 min-h-0 overflow-hidden">
                  {singleDayTasks.slice(0, 2).map((task, taskIndex) => {
                    const taskColor = getTaskColor(task.taskType);
                    
                    // title 필드에서 작물명과 작업타입을 추출 (2주 플래너와 동일한 방식)
                    let displayText;
                    if (task.title && task.title.includes('_')) {
                      // 이미 작물명_작업타입 형태인 경우 그대로 사용
                      displayText = task.title;
                    } else {
                      // title이 없거나 형태가 다른 경우 작업타입만 표시
                      displayText = task.taskType || '작업';
                    }
                    
                    // 연속 일정인 경우 날짜 표시 추가
                    const isMultiDayTask = task.endDate && task.endDate !== task.scheduledDate;
                    
                    return (
                      <div
                        key={`${task.id}-${dayInfo.day}`}
                        className={`${taskColor} rounded px-0.5 md:px-1 py-0 text-[9px] md:text-[10px] leading-tight truncate cursor-pointer hover:opacity-80 transition-opacity`}
                        style={{
                          marginBottom: '2px',
                          maxHeight: '0.8rem',
                          overflow: 'hidden'
                        }}
                        title={`${displayText}${isMultiDayTask ? ` (${task.scheduledDate} ~ ${task.endDate})` : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onTaskClick) {
                            onTaskClick(task);
                          } else {
                            onDateClick(dateStr);
                          }
                        }}
                      >
                        {displayText}
                      </div>
                    );
                  })}
                  {singleDayTasks.length > 2 && (
                    <div className="text-[8px] md:text-[9px] text-gray-500 font-medium leading-tight">
                      +{singleDayTasks.length - 2}개
                    </div>
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
