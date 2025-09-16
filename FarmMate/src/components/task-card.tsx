import { useQuery } from "@tanstack/react-query";
import { Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Task, Crop, Farm } from "@shared/types";

interface TaskCardProps {
  task: Task;
}

export default function TaskCard({ task }: TaskCardProps) {
  const { data: crops } = useQuery<Crop[]>({
    queryKey: ["/api/crops"],
  });

  const { data: farms } = useQuery<Farm[]>({
    queryKey: ["/api/farms"],
  });

  const crop = crops?.find(c => c.id === task.cropId);
  const farm = farms?.find(f => f.id === task.farmId);

  const getTaskColor = () => {
    switch (task.taskType) {
      case "파종":
        return "bg-blue-100 text-blue-800";
      case "육묘":
        return "bg-green-100 text-green-800";
      case "수확-선별":
        return "bg-orange-100 text-orange-800";
      case "저장-포장":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTaskIcon = () => {
    switch (task.taskType) {
      case "파종":
        return "🌱";
      case "육묘":
        return "🌿";
      case "수확-선별":
        return "🥬";
      case "저장-포장":
        return "📦";
      default:
        return "🚜";
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h5 className="font-medium text-gray-900 text-lg">
            {crop?.name || "알 수 없는 작물"}
          </h5>
          <p className="text-gray-600">
            작업: {task.taskType}
          </p>
        </div>
        {task.completedAt ? (
          <CheckCircle2 className="w-6 h-6 text-green-500" />
        ) : (
          <Clock className="w-6 h-6 text-gray-400" />
        )}
      </div>
    </div>
  );
}
