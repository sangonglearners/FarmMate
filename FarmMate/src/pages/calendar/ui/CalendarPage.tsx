import FarmCalendarGrid from "@/components/farm-calendar-grid";
import { useTasks } from "@features/task-management";
import { useCrops } from "@features/crop-management";
import { Button } from "@/components/ui/button";
import type { Task, Crop } from "@shared/schema";
import { useFarms } from "@/features/farm-management/model/farm.hooks";
import { FileDown } from "lucide-react";

export default function CalendarPage() {
  const { data: tasks = [], isLoading: tasksLoading } = useTasks();
  const { data: crops = [] } = useCrops();
  const { data: farms = [] } = useFarms();

  const handleDateClick = (dateStr: string) => {
    // TODO: Open task detail modal or navigate to task detail page
  };

  const handleExportCSV = () => {
    try {
      const csv = buildTasksCsv(
        tasks as Task[],
        farms.map((f) => ({ id: f.id, name: f.name })),
      );
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const today = new Date().toISOString().split("T")[0];
      link.download = `farmmate-calendar-${today}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("CSV export failed", e);
      alert("CSV 내보내기에 실패했습니다. 잠시 후 다시 시도해주세요.");
    }
  };

  if (tasksLoading) {
    return (
      <div className="p-4">
        <div className="h-8 bg-gray-200 rounded mb-4 animate-pulse"></div>
        <div className="grid grid-cols-7 gap-4 mb-4">
          {Array.from({ length: 35 }, (_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Farm Calendar Grid */}
      <FarmCalendarGrid
        tasks={tasks}
        crops={crops}
        onDateClick={handleDateClick}
      />
    </div>
  );
}

function buildTasksCsv(tasks: Task[], farms: { id: string; name: string }[]): string {
  // CSV 컬럼: 농장, 시작일, 종료일, 이랑, 일
  const farmIdToName = new Map(farms.map((f) => [f.id, f.name] as const));
  const headers = ["농장", "시작일", "종료일", "이랑", "일"];

  const escapeCsv = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    const str = String(value);
    if (/[",\n]/.test(str)) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };

  const rows = tasks.map((t) => {
    const farmName = t.farmId ? farmIdToName.get(t.farmId) ?? "" : "";
    const cols = [
      farmName,
      t.scheduledDate,
      t.endDate ?? "",
      t.rowNumber ?? "",
      t.title,
    ];
    return cols.map(escapeCsv).join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}