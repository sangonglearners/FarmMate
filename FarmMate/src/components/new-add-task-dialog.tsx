import { useState, useEffect } from "react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { Calendar, CalendarIcon, Check, Search } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { insertTaskSchema } from "../shared/types/schema";
import type { InsertTask, Task, Farm, Crop } from "../shared/types/schema";
import { apiRequest } from "@shared/api";
import { z } from "zod";

const formSchema = insertTaskSchema.extend({
  environment: z.string().min(1, "재배환경을 선택해주세요"),
});

const taskTypes = [
  "파종", "육묘", "수확"
];

interface NewAddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate?: string;
}

export default function NewAddTaskDialog({ open, onOpenChange, selectedDate }: NewAddTaskDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [registrationMode, setRegistrationMode] = useState<'batch' | 'individual'>('batch');
  const [selectedWorks, setSelectedWorks] = useState<string[]>([]);
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>('');
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [selectedCrop, setSelectedCrop] = useState<string>('');
  const [customTitle, setCustomTitle] = useState('');
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [calendarFromOpen, setCalendarFromOpen] = useState(false);
  const [calendarToOpen, setCalendarToOpen] = useState(false);

  const { data: farms } = useQuery<Farm[]>({
    queryKey: ["/api/farms"],
  });

  const { data: crops } = useQuery<Crop[]>({
    queryKey: ["/api/crops"],
  });

  const { data: tasks } = useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: () => import("@shared/api/tasks").then(m => m.listTasksRange("2020-01-01", "2030-12-31")),
  });

  // 선택된 농장의 실제 이랑 개수 사용
  const selectedFarmData = farms?.find(farm => 
    farm.environment === selectedEnvironment || 
    (selectedEnvironment === '노지' && farm.name.includes('노지'))
  );
  
  const rowOptions = selectedFarmData ? Array.from({ length: selectedFarmData.rowCount }, (_, i) => i + 1) : [];

  const form = useForm<InsertTask & { environment: string }>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      taskType: "",
      scheduledDate: selectedDate || new Date().toISOString().split('T')[0],
      description: "",
      farmId: "",
      cropId: "",
      environment: "",
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: InsertTask[]) => {
      const { taskApi } = await import("@shared/api/tasks");
      for (const task of data) {
        await taskApi.createTask(task);
      }
    },
    onSuccess: () => {
      // 모든 tasks 관련 쿼리를 무효화하여 캘린더들이 자동으로 새로고침되도록 함
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks", { start: "", end: "" }] });
      queryClient.invalidateQueries({ queryKey: ["tasks", { start: "2020-01-01", end: "2030-12-31" }] });
      
      toast({
        title: "작업이 등록되었습니다",
        description: "새로운 농작업 일정이 추가되었습니다.",
      });
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      console.error('작업 등록 실패:', error);
      toast({
        title: "오류가 발생했습니다",
        description: "작업 등록에 실패했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    form.reset();
    setRegistrationMode('batch');
    setSelectedWorks([]);
    setSelectedEnvironment('');
    setSelectedRows([]);
    setSelectedCrop('');
    setCustomTitle('');
    setStartDate(undefined);
    setEndDate(undefined);
  };

  // 이미 해당 날짜와 이랑에 작업이 등록되어 있는지 확인
  const isRowOccupied = (row: number) => {
    if (!tasks || !farms || !selectedEnvironment || !startDate) return false;
    
    const targetFarm = farms.find(farm => farm.environment === selectedEnvironment);
    if (!targetFarm) return false;

    const dateStr = startDate.toISOString().split('T')[0];
    return tasks.some(task => {
      const isMatchingFarm = task.farmId === targetFarm.id;
      const isMatchingDate = task.scheduledDate === dateStr;
      const isMatchingRow = task.description?.includes(`이랑: ${row}번`);
      return isMatchingFarm && isMatchingDate && isMatchingRow;
    });
  };

  // 대표 작물 목록 (자주 사용되는 작물들)
  const popularCrops = ['배추', '무', '당근', '상추', '시금치', '고추', '토마토', '오이', '호박', '브로콜리'];
  
  // 작물 검색 필터링
  const filteredCrops = crops?.filter(crop =>
    crop.name.toLowerCase().includes(selectedCrop.toLowerCase()) ||
    crop.category.toLowerCase().includes(selectedCrop.toLowerCase())
  ) || [];

  // 기본 제목 생성
  const generateDefaultTitle = () => {
    if (selectedCrop && selectedWorks.length > 0) {
      return `${selectedCrop} ${selectedWorks.join(', ')}`;
    }
    return '';
  };

  // 작물이 없을 때 자동으로 작물 생성
  const getOrCreateCrop = async (cropName: string) => {
    if (!cropName) return null;

    // 기존 작물 찾기
    let existingCrop = crops?.find(crop => crop.name === cropName);
    
    if (!existingCrop) {
      // 새 작물 생성
      const newCropData = {
        name: cropName,
        category: "기타",
        variety: "",
        status: "재배중" as const,
      };

      try {
        const response = await fetch("/api/crops", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newCropData),
        });
        
        if (response.ok) {
          existingCrop = await response.json();
        }
      } catch (error) {
        console.error('작물 생성 실패:', error);
      }
    }

    return existingCrop;
  };

  const handleWorkToggle = (work: string) => {
    if (registrationMode === 'batch') {
      setSelectedWorks(prev => 
        prev.includes(work) 
          ? prev.filter(w => w !== work)
          : [...prev, work]
      );
    } else {
      setSelectedWorks([work]);
    }
  };

  const handleRowToggle = (row: number) => {
    setSelectedRows(prev => 
      prev.includes(row) 
        ? prev.filter(r => r !== row)
        : [...prev, row]
    );
  };

  const onSubmit = async (data: InsertTask & { environment: string }) => {
    if (!selectedEnvironment) {
      toast({
        title: "재배환경을 선택해주세요",
        variant: "destructive",
      });
      return;
    }

    if (selectedWorks.length === 0) {
      toast({
        title: "농작업을 선택해주세요",
        variant: "destructive",
      });
      return;
    }

    if (selectedRows.length === 0) {
      toast({
        title: "이랑을 선택해주세요",
        variant: "destructive",
      });
      return;
    }

    // 환경에 맞는 농장 찾기
    const targetFarm = farms?.find(farm => 
      farm.environment === selectedEnvironment || 
      (selectedEnvironment === '노지' && farm.name.includes('노지'))
    );

    if (!targetFarm) {
      toast({
        title: "해당 재배환경의 농장을 찾을 수 없습니다",
        variant: "destructive",
      });
      return;
    }

    // 작물 찾기 또는 생성
    const targetCrop = await getOrCreateCrop(selectedCrop);

    // 작업 데이터 생성
    const tasksToCreate: InsertTask[] = [];

    if (registrationMode === 'batch') {
      // 일괄등록: 여러 작업, 시작 날짜만
      selectedWorks.forEach(work => {
        selectedRows.forEach(row => {
          const defaultTitle = `${selectedCrop || '작물'} ${work}`;
          tasksToCreate.push({
            title: customTitle || defaultTitle,
            taskType: work,
            cropId: targetCrop?.id || "",
            farmId: targetFarm.id,
            scheduledDate: startDate?.toLocaleDateString('sv-SE') || new Date().toLocaleDateString('sv-SE'),
            endDate: endDate ? endDate.toLocaleDateString('sv-SE') : startDate?.toLocaleDateString('sv-SE') || new Date().toLocaleDateString('sv-SE'),
            description: `이랑: ${row}번`,
          });
        });
      });
    } else {
      // 개별등록: 하나의 작업, 날짜 범위
      const work = selectedWorks[0];
      if (startDate && endDate) {
        const currentDate = new Date(startDate);
        const end = new Date(endDate);
        
        while (currentDate <= end) {
          selectedRows.forEach(row => {
            const defaultTitle = `${selectedCrop || '작물'} ${work}`;
            tasksToCreate.push({
              title: customTitle || defaultTitle,
              taskType: work,
              cropId: targetCrop?.id || "",
              farmId: targetFarm.id,
              scheduledDate: currentDate.toLocaleDateString('sv-SE'),
              endDate: endDate ? endDate.toLocaleDateString('sv-SE') : currentDate.toLocaleDateString('sv-SE'),
              description: `이랑: ${row}번`,
            });
          });
          
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }
    }

    createTaskMutation.mutate(tasksToCreate);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>내 농작업 관리</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 등록 모드 선택 */}
          <div className="flex space-x-2">
            <Button
              type="button"
              variant={registrationMode === 'batch' ? 'default' : 'outline'}
              onClick={() => setRegistrationMode('batch')}
              className="flex-1"
            >
              일괄 등록
            </Button>
            <Button
              type="button"
              variant={registrationMode === 'individual' ? 'default' : 'outline'}
              onClick={() => setRegistrationMode('individual')}
              className="flex-1"
            >
              개별 등록
            </Button>
          </div>

          {/* 재배환경 선택 */}
          <div className="space-y-2">
            <Label>재배환경</Label>
            <Select value={selectedEnvironment} onValueChange={setSelectedEnvironment}>
              <SelectTrigger>
                <SelectValue placeholder="재배환경을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="노지">노지</SelectItem>
                <SelectItem value="시설1">시설1</SelectItem>
                <SelectItem value="시설2">시설2</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 이랑 선택 */}
          {selectedEnvironment && (
            <div className="space-y-2">
              <Label>이랑 선택</Label>
              <div className="grid grid-cols-5 gap-2 max-h-32 overflow-y-auto p-2 border rounded">
                {rowOptions.map(row => {
                  const occupied = isRowOccupied(row);
                  return (
                    <div key={row} className="flex items-center space-x-2">
                      <Checkbox
                        id={`row-${row}`}
                        checked={selectedRows.includes(row)}
                        onCheckedChange={() => !occupied && handleRowToggle(row)}
                        disabled={occupied}
                      />
                      <Label 
                        htmlFor={`row-${row}`} 
                        className={`text-sm ${occupied ? 'text-gray-400 line-through' : ''}`}
                      >
                        {row}{occupied ? ' (등록됨)' : ''}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 작물 선택 */}
          <div className="space-y-2">
            <Label>작물 선택</Label>
            <Input
              placeholder="작물명을 입력하거나 아래에서 선택하세요"
              value={selectedCrop}
              onChange={(e) => setSelectedCrop(e.target.value)}
            />
            
            {/* 대표 작물 리스트 */}
            <div className="space-y-2">
              <Label className="text-sm text-gray-600">대표 작물</Label>
              <div className="flex flex-wrap gap-2">
                {popularCrops.map(crop => (
                  <Button
                    key={crop}
                    type="button"
                    variant={selectedCrop === crop ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCrop(crop)}
                  >
                    {crop}
                  </Button>
                ))}
              </div>
            </div>

            {/* 검색된 작물 목록 */}
            {selectedCrop && filteredCrops.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm text-gray-600">검색 결과</Label>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {filteredCrops.slice(0, 5).map(crop => (
                    <Button
                      key={crop.id}
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => setSelectedCrop(crop.name)}
                    >
                      {crop.name} ({crop.category})
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 제목 수정 */}
          <div className="space-y-2">
            <Label>제목 (선택사항)</Label>
            <Input
              placeholder={generateDefaultTitle() || "기본 제목이 자동 생성됩니다"}
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
            />
            {!customTitle && generateDefaultTitle() && (
              <p className="text-sm text-gray-500">
                기본 제목: {generateDefaultTitle()}
              </p>
            )}
          </div>

          {/* 농작업 선택 */}
          <div className="space-y-2">
            <Label>
              {registrationMode === 'batch' ? '농작업 선택 (다중 선택 가능)' : '농작업 선택 (하나만 선택)'}
            </Label>
            <div className="space-y-2">
              {taskTypes.map(work => (
                <div key={work} className="flex items-center space-x-2">
                  <Checkbox
                    id={work}
                    checked={selectedWorks.includes(work)}
                    onCheckedChange={() => handleWorkToggle(work)}
                  />
                  <Label htmlFor={work} className="text-sm">
                    {work}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* 날짜 선택 */}
          <div className="space-y-2">
            {registrationMode === 'batch' ? (
              <div>
                <Label>시작 날짜</Label>
                <Popover open={calendarFromOpen} onOpenChange={setCalendarFromOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP", { locale: ko }) : "날짜를 선택하세요"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      disabled={(date) => date < new Date("1900-01-01")}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label>FROM</Label>
                  <Popover open={calendarFromOpen} onOpenChange={setCalendarFromOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "MM/dd", { locale: ko }) : "날짜 선택"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        disabled={(date) => date < new Date("1900-01-01")}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div>
                  <Label>TO</Label>
                  <Popover open={calendarToOpen} onOpenChange={setCalendarToOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "MM/dd", { locale: ko }) : "날짜 선택"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        disabled={(date) => date < new Date("1900-01-01")}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}
          </div>

          {/* 저장 버튼 */}
          <div className="sticky bottom-0 bg-white pt-4 border-t">
            <Button
              onClick={() => onSubmit({} as any)}
              className="w-full bg-black text-white hover:bg-gray-800"
              disabled={createTaskMutation.isPending}
            >
              {createTaskMutation.isPending ? "저장 중..." : "저장하기"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}