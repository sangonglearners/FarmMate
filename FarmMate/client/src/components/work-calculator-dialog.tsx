import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addDays } from "date-fns";
import { ko } from "date-fns/locale";
import { Calendar as CalendarIcon, Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Crop, InsertTask } from "@shared/schema";

interface WorkCalculatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCrops: string[];
  selectedWork: string;
  baseDate: string;
  crops: Crop[];
}

interface WorkSchedule {
  cropId: string;
  cropName: string;
  recommendedDate: string;
  selectedDate: string;
}

// 농작업별 권장 간격 (일)
const WORK_INTERVALS: Record<string, number> = {
  "파종-정식": 0,
  "물주기": 1,
  "비료주기": 7,
  "약치기": 14,
  "풀매기": 21,
  "가지치기": 30,
  "수확": 60,
  "토양관리": 7,
  "병해충방제": 10,
  "저장-포장": 3,
  "기타": 0,
};

export default function WorkCalculatorDialog({ 
  open, 
  onOpenChange, 
  selectedCrops, 
  selectedWork, 
  baseDate, 
  crops 
}: WorkCalculatorDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [schedules, setSchedules] = useState<WorkSchedule[]>(() => {
    const interval = WORK_INTERVALS[selectedWork] || 0;
    return selectedCrops.map((cropId, index) => {
      const crop = crops.find(c => c.id === cropId);
      const recommendedDate = format(
        addDays(new Date(baseDate), interval + index), 
        "yyyy-MM-dd"
      );
      return {
        cropId,
        cropName: crop ? `${crop.category} → ${crop.name} → ${crop.variety}` : '알 수 없는 작물',
        recommendedDate,
        selectedDate: recommendedDate,
      };
    });
  });

  const [calendarOpen, setCalendarOpen] = useState<string | null>(null);

  const updateScheduleDate = (cropId: string, newDate: string) => {
    setSchedules(prev => 
      prev.map(schedule => 
        schedule.cropId === cropId 
          ? { ...schedule, selectedDate: newDate }
          : schedule
      )
    );
  };

  const bulkCreateMutation = useMutation({
    mutationFn: async (tasks: (InsertTask & { title: string })[]) => {
      const promises = tasks.map(task => 
        apiRequest("POST", "/api/tasks", task).then(res => res.json())
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "일괄 등록 완료",
        description: `${schedules.length}개 작물의 ${selectedWork} 일정이 추가되었습니다.`,
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "등록 실패",
        description: "일정 등록 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    const tasks = schedules.map(schedule => {
      const crop = crops.find(c => c.id === schedule.cropId);
      return {
        title: `${schedule.cropName.split(' → ')[1]} ${selectedWork}`,
        description: `농작업 계산기를 통해 생성된 ${selectedWork} 일정`,
        taskType: selectedWork,
        scheduledDate: schedule.selectedDate,
        farmId: crop?.farmId || "",
        cropId: schedule.cropId,
        userId: "user-1", // 현재 사용자 ID
      };
    });
    
    bulkCreateMutation.mutate(tasks);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>농작업 계산기</DialogTitle>
          <p className="text-sm text-gray-600">
            {selectedWork} 작업의 권장 일정을 확인하고 조정하세요
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
            <p><strong>선택된 농작업:</strong> {selectedWork}</p>
            <p><strong>기준 날짜:</strong> {format(new Date(baseDate), "yyyy년 MM월 dd일", { locale: ko })}</p>
            <p><strong>선택된 작물:</strong> {selectedCrops.length}개</p>
          </div>

          <div className="space-y-3">
            {schedules.map((schedule) => (
              <Card key={schedule.cropId}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    {schedule.cropName}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      권장: {format(new Date(schedule.recommendedDate), "MM/dd", { locale: ko })}
                    </div>
                    <Popover 
                      open={calendarOpen === schedule.cropId} 
                      onOpenChange={(open) => setCalendarOpen(open ? schedule.cropId : null)}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            "h-8 text-xs font-normal",
                            schedule.selectedDate !== schedule.recommendedDate && "border-orange-500 bg-orange-50"
                          )}
                        >
                          {format(new Date(schedule.selectedDate), "MM/dd", { locale: ko })}
                          <CalendarIcon className="ml-2 h-3 w-3" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                          mode="single"
                          selected={new Date(schedule.selectedDate)}
                          onSelect={(date) => {
                            if (date) {
                              updateScheduleDate(schedule.cropId, format(date, "yyyy-MM-dd"));
                              setCalendarOpen(null);
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
                </CardContent>
              </Card>
            ))}
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
              disabled={bulkCreateMutation.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              {bulkCreateMutation.isPending ? "저장 중..." : `${schedules.length}개 일정 저장`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}