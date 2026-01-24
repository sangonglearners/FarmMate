// 작업 필터링 유틸리티 함수
import type { Task } from "@shared/schema";

/**
 * 작업이 날짜 범위 내에 있는지 확인하는 함수
 * @param task 작업 객체
 * @param startDateStr 시작 날짜 (YYYY-MM-DD 형식)
 * @param endDateStr 종료 날짜 (YYYY-MM-DD 형식)
 * @returns 작업이 날짜 범위 내에 있으면 true
 */
export function isTaskInDateRange(
  task: Task,
  startDateStr: string,
  endDateStr: string
): boolean {
  const taskStartDateStr = task.scheduledDate; // YYYY-MM-DD 형식
  const taskEndDateStr = (task as any).endDate || task.scheduledDate; // endDate가 없으면 scheduledDate 사용

  // 시작일이 범위 안에 있는지 확인
  let isInRange = taskStartDateStr >= startDateStr && taskStartDateStr <= endDateStr;

  // 시작일이 범위 밖이지만 종료일이 범위 안에 있거나, 날짜 범위가 시작일~종료일과 겹치는 경우
  if (!isInRange) {
    isInRange = taskStartDateStr <= endDateStr && taskEndDateStr >= startDateStr;
  }

  return isInRange;
}

/**
 * 이번 주의 월요일과 일요일 날짜 문자열을 반환하는 함수
 * @param baseDate 기준 날짜 (기본값: 오늘)
 * @returns { mondayStr: string, sundayStr: string } 월요일과 일요일 날짜 문자열 (YYYY-MM-DD 형식)
 */
export function getCurrentWeekRange(baseDate: Date = new Date()): {
  mondayStr: string;
  sundayStr: string;
} {
  const today = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  today.setHours(0, 0, 0, 0);

  const currentDayOfWeek = today.getDay(); // 0: 일요일, 1: 월요일, ..., 6: 토요일
  const daysFromMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - daysFromMonday);
  monday.setHours(0, 0, 0, 0);

  // 일요일 계산 (월요일 + 6일)
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  // 날짜 문자열로 변환 (YYYY-MM-DD)
  const mondayStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
  const sundayStr = `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`;

  return { mondayStr, sundayStr };
}

/**
 * 작업 목록을 날짜 범위로 필터링하는 함수
 * @param tasks 작업 목록
 * @param startDateStr 시작 날짜 (YYYY-MM-DD 형식)
 * @param endDateStr 종료 날짜 (YYYY-MM-DD 형식)
 * @returns 필터링된 작업 목록
 */
export function filterTasksByDateRange(
  tasks: Task[],
  startDateStr: string,
  endDateStr: string
): Task[] {
  return tasks.filter(task => isTaskInDateRange(task, startDateStr, endDateStr));
}

/**
 * 작업 목록을 이번 주(월요일~일요일)로 필터링하는 함수
 * @param tasks 작업 목록
 * @param baseDate 기준 날짜 (기본값: 오늘)
 * @returns 필터링된 작업 목록
 */
export function filterTasksByCurrentWeek(
  tasks: Task[],
  baseDate: Date = new Date()
): Task[] {
  const { mondayStr, sundayStr } = getCurrentWeekRange(baseDate);
  return filterTasksByDateRange(tasks, mondayStr, sundayStr);
}

/**
 * 특정 날짜가 작업의 날짜 범위 내에 있는지 확인하는 함수
 * @param task 작업 객체
 * @param dateStr 확인할 날짜 (YYYY-MM-DD 형식)
 * @returns 날짜가 작업의 날짜 범위 내에 있으면 true
 */
export function isDateInTaskRange(task: Task, dateStr: string): boolean {
  // 정확한 날짜 매칭
  if (task.scheduledDate === dateStr) {
    return true;
  }

  // 날짜 범위가 있는 작업의 경우 범위 내 포함 여부 확인
  if (task.endDate && task.endDate !== task.scheduledDate) {
    const taskStartDateStr = task.scheduledDate; // YYYY-MM-DD 형식
    const taskEndDateStr = task.endDate; // YYYY-MM-DD 형식

    // 문자열 비교로 날짜 범위 확인 (YYYY-MM-DD 형식이므로 문자열 비교 가능)
    return dateStr >= taskStartDateStr && dateStr <= taskEndDateStr;
  }

  return false;
}

/**
 * 작업 목록에서 특정 날짜에 해당하는 작업들을 필터링하는 함수
 * @param tasks 작업 목록
 * @param dateStr 확인할 날짜 (YYYY-MM-DD 형식)
 * @returns 필터링된 작업 목록
 */
export function filterTasksByDate(tasks: Task[], dateStr: string): Task[] {
  return tasks.filter(task => isDateInTaskRange(task, dateStr));
}
