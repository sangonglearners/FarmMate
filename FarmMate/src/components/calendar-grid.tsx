import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Task, Crop } from "../../../shared/schema";
import { listTasksRange } from "@/shared/api/tasks";

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

  const getTasksForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(
      2,
      "0"
    )}`;
    return tasks.filter((t) => t.scheduledDate === dateStr);
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

            <div className="space-y-1">
              {dayTasks.slice(0, 2).map((task) => (
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
              {dayTasks.length > 2 && (
                <div className="text-xs text-gray-500">+{dayTasks.length - 2}개 더</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
