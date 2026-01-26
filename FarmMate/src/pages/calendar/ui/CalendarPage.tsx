import FarmCalendarGrid from "@/components/farm-calendar-grid";
import { useTasks } from "@features/task-management";
import { useCrops } from "@features/crop-management";
import { Button } from "@/components/ui/button";
import type { Task, Crop } from "@shared/schema";
import { useFarms } from "@/features/farm-management/model/farm.hooks";

export default function CalendarPage() {
  const { data: tasks = [], isLoading: tasksLoading } = useTasks();
  const { data: crops = [] } = useCrops();
  const { data: farms = [] } = useFarms();

  const handleDateClick = (dateStr: string) => {
    // TODO: Open task detail modal or navigate to task detail page
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