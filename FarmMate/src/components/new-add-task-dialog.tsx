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
import { apiRequest } from "@/shared/api";
import { z } from "zod";
import { registrationData } from "../shared/data/registration";

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

  // crops API는 더 이상 사용하지 않음 - registration 데이터만 사용

  const { data: tasks } = useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: () => import("@/shared/api/tasks").then(m => m.listTasksRange("2020-01-01", "2030-12-31")),
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
      const { taskApi } = await import("@/shared/api/tasks");
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
  
  // registration 데이터에서 작물 검색
  const getRegistrationCrops = (searchTerm: string) => {
    if (!searchTerm.trim()) return [];
    
    const term = searchTerm.toLowerCase();
    const results = registrationData.filter(crop => 
      crop.품목.toLowerCase().includes(term) ||
      crop.대분류.toLowerCase().includes(term) ||
      crop.품종.toLowerCase().includes(term)
    );
    
    
    return results;
  };

  // registration 작물만 검색 결과로 사용
  const allFilteredCrops = getRegistrationCrops(selectedCrop);

  // 기본 제목 생성
  const generateDefaultTitle = () => {
    if (selectedCrop && selectedWorks.length > 0) {
      return `${selectedCrop} ${selectedWorks.join(', ')}`;
    }
    return '';
  };

  // registration 데이터에서 작물 찾기
  const findRegistrationCrop = (cropName: string) => {
    if (!cropName) return null;
    
    return registrationData.find(
      regCrop => regCrop.품목 === cropName || regCrop.품목.includes(cropName) || cropName.includes(regCrop.품목)
    );
  };

  // 작물 선택 핸들러 - 자동 농작업 선택 기능 포함
  const handleCropSelect = (cropName: string) => {
    setSelectedCrop(cropName);
    
    // 일괄등록 모드일 때만 자동 선택 기능 적용
    if (registrationMode === 'batch') {
      // 1. registrationData에서 해당 작물의 파종/육묘 구분 확인
      const registrationCrop = registrationData.find(
        regCrop => regCrop.품목 === cropName || regCrop.품목.includes(cropName) || cropName.includes(regCrop.품목)
      );
      
      if (registrationCrop) {
        // 2. 파종/육묘 구분에 따라 농작업 자동 선택
        if (registrationCrop.파종육묘구분 === '파종') {
          // 파종이면: 파종, 수확만 자동 체크
          setSelectedWorks(['파종', '수확']);
        } else if (registrationCrop.파종육묘구분 === '육묘') {
          // 육묘이면: 파종, 육묘, 수확 자동 체크
          setSelectedWorks(['파종', '육묘', '수확']);
        }
      }
      // registrationData에 없으면 농작업 선택을 초기화하지 않음 (사용자가 직접 선택)
    }
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

    // registration 데이터에서 작물 찾기
    const targetCrop = findRegistrationCrop(selectedCrop);

    // 작업 데이터 생성
    const tasksToCreate: InsertTask[] = [];

    if (registrationMode === 'batch') {
      // 일괄등록: 농작업 계산기에 따라 파종일, 육묘일, 수확일 계산
      if (!startDate) {
        toast({
          title: "시작 날짜를 선택해주세요",
          variant: "destructive",
        });
        return;
      }

      // registration 데이터에서 작물의 총 재배기간 가져오기
      const cropTotalDuration = targetCrop?.총재배기간 || 70; // 기본값 70일
      
      // 농작업별 날짜 계산 (농작업 계산기와 동일한 로직)
      const taskSchedules: { taskType: string; startDate: Date; endDate: Date }[] = [];
      let currentDate = new Date(startDate);
      
      // 재배 종료일 미리 계산
      const finalHarvestDate = new Date(startDate);
      finalHarvestDate.setDate(finalHarvestDate.getDate() + cropTotalDuration - 1);
      
      selectedWorks.forEach((work, index) => {
        let taskDuration = 0;
        
        // 수확 작업은 재배 종료일과 동일하게 설정 (1일)
        if (work === "수확") {
          taskDuration = 1; // 수확은 1일만
        } else {
          // 농작업 계산기와 동일한 비율 계산 (수확 제외)
          if (selectedWorks.length === 2 && selectedWorks.includes("파종") && selectedWorks.includes("수확")) {
            // 파종+수확만 있는 경우 (파종작물)
            if (work === "파종") {
              taskDuration = cropTotalDuration - 1; // 나머지 기간 (수확 1일 제외)
            }
          } else if (selectedWorks.length === 3 && selectedWorks.includes("파종") && selectedWorks.includes("육묘") && selectedWorks.includes("수확")) {
            // 파종+육묘+수확 모두 있는 경우 (육묘작물)
            if (work === "파종") {
              taskDuration = Math.round(cropTotalDuration * 0.15); // 15%
            } else if (work === "육묘") {
              taskDuration = Math.round(cropTotalDuration * 0.25); // 25%
            }
          } else {
            // 기타 경우는 기본 비율 사용
            const defaultRatios = { "파종": 0.2, "육묘": 0.3 };
            taskDuration = Math.round(cropTotalDuration * (defaultRatios[work as keyof typeof defaultRatios] || 0.2));
          }
        }
        
        if (taskDuration > 0) {
          let taskStartDate: Date;
          let taskEndDate: Date;
          
          if (work === "수확") {
            // 수확일 = 재배 종료일 (동일한 날짜)
            taskStartDate = new Date(finalHarvestDate);
            taskEndDate = new Date(finalHarvestDate);
          } else {
            // 다른 작업들은 순차적으로 배치
            taskStartDate = new Date(currentDate);
            taskEndDate = new Date(currentDate);
            taskEndDate.setDate(taskEndDate.getDate() + taskDuration - 1);
            
            // 다음 작업 시작일 계산
            currentDate.setDate(currentDate.getDate() + taskDuration);
          }
          
          taskSchedules.push({
            taskType: work,
            startDate: taskStartDate,
            endDate: taskEndDate
          });
        }
      });

      // 일괄등록 그룹 ID 생성 (현재 시간 기반)
      const taskGroupId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // 각 이랑별로 작업 생성
      selectedRows.forEach(row => {
        // 1. 개별 농작업들 (파종, 육묘, 수확)
        taskSchedules.forEach(schedule => {
          const defaultTitle = `${selectedCrop || '작물'} ${schedule.taskType}`;
          tasksToCreate.push({
            title: customTitle || defaultTitle,
            taskType: schedule.taskType,
            cropId: targetCrop?.id || selectedCrop,
            farmId: targetFarm.id,
            scheduledDate: schedule.startDate.toLocaleDateString('sv-SE'),
            endDate: schedule.endDate.toLocaleDateString('sv-SE'),
            description: `이랑: ${row}번`,
            taskGroupId: taskGroupId, // 일괄등록 그룹 ID 추가
          });
        });

        // 2. 전체 재배 기간을 커버하는 "재배" 작업 (캘린더 연속 박스용)
        const cropStartDate = new Date(startDate);
        const cropEndDate = new Date(startDate);
        cropEndDate.setDate(cropEndDate.getDate() + cropTotalDuration - 1);
        
        tasksToCreate.push({
          title: `${selectedCrop || '작물'} 재배`,
          taskType: "재배",
          cropId: targetCrop?.id || selectedCrop,
          farmId: targetFarm.id,
          scheduledDate: cropStartDate.toLocaleDateString('sv-SE'),
          endDate: cropEndDate.toLocaleDateString('sv-SE'),
          description: `이랑: ${row}번 - ${selectedCrop || '작물'} 재배 기간`,
        });
      });
    } else {
      // 개별등록: 하나의 작업만 생성 (날짜 범위로)
      const work = selectedWorks?.[0];
      if (startDate && endDate) {
        selectedRows.forEach(row => {
          const defaultTitle = `${selectedCrop || '작물'} ${work}`;
          tasksToCreate.push({
            title: customTitle || defaultTitle,
            taskType: work,
            cropId: targetCrop?.id || selectedCrop,
            farmId: targetFarm.id,
            scheduledDate: startDate.toLocaleDateString('sv-SE'),
            endDate: endDate.toLocaleDateString('sv-SE'),
            description: `이랑: ${row}번`,
          });
        });
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
              onChange={(e) => handleCropSelect(e.target.value)}
            />
            
            {/* 내 작물 선택 */}
            <div className="space-y-2">
              <Label className="text-sm text-gray-600">내 작물 선택</Label>
              <div className="border rounded-md p-2 max-h-48 overflow-y-auto">
                {/* 핵심 작물 */}
                <div className="border-b pb-2 mb-2">
                  <div className="text-xs text-gray-500 font-medium mb-2 px-2">⭐ 핵심 작물</div>
                  {registrationData.filter(crop => 
                    ['스냅피', '이름없음', '비트'].some(name => crop.품목.includes(name))
                  ).map(crop => (
                    <button
                      key={crop.id}
                      type="button"
                      onClick={() => {
                        setSelectedCrop(crop.품목);
                        // registration 작물이므로 바로 농작업 자동 선택
                        if (registrationMode === 'batch') {
                          if (crop.파종육묘구분 === '파종') {
                            setSelectedWorks(['파종', '수확']);
                          } else if (crop.파종육묘구분 === '육묘') {
                            setSelectedWorks(['파종', '육묘', '수확']);
                          }
                        }
                      }}
                      className="w-full text-left p-2 hover:bg-gray-50 rounded text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          {crop.품목} ({crop.품종})
                        </div>
                        <div className="text-xs text-gray-500">
                          {crop.대분류}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                
                {/* 전체 작물 */}
                <div>
                  <div className="text-xs text-gray-500 font-medium mb-2 px-2">전체 작물</div>
                  {registrationData.slice(0, 20).map(crop => (
                    <button
                      key={crop.id}
                      type="button"
                      onClick={() => {
                        setSelectedCrop(crop.품목);
                        // registration 작물이므로 바로 농작업 자동 선택
                        if (registrationMode === 'batch') {
                          if (crop.파종육묘구분 === '파종') {
                            setSelectedWorks(['파종', '수확']);
                          } else if (crop.파종육묘구분 === '육묘') {
                            setSelectedWorks(['파종', '육묘', '수확']);
                          }
                        }
                      }}
                      className="w-full text-left p-2 hover:bg-gray-50 rounded text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          {crop.품목} ({crop.품종})
                        </div>
                        <div className="text-xs text-gray-500">
                          {crop.대분류}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 검색된 작물 목록 */}
            {selectedCrop && allFilteredCrops.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm text-gray-600">검색 결과</Label>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {allFilteredCrops.slice(0, 5).map((crop, index) => (
                    <Button
                      key={crop.id || `reg-${index}`}
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => {
                        handleCropSelect(crop.품목);
                      }}
                    >
                      {crop.품목} ({crop.품종}) - {crop.대분류}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* 검색 결과가 없을 때만 등록 여부 묻기 */}
            {selectedCrop && allFilteredCrops.length === 0 && (
              <div className="border border-yellow-300 bg-yellow-50 p-3 rounded-md">
                <p className="text-sm text-gray-700 mb-2">
                  검색 결과가 없습니다. 그래도 "{selectedCrop}"로 작물을 등록하시겠습니까?
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedCrop('')}
                  >
                    취소
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      // 그대로 작물명을 사용하여 등록 진행
                      // 이미 handleCropSelect에서 처리됨
                    }}
                  >
                    등록하기
                  </Button>
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