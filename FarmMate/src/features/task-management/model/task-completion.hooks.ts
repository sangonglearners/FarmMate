// 날짜별 작업 완료 상태 관리 훅
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  getTaskCompletions,
  getTaskCompletionByDate,
  setTaskCompletion,
  deleteTaskCompletion,
  type TaskCompletion
} from "@/shared/api/task-completion";

// 특정 작업의 모든 완료 상태 조회
export const useTaskCompletions = (taskId: string) => {
  return useQuery({
    queryKey: ["task-completions", taskId],
    queryFn: () => getTaskCompletions(taskId),
    enabled: !!taskId,
  });
};

// 특정 작업의 특정 날짜 완료 상태 조회
export const useTaskCompletionByDate = (taskId: string, date: string) => {
  return useQuery({
    queryKey: ["task-completion", taskId, date],
    queryFn: () => getTaskCompletionByDate(taskId, date),
    enabled: !!taskId && !!date,
  });
};

// 작업 완료 상태 설정
export const useSetTaskCompletion = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ taskId, date, completed }: { 
      taskId: string; 
      date: string; 
      completed: boolean 
    }) => setTaskCompletion(taskId, date, completed),
    onSuccess: (data, variables) => {
      // 관련 쿼리들 무효화
      queryClient.invalidateQueries({ queryKey: ["task-completions", variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ["task-completion", variables.taskId, variables.date] });
      queryClient.invalidateQueries({ queryKey: ["task-completion-by-date", variables.date] });
      // 기간 조회 쿼리는 start/end 값이 매번 달라질 수 있으므로 접두사(prefix)로 무효화
      queryClient.invalidateQueries({ queryKey: ["task-completion-by-date-range"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });

      // (선택) 통계 페이지가 열려있고, 오늘 완료가 발생했으면 리포트 카드 생성 갱신 이벤트를 보냄
      if (typeof window !== "undefined") {
        // date-only 포맷은 반드시 로컬 기준으로 만들어야 날짜가 하루 밀리지 않습니다.
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, "0");
        const d = String(now.getDate()).padStart(2, "0");
        const todayStr = `${y}-${m}-${d}`;
        if (variables.date === todayStr) {
          window.dispatchEvent(
            new CustomEvent("farmmate:today-report-card-updated", {
              detail: { date: variables.date },
            })
          );
        }
      }
      
      toast({
        title: variables.completed ? "작업 완료" : "작업 완료 취소",
        description: `${variables.date}의 작업이 ${variables.completed ? "완료" : "미완료"}되었습니다.`,
      });
    },
    onError: (error, variables) => {
      toast({
        title: "작업 상태 변경 실패",
        description: "작업 상태 변경 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });
};

// 작업 완료 상태 삭제
export const useDeleteTaskCompletion = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ taskId, date }: { taskId: string; date: string }) => 
      deleteTaskCompletion(taskId, date),
    onSuccess: (data, variables) => {
      // 관련 쿼리들 무효화
      queryClient.invalidateQueries({ queryKey: ["task-completions", variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ["task-completion", variables.taskId, variables.date] });
      queryClient.invalidateQueries({ queryKey: ["task-completion-by-date", variables.date] });
      queryClient.invalidateQueries({ queryKey: ["task-completion-by-date-range"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      
      toast({
        title: "완료 상태 삭제",
        description: "작업 완료 상태가 삭제되었습니다.",
      });
    },
    onError: (error) => {
      toast({
        title: "완료 상태 삭제 실패",
        description: "완료 상태 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });
};
