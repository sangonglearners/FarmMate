import { useQuery } from "@tanstack/react-query";
import { Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@shared/ui/button";
import type { Task } from "../model/types";
import type { Crop, Farm } from "@shared/types/schema";
import { getTaskColor, getTaskIcon } from "../model/utils";

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


  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h5 className="font-medium text-gray-900 text-lg">
            {task.title || (crop?.name ? `${crop.name} - ${task.taskType}` : task.taskType || "작업")}
          </h5>
          {task.title && task.taskType && (
            <p className="text-gray-600">
              작업: {task.taskType}
            </p>
          )}
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
