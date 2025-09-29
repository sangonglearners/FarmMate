// Crop management hooks
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@shared/hooks/use-toast";
import { cropApi } from "../api/crop.api";
import type { Crop, InsertCrop } from "@shared/types/schema";

export const useCrops = (search?: string) => {
  return useQuery<Crop[]>({
    queryKey: search ? ["crops", { search }] : ["crops"],
    queryFn: () => cropApi.getCrops(search),
  });
};

export const useCreateCrop = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: cropApi.createCrop,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crops"] });
      toast({
        title: "작물 생성 완료",
        description: "새 작물이 성공적으로 생성되었습니다.",
      });
    },
    onError: (error) => {
      console.error("Crop creation error:", error);
      toast({
        title: "작물 생성 실패",
        description: "작물 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateCrop = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertCrop> }) =>
      cropApi.updateCrop(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crops"] });
      toast({
        title: "작물 수정 완료",
        description: "작물 정보가 성공적으로 수정되었습니다.",
      });
    },
    onError: (error) => {
      console.error("Crop update error:", error);
      toast({
        title: "작물 수정 실패",
        description: "작물 수정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });
};

export const useDeleteCrop = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: cropApi.deleteCrop,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crops"] });
      toast({
        title: "작물 삭제 완료",
        description: "작물이 성공적으로 삭제되었습니다.",
      });
    },
    onError: (error) => {
      console.error("Crop deletion error:", error);
      toast({
        title: "작물 삭제 실패",
        description: "작물 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });
};