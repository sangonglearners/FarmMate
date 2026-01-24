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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
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
    
    // 선택된 작업에 따라 작업 기간 계산 (새로운 로직)
    selectedTasks.forEach((taskType, index) => {
      let taskDuration = 0;
      
      if (selectedTasks.length === 2 && selectedTasks.includes("파종") && selectedTasks.includes("수확")) {
        // 파종+수확만 있는 경우 (파종작물)
        if (taskType === "파종") {
          taskDuration = 1; // 파종: 1일 (10/16~10/16)
        } else if (taskType === "수확") {
          taskDuration = 1; // 수확: 1일 (파종일 + 총기간 - 1일)
        }
      } else if (selectedTasks.length === 3 && selectedTasks.includes("파종") && selectedTasks.includes("육묘") && selectedTasks.includes("수확")) {
        // 파종+육묘+수확 모두 있는 경우 (육묘작물)
        // 총 소요 기간의 중간 지점을 육묘 시작일로 설정
        const middlePoint = Math.floor(cropTotalDuration / 2);
        
        if (taskType === "파종") {
          taskDuration = 1; // 파종: 1일
        } else if (taskType === "육묘") {
          // 육묘 시작일 = 파종일 + 중간지점 - 1일
          // 육묘 종료일 = 수확일 - 1일
          // 육묘 기간 = 수확일 - 육묘시작일
          taskDuration = cropTotalDuration - middlePoint; // 육묘: 총기간 - 중간지점
        } else if (taskType === "수확") {
          taskDuration = 1; // 수확: 1일 (파종일 + 총기간 - 1일)
        }
      } else {
        // 기타 경우는 기본값 사용
        taskDuration = 1; // 기본적으로 1일
      }
      
      if (taskDuration > 0) {
        let startDate: string;
        let endDate: string;
        
        if (taskType === "수확") {
          // 수확 작업은 파종일 + 총기간 - 1일로 계산
          const harvestDate = addDays(new Date(baseDate), cropTotalDuration - 1);
          startDate = format(harvestDate, "yyyy-MM-dd");
          endDate = startDate; // 수확은 1일
        } else if (taskType === "육묘" && selectedTasks.length === 3 && selectedTasks.includes("파종") && selectedTasks.includes("육묘") && selectedTasks.includes("수확")) {
          // 육묘 작업의 경우 총 소요 기간의 중간 지점을 시작일로 설정
          const middlePoint = Math.floor(cropTotalDuration / 2);
          const seedlingStartDate = addDays(new Date(baseDate), middlePoint - 1);
          startDate = format(seedlingStartDate, "yyyy-MM-dd");
          endDate = format(addDays(seedlingStartDate, taskDuration - 1), "yyyy-MM-dd");
          
          // 육묘 작업 후에는 currentDate를 육묘 종료일 다음으로 설정
          currentDate = addDays(seedlingStartDate, taskDuration);
        } else {
          // 다른 작업들은 순차적으로 계산
          startDate = format(currentDate, "yyyy-MM-dd");
          endDate = format(addDays(currentDate, taskDuration - 1), "yyyy-MM-dd");
          
          // 다음 작업 시작일 계산 (수확 작업 제외)
          currentDate = addDays(currentDate, taskDuration);
        }
        
        schedules.push({
          taskType,
          duration: taskDuration,
          startDate,
          endDate,
          description: `${taskType} 작업`
        });
      }
    });

    setTaskSchedules(schedules);
    
    // 총 소요 기간은 registration 데이터의 총 재배기간 사용
    setTotalDuration(cropTotalDuration);
  }, [baseDate, selectedTasks, customCropName, cropSearchTerm, selectedCrop]);

  const handleTaskToggle = (taskType: string) => {
    setSelectedTasks(prev => {
      let newTasks = prev.includes(taskType)
        ? prev.filter(t => t !== taskType)
        : [...prev, taskType];
      
      // 농작업 순서 보장: 파종 → 육묘 → 수확
      const taskOrder = ["파종", "육묘", "수확"];
      return newTasks.sort((a, b) => {
        const indexA = taskOrder.indexOf(a);
        const indexB = taskOrder.indexOf(b);
        return indexA - indexB;
      });
    });
  };

  // 개별 작업의 종료일이 변경될 때 다음 작업들의 시작일 조정
  const handleTaskEndDateChange = (taskIndex: number, newEndDate: string) => {
    const currentTasks = [...taskSchedules];
    const originalTasks = [...currentTasks]; // 원본 작업 백업 (기간 계산용)
    
    currentTasks[taskIndex].endDate = newEndDate;
    
    // 다음 작업들의 시작일을 조정 (수확 작업 제외)
    for (let i = taskIndex + 1; i < currentTasks.length; i++) {
      if (currentTasks[i].taskType === "수확") {
        // 수확 작업은 총 재배기간 기준으로 계산되므로 건너뜀
        continue;
      }
      
      // 원래 작업 기간 계산 (변경 전 정보 사용)
      const originalStartDate = new Date(originalTasks[i].startDate);
      const originalEndDate = new Date(originalTasks[i].endDate);
      const taskDuration = Math.floor((originalEndDate.getTime() - originalStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      // 새로운 시작일 = 이전 작업의 종료일 + 1일
      const prevTaskEndDate = new Date(currentTasks[i - 1].endDate);
      const newStartDate = addDays(prevTaskEndDate, 1);
      currentTasks[i].startDate = format(newStartDate, "yyyy-MM-dd");
      
      // 새로운 종료일 = 새로운 시작일 + 원래 기간 - 1
      const newEndDateForTask = addDays(newStartDate, taskDuration - 1);
      currentTasks[i].endDate = format(newEndDateForTask, "yyyy-MM-dd");
    }
    
    setTaskSchedules(currentTasks);
  };

  const handleTaskStartDateChange = (taskIndex: number, newStartDate: string) => {
    const currentTasks = [...taskSchedules];
    const originalStartDate = new Date(currentTasks[taskIndex].startDate);
    const originalEndDate = new Date(currentTasks[taskIndex].endDate);
    const taskDuration = Math.floor((originalEndDate.getTime() - originalStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    currentTasks[taskIndex].startDate = newStartDate;
    currentTasks[taskIndex].endDate = format(addDays(new Date(newStartDate), taskDuration - 1), "yyyy-MM-dd");
    
    setTaskSchedules(currentTasks);
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
      
      // 수확일인 경우 재배 종료일과 동일하게 설정
      const isHarvestTask = schedule.taskType === "수확";
      const endDate = isHarvestTask ? schedule.endDate : schedule.startDate;
      
      // 각 작업은 해당 작업이 수행되는 날짜를 scheduledDate로 가짐
      const task = {
        title: `${cropName}_${schedule.taskType}`,
        description: description,
        taskType: schedule.taskType,
        scheduledDate: schedule.startDate, // 해당 작업의 시작 날짜
        endDate: endDate, // 수확일은 재배 종료일과 동일, 다른 작업은 하루만
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
          <div className="space-y-4">
            <Label className="text-base font-medium">작업 일정</Label>
            {taskSchedules.map((schedule, index) => (
              <div key={index} className="p-4 border rounded-lg bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-lg">{schedule.taskType}</h4>
                  <div className="text-sm text-gray-500">
                    {format(new Date(schedule.startDate), "MM/dd")} ~ {format(new Date(schedule.endDate), "MM/dd")}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-600">시작일</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                          onTouchStart={(e) => {
                            e.currentTarget.click();
                          }}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(new Date(schedule.startDate), "MM/dd")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start" sideOffset={5} collisionPadding={10}>
                        <Calendar
                          mode="single"
                          selected={(() => {
                            // 문자열 날짜를 로컬 타임존으로 파싱 (YYYY-MM-DD 형식)
                            const [year, month, day] = schedule.startDate.split('-').map(Number);
                            return new Date(year, month - 1, day);
                          })()}
                          onSelect={(date) => {
                            if (date) {
                              // 로컬 타임존의 날짜를 직접 포맷팅하여 타임존 문제 방지
                              const year = date.getFullYear();
                              const month = String(date.getMonth() + 1).padStart(2, '0');
                              const day = String(date.getDate()).padStart(2, '0');
                              const dateString = `${year}-${month}-${day}`;
                              handleTaskStartDateChange(index, dateString);
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div>
                    <Label className="text-sm text-gray-600">종료일</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                          onTouchStart={(e) => {
                            e.currentTarget.click();
                          }}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(new Date(schedule.endDate), "MM/dd")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start" sideOffset={5} collisionPadding={10}>
                        <Calendar
                          mode="single"
                          selected={(() => {
                            // 문자열 날짜를 로컬 타임존으로 파싱 (YYYY-MM-DD 형식)
                            const [year, month, day] = schedule.endDate.split('-').map(Number);
                            return new Date(year, month - 1, day);
                          })()}
                          onSelect={(date) => {
                            if (date) {
                              // 로컬 타임존의 날짜를 직접 포맷팅하여 타임존 문제 방지
                              const year = date.getFullYear();
                              const month = String(date.getMonth() + 1).padStart(2, '0');
                              const day = String(date.getDate()).padStart(2, '0');
                              const dateString = `${year}-${month}-${day}`;
                              handleTaskEndDateChange(index, dateString);
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                
                <div className="mt-3">
                  <Label className="text-sm text-gray-600">작업 설명</Label>
                  <div className="text-sm text-gray-700 mt-1 p-2 bg-white rounded border">
                    {schedule.description}
                  </div>
                </div>
              </div>
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

          {/* 재배 종료일 제거 - 수확 날짜가 종료 날짜가 됨 */}
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