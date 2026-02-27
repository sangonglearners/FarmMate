// Calendar widget utility functions
import type { Task, Crop } from "@shared/schema";
import { isDateInTaskRange } from "@/shared/utils/task-filter";
import { registrationData } from "@/shared/data/registration";

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

// 작물 카테고리 문자열 → 점 색상 변환 (내부 헬퍼)
const categoryToColor = (category: string): string | null => {
  // 채소콩: 콩_완두, 콩_채두, 콩_잠두, 콩_강두, 콩_대두
  if (category.startsWith('콩_') || category === '콩') return '#3A9E3A';
  // 음식꽃 / 식용꽃
  if (category.includes('음식꽃') || category.includes('식용꽃')) return '#3B82F6';
  // 배추류
  if (category.includes('배추')) return '#16A34A';
  // 뿌리류: 뿌리쁘띠, 뿌리채소 (가지/래디쉬/비트/순무/당근 등 포함)
  if (category.includes('뿌리')) return '#EA580C';
  // 미나리과: 미나리과 채소, 미나리과 허브
  if (category.includes('미나리과')) return '#0891B2';
  // 십자화과 잎채소 (오타 '입채소'도 대응)
  if (category.includes('십자화과')) return '#7C3AED';
  // 호박: 호박(스쿼시_써머), 호박(스쿼시_윈터)
  if (category.includes('호박')) return '#D97706';
  // 토마토
  if (category.includes('토마토')) return '#DC2626';
  // 기타 통합: 페퍼(고추), 오이, 엽채류, 알리움
  if (
    category.includes('페퍼') || category.includes('고추') ||
    category.includes('오이') || category.includes('엽채류') ||
    category.includes('알리움')
  ) return '#6B7280';
  return null;
};

// registrationData에서 품목명으로 대분류를 찾아 색상 반환 (내부 헬퍼)
// title 형식: "품목 (품종)_작업타입" → 품목 추출 후 registrationData와 매칭
const colorFromCropItemName = (itemName: string): string | null => {
  if (!itemName) return null;
  // registrationData에서 품목명(품목)이 일치하는 항목 검색
  const match = registrationData.find(r => r.품목 === itemName);
  if (match) return categoryToColor(match.대분류);
  return null;
};

// 작물 카테고리별 점 색상
// 1차: cropId → crops 배열에서 직접 category 조회
// 2차: taskTitle → crops 배열에서 이름으로 조회
// 3차: taskTitle → registrationData에서 품목명으로 대분류 조회 (crops 테이블 불필요)
export const getCropCategoryColor = (
  crops: Crop[],
  cropId: string | null | undefined,
  taskTitle?: string | null
): string => {
  // 1차: cropId로 정확히 매칭
  if (cropId) {
    const crop = crops.find(c => c.id === cropId);
    if (crop) {
      const color = categoryToColor(crop.category);
      if (color) return color;
    }
  }

  // title에서 품목명 추출
  // 형식: "품목 (품종)_작업타입"  예: "채화 (홍채)_파종" → 품목 = "채화"
  // 형식: "품목_작업타입"          예: "채화_파종" → 품목 = "채화"
  let itemName: string | null = null;
  if (taskTitle) {
    // "_" 기준으로 앞부분만 추출: "채화 (홍채(Hongchae))"
    const beforeUnderscore = taskTitle.split('_')[0]?.trim() ?? '';
    // " (" 기준으로 앞부분만 추출: "채화"
    itemName = beforeUnderscore.split(' (')[0]?.trim() || beforeUnderscore;
  }

  // 2차: crops 배열에서 이름으로 매칭
  if (itemName) {
    const cropByName = crops.find(c => c.name === itemName);
    if (cropByName) {
      const color = categoryToColor(cropByName.category);
      if (color) return color;
    }
  }

  // 3차: registrationData에서 품목명으로 대분류 직접 조회
  if (itemName) {
    const color = colorFromCropItemName(itemName);
    if (color) return color;
  }

  return '#9CA3AF'; // 매핑 안 된 항목 - 회색
};

export const getTasksForDate = (tasks: Task[], date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  
  return tasks.filter(task => isDateInTaskRange(task, dateStr));
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
  tasks: Task[]; // 그룹에 속한 모든 작업들
  startDate: Date;
  endDate: Date;
  startDayIndex: number;
  endDayIndex: number;
  isFirstDay: boolean;
  isLastDay: boolean;
  taskGroupId?: string; // 작업 그룹 ID
  cropName?: string; // 작물명 (캘린더 박스에 표시)
}

// 연속된 일정을 그룹화하는 함수 (taskGroupId 기반)
export const getTaskGroups = (tasks: Task[], calendarDays: any[]): TaskGroup[] => {
  const taskGroups: TaskGroup[] = [];
  
  // taskGroupId로 작업들을 그룹화
  const groupedByTaskGroupId = new Map<string, Task[]>();
  
  tasks.forEach(task => {
    if (task.taskGroupId) {
      const existing = groupedByTaskGroupId.get(task.taskGroupId) || [];
      existing.push(task);
      groupedByTaskGroupId.set(task.taskGroupId, existing);
    }
  });
  
  // 각 taskGroupId 그룹을 처리
  groupedByTaskGroupId.forEach((groupTasks, taskGroupId) => {
    if (groupTasks.length === 0) return;
    
    // 그룹 내에서 가장 빠른 날짜와 가장 늦은 날짜 찾기 (endDate도 고려)
    // 타임존 문제 방지를 위해 날짜 문자열을 직접 파싱
    const allDates: Date[] = [];
    groupTasks.forEach(t => {
      const [year, month, day] = t.scheduledDate.split('-').map(Number);
      allDates.push(new Date(year, month - 1, day));
      if (t.endDate) {
        const [endYear, endMonth, endDay] = t.endDate.split('-').map(Number);
        allDates.push(new Date(endYear, endMonth - 1, endDay));
      }
    });
    const startDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const endDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    
    // taskGroupId가 있는 작업들은 무조건 연속 박스로 표시
    // (파종→육묘→수확 등 일괄등록된 작업들을 하나의 박스로 표시)
    
    // 단, 모든 작업이 같은 날짜에 있으면 그룹화하지 않음
    if (startDate.getTime() === endDate.getTime()) {
      return;
    }
    
    let startDayIndex = -1;
    let endDayIndex = -1;
    
    calendarDays.forEach((dayInfo, index) => {
      if (dayInfo.day === null) return; // 빈 셀은 건너뛰기
      
      const dayDate = new Date(dayInfo.year, dayInfo.month, dayInfo.day); // month는 이미 0-based
      
      if (startDayIndex === -1 && dayDate >= startDate && dayDate <= endDate) {
        startDayIndex = index;
      }
      
      if (dayDate >= startDate && dayDate <= endDate) {
        endDayIndex = index;
      }
    });
    
    if (startDayIndex !== -1 && endDayIndex !== -1) {
      // 대표 작업 (첫 번째 작업)
      const representativeTask = groupTasks[0];
      
      taskGroups.push({
        task: representativeTask,
        tasks: groupTasks,
        startDate,
        endDate,
        startDayIndex,
        endDayIndex,
        isFirstDay: true,
        isLastDay: true,
        taskGroupId: taskGroupId,
        cropName: representativeTask.title?.split('_')[0] || '작물' // "작물명_작업명"에서 작물명 추출
      });
    }
  });
  
  // taskGroupId가 없는 작업들 중 endDate가 있는 작업도 처리 (기존 방식)
  const tasksWithoutGroupId = tasks.filter(task => !task.taskGroupId && task.endDate && task.endDate !== task.scheduledDate);
  
  tasksWithoutGroupId.forEach(task => {
    // 타임존 문제 방지를 위해 날짜 문자열을 직접 파싱
    const [startYear, startMonth, startDay] = task.scheduledDate.split('-').map(Number);
    const [endYear, endMonth, endDay] = task.endDate!.split('-').map(Number);
    const startDate = new Date(startYear, startMonth - 1, startDay);
    const endDate = new Date(endYear, endMonth - 1, endDay);
    
    let startDayIndex = -1;
    let endDayIndex = -1;
    
    calendarDays.forEach((dayInfo, index) => {
      if (dayInfo.day === null) return;
      
      const dayDate = new Date(dayInfo.year, dayInfo.month, dayInfo.day); // month는 이미 0-based
      
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
        tasks: [task],
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