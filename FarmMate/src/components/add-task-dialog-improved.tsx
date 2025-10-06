import { useState, useEffect } from "react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { CalendarIcon, Check, Search, Calculator, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import { useToast } from "../hooks/use-toast";
import { insertTaskSchema } from "../shared/types/schema";
import type { InsertTask, Task, Farm, Crop } from "../shared/types/schema";
import type { FarmEntity } from "../shared/api/farm.repository";
import { useLocation } from "wouter";
import { useDeleteTask } from "../features/task-management";
// ⬇ /api 호출 제거
// import { apiRequest } from "@shared/api/client";

// ⬇ Supabase 유틸 추가
import { saveTask } from "../shared/api/saveTask";
import { supabase } from "../shared/api/supabase";
import { mustOk } from "../shared/api/mustOk";
import { useFarms } from "../features/farm-management";
import { useCrops } from "../features/crop-management";
import { serverRegistrationRepository, type CropSearchResult } from "../shared/api/server-registration.repository";

import { z } from "zod";
import { Calendar } from "./ui/calendar";
import WorkCalculatorDialog from "./work-calculator-dialog";

const formSchema = insertTaskSchema.extend({
  title: z.string().min(1, "제목을 입력해주세요"),
  environment: z.string().optional(), // 농장 선택 시 자동 설정
  endDate: z.string().optional(),
  rowNumber: z.number().optional(),
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
  console.log("AddTaskDialog 렌더링, 받은 task props:", task);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [registrationMode, setRegistrationMode] =
    useState<"batch" | "individual">("individual");
  
  // 작업 삭제 hook
  const deleteMutation = useDeleteTask();
  const [selectedWorks, setSelectedWorks] = useState<string[]>([]);
  const [cropSearchTerm, setCropSearchTerm] = useState("");
  const [cropSearchResults, setCropSearchResults] = useState<CropSearchResult[]>([]);
  const [customCropName, setCustomCropName] = useState("");
  const [showKeyCrops, setShowKeyCrops] = useState(false);
  const [showWorkCalculator, setShowWorkCalculator] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState<Crop | null>(null);
  const [selectedFarm, setSelectedFarm] = useState<FarmEntity | null>(null);
  const [, setLocation] = useLocation();

  const { data: farms, isLoading: farmsLoading } = useFarms();

  const { data: crops } = useCrops();

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
      rowNumber: undefined,
    },
  });

  // 제목 자동 설정 (편집 모드에서도 작동)
  useEffect(() => {
    const taskType = form.getValues("taskType");
    const cropName = customCropName || cropSearchTerm;
    
    console.log("제목 자동 설정 useEffect 실행:", {
      customCropName,
      cropSearchTerm,
      cropName,
      taskType,
      현재제목: form.getValues("title")
    });
    
    if (cropName && taskType) {
      const newTitle = `${cropName}_${taskType}`;
      console.log("제목 자동 설정:", { cropName, taskType, newTitle });
      form.setValue("title", newTitle);
    }
  }, [cropSearchTerm, customCropName, form]);

  // 작물 정보가 변경될 때 제목 업데이트
  useEffect(() => {
    const taskType = form.getValues("taskType");
    const currentTitle = form.getValues("title");
    const cropName = customCropName || cropSearchTerm;
    
    if (cropName && taskType) {
      const expectedTitle = `${cropName}_${taskType}`;
      if (currentTitle !== expectedTitle) {
        console.log("작물 정보 변경으로 제목 업데이트:", {
          currentTitle,
          expectedTitle,
          cropName,
          taskType
        });
        form.setValue("title", expectedTitle);
      }
    }
  }, [customCropName, cropSearchTerm, form]);

  // taskType 변경시 제목 갱신 (편집 모드에서도 작동)
  useEffect(() => {
    const taskType = form.watch("taskType");
    const cropName = customCropName || cropSearchTerm;
    if (cropName && taskType) {
      const newTitle = `${cropName}_${taskType}`;
      console.log("taskType 변경으로 인한 제목 갱신:", { cropName, taskType, newTitle });
      form.setValue("title", newTitle);
    }
  }, [form.watch("taskType"), customCropName, cropSearchTerm, form]);

  // 첫 번째 농장을 기본값으로 설정
  useEffect(() => {
    if (farms && farms.length > 0 && !task && open && !selectedFarm) {
      const firstFarm = farms[0];
      setSelectedFarm(firstFarm);
      form.setValue("farmId", firstFarm.id);
      form.setValue("environment", firstFarm.environment || "");
      console.log("첫 번째 농장이 자동 선택되었습니다:", firstFarm.name);
    }
  }, [farms, task, open, selectedFarm, form]);

  // 수정 모드 초기화
  useEffect(() => {
    console.log("편집 모드 초기화 조건 체크:", { 
      task: !!task, 
      open, 
      cropsLength: crops?.length, 
      farmsLength: farms?.length,
      taskData: task
    });
    
    if (task && open) {
      console.log("편집 모드 초기화 실행");
      
      // 이랑 번호 추출 (task.rowNumber 우선, 없으면 description에서 파싱)
      let taskRowNumber = (task as any).rowNumber;
      console.log("원본 task.rowNumber:", (task as any).rowNumber);
      console.log("원본 task.description:", (task as any).description);
      
      if (!taskRowNumber && (task as any).description && (task as any).description.includes("이랑:")) {
        const match = (task as any).description.match(/이랑:\s*(\d+)번/);
        if (match) {
          taskRowNumber = parseInt(match[1]);
          console.log("description에서 파싱한 이랑 번호:", taskRowNumber);
        }
      }
      
      console.log("최종 taskRowNumber:", taskRowNumber);

      // 기본 폼 데이터 먼저 설정
      form.reset({
        title: task.title || "",
        description: (task as any).description || "",
        taskType: (task as any).taskType || "",
        scheduledDate: (task as any).scheduledDate || "",
        endDate: (task as any).endDate || (task as any).scheduledDate || "", // 종료날짜가 없으면 시작날짜와 동일하게 설정
        farmId: (task as any).farmId || "",
        cropId: (task as any).cropId || "",
        environment: "",
        rowNumber: taskRowNumber || undefined,
      });
      
      // 약간의 지연 후 이랑 번호를 확실히 설정 (form.reset 후 값이 덮어씌워질 수 있음)
      setTimeout(() => {
        if (taskRowNumber) {
          console.log("지연 후 이랑 번호를 setValue로 설정:", taskRowNumber);
          form.setValue("rowNumber", taskRowNumber);
        }
      }, 100);
      
      // 제목에서 작물명 추출 (fallback)
      const titleParts = task.title?.split('_');
      if (titleParts && titleParts.length >= 2) {
        const cropNameFromTitle = titleParts[0];
        console.log("제목에서 작물명 추출:", cropNameFromTitle);
        setCropSearchTerm(cropNameFromTitle);
        setCustomCropName(cropNameFromTitle);
      }

      // 농장 정보 먼저 설정 (farms 데이터가 있으면 바로 설정)
      console.log("수정 모드 농장 설정 시도:", {
        farmsLength: farms?.length,
        taskFarmId: (task as any).farmId,
        taskFarmIdType: typeof (task as any).farmId
      });
      
      if (farms && (task as any).farmId) {
        const farm = farms.find((f) => f.id === (task as any).farmId);
        console.log("농장 찾기 결과:", farm);
        
        if (farm) {
          console.log("수정 모드에서 농장 설정:", farm.name, "ID:", farm.id);
          setSelectedFarm(farm);
          form.setValue("farmId", farm.id);
          form.setValue("environment", farm.environment || "");
          
          // 농장 설정 후 확인
          setTimeout(() => {
            console.log("농장 설정 후 form.getValues('farmId'):", form.getValues("farmId"));
          }, 100);
        } else {
          console.log("농장을 찾을 수 없음. taskFarmId:", (task as any).farmId);
          console.log("사용 가능한 농장들:", farms.map(f => ({ id: f.id, name: f.name })));
        }
      } else if (farms && farms.length > 0) {
        // farmId가 없으면 첫 번째 농장으로 설정
        const firstFarm = farms[0];
        console.log("farmId가 없어서 첫 번째 농장으로 설정:", firstFarm.name);
        setSelectedFarm(firstFarm);
        form.setValue("farmId", firstFarm.id);
        form.setValue("environment", firstFarm.environment || "");
      }

      // crops 데이터가 있으면 작물 설정
      if (crops && (task as any).cropId) {
        const crop = crops.find((c) => c.id === (task as any).cropId);
        if (crop) {
          console.log("수정 모드에서 작물 설정:", crop.name);
          setCropSearchTerm(crop.name);
          setSelectedCrop(crop);
          setCustomCropName(crop.name); // 작물명을 customCropName에도 설정
        }
      } else if ((task as any).cropId) {
        // cropId는 있지만 crops 데이터에서 찾을 수 없는 경우
        console.log("crops 데이터에서 작물을 찾을 수 없음. cropId:", (task as any).cropId);
        console.log("사용 가능한 crops:", crops?.map(c => ({ id: c.id, name: c.name })));
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
        rowNumber: undefined,
      });
      setCropSearchTerm("");
      setCustomCropName("");
      setSelectedWorks([]);
      setSelectedCrop(null);
      // selectedFarm은 첫 번째 농장으로 자동 설정되므로 null로 초기화하지 않음
    }
  }, [task, open, selectedDate, crops, farms, form]);

  // 수정 모드에서 이랑 번호를 확실히 설정하는 별도 useEffect
  useEffect(() => {
    if (task && open) {
      // 이랑 번호 추출
      let taskRowNumber = (task as any).rowNumber;
      console.log("별도 useEffect - 원본 task.rowNumber:", (task as any).rowNumber);
      console.log("별도 useEffect - 원본 task.description:", (task as any).description);
      
      if (!taskRowNumber && (task as any).description && (task as any).description.includes("이랑:")) {
        const match = (task as any).description.match(/이랑:\s*(\d+)번/);
        if (match) {
          taskRowNumber = parseInt(match[1]);
          console.log("별도 useEffect - description에서 파싱한 이랑 번호:", taskRowNumber);
        }
      }
      
      if (taskRowNumber) {
        console.log("별도 useEffect에서 이랑 번호 설정:", taskRowNumber);
        // 여러 번 시도해서 확실히 설정
        form.setValue("rowNumber", taskRowNumber);
        setTimeout(() => {
          form.setValue("rowNumber", taskRowNumber);
          console.log("지연 후 이랑 번호 재설정:", taskRowNumber);
        }, 200);
        setTimeout(() => {
          form.setValue("rowNumber", taskRowNumber);
          console.log("두 번째 지연 후 이랑 번호 재설정:", taskRowNumber);
        }, 500);
      }
    }
  }, [task, open, form]);

  // 이랑 번호 실시간 감시 및 설정
  const watchedRowNumber = form.watch("rowNumber");
  useEffect(() => {
    if (task && open && watchedRowNumber === undefined) {
      // 이랑 번호가 설정되지 않은 경우 다시 시도
      let taskRowNumber = (task as any).rowNumber;
      if (!taskRowNumber && (task as any).description && (task as any).description.includes("이랑:")) {
        const match = (task as any).description.match(/이랑:\s*(\d+)번/);
        if (match) {
          taskRowNumber = parseInt(match[1]);
        }
      }
      
      if (taskRowNumber) {
        console.log("watch useEffect에서 이랑 번호 설정:", taskRowNumber);
        form.setValue("rowNumber", taskRowNumber);
      }
    }
  }, [task, open, watchedRowNumber, form]);

  // 작물 검색 함수 (서버용)
  const searchCrops = async (searchTerm: string) => {
    console.log('🔍 searchCrops 함수 호출:', searchTerm);
    
    if (!searchTerm.trim()) {
      console.log('❌ 검색어가 비어있음');
      setCropSearchResults([]);
      return;
    }

    setIsSearching(true);
    console.log('⏳ 서버 검색 시작...');
    
    try {
      console.log('📡 serverRegistrationRepository.searchCrops 호출');
      
      // 임시 하드코딩 테스트
      if (searchTerm.includes('결구배추')) {
        console.log('🧪 하드코딩 테스트 실행');
        const hardcodedResults = [
          { id: '1', 대분류: '배추류', 품목: '결구배추', 품종: '개성', 파종육묘구분: '육묘' },
          { id: '2', 대분류: '배추류', 품목: '결구배추', 품종: '빨강', 파종육묘구분: '육묘' },
          { id: '3', 대분류: '배추류', 품목: '결구배추', 품종: '속노랑', 파종육묘구분: '육묘' },
        ];
        console.log('🧪 하드코딩 결과:', hardcodedResults);
        setCropSearchResults(hardcodedResults);
        return;
      }
      
      const results = await serverRegistrationRepository.searchCrops(searchTerm);
      console.log('✅ 서버 검색 결과 받음:', results);
      console.log('📊 검색 결과 개수:', results.length);
      console.log('📊 cropSearchResults 상태 업데이트 전:', cropSearchResults);
      setCropSearchResults(results);
      console.log('📊 cropSearchResults 상태 업데이트 후:', results);
    } catch (error) {
      console.error('❌ 서버 작물 검색 실패:', error);
      console.error('❌ 오류 상세:', error.message);
      toast({
        title: "작물 검색 실패",
        description: `오류: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
      console.log('🏁 서버 검색 완료');
    }
  };

  // 작물 검색 디바운스 처리 (즉시 실행으로 변경)
  useEffect(() => {
    console.log('⏰ 디바운스 useEffect 실행:', cropSearchTerm);
    const timeoutId = setTimeout(() => {
      if (cropSearchTerm.trim()) {
        console.log('🚀 디바운스 후 서버 검색 실행:', cropSearchTerm);
        searchCrops(cropSearchTerm);
      } else {
        console.log('🧹 검색어 비어있어서 결과 초기화');
        setCropSearchResults([]);
      }
    }, 100); // 300ms → 100ms로 단축

    return () => {
      console.log('🧹 디바운스 타이머 정리');
      clearTimeout(timeoutId);
    };
  }, [cropSearchTerm]);

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
    if (farm) {
      form.setValue("environment", farm.environment || "");
      setSelectedFarm(farm);
    }
  };

  const handleKeyCropSelect = (keyCrop: (typeof KEY_CROPS)[0]) => {
    const displayName = `${keyCrop.name} > ${keyCrop.variety}`;
    console.log("핵심 작물 선택:", {
      keyCrop,
      displayName,
      이전CustomCropName: customCropName,
      이전CropSearchTerm: cropSearchTerm
    });
    
    setCropSearchTerm(displayName);
    setCustomCropName(displayName);
    form.setValue("cropId", ""); // 커스텀 작물
    setShowKeyCrops(false);
    
    console.log("핵심 작물 선택 완료:", {
      새로운CustomCropName: displayName,
      새로운CropSearchTerm: displayName,
      cropId: form.getValues("cropId")
    });
  };

  const handleCustomCropInput = (cropName: string) => {
    console.log("작물 입력 변경:", {
      cropName,
      이전CustomCropName: customCropName,
      이전CropSearchTerm: cropSearchTerm
    });
    
    setCustomCropName(cropName);
    setCropSearchTerm(cropName);
    form.setValue("cropId", "");
    setSelectedSearchCrop(null); // 검색 작물 선택 해제
    
    console.log("작물 입력 처리 완료:", {
      새로운CustomCropName: cropName,
      새로운CropSearchTerm: cropName,
      cropId: form.getValues("cropId")
    });
  };

  // 검색된 작물 선택 핸들러
  const handleSearchCropSelect = (searchCrop: CropSearchResult) => {
    const displayName = `${searchCrop.품목} > ${searchCrop.품종}`;
    console.log("검색 작물 선택:", {
      searchCrop,
      displayName,
      이전CustomCropName: customCropName,
      이전CropSearchTerm: cropSearchTerm
    });
    
    setCropSearchTerm(displayName);
    setCustomCropName(displayName);
    setSelectedSearchCrop(searchCrop);
    form.setValue("cropId", ""); // 커스텀 작물
    setCropSearchResults([]); // 검색 결과 숨기기
    
    console.log("검색 작물 선택 완료:", {
      새로운CustomCropName: displayName,
      새로운CropSearchTerm: displayName,
      cropId: form.getValues("cropId")
    });
  };

  /** 단건 저장 */
  const createMutation = useMutation({
    mutationFn: async (data: InsertTask) => {
      // 작물 ID 결정 로직 개선
      let finalCropId = (data as any).cropId;
      if (!finalCropId && selectedCrop?.id) {
        finalCropId = selectedCrop.id;
        console.log("개별등록에서 selectedCrop.id 사용:", finalCropId);
      }
      
      console.log("개별등록 작물 정보 확인:", {
        formCropId: (data as any).cropId,
        selectedCrop: selectedCrop?.name,
        selectedCropId: selectedCrop?.id,
        finalCropId,
        customCropName,
        cropSearchTerm,
        endDate: (data as any).endDate,
        scheduledDate: (data as any).scheduledDate,
        전체데이터: data
      });
      
      // endDate가 있는 경우 taskApi.createTask를 직접 사용
      if ((data as any).endDate) {
        console.log("endDate가 있어서 taskApi.createTask 사용:", {
          endDate: (data as any).endDate,
          scheduledDate: (data as any).scheduledDate
        });
        const { taskApi } = await import("../shared/api/tasks");
        const taskToCreate = {
          title: data.title!,
          description: (data as any).description || "",
          taskType: (data as any).taskType || "기타",
          scheduledDate: (data as any).scheduledDate,
          endDate: (data as any).endDate, // endDate 포함
          farmId: (data as any).farmId || "",
          cropId: finalCropId || "",
          rowNumber: (data as any).rowNumber || null,
          completed: 0,
        };
        console.log("taskApi.createTask에 전달할 데이터:", taskToCreate);
        return await taskApi.createTask(taskToCreate);
      } else {
        // endDate가 없는 경우 기존 saveTask 사용
        console.log("endDate가 없어서 saveTask 사용:", {
          endDate: (data as any).endDate,
          scheduledDate: (data as any).scheduledDate
        });
        return saveTask({
          title: data.title!,
          memo: (data as any).description || undefined,
          scheduledAt: (data as any).scheduledDate,
          farmId: (data as any).farmId ? (data as any).farmId : undefined,
          cropId: finalCropId || undefined,
          rowNumber: (data as any).rowNumber || undefined,
          taskType: (data as any).taskType || undefined,
        });
      }
    },
    onSuccess: () => {
      // 모든 tasks 관련 쿼리를 무효화하여 캘린더들이 자동으로 새로고침되도록 함
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks", { start: "", end: "" }] });
      queryClient.invalidateQueries({ queryKey: ["tasks", { start: "2020-01-01", end: "2030-12-31" }] });

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
        const { taskApi } = await import("../shared/api/tasks");
      const rowNumber = (data as any).rowNumber;
      const description = rowNumber 
        ? `이랑: ${rowNumber}번`
        : (data as any).description || "";
      
      // 작물 ID 결정 로직 개선
      let finalCropId = (data as any).cropId;
      if (!finalCropId && selectedCrop?.id) {
        finalCropId = selectedCrop.id;
        console.log("수정 모드에서 selectedCrop.id 사용:", finalCropId);
      }
      
      console.log("수정 모드 작물 정보 확인:", {
        formCropId: (data as any).cropId,
        selectedCrop: selectedCrop?.name,
        selectedCropId: selectedCrop?.id,
        finalCropId,
        customCropName,
        cropSearchTerm
      });
      return await taskApi.updateTask((task as any)!.id, {
        title: data.title!,
        description: description,
        taskType: (data as any).taskType || "기타",
        scheduledDate: (data as any).scheduledDate,
        endDate: (data as any).endDate || (data as any).scheduledDate || null, // 종료날짜가 없으면 시작날짜와 동일하게 설정
        farmId: (data as any).farmId ? (data as any).farmId.toString() : "",
        cropId: finalCropId ? finalCropId.toString() : "",
        rowNumber: rowNumber || null,
        completed: (data as any).completed || 0,
      });
    },
    onSuccess: () => {
      // 모든 tasks 관련 쿼리를 무효화하여 캘린더들이 자동으로 새로고침되도록 함
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks", { start: "", end: "" }] });
      queryClient.invalidateQueries({ queryKey: ["tasks", { start: "2020-01-01", end: "2030-12-31" }] });

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
          const { taskApi } = await import("../shared/api/tasks");
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
      // 모든 tasks 관련 쿼리를 무효화하여 캘린더들이 자동으로 새로고침되도록 함
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks", { start: "", end: "" }] });
      queryClient.invalidateQueries({ queryKey: ["tasks", { start: "2020-01-01", end: "2030-12-31" }] });

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
      if (!form.getValues("farmId")) {
        toast({ title: "농장을 선택해주세요", variant: "destructive" });
        return;
      }
      
      const rowNumber = form.getValues("rowNumber");
      
      // 작물 ID 결정 로직 개선 (개별등록과 동일하게)
      let finalCropId = form.getValues("cropId");
      if (!finalCropId && selectedCrop?.id) {
        // cropId가 없지만 selectedCrop이 있으면 selectedCrop.id 사용
        finalCropId = selectedCrop.id;
        console.log("일괄등록에서 selectedCrop.id 사용:", finalCropId);
      }
      
      console.log("일괄등록 작물 정보 확인:", {
        customCropName,
        cropSearchTerm,
        formCropId: form.getValues("cropId"),
        selectedCrop: selectedCrop?.name,
        selectedCropId: selectedCrop?.id,
        finalCropId,
        cropName
      });
      
      const tasks: InsertTask[] = selectedWorks.map((work) => ({
        title: form.getValues("title") || `${cropName}_${work}`,
        description: rowNumber 
          ? `이랑: ${rowNumber}번`
          : (form.getValues("description") || `일괄 등록으로 생성된 ${work} 작업`),
        taskType: work,
        scheduledDate: startDate,
        endDate: startDate, // 일괄등록 시 종료날짜를 시작날짜와 동일하게 설정
        farmId: form.getValues("farmId") || "",
        cropId: finalCropId || "", // 개선된 cropId 사용
        rowNumber: rowNumber || undefined,
      }));
      
      console.log("일괄등록으로 생성될 작업들:", tasks);
      bulkCreateMutation.mutate(tasks);
    } else {
      // individual: 한 작업을 날짜 범위로 (하나의 작업으로 시작일과 종료일만 저장)
      const endDate = (form.getValues("endDate") as string) || "";
      if (!startDate || !endDate) {
        toast({
          title: "시작/종료 날짜를 모두 선택해주세요",
          variant: "destructive",
        });
        return;
      }
      if (!form.getValues("farmId")) {
        toast({ title: "농장을 선택해주세요", variant: "destructive" });
        return;
      }
      const work = form.getValues("taskType") || "";
      const rowNumber = form.getValues("rowNumber");
      
      // 하나의 작업만 생성 (날짜 범위)
      const task: InsertTask = {
        title: form.getValues("title") || `${cropName}_${work}`,
        description: rowNumber 
          ? `이랑: ${rowNumber}번`
          : (form.getValues("description") || `개별 등록으로 생성된 ${work} 작업`),
        taskType: work,
        scheduledDate: startDate,
        endDate: endDate, // 종료일도 함께 저장
        farmId: form.getValues("farmId") || "",
        cropId: form.getValues("cropId") || "",
        rowNumber: rowNumber || undefined,
      };
      
      console.log("개별등록으로 생성될 작업 (날짜 범위):", task);
      createMutation.mutate(task);
    }
  };

  const handleWorkCalculatorSave = async (tasks: InsertTask[]) => {
    console.log("WorkCalculator 작업 저장:", tasks);
    console.log("WorkCalculator - 전달받은 tasks의 rowNumber:", tasks.map(t => t.rowNumber));
    
    // 각 작업을 saveTask 함수를 사용하여 사용자별로 저장
    try {
      for (const task of tasks) {
        console.log("WorkCalculator - 개별 task 저장:", {
          title: task.title,
          rowNumber: task.rowNumber,
          description: task.description,
          farmId: task.farmId
        });
        
        // endDate가 있는 경우 taskApi.createTask를 직접 사용
        if ((task as any).endDate) {
          const { taskApi } = await import("../shared/api/tasks");
          await taskApi.createTask({
            title: task.title,
            description: task.description || "",
            taskType: task.taskType || "기타",
            scheduledDate: task.scheduledDate,
            endDate: (task as any).endDate,
            farmId: task.farmId || "",
            cropId: task.cropId || "",
            rowNumber: task.rowNumber || null,
            completed: 0,
          });
        } else {
          await saveTask({
            title: task.title,
            memo: task.description || undefined,
            scheduledAt: task.scheduledDate,
            farmId: task.farmId ? task.farmId : undefined,
            cropId: task.cropId ? task.cropId : undefined,
            taskType: task.taskType,
            rowNumber: task.rowNumber || undefined,
          });
        }
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

    // 농장 선택 검증
    if (!data.farmId) {
      toast({
        title: "농장을 선택해주세요",
        description: "작업을 등록하려면 농장을 먼저 선택해야 합니다.",
        variant: "destructive",
      });
      return;
    }

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
    if (!selectedFarm) {
      toast({ title: "농장을 선택해주세요", variant: "destructive" });
      return;
    }
    
    // 농작업 계산기 열기 전에 현재 작물 정보 백업
    console.log("농작업 계산기 열기 전 작물 정보 백업:", {
      selectedCrop: selectedCrop?.name,
      customCropName,
      cropSearchTerm
    });
    
    setShowWorkCalculator(true);
  };

  // 농작업 계산기가 닫힐 때 작물 정보 복원
  const handleWorkCalculatorClose = (isOpen: boolean) => {
    if (!isOpen) {
      console.log("농작업 계산기 닫힘 - 작물 정보 복원 시도");
      
      // 작물 정보가 초기화되었다면 복원
      if (!customCropName && !cropSearchTerm && selectedCrop) {
        console.log("작물 정보 복원:", selectedCrop.name);
        setCustomCropName(selectedCrop.name);
        setCropSearchTerm(selectedCrop.name);
      }
    }
    setShowWorkCalculator(isOpen);
  };

  // 작업 삭제 함수
  const handleDeleteTask = async () => {
    if (!task?.id) return;
    
    if (window.confirm('정말로 이 작업을 삭제하시겠습니까?')) {
      try {
        await deleteMutation.mutateAsync(task.id.toString());
        onOpenChange(false);
      } catch (error) {
        // 에러는 hook에서 toast로 처리됨
      }
    }
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
                      console.log("작물 입력 필드 변경:", {
                        이전값: cropSearchTerm,
                        새로운값: e.target.value,
                        이전CustomCropName: customCropName
                      });
                      
                      setCropSearchTerm(e.target.value);
                      // handleCustomCropInput 호출하지 않음 - 검색 결과 초기화 방지
                    }}
                    className="pl-10"
                  />
                </div>

                {/* 서버 검색 결과 표시 */}
                {cropSearchTerm && cropSearchResults.length > 0 && (
                  <div className="max-h-32 overflow-y-auto border rounded-md">
                    <div className="p-2 text-xs text-gray-500 bg-blue-50 border-b">
                      작물 데이터베이스 검색 결과 ({cropSearchResults.length}개)
                    </div>
                    {cropSearchResults.map((searchCrop) => (
                      <button
                        key={searchCrop.id}
                        type="button"
                        onClick={() => handleSearchCropSelect(searchCrop)}
                        className={`w-full text-left p-2 hover:bg-gray-50 border-b last:border-b-0 ${
                          selectedSearchCrop?.id === searchCrop.id
                            ? "bg-blue-50 border-blue-200"
                            : ""
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium">{searchCrop.품목}</span>
                            <span className="text-sm text-gray-500 ml-2">
                              ({searchCrop.품종})
                            </span>
                          </div>
                          <div className="text-xs text-gray-400">
                            {searchCrop.대분류}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* 검색 중 표시 */}
                {cropSearchTerm && cropSearchResults.length === 0 && (
                  <div className="p-2 text-center text-sm text-gray-500">
                    작물을 검색 중입니다...
                  </div>
                )}

                {/* 검색 결과가 없을 때 */}
                {cropSearchTerm && cropSearchResults.length === 0 && (
                  <div className="p-2 text-center text-sm text-gray-500">
                    "{cropSearchTerm}"에 대한 검색 결과가 없습니다.
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
                    <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto border rounded-md p-2">
                      {crops && crops.length > 0 ? (
                        crops.map((crop) => {
                          const farm = farms?.find((f) => f.id === (crop as any).farmId);
                          return (
                            <button
                              key={crop.id}
                              type="button"
                              onClick={() => handleCropSelect(crop.id)}
                              className="text-left p-2 hover:bg-gray-50 rounded text-sm"
                            >
                              <div className="font-medium">
                                {crop.category} {'>'} {crop.name} {'>'} {crop.variety}
                              </div>
                              <div className="text-xs text-gray-500">
                                {farm?.name} · {farm?.environment}
                              </div>
                            </button>
                          );
                        })
                      ) : (
                        <div className="text-center text-sm text-gray-500 py-4">
                          등록된 작물이 없습니다.
                          <br />
                          먼저 작물을 등록해주세요.
                        </div>
                      )}
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

              {/* 농장 선택 */}
              <FormField
                control={form.control}
                name="farmId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>농장 *</FormLabel>
                    <Select 
                      value={field.value || ""}
                      onValueChange={(value) => {
                        try {
                          field.onChange(value);
                          const farm = farms?.find(f => f.id === value);
                          if (farm) {
                            setSelectedFarm(farm);
                            form.setValue("environment", farm.environment || "");
                            // 농장 선택 시 성공 메시지 표시
                            console.log("농장이 선택되었습니다:", farm.name);
                          }
                        } catch (error) {
                          console.error("농장 선택 중 오류:", error);
                          toast({
                            title: "농장 선택 오류",
                            description: "농장 선택 중 오류가 발생했습니다. 다시 시도해주세요.",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue 
                            placeholder={
                              farmsLoading 
                                ? "농장 목록을 불러오는 중..." 
                                : farms?.length === 0 
                                  ? "등록된 농장이 없습니다" 
                                  : "농장을 선택해주세요"
                            } 
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {farmsLoading ? (
                          <SelectItem value="loading" disabled>
                            농장 목록을 불러오는 중...
                          </SelectItem>
                        ) : farms?.length === 0 ? (
                          <SelectItem value="no-farms" disabled>
                            등록된 농장이 없습니다. 농장을 먼저 추가해주세요.
                          </SelectItem>
                        ) : (
                          farms?.map((farm) => (
                            <SelectItem key={farm.id} value={farm.id}>
                              {farm.name} ({farm.environment}) - {farm.rowCount}이랑
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                    {!farmsLoading && farms?.length === 0 && (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-700 mb-2">
                          작업을 등록하려면 먼저 농장을 추가해야 합니다.
                        </p>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            onOpenChange(false);
                            setLocation('/farms?add=farm');
                          }}
                          className="text-blue-700 border-blue-300 hover:bg-blue-100"
                        >
                          농장 추가하러 가기
                        </Button>
                      </div>
                    )}
                  </FormItem>
                )}
              />

              {/* 선택된 농장의 재배환경 표시 - selectedFarm이 있거나 farmId가 설정된 경우 표시 */}
              {(selectedFarm || (form.getValues("farmId") && farms?.find(f => f.id === form.getValues("farmId")))) && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  {(() => {
                    const currentFarm = selectedFarm || farms?.find(f => f.id === form.getValues("farmId"));
                    if (!currentFarm) return null;
                    return (
                      <>
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">재배환경:</span> {currentFarm.environment}
                        </p>
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">이용 가능 이랑:</span> {currentFarm.rowCount}개
                        </p>
                      </>
                    );
                  })()}
                </div>
              )}

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

              {/* 이랑 선택 - selectedFarm이 있거나 farmId가 설정된 경우 표시 */}
              {(() => {
                const formFarmId = form.getValues("farmId");
                const currentFarm = selectedFarm || (formFarmId && farms?.find(f => f.id === formFarmId));
                
                // 디버깅용 로그
                console.log("이랑 선택 조건 체크:", {
                  task: !!task,
                  selectedFarm: !!selectedFarm,
                  formFarmId,
                  farmsLength: farms?.length,
                  currentFarm: !!currentFarm,
                  currentFarmDetails: currentFarm ? {
                    name: currentFarm.name,
                    rowCount: currentFarm.rowCount
                  } : null
                });
                
                if (!currentFarm) {
                  console.log("이랑 선택 필드를 표시하지 않음: currentFarm이 없음");
                  return null;
                }
                
                return (
                  <FormField
                    control={form.control}
                    name="rowNumber"
                    render={({ field }) => {
                      console.log("이랑 번호 Select field.value:", field.value);
                      console.log("이랑 번호 Select 표시값:", field.value?.toString() || "all");
                      
                      // 폼에서 현재 값을 다시 확인
                      const currentRowNumber = form.getValues("rowNumber");
                      console.log("form.getValues('rowNumber'):", currentRowNumber);
                      
                      // field.value가 없으면 form.getValues로 다시 시도
                      const displayValue = field.value?.toString() || currentRowNumber?.toString() || "all";
                      console.log("최종 displayValue:", displayValue);
                      
                      return (
                        <FormItem>
                          <FormLabel>이랑 번호 (선택사항)</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              console.log("이랑 번호 변경:", value);
                              if (value === "all") {
                                field.onChange(undefined); // 전체 이랑 선택 시 undefined
                              } else {
                                field.onChange(value ? parseInt(value) : undefined);
                              }
                            }} 
                            value={displayValue}
                          >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="이랑 번호를 선택해주세요" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="all">전체 이랑</SelectItem>
                            {Array.from({ length: currentFarm.rowCount }, (_, i) => i + 1).map((rowNum) => (
                              <SelectItem key={rowNum} value={rowNum.toString()}>
                                {rowNum}번 이랑
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                        <p className="text-xs text-gray-500">
                          선택하지 않으면 전체 이랑에 작업이 등록됩니다
                        </p>
                      </FormItem>
                    );
                    }}
                  />
                );
              })()}

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

              {/* 종료 날짜(개별등록 또는 수정 모드에서) */}
              {((!task && registrationMode === "individual") || task) && (
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>종료 날짜 {!task ? "*" : "(선택사항)"}</FormLabel>
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

                {/* 수정 모드일 때 삭제 버튼 */}
                {task && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDeleteTask}
                    className="flex-1"
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? "삭제 중..." : "삭제"}
                  </Button>
                )}

                {/* 저장/수정 완료 */}
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={
                    createMutation.isPending ||
                    updateMutation.isPending ||
                    bulkCreateMutation.isPending ||
                    deleteMutation.isPending ||
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
         onOpenChange={handleWorkCalculatorClose}
         selectedCrop={selectedCrop}
         customCropName={customCropName}
         cropSearchTerm={cropSearchTerm}
         baseDate={
           form.getValues("scheduledDate") || format(new Date(), "yyyy-MM-dd")
         }
         onSave={handleWorkCalculatorSave}
         selectedTasks={selectedWorks}
         selectedFarm={selectedFarm}
         selectedRowNumber={form.getValues("rowNumber")}
       />
    </>
  );
}
