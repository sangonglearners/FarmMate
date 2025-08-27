import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addDays } from "date-fns";
import { ko } from "date-fns/locale";
import { Calendar as CalendarIcon, Save, Plus, Calculator } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { BATCH_TASK_SCHEDULES, TASK_TYPES } from "@/shared/constants/crops";
import type { Crop, InsertTask } from "@shared/schema";

interface WorkCalculatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCrop: Crop | null;
  baseDate: string;
  onSave: (tasks: InsertTask[]) => void;
}

interface TaskSchedule {
  taskType: string;
  duration: number;
  startDate: string;
  endDate: string;
  description: string;
}

export default function WorkCalculatorDialog({ 
  open, 
  onOpenChange, 
  selectedCrop,
  baseDate,
  onSave
}: WorkCalculatorDialogProps) {
  const { toast } = useToast();
  
  const [totalDuration, setTotalDuration] = useState(70);
  const [taskSchedules, setTaskSchedules] = useState<TaskSchedule[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([
    "이랑준비", "파종", "고르기", "수확-선별", "저장-포장"
  ]);

  // 선택된 작업에 따라 일정 계산
  useEffect(() => {
    if (!baseDate || selectedTasks.length === 0) return;

    const schedules: TaskSchedule[] = [];
    let currentDate = new Date(baseDate);
    
    selectedTasks.forEach((taskType, index) => {
      const taskInfo = BATCH_TASK_SCHEDULES[taskType as keyof typeof BATCH_TASK_SCHEDULES];
      if (taskInfo) {
        const startDate = format(currentDate, "yyyy-MM-dd");
        const endDate = format(addDays(currentDate, taskInfo.duration - 1), "yyyy-MM-dd");
        
        schedules.push({
          taskType,
          duration: taskInfo.duration,
          startDate,
          endDate,
          description: taskInfo.description
        });
        
        // 다음 작업 시작일 계산
        currentDate = addDays(currentDate, taskInfo.duration);
      }
    });

    setTaskSchedules(schedules);
    
    // 총 소요 기간 계산
    const total = schedules.reduce((sum, schedule) => sum + schedule.duration, 0);
    setTotalDuration(total);
  }, [baseDate, selectedTasks]);

  const handleTaskToggle = (taskType: string) => {
    setSelectedTasks(prev => 
      prev.includes(taskType)
        ? prev.filter(t => t !== taskType)
        : [...prev, taskType]
    );
  };

  const handleSave = () => {
    console.log("Work calculator handleSave called");
    console.log("Selected tasks:", selectedTasks);
    console.log("Task schedules:", taskSchedules);
    
    if (selectedTasks.length === 0) {
      console.log("No tasks selected");
      toast({
        title: "작업을 선택해주세요",
        variant: "destructive",
      });
      return;
    }

    const tasks: InsertTask[] = taskSchedules.map(schedule => {
      const task = {
        title: `${selectedCrop?.name || "작물"} ${schedule.taskType}`,
        description: schedule.description,
        taskType: schedule.taskType,
        scheduledDate: schedule.startDate,
        endDate: schedule.endDate,
        farmId: selectedCrop?.farmId || "",
        cropId: selectedCrop?.id || "",
        userId: "user-1",
      };
      console.log("Created work calculator task:", task);
      return task;
    });

    console.log("Total work calculator tasks to save:", tasks.length);
    onSave(tasks);
    onOpenChange(false);
  };

  const addHarvestInterval = () => {
    if (selectedTasks.includes("수확-선별")) {
      setSelectedTasks(prev => [...prev, "수확-선별"]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            농작업 계산기
          </DialogTitle>
          <p className="text-sm text-gray-600">
            선택된 작물의 농작업 일정을 자동으로 계산합니다
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* 작물 정보 */}
          {selectedCrop && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm font-medium text-blue-900">
                선택된 작물: {selectedCrop.category} &gt; {selectedCrop.name} &gt; {selectedCrop.variety}
              </p>
            </div>
          )}

          {/* 총 소요 기간 */}
          <div className="space-y-2">
            <Label>총 소요 기간</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={totalDuration}
                onChange={(e) => setTotalDuration(Number(e.target.value))}
                className="w-20"
              />
              <span className="text-sm text-gray-600">일</span>
            </div>
          </div>

          {/* 농작업 선택 */}
          <div className="space-y-2">
            <Label>농작업 선택</Label>
            <div className="grid grid-cols-2 gap-2">
              {TASK_TYPES.map(taskType => (
                <button
                  key={taskType}
                  type="button"
                  onClick={() => handleTaskToggle(taskType)}
                  className={cn(
                    "p-2 text-sm border rounded transition-colors text-left",
                    selectedTasks.includes(taskType)
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  {taskType}
                </button>
              ))}
            </div>
          </div>

          {/* 작업 일정 */}
          <div className="space-y-3">
            <Label>작업 일정</Label>
            {taskSchedules.map((schedule, index) => (
              <Card key={index}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{schedule.taskType}</div>
                      <div className="text-xs text-gray-500">{schedule.duration} 일</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {format(new Date(schedule.startDate), "MM/dd", { locale: ko })}
                      </span>
                      <CalendarIcon className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 수확 사이 추가 */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={addHarvestInterval}
              className="text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              수확 사이를 추가
            </Button>
          </div>

          {/* 재배 종료일 */}
          {taskSchedules.length > 0 && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">재배 종료</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {format(addDays(new Date(baseDate), totalDuration), "MM/dd", { locale: ko })}
                  </span>
                  <CalendarIcon className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-4">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            취소
          </Button>
          <Button 
            className="flex-1"
            onClick={handleSave}
          >
            <Save className="w-4 h-4 mr-2" />
            저장하기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}