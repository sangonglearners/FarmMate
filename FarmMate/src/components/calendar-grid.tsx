import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Task, Crop } from "@shared/schema";
import { listTasksRange } from "@/shared/api/tasks";
import { getTaskGroups, type TaskGroup } from "@/widgets/calendar-grid/model/calendar.utils";

interface CalendarGridProps {
  currentDate: Date;
  tasks?: Task[];            // ← 선택값으로 변경(부모가 넘기면 사용, 없으면 우리가 조회)
  crops: Crop[];
  onDateClick: (date: string) => void;
}

export default function CalendarGrid({
  currentDate,
  tasks: tasksProp,
  crops,
  onDateClick,
}: CalendarGridProps) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // 달의 시작/끝(문자열 YYYY-MM-DD)
  const { startDateStr, endDateStr, daysInMonth, startingDay } = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;

    return {
      startDateStr: fmt(firstDay),
      endDateStr: fmt(lastDay),
      daysInMonth: lastDay.getDate(),
      startingDay: firstDay.getDay(), // 0:일 ~ 6:토
    };
  }, [year, month]);

  // 달 범위의 작업을 Supabase에서 직접 조회
  const { data: tasksFromQuery = [] } = useQuery({
    queryKey: ["tasks", { start: startDateStr, end: endDateStr }],
    queryFn: () => listTasksRange(startDateStr, endDateStr),
    // 부모가 tasks를 이미 내려주면 리스크 줄이기 위해 거기 걸맞게 stale 하게 둠
    enabled: !tasksProp || tasksProp.length === 0,
    staleTime: 0, // 항상 최신 데이터를 가져오도록 설정
    refetchOnWindowFocus: true, // 창 포커스 시 자동 새로고침
  });

  // 실제로 사용할 작업 배열: prop 우선, 없으면 쿼리 결과
  const tasks = (tasksProp && tasksProp.length > 0 ? tasksProp : tasksFromQuery) as Task[];

  // 달력 셀 구성
  const cells: (number | null)[] = [];
  // (월요일 시작) 앞쪽 빈칸 채우기
  for (let i = 0; i < (startingDay === 0 ? 6 : startingDay - 1); i++) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) cells.push(day);

  // 연속된 일정 그룹화를 위한 캘린더 데이터 생성
  const calendarDaysData = [];
  // 빈 셀들 추가
  for (let i = 0; i < (startingDay === 0 ? 6 : startingDay - 1); i++) {
    calendarDaysData.push({
      day: null,
      isCurrentMonth: false,
      month: month === 0 ? 11 : month - 1,
      year: month === 0 ? year - 1 : year
    });
  }
  // 현재 달의 날들 추가
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDaysData.push({
      day: day,
      isCurrentMonth: true,
      month: month,
      year: year
    });
  }
  // 나머지 빈 셀들 추가 (42개가 되도록)
  while (calendarDaysData.length < 42) {
    calendarDaysData.push({
      day: null,
      isCurrentMonth: false,
      month: month === 11 ? 0 : month + 1,
      year: month === 11 ? year + 1 : year
    });
  }

  // 연속된 일정 그룹화
  const taskGroups = getTaskGroups(tasks, calendarDaysData);

  const getTasksForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(
      2,
      "0"
    )}`;
    return tasks.filter((t) => {
      // 정확한 날짜 매칭 또는 날짜 범위 내 포함
      let isDateMatch = t.scheduledDate === dateStr;
      
      if (!isDateMatch && t.endDate && t.endDate !== t.scheduledDate) {
        // 날짜 범위가 있는 작업의 경우 범위 내 포함 여부 확인
        const taskStartDate = new Date(t.scheduledDate);
        const taskEndDate = new Date(t.endDate);
        const currentDate = new Date(dateStr);
        
        isDateMatch = currentDate >= taskStartDate && currentDate <= taskEndDate;
      }
      
      return isDateMatch;
    });
  };

  const getCropName = (cropId: string | null | undefined) => {
    if (!cropId) return "";
    const crop = crops.find((c) => c.id === cropId);
    return crop ? crop.name : "";
  };

  const getTaskColor = (taskType: string) => {
    switch (taskType) {
      case "파종":
        return "bg-blue-200 text-blue-800";
      case "육묘":
        return "bg-green-200 text-green-800";
      case "정식":
        return "bg-emerald-200 text-emerald-800";
      case "수확":
      case "수확-선별":
        return "bg-orange-200 text-orange-800";
      case "저장-포장":
        return "bg-purple-200 text-purple-800";
      case "이랑준비":
        return "bg-cyan-200 text-cyan-800";
      case "풀/병해충/수분 관리":
        return "bg-lime-200 text-lime-800";
      default:
        return "bg-gray-200 text-gray-800";
    }
  };

  const weekDays = ["월", "화", "수", "목", "금", "토", "일"];

  return (
    <div className="relative">
      {/* 연속된 일정 박스들 렌더링 - 임시 비활성화 */}
      {/* {taskGroups.map((taskGroup, groupIndex) => {
        if (!taskGroup.task.endDate || taskGroup.startDayIndex === taskGroup.endDayIndex) {
          // 단일 날짜 일정은 기존 방식으로 렌더링하지 않음 (아래에서 처리)
          return null;
        }
        
        const cropName = getCropName(taskGroup.task.cropId);
        const taskColor = getTaskColor(taskGroup.task.taskType);
        
        // 그리드 위치 계산
        const startRow = Math.floor(taskGroup.startDayIndex / 7);
        const endRow = Math.floor(taskGroup.endDayIndex / 7);
        const startCol = taskGroup.startDayIndex % 7;
        const endCol = taskGroup.endDayIndex % 7;
        
        // 박스 스타일 계산 (gap-4를 고려한 정확한 계산)
        const cellWidth = 14.2857; // 100% / 7 ≈ 14.2857%
        const cellGap = 1; // gap-4 = 1rem ≈ 1%
        const left = `${startCol * cellWidth + cellGap}%`;
        const width = `${(endCol - startCol + 1) * cellWidth - cellGap}%`;
        const top = `${startRow * 120 + 40}px`; // min-h-28(112px) + gap + 헤더
        const height = `${(endRow - startRow + 1) * 120 - 16}px`;
        
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
              minHeight: '28px'
            }}
            title={`${cropName} - ${taskGroup.task.taskType}`}
          >
            <div className="truncate">
              {cropName && `${cropName} - `}{taskGroup.task.taskType}
            </div>
          </div>
        );
      })} */}
      
      {/* 캘린더 그리드 */}
      <div className="grid grid-cols-7 gap-4">
        {/* 요일 헤더 */}
        {weekDays.map((d) => (
          <div key={d} className="text-center py-3 text-sm font-medium text-gray-600">
            {d}
          </div>
        ))}

        {/* 날짜 셀 */}
        {cells.map((day, idx) => {
          if (day === null) return <div key={`empty-${idx}`} className="min-h-24" />;

          const dayTasks = getTasksForDate(day);
          
          // 모든 일정 표시 (연속된 일정 박스 비활성화로 인해)
          const singleDayTasks = dayTasks;
          
          const isToday =
            new Date().getDate() === day &&
            new Date().getMonth() === month &&
            new Date().getFullYear() === year;

          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(
            2,
            "0"
          )}`;

          return (
            <div
              key={dateStr}
              className={`min-h-28 p-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 ${
                isToday ? "bg-primary/5 border-primary" : ""
              } ${dayTasks.length > 0 ? "bg-gray-50" : ""}`}
              onClick={() => onDateClick(dateStr)}
            >
              <div className={`text-xs mb-1 ${isToday ? "font-bold text-primary" : "text-gray-900"}`}>
                {day}
              </div>

              {/* 단일 날짜 일정 표시 */}
              <div className="space-y-1">
                {singleDayTasks.slice(0, 2).map((task) => (
                  <div
                    key={task.id}
                    className={`text-xs px-1 py-0.5 rounded break-words leading-tight ${getTaskColor(
                      (task as any).taskType
                    )}`}
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      wordWrap: 'break-word',
                      maxHeight: '2.5rem'
                    }}
                    title={task.title || `${getCropName(task.cropId)} - ${(task as any).taskType}`}
                  >
                    {task.title || `${getCropName(task.cropId)} ${(task as any).taskType}`}
                  </div>
                ))}
                {singleDayTasks.length > 2 && (
                  <div className="text-xs text-gray-500">+{singleDayTasks.length - 2}개 더</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
