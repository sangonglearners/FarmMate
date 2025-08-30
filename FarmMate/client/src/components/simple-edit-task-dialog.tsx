import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { insertTaskSchema } from "@shared/schema";
import type { InsertTask, Task, Farm, Crop } from "@shared/schema";
import { z } from "zod";

const formSchema = insertTaskSchema;

const taskTypes = [
  "파종", "육묘", "정식", "물주기", "비료주기", 
  "약치기", "풀매기", "가지치기", "수확"
];

interface SimpleEditTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
}

export default function SimpleEditTaskDialog({ open, onOpenChange, task }: SimpleEditTaskDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: farms } = useQuery<Farm[]>({
    queryKey: ["/api/farms"],
  });

  const { data: crops } = useQuery<Crop[]>({
    queryKey: ["/api/crops"],
  });

  // 농장별 이랑 개수
  const getRowCount = (environment: string) => {
    switch (environment) {
      case '노지': return 40;
      case '시설1': return 20;
      case '시설2': return 10;
      default: return 0;
    }
  };

  const form = useForm<InsertTask>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      taskType: "",
      scheduledDate: "",
      farmId: "",
      cropId: "",
    },
  });

  // 태스크 데이터로 폼 초기화
  useEffect(() => {
    if (task && open) {
      form.reset({
        title: task.title,
        description: task.description,
        taskType: task.taskType,
        scheduledDate: task.scheduledDate,
        farmId: task.farmId,
        cropId: task.cropId,
      });
    }
  }, [task, open, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: InsertTask) => {
      const response = await fetch(`/api/tasks/${task?.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({
        title: "일정이 수정되었습니다.",
        description: "변경된 일정이 저장되었습니다.",
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "일정 수정에 실패했습니다.",
        description: "다시 시도해주세요.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/tasks/${task?.id}`, {
        method: "DELETE",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({
        title: "일정이 삭제되었습니다.",
        description: "선택된 일정이 삭제되었습니다.",
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "일정 삭제에 실패했습니다.",
        description: "다시 시도해주세요.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertTask) => {
    updateMutation.mutate(data);
  };

  const handleDelete = () => {
    if (confirm("정말로 이 일정을 삭제하시겠습니까?")) {
      deleteMutation.mutate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
              <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>일정 수정</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">제목</Label>
            <Input
              id="title"
              {...form.register("title")}
              placeholder="작업 제목을 입력하세요"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="taskType">작업 종류</Label>
            <Select value={form.watch("taskType")} onValueChange={(value) => form.setValue("taskType", value)}>
              <SelectTrigger>
                <SelectValue placeholder="작업 종류를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {taskTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="scheduledDate">시작 날짜</Label>
            <Input
              id="scheduledDate"
              type="date"
              {...form.register("scheduledDate")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate">종료 날짜 (선택사항)</Label>
            <Input
              id="endDate"
              type="date"
              {...form.register("endDate")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="farmId">농장</Label>
            <Select value={form.watch("farmId") || ""} onValueChange={(value) => form.setValue("farmId", value)}>
              <SelectTrigger>
                <SelectValue placeholder="농장을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {farms?.map(farm => (
                  <SelectItem key={farm.id} value={farm.id}>{farm.name} ({farm.environment})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 이랑 선택 */}
          {form.watch("farmId") && farms && (
            <div className="space-y-2">
              <Label>이랑 선택</Label>
              {(() => {
                const selectedFarm = farms.find(f => f.id === form.watch("farmId"));
                const rowCount = selectedFarm ? getRowCount(selectedFarm.environment) : 0;
                const currentRow = task?.description?.match(/이랑: (\d+)번/)?.[1];
                
                return (
                  <div className="grid grid-cols-5 gap-2">
                    {Array.from({ length: rowCount }, (_, i) => i + 1).map(row => (
                      <Button
                        key={row}
                        type="button"
                        variant={currentRow === String(row) ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          const description = form.getValues("description");
                          const newDescription = description?.replace(/이랑: \d+번/, `이랑: ${row}번`) || `이랑: ${row}번`;
                          form.setValue("description", newDescription);
                        }}
                      >
                        {row}
                      </Button>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          {/* 이랑 정보 표시 */}
          {form.watch("farmId") && farms && (
            <div className="space-y-2">
              <Label>이랑 정보</Label>
              {(() => {
                const selectedFarm = farms.find(f => f.id === form.watch("farmId"));
                const rowCount = selectedFarm ? getRowCount(selectedFarm.environment) : 0;
                return (
                  <div className="text-sm text-gray-600 p-2 bg-gray-50 rounded">
                    {selectedFarm?.environment}: 총 {rowCount}개 이랑 이용 가능
                  </div>
                );
              })()}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="cropId">작물</Label>
            <Select value={form.watch("cropId") || ""} onValueChange={(value) => form.setValue("cropId", value)}>
              <SelectTrigger>
                <SelectValue placeholder="작물을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {crops?.map(crop => (
                  <SelectItem key={crop.id} value={crop.id}>{crop.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">메모</Label>
            <Textarea
              id="description"
              {...form.register("description")}
              placeholder="추가 메모를 입력하세요"
            />
          </div>

          <div className="flex space-x-2 sticky bottom-0 bg-white pt-4 border-t">
            <Button 
              type="submit" 
              className="flex-1"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "저장 중..." : "저장"}
            </Button>
            <Button 
              type="button" 
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "삭제 중..." : "삭제"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}