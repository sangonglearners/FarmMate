import { useState, useEffect } from "react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { CalendarIcon, Check, Search, Calculator, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
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
import { Calendar } from "@shared/ui/calendar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { insertTaskSchema } from "@shared/schema";
import type { InsertTask, Task, Farm, Crop } from "@shared/schema";
=======
import { insertTaskSchema } from "../shared/types/schema";
import type { InsertTask, Task, Farm, Crop } from "../shared/types/schema";

/** ⬇ Supabase 유틸 */
import { saveTask } from "@/shared/api/saveTask";
import { supabase } from "@/shared/api/supabase";
import { mustOk } from "@/shared/api/mustOk";

>>>>>>> main
import WorkCalculatorDialog from "./work-calculator-dialog";
import { KEY_CROPS, TASK_TYPES } from "@/shared/constants/crops";
import { z } from "zod";

const formSchema = insertTaskSchema.extend({
  title: z.string().optional(),
  environment: z.string().optional(),
  taskType: z.string().optional(),
});

interface AddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate?: string;
  task?: Task | null;
}

export default function AddTaskDialog({ open, onOpenChange, selectedDate, task }: AddTaskDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [registrationMode, setRegistrationMode] = useState<'batch' | 'individual'>('individual');
  const [selectedWorks, setSelectedWorks] = useState<string[]>([]);
  const [cropSearchTerm, setCropSearchTerm] = useState("");
  const [customCropName, setCustomCropName] = useState("");
  const [showKeyCrops, setShowKeyCrops] = useState(false);
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [showWorkCalculator, setShowWorkCalculator] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState<Crop | null>(null);

  const { data: farms } = useQuery<Farm[]>({ queryKey: ["/api/farms"] });
  const { data: crops } = useQuery<Crop[]>({ queryKey: ["/api/crops"] });

    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      taskType: "",
      scheduledDate: selectedDate || "",
      farmId: "",
      cropId: "",
      environment: "",
    },
  });

  // 태스크 수정 모드 초기화
  useEffect(() => {
    if (task && open) {
      const crop = crops?.find(c => c.id === task.cropId);
      const farm = farms?.find(f => f.id === task.farmId);

      form.reset({
        title: task.title,
        description: task.description || "",
        taskType: task.taskType,
        scheduledDate: task.scheduledDate,
        environment: farm?.environment || "",
      });

      setDateRange({ from: task.scheduledDate, to: task.scheduledDate });

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
        farmId: "",
        cropId: "",
        environment: "",
      });
      const today = selectedDate || format(new Date(), "yyyy-MM-dd");
      setDateRange({ from: today, to: today });
      setCropSearchTerm("");
      setCustomCropName("");
      setSelectedWorks([]);
      setSelectedCrop(null);
    }
  }, [task, open, selectedDate, crops, farms, form]);

  // 제목 자동 설정
  useEffect(() => {
    const taskType = form.getValues("taskType");
    if (cropSearchTerm && taskType) {
      form.setValue("title", `${cropSearchTerm}_${taskType}`);
    }
  }, [cropSearchTerm, form]);

  // 작물 검색 필터링
  const searchFilteredCrops =
    crops?.filter(crop =>
      crop.name.toLowerCase().includes(cropSearchTerm.toLowerCase()) ||
      crop.category.toLowerCase().includes(cropSearchTerm.toLowerCase())
    ) || [];

  const handleWorkToggle = (work: string) => {
    setSelectedWorks(prev =>
      prev.includes(work) ? prev.filter(w => w !== work) : [...prev, work]
    );
  };

  const handleCropSelect = (cropId: string) => {
    const crop = crops?.find(c => c.id === cropId);
    if (crop) {
      form.setValue("cropId", cropId);
      form.setValue("farmId", crop.farmId || "");
      setCropSearchTerm(crop.name);
      setSelectedCrop(crop);

      const farm = farms?.find(f => f.id === crop.farmId);
      if (farm) form.setValue("environment", farm.environment);
    }
  };

  const handleKeyCropSelect = (keyCrop: typeof KEY_CROPS[0]) => {
    const val = `${keyCrop.category} > ${keyCrop.name} > ${keyCrop.variety}`;
    setCropSearchTerm(val);
    setCustomCropName(val);
    form.setValue("cropId", ""); // 커스텀 작물 처리
    setShowKeyCrops(false);
  };

  const handleCustomCropInput = (cropName: string) => {
    setCustomCropName(cropName);
    setCropSearchTerm(cropName);
    form.setValue("cropId", "");
  };

  /** 단건 생성 */
  const createMutation = useMutation({
    mutationFn: async (data: InsertTask) =>
      saveTask({
        title: data.title!,
        memo: data.description || undefined,
        scheduledAt: data.scheduledDate,
        farmId: data.farmId ? Number(data.farmId) : undefined,
        cropId: data.cropId ? Number(data.cropId) : undefined,
        taskType: data.taskType || undefined,
      }),
    onSuccess: () => {
      // 모든 tasks 관련 쿼리를 무효화하여 캘린더들이 자동으로 새로고침되도록 함
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks", { start: "", end: "" }] });
      queryClient.invalidateQueries({ queryKey: ["tasks", { start: "2020-01-01", end: "2030-12-31" }] });

      toast({ title: "일정이 등록되었습니다.", description: "새로운 작업 일정이 추가되었습니다." });
      onOpenChange(false);
    },
    onError: (e: any) => {
      toast({ title: "등록 실패", description: e?.message ?? "작업 저장 중 오류가 발생했습니다.", variant: "destructive" });
    },
  });

  /** 수정 */
  const updateMutation = useMutation({
    mutationFn: async (data: InsertTask) => {
      const res = await supabase
        .from("tasks")
        .update({
          title: data.title!,
          memo: data.description || null,
          scheduled_at: data.scheduledDate || null,
          farm_id: data.farmId ? Number(data.farmId) : null,
          crop_id: data.cropId ? Number(data.cropId) : null,
          task_type: data.taskType || null,
        })
        .eq("id", (task as any)!.id)
        .select()
        .single();
      return mustOk(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });

      toast({ title: "일정이 수정되었습니다.", description: "변경된 일정이 저장되었습니다." });
      onOpenChange(false);
    },
    onError: (e: any) => {
      toast({ title: "수정 실패", description: e?.message ?? "작업 수정 중 오류가 발생했습니다.", variant: "destructive" });
    },
  });

  /** 대량 생성(개별/일괄 모두 처리) — Supabase 한 번에 insert */
  const bulkCreateMutation = useMutation({
    mutationFn: async (tasks: InsertTask[]) => {
      // owner_id 채우기(로그인/비로그인 모두 대응)
      const { data: auth } = await supabase.auth.getUser();
      const ownerId = auth?.user?.id ?? "test-user-id";

      const rows = tasks.map(t => ({
        owner_id: ownerId,
        title: t.title!,
        memo: t.description || null,
        scheduled_at: t.scheduledDate || null,
        farm_id: t.farmId ? Number(t.farmId) : null,
        crop_id: t.cropId ? Number(t.cropId) : null,
        task_type: t.taskType || null,
      }));

      const res = await supabase.from("tasks").insert(rows).select();
      return mustOk(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });

      toast({ title: "일정이 등록되었습니다.", description: "작업 일정이 추가되었습니다." });
      onOpenChange(false);
    },
    onError: (e: any) => {
      toast({ title: "등록 실패", description: e?.message ?? "작업 등록 중 오류가 발생했습니다.", variant: "destructive" });
    },
  });

  // 개별 등록 - 날짜 범위 내 모든 날짜 생성
  const createIndividualTasks = () => {
    const startDate = new Date(dateRange.from);
    const endDate = new Date(dateRange.to);
    const ttype = form.getValues("taskType");
    const cropName = customCropName || crops?.find(c => c.id === form.getValues("cropId"))?.name || "작물";

    const tasks: InsertTask[] = [];
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dateStr = format(date, "yyyy-MM-dd");
      tasks.push({
        title: form.getValues("title") || `${cropName} ${ttype}`,
        description: form.getValues("description") || `개별 등록으로 생성된 ${ttype} 작업`,
        taskType: ttype,
        scheduledDate: dateStr,
        farmId: form.getValues("farmId"),
        cropId: form.getValues("cropId"),
      });
    }
    bulkCreateMutation.mutate(tasks);
  };

  // 일괄 등록 - 여러 작업을 한 날짜에
  const createBatchTasks = () => {
    const cropName = customCropName || crops?.find(c => c.id === form.getValues("cropId"))?.name || "작물";
    const dateStr = form.getValues("scheduledDate");

    const tasks: InsertTask[] = selectedWorks.map(work => ({
      title: form.getValues("title") || `${cropName} ${work}`,
      description: form.getValues("description") || `일괄 등록으로 생성된 ${work} 작업`,
      taskType: work,
      scheduledDate: dateStr,
      farmId: form.getValues("farmId"),
      cropId: form.getValues("cropId"),
    }));

    bulkCreateMutation.mutate(tasks);
  };

  const handleWorkCalculatorSave = (tasks: InsertTask[]) => {
    bulkCreateMutation.mutate(tasks);
  };

    if (task) {
      updateMutation.mutate(taskData);
      return;
    }

    if (registrationMode === "individual") {
      if (!form.getValues("taskType")) return toast({ title: "작업 유형을 선택해주세요", variant: "destructive" });
      if (!dateRange.from || !dateRange.to) return toast({ title: "날짜 범위를 선택해주세요", variant: "destructive" });
      createIndividualTasks();
      return;
    }

    if (registrationMode === "batch") {
      if (selectedWorks.length === 0) return toast({ title: "작업을 선택해주세요", variant: "destructive" });
      if (!form.getValues("scheduledDate")) return toast({ title: "작업 날짜를 선택해주세요", variant: "destructive" });
      createBatchTasks();
      return;
    }

    // 단일 작업
    createMutation.mutate(taskData);
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
            <form
              onSubmit={form.handleSubmit(onSubmit, (errors) => { console.log("Form validation errors:", errors); })}
              className="space-y-6"
            >
              {/* 등록 방식 (신규만) */}
              {!task && (
                <div className="space-y-3">
                  <Label>등록 방식</Label>
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      type="button"
                      onClick={() => setRegistrationMode('batch')}
                      className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
                        registrationMode === 'batch' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      일괄등록
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegistrationMode('individual')}
                      className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
                        registrationMode === 'individual' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      개별등록
                    </button>
                  </div>
                </div>
              )}

              {/* 작물 검색/선택 */}
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

                {/* 핵심 작물 선택 */}
                <Collapsible open={showKeyCrops} onOpenChange={setShowKeyCrops}>
                  <CollapsibleTrigger asChild>
                    <Button type="button" variant="outline" className="w-full justify-between">
                      핵심 작물 선택
                      <ChevronDown className={cn("h-4 w-4 transition-transform", showKeyCrops && "rotate-180")} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto border rounded-md p-2">
                      {KEY_CROPS.map((keyCrop, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleKeyCropSelect(keyCrop)}
                          className="text-left p-2 hover:bg-gray-50 rounded text-sm"
                        >
                          <div className="font-medium">
                            {keyCrop.category} {'>'} {keyCrop.name} {'>'} {keyCrop.variety}
                          </div>
                          <div className="text-xs text-gray-500">{keyCrop.description}</div>
                        </button>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>

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

                {cropSearchTerm && <p className="text-xs text-gray-500">선택된 작물에 따라 농작업이 자동 선택됩니다</p>}
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
                    {TASK_TYPES.map(type => (
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
                        {selectedWorks.includes(type) && <Check className="h-3 w-3 inline mr-1" />}
                        {type}
                      </button>
                    ))}
                  </div>
                  {selectedWorks.length > 0 && (
                    <p className="text-xs text-gray-600">{selectedWorks.length}개 작업 선택됨</p>
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
                          {TASK_TYPES.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
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
                    <FormControl><Input placeholder="작업 제목을 입력하세요" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 날짜 선택 */}
              {(!task && registrationMode === 'individual') ? (
                <div className="space-y-3">
                  <Label>작업 기간 *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-gray-500">시작일</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !dateRange.from && "text-muted-foreground")}>
                            {dateRange.from ? format(new Date(dateRange.from), "MM/dd", { locale: ko }) : <span>시작일</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={dateRange.from ? new Date(dateRange.from) : undefined}
                            onSelect={(date?: Date) => {
                              if (date) {
                                const ds = format(date, "yyyy-MM-dd");
                                setDateRange(prev => ({ ...prev, from: ds }));
                                form.setValue("scheduledDate", ds);
                              }
                            }}
                            disabled={(d) => d < new Date(new Date().setHours(0,0,0,0))}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">종료일</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !dateRange.to && "text-muted-foreground")}>
                            {dateRange.to ? format(new Date(dateRange.to), "MM/dd", { locale: ko }) : <span>종료일</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={dateRange.to ? new Date(dateRange.to) : undefined}
                            }}
                            disabled={(d) => d < new Date(dateRange.from || new Date().toISOString().split('T')[0])}
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
                            <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                              {field.value ? format(new Date(field.value), "yyyy년 MM월 dd일", { locale: ko }) : <span>날짜를 선택해주세요</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex space-x-2 sticky bottom-0 bg-white pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                  취소
                </Button>
                {registrationMode === 'batch' && !task ? (
                  <Button type="button" onClick={openWorkCalculator} className="flex-1" disabled={!cropSearchTerm}>
                    <Calculator className="w-4 h-4 mr-2" /> 농작업 계산기
                  </Button>
                ) : (
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
                    {createMutation.isPending || updateMutation.isPending || bulkCreateMutation.isPending
                      ? "저장 중..."
                      : task ? "수정 완료"
                      : registrationMode === 'batch' ? `${selectedWorks.length}개 작업 등록`
                      : registrationMode === 'individual' ? "날짜 범위 등록" : "저장하기"}
                  </Button>
                )}
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
        baseDate={form.getValues("scheduledDate") || format(new Date(), "yyyy-MM-dd")}
        onSave={handleWorkCalculatorSave}
      />
    </>
  );
}
