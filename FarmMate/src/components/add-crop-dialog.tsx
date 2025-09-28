import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
<<<<<<< HEAD
import { insertCropSchema } from "@shared/schema";
import type { InsertCrop, Crop } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
=======

/** 기존 스키마/타입은 그대로 사용 */
import { insertCropSchema } from "../../../shared/schema";
import type { InsertCrop, Crop } from "../../../shared/schema";

/** ⬇️ 여기부터 Supabase 유틸 임포트 */
import { saveCrop, updateCrop } from "@/shared/api/saveCrop";
import { supabase } from "@/shared/api/supabase";
import { mustOk } from "@/shared/api/mustOk";

>>>>>>> main
import { z } from "zod";
import { Search, Check } from "lucide-react";

const formSchema = insertCropSchema.extend({
  category: z.string().min(1, "작물 분류를 선택해주세요"),
  name: z.string().min(1, "작물 이름을 입력해주세요"),
  variety: z.string().min(1, "품종을 입력해주세요"),
});

interface AddCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  crop?: Crop | null;
}

// 대표 작물 목록 (PDF 디자인에 따라)
const representativeCrops = [
  { id: "cabbage", name: "양배추", category: "배추", varieties: ["그린", "퍼플", "레드"] },
  { id: "carrot", name: "당근", category: "뿌리채소", varieties: ["오렌지", "퍼플", "화이트"] },
  { id: "spinach", name: "시금치", category: "엽채류", varieties: ["일반", "베이비", "레드"] },
  { id: "tomato", name: "토마토", category: "과채류", varieties: ["방울", "대과", "흑색"] },
  { id: "lettuce", name: "상추", category: "엽채류", varieties: ["적상추", "청상추", "로메인"] },
  { id: "radish", name: "무", category: "뿌리채소", varieties: ["총각무", "알타리무", "일반무"] },
];

export default function AddCropDialog({ open, onOpenChange, crop }: AddCropDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedCrop, setSelectedCrop] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  const form = useForm<InsertCrop>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: "",
      name: "",
      variety: "",
      status: "growing",
    },
  });

  const selectedCropData = representativeCrops.find(crop => crop.id === selectedCrop);

  useEffect(() => {
    if (crop) {
      form.reset({
        category: (crop as any).category,
        name: (crop as any).name,
        variety: (crop as any).variety,
        status: (crop as any).status || "growing",
      });
      const foundCrop = representativeCrops.find(c => c.name === (crop as any).name);
      if (foundCrop) {
        setSelectedCrop(foundCrop.id);
      }
    } else {
      form.reset({
        category: "",
        name: "",
        variety: "",
        status: "growing",
      });
      setSelectedCrop("");
      setSearchTerm("");
    }
  }, [crop, form]);

  // Auto-fill form when representative crop is selected
  useEffect(() => {
    if (selectedCropData && !crop) {
      form.setValue("category", selectedCropData.category);
      form.setValue("name", selectedCropData.name);
      form.setValue("variety", selectedCropData.varieties[0]); // Default to first variety
    }
  }, [selectedCropData, form, crop]);

  // Filter crops based on search term
  const filteredCrops = representativeCrops.filter(crop =>
    crop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    crop.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  /** ⬇️ 생성: /api 호출 → Supabase insert */
  const createMutation = useMutation({
    mutationFn: async (data: InsertCrop) =>
      saveCrop({
        name: data.name,
        category: (data as any).category,
        variety: (data as any).variety,
        // farmId / sowingDate가 있으면 추가하세요.
      }),
    onSuccess: () => {
      // 리스트 키가 /api/crops 로 되어 있을 수도 있으니 둘 다 무효화
      queryClient.invalidateQueries({ queryKey: ["crops"] });
      queryClient.invalidateQueries({ queryKey: ["/api/crops"] });
      toast({
        title: "작물 추가 완료",
        description: "새 작물이 성공적으로 추가되었습니다.",
      });
      onOpenChange(false);
    },
    onError: (e: any) => {
      toast({
        title: "추가 실패",
        description: e?.message ?? "작물 추가 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  /** ⬇️ 수정: 사용자별 로컬 스토리지에 저장 */
  const updateMutation = useMutation({
    mutationFn: async (data: InsertCrop) => {
      return updateCrop((crop as any)!.id, {
        name: data.name,
        category: (data as any).category,
        variety: (data as any).variety,
        status: (data as any).status,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crops"] });
      queryClient.invalidateQueries({ queryKey: ["/api/crops"] });
      toast({
        title: "작물 수정 완료",
        description: "작물 정보가 성공적으로 수정되었습니다.",
      });
      onOpenChange(false);
    },
    onError: (e: any) => {
      toast({
        title: "수정 실패",
        description: e?.message ?? "작물 수정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertCrop) => {
    if (crop) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {crop ? "작물 수정하기" : "작물을 선택해 주세요"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* 작물 검색 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">작물 검색</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="작물 이름을 검색해 주세요 (ex. 양배추)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* 대표 작물 선택 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">대표 작물 선택 *</label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {filteredCrops.map((crop) => (
                  <button
                    key={crop.id}
                    type="button"
                    onClick={() => setSelectedCrop(crop.id)}
                    className={`p-3 text-left border rounded-lg transition-colors ${
                      selectedCrop === crop.id
                        ? "border-green-500 bg-green-50 text-green-700"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{crop.name}</div>
                        <div className="text-xs text-gray-500">{crop.category}</div>
                      </div>
                      {selectedCrop === crop.id && (
                        <Check className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 품종 선택 */}
            {selectedCropData && (
              <FormField
                control={form.control}
                name="variety"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>품종 *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="품종을 선택해주세요" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {selectedCropData.varieties.map((variety) => (
                          <SelectItem key={variety} value={variety}>
                            {variety}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>상태</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="growing">성장 중</SelectItem>
                      <SelectItem value="harvesting">수확 대기</SelectItem>
                      <SelectItem value="completed">수확 완료</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="sticky bottom-0 bg-white pt-4 border-t">
              <Button
                type="submit"
                className="w-full"
                disabled={createMutation.isPending || updateMutation.isPending || !selectedCrop}
              >
                {createMutation.isPending || updateMutation.isPending ? "저장 중..." : "저장하기"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
