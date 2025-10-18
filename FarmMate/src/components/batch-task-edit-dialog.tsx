import { useState, useEffect, useMemo } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, addDays } from "date-fns";
import { ko } from "date-fns/locale";
import { CalendarIcon, Check, ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { taskApi } from "@/shared/api/tasks";
import type { Task } from "@shared/schema";
import { useFarms } from "@/features/farm-management";
import { useCrops } from "@/features/crop-management";
import { registrationData, searchCrops } from "@/shared/data/registration";
import { z } from "zod";

const formSchema = z.object({
  cropName: z.string().min(1, "작물명을 입력해주세요"),
  farmId: z.string().min(1, "농장을 선택해주세요"),
  rowNumber: z.number().min(1, "이랑 번호를 선택해주세요"),
  startDate: z.string().min(1, "시작 날짜를 선택해주세요"),
  selectedTasks: z.array(z.string()).min(1, "최소 하나의 작업을 선택해주세요"),
  tasks: z.array(z.object({
    id: z.string().optional(),
    taskType: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    description: z.string().optional(),
  })).min(1, "최소 하나의 작업이 필요합니다"),
});

interface BatchTaskEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskGroup: Task[]; // 같은 그룹의 모든 작업들
}

interface TaskSchedule {
  taskType: string;
  startDate: string;
  endDate: string;
  description: string;
}

export default function BatchTaskEditDialog({ 
  open, 
  onOpenChange, 
  taskGroup 
}: BatchTaskEditDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: farms = [] } = useFarms();
  const { data: crops = [] } = useCrops();

  // 작물 선택 관련 state
  const [cropSearchTerm, setCropSearchTerm] = useState("");
  const [customCropName, setCustomCropName] = useState("");
  const [selectedCrop, setSelectedCrop] = useState<any>(null);
  const [cropSearchResults, setCropSearchResults] = useState<any[]>([]);
  const [showKeyCrops, setShowKeyCrops] = useState(false);
  const [isCropSelectedFromList, setIsCropSelectedFromList] = useState(false);

  // 핵심 작물 (Supabase crop 테이블)과 전체 작물 (registration 테이블) 구분
  const keyCrops = crops; // Supabase crop 테이블의 작물들
  const allCrops = registrationData; // registration 테이블의 작물들

  // 첫 번째 작업에서 기본 정보 추출
  const firstTask = taskGroup?.[0];
  const cropName = firstTask?.title?.split('_')[0] || '작물';
  const farmId = firstTask?.farmId || '';
  const startDate = firstTask?.scheduledDate || '';
  const rowNumber = firstTask?.rowNumber || 1;

  // 현재 작업들에서 작업 타입 추출
  const currentTaskTypes = useMemo(() => {
    const types = taskGroup?.map(task => task.taskType).filter(Boolean) || [];
    console.log('현재 작업 타입들:', { taskGroup, types });
    return types;
  }, [taskGroup]);

  // 작물 검색 로직
  useEffect(() => {
    if (cropSearchTerm.trim() === "" || isCropSelectedFromList) {
      setCropSearchResults([]);
      return;
    }

    const results = searchCrops(cropSearchTerm);
    setCropSearchResults(results);
  }, [cropSearchTerm, isCropSelectedFromList]);

  // 핵심 작물 선택 핸들러 (Supabase crop 테이블)
  const handleKeyCropSelect = (keyCrop: any) => {
    const displayName = keyCrop.name;
    setCropSearchTerm(displayName);
    setCustomCropName(displayName);
    setSelectedCrop(keyCrop);
    setIsCropSelectedFromList(true);
    form.setValue("cropName", displayName);
    setShowKeyCrops(false);
  };

  // 검색 작물 선택 핸들러
  const handleSearchCropSelect = (searchCrop: any) => {
    const displayName = `${searchCrop.품목} > ${searchCrop.품종}`;
    setCropSearchTerm(displayName);
    setCustomCropName(displayName);
    setSelectedCrop(null);
    setIsCropSelectedFromList(true);
    form.setValue("cropName", displayName);
    setCropSearchResults([]);
  };

  // 작물 입력 핸들러
  const handleCropInput = (value: string) => {
    setCropSearchTerm(value);
    setCustomCropName(value);
    setSelectedCrop(null);
    setIsCropSelectedFromList(false);
    form.setValue("cropName", value);
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cropName,
      farmId,
      rowNumber,
      startDate,
      selectedTasks: currentTaskTypes,
      tasks: [],
    },
  });

  // registration 데이터에서 작물 정보 찾기
  const registrationCrop = useMemo(() => {
    return registrationData.find(
      regCrop => regCrop.품목 === cropName || regCrop.품목.includes(cropName)
    );
  }, [cropName]);

  // 농작업 계산기 로직으로 일정 재계산
  const calculateTaskSchedules = (baseDate: string, selectedTasks: string[], existingSchedules?: TaskSchedule[]) => {
    if (!baseDate || selectedTasks.length === 0) return [];

    const schedules: TaskSchedule[] = [];
    const cropTotalDuration = registrationCrop?.총재배기간 || 70;
    
    selectedTasks.forEach((taskType, index) => {
      let taskDuration = 0;
      
      if (selectedTasks.length === 2 && selectedTasks.includes("파종") && selectedTasks.includes("수확")) {
        // 파종+수확만 있는 경우 (파종작물)
        if (taskType === "파종") {
          taskDuration = 1;
        } else if (taskType === "수확") {
          taskDuration = 1;
        }
      } else if (selectedTasks.length === 3 && selectedTasks.includes("파종") && selectedTasks.includes("육묘") && selectedTasks.includes("수확")) {
        // 파종+육묘+수확 모두 있는 경우 (육묘작물)
        if (taskType === "파종") {
          taskDuration = 1;
        } else if (taskType === "육묘") {
          taskDuration = cropTotalDuration - 2;
        } else if (taskType === "수확") {
          taskDuration = 1;
        }
      } else {
        taskDuration = 1;
      }
      
      if (taskDuration > 0) {
        let startDate: string;
        let endDate: string;
        
        if (taskType === "수확") {
          const harvestDate = addDays(new Date(baseDate), cropTotalDuration - 1);
          startDate = format(harvestDate, "yyyy-MM-dd");
          endDate = startDate;
        } else {
          // 이전 작업의 종료일 다음날부터 시작
          let taskStartDate: Date;
          if (index === 0) {
            taskStartDate = new Date(baseDate);
          } else {
            const prevTask = schedules[index - 1];
            taskStartDate = addDays(new Date(prevTask.endDate), 1);
          }
          
          const taskEndDate = addDays(taskStartDate, taskDuration - 1);
          startDate = format(taskStartDate, "yyyy-MM-dd");
          endDate = format(taskEndDate, "yyyy-MM-dd");
        }
        
        schedules.push({
          taskType,
          startDate,
          endDate,
          description: getTaskDescription(taskType),
        });
      }
    });

    return schedules;
  };

  const getTaskDescription = (taskType: string) => {
    const descriptions: Record<string, string> = {
      "파종": "씨앗을 뿌리는 작업",
      "육묘": "모종을 기르는 작업", 
      "수확": "수확과 선별 작업",
    };
    return descriptions[taskType] || "";
  };

  // 폼 초기화
  useEffect(() => {
    if (open && taskGroup && taskGroup.length > 0) {
      // 실제 저장된 작업의 날짜를 사용 (계산하지 않음)
      form.reset({
        cropName,
        farmId,
        rowNumber,
        startDate,
        selectedTasks: currentTaskTypes,
        tasks: taskGroup.map((task) => ({
          id: task.id,
          taskType: task.taskType || '',
          startDate: task.scheduledDate || startDate,
          endDate: task.endDate || task.scheduledDate || startDate,
          description: getTaskDescription(task.taskType || ''),
        })),
      });
    }
  }, [open, taskGroup, startDate, currentTaskTypes, form, rowNumber]);

  // 선택된 작업이 변경될 때 일정 재계산
  const handleSelectedTasksChange = (newSelectedTasks: string[]) => {
    // 농작업 순서 보장: 파종 → 육묘 → 수확
    const taskOrder = ["파종", "육묘", "수확"];
    const sortedTasks = newSelectedTasks.sort((a, b) => {
      const indexA = taskOrder.indexOf(a);
      const indexB = taskOrder.indexOf(b);
      return indexA - indexB;
    });
    
    const currentStartDate = form.getValues("startDate");
    const schedules = calculateTaskSchedules(currentStartDate, sortedTasks);
    
    form.setValue("selectedTasks", sortedTasks);
    form.setValue("tasks", schedules.map((schedule, index) => ({
      id: form.getValues("tasks")[index]?.id,
      taskType: schedule.taskType,
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      description: schedule.description,
    })));
  };

  // 시작 날짜가 변경되면 모든 작업 일정 재계산
  const handleStartDateChange = (newStartDate: string) => {
    const currentTasks = form.getValues("tasks");
    const taskTypes = currentTasks.map(t => t.taskType);
    const newSchedules = calculateTaskSchedules(newStartDate, taskTypes);
    
    form.setValue("startDate", newStartDate);
    form.setValue("tasks", newSchedules.map((schedule, index) => ({
      id: currentTasks[index]?.id,
      taskType: schedule.taskType,
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      description: schedule.description,
    })));
  };

  // 개별 작업의 종료일이 변경될 때 다음 작업들의 시작일 조정
  const handleTaskEndDateChange = (taskIndex: number, newEndDate: string) => {
    const currentTasks = [...form.getValues("tasks")];
    const originalTasks = [...currentTasks]; // 원본 작업 백업 (기간 계산용)
    
    currentTasks[taskIndex].endDate = newEndDate;
    
    // 다음 작업들의 시작일을 조정
    for (let i = taskIndex + 1; i < currentTasks.length; i++) {
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
    
    form.setValue("tasks", currentTasks);
  };

  // 작업 업데이트 mutation
  const updateTaskMutation = useMutation({
    mutationFn: async (taskData: { id: string; data: any }) => {
      return await taskApi.updateTask(taskData.id, taskData.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  // 일괄 업데이트 mutation
  const batchUpdateMutation = useMutation({
    mutationFn: async (tasksData: Array<{ id: string; data: any }>) => {
      const promises = tasksData.map(({ id, data }) => 
        taskApi.updateTask(id, data)
      );
      return await Promise.all(promises);
    },
    onSuccess: async () => {
      // 모든 tasks 쿼리를 무효화하고 즉시 재조회
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
      await queryClient.refetchQueries({ queryKey: ["tasks"] });
      
      toast({
        title: "일정이 수정되었습니다",
        description: "모든 작업의 일정이 업데이트되었습니다.",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "수정 실패",
        description: error?.message || "작업 수정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      // 기존 작업의 task_group_id와 cropId 가져오기
      const existingTaskGroupId = taskGroup?.[0]?.taskGroupId;
      const existingCropId = taskGroup?.[0]?.cropId;
      
      const updateData = data.tasks.map((task, index) => ({
        id: task.id!,
        data: {
          title: `${data.cropName}_${task.taskType}`,
          taskType: task.taskType,
          farmId: data.farmId || null, // undefined 방지
          cropId: existingCropId || null, // 기존 cropId 보존
          rowNumber: data.rowNumber,
          scheduledDate: task.startDate,
          endDate: task.endDate,
          description: `이랑: ${data.rowNumber}번 - ${task.description}`,
          taskGroupId: existingTaskGroupId, // 기존 그룹 ID 보존
        },
      }));

      console.log('일괄 수정 데이터:', updateData);
      await batchUpdateMutation.mutateAsync(updateData);
      
      // 성공 시 다이얼로그 닫기
      onOpenChange(false);
      toast({
        title: "수정 완료",
        description: "작업이 성공적으로 수정되었습니다.",
      });
    } catch (error) {
      console.error("일괄 수정 실패:", error);
      toast({
        title: "수정 실패",
        description: "작업 수정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const selectedFarm = farms.find(farm => farm.id === form.watch("farmId"));

  // taskGroup이 없거나 비어있으면 렌더링하지 않음
  if (!taskGroup || taskGroup.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>일괄등록 작업 수정</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* 작물 선택 */}
            <FormField
              control={form.control}
              name="cropName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>작물 *</FormLabel>
                  <div className="space-y-3">
                    {/* 작물 입력 필드 */}
                    <div className="relative">
                      <Input
                        placeholder="작물명을 입력하거나 아래에서 선택하세요"
                        value={cropSearchTerm}
                        onChange={(e) => handleCropInput(e.target.value)}
                      />
                      <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    </div>

                    {/* 검색 결과 */}
                    {cropSearchResults.length > 0 && (
                      <div className="border rounded-md p-2 max-h-48 overflow-y-auto">
                        <div className="text-sm font-medium text-gray-600 mb-2">검색 결과</div>
                        {cropSearchResults.map((crop, index) => (
                          <button
                            key={index}
                            type="button"
                            className="w-full text-left p-2 hover:bg-gray-100 rounded text-sm"
                            onClick={() => handleSearchCropSelect(crop)}
                          >
                            <div className="font-medium">{crop.품목}</div>
                            <div className="text-gray-500 text-xs">{crop.품종} - {crop.대분류}</div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* 내 작물 선택 */}
                    <Collapsible open={showKeyCrops} onOpenChange={setShowKeyCrops}>
                      <CollapsibleTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-between"
                        >
                          내 작물 선택
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${
                              showKeyCrops ? "rotate-180" : ""
                            }`}
                          />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        <div className="border rounded-md p-2 max-h-48 overflow-y-auto">
                          {/* 핵심 작물 섹션 (Supabase crop 테이블) */}
                          <div className="mb-4">
                            <div className="flex items-center text-sm font-medium text-gray-600 mb-2">
                              <span className="text-yellow-500 mr-1">★</span>
                              핵심 작물
                            </div>
                            {keyCrops.map((crop) => (
                              <button
                                key={crop.id}
                                type="button"
                                className="w-full text-left p-2 hover:bg-gray-100 rounded text-sm"
                                onClick={() => handleKeyCropSelect(crop)}
                              >
                                <div className="flex items-center">
                                  <span className="text-yellow-500 mr-2">★</span>
                                  <div>
                                    <div className="font-medium">{crop.name}</div>
                                    <div className="text-gray-500 text-xs">{crop.variety} - {crop.category}</div>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>

                          {/* 구분선 */}
                          <div className="border-t border-gray-200 my-3"></div>

                          {/* 전체 작물 섹션 (registration 테이블) */}
                          <div>
                            <div className="text-sm font-medium text-gray-600 mb-2">전체 작물</div>
                            {allCrops.map((crop) => (
                              <button
                                key={crop.id}
                                type="button"
                                className="w-full text-left p-2 hover:bg-gray-100 rounded text-sm"
                                onClick={() => handleSearchCropSelect(crop)}
                              >
                                <div className="font-medium">{crop.품목}</div>
                                <div className="text-gray-500 text-xs">{crop.품종} - {crop.대분류}</div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 농장 선택 */}
            <FormField
              control={form.control}
              name="farmId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>농장</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="농장을 선택해주세요" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {farms.map((farm) => (
                        <SelectItem key={farm.id} value={farm.id}>
                          {farm.name} ({farm.environment}) - {farm.rowCount}이랑
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 이랑 번호 선택 */}
            <FormField
              control={form.control}
              name="rowNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>이랑 번호</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(parseInt(value))} 
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="이랑 번호를 선택해주세요" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {selectedFarm && Array.from({ length: selectedFarm.rowCount }, (_, i) => i + 1).map((row) => (
                        <SelectItem key={row} value={row.toString()}>
                          {row}번 이랑
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 시작 날짜 */}
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>시작 날짜 (파종일)</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? (
                            format(new Date(field.value), "yyyy년 MM월 dd일", { locale: ko })
                          ) : (
                            "날짜를 선택해주세요"
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value ? new Date(field.value) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            const dateStr = format(date, "yyyy-MM-dd");
                            field.onChange(dateStr);
                            handleStartDateChange(dateStr);
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 농작업 선택 */}
            <FormField
              control={form.control}
              name="selectedTasks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>농작업 선택</FormLabel>
                  <div className="grid grid-cols-3 gap-2">
                    {["파종", "육묘", "수확"].map((taskType) => (
                      <label key={taskType} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={field.value?.includes(taskType) || false}
                          onChange={(e) => {
                            const currentTasks = field.value || [];
                            if (e.target.checked) {
                              const newTasks = [...currentTasks, taskType];
                              handleSelectedTasksChange(newTasks);
                            } else {
                              const newTasks = currentTasks.filter(t => t !== taskType);
                              handleSelectedTasksChange(newTasks);
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm">{taskType}</span>
                      </label>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 작물 정보 표시 */}
            {registrationCrop && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">작물 정보</h4>
                <div className="text-sm text-blue-700 space-y-1">
                  <div>대분류: {registrationCrop.대분류}</div>
                  <div>품종: {registrationCrop.품종}</div>
                  <div>총 재배기간: {registrationCrop.총재배기간}일</div>
                  <div>파종/육묘 구분: {registrationCrop.파종육묘구분}</div>
                </div>
              </div>
            )}

            {/* 작업 일정 목록 */}
            <div className="space-y-4">
              <Label className="text-base font-medium">작업 일정</Label>
              {form.watch("tasks").map((task, index) => (
                <div key={index} className="p-4 border rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-lg">{task.taskType}</h4>
                    <div className="text-sm text-gray-500">
                      {format(new Date(task.startDate), "MM/dd")} ~ {format(new Date(task.endDate), "MM/dd")}
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
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {format(new Date(task.startDate), "MM/dd")}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={new Date(task.startDate)}
                            onSelect={(date) => {
                              if (date) {
                                const newTasks = [...form.getValues("tasks")];
                                newTasks[index].startDate = format(date, "yyyy-MM-dd");
                                form.setValue("tasks", newTasks);
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
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {format(new Date(task.endDate), "MM/dd")}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={new Date(task.endDate)}
                            onSelect={(date) => {
                              if (date) {
                                const newEndDate = format(date, "yyyy-MM-dd");
                                handleTaskEndDateChange(index, newEndDate);
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
                    <Textarea
                      value={task.description || ""}
                      onChange={(e) => {
                        const newTasks = [...form.getValues("tasks")];
                        newTasks[index].description = e.target.value;
                        form.setValue("tasks", newTasks);
                      }}
                      className="mt-1"
                      rows={2}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* 버튼 */}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                취소
              </Button>
              <Button 
                type="submit" 
                disabled={batchUpdateMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {batchUpdateMutation.isPending ? "수정 중..." : "수정 완료"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
