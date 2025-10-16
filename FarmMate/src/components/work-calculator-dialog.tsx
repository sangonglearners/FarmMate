import { useState, useEffect } from "react";
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
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { BATCH_TASK_SCHEDULES, TASK_TYPES } from "@/shared/constants/crops";
import type { Crop, InsertTask } from "../shared/types/schema";
import { registrationData } from "@/shared/data/registration";

interface WorkCalculatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCrop: Crop | null;
  customCropName?: string;
  cropSearchTerm?: string;
  baseDate: string;
  onSave: (tasks: InsertTask[]) => void;
  selectedTasks?: string[];
  selectedFarm?: any;
  selectedRowNumber?: number;
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
  customCropName,
  cropSearchTerm,
  baseDate,
  onSave,
  selectedTasks: propSelectedTasks,
  selectedFarm,
  selectedRowNumber
}: WorkCalculatorDialogProps) {
  const { toast } = useToast();
  
  // registration 데이터에서 작물의 총 재배기간(파종~수확) 가져오기
  const getDefaultDuration = () => {
    const cropName = customCropName || cropSearchTerm || selectedCrop?.name || "";
    
    if (cropName) {
      const registrationCrop = registrationData.find(
        regCrop => regCrop.품목 === cropName || regCrop.품목.includes(cropName) || cropName.includes(regCrop.품목)
      );
      
      if (registrationCrop && registrationCrop.총재배기간) {
        return registrationCrop.총재배기간;
      }
    }
    
    return 70; // 기본값
  };
  
  const [totalDuration, setTotalDuration] = useState(getDefaultDuration());
  const [taskSchedules, setTaskSchedules] = useState<TaskSchedule[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<string[]>(
    propSelectedTasks || ["파종", "육묘", "수확"]
  );

  // 작물이 변경되면 totalDuration 재설정
  useEffect(() => {
    setTotalDuration(getDefaultDuration());
  }, [customCropName, cropSearchTerm, selectedCrop]);

  // propSelectedTasks가 변경되면 selectedTasks 업데이트
  useEffect(() => {
    if (propSelectedTasks && propSelectedTasks.length > 0) {
      setSelectedTasks(propSelectedTasks);
    }
  }, [propSelectedTasks]);

  // 선택된 작업에 따라 일정 계산
  useEffect(() => {
    if (!baseDate || selectedTasks.length === 0) return;

    const schedules: TaskSchedule[] = [];
    let currentDate = new Date(baseDate);
    
    // registration 데이터에서 작물의 총 재배기간 가져오기
    const cropName = customCropName || cropSearchTerm || selectedCrop?.name || "";
    const registrationCrop = registrationData.find(
      regCrop => regCrop.품목 === cropName || regCrop.품목.includes(cropName) || cropName.includes(regCrop.품목)
    );
    
    // 총 재배기간이 있으면 이를 기반으로 작업 기간 계산
    const cropTotalDuration = registrationCrop?.총재배기간 || totalDuration;
    
    // 선택된 작업에 따라 작업 기간 계산
    selectedTasks.forEach((taskType, index) => {
      let taskDuration = 0;
      const taskInfo = BATCH_TASK_SCHEDULES[taskType as keyof typeof BATCH_TASK_SCHEDULES];
      
      if (selectedTasks.length === 2 && selectedTasks.includes("파종") && selectedTasks.includes("수확")) {
        // 파종+수확만 있는 경우 (파종작물)
        if (taskType === "파종") {
          taskDuration = Math.round(cropTotalDuration * 0.2); // 20%
        } else if (taskType === "수확") {
          taskDuration = Math.round(cropTotalDuration * 0.8); // 80%
        }
      } else if (selectedTasks.length === 3 && selectedTasks.includes("파종") && selectedTasks.includes("육묘") && selectedTasks.includes("수확")) {
        // 파종+육묘+수확 모두 있는 경우 (육묘작물)
        if (taskType === "파종") {
          taskDuration = Math.round(cropTotalDuration * 0.15); // 15%
        } else if (taskType === "육묘") {
          taskDuration = Math.round(cropTotalDuration * 0.25); // 25%
        } else if (taskType === "수확") {
          taskDuration = Math.round(cropTotalDuration * 0.6); // 60%
        }
      } else {
        // 기타 경우는 기본 비율 사용
        const defaultRatios = { "파종": 0.2, "육묘": 0.3, "수확": 0.5 };
        taskDuration = Math.round(cropTotalDuration * (defaultRatios[taskType as keyof typeof defaultRatios] || 0.2));
      }
      
      if (taskDuration > 0) {
        const startDate = format(currentDate, "yyyy-MM-dd");
        const endDate = format(addDays(currentDate, taskDuration - 1), "yyyy-MM-dd");
        
        schedules.push({
          taskType,
          duration: taskDuration,
          startDate,
          endDate,
          description: taskInfo?.description || `${taskType} 작업`
        });
        
        // 다음 작업 시작일 계산
        currentDate = addDays(currentDate, taskDuration);
      }
    });

    setTaskSchedules(schedules);
    
    // 총 소요 기간은 registration 데이터의 총 재배기간 사용
    setTotalDuration(cropTotalDuration);
  }, [baseDate, selectedTasks, customCropName, cropSearchTerm, selectedCrop]);

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

    // 작업 그룹을 위한 고유 ID 생성
    const taskGroupId = `task-group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log("Generated task group ID:", taskGroupId);

    const tasks: InsertTask[] = taskSchedules.map(schedule => {
      // 이랑 번호와 설명 설정
      const rowNumber = selectedRowNumber;
      const description = rowNumber 
        ? `이랑: ${rowNumber}번 - ${schedule.description}`
        : schedule.description;
      
      // 작물명 결정 로직 개선 (selectedCrop, customCropName, cropSearchTerm 순으로 시도)
      const cropName = selectedCrop?.name || customCropName || cropSearchTerm || "작물";
      
      console.log("농작업 계산기 작물명 결정:", {
        selectedCrop: selectedCrop?.name,
        customCropName,
        cropSearchTerm,
        최종작물명: cropName
      });
      
      // 각 작업은 해당 작업이 수행되는 날짜를 scheduledDate로 가짐
      // endDate는 작업 하나만 있을 때는 startDate와 같음
      const task = {
        title: `${cropName}_${schedule.taskType}`,
        description: description,
        taskType: schedule.taskType,
        scheduledDate: schedule.startDate, // 해당 작업의 시작 날짜
        endDate: schedule.startDate, // 개별 작업은 하루만 (파종일, 육묘일, 수확일)
        farmId: selectedFarm?.id || selectedCrop?.farmId || "",
        cropId: selectedCrop?.id || "",
        rowNumber: rowNumber || undefined,
        taskGroupId: taskGroupId, // 같은 그룹 ID 부여
        userId: "current-user", // onSave에서 실제 사용자 ID로 교체됨
      };
      console.log("Created work calculator task:", task);
      console.log("Work calculator - selectedRowNumber:", selectedRowNumber);
      console.log("Work calculator - selectedFarm:", selectedFarm);
      return task;
    });

    console.log("Total work calculator tasks to save:", tasks.length);
    console.log("All tasks have taskGroupId:", taskGroupId);
    onSave(tasks);
    onOpenChange(false);
  };

  const addHarvestInterval = () => {
    if (selectedTasks.includes("수확")) {
      setSelectedTasks(prev => [...prev, "수확"]);
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
          {(selectedCrop || customCropName || cropSearchTerm) && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm font-medium text-blue-900">
                선택된 작물: {(() => {
                  const cropName = customCropName || cropSearchTerm || selectedCrop?.name || "";
                  const registrationCrop = registrationData.find(
                    regCrop => regCrop.품목 === cropName || regCrop.품목.includes(cropName) || cropName.includes(regCrop.품목)
                  );
                  
                  if (registrationCrop) {
                    return `${registrationCrop.대분류} > ${registrationCrop.품목} (${registrationCrop.품종}) - 총 재배기간: ${registrationCrop.총재배기간}일`;
                  }
                  
                  return cropName;
                })()}
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
              수확 사이클 추가
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