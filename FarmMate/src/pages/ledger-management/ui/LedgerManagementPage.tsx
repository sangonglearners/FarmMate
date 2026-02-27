import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ChevronLeft, ChevronRight, Edit, Trash2, CalendarIcon, X, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { listLedgers, deleteLedger, type LedgerWithExpenses } from "@/shared/api/ledgers";
import { listTasksRange } from "@/shared/api/tasks";
import LedgerWriteDialog from "@/components/ledger-write-dialog";
import type { Task, Farm, Crop } from "@shared/schema";
import { useFarms } from "@/features/farm-management";
import { useCrops } from "@/features/crop-management";
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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

const LEDGER_TASK_TYPE_OPTIONS = [
  "파종",
  "육묘",
  "이랑준비",
  "정식",
  "풀/병해충/수분 관리",
  "고르기",
  "수확",
  "저장-포장",
  "기타",
] as const;

const BASE_TASK_TYPES_EXCEPT_ETC = LEDGER_TASK_TYPE_OPTIONS.filter((type) => type !== "기타");

export default function LedgerManagementPage() {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState<"all" | "unregistered" | "registered">("all");
  const [selectedFarmIds, setSelectedFarmIds] = useState<string[]>([]);
  const [selectedTaskTypes, setSelectedTaskTypes] = useState<string[]>([]);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [draftStatusFilter, setDraftStatusFilter] = useState<"all" | "unregistered" | "registered">("all");
  const [draftFarmIds, setDraftFarmIds] = useState<string[]>([]);
  const [draftTaskTypes, setDraftTaskTypes] = useState<string[]>([]);
  const [showLedgerDialog, setShowLedgerDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedLedger, setSelectedLedger] = useState<LedgerWithExpenses | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [ledgerToDelete, setLedgerToDelete] = useState<string | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: farms } = useFarms();
  const { data: crops } = useCrops();
  const [, navigate] = useLocation();

  // 선택된 월의 시작일과 종료일
  const monthStart = format(startOfMonth(selectedMonth), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(selectedMonth), "yyyy-MM-dd");

  // 해당 월의 작업 목록 조회
  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", { start: monthStart, end: monthEnd }],
    queryFn: () => listTasksRange(monthStart, monthEnd),
  });

  // 장부 목록 조회
  const { data: ledgers = [], refetch: refetchLedgers } = useQuery({
    queryKey: ["ledgers", monthStart, monthEnd],
    queryFn: async () => {
      const allLedgers = await listLedgers();
      // 해당 월의 작업에 연결된 장부만 필터링
      const taskIds = new Set(tasks.map(t => t.id));
      return allLedgers.filter(l => l.taskId && taskIds.has(l.taskId));
    },
  });

  // 장부가 등록된 작업 ID 집합
  const ledgerTaskIds = new Set(ledgers.map(l => l.taskId).filter(Boolean) as string[]);

  const taskTypeOptions = LEDGER_TASK_TYPE_OPTIONS;
  const farmOptionIds = useMemo(() => (farms || []).map((farm) => farm.id), [farms]);
  const farmNameById = useMemo(
    () => new Map((farms || []).map((farm) => [farm.id, farm.name])),
    [farms]
  );

  // 필터링 및 정렬된 작업 목록
  const filteredAndSortedTasks = useMemo(() => {
    let filtered = tasks;

    // 상태 필터 적용
    if (statusFilter === "unregistered") {
      filtered = filtered.filter(task => !ledgerTaskIds.has(task.id));
    } else if (statusFilter === "registered") {
      filtered = filtered.filter(task => ledgerTaskIds.has(task.id));
    }

    // 농장 필터 적용
    if (selectedFarmIds.length > 0) {
      filtered = filtered.filter(task => task.farmId && selectedFarmIds.includes(task.farmId));
    }

    // 작업 종류 필터 적용
    if (selectedTaskTypes.length > 0) {
      const includesEtc = selectedTaskTypes.includes("기타");
      filtered = filtered.filter((task) => {
        if (selectedTaskTypes.includes(task.taskType)) {
          return true;
        }

        // "기타" 필터는 커스텀 농작업명(예: "아이")도 포함한다.
        if (includesEtc) {
          return !BASE_TASK_TYPES_EXCEPT_ETC.includes(task.taskType as (typeof BASE_TASK_TYPES_EXCEPT_ETC)[number]);
        }
        return false;
      });
    }

    // 정렬: 장부 미등록 건을 최상단에 우선 배치
    return filtered.sort((a, b) => {
      const aHasLedger = ledgerTaskIds.has(a.id);
      const bHasLedger = ledgerTaskIds.has(b.id);
      
      if (aHasLedger && !bHasLedger) return 1;
      if (!aHasLedger && bHasLedger) return -1;
      
      // 같은 상태면 날짜순 정렬
      return a.scheduledDate.localeCompare(b.scheduledDate);
    });
  }, [tasks, ledgerTaskIds, statusFilter, selectedFarmIds, selectedTaskTypes]);

  // 작업 정보 가져오기 헬퍼
  const getTaskInfo = (task: Task) => {
    const farm = farms?.find(f => f.id === task.farmId);
    const crop = crops?.find(c => c.id === task.cropId);
    return { farm, crop };
  };

  // 장부 작성/수정 핸들러
  const handleTaskClick = (task: Task) => {
    const ledger = ledgers.find(l => l.taskId === task.id);
    setSelectedTask(task);
    setSelectedLedger(ledger || null);
    setShowLedgerDialog(true);
  };

  // 장부 수정 핸들러
  const handleLedgerEdit = (ledger: LedgerWithExpenses) => {
    const task = tasks.find(t => t.id === ledger.taskId);
    if (task) {
      setSelectedTask(task);
      setSelectedLedger(ledger);
      setShowLedgerDialog(true);
    }
  };

  // 장부 삭제 핸들러
  const deleteMutation = useMutation({
    mutationFn: deleteLedger,
    onSuccess: () => {
      toast({
        title: "장부가 삭제되었습니다",
        description: "장부 내역이 성공적으로 삭제되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["ledgers"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setDeleteConfirmOpen(false);
      setLedgerToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "삭제 실패",
        description: error.message || "장부 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteClick = (ledgerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLedgerToDelete(ledgerId);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (ledgerToDelete) {
      deleteMutation.mutate(ledgerToDelete);
    }
  };

  // 연도 및 월 선택
  const currentYear = selectedMonth.getFullYear();
  const currentMonth = selectedMonth.getMonth() + 1;
  
  // 연도 목록 (현재 연도 기준 ±5년)
  const years = Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i);
  
  // 월 목록
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  
  const handleYearChange = (year: string) => {
    const newDate = new Date(selectedMonth);
    newDate.setFullYear(Number(year));
    setSelectedMonth(newDate);
  };
  
  const handleMonthChange = (month: string) => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(Number(month) - 1);
    setSelectedMonth(newDate);
  };
  
  // 월 변경 핸들러
  const handlePreviousMonth = () => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    setSelectedMonth(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    setSelectedMonth(newDate);
  };

  const normalizeFarmSelection = (ids: string[]) => {
    if (farmOptionIds.length === 0) return [];
    return ids.length === farmOptionIds.length ? [] : ids;
  };

  const normalizeTaskTypeSelection = (taskTypes: string[]) => {
    return taskTypes.length === taskTypeOptions.length ? [] : taskTypes;
  };

  const handleFarmToggle = (farmId: string) => {
    setSelectedFarmIds((prev) => {
      if (prev.includes(farmId)) {
        return prev.filter((id) => id !== farmId);
      }
      return normalizeFarmSelection([...prev, farmId]);
    });
  };

  const handleTaskTypeToggle = (taskType: string) => {
    setSelectedTaskTypes((prev) => {
      if (prev.includes(taskType)) {
        return prev.filter((type) => type !== taskType);
      }
      return normalizeTaskTypeSelection([...prev, taskType]);
    });
  };

  const handleDraftFarmToggle = (farmId: string) => {
    setDraftFarmIds((prev) => {
      if (prev.includes(farmId)) {
        return prev.filter((id) => id !== farmId);
      }
      return normalizeFarmSelection([...prev, farmId]);
    });
  };

  const handleDraftTaskTypeToggle = (taskType: string) => {
    setDraftTaskTypes((prev) => {
      if (prev.includes(taskType)) {
        return prev.filter((type) => type !== taskType);
      }
      return normalizeTaskTypeSelection([...prev, taskType]);
    });
  };

  const getTaskTypeChipClasses = (selected: boolean) => {
    const active = selected
      ? "border-amber-500 bg-amber-100 text-amber-800"
      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50";
    return `h-8 rounded-full border px-3 text-sm ${active}`;
  };

  const getFarmChipClasses = (selected: boolean) => {
    const active = selected
      ? "border-sky-500 bg-sky-100 text-sky-800"
      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50";
    return `h-8 rounded-full border px-3 text-sm ${active}`;
  };

  const yearMonthLabel = format(selectedMonth, "yyyy년 M월");

  const openFilterSheet = () => {
    setDraftStatusFilter(statusFilter);
    setDraftFarmIds(selectedFarmIds);
    setDraftTaskTypes(selectedTaskTypes);
    setFilterSheetOpen(true);
  };

  const applyFilters = () => {
    setStatusFilter(draftStatusFilter);
    setSelectedFarmIds(normalizeFarmSelection(draftFarmIds));
    setSelectedTaskTypes(normalizeTaskTypeSelection(draftTaskTypes));
    setFilterSheetOpen(false);
  };

  const resetDraftFilters = () => {
    setDraftStatusFilter("all");
    setDraftFarmIds([]);
    setDraftTaskTypes([]);
  };

  const getStatusLabel = (status: "all" | "unregistered" | "registered") => {
    if (status === "unregistered") return "미등록";
    if (status === "registered") return "등록완료";
    return "전체";
  };

  const getSelectedFarmNames = (farmIds: string[]) => {
    return farmIds
      .map((farmId) => farmNameById.get(farmId))
      .filter((name): name is string => Boolean(name));
  };

  const getSummaryText = (category: string, selectedItems: string[], allItems: string[]) => {
    if (selectedItems.length === 0 || selectedItems.length === allItems.length) {
      return `${category}: 전체`;
    }
    if (selectedItems.length === 1) {
      return `${category}: ${selectedItems[0]}`;
    }
    return `${category}: ${selectedItems[0]} 외 ${selectedItems.length - 1}개`;
  };

  const getTooltipText = (selectedItems: string[], allItems: string[]) => {
    if (selectedItems.length === 0 || selectedItems.length === allItems.length) {
      return "전체";
    }
    return selectedItems.join(", ");
  };

  const getStatusEmptyMessage = () => {
    if (statusFilter === "unregistered") {
      return "장부 미등록 작업이 없습니다.";
    }
    if (statusFilter === "registered") {
      return "장부 등록된 작업이 없습니다.";
    }
    if (selectedFarmIds.length > 0 || selectedTaskTypes.length > 0) {
      return "선택한 필터 조건에 맞는 작업이 없습니다.";
    } else {
      return "해당 기간에 작업이 없습니다.";
    }
  };

  const selectedFarmNames = getSelectedFarmNames(selectedFarmIds);

  const statusSummary = `등록 상태: ${getStatusLabel(statusFilter)}`;
  const taskSummary = getSummaryText("농작업", selectedTaskTypes, [...taskTypeOptions]);
  const farmSummary = getSummaryText(
    "농장",
    selectedFarmNames,
    (farms || []).map((farm) => farm.name)
  );

  const statusTooltip = getStatusLabel(statusFilter);
  const taskTooltip = getTooltipText(selectedTaskTypes, [...taskTypeOptions]);
  const farmTooltip = getTooltipText(selectedFarmNames, (farms || []).map((farm) => farm.name));

  // 날짜 포맷팅 헬퍼
  const formatTaskDateRange = (task: Task) => {
    const startDate = task.scheduledDate;
    const endDate = (task as any).endDate || task.scheduledDate;
    if (startDate === endDate) {
      return startDate;
    }
    return `${startDate} ~ ${endDate}`;
  };

  // 장부 등록 날짜 포맷팅
  const formatLedgerDate = (ledger: LedgerWithExpenses | undefined) => {
    if (!ledger) return "";
    return format(new Date(ledger.createdAt), "yyyy-MM-dd");
  };

  const popoverPanelClass = "w-[calc(100vw-2rem)] max-w-[20rem] p-3";

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="relative">
        {/* 뒤로가기 버튼 (좌측 고정) */}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 absolute left-0 top-1/2 -translate-y-1/2"
          onClick={() => navigate("/my-page")}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        {/* 중앙 정렬 타이틀 */}
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-1">장부 관리</h1>
          <p className="text-gray-600 text-sm">매출 및 비용 내역을 관리합니다</p>
        </div>
      </div>

      {/* 필터 영역 */}
      <div className="space-y-4">
        {/* 날짜 선택기 (중앙 콤팩트) */}
        <div className="grid grid-cols-[1fr_auto] items-center gap-2">
          <div className="flex justify-start">
            <div className="inline-flex h-9 items-center rounded-md border border-input bg-background">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-none rounded-l-md"
                onClick={handlePreviousMonth}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="h-5 w-px bg-border" />
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-9 min-w-[136px] justify-start rounded-none px-3 text-left sm:min-w-[156px]"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {yearMonthLabel}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto max-w-[calc(100vw-2rem)] p-4" align="start">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">연도</label>
                      <Select value={currentYear.toString()} onValueChange={handleYearChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {years.map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}년
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">월</label>
                      <Select value={currentMonth.toString()} onValueChange={handleMonthChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {months.map((month) => (
                            <SelectItem key={month} value={month.toString()}>
                              {month}월
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <div className="h-5 w-px bg-border" />
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-none rounded-r-md"
                onClick={handleNextMonth}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 justify-self-end shrink-0"
            onClick={openFilterSheet}
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        {/* 필터 요약 칩 (가로 스크롤) */}
        <div className="text-xs font-medium text-gray-500">필터 표시</div>
        <div className="overflow-x-auto">
          <TooltipProvider delayDuration={150}>
            <div className="flex w-max min-w-full items-center gap-2 pb-1">
              <Tooltip>
                <Popover>
                  <PopoverTrigger asChild>
                    <TooltipTrigger asChild>
                      <div
                        role="button"
                        tabIndex={0}
                        className="flex h-8 items-center gap-1 whitespace-nowrap rounded-full border border-green-300 bg-green-50 px-3 text-sm text-green-800 hover:bg-green-100"
                      >
                        {statusSummary}
                        {statusFilter !== "all" && (
                          <button
                            type="button"
                            className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-green-200"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setStatusFilter("all");
                            }}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </TooltipTrigger>
                  </PopoverTrigger>
                  <PopoverContent className={popoverPanelClass} side="bottom" align="start">
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        variant="outline"
                        className={statusFilter === "all" ? "border-green-500 bg-green-100 text-green-800" : ""}
                        onClick={() => setStatusFilter("all")}
                      >
                        전체
                      </Button>
                      <Button
                        variant="outline"
                        className={statusFilter === "unregistered" ? "border-green-500 bg-green-100 text-green-800" : ""}
                        onClick={() => setStatusFilter("unregistered")}
                      >
                        미등록
                      </Button>
                      <Button
                        variant="outline"
                        className={statusFilter === "registered" ? "border-green-500 bg-green-100 text-green-800" : ""}
                        onClick={() => setStatusFilter("registered")}
                      >
                        등록완료
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
                <TooltipContent>{statusTooltip}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <Popover>
                  <PopoverTrigger asChild>
                    <TooltipTrigger asChild>
                      <div
                        role="button"
                        tabIndex={0}
                        className="flex h-8 items-center gap-1 whitespace-nowrap rounded-full border border-amber-300 bg-amber-50 px-3 text-sm text-amber-800 hover:bg-amber-100"
                      >
                        {taskSummary}
                        {selectedTaskTypes.length > 0 && (
                          <button
                            type="button"
                            className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-amber-200"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setSelectedTaskTypes([]);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </TooltipTrigger>
                  </PopoverTrigger>
                  <PopoverContent className={popoverPanelClass} side="bottom" align="start">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        className={getTaskTypeChipClasses(selectedTaskTypes.length === 0)}
                        onClick={() => setSelectedTaskTypes([])}
                      >
                        전체
                      </Button>
                      {taskTypeOptions.map((taskType) => (
                        <Button
                          key={taskType}
                          variant="outline"
                          className={getTaskTypeChipClasses(selectedTaskTypes.includes(taskType))}
                          onClick={() => handleTaskTypeToggle(taskType)}
                        >
                          {taskType}
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                <TooltipContent>{taskTooltip}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <Popover>
                  <PopoverTrigger asChild>
                    <TooltipTrigger asChild>
                      <div
                        role="button"
                        tabIndex={0}
                        className="flex h-8 items-center gap-1 whitespace-nowrap rounded-full border border-sky-300 bg-sky-50 px-3 text-sm text-sky-800 hover:bg-sky-100"
                      >
                        {farmSummary}
                        {selectedFarmIds.length > 0 && (
                          <button
                            type="button"
                            className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-sky-200"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setSelectedFarmIds([]);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </TooltipTrigger>
                  </PopoverTrigger>
                  <PopoverContent className={popoverPanelClass} side="bottom" align="start">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        className={getFarmChipClasses(selectedFarmIds.length === 0)}
                        onClick={() => setSelectedFarmIds([])}
                      >
                        전체
                      </Button>
                      {(farms || []).map((farm) => (
                        <Button
                          key={farm.id}
                          variant="outline"
                          className={getFarmChipClasses(selectedFarmIds.includes(farm.id))}
                          onClick={() => handleFarmToggle(farm.id)}
                        >
                          {farm.name}
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                <TooltipContent>{farmTooltip}</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>
      </div>

      {/* 통합 필터 관리 */}
      <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-center">필터 상세 설정</SheetTitle>
          </SheetHeader>

          <div className="mt-5 space-y-6 pb-3">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">등록 상태</h3>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  className={draftStatusFilter === "all" ? "border-green-500 bg-green-100 text-green-800" : ""}
                  onClick={() => setDraftStatusFilter("all")}
                >
                  전체
                </Button>
                <Button
                  variant="outline"
                  className={draftStatusFilter === "unregistered" ? "border-green-500 bg-green-100 text-green-800" : ""}
                  onClick={() => setDraftStatusFilter("unregistered")}
                >
                  미등록
                </Button>
                <Button
                  variant="outline"
                  className={draftStatusFilter === "registered" ? "border-green-500 bg-green-100 text-green-800" : ""}
                  onClick={() => setDraftStatusFilter("registered")}
                >
                  등록완료
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">농작업</h3>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className={getTaskTypeChipClasses(draftTaskTypes.length === 0)}
                  onClick={() => setDraftTaskTypes([])}
                >
                  전체
                </Button>
                {taskTypeOptions.map((taskType) => (
                  <Button
                    key={taskType}
                    variant="outline"
                    className={getTaskTypeChipClasses(draftTaskTypes.includes(taskType))}
                    onClick={() => handleDraftTaskTypeToggle(taskType)}
                  >
                    {taskType}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">농장</h3>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className={getFarmChipClasses(draftFarmIds.length === 0)}
                  onClick={() => setDraftFarmIds([])}
                >
                  전체
                </Button>
                {(farms || []).map((farm) => (
                  <Button
                    key={farm.id}
                    variant="outline"
                    className={getFarmChipClasses(draftFarmIds.includes(farm.id))}
                    onClick={() => handleDraftFarmToggle(farm.id)}
                  >
                    {farm.name}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button variant="outline" onClick={resetDraftFilters}>
                초기화
              </Button>
              <Button className="bg-green-600 hover:bg-green-700" onClick={applyFilters}>
                필터 적용
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* 작업 목록 */}
      <div className="space-y-3">
        {filteredAndSortedTasks.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              {getStatusEmptyMessage()}
            </CardContent>
          </Card>
        ) : (
          filteredAndSortedTasks.map((task) => {
            const hasLedger = ledgerTaskIds.has(task.id);
            const ledger = ledgers.find(l => l.taskId === task.id);
            const { farm, crop } = getTaskInfo(task);

            return (
              <Card
                key={task.id}
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => handleTaskClick(task)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={hasLedger ? "secondary" : "destructive"}>
                          {hasLedger ? "등록 완료" : "미등록"}
                        </Badge>
                        {ledger && (
                          <span className="text-sm font-medium text-gray-900">
                            {formatLedgerDate(ledger)}
                          </span>
                        )}
                      </div>
                      {/* 회색 박스로 된 작업정보 */}
                      <div className="bg-gray-50 p-3 rounded-md border border-gray-200 text-sm text-gray-700">
                        <div className="text-xs text-gray-500 mb-1">작업 날짜: {formatTaskDateRange(task)}</div>
                        {farm && <div>농장: {farm.name}</div>}
                        {crop && (
                          <div>
                            작물: {crop.category} {'>'} {crop.name} {'>'} {crop.variety}
                          </div>
                        )}
                        {task.rowNumber && <div>이랑 번호: {task.rowNumber}</div>}
                        <div>작업: {task.taskType}</div>
                        {task.title && <div>제목: {task.title}</div>}
                      </div>
                      {ledger && (
                        <div className="text-xs text-gray-600 space-y-1 pt-2 border-t">
                          <div>
                            매출: {ledger.revenueAmount?.toLocaleString() || 0}원
                          </div>
                          {ledger.expenseItems.length > 0 && (
                            <div>
                              비용: {ledger.expenseItems.reduce((sum, item) => sum + item.cost, 0).toLocaleString()}원
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {ledger && (
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleLedgerEdit(ledger)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleDeleteClick(ledger.id, e)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* 장부 작성/수정 다이얼로그 */}
      <LedgerWriteDialog
        open={showLedgerDialog}
        onOpenChange={(open) => {
          setShowLedgerDialog(open);
          if (!open) {
            setSelectedTask(null);
            setSelectedLedger(null);
            refetchLedgers();
          }
        }}
        task={selectedTask}
        ledger={selectedLedger}
      />

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>장부 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 이 장부를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
