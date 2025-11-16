import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { ChevronLeft, ChevronRight, Plus, Share2 } from "lucide-react";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AddTaskDialog from "@/components/add-task-dialog-improved";
import type { Task, Crop } from "@shared/schema";
import { useFarms } from "@/features/farm-management/model/farm.hooks";
import type { FarmEntity } from "@/shared/api/farm.repository";
import { getTaskGroups, type TaskGroup } from "@/widgets/calendar-grid/model/calendar.utils";
import { CalendarShareDialog } from "@/features/calendar-share/ui";
import { useUserRoleForCalendar, useSharedFarmIds } from "@/features/calendar-share";
import { useAuth } from "@/contexts/AuthContext";
import { CalendarCommentsPanel } from "@/features/calendar-comments";

interface FarmCalendarGridProps {
  tasks: Task[];
  crops: Crop[];
  onDateClick: (date: string) => void;
}

type ViewMode = "monthly" | "yearly";

type TaskGroupWithLane = TaskGroup & { laneIndex: number; overlapCount: number };

export default function FarmCalendarGrid({ tasks, crops, onDateClick }: FarmCalendarGridProps) {
  // tasks가 변경될 때마다 컴포넌트가 리렌더링되도록 의존성 추가
  const memoizedTasks = useMemo(() => tasks, [tasks]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("monthly");
  const [selectedFarm, setSelectedFarm] = useState<FarmEntity | null>(null);
  
  // 더보기 클릭 시 전체 작업 목록 표시를 위한 상태
  const [showAllTasksDialog, setShowAllTasksDialog] = useState<{
    rowNumber: number;
    date: string;
    tasks: Task[];
  } | null>(null);
  
  // 공유 다이얼로그 상태
  const [showShareDialog, setShowShareDialog] = useState(false);
  
  // 현재 사용자 정보 가져오기 (먼저 선언)
  const { user } = useAuth();
  
  // 농장 데이터 가져오기
  const { data: farms = [], isLoading: farmsLoading } = useFarms();
  
  // 내 농장과 친구 농장 분리
  const myFarms = farms.filter(farm => farm.userId === user?.id);
  const friendFarms = farms.filter(farm => farm.userId !== user?.id);
  
  // 공유받은 농장 아이디 체크
  const { data: sharedFarmIds = new Set<string>() } = useSharedFarmIds(friendFarms.map(f => f.id));
  
  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false);
  const [selectedDateForTask, setSelectedDateForTask] = useState<string>("");
  const [selectedEndDateForTask, setSelectedEndDateForTask] = useState<string | null>(null);
  const [selectedCellDate, setSelectedCellDate] = useState<string | null>(null);
  const [selectedRowNumberForTask, setSelectedRowNumberForTask] = useState<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const longPressTimeoutRef = useRef<number | null>(null);
  const pendingPointerInfoRef = useRef<{
    pointerId: number;
    dateStr: string;
    rowNumber: number;
  } | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const edgeScrollDirectionRef = useRef<-1 | 0 | 1>(0);
  const autoScrollAnimationRef = useRef<number | null>(null);
  const LONG_PRESS_DELAY = 600;
  const [isDraggingDates, setIsDraggingDates] = useState(false);
  const [dragStartDate, setDragStartDate] = useState<string | null>(null);
  const [dragCurrentDate, setDragCurrentDate] = useState<string | null>(null);
  const [dragRowNumber, setDragRowNumber] = useState<number | null>(null);
  const [hasDragMoved, setHasDragMoved] = useState(false);
  
  // 화면 크기 감지
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // 선택된 농장의 권한 확인 (작업 등록 가능 여부 확인용)
  const { data: userRole } = useUserRoleForCalendar(selectedFarm?.id || "");
  
  // 작업 등록 가능 여부 확인: 소유주 또는 editor 권한만 가능
  const canCreateTask = selectedFarm 
    ? (selectedFarm.userId === user?.id || userRole === 'editor')
    : true; // 농장이 선택되지 않은 경우는 기본적으로 가능
  
  // 작업 수정 가능 여부 확인: 소유주 또는 editor 권한만 가능 (commenter, viewer는 수정 불가)
  const canEditTask = selectedFarm 
    ? (selectedFarm.userId === user?.id || userRole === 'editor')
    : true; // 농장이 선택되지 않은 경우는 기본적으로 가능
  
  // 월간과 연간 뷰의 날짜 상태를 분리
  const today = new Date();
  const [monthlyDate, setMonthlyDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [yearlyDate, setYearlyDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [monthlyOffset, setMonthlyOffset] = useState(() => {
    // 오늘이 포함된 10일 구간으로 초기화
    const todayDate = today.getDate();
    return Math.floor((todayDate - 1) / 5);
  });

  // 현재 뷰 모드에 따른 날짜
  const currentDate = viewMode === "monthly" ? monthlyDate : yearlyDate;

  // 첫 번째 내 농장을 기본값으로 설정
  useEffect(() => {
    if (myFarms.length > 0 && !selectedFarm) {
      setSelectedFarm(myFarms[0]);
    } else if (myFarms.length === 0 && friendFarms.length > 0 && !selectedFarm) {
      setSelectedFarm(friendFarms[0]);
    }
  }, [myFarms, friendFarms, selectedFarm]);

  const buildCsvForSelectedFarm = () => {
    try {
      const farmIdToName = new Map(farms.map(f => [f.id, f.name] as const));
      const headers = ["농장", "시작일", "종료일", "이랑", "일", "메모"];
      const filtered = selectedFarm
        ? memoizedTasks.filter(t => t.farmId === selectedFarm.id)
        : memoizedTasks;
      const escapeCsv = (value: unknown): string => {
        if (value === null || value === undefined) return "";
        const str = String(value);
        if (/[",\n]/.test(str)) {
          return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
      };
      const rows = filtered.map(t => {
        const farmName = t.farmId ? farmIdToName.get(t.farmId) ?? "" : "";
        const cols = [
          farmName,
          t.scheduledDate,
          t.endDate ?? "",
          t.rowNumber ?? "",
          t.title,
          (t as any).description ?? "",
        ];
        return cols.map(escapeCsv).join(",");
      });
      const csv = [headers.join(","), ...rows].join("\n");
      return csv;
    } catch (e) {
      console.error("CSV build failed", e);
      throw e;
    }
  };

  const handleExportCsv = () => {
    try {
      const csv = buildCsvForSelectedFarm();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const todayStr = new Date().toISOString().split("T")[0];
      link.download = `farmmate-calendar-${todayStr}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("CSV export failed", e);
      alert("CSV 내보내기에 실패했습니다. 잠시 후 다시 시도해주세요.");
    }
  };

  const handleExportGoogleSheets = async () => {
    try {
      const csv = buildCsvForSelectedFarm();
      const filename = `FarmMate 캘린더 ${new Date().toISOString().split("T")[0]}`;
      const sheetId = await uploadCsvToGoogleAsSheet(csv, filename);
      if (sheetId) {
        window.open(`https://docs.google.com/spreadsheets/d/${sheetId}/edit`, "_blank");
      }
    } catch (e) {
      console.error("Google Sheets export failed", e);
      alert("구글 시트 내보내기에 실패했습니다. 설정을 확인하고 다시 시도해주세요.");
    }
  };

  // ---- Google Sheets 업로드 유틸 (컴포넌트 내에 포함) ----
  async function uploadCsvToGoogleAsSheet(csv: string, filename: string): Promise<string> {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
    if (!clientId) {
      throw new Error("VITE_GOOGLE_CLIENT_ID 가 설정되어 있지 않습니다.");
    }

    await ensureGoogleApisLoaded();
    const accessToken = await requestGoogleAccessToken(clientId, [
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/spreadsheets",
    ]);

    const metadata = {
      name: filename.endsWith(".csv") ? filename.replace(/\.csv$/i, "") : filename,
      mimeType: "application/vnd.google-apps.spreadsheet",
    };

    const boundary = "farmmate_boundary_" + Math.random().toString(36).slice(2);
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelim = `\r\n--${boundary}--`;

    const multipartBody =
      delimiter +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      JSON.stringify(metadata) +
      delimiter +
      "Content-Type: text/csv; charset=UTF-8\r\n\r\n" +
      csv +
      closeDelim;

    const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Drive upload failed: ${res.status} ${text}`);
    }
    const json = await res.json() as { id?: string };
    if (!json.id) {
      throw new Error("파일 ID를 받지 못했습니다.");
    }
    return json.id;
  }

  function ensureGoogleApisLoaded(): Promise<void> {
    return new Promise((resolve, reject) => {
      const ensureScript = (src: string, id: string) =>
        new Promise<void>((res, rej) => {
          if (document.getElementById(id)) return res();
          const s = document.createElement("script");
          s.src = src;
          s.async = true;
          s.defer = true;
          s.id = id;
          s.onload = () => res();
          s.onerror = () => rej(new Error(`Failed to load ${src}`));
          document.head.appendChild(s);
        });

      Promise.all([
        ensureScript("https://accounts.google.com/gsi/client", "google_gsi_script"),
        ensureScript("https://apis.google.com/js/api.js", "google_api_script"),
      ])
        .then(() => resolve())
        .catch(reject);
    });
  }

  function requestGoogleAccessToken(clientId: string, scopes: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      // @ts-ignore
      if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
        return reject(new Error("Google OAuth 클라이언트를 불러오지 못했습니다."));
      }
      // @ts-ignore
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: scopes.join(" "),
        callback: (resp: any) => {
          if (resp && resp.access_token) {
            resolve(resp.access_token);
          } else {
            reject(new Error("액세스 토큰을 받지 못했습니다."));
          }
        },
        error_callback: (err: any) => reject(err),
      });
      tokenClient.requestAccessToken();
    });
  }

  const handleDateSelection = useCallback((dateStr: string, rowNumber?: number | null) => {
    setSelectedCellDate(dateStr);
    setSelectedRowNumberForTask(
      typeof rowNumber === "number" ? rowNumber : null,
    );
    onDateClick(dateStr);
  }, [onDateClick]);

  const openAddTaskShortcut = useCallback((dateStr: string, rowNumber?: number | null, endDate?: string | null) => {
    if (!canCreateTask) return;
    handleDateSelection(dateStr, rowNumber);
    setSelectedDateForTask(dateStr);
    setSelectedEndDateForTask(endDate ?? null);
    setSelectedRowNumberForTask(
      typeof rowNumber === "number" ? rowNumber : null,
    );
    setShowAddTaskDialog(true);
  }, [canCreateTask, handleDateSelection]);

  const cancelLongPressTimer = useCallback(() => {
    if (longPressTimeoutRef.current !== null) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
    pendingPointerInfoRef.current = null;
    edgeScrollDirectionRef.current = 0;
  }, []);

  const resetDragState = useCallback(() => {
    setIsDraggingDates(false);
    setDragStartDate(null);
    setDragCurrentDate(null);
    setDragRowNumber(null);
    setHasDragMoved(false);
    activePointerIdRef.current = null;
    pendingPointerInfoRef.current = null;
    edgeScrollDirectionRef.current = 0;
  }, []);

  const finalizeDragSelection = useCallback(() => {
    if (
      !isDraggingDates ||
      !dragStartDate ||
      !dragCurrentDate ||
      dragRowNumber === null
    ) {
      resetDragState();
      return;
    }

    const [start, end] =
      dragStartDate <= dragCurrentDate
        ? [dragStartDate, dragCurrentDate]
        : [dragCurrentDate, dragStartDate];

    const isRangeSelection = hasDragMoved && start !== end;

    if (isRangeSelection && canCreateTask && viewMode === "monthly") {
      openAddTaskShortcut(start, dragRowNumber, end);
    } else if (!isRangeSelection) {
      handleDateSelection(start, dragRowNumber);
    }

    resetDragState();
  }, [
    canCreateTask,
    dragCurrentDate,
    dragRowNumber,
    dragStartDate,
    hasDragMoved,
    handleDateSelection,
    isDraggingDates,
    openAddTaskShortcut,
    resetDragState,
    viewMode,
  ]);

  const handleDragStart = useCallback(
    (dateStr: string, rowNumber: number, pointerId?: number | null) => {
      if (viewMode !== "monthly" || !canCreateTask) return;
      cancelLongPressTimer();
      setIsDraggingDates(true);
      setDragStartDate(dateStr);
      setDragCurrentDate(dateStr);
      setDragRowNumber(rowNumber);
      setHasDragMoved(false);
      activePointerIdRef.current = pointerId ?? null;
      pendingPointerInfoRef.current = null;
    },
    [canCreateTask, cancelLongPressTimer, viewMode],
  );

  const startLongPressTimer = (dateStr: string, rowNumber: number) => {
    if (viewMode !== "monthly" || !canCreateTask) return;
    cancelLongPressTimer();
    longPressTimeoutRef.current = window.setTimeout(() => {
      handleDragStart(
        dateStr,
        rowNumber,
        pendingPointerInfoRef.current?.pointerId ?? null,
      );
    }, LONG_PRESS_DELAY);
  };

  useEffect(() => {
    return () => cancelLongPressTimer();
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    if (viewMode !== "monthly") {
      container.style.touchAction = "";
      return;
    }

    container.style.touchAction = "pan-x pan-y";

    const handleTouchMove = (event: TouchEvent) => {
      if (!isDraggingDates) return;
      event.preventDefault();
    };

    container.addEventListener("touchmove", handleTouchMove, { passive: false });

    return () => {
      container.style.touchAction = "";
      container.removeEventListener("touchmove", handleTouchMove);
    };
  }, [isDraggingDates, viewMode]);

  const handleDragMove = useCallback(
    (dateStr: string, rowNumber: number) => {
      if (!isDraggingDates) return;
      if (dragRowNumber === null || dragRowNumber !== rowNumber) return;
      if (dragCurrentDate !== dateStr) {
        setDragCurrentDate(dateStr);
        setHasDragMoved(true);
      }
    },
    [dragCurrentDate, dragRowNumber, isDraggingDates],
  );

  const isDateWithinDragRange = useCallback(
    (rowNumber: number, targetDate: string) => {
      if (
        !isDraggingDates ||
        !dragStartDate ||
        !dragCurrentDate ||
        dragRowNumber === null ||
        dragRowNumber !== rowNumber
      ) {
        return false;
      }

      const min = dragStartDate < dragCurrentDate ? dragStartDate : dragCurrentDate;
      const max = dragStartDate > dragCurrentDate ? dragStartDate : dragCurrentDate;

      return targetDate >= min && targetDate <= max;
    },
    [dragCurrentDate, dragRowNumber, dragStartDate, isDraggingDates],
  );

  const handleCellPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>, dateStr: string, rowNumber: number) => {
      if (viewMode !== "monthly") return;
      if (event.pointerType === "mouse" && event.button !== 0) return;

      const isPointerDrag =
        event.pointerType === "mouse" || event.pointerType === "pen";

      if (event.pointerType === "touch") {
        pendingPointerInfoRef.current = {
          pointerId: event.pointerId,
          dateStr,
          rowNumber,
        };
        startLongPressTimer(dateStr, rowNumber);
        return;
      }

      if (isPointerDrag) {
        event.preventDefault();
        handleDragStart(dateStr, rowNumber, event.pointerId);
      }
    },
    [handleDragStart, startLongPressTimer, viewMode],
  );

  const handleGlobalPointerMove = useCallback(
    (event: PointerEvent) => {
      if (!isDraggingDates) return;
      if (
        activePointerIdRef.current !== null &&
        event.pointerId !== activePointerIdRef.current
      ) {
        return;
      }

      const element = document.elementFromPoint(
        event.clientX,
        event.clientY,
      ) as HTMLElement | null;
      const cellElement = element?.closest(
        "[data-calendar-cell='true']",
      ) as HTMLElement | null;

      if (!cellElement) return;
      const dateStr = cellElement.getAttribute("data-date");
      const rowAttr = cellElement.getAttribute("data-row-number");
      if (!dateStr || !rowAttr) return;

      if (viewMode === "monthly" && scrollContainerRef.current) {
        const containerRect = scrollContainerRef.current.getBoundingClientRect();
        const EDGE_THRESHOLD = 60;
        const isNearLeft = event.clientX - containerRect.left < EDGE_THRESHOLD;
        const isNearRight = containerRect.right - event.clientX < EDGE_THRESHOLD;
        edgeScrollDirectionRef.current = isNearLeft ? -1 : isNearRight ? 1 : 0;
      } else {
        edgeScrollDirectionRef.current = 0;
      }

      handleDragMove(dateStr, Number(rowAttr));
    },
    [handleDragMove, isDraggingDates, viewMode],
  );

  const handleCellPointerEnter = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>, dateStr: string, rowNumber: number) => {
      if (
        event.pointerType !== "mouse" &&
        event.pointerType !== "pen" &&
        !(event.pointerType === "touch" && isDraggingDates)
      ) {
        return;
      }
      handleDragMove(dateStr, rowNumber);
    },
    [handleDragMove, isDraggingDates],
  );

  const handleCellPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      cancelLongPressTimer();
      if (isDraggingDates) {
        event.preventDefault();
        finalizeDragSelection();
      }
    },
    [cancelLongPressTimer, finalizeDragSelection, isDraggingDates],
  );

  useEffect(() => {
    if (!isDraggingDates) return;

    const pointerMoveListener = (event: PointerEvent) => {
      handleGlobalPointerMove(event);
    };

    window.addEventListener("pointermove", pointerMoveListener);

    return () => {
      window.removeEventListener("pointermove", pointerMoveListener);
    };
  }, [handleGlobalPointerMove, isDraggingDates]);

  useEffect(() => {
    if (!isDraggingDates) return;

    const handlePointerUp = () => {
      finalizeDragSelection();
    };

    window.addEventListener("mouseup", handlePointerUp);
    window.addEventListener("touchend", handlePointerUp);
    window.addEventListener("touchcancel", resetDragState);

    return () => {
      window.removeEventListener("mouseup", handlePointerUp);
      window.removeEventListener("touchend", handlePointerUp);
      window.removeEventListener("touchcancel", resetDragState);
    };
  }, [finalizeDragSelection, isDraggingDates, resetDragState]);

  useEffect(() => {
    if (!isDraggingDates || viewMode !== "monthly") {
      if (autoScrollAnimationRef.current !== null) {
        cancelAnimationFrame(autoScrollAnimationRef.current);
        autoScrollAnimationRef.current = null;
      }
      edgeScrollDirectionRef.current = 0;
      return;
    }

    const SCROLL_SPEED = isMobile ? 6 : 12;

    const step = () => {
      if (!scrollContainerRef.current) return;
      if (edgeScrollDirectionRef.current !== 0) {
        scrollContainerRef.current.scrollLeft +=
          edgeScrollDirectionRef.current * SCROLL_SPEED;
      }
      autoScrollAnimationRef.current = requestAnimationFrame(step);
    };

    autoScrollAnimationRef.current = requestAnimationFrame(step);

    return () => {
      if (autoScrollAnimationRef.current !== null) {
        cancelAnimationFrame(autoScrollAnimationRef.current);
        autoScrollAnimationRef.current = null;
      }
      edgeScrollDirectionRef.current = 0;
    };
  }, [isDraggingDates, viewMode, isMobile]);

  // 연간 뷰에서 현재 월로 스크롤하는 함수
  const scrollToCurrentMonth = () => {
    if (viewMode === "yearly" && scrollContainerRef.current) {
      const currentMonth = today.getMonth() + 1; // 1-12 (9월 = 9)
      const cellWidth = viewMode === "yearly" ? 100 : 120; // 연간 뷰: 100px, 월간 뷰: 120px
      
      // 현재 월(9월)이 딱 왼쪽에 붙도록 계산
      // 9월이 첫 번째로 보이도록 8개월만큼 스크롤 (1월~8월까지 스크롤)
      const scrollPosition = Math.max(0, (currentMonth - 1) * cellWidth);
      
      scrollContainerRef.current.scrollTo({
        left: scrollPosition,
        behavior: 'auto' // smooth 대신 auto로 즉시 이동
      });
    }
  };

  // 연간 뷰로 전환되거나 컴포넌트가 마운트될 때 현재 월로 스크롤
  useEffect(() => {
    if (viewMode === "yearly") {
      // 약간의 지연을 주어 DOM이 완전히 렌더링된 후 스크롤
      setTimeout(scrollToCurrentMonth, 100);
    }
  }, [viewMode]);

  // 선택된 농장의 이랑 수에 따른 이랑 번호 생성
  const rowNumbers = selectedFarm 
    ? Array.from({ length: selectedFarm.rowCount }, (_, i) => i + 1)
    : Array.from({ length: 15 }, (_, i) => i + 1); // 기본값 15개

  // 월간 뷰: 현재 표시할 10일 계산 (다음 달 날짜 포함)
  const getMonthlyDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const startDay = 1 + monthlyOffset * 5;
    const days = [];
    
    // 10일을 채우기 위해 현재 달과 다음 달 날짜를 조합
    for (let i = 0; i < 10; i++) {
      const currentDay = startDay + i;
      if (currentDay <= daysInMonth) {
        // 현재 달 날짜
        days.push({
          day: currentDay,
          month: month,
          year: year,
          isCurrentMonth: true
        });
      } else {
        // 다음 달 날짜
        const nextMonthDay = currentDay - daysInMonth;
        const nextMonth = month === 11 ? 0 : month + 1;
        const nextYear = month === 11 ? year + 1 : year;
        days.push({
          day: nextMonthDay,
          month: nextMonth,
          year: nextYear,
          isCurrentMonth: false
        });
      }
    }
    
    return days;
  };

  // 연간 뷰: 1-12월 전체 표시
  const getYearlyMonths = () => {
    return Array.from({ length: 12 }, (_, i) => i + 1); // 1-12월
  };

  // 연간 뷰에서 연속된 일정을 그룹화하는 새로운 함수
  const getYearlyTaskGroups = (rowNumber: number) => {
    // 해당 이랑의 모든 작업 가져오기
    const rowTasks = memoizedTasks.filter(task => {
      if (!task.scheduledDate) return false;
      if (task.farmId !== selectedFarm?.id) return false; // 선택된 농장의 작업만 표시
      
      // 이랑 번호 매칭 로직
      const taskRowNumber = task.rowNumber || (() => {
        if (task.description && task.description.includes("이랑:")) {
          const match = task.description.match(/이랑:\s*(\d+)번/);
          return match ? parseInt(match[1]) : null;
        }
        return null;
      })();
      
      return taskRowNumber === rowNumber || (!taskRowNumber && rowNumber === 1);
    });

    const taskGroups: TaskGroup[] = [];
    const year = currentDate.getFullYear();
    
    console.log(`[DEBUG] 이랑 ${rowNumber}의 모든 작업 (연간 뷰):`, rowTasks.map(task => ({
      id: task.id,
      title: task.title,
      scheduledDate: task.scheduledDate,
      endDate: (task as any).endDate,
      hasEndDate: !!(task as any).endDate
    })));
    
    // 작물별로 작업들을 그룹화
    const cropGroups = new Map<string, Task[]>();
    
    rowTasks.forEach(task => {
      // 작물명 추출 (title에서 작물명 부분만 가져오기)
      const cropName = task.title?.split('_')[0] || task.title || '작물';
      
      if (!cropGroups.has(cropName)) {
        cropGroups.set(cropName, []);
      }
      cropGroups.get(cropName)!.push(task);
    });
    
    // 각 작물 그룹별로 처리
    cropGroups.forEach((cropTasks, cropName) => {
      // 해당 작물의 모든 작업이 현재 년도에 포함되는지 확인
      const validTasks = cropTasks.filter(task => {
        const startDate = new Date(task.scheduledDate);
        const endDate = (task as any).endDate ? new Date((task as any).endDate) : startDate;
        return startDate.getFullYear() === year || endDate.getFullYear() === year;
      });
      
      if (validTasks.length === 0) return;
      
      // 해당 작물의 전체 기간 계산 (파종부터 수확까지)
      const allDates: Date[] = [];
      validTasks.forEach(task => {
        allDates.push(new Date(task.scheduledDate));
        if ((task as any).endDate) {
          allDates.push(new Date((task as any).endDate));
        }
      });
      
      const overallStartDate = new Date(Math.min(...allDates.map(d => d.getTime())));
      const overallEndDate = new Date(Math.max(...allDates.map(d => d.getTime())));
      
      const startMonth = overallStartDate.getMonth() + 1; // 1-12
      const endMonth = overallEndDate.getMonth() + 1; // 1-12
      
      console.log(`[DEBUG] 작물 ${cropName} 통합 처리:`, {
        tasks: validTasks.map(t => ({ id: t.id, title: t.title, scheduledDate: t.scheduledDate })),
        startMonth,
        endMonth,
        overallStartDate: overallStartDate.toISOString().split('T')[0],
        overallEndDate: overallEndDate.toISOString().split('T')[0]
      });
      
      // 현재 표시 중인 월들 중에서 작업이 걸쳐있는 월들 찾기
      const affectedMonths: number[] = [];
      
      for (let month = 1; month <= 12; month++) {
        // 작업이 이 월에 걸쳐있는지 확인
        const isInRange = (month >= startMonth && month <= endMonth) ||
                         (startMonth > endMonth && (month >= startMonth || month <= endMonth)); // 년도를 넘나드는 경우
        
        if (isInRange) {
          affectedMonths.push(month);
        }
      }
      
      console.log(`[DEBUG] 작물 ${cropName} 영향받는 월들:`, affectedMonths);
      
      if (affectedMonths.length > 0) {
        // 연속된 월들을 하나의 박스로 표시
        const startIndex = affectedMonths[0] - 1; // 0-based index
        const endIndex = affectedMonths[affectedMonths.length - 1] - 1; // 0-based index
        
        // 대표 작업 (첫 번째 작업)
        const representativeTask = validTasks[0];
        
        taskGroups.push({
          task: representativeTask,
          tasks: validTasks, // 해당 작물의 모든 작업 포함
          startDate: overallStartDate,
          endDate: overallEndDate,
          startDayIndex: startIndex,
          endDayIndex: endIndex,
          isFirstDay: true,
          isLastDay: true,
          cropName: cropName // 작물명 추가
        });
        
        console.log(`[DEBUG] 작물 ${cropName} 통합 박스 생성:`, {
          cropName,
          startIndex,
          endIndex,
          spanMonths: endIndex - startIndex + 1,
          taskCount: validTasks.length
        });
      }
    });
    
    return taskGroups;
  };

  // 특정 날짜/월의 작업 가져오기 (월간 뷰용)
  const getTasksForPeriod = (rowNumber: number, dayInfo: any) => {
    if (viewMode === "monthly") {
      const dateStr = `${dayInfo.year}-${String(dayInfo.month + 1).padStart(2, '0')}-${String(dayInfo.day).padStart(2, '0')}`;
      
      const filteredTasks = memoizedTasks.filter(task => {
        // 날짜 매칭 로직: 정확한 날짜 매칭 또는 날짜 범위 내 포함
        let isDateMatch = false;
        
        if (task.scheduledDate === dateStr) {
          // 정확한 날짜 매칭
          isDateMatch = true;
        } else if ((task as any).endDate) {
          // 날짜 범위가 있는 작업의 경우 범위 내 포함 여부 확인
          const taskStartDate = new Date(task.scheduledDate);
          const taskEndDate = new Date((task as any).endDate);
          const currentDate = new Date(dateStr);
          
          isDateMatch = currentDate >= taskStartDate && currentDate <= taskEndDate;
        }
        
        if (!isDateMatch) return false;
        if (task.farmId !== selectedFarm?.id) return false; // 선택된 농장의 작업만 표시
        
        // 이랑 번호 매칭 로직 복원
        const taskRowNumber = task.rowNumber || (() => {
          if (task.description && task.description.includes("이랑:")) {
            const match = task.description.match(/이랑:\s*(\d+)번/);
            return match ? parseInt(match[1]) : null;
          }
          return null;
        })();
        
        return taskRowNumber === rowNumber || (!taskRowNumber && rowNumber === 1);
      });
      
      return filteredTasks;
    } else {
      // 연간 뷰: 빈 배열 반환 (getYearlyTaskGroups에서 처리)
      return [];
    }
  };

  // 작물 이름 가져오기
  const getCropName = (cropId: string | null | undefined) => {
    if (!cropId) return "";
    const crop = crops.find(c => c.id === cropId);
    return crop ? crop.name : "";
  };



  // 작업 타입에 따른 색상
  const getTaskColor = (task: Task) => {
    // 제목에서 작업타입 추출 (작물명_작업타입 형태)
    let taskType = task.taskType;
    if (task.title && task.title.includes('_')) {
      const parts = task.title.split('_');
      if (parts.length >= 2) {
        taskType = parts[parts.length - 1]; // 마지막 부분을 작업타입으로 사용
      }
    }
    
    switch (taskType) {
      case "파종": return "bg-blue-100 text-blue-800 border-blue-200";
      case "육묘": return "bg-green-100 text-green-800 border-green-200";
      case "수확": return "bg-orange-100 text-orange-800 border-orange-200";
      case "수확-선별": return "bg-orange-100 text-orange-800 border-orange-200";
      case "저장-포장": return "bg-purple-100 text-purple-800 border-purple-200";
      case "정식": return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "관수": return "bg-cyan-100 text-cyan-800 border-cyan-200";
      case "비료": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "방제": return "bg-red-100 text-red-800 border-red-200";
      case "제초": return "bg-lime-100 text-lime-800 border-lime-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // 연속된 일정을 그룹화하는 함수 (월간/연간 뷰용)
  const getContinuousTaskGroups = (rowNumber: number) => {
    const currentPeriods = viewMode === "monthly" 
      ? getMonthlyDays() 
      : getYearlyMonths().map(month => ({ month })); // 현재 표시 중인 기간들
    
    const rowTasks = memoizedTasks.filter(task => {
      // 선택된 농장의 작업만 필터링
      if (task.farmId !== selectedFarm?.id) return false;
      
      // 이랑 번호 매칭 로직 복원
      const taskRowNumber = task.rowNumber || (() => {
        if (task.description && task.description.includes("이랑:")) {
          const match = task.description.match(/이랑:\s*(\d+)번/);
          return match ? parseInt(match[1]) : null;
        }
        return null;
      })();
      
      return taskRowNumber === rowNumber || (!taskRowNumber && rowNumber === 1);
    });

    // taskGroupId로 작업들을 그룹화 (일괄등록된 작업들)
    const groupedByTaskGroupId = new Map<string, Task[]>();
    
    rowTasks.forEach(task => {
      if (task.taskGroupId) {
        const existing = groupedByTaskGroupId.get(task.taskGroupId) || [];
        existing.push(task);
        groupedByTaskGroupId.set(task.taskGroupId, existing);
      }
    });

    // 연속된 일정 그룹화
    const taskGroups: TaskGroup[] = [];
    const processedTasks = new Set<string>();
    
    console.log(`[DEBUG] 이랑 ${rowNumber}의 모든 작업:`, rowTasks.map(task => ({
      id: task.id,
      title: task.title,
      scheduledDate: task.scheduledDate,
      endDate: (task as any).endDate,
      hasEndDate: !!(task as any).endDate,
      taskGroupId: task.taskGroupId
    })));

    // 일괄등록된 작업들 처리 (taskGroupId가 있는 작업들)
    groupedByTaskGroupId.forEach((groupTasks, taskGroupId) => {
      if (groupTasks.length === 0) return;
      
      // 그룹 내에서 가장 빠른 날짜와 가장 늦은 날짜 찾기 (endDate도 고려)
      const allDates: Date[] = [];
      groupTasks.forEach(t => {
        allDates.push(new Date(t.scheduledDate));
        if ((t as any).endDate) {
          allDates.push(new Date((t as any).endDate));
        }
      });
      const startDate = new Date(Math.min(...allDates.map(d => d.getTime())));
      const endDate = new Date(Math.max(...allDates.map(d => d.getTime())));
      
      // 디버깅 로그
      console.log(`[DEBUG] 그룹 ${taskGroupId} 날짜 범위:`, {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        startMonth: startDate.getMonth() + 1,
        endMonth: endDate.getMonth() + 1,
        startYear: startDate.getFullYear(),
        endYear: endDate.getFullYear()
      });
      
      // 시작일과 끝일이 같으면 그룹화하지 않음
      if (startDate.getTime() === endDate.getTime()) {
        return;
      }
      
      // 현재 표시 중인 기간 범위 내에서의 시작/끝 인덱스 계산
      let startIndex = -1;
      let endIndex = -1;
      
      if (viewMode === "monthly") {
        // 월간 뷰: 일 단위로 계산
        currentPeriods.forEach((dayInfo, index) => {
          const dayDate = new Date((dayInfo as any).year, (dayInfo as any).month, (dayInfo as any).day);
          
          // 날짜를 YYYY-MM-DD 형식으로 정규화하여 정확한 비교
          const dayDateStr = `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, '0')}-${String(dayDate.getDate()).padStart(2, '0')}`;
          const startDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
          const endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
          
          // 현재 날짜가 작업 범위 내에 있는지 확인
          if (dayDateStr >= startDateStr && dayDateStr <= endDateStr) {
            // 시작 인덱스 찾기 (범위 내 첫 번째 날짜)
            if (startIndex === -1) {
              startIndex = index;
            }
            // 끝 인덱스 업데이트 (범위 내 마지막 날짜)
            endIndex = index;
          }
        });
      } else {
        // 연간 뷰: 월 단위로 계산 (endDate 고려)
        const startMonth = startDate.getMonth() + 1; // 1-12
        const endMonth = endDate.getMonth() + 1; // 1-12
        const startYear = startDate.getFullYear();
        const endYear = endDate.getFullYear();
        
        currentPeriods.forEach((monthInfo, index) => {
          const month = (monthInfo as any).month; // 1-12
          const year = currentDate.getFullYear(); // 현재 표시 중인 연도
          
          // 현재 월이 작업 범위 내에 있는지 확인 (endDate까지 포함)
          // 작업의 연도와 현재 표시 중인 연도가 같은 경우만 고려
          const isInRange = (year === startYear && year === endYear) &&
                            (month >= startMonth && month <= endMonth);
          
          console.log(`[DEBUG] 월 ${month} 범위 확인:`, {
            month,
            year,
            startYear,
            endYear,
            startMonth,
            endMonth,
            isInRange
          });
          
          if (isInRange) {
            if (startIndex === -1) {
              startIndex = index;
            }
            endIndex = index;
          }
        });
      }
      
      if (startIndex !== -1 && endIndex !== -1) {
        // 대표 작업 (첫 번째 작업)
        const representativeTask = groupTasks[0];
        
        taskGroups.push({
          task: representativeTask,
          tasks: groupTasks,
          startDate,
          endDate,
          startDayIndex: startIndex,
          endDayIndex: endIndex,
          isFirstDay: true,
          isLastDay: true,
          taskGroupId: taskGroupId,
          cropName: representativeTask.title?.split('_')[0] || '작물' // "작물명_작업명"에서 작물명 추출
        });
        
        // 처리된 작업들을 마킹
        groupTasks.forEach(task => processedTasks.add(task.id));
      }
    });
    
    // taskGroupId가 없는 작업들 처리 (기존 방식)
    rowTasks.forEach(task => {
      if (processedTasks.has(task.id)) return;
      
        // 멀티데이 일정인 경우 (endDate가 있고 시작일과 다른 경우)
        if ((task as any).endDate && (task as any).endDate !== task.scheduledDate) {
        const startDate = new Date(task.scheduledDate);
        const endDate = new Date((task as any).endDate);
        
        console.log(`[DEBUG] 멀티데이 작업 처리 중:`, {
          taskId: task.id,
          title: task.title,
          startDate: task.scheduledDate,
          endDate: (task as any).endDate,
          startDateObj: startDate,
          endDateObj: endDate
        });
        
        // 현재 표시 중인 기간 범위 내에서의 시작/끝 인덱스 계산
        let startIndex = -1;
        let endIndex = -1;
        
        if (viewMode === "monthly") {
          // 월간 뷰: 일 단위로 계산
          currentPeriods.forEach((dayInfo, index) => {
            const dayDate = new Date((dayInfo as any).year, (dayInfo as any).month, (dayInfo as any).day);
            
            // 날짜를 YYYY-MM-DD 형식으로 정규화하여 정확한 비교
            const dayDateStr = `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, '0')}-${String(dayDate.getDate()).padStart(2, '0')}`;
            const startDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
            const endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
            
            // 현재 날짜가 작업 범위 내에 있는지 확인
            if (dayDateStr >= startDateStr && dayDateStr <= endDateStr) {
              // 시작 인덱스 찾기 (범위 내 첫 번째 날짜)
              if (startIndex === -1) {
                startIndex = index;
              }
              // 끝 인덱스 업데이트 (범위 내 마지막 날짜)
              endIndex = index;
            }
          });
        } else {
          // 연간 뷰: 월 단위로 계산
          const startMonth = startDate.getMonth() + 1; // 1-12
          const endMonth = endDate.getMonth() + 1; // 1-12
          const startYear = startDate.getFullYear();
          const endYear = endDate.getFullYear();
          
          currentPeriods.forEach((monthInfo, index) => {
            const month = (monthInfo as any).month; // 1-12
            const year = currentDate.getFullYear();
            
            // 현재 월이 작업 범위 내에 있는지 확인
            const isInRange = (year > startYear || (year === startYear && month >= startMonth)) &&
                              (year < endYear || (year === endYear && month <= endMonth));
            
            if (isInRange) {
              if (startIndex === -1) {
                startIndex = index;
              }
              endIndex = index;
            }
          });
        }
        
        // 시작과 끝 인덱스가 모두 유효한 경우 그룹 추가
        if (startIndex !== -1 && endIndex !== -1) {
          console.log(`[DEBUG] 멀티데이 일정 감지:`, {
            taskId: task.id,
            title: task.title,
            startDate: task.scheduledDate,
            endDate: (task as any).endDate,
            startIndex,
            endIndex,
            spanDays: endIndex - startIndex + 1
          });
          
          if (viewMode === "yearly") {
            // 연간 뷰: 연속된 월을 하나의 박스로 표시
            const taskStartMonth = startDate.getMonth() + 1;
            const taskEndMonth = endDate.getMonth() + 1;
            const taskStartYear = startDate.getFullYear();
            const taskEndYear = endDate.getFullYear();
            
            // 시작 월과 종료 월의 인덱스 찾기
            const startMonthIndex = currentPeriods.findIndex(p => (p as any).month === taskStartMonth);
            const endMonthIndex = currentPeriods.findIndex(p => (p as any).month === taskEndMonth);
            
            if (startMonthIndex !== -1 && endMonthIndex !== -1) {
              taskGroups.push({
                task,
                tasks: [task],
                startDate: startDate,
                endDate: endDate,
                startDayIndex: startMonthIndex,
                endDayIndex: endMonthIndex,
                isFirstDay: true,
                isLastDay: true
              });
            }
          } else {
            // 월간 뷰: 월을 넘나드는 경우 각 월별로 별도의 박스 생성
            const startMonth = (currentPeriods[startIndex] as any).month;
            const endMonth = (currentPeriods[endIndex] as any).month;
            
            if (startMonth === endMonth) {
              // 같은 월 내에서만 표시되는 경우
              taskGroups.push({
                task,
                tasks: [task],
                startDate,
                endDate,
                startDayIndex: startIndex,
                endDayIndex: endIndex,
                isFirstDay: true,
                isLastDay: true
              });
            } else {
              // 월을 넘나드는 경우 하나의 연속된 박스로 표시
              // 현재 표시 중인 10일 범위에서 작업이 걸쳐있는 전체 범위를 하나의 박스로 처리
              taskGroups.push({
                task,
                tasks: [task],
                startDate,
                endDate,
                startDayIndex: startIndex,
                endDayIndex: endIndex,
                isFirstDay: true,
                isLastDay: true
              });
            }
          }
          
          processedTasks.add(task.id);
        } else {
          console.log(`[DEBUG] 멀티데이 일정 감지 실패:`, {
            taskId: task.id,
            title: task.title,
            startDate: task.scheduledDate,
            endDate: (task as any).endDate,
            startIndex,
            endIndex
          });
        }
      }
    });
    
    return taskGroups;
  };

  // 월간 뷰 네비게이션
  const handleMonthlyPrevious = () => {
    if (monthlyOffset > 0) {
      setMonthlyOffset(monthlyOffset - 1);
    } else {
      // 이전 달로 이동
      const newDate = new Date(monthlyDate.getFullYear(), monthlyDate.getMonth() - 1, 1);
      setMonthlyDate(newDate);
      const daysInPrevMonth = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0).getDate();
      setMonthlyOffset(Math.floor((daysInPrevMonth - 1) / 5));
    }
  };

  const handleMonthlyNext = () => {
    // 현재 표시되는 10일 구간에서 마지막 날짜 확인
    const currentPeriods = getMonthlyDays();
    const lastDay = currentPeriods[currentPeriods.length - 1];
    
    // 마지막 날이 다음 달로 넘어간 경우, 다음 달로 이동
    if (!lastDay.isCurrentMonth) {
      const newDate = new Date(lastDay.year, lastDay.month, 1);
      setMonthlyDate(newDate);
      setMonthlyOffset(0);
    } else {
      // 현재 달 내에서 5일씩 이동
      const daysInMonth = new Date(monthlyDate.getFullYear(), monthlyDate.getMonth() + 1, 0).getDate();
      const nextStartDay = 1 + (monthlyOffset + 1) * 5;
      
      // 다음 구간이 현재 달을 넘어가는 경우 다음 달로 이동
      if (nextStartDay > daysInMonth) {
        const newDate = new Date(monthlyDate.getFullYear(), monthlyDate.getMonth() + 1, 1);
        setMonthlyDate(newDate);
        setMonthlyOffset(0);
      } else {
        setMonthlyOffset(monthlyOffset + 1);
      }
    }
  };

  // 연간 뷰 네비게이션
  const handleYearlyPrevious = () => {
    // 이전 년도로 이동
    setYearlyDate(new Date(yearlyDate.getFullYear() - 1, 0, 1));
  };

  const handleYearlyNext = () => {
    // 다음 년도로 이동
    setYearlyDate(new Date(yearlyDate.getFullYear() + 1, 0, 1));
  };

  const currentPeriods = viewMode === "monthly" ? getMonthlyDays() : getYearlyMonths().map(month => ({ month }));
  const headerLabel = viewMode === "monthly" ? "이랑\\일" : "이랑\\월";
  
  // 오늘 날짜인지 확인하는 함수
  const isToday = (dayInfo: any) => {
    if (viewMode === "monthly") {
      return (
        today.getFullYear() === dayInfo.year &&
        today.getMonth() === dayInfo.month &&
        today.getDate() === dayInfo.day
      );
    } else {
      return (
        today.getFullYear() === currentDate.getFullYear() &&
        today.getMonth() + 1 === dayInfo.month
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-4">나의 캘린더</h1>
      </div>

      {/* 컨트롤 */}
      <div className="flex flex-col gap-2">
        {/* 첫 번째 줄: CSV + 공유 + 댓글 버튼 */}
        <div className="flex items-center justify-end gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                aria-label="CSV로 내보내기"
                title="CSV로 내보내기"
              >
                <FileDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportCsv}>
                CSV로 내보내기
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportGoogleSheets}>
                구글 시트로 내보내기
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowShareDialog(true)}
            aria-label="캘린더 공유"
            title="캘린더 공유"
          >
            <Share2 className="w-4 h-4" />
          </Button>
          {/* 댓글 패널 */}
          {selectedFarm && user && (
            <CalendarCommentsPanel calendarId={selectedFarm.id} userRole={userRole || null} />
          )}
        </div>

        {/* 두 번째 줄: 농장 선택 + 월간 + 연간 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {farmsLoading ? (
              <div className="w-32 h-10 bg-gray-200 rounded animate-pulse"></div>
            ) : farms.length > 0 ? (
              <Select 
                value={selectedFarm?.id || "no-farm"} 
                onValueChange={(value) => {
                  if (value !== "no-farm") {
                    const farm = farms.find(f => f.id === value);
                    if (farm) setSelectedFarm(farm);
                  }
                }}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="농장 선택" />
                </SelectTrigger>
                <SelectContent>
                  {/* 내 농장 섹션 */}
                  {myFarms.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-gray-500">내 농장</div>
                      {myFarms.map((farm) => (
                        <SelectItem key={farm.id} value={farm.id}>
                          {farm.name} ({farm.environment})
                        </SelectItem>
                      ))}
                    </>
                  )}
                  
                  {/* 친구 농장 섹션 */}
                  {friendFarms.length > 0 && myFarms.length > 0 && (
                    <div className="h-px bg-gray-200 my-1" />
                  )}
                  {friendFarms.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-gray-500">친구 농장</div>
                      {friendFarms.map((farm) => (
                        <SelectItem key={farm.id} value={farm.id}>
                          {farm.name} ({farm.environment})
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            ) : (
              <div className="text-sm text-gray-500">
                등록된 농장이 없습니다
              </div>
            )}
          </div>

          <div className="flex space-x-2">
            <Button
              variant={viewMode === "monthly" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setViewMode("monthly");
                // 월간 뷰로 전환 시 오늘 날짜로 리셋
                const newMonthlyDate = new Date(today.getFullYear(), today.getMonth(), 1);
                setMonthlyDate(newMonthlyDate);
                setMonthlyOffset(Math.floor((today.getDate() - 1) / 5));
              }}
            >
              월간
            </Button>
            <Button
              variant={viewMode === "yearly" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setViewMode("yearly");
                // 연간 뷰로 전환 시 현재 년도로 리셋
                setYearlyDate(new Date(today.getFullYear(), 0, 1));
              }}
            >
              연간
            </Button>
          </div>
        </div>
      </div>

      {/* 네비게이션 */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={viewMode === "monthly" ? handleMonthlyPrevious : handleYearlyPrevious}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <h2 className="text-lg font-semibold text-gray-900">
          {viewMode === "monthly" 
            ? (() => {
                if (!currentPeriods || currentPeriods.length === 0) return "농장 달력";
                const firstDay = currentPeriods[0] as any;
                const lastDay = currentPeriods[currentPeriods.length - 1] as any;
                
                // 첫 날과 마지막 날이 같은 월인 경우
                if (firstDay.month === lastDay.month) {
                  return `${firstDay.year}년 ${firstDay.month + 1}월 ${firstDay.day}일-${lastDay.day}일`;
                } else {
                  // 다른 월인 경우
                  return `${firstDay.year}년 ${firstDay.month + 1}월 ${firstDay.day}일 - ${lastDay.year}년 ${lastDay.month + 1}월 ${lastDay.day}일`;
                }
              })()
            : `${yearlyDate.getFullYear()}년`
          }
        </h2>

        <Button
          variant="outline"
          size="sm"
          onClick={viewMode === "monthly" ? handleMonthlyNext : handleYearlyNext}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* 캘린더 그리드 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div 
          ref={scrollContainerRef} 
          className="overflow-auto max-h-[700px]"
          style={{ WebkitUserSelect: "none", userSelect: "none" }}
        >
          <div 
            style={{
              width: viewMode === "monthly" 
                ? (isMobile ? `${40 + 70 * currentPeriods.length}px` : `${60 + 120 * currentPeriods.length}px`)
                : (isMobile ? `${40 + 100 * currentPeriods.length}px` : `${60 + 100 * currentPeriods.length}px`),
              minWidth: viewMode === "monthly" 
                ? (isMobile ? `${40 + 70 * currentPeriods.length}px` : `${60 + 120 * currentPeriods.length}px`)
                : (isMobile ? `${40 + 100 * currentPeriods.length}px` : `${60 + 100 * currentPeriods.length}px`)
            }}
          >
            {/* 헤더 */}
            <div className="flex border-b border-gray-200 bg-gray-50 sticky top-0 z-30 shadow-sm">
              <div className="w-[40px] md:w-[60px] border-r border-gray-200 flex-shrink-0 relative sticky left-0 z-30 bg-gray-50 shadow-sm">
                <div className="absolute inset-0 p-0.5 md:p-1">
                  {/* 대각선 */}
                  <svg className="absolute inset-0 w-full h-full">
                    <line x1="0" y1="0" x2="100%" y2="100%" stroke="#d1d5db" strokeWidth="1"/>
                  </svg>
                  {/* 이랑 텍스트 (왼쪽 하단) */}
                  <div className="absolute bottom-0.5 left-0.5 md:bottom-1 md:left-1 text-[8px] md:text-xs font-medium text-gray-600 leading-tight whitespace-nowrap">
                    이랑
                  </div>
                  {/* 일/월 텍스트 (오른쪽 상단) */}
                  <div className="absolute top-0.5 right-0.5 md:top-1 md:right-1 text-[8px] md:text-xs font-medium text-gray-600 leading-tight whitespace-nowrap">
                    {viewMode === "monthly" ? "일" : "월"}
                  </div>
                </div>
              </div>
              {currentPeriods.map((dayInfo, index) => (
                <div 
                  key={viewMode === "monthly" ? `${(dayInfo as any).year}-${(dayInfo as any).month}-${(dayInfo as any).day}` : (dayInfo as any).month}
                  className={`${viewMode === "yearly" ? "w-[100px]" : "w-[70px] md:w-[120px]"} flex-shrink-0 p-1 md:p-3 text-center font-medium border-r border-gray-200 ${
                    isToday(dayInfo) 
                      ? "bg-green-100 text-green-800 font-bold" 
                      : "text-gray-600"
                  } ${viewMode === "monthly" && (dayInfo as any).isCurrentMonth === false ? "text-gray-400" : ""}`}
                >
                  {viewMode === "monthly" ? (
                    <div>
                      <div className="text-xs">{(dayInfo as any).day}</div>
                      {!(dayInfo as any).isCurrentMonth && (
                        <div className="text-xs text-gray-400">{(dayInfo as any).month + 1}월</div>
                      )}
                    </div>
                  ) : (
                    (dayInfo as any).month
                  )}
                </div>
              ))}
            </div>

            {/* 이랑별 데이터 */}
            <div>
              {rowNumbers.map((rowNumber) => {
                const continuousTaskGroupsRaw = viewMode === "yearly" 
                  ? getYearlyTaskGroups(rowNumber)
                  : getContinuousTaskGroups(rowNumber);
                
                // ===== 우선순위 적용: 일괄등록 작업을 먼저 표시 =====
                const continuousTaskGroups = [...continuousTaskGroupsRaw].sort((a, b) => {
                  // taskGroupId가 있으면 일괄등록 (우선순위 높음)
                  const aIsBatch = !!a.taskGroupId;
                  const bIsBatch = !!b.taskGroupId;
                  
                  if (aIsBatch && !bIsBatch) return -1; // a가 일괄등록이면 앞으로
                  if (!aIsBatch && bIsBatch) return 1;  // b가 일괄등록이면 뒤로
                  return 0; // 같은 타입이면 순서 유지
                });
                
                // 박스 높이와 간격 계산 (이랑 전체에서 사용)
                const boxHeight = viewMode === "yearly" ? 40 : 32;
                const boxSpacing = 4;
                const topOffset = 8;
                
                // 연속 일정 박스를 위한 최소 높이 계산
                const visibleBoxCount = Math.min(continuousTaskGroups.length, 2); // 2개만 표시
                const isSingleBox = continuousTaskGroups.length === 1;
                const singleBoxHeight = isSingleBox ? Math.max(boxHeight * 2.5, 80) : boxHeight;
                const requiredHeight = isSingleBox 
                  ? Math.max(singleBoxHeight + 16, 96)  // 최소 높이: 박스 높이 + 위아래 8px씩
                  : topOffset + (visibleBoxCount * (boxHeight + boxSpacing)) + 10; // 하단 여백 10px
                
                return (
                  <div key={rowNumber} className="relative flex border-b border-gray-200 last:border-b-0">
                    {/* 이랑 번호 */}
                    <div className="w-[40px] md:w-[60px] p-1 md:p-3 text-center font-medium text-gray-900 border-r border-gray-200 bg-gray-50 flex-shrink-0 sticky left-0 z-20 text-sm md:text-base shadow-sm">
                      {rowNumber}
                    </div>

                    {/* 연속된 일정 박스들을 위한 컨테이너 - 상단에 표시 */}
                    <div className={`absolute ${isMobile ? 'left-[40px]' : 'left-[60px]'} right-0 top-0 pointer-events-none overflow-visible`} style={{ height: '48%', maxHeight: '80px' }}>
                    {/* 연속된 일정 박스들 렌더링 (월간/연간 뷰) - 최대 2개까지 표시 */}
                    {(() => {
                      const maxVisibleLanes = 2;
                      const fixedBoxHeight = 28; // 고정 높이 (px) - 줄임
                      const gapSizePx = 3; // 간격 - 줄임
                      const topPadding = 4; // 상단 여백
                              
                      const sortedGroups = [...continuousTaskGroups].sort((a, b) => {
                        // 1순위: 시작일
                        if (a.startDayIndex !== b.startDayIndex) {
                          return a.startDayIndex - b.startDayIndex;
                        }
                        // 2순위: 종료일
                        return a.endDayIndex - b.endDayIndex;
                      });

                      const lanes: number[] = [];
                      const groupsWithLaneBase = sortedGroups.map((group) => {
                        let laneIndex = lanes.findIndex((laneEnd) => group.startDayIndex > laneEnd);

                        if (laneIndex === -1) {
                          lanes.push(group.endDayIndex);
                          laneIndex = lanes.length - 1;
                        } else {
                          lanes[laneIndex] = Math.max(lanes[laneIndex], group.endDayIndex);
                        }

                        return { ...group, laneIndex };
                      });

                      const groupsWithLane: TaskGroupWithLane[] = groupsWithLaneBase.map((group, _, arr) => {
                        const overlapCount = arr.reduce((count, other) => {
                          if (
                            other.startDayIndex <= group.endDayIndex &&
                            other.endDayIndex >= group.startDayIndex
                          ) {
                            return count + 1;
                          }
                          return count;
                        }, 0);
                        return { ...group, overlapCount: overlapCount || 1 };
                      });

                      const visibleGroups = groupsWithLane.filter((group) => group.laneIndex < maxVisibleLanes);

                      return (
                        <>
                          {visibleGroups.map((taskGroup, groupIndex) => {
                      const laneIndex = taskGroup.laneIndex;
                      // 일괄등록(group_id 있음)은 개별등록과 동일한 스타일 사용
                      const taskColor = taskGroup.taskGroupId 
                        ? getTaskColor(taskGroup.task) // 개별등록과 동일한 색상
                        : getTaskColor(taskGroup.task); // 기존 연속 작업 색상
                      
                      // 정확한 그리드 위치 계산
                      const totalUnits = currentPeriods.length; // 총 단위 (날짜/월 개수)
                      const spanUnits = taskGroup.endDayIndex - taskGroup.startDayIndex + 1; // 일정이 걸리는 단위 수
                      
                      // 시작 위치와 너비 계산
                      let leftPosition, boxWidth;
                      const horizontalPadding = 4; // 좌우 여백
                      
                      if (viewMode === "yearly") {
                        // 연간 뷰
                        const cellWidth = 100;
                        if (spanUnits === 1) {
                          // 단일 셀: 여백을 두고 중앙 배치
                          leftPosition = `${taskGroup.startDayIndex * cellWidth + horizontalPadding}px`;
                          boxWidth = `${cellWidth - horizontalPadding * 2}px`;
                        } else {
                          // 여러 셀 걸침: 셀 경계까지
                          leftPosition = `${taskGroup.startDayIndex * cellWidth}px`;
                          boxWidth = `${spanUnits * cellWidth}px`;
                        }
                      } else {
                        // 월간 뷰
                        const cellWidth = isMobile ? 70 : 120;
                        if (spanUnits === 1) {
                          // 단일 셀: 여백을 두고 중앙 배치
                          leftPosition = `${taskGroup.startDayIndex * cellWidth + horizontalPadding}px`;
                          boxWidth = `${cellWidth - horizontalPadding * 2}px`;
                        } else {
                          // 여러 셀 걸침: 셀 경계까지
                          leftPosition = `${taskGroup.startDayIndex * cellWidth}px`;
                          boxWidth = `${spanUnits * cellWidth}px`;
                        }
                      }
                      
                      // 구글 캘린더 스타일의 둥근 모서리 처리
                      let borderRadiusClass = '';
                      if (viewMode === "yearly") {
                        borderRadiusClass = 'rounded-lg';
                      } else {
                        if (taskGroup.startDayIndex === taskGroup.endDayIndex) {
                          borderRadiusClass = 'rounded-lg';
                        } else {
                          if (taskGroup.isFirstDay || taskGroup.startDayIndex === 0) {
                            borderRadiusClass += 'rounded-l-lg';
                          }
                          if (taskGroup.isLastDay || taskGroup.endDayIndex === currentPeriods.length - 1) {
                            borderRadiusClass += ' rounded-r-lg';
                          }
                        }
                      }
                      
                      // 제목 표시 로직
                      let displayTitle;
                      if (taskGroup.taskGroupId) {
                        displayTitle = taskGroup.cropName || taskGroup.task.title?.split('_')[0] || '작물';
                      } else if (viewMode === "yearly") {
                        displayTitle = taskGroup.cropName || taskGroup.task.title?.split('_')[0] || '작물';
                      } else {
                        displayTitle = taskGroup.task.title || `${taskGroup.task.taskType}`;
                      }
                      
                      // 날짜 표시 로직 (간단한 형식)
                      const startDateStr = taskGroup.startDate.toISOString().split('T')[0].substring(5); // MM-DD
                      const endDateStr = taskGroup.endDate.toISOString().split('T')[0].substring(5); // MM-DD
                      const dateRangeText = startDateStr === endDateStr ? startDateStr : `${startDateStr}~${endDateStr}`;
                      
                      // top과 height 계산 (고정 높이 사용)
                      const topValue = `${topPadding + laneIndex * (fixedBoxHeight + gapSizePx)}px`;
                      const heightValue = `${fixedBoxHeight}px`;
                      
                      return (
                        <div
                          key={`continuous-task-${rowNumber}-${groupIndex}`}
                          className={`absolute ${taskColor} ${borderRadiusClass} text-xs font-medium border border-opacity-50 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity flex items-center shadow-sm pointer-events-auto`}
                          style={{
                            left: leftPosition,
                            width: boxWidth,
                            top: topValue,
                            height: heightValue,
                            zIndex: 5,
                            position: 'absolute',
                            maxWidth: '100%'
                          }}
                          title={`${displayTitle} (${taskGroup.startDate.toISOString().split('T')[0]} ~ ${taskGroup.endDate.toISOString().split('T')[0]})`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!canEditTask) {
                              return;
                            }
                            setSelectedTask(taskGroup.task);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          {viewMode === "yearly" ? (
                           <div className="flex flex-col truncate w-full px-1 py-1">
                              <div className={`truncate text-[10px] md:text-[11px] ${
                                ['파종', '육묘', '수확'].includes(taskGroup.task.taskType) ? 'font-bold' : 'font-semibold'
                              }`}>
                                {displayTitle}
                              </div>
                              <div className="text-[9px] md:text-[10px] opacity-75 truncate">
                                {typeof dateRangeText === 'string' ? dateRangeText : ''}
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col truncate w-full px-1 py-1">
                              <div className={`truncate text-[10px] md:text-[11px] ${
                                ['파종', '육묘', '수확'].includes(taskGroup.task.taskType) ? 'font-bold' : 'font-semibold'
                              }`}>
                                {displayTitle}
                              </div>
                              <div className="text-[9px] md:text-[10px] opacity-75 truncate">
                                {typeof dateRangeText === 'string' ? dateRangeText : ''}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                        </>
                      );
                    })()}
                    </div>

                    {/* 각 날짜/월의 작업 - 모든 작업 통합 표시 */}
                    {currentPeriods.map((dayInfo, index) => {
                      const periodTasks = getTasksForPeriod(rowNumber, dayInfo);
                      const isTodayCell = isToday(dayInfo);
                      
                      // 이 셀을 지나가는 연속 박스 개수 확인
                      const continuousTasksInCell = continuousTaskGroups.filter(taskGroup => 
                        taskGroup.startDayIndex <= index && taskGroup.endDayIndex >= index
                      );
                      
                      // 연속 박스로 표시되는 모든 작업의 ID 수집 (중복 방지)
                      const continuousTaskIds = new Set<string>();
                      continuousTasksInCell.forEach(taskGroup => {
                        taskGroup.tasks.forEach(task => continuousTaskIds.add(task.id));
                      });
                      
                      // 이 셀의 모든 작업 중에서 연속 박스로 이미 표시된 작업 제외
                      const remainingTasks = periodTasks.filter(task => {
                        return !continuousTaskIds.has(task.id);
                      });
                      
                      // 표시 가능한 총 슬롯: 2개
                      const totalSlots = 2;
                      
                      // 상단 연속 박스가 차지하는 슬롯 (최대 2개까지만)
                      const continuousBoxCount = Math.min(continuousTasksInCell.length, totalSlots);
                      
                      // 하단에 표시 가능한 단일 작업 슬롯
                      const availableSlotsForSingleTasks = Math.max(0, totalSlots - continuousBoxCount);
                      
                      // 하단에 표시할 작업들 (연속 박스로 표시되지 않은 작업들)
                      const displayTasks = remainingTasks.slice(0, availableSlotsForSingleTasks);
                      
                      // 전체 작업 개수 (연속 박스 + 나머지 작업)
                      const totalTaskCount = continuousTasksInCell.length + remainingTasks.length;
                      
                      // 숨겨진 작업 개수 (전체 - 2)
                      const hiddenTasksCount = Math.max(0, totalTaskCount - totalSlots);
                      
                      // 1개만 있는지 확인
                      const isSingleTask = totalTaskCount === 1;
                      
                      // 셀의 최소 높이
                      const cellMinHeight = 100;
                      
                      const cellDateStr = viewMode === "monthly"
                        ? `${(dayInfo as any).year}-${String((dayInfo as any).month + 1).padStart(2, '0')}-${String((dayInfo as any).day).padStart(2, '0')}`
                        : "";
                      const dragSelectionActive =
                        viewMode === "monthly" &&
                        !!cellDateStr &&
                        isDateWithinDragRange(rowNumber, cellDateStr);

                      return (
                        <div
                          key={viewMode === "monthly" ? `${rowNumber}-${(dayInfo as any).year}-${(dayInfo as any).month}-${(dayInfo as any).day}` : `${rowNumber}-${(dayInfo as any).month}`}
                          className={`${viewMode === "yearly" ? "w-[100px]" : "w-[70px] md:w-[120px]"} flex-shrink-0 p-1 md:p-2 border-r border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors relative ${
                            isTodayCell ? "bg-green-50 border-green-200" : ""
                          } ${viewMode === "monthly" && (dayInfo as any).isCurrentMonth === false ? "bg-gray-25" : ""} ${
                            viewMode === "monthly" && selectedCellDate === cellDateStr ? "bg-blue-50 border-blue-300 border-2" : ""
                          }`}
                          data-calendar-cell="true"
                          data-date={cellDateStr || ""}
                          data-row-number={rowNumber}
                          style={{
                            minHeight: `${cellMinHeight}px`,
                          }}
                          onClick={() => {
                            if (viewMode === "monthly" && !isDraggingDates) {
                              handleDateSelection(cellDateStr, rowNumber);
                            }
                          }}
                          onDoubleClick={(e) => {
                            if (viewMode !== "monthly") return;
                            e.stopPropagation();
                            if (isDraggingDates) {
                              resetDragState();
                            }
                            openAddTaskShortcut(cellDateStr, rowNumber);
                          }}
                          onPointerDown={(event) => handleCellPointerDown(event, cellDateStr, rowNumber)}
                          onPointerEnter={(event) => handleCellPointerEnter(event, cellDateStr, rowNumber)}
                          onPointerUp={handleCellPointerUp}
                          onPointerLeave={cancelLongPressTimer}
                          onPointerCancel={cancelLongPressTimer}
                        >
                          {dragSelectionActive && (
                            <div className="absolute inset-1 rounded-lg border-2 border-blue-400/60 bg-blue-100/50 pointer-events-none" />
                          )}
                          {/* 작업 표시 영역 - 모든 작업 동일한 크기로 표시 */}
                          <div className="absolute left-0 right-0 flex flex-col px-1" style={{ 
                            top: `${4 + Math.min(continuousBoxCount, 2) * (28 + 3)}px`,
                            gap: '3px',
                            zIndex: 10,
                          }}>
                              {viewMode === "monthly" ? (
                                <>
                                  {/* 월간 뷰: 단일 작업 표시 */}
                                  {displayTasks.map((task) => (
                                    <div 
                                      key={task.id} 
                                      className={`${getTaskColor(task)} px-2 rounded-lg border text-[10px] md:text-[11px] cursor-pointer hover:opacity-80 truncate flex items-center font-semibold`}
                                      style={{ height: '28px' }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (!canEditTask) return;
                                        setSelectedTask(task);
                                        setIsEditDialogOpen(true);
                                      }}
                                      title={task.title || task.taskType}
                                    >
                                      {task.title || task.taskType}
                                    </div>
                                  ))}
                              
                                {/* 더보기 버튼 - 3개 이상일 때만 표시 (작업 개수 - 2 = N) */}
                                {totalTaskCount >= 3 && hiddenTasksCount > 0 && (
                                  <button
                                    type="button"
                                    className="text-[10px] md:text-[11px] text-gray-600 text-center px-2 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors font-semibold flex items-center justify-center"
                                    style={{ height: '28px' }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const dateStr = `${(dayInfo as any).year}-${String((dayInfo as any).month + 1).padStart(2, '0')}-${String((dayInfo as any).day).padStart(2, '0')}`;
                                      
                                      // 숨겨진 작업: 연속 박스 중 표시되지 않은 것 + 하단에 표시되지 않은 작업들
                                      const hiddenContinuous = continuousTasksInCell.slice(2).map(g => g.task);
                                      const hiddenRemaining = remainingTasks.slice(availableSlotsForSingleTasks);
                                      
                                      setShowAllTasksDialog({
                                        rowNumber,
                                        date: dateStr,
                                        tasks: [...hiddenContinuous, ...hiddenRemaining]
                                      });
                                    }}
                                  >
                                    +{hiddenTasksCount}
                                  </button>
                                )}
                              </>
                            ) : (
                              <>
                                {/* 연간 뷰: 단일 작업 표시 */}
                                {displayTasks.map((task) => {
                                  let cropName;
                                  if (task.title && task.title.includes('_')) {
                                    cropName = task.title?.split('_')[0] || '작물';
                                  } else {
                                    cropName = getCropName(task.cropId) || task.title || task.taskType;
                                  }
                                  
                                  return (
                                    <div 
                                      key={task.id} 
                                      className={`${getTaskColor(task)} px-2 rounded-lg border text-[10px] md:text-[11px] cursor-pointer hover:opacity-80 truncate flex items-center font-semibold`}
                                      style={{ height: '28px' }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (!canEditTask) return;
                                        setSelectedTask(task);
                                        setIsEditDialogOpen(true);
                                      }}
                                      title={cropName}
                                    >
                                      {cropName}
                                    </div>
                                  );
                                })}
                                
                                {/* 더보기 버튼 - 연간 뷰, 3개 이상일 때만 표시 */}
                                {totalTaskCount >= 3 && hiddenTasksCount > 0 && (
                                  <button
                                    type="button"
                                    className="text-[10px] md:text-[11px] text-gray-600 text-center px-2 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors font-semibold flex items-center justify-center"
                                    style={{ height: '28px' }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      
                                      // 숨겨진 작업: 연속 박스 중 표시되지 않은 것 + 하단에 표시되지 않은 작업들
                                      const hiddenContinuous = continuousTasksInCell.slice(2).map(g => g.task);
                                      const hiddenRemaining = remainingTasks.slice(availableSlotsForSingleTasks);
                                      
                                      setShowAllTasksDialog({
                                        rowNumber,
                                        date: `${(dayInfo as any).month}월`,
                                        tasks: [...hiddenContinuous, ...hiddenRemaining]
                                      });
                                    }}
                                  >
                                    +{hiddenTasksCount}
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                    );
                  })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Selected Date Task Section - 월간 뷰에서만 표시 */}
      {viewMode === "monthly" && selectedCellDate && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {selectedCellDate} 작업
            </h3>
              <Button 
                size="sm" 
                className="flex items-center space-x-1"
                onClick={() => {
                  setSelectedDateForTask(selectedCellDate);
                  setShowAddTaskDialog(true);
                }}
              disabled={!canCreateTask}
              title={!canCreateTask ? "읽기 권한만 있어 작업을 추가할 수 없습니다" : ""}
            >
              <Plus className="w-4 h-4" />
              <span>작업 추가</span>
            </Button>
          </div>
          
          <div className="space-y-3">
            {memoizedTasks
              .filter(task => {
                // 정확한 날짜 매칭 또는 날짜 범위 내 포함
                let isDateMatch = task.scheduledDate === selectedCellDate;
                
                if (!isDateMatch && (task as any).endDate) {
                  // 날짜 범위가 있는 작업의 경우 범위 내 포함 여부 확인
                  const taskStartDate = new Date(task.scheduledDate);
                  const taskEndDate = new Date((task as any).endDate);
                  const currentDate = new Date(selectedCellDate);
                  
                  isDateMatch = currentDate >= taskStartDate && currentDate <= taskEndDate;
                }
                
                return isDateMatch && task.farmId === selectedFarm?.id;
              })
              .length > 0 ? (
              memoizedTasks
                .filter(task => {
                  // 정확한 날짜 매칭 또는 날짜 범위 내 포함
                  let isDateMatch = task.scheduledDate === selectedCellDate;
                  
                  if (!isDateMatch && (task as any).endDate) {
                    // 날짜 범위가 있는 작업의 경우 범위 내 포함 여부 확인
                    const taskStartDate = new Date(task.scheduledDate);
                    const taskEndDate = new Date((task as any).endDate);
                    const currentDate = new Date(selectedCellDate);
                    
                    isDateMatch = currentDate >= taskStartDate && currentDate <= taskEndDate;
                  }
                  
                  return isDateMatch && task.farmId === selectedFarm?.id;
                })
                .map((task) => {
                  const crop = crops.find(c => c.id === task.cropId);
                  return (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                    >
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {task.title || (crop?.name ? `${crop.name} - ${task.taskType}` : task.taskType || '작업')}
                        </h4>
                        {task.description && (
                          <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                        )}
                        <div className="flex items-center space-x-2 mt-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            task.completed === 1
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {task.completed === 1 ? '완료' : '예정'}
                          </span>
                          {(task.rowNumber || (task.description && task.description.includes("이랑:"))) && (
                            <span className="text-xs text-gray-500">
                              이랑 {task.rowNumber || (() => {
                                const match = task.description?.match(/이랑:\s*(\d+)번/);
                                return match ? match[1] : "";
                              })()}
                            </span>
                          )}
                          {(task as any).endDate && (task as any).endDate !== task.scheduledDate && (
                            <span className="text-xs text-blue-600">
                              {task.scheduledDate} ~ {(task as any).endDate}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          // 권한 체크: commenter나 viewer는 수정 불가
                          if (!canEditTask) {
                            return;
                          }
                          console.log("수정 버튼 클릭, task 데이터:", task);
                          setSelectedTask(task);
                          setIsEditDialogOpen(true);
                        }}
                        disabled={!canEditTask || task.userId !== user?.id}
                        title={!canEditTask ? "읽기 권한만 있어 작업을 수정할 수 없습니다" : task.userId !== user?.id ? "본인이 등록한 작업만 수정할 수 있습니다" : ""}
                      >
                        수정
                      </Button>
                    </div>
                  );
                })
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>이 날짜에 예정된 작업이 없습니다.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 전체 작업 목록 다이얼로그 */}
      {showAllTasksDialog && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowAllTasksDialog(null)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold text-gray-900">
                {showAllTasksDialog.date} - {showAllTasksDialog.tasks.length}개 작업
              </h3>
              <button
                onClick={() => setShowAllTasksDialog(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(80vh-80px)]">
              <div className="space-y-3">
                {showAllTasksDialog.tasks.map((task) => {
                  const crop = crops.find(c => c.id === task.cropId);
                  return (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => {
                        if (canEditTask && task.userId === user?.id) {
                          setSelectedTask(task);
                          setIsEditDialogOpen(true);
                          setShowAllTasksDialog(null);
                        }
                      }}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium text-gray-900">
                            {task.title || (crop?.name ? `${crop.name} - ${task.taskType}` : task.taskType || '작업')}
                          </h4>
                          <span className={`text-xs px-2 py-0.5 rounded ${getTaskColor(task)}`}>
                            {task.taskType}
                          </span>
                        </div>
                        {task.description && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{task.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            task.completed === 1
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {task.completed === 1 ? '완료' : '예정'}
                          </span>
                          {task.rowNumber && (
                            <span className="text-xs text-gray-500">
                              이랑 {task.rowNumber}
                            </span>
                          )}
                          {(task as any).endDate && (task as any).endDate !== task.scheduledDate && (
                            <span className="text-xs text-blue-600">
                              {task.scheduledDate} ~ {(task as any).endDate}
                            </span>
                          )}
                        </div>
                      </div>
                      {canEditTask && task.userId === user?.id && (
                        <div className="ml-4 text-gray-400 hover:text-gray-600">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Dialog */}
      {user && selectedFarm && (
        <CalendarShareDialog 
          open={showShareDialog} 
          onOpenChange={setShowShareDialog}
          farmId={selectedFarm.id}
        />
      )}

      {/* Add Task Dialog */}
      <AddTaskDialog 
        open={showAddTaskDialog} 
        onOpenChange={(open) => {
          setShowAddTaskDialog(open);
          if (!open) {
            setSelectedRowNumberForTask(null);
            setSelectedEndDateForTask(null);
          }
        }}
        selectedDate={selectedDateForTask}
        selectedEndDate={selectedEndDateForTask ?? undefined}
        defaultFarmId={selectedFarm?.id}
        defaultRowNumber={selectedRowNumberForTask ?? undefined}
      />

      {/* Edit Task Dialog */}
      {selectedTask && (
        <AddTaskDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          task={selectedTask}
          selectedDate={selectedTask.scheduledDate}
          defaultFarmId={selectedFarm?.id}
          defaultRowNumber={selectedRowNumberForTask ?? undefined}
        />
      )}
    </div>
  );
}
