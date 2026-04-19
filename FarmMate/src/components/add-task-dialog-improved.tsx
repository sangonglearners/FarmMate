import { useState, useEffect, useMemo } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { CalendarIcon, Check, Search, Calculator, ChevronDown, Plus, Minus } from "lucide-react";
import { format, eachDayOfInterval, addDays } from "date-fns";
import { ko } from "date-fns/locale";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { insertTaskSchema } from "@/shared/types/schema";
import type { InsertTask, Task, Farm, Crop } from "@shared/schema";
import type { FarmEntity } from "@/shared/api/farm.repository";
import { useLocation } from "wouter";
import { useDeleteTask } from "@/features/task-management";
// ⬇ /api 호출 제거
// import { apiRequest } from "@/shared/api/client";

// ⬇ Supabase 유틸 추가
import { saveTask } from "@/shared/api/saveTask";
import { supabase } from "@/shared/api/supabase";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { mustOk } from "@/shared/api/mustOk";
import { useFarms } from "@/features/farm-management";
import { useCrops } from "@/features/crop-management";
import { useAuth } from "@/contexts/AuthContext";
import { useSharedCalendars } from "@/features/calendar-share";

import { z } from "zod";
import { Calendar } from "@/components/ui/calendar";
import WorkCalculatorDialog from "@/components/work-calculator-dialog";
import { useRegistrationSearch, useRegistrationAll } from "@/shared/hooks";
import type { CropSearchResult } from "@/shared/api/server-registration.repository";
import { isBatchRegistrationTaskGroup } from "@/widgets/calendar-grid/model/calendar.utils";
import {
  extractMemoImageUrlsFromText,
  stripMemoImageUrlsFromText,
} from "@/shared/utils/task-memo-images";
import { MemoImageLightbox } from "@/components/memo-image-lightbox";

const formSchema = insertTaskSchema.extend({
  title: z.string().optional(), // 제목을 선택사항으로 변경 (자동 생성)
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

const isKeyCrop = (name: string, variety: string) =>
  KEY_CROPS.some((k) => k.name === name && k.variety === variety);

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
  "기타",
];

interface AddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate?: string;
  selectedEndDate?: string;
  task?: Task | null;
  defaultFarmId?: string;
  defaultRowNumber?: number;
}

export default function AddTaskDialog({
  open,
  onOpenChange,
  selectedDate,
  selectedEndDate,
  task,
  defaultFarmId,
  defaultRowNumber,
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
  const [selectedRegistrationCrop, setSelectedRegistrationCrop] = useState<CropSearchResult | null>(null);
  const [customCropName, setCustomCropName] = useState("");
  const [showKeyCrops, setShowKeyCrops] = useState(false);
  const [showWorkCalculator, setShowWorkCalculator] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState<Crop | null>(null);
  const [selectedFarm, setSelectedFarm] = useState<FarmEntity | null>(null);
  const [, setLocation] = useLocation();
  const [showNoResultsConfirm, setShowNoResultsConfirm] = useState(false);
  const [isCropSelectedFromList, setIsCropSelectedFromList] = useState(false);
  const [showRowDuplicateAlert, setShowRowDuplicateAlert] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState<any>(null);
  const [taskGroup, setTaskGroup] = useState<Task[]>([]);
  const [customTaskType, setCustomTaskType] = useState("");
  const [memoImageUrls, setMemoImageUrls] = useState<string[]>([]);
  const [memoLightboxIndex, setMemoLightboxIndex] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // 농작업 계산기로 적용된 일정 (저장하기 버튼 눌렀을 때 사용)
  const [calculatedTasks, setCalculatedTasks] = useState<InsertTask[] | null>(null);

  // 작물 검색 훅 (Supabase registration 테이블, 300ms debounce + TanStack Query 캐시)
  const { results: cropSearchResults, isLoading: isSearching } = useRegistrationSearch(
    isCropSelectedFromList ? "" : cropSearchTerm
  );
  const { allCrops, isLoading: isAllCropsLoading } = useRegistrationAll();
  // 전체 작물 목록 (검색어 없을 때 브라우즈용, 30분 캐시)

  const { data: farms, isLoading: farmsLoading } = useFarms();

  const { data: crops } = useCrops();

  // 현재 사용자 정보와 공유된 캘린더 정보 가져오기 (권한 체크용)
  const { user } = useAuth();
  const { data: sharedCalendars = [] } = useSharedCalendars();

  // 각 농장의 권한 확인 함수
  const getFarmPermission = (farmId: string) => {
    const farm = farms?.find(f => f.id === farmId);
    if (!farm) return null;

    // 내 농장인지 확인
    if (farm.userId === user?.id) {
      return 'owner';
    }

    // 공유된 캘린더에서 권한 찾기
    const sharedCalendar = sharedCalendars.find(sc => sc.calendarId === farmId);
    return sharedCalendar?.role || null;
  };

  // 작업 등록 가능 여부 확인: 내 농장 또는 editor 권한만 가능
  const canCreateTaskForFarm = (farmId: string) => {
    const permission = getFarmPermission(farmId);
    return permission === 'owner' || permission === 'editor';
  };

  /** 기존 작업 목록 가져오기 (이랑 중복 검사용) */
  const { data: existingTasks } = useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: () => import("@/shared/api/tasks").then(m => m.listTasksRange("2020-01-01", "2030-12-31")),
  });

  const extractRowNumber = (taskItem: Task | any): number | null => {
    if (typeof taskItem?.rowNumber === "number" && !Number.isNaN(taskItem.rowNumber)) {
      return taskItem.rowNumber;
    }

    if (typeof taskItem?.description === "string" && taskItem.description.includes("이랑:")) {
      const match = taskItem.description.match(/이랑:\s*(\d+)번/);
      if (match) {
        const parsed = Number(match[1]);
        return Number.isNaN(parsed) ? null : parsed;
      }
    }

    return null;
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      taskType: "",
      scheduledDate: selectedDate || "",
      endDate: selectedEndDate || selectedDate || "", // 디폴트 값: 작업 날짜와 동일하게 설정
      farmId: "",
      cropId: "",
      environment: "",
      rowNumber: defaultRowNumber,
    },
    mode: "onChange", // 실시간 유효성 검사
  });

  // 작업 날짜가 변경될 때 종료날짜를 자동으로 동일하게 설정
  const watchedScheduledDate = form.watch("scheduledDate");
  useEffect(() => {
    const currentEndDate = form.getValues("endDate");
    const hasCustomSelectedRange =
      Boolean(selectedEndDate) && selectedEndDate !== selectedDate;

    const allowAutoSync =
      (!task && registrationMode === "individual" && !hasCustomSelectedRange) ||
      (task && registrationMode === "individual");
    
    if (
      allowAutoSync &&
      watchedScheduledDate &&
      (!currentEndDate || currentEndDate !== watchedScheduledDate)
    ) {
      form.setValue("endDate", watchedScheduledDate);
    }
  }, [watchedScheduledDate, registrationMode, task, form, selectedDate, selectedEndDate]);

  // 제목 자동 설정: 개별등록일 때만 작물_작업유형 형식 적용 (일괄등록은 작물명만 기본)
  useEffect(() => {
    if (registrationMode !== "individual") return;
    const taskType = form.getValues("taskType");
    const cropName = customCropName || cropSearchTerm;

    if (cropName && taskType) {
      const finalTaskType = taskType === "기타" ? customTaskType : taskType;
      if (finalTaskType) {
        form.setValue("title", `${cropName}_${finalTaskType}`);
      }
    }
  }, [cropSearchTerm, customCropName, customTaskType, form, registrationMode]);

  useEffect(() => {
    if (registrationMode !== "individual") return;
    const taskType = form.getValues("taskType");
    const currentTitle = form.getValues("title");
    const cropName = customCropName || cropSearchTerm;

    if (cropName && taskType) {
      const finalTaskType = taskType === "기타" ? customTaskType : taskType;
      if (finalTaskType) {
        const expectedTitle = `${cropName}_${finalTaskType}`;
        if (currentTitle !== expectedTitle) {
          form.setValue("title", expectedTitle);
        }
      }
    }
  }, [customCropName, cropSearchTerm, customTaskType, form, registrationMode]);

  useEffect(() => {
    if (registrationMode !== "individual") return;
    const taskType = form.watch("taskType");
    const cropName = customCropName || cropSearchTerm;
    if (cropName && taskType) {
      const finalTaskType = taskType === "기타" ? customTaskType : taskType;
      if (finalTaskType) {
        form.setValue("title", `${cropName}_${finalTaskType}`);
      }
    }
  }, [form.watch("taskType"), customCropName, cropSearchTerm, customTaskType, form, registrationMode]);

  const watchedTitleBatchDefault = form.watch("title");
  const watchedCropIdForTitle = form.watch("cropId");

  // 일괄등록(신규): 제목이 비어 있으면 작물 표시명을 제목 입력란에 넣어 디폴트가 보이게 함
  useEffect(() => {
    if (!open || task || registrationMode !== "batch") return;

    let label = "";
    if (selectedCrop?.id && watchedCropIdForTitle === selectedCrop.id) {
      label = selectedCrop.variety
        ? `${selectedCrop.name} (${selectedCrop.variety})`
        : selectedCrop.name;
    } else if (isCropSelectedFromList) {
      label = (customCropName || cropSearchTerm || "").trim();
    }

    if (!label) return;
    if (!(watchedTitleBatchDefault || "").trim()) {
      form.setValue("title", label);
    }
  }, [
    open,
    task,
    registrationMode,
    selectedCrop,
    watchedCropIdForTitle,
    isCropSelectedFromList,
    customCropName,
    cropSearchTerm,
    watchedTitleBatchDefault,
    form,
  ]);

  // 다이얼로그가 열릴 때 상태 초기화
  useEffect(() => {
    if (open) {
      setCustomTaskType("");
      setShowWorkCalculator(false);
    } else {
      setMemoLightboxIndex(null);
    }
  }, [open]);

  // 첫 번째 작업 등록 가능한 농장을 기본값으로 설정
  useEffect(() => {
    if (
      farms &&
      farms.length > 0 &&
      !task &&
      open &&
      !selectedFarm &&
      !defaultFarmId
    ) {
      // 작업 등록 가능한 농장 찾기 (내 농장 또는 editor 권한)
      const availableFarm = farms.find((farm) =>
        canCreateTaskForFarm(farm.id),
      );
      if (availableFarm) {
        setSelectedFarm(availableFarm);
        form.setValue("farmId", availableFarm.id);
        form.setValue("environment", availableFarm.environment || "");
        console.log(
          "작업 등록 가능한 농장이 자동 선택되었습니다:",
          availableFarm.name,
        );
      }
    }
  }, [
    farms,
    task,
    open,
    selectedFarm,
    form,
    user,
    sharedCalendars,
    defaultFarmId,
  ]);

  // 캘린더에서 전달된 기본 농장 설정
  useEffect(() => {
    if (!open || task) return;
    if (!defaultFarmId) return;
    if (!farms || farms.length === 0) return;

    const farm = farms.find((f) => f.id === defaultFarmId);
    if (!farm) return;

    setSelectedFarm(farm);
    form.setValue("farmId", farm.id);
    form.setValue("environment", farm.environment || "");
  }, [defaultFarmId, open, task, farms, form]);

  // 캘린더에서 전달된 기본 이랑 설정
  useEffect(() => {
    if (!open || task) return;
    if (typeof defaultRowNumber === "number") {
      form.setValue("rowNumber", defaultRowNumber);
    } else {
      form.setValue("rowNumber", undefined);
    }
  }, [defaultRowNumber, open, task, form]);

  useEffect(() => {
    if (!open || task) return;
    if (selectedEndDate) {
      form.setValue("endDate", selectedEndDate);
    }
  }, [selectedEndDate, open, task, form]);

  /** 동일 taskGroupId의 모든 작업 (없으면 단일 [task]) */
  const findFullTaskGroup = (currentTask: Task): Task[] => {
    if (!existingTasks || !currentTask.taskGroupId) return [currentTask];
    const members = existingTasks.filter((t) => t.taskGroupId === currentTask.taskGroupId);
    return members.length > 0 ? members : [currentTask];
  };

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
      
      const fullGroup = findFullTaskGroup(task);

      // 일괄등록(파종·육묘·수확 등 서로 다른 작업 유형): 내 농작업 관리 일괄 UI로 수정 (농작업 계산기 자동 오픈 없음)
      if (isBatchRegistrationTaskGroup(fullGroup)) {
        setRegistrationMode("batch");
        setTaskGroup(fullGroup);
        setCalculatedTasks(null);
        setSelectedWorks(
          batchTaskTypes.filter((type) =>
            fullGroup.some((t) => (t as Task).taskType === type),
          ),
        );
        const schedDates = fullGroup
          .map((t) => (t as Task).scheduledDate)
          .filter(Boolean) as string[];
        const baseDate =
          schedDates.length > 0
            ? schedDates.reduce((a, b) => (a < b ? a : b))
            : (task as Task).scheduledDate || "";
        const sorted = [...fullGroup].sort((a, b) => {
          const ia = batchTaskTypes.indexOf((a as Task).taskType);
          const ib = batchTaskTypes.indexOf((b as Task).taskType);
          return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
        });
        const anchorTask = sorted[0] ?? fullGroup[0];
        let taskRowNumber = (anchorTask as Task).rowNumber as number | undefined;
        if (!taskRowNumber && (anchorTask as Task).description?.includes("이랑:")) {
          const match = (anchorTask as Task).description!.match(/이랑:\s*(\d+)번/);
          if (match) taskRowNumber = parseInt(match[1], 10);
        }
        const rawAnchorTitle = ((anchorTask as Task).title || "").trim();
        const batchEditTitle = rawAnchorTitle.includes("_")
          ? rawAnchorTitle.split("_")[0].trim()
          : rawAnchorTitle;
        form.reset({
          title: batchEditTitle,
          description: stripMemoImageUrlsFromText((anchorTask as Task).description || ""),
          taskType: "",
          scheduledDate: baseDate,
          endDate: baseDate,
          farmId: (anchorTask as Task).farmId || "",
          cropId: (anchorTask as Task).cropId || "",
          environment: "",
          rowNumber: taskRowNumber || undefined,
        });
        setMemoImageUrls(extractMemoImageUrlsFromText((anchorTask as Task).description || ""));
        const titleParts = anchorTask.title?.split("_");
        if (titleParts && titleParts.length >= 2) {
          setCropSearchTerm(titleParts[0]);
          setCustomCropName(titleParts[0]);
          setIsCropSelectedFromList(true);
        }
        if (farms && (anchorTask as Task).farmId) {
          const farm = farms.find((f) => f.id === (anchorTask as Task).farmId);
          if (farm) {
            setSelectedFarm(farm);
            form.setValue("farmId", farm.id);
            form.setValue("environment", farm.environment || "");
          }
        } else if (farms?.length) {
          setSelectedFarm(farms[0]);
          form.setValue("farmId", farms[0].id);
          form.setValue("environment", farms[0].environment || "");
        }
        if (crops && (anchorTask as Task).cropId) {
          const crop = crops.find((c) => c.id === (anchorTask as Task).cropId);
          if (crop) {
            setCropSearchTerm(crop.name);
            setSelectedCrop(crop);
            setCustomCropName(crop.name);
            setIsCropSelectedFromList(true);
            const matchedRegCrop =
              allCrops.find((r) => r.품목 === crop.name && r.품종 === crop.variety) ??
              allCrops.find((r) => r.품목 === crop.name);
            if (matchedRegCrop) setSelectedRegistrationCrop(matchedRegCrop);
          }
        }
        setIsCropSelectedFromList(true);
        setTimeout(() => {
          if (taskRowNumber) form.setValue("rowNumber", taskRowNumber);
        }, 100);
        return;
      }

      // 개별등록 날짜 범위(동일 taskType, taskGroupId로 날짜만 연결)
      if (fullGroup.length > 1) {
        setRegistrationMode("individual");
        setTaskGroup(fullGroup);
        // 그룹 전체 날짜 범위 계산 (시작일 = 최소, 종료일 = 최대)
        const allDates = fullGroup.flatMap((t) => [
          (t as any).scheduledDate,
          (t as any).endDate || (t as any).scheduledDate,
        ]);
        const groupStart = allDates.reduce((a, b) => (a < b ? a : b));
        const groupEnd = allDates.reduce((a, b) => (a > b ? a : b));
        const firstTask = fullGroup[0];
        let taskRowNumber = (firstTask as any).rowNumber;
        if (!taskRowNumber && (firstTask as any).description?.includes("이랑:")) {
          const match = (firstTask as any).description.match(/이랑:\s*(\d+)번/);
          if (match) taskRowNumber = parseInt(match[1]);
        }
        form.reset({
          title: firstTask.title || "",
          description: stripMemoImageUrlsFromText((firstTask as any).description || ""),
          taskType: (firstTask as any).taskType || "",
          scheduledDate: groupStart,
          endDate: groupEnd,
          farmId: (firstTask as any).farmId || "",
          cropId: (firstTask as any).cropId || "",
          environment: "",
          rowNumber: taskRowNumber || undefined,
        });
        setMemoImageUrls(extractMemoImageUrlsFromText((firstTask as any).description || ""));
        const titleParts = firstTask.title?.split("_");
        if (titleParts && titleParts.length >= 2) {
          setCropSearchTerm(titleParts[0]);
          setCustomCropName(titleParts[0]);
          setIsCropSelectedFromList(true);
        }
        if (farms && (firstTask as any).farmId) {
          const farm = farms.find((f) => f.id === (firstTask as any).farmId);
          if (farm) {
            setSelectedFarm(farm);
            form.setValue("farmId", farm.id);
            form.setValue("environment", farm.environment || "");
          }
        } else if (farms?.length) {
          setSelectedFarm(farms[0]);
          form.setValue("farmId", farms[0].id);
          form.setValue("environment", farms[0].environment || "");
        }
        if (crops && (firstTask as any).cropId) {
          const crop = crops.find((c) => c.id === (firstTask as any).cropId);
          if (crop) {
            setCropSearchTerm(crop.name);
            setSelectedCrop(crop);
            setCustomCropName(crop.name);
            setIsCropSelectedFromList(true);
          }
        }
        // 수정 모드에서는 항상 검색을 억제
        setIsCropSelectedFromList(true);
        setTimeout(() => {
          if (taskRowNumber) form.setValue("rowNumber", taskRowNumber);
        }, 100);
        return;
      }
      
      setTaskGroup([]); // 단일 작업 수정 시 그룹 초기화
      setRegistrationMode("individual");

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
        description: stripMemoImageUrlsFromText((task as any).description || ""),
        taskType: (task as any).taskType || "",
        scheduledDate: (task as any).scheduledDate || "",
        endDate: (task as any).endDate || (task as any).scheduledDate || "", // 종료날짜가 없으면 시작날짜와 동일하게 설정
        farmId: (task as any).farmId || "",
        cropId: (task as any).cropId || "",
        environment: "",
        rowNumber: taskRowNumber || undefined,
      });
      setMemoImageUrls(extractMemoImageUrlsFromText((task as any).description || ""));
      
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
        setIsCropSelectedFromList(true); // fallback 설정 시에도 불필요한 검색 실행 방지
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
          setCustomCropName(crop.name);
          setIsCropSelectedFromList(true); // 기존 작물 데이터로 설정 시 불필요한 검색 실행 방지
        }
      } else if ((task as any).cropId) {
        // cropId는 있지만 crops 데이터에서 찾을 수 없는 경우
        console.log("crops 데이터에서 작물을 찾을 수 없음. cropId:", (task as any).cropId);
        console.log("사용 가능한 crops:", crops?.map(c => ({ id: c.id, name: c.name })));
      }

      // 수정 모드에서는 항상 검색을 억제 (어떤 경로로 진입해도 불필요한 검색이 실행되지 않도록)
      setIsCropSelectedFromList(true);
      
    } else if (!task && open) {
      const defaultFarm =
        (defaultFarmId && farms?.find((f) => f.id === defaultFarmId)) || null;

      form.reset({
        title: "",
        description: "",
        taskType: "",
        scheduledDate: selectedDate || "",
        endDate: selectedEndDate || selectedDate || "", // 디폴트 값: 작업 날짜와 동일하게 설정
        farmId: defaultFarm?.id || "",
        cropId: "",
        environment: defaultFarm?.environment || "",
        rowNumber: defaultRowNumber ?? undefined,
      });
      setCropSearchTerm("");
      setCustomCropName("");
      setSelectedWorks([]);
      setSelectedCrop(null);
      setIsCropSelectedFromList(false); // 리스트 선택 상태 초기화
      setCalculatedTasks(null); // 농작업 계산기 적용 일정 초기화

      if (defaultFarm) {
        setSelectedFarm(defaultFarm);
      }
      setMemoImageUrls([]);
    }
  }, [task, open, selectedDate, selectedEndDate, crops, farms, form, defaultFarmId, defaultRowNumber, existingTasks]);

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

  // 검색어 변경 시 확인 상태 리셋
  useEffect(() => {
    setShowNoResultsConfirm(false);
  }, [cropSearchTerm]);

  // 내 작물: 농장 연결 여부 상관없이 전체 표시
  const myCrops = useMemo(
    () => crops ?? [],
    [crops]
  );

  const handleWorkToggle = (work: string) => {
    setSelectedWorks((prev) => {
      let newWorks = prev.includes(work) ? prev.filter((w) => w !== work) : [...prev, work];
      
      // 농작업 순서 보장: 파종 → 육묘 → 수확
      const taskOrder = ["파종", "육묘", "수확"];
      return newWorks.sort((a, b) => {
        const indexA = taskOrder.indexOf(a);
        const indexB = taskOrder.indexOf(b);
        return indexA - indexB;
      });
    });
  };

  const handleCropSelect = (cropId: string) => {
    const crop = crops?.find((c) => c.id === cropId);
    if (!crop) return;

    form.setValue("cropId", cropId);
    // 품종이 있으면 "상추 (청상추)" 형식으로 표시
    const displayName = crop.variety ? `${crop.name} (${crop.variety})` : crop.name;
    setCropSearchTerm(displayName);
    setCustomCropName(displayName);
    setSelectedCrop(crop);
    setIsCropSelectedFromList(true); // 검색 결과 드롭다운 숨김

    // registration 작물 데이터 매칭 (일괄등록 농작업 자동 선택용)
    const matchedRegCrop = allCrops.find(
      (r) => r.품목 === crop.name && r.품종 === crop.variety
    ) ?? allCrops.find((r) => r.품목 === crop.name);
    if (matchedRegCrop) {
      setSelectedRegistrationCrop(matchedRegCrop);
      if (registrationMode === "batch") {
        if (matchedRegCrop.파종육묘구분 === "파종") {
          setSelectedWorks(["파종", "수확"]);
        } else if (matchedRegCrop.파종육묘구분 === "육묘") {
          setSelectedWorks(["파종", "육묘", "수확"]);
        }
      }
    }

    const currentFarmId = form.getValues("farmId");
    const cropFarmId = (crop as any).farmId;

    // 캘린더/사용자에서 이미 선택한 농장이 있으면 유지하고, 비어 있을 때만 작물 농장으로 보정
    if (!currentFarmId && cropFarmId) {
      form.setValue("farmId", cropFarmId);
      const farm = farms?.find((f) => f.id === cropFarmId);
      if (farm) {
        form.setValue("environment", farm.environment || "");
        setSelectedFarm(farm);
      }
    }
  };
  
  const handleRegistrationCropSelect = (regCrop: CropSearchResult) => {
    setSelectedRegistrationCrop(regCrop);
    const cropName = `${regCrop.품목} (${regCrop.품종})`;
    setCropSearchTerm(cropName);
    setCustomCropName(cropName);
    setIsCropSelectedFromList(true); // 리스트에서 선택됨을 표시
    
    // 일괄등록 모드일 때 농작업 자동 선택 기능 적용
    if (registrationMode === 'batch') {
      if (regCrop.파종육묘구분 === '파종') {
        setSelectedWorks(['파종', '수확']);
      } else if (regCrop.파종육묘구분 === '육묘') {
        setSelectedWorks(['파종', '육묘', '수확']);
      } else {
        // DB 재배 데이터 없는 작물 - 선택 초기화
        setSelectedWorks([]);
      }
    }
    
    // 해당 작물이 내 핵심 작물에 있으면 cropId 설정
    const matchingCrop = myCrops.find(c => c.name === regCrop.품목 && c.variety === regCrop.품종);
    if (matchingCrop) {
      form.setValue("cropId", matchingCrop.id);
      setSelectedCrop(matchingCrop);

      const currentFarmId = form.getValues("farmId");
      const cropFarmId = (matchingCrop as any).farmId;

      // 이미 고른 농장이 있으면 변경하지 않음
      if (!currentFarmId && cropFarmId) {
        const farm = farms?.find((f) => f.id === cropFarmId);
        if (farm) {
          form.setValue("farmId", cropFarmId);
          form.setValue("environment", farm.environment || "");
          setSelectedFarm(farm);
        }
      }
    } else {
      form.setValue("cropId", "");
      setSelectedCrop(null);
    }
    
    setShowKeyCrops(false);
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
    setIsCropSelectedFromList(true);
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
    setIsCropSelectedFromList(true); // 훅에 빈 검색어 전달 → 결과 자동 숨김
    form.setValue("cropId", ""); // 커스텀 작물
    
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
      
      // 항상 taskApi.createTask를 사용하여 endDate를 제대로 처리
      const { taskApi } = await import("@/shared/api/tasks");
      const memoText = (data as any).description || "";
      const finalDescription = memoImageUrls.length > 0
        ? [memoText, ...memoImageUrls].filter(Boolean).join("\n")
        : memoText;
      const taskToCreate = {
        title: data.title!,
        description: finalDescription,
        taskType: (data as any).taskType || "기타",
        scheduledDate: (data as any).scheduledDate,
        endDate: (data as any).endDate || null, // endDate가 없으면 null로 설정
        farmId: (data as any).farmId || "",
        cropId: finalCropId || "",
        rowNumber: (data as any).rowNumber || null,
        taskGroupId: (data as any).taskGroupId || null,
        completed: 0,
      };
      console.log("taskApi.createTask에 전달할 데이터:", taskToCreate);
      return await taskApi.createTask(taskToCreate);
    },
    onSuccess: async () => {
      // 쿼리 무효화 및 재조회를 기다림 (타이밍 이슈 해결)
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
      await queryClient.refetchQueries({ queryKey: ["tasks"] });

      toast({
        title: "일정이 등록되었습니다.",
        description: "새로운 작업 일정이 추가되었습니다.",
      });
      onOpenChange(false);
    },
    onError: async (e: any) => {
      console.error('❌ 작업 등록 실패:', e);
      
      // 인증 오류인지 확인
      if (e?.message?.includes('사용자가 로그인되어 있지 않습니다') || 
          e?.message?.includes('Unauthorized') ||
          e?.code === 'PGRST301') {
        
        // 현재 로그인 상태 확인
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (!user) {
          toast({
            title: "로그인이 필요합니다",
            description: "작업을 저장하려면 먼저 로그인해주세요. 우측 상단의 로그인 버튼을 클릭하세요.",
            variant: "destructive",
          });
          return;
        }
      }
      
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
      // 메모 텍스트 + 이미지 URL 합쳐서 저장
      const memoText = (data as any).description || "";
      const finalDescription = memoImageUrls.length > 0
        ? [memoText, ...memoImageUrls].filter(Boolean).join("\n")
        : memoText;
      
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
        description: finalDescription,
        taskType: (data as any).taskType || "기타",
        scheduledDate: (data as any).scheduledDate,
        endDate: (data as any).endDate || null, // 종료날짜가 없으면 null로 설정
        farmId: (data as any).farmId ? (data as any).farmId.toString() : "",
        cropId: finalCropId ? finalCropId.toString() : "",
        rowNumber: rowNumber || null,
        taskGroupId: (data as any).taskGroupId || null,
        completed: (data as any).completed || 0,
      });
    },
    onSuccess: async () => {
      // 모든 tasks 관련 쿼리를 무효화하고 즉시 재조회
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
      await queryClient.refetchQueries({ queryKey: ["tasks"] });

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
          endDate: (task as any).endDate || null, // endDate가 없으면 null로 설정
          farmId: (task as any).farmId ? (task as any).farmId.toString() : "",
          cropId: (task as any).cropId ? (task as any).cropId.toString() : "",
          rowNumber: (task as any).rowNumber || null,
          taskGroupId: (task as any).taskGroupId || null,
          completed: 0,
        });
        results.push(result);
      }
      
      return results;
    },
    onSuccess: async () => {
      // 쿼리 무효화 및 재조회를 기다림 (타이밍 이슈 해결)
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
      await queryClient.refetchQueries({ queryKey: ["tasks"] });

      toast({
        title: "일정이 등록되었습니다.",
        description: "작업 일정이 추가되었습니다.",
      });
      onOpenChange(false);
    },
    onError: async (e: any) => {
      console.error('❌ 일괄 작업 등록 실패:', e);
      
      // 인증 오류인지 확인
      if (e?.message?.includes('사용자가 로그인되어 있지 않습니다') || 
          e?.message?.includes('Unauthorized') ||
          e?.code === 'PGRST301') {
        
        // 현재 로그인 상태 확인
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (!user) {
          toast({
            title: "로그인이 필요합니다",
            description: "작업을 저장하려면 먼저 로그인해주세요. 우측 상단의 로그인 버튼을 클릭하세요.",
            variant: "destructive",
          });
          return;
        }
      }
      
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
      
      const memoText = form.getValues("description") || "";
      const finalDescription = memoImageUrls.length > 0
        ? [memoText, ...memoImageUrls].filter(Boolean).join("\n")
        : memoText;

      let tasksToSave: InsertTask[];

      if (calculatedTasks && calculatedTasks.length > 0) {
        // 농작업 계산기로 적용된 일정 사용 (제목은 작물명만 기본)
        console.log("농작업 계산기 적용 일정으로 저장:", calculatedTasks.length, "개");
        const batchTitle = (form.getValues("title") || "").trim() || cropName;
        tasksToSave = calculatedTasks.map((t) => ({ ...t, title: batchTitle }));
      } else {
        // 농작업 계산기 미사용 시 자동 계산 (계산기와 동일한 로직)
        // 일괄 수정 시 삭제 직후 existingTasks가 비어 있을 수 있어 task 기준으로 그룹 ID 유지
        const reuseBatchGroupId =
          task?.taskGroupId && registrationMode === "batch"
            ? String(task.taskGroupId)
            : null;
        const taskGroupId =
          reuseBatchGroupId ||
          `task-group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const cropTotalDuration = selectedRegistrationCrop?.총재배기간 || 70;

        const schedules: { taskType: string; startDate: string; endDate: string }[] = [];

        selectedWorks.forEach((taskType) => {
          let schedStartDate: string;
          let schedEndDate: string;

          if (
            selectedWorks.length === 2 &&
            selectedWorks.includes("파종") &&
            selectedWorks.includes("수확")
          ) {
            if (taskType === "파종") {
              schedStartDate = startDate;
              schedEndDate = startDate;
            } else if (taskType === "수확") {
              const harvestDate = addDays(new Date(startDate), cropTotalDuration - 1);
              schedStartDate = format(harvestDate, "yyyy-MM-dd");
              schedEndDate = schedStartDate;
            } else {
              schedStartDate = startDate;
              schedEndDate = startDate;
            }
          } else if (
            selectedWorks.length === 3 &&
            selectedWorks.includes("파종") &&
            selectedWorks.includes("육묘") &&
            selectedWorks.includes("수확")
          ) {
            const middlePoint = Math.floor(cropTotalDuration / 2);
            if (taskType === "파종") {
              schedStartDate = startDate;
              schedEndDate = startDate;
            } else if (taskType === "육묘") {
              const seedlingStart = addDays(new Date(startDate), middlePoint - 1);
              schedStartDate = format(seedlingStart, "yyyy-MM-dd");
              const seedlingEnd = addDays(new Date(startDate), cropTotalDuration - 2);
              schedEndDate = format(seedlingEnd, "yyyy-MM-dd");
            } else if (taskType === "수확") {
              const harvestDate = addDays(new Date(startDate), cropTotalDuration - 1);
              schedStartDate = format(harvestDate, "yyyy-MM-dd");
              schedEndDate = schedStartDate;
            } else {
              schedStartDate = startDate;
              schedEndDate = startDate;
            }
          } else {
            schedStartDate = startDate;
            schedEndDate = startDate;
          }

          schedules.push({ taskType, startDate: schedStartDate, endDate: schedEndDate });
        });

        tasksToSave = [];
        schedules.forEach((schedule) => {
          const [sy, sm, sd] = schedule.startDate.split("-").map(Number);
          const [ey, em, ed] = schedule.endDate.split("-").map(Number);
          const sDate = new Date(sy, sm - 1, sd);
          const eDate = new Date(ey, em - 1, ed);
          const datesInRange = eachDayOfInterval({ start: sDate, end: eDate });

          datesInRange.forEach((date) => {
            const dateString = format(date, "yyyy-MM-dd");
            tasksToSave.push({
              title: (form.getValues("title") || "").trim() || cropName,
              description: finalDescription,
              taskType: schedule.taskType,
              scheduledDate: dateString,
              endDate: dateString,
              farmId: form.getValues("farmId") || "",
              cropId: finalCropId || "",
              rowNumber: rowNumber || undefined,
              taskGroupId,
            } as InsertTask);
          });
        });

        console.log("자동 계산으로 생성될 작업들 (총재배기간:", cropTotalDuration, "일):", tasksToSave);
      }

      bulkCreateMutation.mutate(tasksToSave);
    } else {
      // individual: 한 작업을 날짜 범위로 (하나의 작업으로 시작일과 종료일만 저장)
      console.log("🔹 개별등록 모드 시작", {
        startDate,
        endDate: form.getValues("endDate"),
        farmId: form.getValues("farmId"),
        taskType: form.getValues("taskType"),
        cropId: form.getValues("cropId"),
        title: form.getValues("title")
      });
      
      const endDate = (form.getValues("endDate") as string) || "";
      if (!startDate || !endDate) {
        console.log("❌ 날짜가 없음", { startDate, endDate });
        toast({
          title: "시작/종료 날짜를 모두 선택해주세요",
          variant: "destructive",
        });
        return;
      }
      if (!form.getValues("farmId")) {
        console.log("❌ 농장이 선택되지 않음");
        toast({ title: "농장을 선택해주세요", variant: "destructive" });
        return;
      }
      
      const work = form.getValues("taskType") || "";
      if (!work) {
        console.log("❌ 작업 유형이 없음");
        toast({ title: "작업 유형을 선택해주세요", variant: "destructive" });
        return;
      }
      
      const rowNumber = form.getValues("rowNumber");
      
      // 작물 ID 결정 로직 개선 (일괄등록과 동일하게)
      let finalCropId = form.getValues("cropId");
      if (!finalCropId && selectedCrop?.id) {
        finalCropId = selectedCrop.id;
        console.log("개별등록에서 selectedCrop.id 사용:", finalCropId);
      }
      
      // 날짜별로 개별 Task 생성 (날짜 범위가 다른 경우)
      const finalTaskType = work === "기타" ? customTaskType : work;
      const finalTitle = form.getValues("title") || `${cropName}_${finalTaskType}`;
      
      const memoText2 = form.getValues("description") || "";
      const finalDescription2 = memoImageUrls.length > 0
        ? [memoText2, ...memoImageUrls].filter(Boolean).join("\n")
        : memoText2;
      
      // 시작일과 종료일 파싱 (타임존 문제 방지)
      const [sYear, sMonth, sDay] = startDate.split('-').map(Number);
      const [eYear, eMonth, eDay] = endDate.split('-').map(Number);
      const parsedStartDate = new Date(sYear, sMonth - 1, sDay);
      const parsedEndDate = new Date(eYear, eMonth - 1, eDay);
      
      // 날짜 범위가 다른 경우 날짜별로 개별 Task 생성
      const tasks: InsertTask[] = [];
      
      if (startDate !== endDate) {
        // 날짜 범위가 있는 경우: 날짜별로 개별 Task 생성
        const taskGroupId = `task-group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const datesInRange = eachDayOfInterval({ start: parsedStartDate, end: parsedEndDate });
        
        datesInRange.forEach((date) => {
          const dateString = format(date, "yyyy-MM-dd");
          tasks.push({
            title: finalTitle,
            description: finalDescription2,
            taskType: finalTaskType,
            scheduledDate: dateString, // 해당 날짜
            endDate: dateString, // 개별 날짜이므로 시작일과 동일
            farmId: form.getValues("farmId") || "",
            cropId: finalCropId || "",
            rowNumber: rowNumber || undefined,
            taskGroupId: taskGroupId, // 같은 그룹 ID로 연결 (캘린더 연속 박스용)
          } as InsertTask);
        });
        
        console.log(`✅ 개별등록으로 ${datesInRange.length}개 Task 생성 (${startDate} ~ ${endDate}), taskGroupId: ${taskGroupId}`);
      } else {
        // 시작일과 종료일이 같은 경우: 단일 Task 생성
        tasks.push({
          title: finalTitle,
          description: finalDescription2,
          taskType: finalTaskType,
          scheduledDate: startDate,
          endDate: endDate,
          farmId: form.getValues("farmId") || "",
          cropId: finalCropId || "",
          rowNumber: rowNumber || undefined,
        });
        
        console.log("✅ 개별등록으로 단일 작업 생성:", tasks[0]);
      }
      
      // 일괄등록과 동일한 방식으로 bulkCreateMutation 사용
      bulkCreateMutation.mutate(tasks);
    }
  };

  const handleWorkCalculatorSave = (tasks: InsertTask[]) => {
    console.log("WorkCalculator 일정 적용:", tasks);
    setCalculatedTasks(tasks);
    toast({
      title: "일정이 적용되었습니다.",
      description: `${tasks.length}개의 작업 일정이 준비되었습니다. 저장하기 버튼을 눌러 등록하세요.`,
    });
  };

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    console.log("🔹 onSubmit 호출됨", { registrationMode, data });
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

    // 권한 체크: 작업 등록 가능한 농장만 제출 가능
    if (!canCreateTaskForFarm(data.farmId)) {
      toast({
        title: "권한이 없습니다",
        description: "이 농장에는 작업을 등록할 권한이 없습니다. (내 농장 또는 전체 허용 권한 필요)",
        variant: "destructive",
      });
      return;
    }

    const startDate = data.scheduledDate;
    const endDate = data.endDate;
    const shouldValidateRange =
      registrationMode === "individual" && !!startDate && !!endDate;

    if (shouldValidateRange && new Date(startDate) > new Date(endDate)) {
      toast({
        title: "날짜 범위를 확인해주세요",
        description: "종료 날짜는 시작 날짜와 같거나 이후여야 합니다.",
        variant: "destructive",
      });
      return;
    }

    // 이랑 번호 필수 검증
    if (!task && !data.rowNumber) {
      toast({
        title: "이랑 번호를 선택해주세요",
        description: "특정 이랑을 반드시 선택해야 등록 가능합니다.",
        variant: "destructive",
      });
      form.setError("rowNumber", {
        type: "manual",
        message: "이랑 번호를 선택해주세요",
      });
      return;
    }

    // 개별등록에서 기타 옵션 선택 시 텍스트 입력 검증
    if (!task && registrationMode === "individual" && data.taskType === "기타" && !customTaskType.trim()) {
      toast({
        title: "기타 농작업명을 입력해주세요",
        description: "기타를 선택했을 때는 농작업명을 직접 입력해야 합니다.",
        variant: "destructive",
      });
      return;
    }

    // 이랑 중복 체크 (수정 모드가 아닐 때만)
    if (!task && data.rowNumber) {
      const toDate = (value?: string | null) => {
        if (!value) return null;
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
      };

      const newStartDate = toDate(data.scheduledDate);
      const newEndDate = toDate(data.endDate) ?? newStartDate;

      const isDuplicate = existingTasks?.some((existingTask) => {
        if (existingTask.farmId !== data.farmId) return false;

        const existingRowNumber = extractRowNumber(existingTask);
        if (existingRowNumber !== data.rowNumber) return false;

        const existingStartDate = toDate(existingTask.scheduledDate);
        if (!existingStartDate || !newStartDate || !newEndDate) return false;

        const existingEndDate = toDate(existingTask.endDate) ?? existingStartDate;

        // 날짜 범위가 겹치는지 확인 (동일 기간에만 중복 경고)
        return existingStartDate <= newEndDate && existingEndDate >= newStartDate;
      });

      if (isDuplicate) {
        setPendingSubmitData(taskData);
        setShowRowDuplicateAlert(true);
        return;
      }
    }

    // 중복이 아니거나 수정 모드인 경우 계속 진행
    proceedWithSubmit(taskData);
  };

  // 실제 제출 로직
  const proceedWithSubmit = async (taskData: any) => {
    const submitGroup =
      task?.taskGroupId && existingTasks
        ? existingTasks.filter((t) => t.taskGroupId === task.taskGroupId)
        : task
          ? [task]
          : [];

    // 일괄등록(작업 유형 복수): 기존 그룹 삭제 후 동일 taskGroupId로 일괄 UI 로직으로 재생성
    if (task && isBatchRegistrationTaskGroup(submitGroup)) {
      try {
        for (const t of submitGroup) {
          await deleteMutation.mutateAsync(t.id.toString());
        }
        createBatchTasks();
      } catch (err) {
        console.error("일괄 그룹 수정 중 오류:", err);
        toast({
          title: "수정 실패",
          description: "작업 수정 중 오류가 발생했습니다.",
          variant: "destructive",
        });
      }
      return;
    }

    // 여러 일자로 등록된 그룹 수정: 기존 그룹 삭제 후 새 날짜 범위로 재생성 (개별 등록과 동일한 방식)
    if (task && submitGroup.length > 1 && !isBatchRegistrationTaskGroup(submitGroup)) {
      const startDate = taskData.scheduledDate as string;
      const endDate = (taskData.endDate || startDate) as string;
      const taskGroupId = (task as any).taskGroupId as string;
      const cropName =
        customCropName ||
        crops?.find((c) => c.id === taskData.cropId)?.name ||
        "작물";
      let finalCropId = taskData.cropId;
      if (!finalCropId && selectedCrop?.id) finalCropId = selectedCrop.id;
      const work = taskData.taskType || "";
      const finalTaskType = work === "기타" ? customTaskType : work;
      const finalTitle = taskData.title || `${cropName}_${finalTaskType}`;
      const memoText = (taskData.description || "") as string;
      const finalDescription =
        memoImageUrls.length > 0
          ? [memoText, ...memoImageUrls].filter(Boolean).join("\n")
          : memoText;
      const rowNumber = taskData.rowNumber;

      const [sYear, sMonth, sDay] = startDate.split("-").map(Number);
      const [eYear, eMonth, eDay] = endDate.split("-").map(Number);
      const parsedStartDate = new Date(sYear, sMonth - 1, sDay);
      const parsedEndDate = new Date(eYear, eMonth - 1, eDay);
      const datesInRange = eachDayOfInterval({
        start: parsedStartDate,
        end: parsedEndDate,
      });
      const newTasks: InsertTask[] = datesInRange.map((date) => {
        const dateString = format(date, "yyyy-MM-dd");
        return {
          title: finalTitle,
          description: finalDescription,
          taskType: finalTaskType,
          scheduledDate: dateString,
          endDate: dateString,
          farmId: taskData.farmId || "",
          cropId: finalCropId || "",
          rowNumber: rowNumber ?? undefined,
          taskGroupId: taskGroupId,
        } as InsertTask;
      });

      try {
        for (const t of submitGroup) {
          await deleteMutation.mutateAsync(t.id.toString());
        }
        bulkCreateMutation.mutate(newTasks);
      } catch (err) {
        console.error("그룹 수정 중 오류:", err);
        toast({
          title: "수정 실패",
          description: "작업 수정 중 오류가 발생했습니다.",
          variant: "destructive",
        });
      }
      return;
    }

    if (task) {
      console.log("🔹 수정 모드 실행");
      updateMutation.mutate(taskData as InsertTask);
      return;
    }

    if (registrationMode === "batch" || registrationMode === "individual") {
      console.log("🔹 createBatchTasks 호출");
      createBatchTasks();
      return;
    }

    // 단건
    console.log("🔹 단건 등록");
    createMutation.mutate(taskData as InsertTask);
  };

  const openWorkCalculator = () => {
    const cropOk = selectedCrop || (customCropName || cropSearchTerm || "").trim();
    if (!cropOk) {
      toast({ title: "작물을 선택해주세요", variant: "destructive" });
      return;
    }
    const farm =
      selectedFarm || farms?.find((f) => f.id === form.getValues("farmId")) || null;
    if (!farm) {
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
  const handleDeleteTask = () => {
    if (!task?.id) return;
    setShowDeleteConfirm(true);
  };

  const handleConfirmDeleteTask = async () => {
    if (!task?.id) return;
    try {
      await deleteMutation.mutateAsync(task.id.toString());
      onOpenChange(false);
    } catch (error) {
      // 에러는 hook에서 toast로 처리됨
    }
  };

  // ----- 이미지 업로드 (메모 옆 + 버튼) -----
  const fileInputRefId = "memo-image-file-input";
  const handlePickImage = () => {
    const el = document.getElementById(fileInputRefId) as HTMLInputElement | null;
    el?.click();
  };

  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "로그인이 필요합니다", description: "이미지를 업로드하려면 로그인해주세요.", variant: "destructive" });
        return;
      }
      const bucket = "task-attachments";
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
        contentType: file.type || "image/jpeg",
        upsert: false,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
      const url = pub.publicUrl;
      setMemoImageUrls((prev) => [...prev, url]);
      toast({ title: "이미지 업로드 완료", description: "메모에 이미지 링크가 추가되었습니다." });
    } catch (err: any) {
      console.error("이미지 업로드 실패:", err);
      toast({ title: "이미지 업로드 실패", description: err?.message || "잠시 후 다시 시도해주세요.", variant: "destructive" });
    } finally {
      // 같은 파일 재선택 가능하도록 reset
      if (e.target) e.target.value = "";
    }
  };

  return (
    <>
      <Dialog
        open={open && !showWorkCalculator}
        onOpenChange={(next) => {
          if (!next && memoLightboxIndex !== null) return;
          onOpenChange(next);
        }}
        modal={false}
      >
        <DialogContent
          aria-describedby={undefined}
          className="w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto"
        >
          <DialogHeader>
            <DialogTitle>내 농작업 관리</DialogTitle>
            <p className="text-sm text-gray-600">
              작물별 농작업 프로세스 한번에 등록(일괄 등록) 원하는 작업만 선별적으로 등록(개별 등록)
              {task ? " · 등록했던 방식으로 열리며, 내용만 수정할 수 있습니다." : ""}
            </p>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* 등록 방식 선택 (수정 시에는 원래 등록 방식만 표시, 변경 불가) */}
              <div className="space-y-3">
                <Label>등록 방식</Label>
                <div
                  className={`flex bg-gray-100 rounded-lg p-1 ${task ? "opacity-90" : ""}`}
                  aria-disabled={!!task}
                >
                  <button
                    type="button"
                    id="bulk-register-btn"
                    disabled={!!task}
                    onClick={() => {
                      setRegistrationMode("batch");
                      const c = (customCropName || cropSearchTerm || "").trim();
                      if (!task && c) form.setValue("title", c);
                    }}
                    className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors disabled:cursor-not-allowed ${
                      registrationMode === "batch"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    일괄등록
                  </button>
                  <button
                    type="button"
                    disabled={!!task}
                    onClick={() => setRegistrationMode("individual")}
                    className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors disabled:cursor-not-allowed ${
                      registrationMode === "individual"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    개별등록
                  </button>
                </div>
              </div>

              {/* 작물 선택 */}
              <div className="space-y-3">
                <Label>작물 *</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="작물명을 입력하세요"
                    value={cropSearchTerm || ""}
                    onChange={(e) => {
                      console.log("작물 입력 필드 변경:", {
                        이전값: cropSearchTerm,
                        새로운값: e.target.value,
                        이전CustomCropName: customCropName
                      });
                      
                      setCropSearchTerm(e.target.value);
                      setIsCropSelectedFromList(false); // 직접 입력 시 리스트 선택 상태 해제
                      // handleCustomCropInput 호출하지 않음 - 검색 결과 초기화 방지
                    }}
                    className="pl-10"
                  />
                </div>

                {/* 서버 검색 결과 표시 */}
                {cropSearchTerm && cropSearchResults.length > 0 && !isCropSelectedFromList && (
                  <div className="max-h-48 overflow-y-auto border rounded-md p-2">
                    {cropSearchResults.map((searchCrop) => {
                      return (
                        <button
                          key={searchCrop.id}
                          type="button"
                          onClick={() => handleRegistrationCropSelect(searchCrop)}
                          className="w-full text-left p-2 hover:bg-gray-50 rounded text-sm"
                        >
                          <span className="font-medium">
                            {searchCrop.품목}
                          </span>
                          <span className="text-sm text-gray-500 ml-2">
                            ({searchCrop.품종})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* 검색 중 표시 */}
                {cropSearchTerm && isSearching && !isCropSelectedFromList && (
                  <div className="p-2 text-center text-sm text-gray-500">
                    작물을 검색 중입니다...
                  </div>
                )}

                {/* 검색 결과가 없을 때 */}
                {cropSearchTerm && cropSearchResults.length === 0 && !isSearching && !showNoResultsConfirm && !isCropSelectedFromList && (
                  <div className="border rounded-md p-4 bg-yellow-50">
                    <p className="text-sm text-gray-700 mb-3">
                      검색 결과가 없습니다. 그래도 "{cropSearchTerm}"로 작물을 등록하시겠습니까?
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setCropSearchTerm("");
                          setCustomCropName("");
                        }}
                      >
                        취소
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          setCustomCropName(cropSearchTerm);
                          setShowNoResultsConfirm(true);
                        }}
                      >
                        등록하기
                      </Button>
                    </div>
                  </div>
                )}

                {showNoResultsConfirm && (
                  <p className="text-xs text-green-600">✓ "{customCropName}"로 등록됩니다</p>
                )}

                {/* 작물 목록 (검색어 없을 때) */}
                {!cropSearchTerm && !isCropSelectedFromList && (
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
                      <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto border rounded-md p-2">
                        {myCrops.length > 0 && (
                          <>
                            <div className="text-xs text-gray-500 font-medium px-2">내 작물</div>
                            {myCrops.map((crop) => (
                              <button
                                key={crop.id}
                                type="button"
                                onClick={() => handleCropSelect(crop.id)}
                                className="w-full text-left p-2 hover:bg-gray-50 rounded text-sm"
                              >
                                <span className="font-medium">⭐ {crop.name}</span>
                                {crop.variety && (
                                  <span className="text-sm text-gray-500 ml-2">({crop.variety})</span>
                                )}
                              </button>
                            ))}
                          </>
                        )}
                        {/* 전체 작물 */}
                        <div className="text-xs text-gray-500 font-medium px-2">
                          전체 작물
                          {isAllCropsLoading && <span className="ml-2">불러오는 중...</span>}
                        </div>
                        {allCrops.map((regCrop) => (
                          <button
                            key={regCrop.id}
                            type="button"
                            onClick={() => handleRegistrationCropSelect(regCrop)}
                            className="w-full text-left p-2 hover:bg-gray-50 rounded text-sm"
                          >
                            <span className="font-medium">
                              {regCrop.품목}
                            </span>
                            <span className="text-sm text-gray-500 ml-2">({regCrop.품종})</span>
                          </button>
                        ))}
                        {!isAllCropsLoading && allCrops.length === 0 && (
                          <p className="text-sm text-gray-500 text-center py-4">
                            등록된 작물이 없습니다.<br />
                            위 검색창에서 작물을 검색해주세요.
                          </p>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {registrationMode === 'batch' && selectedRegistrationCrop &&
                  selectedRegistrationCrop.파종육묘구분 == null && selectedRegistrationCrop.총재배기간 == null && (
                  <div className="rounded-md bg-yellow-50 border border-yellow-200 px-3 py-2 text-xs text-yellow-800">
                    ⚠️ 이 작물은 재배 기간 데이터가 없어 일괄등록 자동 계산을 사용할 수 없습니다.
                    농작업과 날짜를 직접 입력하거나, <span className="font-medium">개별등록</span>을 사용해 주세요.
                  </div>
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
                          // 권한 체크: 작업 등록 가능한 농장만 선택 가능
                          if (!canCreateTaskForFarm(value)) {
                            toast({
                              title: "권한이 없습니다",
                              description: "이 농장에는 작업을 등록할 권한이 없습니다. (내 농장 또는 전체 허용 권한 필요)",
                              variant: "destructive",
                            });
                            return;
                          }
                          
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
                          farms?.map((farm) => {
                            const canCreate = canCreateTaskForFarm(farm.id);
                            const permission = getFarmPermission(farm.id);
                            const permissionLabel = permission === 'owner' 
                              ? '내 농장' 
                              : permission === 'editor' 
                              ? '전체 허용' 
                              : permission === 'commenter' 
                              ? '댓글 허용' 
                              : permission === 'viewer' 
                              ? '읽기 허용' 
                              : '';
                            
                            return (
                              <SelectItem 
                                key={farm.id} 
                                value={farm.id}
                                disabled={!canCreate}
                                className={!canCreate ? "opacity-50 cursor-not-allowed" : ""}
                              >
                                <span className={!canCreate ? "text-gray-400" : ""}>
                                  {farm.name}
                                  {permissionLabel && ` [${permissionLabel}]`}
                                </span>
                              </SelectItem>
                            );
                          })
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
              {registrationMode === "batch" ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="mb-0">농작업 다중 선택 *</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 h-8 px-2 text-xs gap-1"
                      onClick={openWorkCalculator}
                      disabled={
                        !(
                          (selectedCrop || (customCropName || cropSearchTerm || "").trim()) &&
                          (selectedFarm || farms?.find((f) => f.id === form.getValues("farmId")))
                        )
                      }
                    >
                      <Calculator className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">농작업 계산기로 가기</span>
                      <span className="sm:hidden">계산기</span>
                    </Button>
                  </div>
                  {selectedRegistrationCrop &&
                    selectedRegistrationCrop.파종육묘구분 == null &&
                    selectedRegistrationCrop.총재배기간 == null ? (
                    <div className="rounded-md bg-yellow-50 border border-yellow-200 px-3 py-2 text-xs text-yellow-800">
                      ⚠️ 재배 기간 데이터가 없어 자동 선택이 불가합니다. 농작업을 직접 선택해 주세요.
                    </div>
                  ) : null}
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
                <div className="space-y-3">
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
                  
                  {/* 기타 옵션 선택 시 텍스트 입력 필드 */}
                  {form.watch("taskType") === "기타" && (
                    <div className="space-y-2">
                      <Label>농작업명 입력 *</Label>
                      <Input
                        placeholder="농작업명을 입력하세요"
                        value={customTaskType}
                        onChange={(e) => setCustomTaskType(e.target.value)}
                      />
                    </div>
                  )}
                </div>
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
                          <FormLabel>이랑 번호 *</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              console.log("이랑 번호 변경:", value);
                              field.onChange(value ? parseInt(value) : undefined);
                            }} 
                            value={field.value?.toString() || ""}
                          >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="이랑 번호를 선택해주세요 *" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Array.from({ length: currentFarm.rowCount }, (_, i) => i + 1).map((rowNum) => (
                              <SelectItem key={rowNum} value={rowNum.toString()}>
                                {rowNum}번 이랑
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
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
                    <FormLabel>제목 (선택사항)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="작업 제목을 입력하세요 (비워두면 자동 생성)" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 시작 날짜 */}
              <FormField
                control={form.control}
                name="scheduledDate"
                render={({ field }) => {
                  const [open, setOpen] = useState(false);
                  return (
                    <FormItem>
                      <FormLabel>작업 날짜 *</FormLabel>
                      <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                          <FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full pl-3 text-left font-normal"
                            >
                              {field.value ? (() => {
                                // 문자열 날짜를 로컬 타임존으로 파싱하여 표시
                                const [year, month, day] = field.value.split('-').map(Number);
                                const date = new Date(year, month - 1, day);
                                return format(date, "yyyy년 MM월 dd일", { locale: ko });
                              })() : (
                                <span>날짜를 선택해주세요</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </DialogTrigger>
                        <DialogContent
                          aria-describedby={undefined}
                          className="w-auto p-6 flex items-center justify-center"
                        >
                          <Calendar
                            mode="single"
                            selected={field.value ? (() => {
                              // 문자열 날짜를 로컬 타임존으로 파싱 (YYYY-MM-DD 형식)
                              const [year, month, day] = field.value.split('-').map(Number);
                              return new Date(year, month - 1, day);
                            })() : undefined}
                            onSelect={(date) => {
                              if (date) {
                                // 로컬 타임존의 날짜를 직접 포맷팅하여 타임존 문제 방지
                                const year = date.getFullYear();
                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                const day = String(date.getDate()).padStart(2, '0');
                                const dateString = `${year}-${month}-${day}`;
                                console.log("시작 날짜 선택:", dateString, "선택한 날짜:", date);
                                field.onChange(dateString);
                                setOpen(false);
                              }
                            }}
                            initialFocus
                          />
                        </DialogContent>
                      </Dialog>
                      <FormMessage />
                      {registrationMode === "batch" && (
                        <p className="text-xs text-muted-foreground mt-1">
                          농작업별 세부 작업 일정은 하단의 농작업 계산기에서 선택 가능합니다
                        </p>
                      )}
                    </FormItem>
                  );
                }}
              />

              {/* 종료 날짜(개별등록 또는 수정 모드에서) */}
              {registrationMode === "individual" && (
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => {
                    const [open, setOpen] = useState(false);
                    const scheduledValue = form.getValues("scheduledDate");
                    const minEndDate = scheduledValue ? new Date(scheduledValue) : null;
                    const normalizeDate = (date: Date) => {
                      const normalized = new Date(date);
                      normalized.setHours(0, 0, 0, 0);
                      return normalized;
                    };
                    return (
                      <FormItem>
                        <FormLabel>종료 날짜 {!task ? "*" : "(선택사항)"}</FormLabel>
                        <Dialog open={open} onOpenChange={setOpen}>
                          <DialogTrigger asChild>
                            <FormControl>
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full pl-3 text-left font-normal"
                              >
                                {field.value ? (() => {
                                  // 문자열 날짜를 로컬 타임존으로 파싱하여 표시
                                  const [year, month, day] = field.value.split('-').map(Number);
                                  const date = new Date(year, month - 1, day);
                                  return format(date, "yyyy년 MM월 dd일", { locale: ko });
                                })() : (
                                  <span>종료 날짜를 선택해주세요</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </DialogTrigger>
                          <DialogContent
                            aria-describedby={undefined}
                            className="w-auto p-6 flex items-center justify-center"
                          >
                            <Calendar
                              mode="single"
                              selected={field.value ? (() => {
                                // 문자열 날짜를 로컬 타임존으로 파싱 (YYYY-MM-DD 형식)
                                const [year, month, day] = field.value.split('-').map(Number);
                                return new Date(year, month - 1, day);
                              })() : undefined}
                              onSelect={(date) => {
                                if (date) {
                                  // 로컬 타임존의 날짜를 직접 포맷팅하여 타임존 문제 방지
                                  const year = date.getFullYear();
                                  const month = String(date.getMonth() + 1).padStart(2, '0');
                                  const day = String(date.getDate()).padStart(2, '0');
                                  const dateString = `${year}-${month}-${day}`;
                                  console.log("종료 날짜 선택:", dateString, "선택한 날짜:", date);
                                  field.onChange(dateString);
                                  setOpen(false);
                                }
                              }}
                              disabled={(date) => {
                                if (!minEndDate) return false;
                                const targetDate = normalizeDate(date);
                                return targetDate < normalizeDate(minEndDate);
                              }}
                              initialFocus
                            />
                          </DialogContent>
                        </Dialog>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              )}

              {/* 메모 */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>메모 (선택사항)</FormLabel>
                      <div className="flex items-center gap-2">
                        <input
                          id={fileInputRefId}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageSelected}
                        />
                        <Button type="button" size="sm" variant="outline" onClick={handlePickImage} title="이미지 추가">
                          <Plus className="w-4 h-4 mr-1" /> 추가
                        </Button>
                      </div>
                    </div>
                    <FormControl>
                      <Textarea
                        placeholder="예시 : 작물 kg"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    {memoImageUrls.length > 0 && (
                      <div
                        className="mt-2 grid grid-cols-4 gap-2"
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        {memoImageUrls.map((url, idx) => (
                          <div key={idx} className="relative border rounded overflow-hidden group">
                            <button
                              type="button"
                              className="block w-full p-0 border-0 bg-transparent cursor-pointer"
                              aria-label={`메모 이미지 ${idx + 1} 크게 보기`}
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setMemoLightboxIndex(idx);
                              }}
                            >
                              <img
                                src={url}
                                alt=""
                                className="w-full h-20 object-cover pointer-events-none"
                              />
                            </button>
                            <button
                              type="button"
                              aria-label="이미지 삭제"
                              title="이미지 삭제"
                              className="absolute top-1 right-1 z-10 bg-white/90 hover:bg-white text-gray-700 hover:text-red-600 border border-gray-300 rounded-full p-1 shadow-sm"
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setMemoImageUrls((prev) => prev.filter((_, i) => i !== idx));
                              }}
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex space-x-2 sticky bottom-0 bg-white pt-4 border-t">
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
                  style={{ touchAction: 'manipulation' }}
                  disabled={
                    createMutation.isPending ||
                    updateMutation.isPending ||
                    bulkCreateMutation.isPending ||
                    deleteMutation.isPending
                  }
                  onTouchStart={(e) => {
                    // iOS에서 터치 이벤트로 form submit이 제대로 작동하도록 함
                    e.stopPropagation();
                    e.preventDefault();
                    console.log("💾 저장하기 버튼 터치됨 (iOS)", {
                      registrationMode,
                      farmId: form.getValues("farmId"),
                      taskType: form.getValues("taskType"),
                      scheduledDate: form.getValues("scheduledDate"),
                      endDate: form.getValues("endDate"),
                    });
                    // iOS에서 명시적으로 form submit 호출
                    if (!createMutation.isPending && 
                        !updateMutation.isPending && 
                        !bulkCreateMutation.isPending && 
                        !deleteMutation.isPending) {
                      form.handleSubmit(onSubmit)();
                    }
                  }}
                  onClick={(e) => {
                    console.log("💾 저장하기 버튼 클릭됨", {
                      registrationMode,
                      farmId: form.getValues("farmId"),
                      taskType: form.getValues("taskType"),
                      scheduledDate: form.getValues("scheduledDate"),
                      endDate: form.getValues("endDate"),
                      formValues: form.getValues()
                    });
                    // 클릭 이벤트도 명시적으로 처리
                    e.stopPropagation();
                  }}
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
         selectedFarm={
           selectedFarm ??
           farms?.find((f) => f.id === form.getValues("farmId")) ??
           undefined
         }
         selectedRowNumber={form.getValues("rowNumber")}
         registrationCrop={selectedRegistrationCrop}
       />

      {memoLightboxIndex !== null && memoImageUrls.length > 0 && (
        <MemoImageLightbox
          open
          onOpenChange={(isOpen) => {
            if (!isOpen) setMemoLightboxIndex(null);
          }}
          slides={memoImageUrls.map((url) => ({ url, title: "메모 이미지" }))}
          initialIndex={memoLightboxIndex}
          headerFallback="메모 이미지"
        />
      )}

      {/* 이랑 중복 경고 AlertDialog */}
      <AlertDialog open={showRowDuplicateAlert} onOpenChange={setShowRowDuplicateAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>이랑 중복 확인</AlertDialogTitle>
            <AlertDialogDescription>
              이미 이랑에 작물이 등록되어 있습니다. 그래도 작업을 등록하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowRowDuplicateAlert(false);
              setPendingSubmitData(null);
            }}>
              취소
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setShowRowDuplicateAlert(false);
              if (pendingSubmitData) {
                proceedWithSubmit(pendingSubmitData);
              }
              setPendingSubmitData(null);
            }}>
              확인
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 작업 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="작업을 삭제하시겠습니까?"
        description="삭제된 작업은 복구할 수 없습니다."
        confirmText="삭제"
        cancelText="취소"
        onConfirm={handleConfirmDeleteTask}
      />
    </>
  );
}
