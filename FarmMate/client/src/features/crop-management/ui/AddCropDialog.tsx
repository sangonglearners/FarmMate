import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient /*, useQuery*/ } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@shared/ui/dialog";
import { Button } from "@shared/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@shared/ui/form";
import { Input } from "@shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/ui/select";
import { useToast } from "@shared/hooks/use-toast";
import { insertCropSchema } from "@shared/types/schema";
import type { InsertCrop, Crop } from "@shared/types/schema";
import { apiRequest } from "@shared/api/client";
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

// ✅ 임시 작물 목록 (DB 연결 전까지 사용)
//    이후 실제 DB 연동 시, 아래 TEMP_CROPS 대신 useQuery로 서버 데이터를 주입하세요.
//    예: const { data: crops = [] } = useQuery({ queryKey: ["/api/crops/options"], queryFn: fetchCropOptions })
const TEMP_CROPS = [
  { id: "cabbage", name: "양배추", category: "배추", varieties: ["그린", "퍼플", "레드"] },
  { id: "carrot", name: "당근", category: "뿌리채소", varieties: ["오렌지", "퍼플", "화이트"] },
  { id: "spinach", name: "시금치", category: "엽채류", varieties: ["일반", "베이비", "레드"] },
  { id: "tomato", name: "토마토", category: "과채류", varieties: ["방울", "대과", "흑색"] },
  { id: "lettuce", name: "상추", category: "엽채류", varieties: ["적상추", "청상추", "로메인"] },
  { id: "radish", name: "무", category: "뿌리채소", varieties: ["총각무", "알타리무", "일반무"] },
];

type CropOption = { id: string; name: string; category: string; varieties: string[] };

export default function AddCropDialog({ open, onOpenChange, crop }: AddCropDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ⚙️ 실제 DB 연동 시 이 부분을 교체하세요.
  // const { data: crops = TEMP_CROPS } = useQuery<CropOption[]>({
  //   queryKey: ["/api/crops/options"],
  //   queryFn: async () => (await apiRequest("GET", "/api/crops/options")).json(),
  //   staleTime: 5 * 60 * 1000,
  // });
  const crops: CropOption[] = TEMP_CROPS;

  const [selectedCrop, setSelectedCrop] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewCropModal, setShowNewCropModal] = useState(false);

  const form = useForm<InsertCrop>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: "",
      name: "",
      variety: "",
      status: "growing",
    },
  });

  const selectedCropData = useMemo(
    () => crops.find((c) => c.id === selectedCrop),
    [crops, selectedCrop]
  );

  useEffect(() => {
    if (crop) {
      form.reset({
        category: crop.category,
        name: crop.name,
        variety: crop.variety,
        status: crop.status || "growing",
      });
      const foundCrop = crops.find((c) => c.name === crop.name);
      if (foundCrop) setSelectedCrop(foundCrop.id);
    } else {
      form.reset({ category: "", name: "", variety: "", status: "growing" });
      setSelectedCrop("");
      setSearchTerm("");
    }
  }, [crop, form, crops]);

  // 대표 작물 선택 시 자동 채우기 (신규 등록 상황에서만)
  useEffect(() => {
    if (selectedCropData && !crop) {
      form.setValue("category", selectedCropData.category);
      form.setValue("name", selectedCropData.name);
      form.setValue("variety", selectedCropData.varieties[0] ?? "");
    }
  }, [selectedCropData, form, crop]);

  // 검색 필터
  const filteredCrops = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return crops;
    return crops.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.category.toLowerCase().includes(term)
    );
  }, [crops, searchTerm]);

  const createMutation = useMutation({
    mutationFn: async (data: InsertCrop) => {
      const response = await apiRequest("POST", "/api/crops", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crops"] });
      toast({ title: "작물 추가 완료", description: "새 작물이 성공적으로 추가되었습니다." });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "추가 실패",
        description: "작물 추가 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: InsertCrop) => {
      const response = await apiRequest("PUT", `/api/crops/${crop!.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crops"] });
      toast({ title: "작물 수정 완료", description: "작물 정보가 성공적으로 수정되었습니다." });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "수정 실패",
        description: "작물 수정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertCrop) => {
    if (crop) updateMutation.mutate(data);
    else createMutation.mutate(data);
  };

  // 🔔 "새로운 작물 등록하기" 버튼 클릭 시, 검색어를 폼 기본값으로 세팅
  const openNewCropModal = () => {
    const term = searchTerm.trim();
    if (term) form.setValue("name", term, { shouldDirty: true });
    setShowNewCropModal(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{crop ? "작물 수정하기" : "작물을 선택해 주세요"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* 🔎 작물 검색 */}
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

            {/* ✅ 검색 결과 렌더링 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">대표 작물 선택 </label>

              {/* 결과 없음 상태 */}
              {searchTerm.trim() !== "" && filteredCrops.length === 0 ? (
                <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                  <p className="mb-3">"{searchTerm}"에 대한 검색 결과가 없습니다.</p>
                  <Button type="button" onClick={openNewCropModal}>
                    새로운 작물 등록하기
                  </Button>
                </div>
              ) : (
                // 결과 리스트
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {filteredCrops.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCrop(selectedCrop === c.id ? "" : c.id)}
                      className={`p-3 text-left border rounded-lg transition-colors ${
                        selectedCrop === c.id
                          ? "border-green-500 bg-green-50 text-green-700"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{c.name}</div>
                          <div className="text-xs text-gray-500">{c.category}</div>
                        </div>
                        {selectedCrop === c.id && (
                          <Check className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 품종 선택 (대표 작물 선택 시 노출) */}
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

            {/* 상태 */}
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

            <Button
              type="submit"
              className="w-full"
              disabled={createMutation.isPending || updateMutation.isPending /* 제출 자체는 선택 없이도 가능하게 두려면 이 조건을 제거 */}
            >
              {createMutation.isPending || updateMutation.isPending ? "저장 중..." : "저장하기"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>

    /* 🌱 새로운 작물 등록 모달 */
  );
}

// 별도: 동일 파일 하단 또는 별도 파일에 위치해도 됩니다.
export function NewCropModal({
  open,
  onOpenChange,
  form,
  searchTerm,
  onSubmitNew,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  form: ReturnType<typeof useForm<InsertCrop>>;
  searchTerm: string;
  onSubmitNew?: () => void;
}) {
  const { toast } = useToast();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>새로운 작물 등록</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-gray-600">"{searchTerm}" 작물을 새로 등록합니다.</p>

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>작물명 *</FormLabel>
                <FormControl>
                  <Input placeholder="작물명을 입력해주세요" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>분류 *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="분류를 선택해주세요" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="배추">배추</SelectItem>
                    <SelectItem value="뿌리채소">뿌리채소</SelectItem>
                    <SelectItem value="엽채류">엽채류</SelectItem>
                    <SelectItem value="과채류">과채류</SelectItem>
                    <SelectItem value="기타">기타</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button
              onClick={() => {
                onSubmitNew?.();
                onOpenChange(false);
                toast({ title: "작물 등록 완료", description: "새로운 작물이 등록되었습니다." });
              }}
            >
              등록하기
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
