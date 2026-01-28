import { useState, useEffect } from "react";
import { Checkbox } from "../shared/ui/checkbox";
import { Button } from "../shared/ui/button";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { getTaskIcon, getTaskColor } from "../entities/task/model/utils";
import { taskApi } from "../shared/api/tasks";
import { useQueryClient } from "@tanstack/react-query";

interface TodoItem {
  id: string;
  title: string;
  taskType: string;
  scheduledDate: string;
  completed: number; // 0: 미완료, 1: 완료
  completedAt?: string;
  farmId?: string; // 권한 확인용
  userId?: string; // 권한 확인용
  isGroup?: boolean; // 그룹화된 작업 여부
  cropName?: string; // 작물 이름
  groupStartDate?: string; // 그룹 시작 날짜
  groupEndDate?: string; // 그룹 종료 날짜
  groupTaskTypes?: string[]; // 그룹 작업 유형 목록
}

interface TodoListProps {
  tasks: TodoItem[];
  selectedDate: string;
  onTaskClick?: (task: TodoItem) => void;
}

export default function TodoList({ tasks, selectedDate, onTaskClick }: TodoListProps) {
  const queryClient = useQueryClient();
  const [completingTasks, setCompletingTasks] = useState<Set<string>>(new Set());
  const [localCompletions, setLocalCompletions] = useState<Map<string, boolean>>(new Map());

  console.log("TodoList 렌더링됨:", { tasks, selectedDate });

  // 작업이 날짜 범위 작업인지 확인 (기존 구조: endDate가 있고 scheduledDate와 다른 경우)
  const isDateRangeTask = (task: TodoItem) => {
    const endDate = (task as any).endDate;
    return endDate && endDate !== task.scheduledDate;
  };

  // 날짜별 완료 상태 키 생성 (날짜 범위 작업은 task.id + selectedDate, 개별 작업은 task.id)
  const getCompletionKey = (task: TodoItem) => {
    if (isDateRangeTask(task)) {
      // 기존 구조(날짜 범위 작업): 날짜별로 독립적인 완료 상태
      return `${task.id}_${selectedDate}`;
    }
    // 새 구조(개별 날짜 작업): task.id만 사용
    return task.id;
  };

  // 로컬 스토리지에서 날짜별 완료 상태 로드 및 데이터베이스 완료 상태 동기화
  useEffect(() => {
    const loadLocalCompletions = () => {
      try {
        const storageKey = `task_completions_${selectedDate}`;
        const stored = localStorage.getItem(storageKey);
        const completionMap = new Map<string, boolean>();
        
        console.log("완료 상태 로드 시작:", { selectedDate, storageKey, stored });
        
        // 로컬 스토리지에서 완료 상태 로드
        if (stored) {
          const completions = JSON.parse(stored);
          console.log("로컬 스토리지 완료 상태:", completions);
          Object.entries(completions).forEach(([key, completed]) => {
            completionMap.set(key, completed as boolean);
          });
        }
        
        // 데이터베이스의 완료 상태로 동기화
        const syncPromises: Promise<void>[] = [];
        
        tasks.forEach((task) => {
          const completionKey = getCompletionKey(task);
          const localStorageValue = completionMap.get(completionKey);
          const isRangeTask = isDateRangeTask(task);
          
          // 날짜 범위 작업은 localStorage 우선 (DB 동기화 안 함)
          if (isRangeTask) {
            // localStorage에 값이 없으면 false로 초기화
            if (!completionMap.has(completionKey)) {
              completionMap.set(completionKey, false);
            }
            return;
          }
          
          // 개별 날짜 작업 (새 구조): DB 완료 상태 동기화
          if (task.completed === 1) {
            completionMap.set(completionKey, true);
          } else if (task.completed === 0) {
            if (localStorageValue === true) {
              // 로컬 스토리지에 true가 있는데 DB가 0인 경우
              completionMap.set(completionKey, true);
              
              // 백그라운드에서 데이터베이스 동기화 시도
              syncPromises.push(
                taskApi.completeTask(task.id)
                  .then(() => {
                    console.log(`작업 ${task.id} DB 동기화 성공`);
                    queryClient.invalidateQueries({ queryKey: ["tasks"] });
                  })
                  .catch((error) => {
                    console.error(`작업 ${task.id} DB 동기화 실패:`, error);
                  })
              );
            } else {
              completionMap.set(completionKey, false);
            }
          } else {
            if (!completionMap.has(completionKey)) {
              completionMap.set(completionKey, false);
            }
          }
        });
        
        // 백그라운드 동기화 실행
        if (syncPromises.length > 0) {
          Promise.all(syncPromises).catch((error) => {
            console.error("백그라운드 동기화 중 오류:", error);
          });
        }
        
        console.log("최종 완료 상태 맵:", Array.from(completionMap.entries()));
        setLocalCompletions(completionMap);
      } catch (error) {
        console.error("로컬 완료 상태 로드 실패:", error);
        const completionMap = new Map<string, boolean>();
        tasks.forEach(task => {
          const completionKey = getCompletionKey(task);
          completionMap.set(completionKey, task.completed === 1);
        });
        setLocalCompletions(completionMap);
      }
    };

    loadLocalCompletions();
  }, [selectedDate, tasks]);

  // 로컬 스토리지에 완료 상태 저장
  const saveLocalCompletions = (completions: Map<string, boolean>) => {
    try {
      const storageKey = `task_completions_${selectedDate}`;
      const completionsObj = Object.fromEntries(completions);
      localStorage.setItem(storageKey, JSON.stringify(completionsObj));
    } catch (error) {
      console.error("로컬 완료 상태 저장 실패:", error);
    }
  };

  const handleTaskToggle = async (task: TodoItem, event: React.MouseEvent) => {
    event.stopPropagation(); // 부모 클릭 이벤트 방지
    
    const completionKey = getCompletionKey(task);
    const isRangeTask = isDateRangeTask(task);
    
    console.log("체크박스 클릭됨:", { task, completionKey, isRangeTask });
    
    if (completingTasks.has(completionKey)) return; // 이미 처리 중인 경우 무시
    
    setCompletingTasks(prev => new Set(prev).add(completionKey));
    
    const isCurrentlyCompleted = localCompletions.get(completionKey) ?? (task.completed === 1);
    const newCompletedState = !isCurrentlyCompleted;
    
    // 즉시 UI 업데이트를 위해 로컬 상태 먼저 업데이트
    const newCompletions = new Map(localCompletions);
    newCompletions.set(completionKey, newCompletedState);
    setLocalCompletions(newCompletions);
    
    // 로컬 스토리지에 저장
    saveLocalCompletions(newCompletions);
    
    // 날짜 범위 작업(기존 구조)은 localStorage에만 저장하고 DB 동기화 안 함
    if (isRangeTask) {
      console.log("날짜 범위 작업 - localStorage에만 저장:", completionKey, newCompletedState);
      setCompletingTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(completionKey);
        return newSet;
      });
      return;
    }
    
    // 개별 날짜 작업(새 구조): DB에도 저장
    try {
      if (newCompletedState) {
        console.log("작업 완료 처리 시작:", task.id);
        await taskApi.completeTask(task.id);
        console.log("작업 완료 처리 성공:", task.id);
      } else {
        console.log("작업 완료 취소 시작:", task.id);
        await taskApi.uncompleteTask(task.id);
        console.log("작업 완료 취소 성공:", task.id);
      }
      
      // 작업 목록 새로고침
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      
    } catch (error) {
      console.error("작업 상태 변경 실패:", error);
      console.error("에러 상세:", error);
      
      // 에러 발생 시 로컬 상태 롤백
      const rollbackCompletions = new Map(localCompletions);
      rollbackCompletions.set(completionKey, isCurrentlyCompleted);
      setLocalCompletions(rollbackCompletions);
      saveLocalCompletions(rollbackCompletions);
      
      // 사용자에게 에러 알림
      alert(`작업 완료 상태 변경에 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setCompletingTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(completionKey);
        return newSet;
      });
    }
  };

  const formatDisplayDate = (dateStr: string) => {
    // 타임존 문제 방지를 위해 날짜 문자열을 직접 파싱
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dateOnly = new Date(year, month - 1, day);
    dateOnly.setHours(0, 0, 0, 0);
    
    if (dateOnly.getTime() === today.getTime()) {
      return "오늘";
    } else if (dateOnly.getTime() === tomorrow.getTime()) {
      return "내일";
    } else {
      return `${month}/${day}`;
    }
  };

  // 할 일 목록을 완료 상태에 따라 정렬 (미완료 -> 완료 순서)
  const sortedTasks = [...tasks].sort((a, b) => {
    const aKey = getCompletionKey(a);
    const bKey = getCompletionKey(b);
    const aCompleted = localCompletions.get(aKey) ?? (a.completed === 1);
    const bCompleted = localCompletions.get(bKey) ?? (b.completed === 1);
    
    // 미완료가 먼저, 완료된 것이 나중에 오도록 정렬
    if (aCompleted && !bCompleted) return 1;
    if (!aCompleted && bCompleted) return -1;
    
    // 같은 완료 상태라면 원래 순서 유지
    return 0;
  });

  return (
    <div className="space-y-2">
      {sortedTasks.map((task) => {
        const completionKey = getCompletionKey(task);
        const isCompleted = localCompletions.get(completionKey) ?? (task.completed === 1);
        const isZucchini = task.title?.includes('쥬키니') || task.title?.includes('zucchini');
        
        // 쥬키니 작업의 경우 상세 로그 출력
        if (isZucchini) {
          console.log(`쥬키니 작업 렌더링:`, {
            taskId: task.id,
            completionKey: completionKey,
            title: task.title,
            dbCompleted: task.completed,
            localCompletionsValue: localCompletions.get(completionKey),
            isCompleted: isCompleted,
            localCompletionsMap: Array.from(localCompletions.entries())
          });
        }
        
        return (
          <div
            key={completionKey}
            className={`flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-all duration-200 ${
              isCompleted ? 'bg-gray-50 opacity-75' : ''
            }`}
            onClick={() => onTaskClick?.(task)}
          >
            {/* 체크박스 */}
            <div 
              className="flex-shrink-0 cursor-pointer p-1 hover:bg-gray-100 rounded"
              onClick={(e) => handleTaskToggle(task, e)}
            >
              {isCompleted ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : (
                <Circle className="w-5 h-5 text-gray-400 hover:text-green-500 transition-colors" />
              )}
            </div>

            {/* 작업 정보 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <div className="text-lg">{getTaskIcon(task.taskType)}</div>
                <h4 className={`font-medium text-gray-900 transition-all duration-200 ${
                  isCompleted ? 'line-through text-gray-500' : ''
                }`}>
                  {task.isGroup ? `${task.cropName}_${task.taskType}` : 
                   task.cropName ? `${task.cropName}_${task.taskType}` : task.title}
                </h4>
              </div>
              <div className="flex items-center space-x-2 mt-1">
                <p className={`text-sm transition-all duration-200 ${
                  isCompleted ? 'line-through text-gray-400' : 'text-gray-600'
                }`}>
                  {task.isGroup && task.groupStartDate && task.groupEndDate
                    ? `${formatDisplayDate(task.groupStartDate)} - ${formatDisplayDate(task.groupEndDate)}`
                    : (task as any).endDate && (task as any).endDate !== task.scheduledDate
                    ? formatDisplayDate(selectedDate) // 날짜 범위가 있는 작업은 선택한 날짜 표시
                    : formatDisplayDate(task.scheduledDate)
                  }
                </p>
                <div className={`text-xs px-2 py-1 rounded-full transition-all duration-200 ${
                  isCompleted ? 'bg-gray-200 text-gray-500' : getTaskColor(task.taskType)
                }`}>
                  {task.isGroup && task.groupTaskTypes 
                    ? task.groupTaskTypes.join(' → ') 
                    : task.taskType}
                </div>
              </div>
            </div>

            {/* 완료 시간 표시 */}
            {isCompleted && (
              <div className="text-xs text-gray-400">
                {new Date().toLocaleTimeString('ko-KR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
