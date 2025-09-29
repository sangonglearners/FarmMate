import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { taskApi } from "@shared/api/tasks";
import type { Task, InsertTask } from "@shared/types/schema";
import { useToast } from "@shared/hooks/use-toast";

export const useTasks = () => {
  return useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: taskApi.getTasks,
  });
};

export const useTasksByDate = (date: string) => {
  return useQuery<Task[]>({
    queryKey: ["tasks", { date }],
    queryFn: () => taskApi.getTasksByDate(date),
    enabled: !!date,
  });
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: taskApi.createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({
        title: "작업 생성 완료",
        description: "새 작업이 성공적으로 생성되었습니다.",
      });
    },
    onError: (error) => {
      toast({
        title: "작업 생성 실패",
        description: "작업 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, task }: { id: string; task: Partial<InsertTask> }) =>
      taskApi.updateTask(id, task),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({
        title: "작업 수정 완료",
        description: "작업이 성공적으로 수정되었습니다.",
      });
    },
    onError: (error) => {
      toast({
        title: "작업 수정 실패",
        description: "작업 수정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });
};

export const useCompleteTask = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: taskApi.completeTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({
        title: "작업 완료",
        description: "작업이 성공적으로 완료되었습니다.",
      });
    },
    onError: (error) => {
      toast({
        title: "작업 완료 실패",
        description: "작업 완료 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: taskApi.deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({
        title: "작업 삭제 완료",
        description: "작업이 성공적으로 삭제되었습니다.",
      });
    },
    onError: (error) => {
      toast({
        title: "작업 삭제 실패",
        description: "작업 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });
};