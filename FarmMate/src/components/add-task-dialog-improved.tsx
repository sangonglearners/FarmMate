import { useState, useEffect } from "react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { CalendarIcon, Check, Search, Calculator, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@shared/ui/button";
import { Input } from "@shared/ui/input";
import { Label } from "@shared/ui/label";
import { Textarea } from "@shared/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@shared/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@shared/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@shared/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@shared/ui/collapsible";
import { useToast } from "@shared/hooks/use-toast";
import { insertTaskSchema } from "../shared/types/schema";
import type { InsertTask, Task, Farm, Crop } from "../shared/types/schema";
// ⬇ /api 호출 제거
// import { apiRequest } from "@shared/api/client";

// ⬇ Supabase 유틸 추가
import { saveTask } from "@/shared/api/saveTask";
import { supabase } from "@/shared/api/supabase";
import { mustOk } from "@/shared/api/mustOk";

import { z } from "zod";
import { Calendar } from "@shared/ui/calendar";
import WorkCalculatorDialog from "./work-calculator-dialog";

const formSchema = insertTaskSchema.extend({
  title: z.string().min(1, "제목을 입력해주세요"),
  environment: z.string().min(1, "재배환경을 선택해주세요"),
  endDate: z.string().optional(),
});

// 핵심 작물 목록
const KEY_CROPS = [
  { category: "배추", name: "미니양배추", variety: "디아라", description: "작은 크기의 양배추로 가정에서 재배하기 좋음" },
  { category: "배추", name: "미니양배추", variety: "티아라", description: "티아라 품종의 미니 양배추" },
  { category: "배추", name: "콜라비", variety: "그린", description: "줄기 부분을 먹는 배추과 채소" },
  { category: "배추", name: "콜라비", variety: "퍼플", description: "보라색 줄기의 콜라비" },
  { category: "뿌리채소", name: "당근", variety: "오렌지", description: "주황색 당근" },
  { category: "뿌리채소", name: "비트", variety: "레드", description: "붉은색 비트" },
  { category: "뿌리채소", name: "무", variety: "백무", description: "흰색 무" },
  { category: "잎채소", name: "상추", variety: "청상추", description: "녹색 상추" },
  { category: "잎채소", name: "시금치", variety: "일반", description: "영양이 풍부한 시금치" },
  { category: "과채류", name: "토마토", variety: "체리", description: "작은 체리 토마토" },
  { category: "과채류", name: "고추", variety: "청양고추", description: "매운 청양고추" },
];

// 일괄등록(여러 작업 한 날짜)
const batchTaskTypes = ["파종", "육묘", "수확"];

// 개별등록(한 작업 날짜 범위)
const individualTaskTypes = [
  "파종",
  "육묘",
  "이랑준비",
  "정식",
  "풀/병해충/수분 관리",
  "고르기",
  "수확",
  "저장-포장",
];

const environments = ["노지", "시설1", "시설2"];

interface AddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate?: string;
  task?: Task | null;
}

export default function AddTaskDialog({
  open,
  onOpenChange,
  selectedDate,
  task,
}: AddTaskDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [registrationMode, setRegistrationMode] =
    useState<"batch" | "individual">("individual");
  const [selectedWorks, setSelectedWorks] = useState<string[]>([]);
  const [cropSearchTerm, setCropSearchTerm] = useState("");
  const [customCropName, setCustomCropName] = useState("");
  const [showKeyCrops, setShowKeyCrops] = useState(false);
  const [showWorkCalculator, setShowWorkCalculator] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState<Crop | null>(null);

  const { data: farms } = useQuery<Farm[]>({
    queryKey: ["/api/farms"],
  });

  const { data: crops } = useQuery<Crop[]>({
    queryKey: ["/api/crops"],
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      taskType: "",
      scheduledDate: selectedDate || "",
      endDate: "",
      farmId: "",
      cropId: "",
      environment: "",
    },
  });

  // 제목 자동 설정
  useEffect(() => {
    const taskType = form.getValues("taskType");
    const cropName = customCropName || cropSearchTerm;
    if (cropName && taskType) {
      form.setValue("title", `${cropName}_${taskType}`);
    }
  }, [cropSearchTerm, customCropName, form]);

  // taskType 변경시 제목 갱신
  useEffect(() => {
    const taskType = form.watch("taskType");
    const cropName = customCropName || cropSearchTerm;
    if (cropName && taskType) {
      form.setValue("title", `${cropName}_${taskType}`);
    }
  }, [form.watch("taskType"), customCropName, cropSearchTerm, form]);

  // 수정 모드 초기화
  useEffect(() => {
    if (task && open) {
      const crop = crops?.find((c) => c.id === task.cropId);
      const farm = farms?.find((f) => f.id === task.farmId);

      form.reset({
        title: task.title || "",
        description: (task as any).description || "",
        taskType: (task as any).taskType || "",
        scheduledDate: (task as any).scheduledDate || "",
        endDate: (task as any).endDate || "",
        farmId: (task as any).farmId || "",
        cropId: (task as any).cropId || "",
        environment: farm?.environment || "",
      });

      if (crop) {
        setCropSearchTerm(crop.name);
        setSelectedCrop(crop);
      }
    } else if (!task && open) {
      form.reset({
        title: "",
        description: "",
        taskType: "",
        scheduledDate: selectedDate || "",
        endDate: "",
        farmId: "",
        cropId: "",
        environment: "",
      });
      setCropSearchTerm("");
      setCustomCropName("");
      setSelectedWorks([]);
      setSelectedCrop(null);
    }
  }, [task, open, selectedDate, crops, farms, form]);

  // 작물 필터
  const searchFilteredCrops =
    crops?.filter(
      (crop) =>
        crop.name.toLowerCase().includes(cropSearchTerm.toLowerCase()) ||
        crop.category.toLowerCase().includes(cropSearchTerm.toLowerCase())
    ) || [];

  const handleWorkToggle = (work: string) => {
    setSelectedWorks((prev) =>
      prev.includes(work) ? prev.filter((w) => w !== work) : [...prev, work]
    );
  };

  const handleCropSelect = (cropId: string) => {
    const crop = crops?.find((c) => c.id === cropId);
    if (!crop) return;

    form.setValue("cropId", cropId);
    form.setValue("farmId", (crop as any).farmId || "");
    setCropSearchTerm(crop.name);
    setSelectedCrop(crop);

    const farm = farms?.find((f) => f.id === (crop as any).farmId);
    if (farm) form.setValue("environment", farm.environment);
  };

  const handleKeyCropSelect = (keyCrop: (typeof KEY_CROPS)[0]) => {
    const displayName = `${keyCrop.name} > ${keyCrop.variety}`;
    setCropSearchTerm(displayName);
    setCustomCropName(displayName);
    form.setValue("cropId", ""); // 커스텀 작물
    setShowKeyCrops(false);
  };

  const handleCustomCropInput = (cropName: string) => {
    setCustomCropName(cropName);
    setCropSearchTerm(cropName);
    form.setValue("cropId", "");
  };

  /** 단건 저장 */
  const createMutation = useMutation({
    mutationFn: async (data: InsertTask) =>
      saveTask({
        title: data.title!,
        memo: (data as any).description || undefined,
        scheduledAt: (data as any).scheduledDate,
        farmId: (data as any).farmId ? Number((data as any).farmId) : undefined,
        cropId: (data as any).cropId ? Number((data as any).cropId) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });

      toast({
        title: "일정이 등록되었습니다.",
        description: "새로운 작업 일정이 추가되었습니다.",
      });
      onOpenChange(false);
    },
    onError: (e: any) => {
      toast({
        title: "작업 등록 실패",
        description: e?.message ?? "작업 등록 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  /** 수정 */
  const updateMutation = useMutation({
    mutationFn: async (data: InsertTask) => {
      const { taskApi } = await import("@shared/api/tasks");
      return await taskApi.updateTask((task as any)!.id, {
        title: data.title!,
        description: (data as any).description || "",
        taskType: (data as any).taskType || "기타",
        scheduledDate: (data as any).scheduledDate,
        endDate: (data as any).endDate || null,
        farmId: (data as any).farmId ? (data as any).farmId.toString() : "",
        cropId: (data as any).cropId ? (data as any).cropId.toString() : "",
        rowNumber: (data as any).rowNumber || null,
        completed: (data as any).completed || 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });

      toast({
        title: "일정이 수정되었습니다.",
        description: "변경된 일정이 저장되었습니다.",
      });
      onOpenChange(false);
    },
    onError: (e: any) => {
      toast({
        title: "작업 수정 실패",
        description: e?.message ?? "작업 수정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  /** 대량 저장 (일괄/개별) */
  const bulkCreateMutation = useMutation({
    mutationFn: async (tasks: InsertTask[]) => {
      const { taskApi } = await import("@shared/api/tasks");
      const results = [];
      
      for (const task of tasks) {
        const result = await taskApi.createTask({
          title: task.title!,
          description: (task as any).description || "",
          taskType: (task as any).taskType || "기타",
          scheduledDate: (task as any).scheduledDate || new Date().toISOString().split('T')[0],
          endDate: (task as any).endDate || null,
          farmId: (task as any).farmId ? (task as any).farmId.toString() : "",
          cropId: (task as any).cropId ? (task as any).cropId.toString() : "",
          rowNumber: (task as any).rowNumber || null,
          completed: 0,
        });
        results.push(result);
      }
      
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });

      toast({
        title: "일정이 등록되었습니다.",
        description: "작업 일정이 추가되었습니다.",
      });
      onOpenChange(false);
    },
    onError: (e: any) => {
      toast({
        title: "작업 등록 실패",
        description: e?.message ?? "일괄 작업 등록 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // 일괄/개별 생성
  const createBatchTasks = () => {
    const cropName =
      customCropName ||
      crops?.find((c) => c.id === form.getValues("cropId"))?.name ||
      "작물";
    const startDate = form.getValues("scheduledDate") || "";

    if (registrationMode === "batch") {
      if (selectedWorks.length === 0) {
        toast({ title: "작업을 선택해주세요", variant: "destructive" });
        return;
      }
      const tasks: InsertTask[] = selectedWorks.map((work) => ({
        title: form.getValues("title") || `${cropName} ${work}`,
        description:
          form.getValues("description") ||
          `일괄 등록으로 생성된 ${work} 작업`,
        taskType: work,
        scheduledDate: startDate,
        farmId: form.getValues("farmId") || "",
        cropId: form.getValues("cropId") || "",
      }));
      bulkCreateMutation.mutate(tasks);
    } else {
      // individual: 한 작업을 날짜 범위로
      const endDate = (form.getValues("endDate") as string) || "";
      if (!startDate || !endDate) {
        toast({
          title: "시작/종료 날짜를 모두 선택해주세요",
          variant: "destructive",
        });
        return;
      }
      const work = form.getValues("taskType") || "";
      const start = new Date(startDate);
      const end = new Date(endDate);
      const tasks: InsertTask[] = [];

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        tasks.push({
          title: form.getValues("title") || `${cropName} ${work}`,
          description:
            form.getValues("description") ||
            `개별 등록으로 생성된 ${work} 작업`,
          taskType: work,
          scheduledDate: format(d, "yyyy-MM-dd"),
          farmId: form.getValues("farmId") || "",
          cropId: form.getValues("cropId") || "",
        });
      }
      bulkCreateMutation.mutate(tasks);
    }
  };

  const handleWorkCalculatorSave = async (tasks: InsertTask[]) => {
    console.log("WorkCalculator 작업 저장:", tasks);
    
    // 각 작업을 saveTask 함수를 사용하여 사용자별로 저장
    try {
      for (const task of tasks) {
        await saveTask({
          title: task.title,
          memo: task.description,
          scheduledAt: task.scheduledDate,
          farmId: task.farmId ? Number(task.farmId) : undefined,
          cropId: task.cropId ? Number(task.cropId) : undefined,
          taskType: task.taskType,
        });
      }

      // 쿼리 무효화로 UI 업데이트
      queryClient.invalidateQueries({ queryKey: ["tasks"] });

      toast({
        title: "농작업 일정이 등록되었습니다.",
        description: `${tasks.length}개의 작업이 단계별로 추가되었습니다.`,
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error("작업 저장 중 오류:", error);
      toast({
        title: "저장 실패",
        description: "작업 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    const { environment, ...taskData } = data; // DB에 없는 폼 전용 필드 제거

    if (task) {
      updateMutation.mutate(taskData as InsertTask);
      return;
    }

    if (registrationMode === "batch" || registrationMode === "individual") {
      createBatchTasks();
      return;
    }

    // 단건
    createMutation.mutate(taskData as InsertTask);
  };

  const openWorkCalculator = () => {
    if (!selectedCrop && !customCropName) {
      toast({ title: "작물을 선택해주세요", variant: "destructive" });
      return;
    }
    setShowWorkCalculator(true);
  };

  return (
    <>
      <Dialog open={open && !showWorkCalculator} onOpenChange={onOpenChange}>
        <DialogContent className="w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{task ? "일정 수정하기" : "내 농작업 관리"}</DialogTitle>
            {!task && (
              <p className="text-sm text-gray-600">
                작물별 농작업 프로세스 한번에 등록(일괄 등록) 원하는 작업만 선별적으로 등록(개별 등록)
              </p>
            )}
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* 등록 방식 선택 */}
              {!task && (
                <div className="space-y-3">
                  <Label>등록 방식</Label>
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      type="button"
                      onClick={() => setRegistrationMode("batch")}
                      className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
                        registrationMode === "batch"
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      일괄등록
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegistrationMode("individual")}
                      className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
                        registrationMode === "individual"
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      개별등록
                    </button>
                  </div>
                </div>
              )}

              {/* 작물 선택 */}
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

                {/* 핵심 작물 */}
                <Collapsible open={showKeyCrops} onOpenChange={setShowKeyCrops}>
                  <CollapsibleTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-between"
                    >
                      핵심 작물 선택
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          showKeyCrops ? "rotate-180" : ""
                        }`}
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto border rounded-md p-2">
                      {KEY_CROPS.map((keyCrop, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleKeyCropSelect(keyCrop)}
                          className="text-left p-2 hover:bg-gray-50 rounded text-sm"
                        >
                          <div className="font-medium">
                            {keyCrop.category} {'>'} {keyCrop.name} {'>'} {keyCrop.variety}
                          </div>
                          <div className="text-xs text-gray-500">
                            {keyCrop.description}
                          </div>
                        </button>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {cropSearchTerm && searchFilteredCrops.length > 0 && (
                  <div className="max-h-32 overflow-y-auto border rounded-md">
                    {searchFilteredCrops.map((crop) => {
                      const farm = farms?.find((f) => f.id === crop.farmId);
                      return (
                        <button
                          key={crop.id}
                          type="button"
                          onClick={() => handleCropSelect(crop.id)}
                          className={`w-full text-left p-2 hover:bg-gray-50 border-b last:border-b-0 ${
                            form.getValues("cropId") === crop.id
                              ? "bg-blue-50 border-blue-200"
                              : ""
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium">{crop.name}</span>
                              <span className="text-sm text-gray-500 ml-2">
                                ({(crop as any).variety})
                              </span>
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

                {cropSearchTerm && (
                  <p className="text-xs text-gray-500">
                    선택된 작물에 따라 농작업이 자동 선택됩니다
                  </p>
                )}
              </div>

              {/* 재배환경(폼 전용) */}
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
                        {environments.map((env) => (
                          <SelectItem key={env} value={env}>
                            {env}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 농작업 선택 */}
              {!task && registrationMode === "batch" ? (
                <div className="space-y-3">
                  <Label>농작업 다중 선택 *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {batchTaskTypes.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleWorkToggle(type)}
                        className={`p-2 text-sm border rounded transition-colors ${
                          selectedWorks.includes(type)
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-gray-200 hover:border-gray-300"
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
                          {individualTaskTypes.map((type) => (
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

              {/* 제목 */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>제목 *</FormLabel>
                    <FormControl>
                      <Input placeholder="작업 제목을 입력하세요" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 시작 날짜 */}
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
                            className={`w-full pl-3 text-left font-normal ${
                              !field.value ? "text-muted-foreground" : ""
                            }`}
                          >
                            {field.value ? (
                              format(new Date(field.value), "yyyy년 MM월 dd일", {
                                locale: ko,
                              })
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

              {/* 종료 날짜(개별등록에서만) */}
              {!task && registrationMode === "individual" && (
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>종료 날짜 *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={`w-full pl-3 text-left font-normal ${
                                !field.value ? "text-muted-foreground" : ""
                              }`}
                            >
                              {field.value ? (
                                format(new Date(field.value), "yyyy년 MM월 dd일", {
                                  locale: ko,
                                })
                              ) : (
                                <span>종료 날짜를 선택해주세요</span>
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

              {/* 메모 */}
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
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex space-x-2 sticky bottom-0 bg-white pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1"
                >
                  취소
                </Button>

                {/* 일괄등록에서 계산기 */}
                {registrationMode === "batch" && !task && (
                  <Button
                    type="button"
                    onClick={openWorkCalculator}
                    className="flex-1"
                    disabled={!cropSearchTerm}
                  >
                    <Calculator className="w-4 h-4 mr-2" />
                    농작업 계산기
                  </Button>
                )}

                {/* 저장 */}
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={
                    createMutation.isPending ||
                    updateMutation.isPending ||
                    bulkCreateMutation.isPending ||
                    (!task &&
                      registrationMode === "batch" &&
                      selectedWorks.length === 0)
                  }
                >
                  {createMutation.isPending ||
                  updateMutation.isPending ||
                  bulkCreateMutation.isPending
                    ? "저장 중..."
                    : task
                    ? "수정 완료"
                    : "저장하기"}
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
        selectedCrop={selectedCrop}
        baseDate={
          form.getValues("scheduledDate") || format(new Date(), "yyyy-MM-dd")
        }
        onSave={handleWorkCalculatorSave}
        selectedTasks={selectedWorks}
      />
    </>
  );
}
