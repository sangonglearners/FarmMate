// Calendar widget utility functions
import type { Task, Crop } from "@shared/schema";

export interface CalendarDay {
  day: number;
  date: Date;
  dayOfWeek: number;
}

export const getTaskColor = (taskType: string) => {
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

export const getTasksForDate = (tasks: Task[], date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  
  return tasks.filter(task => {
    // 정확한 날짜 매칭 또는 날짜 범위 내 포함
    let isDateMatch = task.scheduledDate === dateStr;
    
    if (!isDateMatch && task.endDate && task.endDate !== task.scheduledDate) {
      // 날짜 범위가 있는 작업의 경우 범위 내 포함 여부 확인
      const taskStartDate = new Date(task.scheduledDate);
      const taskEndDate = new Date(task.endDate);
      const currentDate = new Date(dateStr);
      
      isDateMatch = currentDate >= taskStartDate && currentDate <= taskEndDate;
    }
    
    return isDateMatch;
  });
};

export const getCropName = (crops: Crop[], cropId: string | null | undefined) => {
  if (!cropId) return "";
  const crop = crops.find(c => c.id === cropId);
  return crop ? crop.name : "";
};

export const getCalendarDays = (currentDate: Date): CalendarDay[] => {
  // currentDate 기준으로 해당 주의 월요일을 찾기
  const baseDate = new Date(currentDate);
  
  // 이번 주의 월요일을 찾기
  const currentDayOfWeek = baseDate.getDay(); // 0: 일요일, 1: 월요일, ..., 6: 토요일
  const daysFromMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1; // 월요일까지의 일수
  
  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() - daysFromMonday);
  
  // 월요일부터 2주간 표시 (14일)
  const days: CalendarDay[] = [];
  
  for (let i = 0; i < 14; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    days.push({
      day: date.getDate(),
      date: date,
      dayOfWeek: date.getDay() // 0: 일요일, 1: 월요일, ..., 6: 토요일
    });
  }
  
  return days;
};

export const weekDays = ['월', '화', '수', '목', '금', '토', '일'];

// 연속된 일정 그룹화를 위한 타입
export interface TaskGroup {
  task: Task;
  startDate: Date;
  endDate: Date;
  startDayIndex: number;
  endDayIndex: number;
  isFirstDay: boolean;
  isLastDay: boolean;
}

// 연속된 일정을 그룹화하는 함수
export const getTaskGroups = (tasks: Task[], calendarDays: any[]): TaskGroup[] => {
  const taskGroups: TaskGroup[] = [];
  
  // endDate가 있는 작업들만 처리
  const tasksWithEndDate = tasks.filter(task => task.endDate && task.endDate !== task.scheduledDate);
  
  tasksWithEndDate.forEach(task => {
    const startDate = new Date(task.scheduledDate);
    const endDate = new Date(task.endDate!);
    
    // 연속된 일정이 아닌 경우 (시작일과 끝일이 같은 경우) 그룹화하지 않음
    if (startDate.getTime() === endDate.getTime()) {
      return;
    }
    
    let startDayIndex = -1;
    let endDayIndex = -1;
    
    calendarDays.forEach((dayInfo, index) => {
      if (dayInfo.day === null) return; // 빈 셀은 건너뛰기
      
      const dayDate = new Date(dayInfo.year, dayInfo.month - 1, dayInfo.day); // month는 0-based
      
      if (startDayIndex === -1 && dayDate >= startDate && dayDate <= endDate) {
        startDayIndex = index;
      }
      
      if (dayDate >= startDate && dayDate <= endDate) {
        endDayIndex = index;
      }
    });
    
    if (startDayIndex !== -1 && endDayIndex !== -1 && startDayIndex !== endDayIndex) {
      taskGroups.push({
        task,
        startDate,
        endDate,
        startDayIndex,
        endDayIndex,
        isFirstDay: true,
        isLastDay: true
      });
    }
  });
  
  return taskGroups;
};