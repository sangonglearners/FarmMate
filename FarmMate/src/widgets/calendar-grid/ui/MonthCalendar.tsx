import type { Task, Crop } from "@shared/schema";
import { 
  getTaskColor, 
  getTasksForDate, 
  getCropName, 
  weekDays,
  getTaskGroups,
  type TaskGroup
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

  // 연속된 일정 그룹화
  const taskGroups = getTaskGroups(tasks, days);

  return (
    <div className="relative">
      {/* 연속된 일정 박스들 렌더링 (작물명만 표시) */}
      {taskGroups.map((taskGroup, groupIndex) => {
        if (taskGroup.startDayIndex === taskGroup.endDayIndex) {
          // 단일 날짜 일정은 기존 방식으로 렌더링하지 않음 (아래에서 처리)
          return null;
        }
        
        // taskGroupId가 있으면 작물명만 표시, 없으면 기존 방식
        const displayName = taskGroup.taskGroupId 
          ? taskGroup.cropName || getCropName(crops, taskGroup.task.cropId)
          : `${getCropName(crops, taskGroup.task.cropId)} - ${taskGroup.task.taskType}`;
        
        // 일괄등록(group_id 있음)은 개별등록과 동일한 스타일 사용
        const taskColor = taskGroup.taskGroupId 
          ? getTaskColor(taskGroup.task.taskType) // 개별등록과 동일한 색상
          : "bg-blue-100 text-blue-700 border-blue-300"; // 기존 연속 작업 색상
        
        // 그리드 위치 계산
        const startRow = Math.floor(taskGroup.startDayIndex / 7);
        const endRow = Math.floor(taskGroup.endDayIndex / 7);
        const startCol = taskGroup.startDayIndex % 7;
        const endCol = taskGroup.endDayIndex % 7;
        
        // 박스 스타일 계산 (CSS Grid 기반 정확한 계산)
        const cellWidth = 14.2857; // 100% / 7 ≈ 14.2857%
        const left = `${startCol * cellWidth}%`;
        const width = `${(endCol - startCol + 1) * cellWidth}%`;
        const top = `${startRow * 84 + 40}px`; // min-h-20(80px) + gap + 헤더
        const height = `${(endRow - startRow + 1) * 84 - 8}px`;
        
        return (
          <div
            key={`task-${groupIndex}`}
            className={`absolute ${taskColor} rounded-lg px-2 py-1 text-xs font-medium border border-opacity-50 overflow-hidden`}
            style={{
              left,
              width,
              top,
              height,
              zIndex: 10,
              minHeight: '20px'
            }}
            title={taskGroup.taskGroupId ? `${displayName} (${taskGroup.tasks.length}개 작업)` : displayName}
          >
            <div className="truncate">
              {displayName}
            </div>
          </div>
        );
      })}
      
      {/* 캘린더 그리드 */}
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
          
          // 해당 날짜에 정확히 scheduledDate가 일치하는 작업만 마커로 표시 (모든 작업 포함)
          const dateStr = `${dayInfo.year}-${String(dayInfo.month + 1).padStart(2, '0')}-${String(dayInfo.day).padStart(2, '0')}`;
          const exactDayTasks = dayTasks.filter(task => 
            task.scheduledDate === dateStr // 모든 작업을 개별 표시
          );
          
          // 오늘 날짜인지 확인
          const today = new Date();
          const todayCheck = 
            today.getDate() === dayInfo.day &&
            today.getMonth() === dayInfo.month &&
            today.getFullYear() === dayInfo.year;
            
          const isSelected = selectedDate === dateStr;

          return (
            <div
              key={index}
              className={`min-h-20 p-1 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors relative ${
                !dayInfo.isCurrentMonth ? 'text-gray-400 bg-gray-25' : ''
              } ${todayCheck ? 'bg-primary/5 border-primary' : ''} ${
                isSelected ? 'bg-blue-50 border-blue-300' : ''
              } ${dayTasks.length > 0 ? 'bg-gray-50' : ''}`}
              onClick={() => {
                onDateClick(dateStr);
              }}
              style={{ zIndex: 20 }}
            >
              <div className={`text-xs mb-1 ${todayCheck ? 'font-bold text-primary' : ''} ${
                !dayInfo.isCurrentMonth ? 'text-gray-400' : ''
              }`}>
                {dayInfo.day}
              </div>
              
              {/* 단일 날짜 일정 표시 */}
              {dayInfo.isCurrentMonth && singleDayTasks.length > 0 && (
                <div className="space-y-0.5">
                  {singleDayTasks.slice(0, 3).map((task, taskIndex) => {
                    const cropName = getCropName(crops, task.cropId);
                    const taskColor = getTaskColor(task.taskType);
                    // 파종, 육묘, 수확일은 더 진하게 표시
                    const isImportantTask = ['파종', '육묘', '수확'].includes(task.taskType);
                    const fontWeight = isImportantTask ? 'font-bold' : 'font-medium';
                    
                    return (
                      <div
                        key={taskIndex}
                        className={`${taskColor} rounded py-0.5 text-xs truncate`}
                        style={{
                          marginBottom: '2px',
                          maxHeight: '1.25rem',
                          overflow: 'hidden',
                          paddingLeft: '2px',
                          paddingRight: '4px'
                        }}
                        title={`${cropName} - ${task.taskType}`}
                      >
                        {task.title}
                      </div>
                    );
                  })}
                  {singleDayTasks.length > 3 && (
                    <div className="text-xs text-gray-500">
                      +{singleDayTasks.length - 3}개 더
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
