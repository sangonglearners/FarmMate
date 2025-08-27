import { useState, useEffect } from "react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { CalendarIcon, Check, Search } from "lucide-react";
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
import { useToast } from "@shared/hooks/use-toast";
import { insertTaskSchema } from "../../../shared/schema";
import type { InsertTask, Task, Farm, Crop } from "../../../shared/schema";
import { apiRequest } from "@shared/api/client";
import { z } from "zod";
import { Calendar } from "@shared/ui/calendar";

const formSchema = insertTaskSchema.extend({
  title: z.string().min(1, "제목을 입력해주세요"),
  environment: z.string().min(1, "재배환경을 선택해주세요"),
  farmNumber: z.string().min(1, "농장 번호를 입력해주세요"),
});

const taskTypes = [
  "파종", "육묘", "정식", "물주기", "비료주기", 
  "약치기", "풀매기", "가지치기", "수확"
];

const environments = ["노지", "시설1", "시설2"];

interface AddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate?: string;
  task?: Task | null;
}

export default function AddTaskDialog({ open, onOpenChange, selectedDate, task }: AddTaskDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [cropSearchTerm, setCropSearchTerm] = useState("");

  const { data: farms } = useQuery<Farm[]>({
    queryKey: ["/api/farms"],
  });

  const { data: crops } = useQuery<Crop[]>({
    queryKey: ["/api/crops"],
  });

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      taskType: "",
      scheduledDate: selectedDate || "",
      farmId: "",
      cropId: "",
      environment: "",
      farmNumber: "",
    },
  });

  // 태스크 수정 모드인 경우 초기값 설정
  useEffect(() => {
    if (task && open) {
      const crop = crops?.find(c => c.id === task.cropId);
      const farm = farms?.find(f => f.id === task.farmId);
      
      form.reset({
        title: task.title,
        description: task.description || undefined,
        taskType: task.taskType,
        scheduledDate: task.scheduledDate,
        farmId: task.farmId || undefined,
        cropId: task.cropId || undefined,
        environment: farm?.environment || "",
        farmNumber: farm?.name || "",
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
        environment: "",
        farmNumber: "",
      });
      
      const today = selectedDate || format(new Date(), "yyyy-MM-dd");
      form.setValue("scheduledDate", today);
      setCropSearchTerm("");
    }
  }, [task, open, selectedDate, crops, farms, form]);

  const createMutation = useMutation({
    mutationFn: (data: any) => 
      apiRequest("POST", "/api/tasks", data),
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
    mutationFn: (data: any) => 
      apiRequest("PUT", `/api/tasks/${task?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "일정이 수정되었습니다.",
        description: "변경된 일정이 저장되었습니다.",
      });
      onOpenChange(false);
    },
  });

  // 작물 검색 필터링
  const searchFilteredCrops = crops?.filter(crop =>
    crop.name.toLowerCase().includes(cropSearchTerm.toLowerCase()) ||
    crop.category.toLowerCase().includes(cropSearchTerm.toLowerCase())
  ) || [];

  const handleCropSelect = (cropId: string) => {
    const crop = crops?.find(c => c.id === cropId);
    if (crop) {
      form.setValue("cropId", cropId);
      form.setValue("farmId", crop.farmId || "");
      setCropSearchTerm(crop.name);
      
      // 농장의 재배환경 설정
      const farm = farms?.find(f => f.id === crop.farmId);
      if (farm) {
        form.setValue("environment", farm.environment);
        form.setValue("farmNumber", farm.name);
      }
    }
  };

  const onSubmit = (data: any) => {
    const { environment, farmNumber, ...taskData } = data;
    
    if (task) {
      // 수정 모드
      updateMutation.mutate(taskData);
    } else {
      // 새 작업 생성
      createMutation.mutate(taskData);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
              <DialogContent className="w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? "일정 수정하기" : "새 작업 추가하기"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* 제목 입력 */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>제목 *</FormLabel>
                  <FormControl>
                    <Input placeholder="작업 제목을 입력해주세요" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 재배환경 선택 */}
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
                      {environments.map(env => (
                        <SelectItem key={env} value={env}>{env}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 농장 번호 */}
            <FormField
              control={form.control}
              name="farmNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>농장 번호 *</FormLabel>
                  <FormControl>
                    <Input placeholder="농장 번호를 입력해주세요" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 작물 검색 및 선택 */}
            <div className="space-y-3">
              <Label>작물 선택 *</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="작물명을 입력하세요"
                  value={cropSearchTerm}
                  onChange={(e) => setCropSearchTerm(e.target.value)}
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

            {/* 농작업 선택 */}
            <FormField
              control={form.control}
              name="taskType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>농작업 선택 *</FormLabel>
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

            {/* 날짜 선택 */}
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
                          className="w-full pl-3 text-left font-normal"
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
                          if (date) {
                            field.onChange(format(date, "yyyy-MM-dd"));
                          }
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

            <div className="flex space-x-2 sticky bottom-0 bg-white pt-4 border-t">
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
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? 
                  "저장 중..." : 
                  task ? "수정 완료" : "저장하기"
                }
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}