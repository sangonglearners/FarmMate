import { useState } from "react";
import { Checkbox } from "@shared/ui/checkbox";
import { Button } from "@shared/ui/button";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { getTaskIcon, getTaskColor } from "@entities/task/model/utils";
import { taskApi } from "@shared/api/tasks";
import { useQueryClient } from "@tanstack/react-query";

interface TodoItem {
  id: string;
  title: string;
  taskType: string;
  scheduledDate: string;
  completed: number; // 0: 미완료, 1: 완료
  completedAt?: string;
}

interface TodoListProps {
  tasks: TodoItem[];
  selectedDate: string;
  onTaskClick?: (task: TodoItem) => void;
}

export default function TodoList({ tasks, selectedDate, onTaskClick }: TodoListProps) {
  const queryClient = useQueryClient();
  const [completingTasks, setCompletingTasks] = useState<Set<string>>(new Set());

  const handleTaskToggle = async (task: TodoItem, event: React.MouseEvent) => {
    event.stopPropagation(); // 부모 클릭 이벤트 방지
    
    if (completingTasks.has(task.id)) return; // 이미 처리 중인 경우 무시
    
    setCompletingTasks(prev => new Set(prev).add(task.id));
    
    try {
      if (task.completed === 1) {
        await taskApi.uncompleteTask(task.id);
      } else {
        await taskApi.completeTask(task.id);
      }
      
      // 작업 목록 새로고침
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    } catch (error) {
      console.error("작업 상태 변경 실패:", error);
    } finally {
      setCompletingTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(task.id);
        return newSet;
      });
    }
  };

  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (dateStr === today.toISOString().split('T')[0]) {
      return "오늘";
    } else if (dateStr === tomorrow.toISOString().split('T')[0]) {
      return "내일";
    } else {
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }
  };

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <div
          key={task.id}
          className={`flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-all duration-200 ${
            task.completed === 1 ? 'bg-gray-50 opacity-75' : ''
          }`}
          onClick={() => onTaskClick?.(task)}
        >
          {/* 체크박스 */}
          <div 
            className="flex-shrink-0 cursor-pointer p-1 hover:bg-gray-100 rounded"
            onClick={(e) => handleTaskToggle(task, e)}
          >
            {task.completed === 1 ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : (
              <Circle className="w-5 h-5 text-gray-400 hover:text-green-500 transition-colors" />
            )}
          </div>

          {/* 작업 정보 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <div className="text-lg">{getTaskIcon(task.taskType)}</div>
              <h4 className={`font-medium text-gray-900 transition-all duration-200 ${
                task.completed === 1 ? 'line-through text-gray-500' : ''
              }`}>
                {task.title}
              </h4>
            </div>
            <div className="flex items-center space-x-2 mt-1">
              <p className={`text-sm transition-all duration-200 ${
                task.completed === 1 ? 'line-through text-gray-400' : 'text-gray-600'
              }`}>
                {formatDisplayDate(task.scheduledDate)}
              </p>
              <div className={`text-xs px-2 py-1 rounded-full transition-all duration-200 ${
                task.completed === 1 ? 'bg-gray-200 text-gray-500' : getTaskColor(task.taskType)
              }`}>
                {task.taskType}
              </div>
            </div>
          </div>

          {/* 완료 시간 표시 */}
          {task.completed === 1 && task.completedAt && (
            <div className="text-xs text-gray-400">
              {new Date(task.completedAt).toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
