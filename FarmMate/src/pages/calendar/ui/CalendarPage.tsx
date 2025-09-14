import FarmCalendarGrid from "../../../components/farm-calendar-grid";
import { useTasks } from "@features/task-management";
import { useCrops } from "@features/crop-management";

export default function CalendarPage() {
  const { data: tasks = [], isLoading: tasksLoading } = useTasks();
  const { data: crops = [] } = useCrops();

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