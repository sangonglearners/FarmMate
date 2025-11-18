import type { Task, Crop } from "@shared/schema";
import { 
  getTaskColor, 
  getTasksForDate, 
  getCropName, 
  getCalendarDays,
  weekDays,
  getTaskGroups,
  type CalendarDay,
  type TaskGroup
} from "../model/calendar.utils";

interface CalendarGridProps {
  currentDate: Date;
  tasks: Task[];
  crops: Crop[];
  onDateClick: (date: string) => void;
  selectedDate?: string;
  showTaskGroups?: boolean; // 연속된 일정 박스 표시 여부 (기본값: false)
}

export default function CalendarGrid({ currentDate, tasks, crops, onDateClick, selectedDate, showTaskGroups = false }: CalendarGridProps) {
  const days = getCalendarDays(currentDate);
  const today = new Date();
  
  // 연속된 일정 그룹화 (14일 주간 뷰용) - showTaskGroups가 true일 때만 계산
  const calendarDaysData = showTaskGroups ? days.map((dayInfo, index) => ({
    day: dayInfo.day,
    isCurrentMonth: dayInfo.date.getMonth() === currentDate.getMonth(),
    month: dayInfo.date.getMonth(),
    year: dayInfo.date.getFullYear()
  })) : [];
  const taskGroups = showTaskGroups ? getTaskGroups(tasks, calendarDaysData) : [];

  return (
    <div className="relative">
      {/* 연속된 일정 박스들 렌더링 - showTaskGroups가 true일 때만 표시 */}
      {showTaskGroups && taskGroups.map((taskGroup, groupIndex) => {
        if (!taskGroup.task.endDate || taskGroup.startDayIndex === taskGroup.endDayIndex) {
          // 단일 날짜 일정은 기존 방식으로 렌더링하지 않음 (아래에서 처리)
          return null;
        }
        
        const cropName = getCropName(crops, taskGroup.task.cropId);
        const taskColor = getTaskColor(taskGroup.task.taskType);
        
        // 그리드 위치 계산
        const startRow = Math.floor(taskGroup.startDayIndex / 7);
        const endRow = Math.floor(taskGroup.endDayIndex / 7);
        const startCol = taskGroup.startDayIndex % 7;
        const endCol = taskGroup.endDayIndex % 7;
        
        // 박스 스타일 계산 - 시작일 가장 왼쪽, 종료일 가장 오른쪽에 맞춤
        const cellWidth = 14.2857; // 100% / 7 ≈ 14.2857%
        const left = `${startCol * cellWidth}%`; // 시작일의 가장 왼쪽에 맞춤
        const width = `${(endCol - startCol + 1) * cellWidth}%`; // 종료일의 가장 오른쪽에 맞춤
        const top = `${startRow * 104 + 40}px`; // min-h-24(96px) + gap + 헤더
        const height = `${(endRow - startRow + 1) * 104}px`;
        
        return (
          <div
            key={`task-${groupIndex}`}
            className={`absolute ${taskColor} rounded-lg text-xs font-medium overflow-hidden`}
            style={{
              left,
              width,
              top,
              height,
              zIndex: 10,
              minHeight: '24px',
              boxSizing: 'border-box',
              border: '1px solid rgba(0, 0, 0, 0.1)'
            }}
            title={`${cropName} - ${taskGroup.task.taskType}`}
          >
            <div className="truncate px-1 py-1">
              {cropName && `${cropName} - `}{taskGroup.task.taskType}
            </div>
          </div>
        );
      })}
      
      {/* 캘린더 그리드 */}
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
          
          // 홈화면에서는 모든 일정을 개별적으로 표시
          const singleDayTasks = dayTasks;
          
          // 오늘 날짜인지 확인
          const todayCheck = 
            today.getDate() === date.getDate() &&
            today.getMonth() === date.getMonth() &&
            today.getFullYear() === date.getFullYear();
            
          const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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
          } else if (dayTasks.length > 0) {
            backgroundColor = 'bg-gray-50';
          }

          return (
            <div
              key={index}
              className={`min-h-24 p-1 ${borderColor} rounded-lg cursor-pointer transition-colors ${
                !isSelected && !todayCheck ? 'hover:bg-gray-50' : ''
              } ${backgroundColor}`}
              onClick={() => {
                onDateClick(dateStr);
              }}
            >
              <div className={`text-xs mb-1 ${todayCheck ? 'font-bold text-primary' : 'text-gray-900'}`}>
                {day}
              </div>
              
              {/* 단일 날짜 일정 표시 */}
              {singleDayTasks.length > 0 ? (
                <div className="space-y-0.5">
                  {singleDayTasks.slice(0, 3).map((task: Task) => (
                    <div
                      key={task.id}
                      className={`text-xs px-1 py-0.5 rounded break-words leading-tight ${getTaskColor(task.taskType)}`}
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 1,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        wordWrap: 'break-word',
                        maxHeight: '1.25rem',
                        marginBottom: '2px'
                      }}
                      title={task.title || `${getCropName(crops, task.cropId)} - ${task.taskType}`}
                    >
                      {task.title || `${getCropName(crops, task.cropId)} ${task.taskType}`}
                    </div>
                  ))}
                  {singleDayTasks.length > 3 && (
                    <div className="text-xs text-gray-500">
                      +{singleDayTasks.length - 3}개
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
