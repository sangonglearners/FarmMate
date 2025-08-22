import { useState, useEffect } from "react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { Calendar, CalendarIcon, Check, Search, Calculator } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";
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
import { useToast } from "@/hooks/use-toast";
import { insertTaskSchema } from "@shared/schema";
import type { InsertTask, Task, Farm, Crop } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import WorkCalculatorDialog from "./work-calculator-dialog";
import { z } from "zod";

const formSchema = insertTaskSchema.extend({
  title: z.string().min(1, "제목을 입력해주세요"),
  environment: z.string().min(1, "재배환경을 선택해주세요"),
});

const taskTypes = [
  "파종", "육묘", "정식", "물주기", "비료주기", 
  "약치기", "풀매기", "가지치기", "수확"
];

interface AddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate?: string;
  task?: Task | null;
}

export default function AddTaskDialog({ open, onOpenChange, selectedDate, task }: AddTaskDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [registrationMode, setRegistrationMode] = useState<'batch' | 'individual'>('batch');
  const [selectedWorks, setSelectedWorks] = useState<string[]>([]);
  const [cropSearchTerm, setCropSearchTerm] = useState("");
  const [customCropName, setCustomCropName] = useState("");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [showWorkCalculator, setShowWorkCalculator] = useState(false);

  const { data: farms } = useQuery<Farm[]>({
    queryKey: ["/api/farms"],
  });

  const { data: crops } = useQuery<Crop[]>({
    queryKey: ["/api/crops"],
  });

  const form = useForm<InsertTask & { title: string; environment: string }>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      taskType: "",
      scheduledDate: selectedDate || "",
      farmId: "",
      cropId: "",
      userId: "user-1",
      environment: "",
    },
  });

  // 태스크 수정 모드인 경우 초기값 설정
  useEffect(() => {
    if (task && open) {
      const crop = crops?.find(c => c.id === task.cropId);
      const farm = farms?.find(f => f.id === task.farmId);
      
      form.reset({
        title: task.title,
        description: task.description,
        taskType: task.taskType,
        scheduledDate: task.scheduledDate,
        farmId: task.farmId,
        cropId: task.cropId,
        userId: task.userId,
        environment: farm?.environment || "",
      });
      
      setDateRange({
        from: task.scheduledDate,
        to: task.scheduledDate
      });
      
      if (crop) {
        setCropSearchTerm(crop.name);
      }
    } else if (!task && open) {
      // 새 태스크 모드
      form.reset({
        title: "",
        description: "",
        taskType: "",
        scheduledDate: selectedDate || "",
        farmId: "",
        cropId: "",
        userId: "user-1",
        environment: "",
      });
      
      const today = selectedDate || format(new Date(), "yyyy-MM-dd");
      setDateRange({ from: today, to: today });
      setCropSearchTerm("");
      setCustomCropName("");
      setSelectedWorks([]);
    }
  }, [task, open, selectedDate, crops, farms, form]);

  const createMutation = useMutation({
    mutationFn: (data: InsertTask) => 
      apiRequest("/api/tasks", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "일정이 등록되었습니다.",
        description: "새로운 작업 일정이 추가되었습니다.",
      });
      onOpenChange(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: InsertTask) => 
      apiRequest(`/api/tasks/${task?.id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "일정이 수정되었습니다.",
        description: "변경된 일정이 저장되었습니다.",
      });
      onOpenChange(false);
    },
  });

  const bulkCreateMutation = useMutation({
    mutationFn: (tasks: InsertTask[]) => 
      Promise.all(tasks.map(task => 
        apiRequest("/api/tasks", {
          method: "POST",
          body: JSON.stringify(task),
        })
      )),
    onSuccess: (_, tasks) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "일정이 등록되었습니다.",
        description: `${tasks.length}개의 작업 일정이 추가되었습니다.`,
      });
      onOpenChange(false);
    },
  });

  // 작물 검색 필터링
  const searchFilteredCrops = crops?.filter(crop =>
    crop.name.toLowerCase().includes(cropSearchTerm.toLowerCase()) ||
    crop.category.toLowerCase().includes(cropSearchTerm.toLowerCase())
  ) || [];

  const handleWorkToggle = (work: string) => {
    setSelectedWorks(prev =>
      prev.includes(work)
        ? prev.filter(w => w !== work)
        : [...prev, work]
    );
  };

  const handleCropSelect = (cropId: string) => {
    const crop = crops?.find(c => c.id === cropId);
    if (crop) {
      form.setValue("cropId", cropId);
      form.setValue("farmId", crop.farmId);
      setCropSearchTerm(crop.name);
      
      // 농장의 재배환경 설정
      const farm = farms?.find(f => f.id === crop.farmId);
      if (farm) {
        form.setValue("environment", farm.environment);
      }
    }
  };

  const handleCustomCropInput = (cropName: string) => {
    setCustomCropName(cropName);
    setCropSearchTerm(cropName);
    form.setValue("cropId", ""); // 커스텀 작물인 경우 cropId는 빈 값
  };

  // 개별 등록 - 날짜 범위 내 모든 날짜에 작업 생성
  const createIndividualTasks = () => {
    if (!dateRange.from || !dateRange.to) {
      toast({
        title: "날짜 범위를 선택해주세요",
        variant: "destructive",
      });
      return;
    }

    const startDate = new Date(dateRange.from);
    const endDate = new Date(dateRange.to);
    const tasks: InsertTask[] = [];
    
    const taskType = form.getValues("taskType");
    const cropName = customCropName || crops?.find(c => c.id === form.getValues("cropId"))?.name || "작물";
    
    // 날짜 범위 내 모든 날짜에 대해 작업 생성
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dateStr = format(date, "yyyy-MM-dd");
      tasks.push({
        title: `${cropName} ${taskType}`,
        description: form.getValues("description") || `개별 등록으로 생성된 ${taskType} 작업`,
        taskType: taskType,
        scheduledDate: dateStr,
        farmId: form.getValues("farmId"),
        cropId: form.getValues("cropId"),
        userId: "user-1",
      });
    }

    bulkCreateMutation.mutate(tasks);
  };

  // 일괄 등록 - 여러 작업을 한 날짜에 등록
  const createBatchTasks = () => {
    if (selectedWorks.length === 0) {
      toast({
        title: "작업을 선택해주세요",
        variant: "destructive",
      });
      return;
    }

    const cropName = customCropName || crops?.find(c => c.id === form.getValues("cropId"))?.name || "작물";
    const tasks = selectedWorks.map(work => ({
      title: `${cropName} ${work}`,
      description: form.getValues("description") || `일괄 등록으로 생성된 ${work} 작업`,
      taskType: work,
      scheduledDate: form.getValues("scheduledDate"),
      farmId: form.getValues("farmId"),
      cropId: form.getValues("cropId"),
      userId: "user-1",
    }));

    bulkCreateMutation.mutate(tasks);
  };

  const onSubmit = (data: InsertTask & { title: string; environment: string }) => {
    const { environment, ...taskData } = data;
    
    if (task) {
      // 수정 모드
      updateMutation.mutate(taskData);
    } else if (registrationMode === 'individual') {
      // 개별 등록 - 날짜 범위
      createIndividualTasks();
    } else if (registrationMode === 'batch') {
      // 일괄 등록 - 여러 작업
      createBatchTasks();
    } else {
      // 단일 작업
      createMutation.mutate(taskData);
    }
  };

  return (
    <>
      <Dialog open={open && !showWorkCalculator} onOpenChange={onOpenChange}>
        <DialogContent className="w-full max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle>{task ? "일정 수정하기" : "일정 추가하기"}</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* 등록 방식 선택 (새 작업인 경우만) */}
              {!task && (
                <div className="space-y-3">
                  <Label>등록 방식</Label>
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      type="button"
                      onClick={() => setRegistrationMode('batch')}
                      className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
                        registrationMode === 'batch'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      일괄등록
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegistrationMode('individual')}
                      className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
                        registrationMode === 'individual'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      일괄등록
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    {registrationMode === 'batch' 
                      ? "여러 농작업을 한 날짜에 등록합니다" 
                      : "하나의 농작업을 날짜 범위에 등록합니다"
                    }
                  </p>
                </div>
              )}

              {/* 작물 검색 및 선택 */}
              <div className="space-y-3">
                <Label>작물 *</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="작물명을 입력하세요"
                    value={cropSearchTerm}
                    onChange={(e) => {
                      setCropSearchTerm(e.target.value);
                      handleCustomCropInput(e.target.value);
                    }}
                    className="pl-10"
                  />
                </div>
                
                {cropSearchTerm && searchFilteredCrops.length > 0 && (
                  <div className="max-h-32 overflow-y-auto border rounded-md">
                    {searchFilteredCrops.map(crop => {
                      const farm = farms?.find(f => f.id === crop.farmId);
                      return (
                        <button
                          key={crop.id}
                          type="button"
                          onClick={() => handleCropSelect(crop.id)}
                          className={`w-full text-left p-2 hover:bg-gray-50 border-b last:border-b-0 ${
                            form.getValues("cropId") === crop.id ? "bg-blue-50 border-blue-200" : ""
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium">{crop.name}</span>
                              <span className="text-sm text-gray-500 ml-2">({crop.variety})</span>
                            </div>
                            <div className="text-xs text-gray-400">
                              {farm?.name} · {farm?.environment}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 재배환경 */}
              <FormField
                control={form.control}
                name="environment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>재배환경 *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="재배환경을 선택해주세요" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="노지">노지</SelectItem>
                        <SelectItem value="시설1">시설1</SelectItem>
                        <SelectItem value="시설2">시설2</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 농작업 선택 */}
              {!task && registrationMode === 'batch' ? (
                <div className="space-y-3">
                  <Label>농작업 다중 선택 *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {taskTypes.map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleWorkToggle(type)}
                        className={`p-2 text-sm border rounded transition-colors ${
                          selectedWorks.includes(type)
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {selectedWorks.includes(type) && (
                          <Check className="h-3 w-3 inline mr-1" />
                        )}
                        {type}
                      </button>
                    ))}
                  </div>
                  {selectedWorks.length > 0 && (
                    <p className="text-xs text-gray-600">
                      {selectedWorks.length}개 작업 선택됨
                    </p>
                  )}
                </div>
              ) : (
                <FormField
                  control={form.control}
                  name="taskType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>농작업 *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="작업 유형을 선택해주세요" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {taskTypes.map(type => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* 날짜 선택 */}
              {!task && registrationMode === 'individual' ? (
                <div className="space-y-3">
                  <Label>작업 기간 *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-gray-500">시작일</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !dateRange.from && "text-muted-foreground"
                            )}
                          >
                            {dateRange.from ? (
                              format(new Date(dateRange.from), "MM/dd", { locale: ko })
                            ) : (
                              <span>시작일</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={dateRange.from ? new Date(dateRange.from) : undefined}
                            onSelect={(date) => {
                              if (date) {
                                const dateStr = format(date, "yyyy-MM-dd");
                                setDateRange(prev => ({ ...prev, from: dateStr }));
                                form.setValue("scheduledDate", dateStr);
                              }
                            }}
                            disabled={(date) =>
                              date < new Date(new Date().setHours(0, 0, 0, 0))
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">종료일</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !dateRange.to && "text-muted-foreground"
                            )}
                          >
                            {dateRange.to ? (
                              format(new Date(dateRange.to), "MM/dd", { locale: ko })
                            ) : (
                              <span>종료일</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={dateRange.to ? new Date(dateRange.to) : undefined}
                            onSelect={(date) => {
                              if (date) {
                                setDateRange(prev => ({ ...prev, to: format(date, "yyyy-MM-dd") }));
                              }
                            }}
                            disabled={(date) =>
                              date < new Date(dateRange.from || new Date().toISOString().split('T')[0])
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
              ) : (
                <FormField
                  control={form.control}
                  name="scheduledDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>작업 날짜 *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(new Date(field.value), "yyyy년 MM월 dd일", { locale: ko })
                              ) : (
                                <span>날짜를 선택해주세요</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) => {
                              field.onChange(date ? format(date, "yyyy-MM-dd") : "");
                            }}
                            disabled={(date) =>
                              date < new Date(new Date().setHours(0, 0, 0, 0))
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>메모 (선택사항)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="추가 메모를 입력하세요"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                  className="flex-1"
                >
                  취소
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={
                    createMutation.isPending || 
                    updateMutation.isPending || 
                    bulkCreateMutation.isPending ||
                    (!task && registrationMode === 'batch' && selectedWorks.length === 0)
                  }
                >
                  {createMutation.isPending || updateMutation.isPending || bulkCreateMutation.isPending ? 
                    "저장 중..." : 
                    task ? "수정 완료" :
                    registrationMode === 'batch' ? `${selectedWorks.length}개 작업 등록` :
                    registrationMode === 'individual' ? "날짜 범위 등록" : "저장하기"
                  }
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Work Calculator Dialog */}
      <WorkCalculatorDialog 
        open={showWorkCalculator}
        onOpenChange={setShowWorkCalculator}
        selectedCrops={[]}
        selectedWork={form.getValues("taskType")}
        baseDate={form.getValues("scheduledDate")}
        crops={crops || []}
      />
    </>
  );
}