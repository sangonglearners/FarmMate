import { useState, useEffect, useRef, useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AddTaskDialog from "@/components/add-task-dialog-improved";
import type { Task, Crop } from "@shared/schema";
import { useFarms } from "@/features/farm-management/model/farm.hooks";
import type { FarmEntity } from "@/shared/api/farm.repository";
import { getTaskGroups, type TaskGroup } from "@/widgets/calendar-grid/model/calendar.utils";

interface FarmCalendarGridProps {
  tasks: Task[];
  crops: Crop[];
  onDateClick: (date: string) => void;
}

type ViewMode = "monthly" | "yearly";

export default function FarmCalendarGrid({ tasks, crops, onDateClick }: FarmCalendarGridProps) {
  // tasks가 변경될 때마다 컴포넌트가 리렌더링되도록 의존성 추가
  const memoizedTasks = useMemo(() => tasks, [tasks]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("monthly");
  const [selectedFarm, setSelectedFarm] = useState<FarmEntity | null>(null);
  
  
  // 농장 데이터 가져오기
  const { data: farms = [], isLoading: farmsLoading } = useFarms();
  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false);
  const [selectedDateForTask, setSelectedDateForTask] = useState<string>("");
  const [selectedCellDate, setSelectedCellDate] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
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

  // 첫 번째 농장을 기본값으로 설정
  useEffect(() => {
    if (farms.length > 0 && !selectedFarm) {
      setSelectedFarm(farms[0]);
    }
  }, [farms, selectedFarm]);

  const handleExportCsv = () => {
    try {
      const farmIdToName = new Map(farms.map(f => [f.id, f.name] as const));
      const headers = ["농장", "시작일", "종료일", "이랑", "일"];
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
        ];
        return cols.map(escapeCsv).join(",");
      });
      const csv = [headers.join(","), ...rows].join("\n");
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
    
    rowTasks.forEach(task => {
      const startDate = new Date(task.scheduledDate);
      const endDate = (task as any).endDate ? new Date((task as any).endDate) : startDate;
      
      // 작업이 현재 년도에 포함되는지 확인
      if (startDate.getFullYear() === year || endDate.getFullYear() === year) {
        const startMonth = startDate.getMonth() + 1; // 1-12
        const endMonth = endDate.getMonth() + 1; // 1-12
        
        console.log(`[DEBUG] 연간 뷰 작업 처리:`, {
          taskId: task.id,
          title: task.title,
          startMonth,
          endMonth,
          startDate: task.scheduledDate,
          endDate: (task as any).endDate
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
        
        console.log(`[DEBUG] 영향받는 월들:`, affectedMonths);
        
        if (affectedMonths.length > 0) {
          // 연속된 월들을 하나의 박스로 표시
          const startIndex = affectedMonths[0] - 1; // 0-based index
          const endIndex = affectedMonths[affectedMonths.length - 1] - 1; // 0-based index
          
          taskGroups.push({
            task,
            startDate: startDate,
            endDate: endDate,
            startDayIndex: startIndex,
            endDayIndex: endIndex,
            isFirstDay: true,
            isLastDay: true
          });
          
          console.log(`[DEBUG] 연간 뷰 박스 생성:`, {
            taskId: task.id,
            title: task.title,
            startIndex,
            endIndex,
            spanMonths: endIndex - startIndex + 1
          });
        }
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

    // 연속된 일정 그룹화
    const taskGroups: TaskGroup[] = [];
    const processedTasks = new Set<string>();
    
    console.log(`[DEBUG] 이랑 ${rowNumber}의 모든 작업:`, rowTasks.map(task => ({
      id: task.id,
      title: task.title,
      scheduledDate: task.scheduledDate,
      endDate: (task as any).endDate,
      hasEndDate: !!(task as any).endDate
    })));
    
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
                startDate,
                endDate,
                startDayIndex: startIndex,
                endDayIndex: endIndex,
                isFirstDay: true,
                isLastDay: true
              });
            } else {
            // 월을 넘나드는 경우 각 월별로 별도 박스 생성
            // 실제 작업의 월 범위를 계산하여 각 월별로 처리
            const taskStartMonth = startDate.getMonth();
            const taskEndMonth = endDate.getMonth();
            const taskStartYear = startDate.getFullYear();
            const taskEndYear = endDate.getFullYear();
            
            // 작업이 걸쳐있는 모든 월에 대해 박스 생성
            let currentYear = taskStartYear;
            let currentMonth = taskStartMonth;
            
            while (currentYear < taskEndYear || (currentYear === taskEndYear && currentMonth <= taskEndMonth)) {
              // 현재 월에서의 시작일과 종료일 계산
              let monthStartDay, monthEndDay;
              
              if (currentYear === taskStartYear && currentMonth === taskStartMonth) {
                // 첫 번째 월: 작업 시작일부터 월의 마지막 날까지
                monthStartDay = startDate.getDate();
                monthEndDay = new Date(currentYear, currentMonth + 1, 0).getDate();
              } else if (currentYear === taskEndYear && currentMonth === taskEndMonth) {
                // 마지막 월: 월의 첫 날부터 작업 종료일까지
                monthStartDay = 1;
                monthEndDay = endDate.getDate();
              } else {
                // 중간 월: 월의 첫 날부터 마지막 날까지
                monthStartDay = 1;
                monthEndDay = new Date(currentYear, currentMonth + 1, 0).getDate();
              }
              
              // 현재 표시 중인 10일 범위에서 이 월의 날짜들이 포함되는지 확인
              const monthStartDate = new Date(currentYear, currentMonth, monthStartDay);
              const monthEndDate = new Date(currentYear, currentMonth, monthEndDay);
              
              let monthStartIndex = -1;
              let monthEndIndex = -1;
              
              currentPeriods.forEach((dayInfo, index) => {
                const dayDate = new Date((dayInfo as any).year, (dayInfo as any).month, (dayInfo as any).day);
                
                // 현재 날짜가 이 월의 범위 내에 있는지 확인
                if (dayDate >= monthStartDate && dayDate <= monthEndDate) {
                  if (monthStartIndex === -1) {
                    monthStartIndex = index;
                  }
                  monthEndIndex = index;
                }
              });
              
              // 이 월의 날짜가 현재 표시 범위에 포함되는 경우 박스 생성
              if (monthStartIndex !== -1 && monthEndIndex !== -1) {
                taskGroups.push({
                  task,
                  startDate: monthStartDate,
                  endDate: monthEndDate,
                  startDayIndex: monthStartIndex,
                  endDayIndex: monthEndIndex,
                  isFirstDay: currentYear === taskStartYear && currentMonth === taskStartMonth,
                  isLastDay: currentYear === taskEndYear && currentMonth === taskEndMonth
                });
              }
              
              // 다음 월로 이동
              if (currentMonth === 11) {
                currentMonth = 0;
                currentYear++;
              } else {
                currentMonth++;
              }
            }
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
        <h1 className="text-xl font-bold text-gray-900 mb-2">나의 캘린더</h1>
        <p className="text-gray-600 text-sm">월간, 연간 작업 일정을 이랑별로 확인할 수 있습니다</p>
      </div>

      {/* 컨트롤 */}
      <div className="flex items-center justify-between">
        {/* 좌측: 농장 선택 + 내보내기 아이콘 */}
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
                {farms.map((farm) => (
                  <SelectItem key={farm.id} value={farm.id}>
                    {farm.name} ({farm.environment})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="text-sm text-gray-500">
              등록된 농장이 없습니다
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            aria-label="CSV로 내보내기"
            title="CSV로 내보내기"
          >
            <FileDown className="w-4 h-4" />
          </Button>
        </div>

        {/* 우측: 뷰 모드 선택 */}
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
        >
          <div className="min-w-[1300px]">
            {/* 헤더 */}
            <div className="flex border-b border-gray-200 bg-gray-50 sticky top-0 z-30">
              <div className="w-[60px] border-r border-gray-200 flex-shrink-0 relative sticky left-0 z-30 bg-gray-50">
                <div className="absolute inset-0 p-1">
                  {/* 대각선 */}
                  <svg className="absolute inset-0 w-full h-full">
                    <line x1="0" y1="0" x2="100%" y2="100%" stroke="#d1d5db" strokeWidth="1"/>
                  </svg>
                  {/* 이랑 텍스트 (왼쪽 하단) */}
                  <div className="absolute bottom-1 left-1 text-xs font-medium text-gray-600">
                    이랑
                  </div>
                  {/* 일/월 텍스트 (오른쪽 상단) */}
                  <div className="absolute top-1 right-1 text-xs font-medium text-gray-600">
                    {viewMode === "monthly" ? "일" : "월"}
                  </div>
                </div>
              </div>
              {currentPeriods.map((dayInfo, index) => (
                <div 
                  key={viewMode === "monthly" ? `${(dayInfo as any).year}-${(dayInfo as any).month}-${(dayInfo as any).day}` : (dayInfo as any).month}
                  className={`${viewMode === "yearly" ? "w-[100px]" : "w-[120px]"} flex-shrink-0 p-3 text-center font-medium border-r border-gray-200 last:border-r-0 ${
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
                const continuousTaskGroups = viewMode === "yearly" 
                  ? getYearlyTaskGroups(rowNumber)
                  : getContinuousTaskGroups(rowNumber);
                
                return (
                  <div key={rowNumber} className="relative flex border-b border-gray-200 last:border-b-0">
                    {/* 이랑 번호 */}
                    <div className="w-[60px] p-3 text-center font-medium text-gray-900 border-r border-gray-200 bg-gray-50 flex-shrink-0 sticky left-0 z-20">
                      {rowNumber}
                    </div>

                    {/* 연속된 일정 박스들을 위한 컨테이너 - 이랑 열 오른쪽부터 시작 */}
                    <div className="absolute left-[61px] right-0 top-0 bottom-0 pointer-events-none overflow-hidden">
                    {/* 연속된 일정 박스들 렌더링 (월간/연간 뷰) - 최대 3개까지만 표시 */}
                    {(() => {
                      console.log(`[DEBUG] 이랑 ${rowNumber}의 연속된 일정 그룹:`, {
                        totalGroups: continuousTaskGroups.length,
                        showingGroups: Math.min(continuousTaskGroups.length, 3),
                        groups: continuousTaskGroups.map(g => ({ id: g.task.id, title: g.task.title }))
                      });
                      return continuousTaskGroups.slice(0, 3);
                    })().map((taskGroup, groupIndex) => {
                      const taskColor = getTaskColor(taskGroup.task);
                      
                      // 정확한 그리드 위치 계산
                      const totalUnits = currentPeriods.length; // 총 단위 (날짜/월 개수)
                      const spanUnits = taskGroup.endDayIndex - taskGroup.startDayIndex + 1; // 일정이 걸리는 단위 수
                      
                      // 시작 위치와 너비 계산
                      let leftPosition, boxWidth;
                      
                      if (viewMode === "yearly") {
                        // 연간 뷰: 고정 너비 (100px per month)
                        const cellWidth = 100;
                        leftPosition = `${taskGroup.startDayIndex * cellWidth}px`;
                        // spanUnits만큼의 셀 너비 - 중간 border들 제외
                        const middleBorders = Math.max(0, spanUnits - 1);
                        boxWidth = `${spanUnits * cellWidth - middleBorders}px`;
                      } else {
                        // 월간 뷰: flex 기반 계산
                        const startFlexUnits = taskGroup.startDayIndex;
                        const middleBorders = Math.max(0, spanUnits - 1);
                        leftPosition = `calc(${startFlexUnits} * 100% / ${totalUnits})`;
                        boxWidth = `calc(${spanUnits} * 100% / ${totalUnits} - ${middleBorders}px)`;
                      }
                      
                      // 구글 캘린더 스타일의 둥근 모서리 처리
                      let borderRadiusClass = '';
                      if (viewMode === "yearly") {
                        // 연간 뷰: 하나의 연속된 박스
                        if (taskGroup.startDayIndex === taskGroup.endDayIndex) {
                          // 한 달 안에만 있는 경우
                          borderRadiusClass = 'rounded-lg';
                        } else {
                          // 여러 달에 걸친 경우 양쪽 둥글게
                          borderRadiusClass = 'rounded-lg';
                        }
                      } else {
                        // 월간 뷰
                        if (taskGroup.startDayIndex === taskGroup.endDayIndex) {
                          // 하루 일정은 모든 모서리 둥글게
                          borderRadiusClass = 'rounded-lg';
                        } else {
                          // 연속 일정의 경우 - 월별로 올바른 둥근 모서리 적용
                          if (taskGroup.isFirstDay || taskGroup.startDayIndex === 0) {
                            borderRadiusClass += 'rounded-l-lg'; // 첫 번째 날이면 왼쪽 둥글게
                          }
                          if (taskGroup.isLastDay || taskGroup.endDayIndex === currentPeriods.length - 1) {
                            borderRadiusClass += ' rounded-r-lg'; // 마지막 날이면 오른쪽 둥글게
                          }
                        }
                      }
                      
                      // 제목 표시 로직
                      let displayTitle;
                      if (viewMode === "yearly") {
                        // 연간 뷰: 작물 이름만 표시
                        if (taskGroup.task.title && taskGroup.task.title.includes('_')) {
                          displayTitle = taskGroup.task.title.split('_')[0]; // "무_파종" -> "무"
                        } else {
                          // cropId로 작물명 가져오기
                          const cropName = getCropName(taskGroup.task.cropId);
                          displayTitle = cropName || taskGroup.task.title || taskGroup.task.taskType;
                        }
                      } else {
                        // 월간 뷰: 전체 제목 표시
                        displayTitle = taskGroup.task.title || `${taskGroup.task.taskType}`;
                      }
                      
                      // 날짜 표시 로직
                      const formatDateRange = (startDate: Date, endDate: Date) => {
                        if (viewMode === "yearly") {
                          // 연간 뷰: 각 월의 날짜 범위를 객체 배열로 반환
                          const startMonth = startDate.getMonth() + 1;
                          const startDay = startDate.getDate();
                          const endMonth = endDate.getMonth() + 1;
                          const endDay = endDate.getDate();
                          
                          // 같은 날짜인 경우
                          if (startDate.getTime() === endDate.getTime()) {
                            return [{
                              month: startMonth,
                              text: `${startMonth}/${startDay}`,
                              monthIndex: taskGroup.startDayIndex
                            }];
                          }
                          
                          // 같은 월인 경우
                          if (startMonth === endMonth) {
                            return [{
                              month: startMonth,
                              text: `${startMonth}/${startDay}~${endDay}`,
                              monthIndex: taskGroup.startDayIndex
                            }];
                          }
                          
                          // 다른 월인 경우: 각 월의 날짜 범위를 배열로
                          const parts = [];
                          
                          // 시작 월의 날짜 범위 (종료일 생략)
                          const startMonthIndex = currentPeriods.findIndex(p => (p as any).month === startMonth);
                          parts.push({
                            month: startMonth,
                            text: `${startMonth}/${startDay}~`, // 10/29~
                            monthIndex: startMonthIndex
                          });
                          
                          // 중간 월들 (있다면) - 전체 월
                          for (let month = startMonth + 1; month < endMonth; month++) {
                            const monthIndex = currentPeriods.findIndex(p => (p as any).month === month);
                            parts.push({
                              month: month,
                              text: `${month}월`, // 전체 월 표시
                              monthIndex: monthIndex
                            });
                          }
                          
                          // 종료 월의 날짜 범위 (시작일 생략)
                          const endMonthIndex = currentPeriods.findIndex(p => (p as any).month === endMonth);
                          parts.push({
                            month: endMonth,
                            text: `~${endMonth}/${endDay}`, // ~11/3
                            monthIndex: endMonthIndex
                          });
                          
                          return parts;
                        } else {
                          // 월간 뷰: 월/일 표시
                          const startMonth = startDate.getMonth() + 1;
                          const startDay = startDate.getDate();
                          const endMonth = endDate.getMonth() + 1;
                          const endDay = endDate.getDate();
                          
                          // 같은 날짜인 경우
                          if (startDate.getTime() === endDate.getTime()) {
                            return `${startMonth}/${startDay}`;
                          }
                          
                          // 같은 월인 경우
                          if (startMonth === endMonth) {
                            return `${startMonth}/${startDay}~${endDay}`;
                          }
                          
                          // 다른 월인 경우
                          return `${startMonth}/${startDay}~${endMonth}/${endDay}`;
                        }
                      };
                      
                      const dateRangeText = formatDateRange(taskGroup.startDate, taskGroup.endDate);
                      
                      // 디버깅 정보
                      console.log(`[DEBUG] 박스 위치 계산:`, {
                        viewMode,
                        taskId: taskGroup.task.id,
                        title: displayTitle,
                        startIndex: taskGroup.startDayIndex,
                        endIndex: taskGroup.endDayIndex,
                        spanUnits,
                        totalUnits,
                        calculatedLeft: leftPosition,
                        calculatedWidth: boxWidth
                      });
                      
                      // 겹치지 않도록 top 위치 계산
                      const boxHeight = viewMode === "yearly" ? 40 : 32;
                      const boxSpacing = 4; // 박스 간 간격
                      const topOffset = 8; // 상단 여백
                      const calculatedTop = topOffset + (groupIndex * (boxHeight + boxSpacing));
                      
                      return (
                        <div
                          key={`continuous-task-${rowNumber}-${groupIndex}`}
                          className={`absolute ${taskColor} ${borderRadiusClass} ${viewMode === "yearly" ? "" : "px-2 py-1"} text-xs font-medium border border-opacity-50 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity ${viewMode === "yearly" ? "" : "flex items-center"} shadow-sm pointer-events-auto`}
                          style={{
                            left: leftPosition,
                            width: boxWidth,
                            top: `${calculatedTop}px`, // 겹치지 않도록 계산된 위치
                            height: `${boxHeight}px`, // 연간 뷰는 높이를 더 크게
                            zIndex: 5,
                            position: 'absolute' // relative positioning for children in yearly view
                          }}
                          title={`${displayTitle} (${taskGroup.startDate.toISOString().split('T')[0]} ~ ${taskGroup.endDate.toISOString().split('T')[0]})`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTask(taskGroup.task);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          {viewMode === "yearly" ? (
                            // 연간 뷰: 각 월의 날짜를 해당 위치에 배치
                            <>
                              {/* 작물 이름 - 왼쪽 상단에 고정 */}
                              <div className="absolute left-2 top-2 text-[11px] font-semibold truncate max-w-[80px]">
                                {displayTitle}
                              </div>
                              {/* 각 월의 날짜 범위 - 해당 월 위치에 배치 */}
                              {Array.isArray(dateRangeText) && dateRangeText.map((dateInfo: any, idx: number) => {
                                const cellWidth = 100;
                                // 박스 시작점으로부터 해당 월까지의 거리 계산
                                const offsetMonths = dateInfo.monthIndex - taskGroup.startDayIndex;
                                const leftPos = offsetMonths * cellWidth;
                                
                                return (
                                  <div
                                    key={`date-${idx}`}
                                    className="absolute text-[9px] opacity-75 leading-tight whitespace-nowrap"
                                    style={{
                                      left: `${leftPos + 8}px`, // 8px 패딩
                                      top: '22px', // 작물 이름 아래
                                      maxWidth: `${cellWidth - 16}px` // 양쪽 패딩 제외
                                    }}
                                  >
                                    {dateInfo.text}
                                  </div>
                                );
                              })}
                            </>
                          ) : (
                            // 월간 뷰: 기존 방식
                            <div className="flex flex-col truncate w-full">
                              <div className="truncate text-[11px] font-semibold">
                                {displayTitle}
                              </div>
                              <div className="text-[10px] opacity-75 truncate">
                                {typeof dateRangeText === 'string' ? dateRangeText : ''}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    {/* 3개 초과 시 더보기 표시 */}
                    {(() => {
                      const shouldShowMore = continuousTaskGroups.length > 3;
                      console.log(`[DEBUG] 이랑 ${rowNumber} 더보기 표시:`, {
                        totalGroups: continuousTaskGroups.length,
                        shouldShowMore,
                        moreCount: continuousTaskGroups.length - 3
                      });
                      return shouldShowMore;
                    })() && (
                      <div
                        className="absolute bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded border border-gray-300 cursor-pointer hover:bg-gray-200 transition-colors pointer-events-auto"
                        style={{
                          left: '8px',
                          top: `${8 + (3 * (32 + 4))}px`, // 3개 박스 아래 위치
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: '60px'
                        }}
                        title={`+${continuousTaskGroups.length - 3}개 더`}
                      >
                        +{continuousTaskGroups.length - 3}개 더
                      </div>
                    )}
                    </div>

                    {/* 각 날짜/월의 작업 */}
                    {currentPeriods.map((dayInfo, index) => {
                      const periodTasks = getTasksForPeriod(rowNumber, dayInfo);
                      const isTodayCell = isToday(dayInfo);
                      
                      // 멀티데이 일정은 개별 셀에 표시하지 않음 (연속 박스로 표시됨)
                      const displayTasks = periodTasks.filter(task => {
                        // endDate가 없거나 시작일과 종료일이 같은 경우만 개별 셀에 표시
                        if (!(task as any).endDate || task.scheduledDate === (task as any).endDate) return true;
                        
                        // 멀티데이 일정은 개별 셀에서 제외
                        return false; // 멀티데이 일정은 항상 제외
                      });
                      
                      return (
                        <div
                          key={viewMode === "monthly" ? `${rowNumber}-${(dayInfo as any).year}-${(dayInfo as any).month}-${(dayInfo as any).day}` : `${rowNumber}-${(dayInfo as any).month}`}
                          className={`${viewMode === "yearly" ? "w-[100px]" : "w-[120px]"} flex-shrink-0 p-2 border-r border-gray-200 last:border-r-0 min-h-[100px] cursor-pointer hover:bg-gray-50 transition-colors relative ${
                            isTodayCell ? "bg-green-50 border-green-200" : ""
                          } ${viewMode === "monthly" && (dayInfo as any).isCurrentMonth === false ? "bg-gray-25" : ""} ${
                            viewMode === "monthly" && selectedCellDate === `${(dayInfo as any).year}-${String((dayInfo as any).month + 1).padStart(2, '0')}-${String((dayInfo as any).day).padStart(2, '0')}` ? "bg-blue-50 border-blue-300 border-2" : ""
                          }`}
                          onClick={() => {
                            if (viewMode === "monthly") {
                              const dateStr = `${(dayInfo as any).year}-${String((dayInfo as any).month + 1).padStart(2, '0')}-${String((dayInfo as any).day).padStart(2, '0')}`;
                              setSelectedCellDate(dateStr);
                              onDateClick(dateStr);
                            }
                          }}
                        >
                        <div className="space-y-1">
                          {viewMode === "monthly" ? (
                            <>
                              {/* 월간 뷰: 작물명과 작업 표시 (연속된 일정 제외) - 최대 3개까지만 */}
                              {(() => {
                                console.log(`[DEBUG] 이랑 ${rowNumber} 날짜 ${(dayInfo as any).day} 개별 셀:`, {
                                  totalTasks: displayTasks.length,
                                  showingTasks: Math.min(displayTasks.length, 3),
                                  tasks: displayTasks.map(t => ({ id: t.id, title: t.title }))
                                });
                                return displayTasks.slice(0, 3);
                              })().map((task) => {
                              const cropName = getCropName(task.cropId);
                              return (
                                <div 
                                  key={task.id} 
                                  className="space-y-0.5 cursor-pointer hover:opacity-80"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    console.log("캘린더에서 작업 클릭, task 데이터:", task);
                                    setSelectedTask(task);
                                    setIsEditDialogOpen(true);
                                  }}
                                >
                                  {cropName && (
                                    <div className="text-xs font-medium text-gray-800 truncate">
                                      {cropName}
                                    </div>
                                  )}
                                  <div 
                                    className={`text-xs px-1 py-0.5 rounded border break-words leading-tight ${getTaskColor(task)}`}
                                    style={{
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical',
                                      overflow: 'hidden',
                                      wordWrap: 'break-word',
                                      maxHeight: '2.5rem'
                                    }}
                                    title={task.title || task.taskType}
                                  >
                                    {task.title || task.taskType}
                                  </div>
                                </div>
                              );
                            })}
                            
                            {/* 개별 셀에서 3개 초과 시 더보기 표시 */}
                            {(() => {
                              const shouldShowMore = displayTasks.length > 3;
                              console.log(`[DEBUG] 이랑 ${rowNumber} 날짜 ${(dayInfo as any).day} 개별 셀 더보기:`, {
                                totalTasks: displayTasks.length,
                                shouldShowMore,
                                moreCount: displayTasks.length - 3
                              });
                              return shouldShowMore;
                            })() && (
                              <div 
                                className="text-xs text-gray-500 text-center py-1 cursor-pointer hover:text-gray-700"
                                title={`+${displayTasks.length - 3}개 더`}
                              >
                                +{displayTasks.length - 3}개 더
                              </div>
                            )}
                            </>
                          ) : (
                            // 연간 뷰: 단일 날짜 작업만 표시 (멀티데이 작업은 박스로 표시됨)
                            displayTasks.map((task) => {
                              // 작물 이름 추출
                              let cropName;
                              if (task.title && task.title.includes('_')) {
                                cropName = task.title.split('_')[0]; // "무_파종" -> "무"
                              } else {
                                cropName = getCropName(task.cropId) || task.title || task.taskType;
                              }
                              
                              return (
                                <div 
                                  key={task.id} 
                                  className="cursor-pointer hover:opacity-80"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTask(task);
                                    setIsEditDialogOpen(true);
                                  }}
                                >
                                  <div 
                                    className={`text-[10px] px-1 py-0.5 rounded border truncate ${getTaskColor(task)}`}
                                    title={task.title || task.taskType}
                                  >
                                    {cropName}
                                  </div>
                                </div>
                              );
                            })
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
                          console.log("수정 버튼 클릭, task 데이터:", task);
                          setSelectedTask(task);
                          setIsEditDialogOpen(true);
                        }}
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

      {/* Add Task Dialog */}
      <AddTaskDialog 
        open={showAddTaskDialog} 
        onOpenChange={setShowAddTaskDialog}
        selectedDate={selectedDateForTask}
      />

      {/* Edit Task Dialog */}
      {selectedTask && (
        <AddTaskDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          task={selectedTask}
          selectedDate={selectedTask.scheduledDate}
        />
      )}
    </div>
  );
}
