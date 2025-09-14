// Farm management hooks
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@shared/hooks/use-toast";
import { farmApi } from "../api/farm.api";
import type { Farm, InsertFarm } from "@shared/types/schema";

export const useFarms = () => {
  return useQuery<Farm[]>({
    queryKey: ["/api/farms"],
    queryFn: farmApi.getFarms,
  });
};

export const useCreateFarm = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: farmApi.createFarm,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/farms"] });
      toast({
        title: "농장 생성 완료",
        description: "새 농장이 성공적으로 생성되었습니다.",
      });
    },
    onError: (error) => {
      console.error("Farm creation error:", error);
      toast({
        title: "농장 생성 실패",
        description: "농장 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateFarm = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertFarm> }) =>
      farmApi.updateFarm(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/farms"] });
      toast({
        title: "농장 수정 완료",
        description: "농장 정보가 성공적으로 수정되었습니다.",
      });
    },
    onError: (error) => {
      console.error("Farm update error:", error);
      toast({
        title: "농장 수정 실패",
        description: "농장 수정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });
};

export const useDeleteFarm = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: farmApi.deleteFarm,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/farms"] });
      toast({
        title: "농장 삭제 완료",
        description: "농장이 성공적으로 삭제되었습니다.",
      });
    },
    onError: (error) => {
      console.error("Farm deletion error:", error);
      toast({
        title: "농장 삭제 실패",
        description: "농장 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });
};