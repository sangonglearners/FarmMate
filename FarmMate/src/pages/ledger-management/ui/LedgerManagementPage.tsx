import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Edit, Trash2, CalendarIcon } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown } from "lucide-react";
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

export default function LedgerManagementPage() {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState<"all" | "unregistered" | "registered">("all");
  const [selectedFarmIds, setSelectedFarmIds] = useState<string[]>([]);
  const [showLedgerDialog, setShowLedgerDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedLedger, setSelectedLedger] = useState<LedgerWithExpenses | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [ledgerToDelete, setLedgerToDelete] = useState<string | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: farms } = useFarms();
  const { data: crops } = useCrops();

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

    // 정렬: 장부 미등록 건을 최상단에 우선 배치
    return filtered.sort((a, b) => {
      const aHasLedger = ledgerTaskIds.has(a.id);
      const bHasLedger = ledgerTaskIds.has(b.id);
      
      if (aHasLedger && !bHasLedger) return 1;
      if (!aHasLedger && bHasLedger) return -1;
      
      // 같은 상태면 날짜순 정렬
      return a.scheduledDate.localeCompare(b.scheduledDate);
    });
  }, [tasks, ledgerTaskIds, statusFilter, selectedFarmIds]);

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

  // 농장 선택 핸들러
  const handleFarmToggle = (farmId: string, checked: boolean) => {
    if (checked) {
      setSelectedFarmIds(prev => [...prev, farmId]);
    } else {
      setSelectedFarmIds(prev => prev.filter(id => id !== farmId));
    }
  };

  // 전체 선택 핸들러
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedFarmIds(farms?.map(f => f.id) || []);
    } else {
      setSelectedFarmIds([]);
    }
  };

  // 농장 필터 표시 텍스트
  const getFarmFilterText = () => {
    if (selectedFarmIds.length === 0) {
      return "전체";
    }
    if (selectedFarmIds.length === farms?.length) {
      return "전체";
    }
    if (selectedFarmIds.length === 1) {
      const farm = farms?.find(f => f.id === selectedFarmIds[0]);
      return farm?.name || "전체";
    }
    return `${selectedFarmIds.length}개 선택됨`;
  };

  const isAllSelected = selectedFarmIds.length === 0 || selectedFarmIds.length === farms?.length;

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

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-2">장부 관리</h1>
        <p className="text-gray-600 text-sm">매출 및 비용 내역을 관리합니다</p>
      </div>

      {/* 필터 영역 */}
      <div className="space-y-4">
        {/* 상단 필터: 날짜 선택 + 농장별 토글리스트 */}
        <div className="flex items-center gap-4">
          {/* 연/월 선택 (하나의 토글 안에서) */}
          <div className="flex items-center gap-2 flex-1">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePreviousMonth}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex-1 justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {currentYear}년 {currentMonth}월
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-4" align="start">
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
            <Button
              variant="outline"
              size="icon"
              onClick={handleNextMonth}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* 농장별 토글다운 */}
          {farms && farms.length > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-between min-w-[150px]">
                  <span className="text-sm">{getFarmFilterText()}</span>
                  <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-3" align="end">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-50 cursor-pointer">
                    <Checkbox
                      id="farm-all"
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                    />
                    <label
                      htmlFor="farm-all"
                      className="text-sm font-medium cursor-pointer flex-1"
                    >
                      전체
                    </label>
                  </div>
                  <div className="border-t pt-2 space-y-1">
                    {farms.map((farm) => (
                      <div
                        key={farm.id}
                        className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-50 cursor-pointer"
                      >
                        <Checkbox
                          id={`farm-${farm.id}`}
                          checked={selectedFarmIds.includes(farm.id)}
                          onCheckedChange={(checked) => handleFarmToggle(farm.id, checked as boolean)}
                        />
                        <label
                          htmlFor={`farm-${farm.id}`}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {farm.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>

        {/* 상태 필터 */}
        <Select value={statusFilter} onValueChange={(value: "all" | "unregistered" | "registered") => setStatusFilter(value)}>
          <SelectTrigger>
            <SelectValue placeholder="상태 필터" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="unregistered">장부 미등록</SelectItem>
            <SelectItem value="registered">장부 등록</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 작업 목록 */}
      <div className="space-y-3">
        {filteredAndSortedTasks.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              {statusFilter === "unregistered" 
                ? "장부 미등록 작업이 없습니다."
                : statusFilter === "registered"
                ? "장부 등록된 작업이 없습니다."
                : "해당 기간에 작업이 없습니다."}
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
