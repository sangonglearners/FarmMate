import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient /*, useQuery*/ } from "@tanstack/react-query";
import { useForm, UseFormReturn } from "react-hook-form";
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
import { insertCropSchema } from "@shared/schema";
import type { InsertCrop, Crop } from "@shared/schema";
import { useCrops as useMyCrops, useCreateCrop, useUpdateCrop } from "../model/crop.hooks";
import { useFarms } from "@features/farm-management";
import { z } from "zod";
import { Search, Check } from "lucide-react";
import { useRegistrationSearch, useRegistrationAll } from "@/shared/hooks";
import type { CropSearchResult } from "@/shared/api/server-registration.repository";

// 기존 form 스키마(사용자 재배 목록에 실제 추가)는 그대로 유지
const formSchema = insertCropSchema.extend({
  category: z.string().min(1, "작물 분류를 선택해주세요"),
  name: z.string().min(1, "작물 이름을 입력해주세요"),
  variety: z.string().min(1, "품종을 입력해주세요"),
});

// 등록 요청 모달 전용 스키마 (모름 허용)
const requestSchema = z.object({
  majorCategory: z.string().optional(), // 대분류
  name: z.string().optional(), // 품목
  variety: z.string().optional(), // 품종명
  establishment: z.enum(["transplant", "direct"], { required_error: "재배 방식 선택" }).optional(),
  daysToMaturity: z
    .number({ invalid_type_error: "숫자를 입력하세요" })
    .int()
    .positive()
    .optional(),
  unknowns: z.object({
    majorCategory: z.boolean(),
    name: z.boolean(),
    variety: z.boolean(),
    establishment: z.boolean(),
    daysToMaturity: z.boolean(),
  }),
});

interface AddCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  crop?: Crop | null;
  defaultFarmId?: string;
  showFarmSelect?: boolean;
}

// 대표 작물 선택 소스는 '내 작물 관리'에서 등록된 나의 작물 목록을 사용한다.

export type CropOption = {
  id: string;
  majorCategory: string;
  name: string; // 품목
  category: string | null | undefined; // 중분류
  varieties: string[] | undefined;
  isMyCrop?: boolean; // 내가 등록한 작물인지 여부
};

export default function AddCropDialog({ open, onOpenChange, crop, defaultFarmId, showFarmSelect }: AddCropDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: farms = [] } = showFarmSelect ? useFarms() : { data: [] as any[] } as any;
  const { data: myCrops = [] } = useMyCrops();

  const [selectedCrop, setSelectedCrop] = useState<string>("");
  const [selectedRegistrationCrop, setSelectedRegistrationCrop] = useState<CropSearchResult | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewCropModal, setShowNewCropModal] = useState(false);
  const [showDirectRegister, setShowDirectRegister] = useState(false);

  // Supabase 작물 검색 (검색어 있을 때, 300ms debounce)
  const { results: searchResults, isLoading: isSearching } = useRegistrationSearch(searchTerm);
  // Supabase 전체 작물 (검색어 없을 때 브라우즈, 30분 캐시)
  const { allCrops, isLoading: isAllLoading } = useRegistrationAll();

  // myCrops를 CropOption 형식으로 변환
  const myCropOptions: CropOption[] = useMemo(
    () =>
      (myCrops || []).map((c: any) => ({
        id: c.id,
        majorCategory: c.category ?? "",
        name: c.name ?? "",
        category: c.category ?? "",
        varieties: c.variety ? [c.variety] : [],
        isMyCrop: true,
      })),
    [myCrops]
  );

  // 검색어 있을 때 myCrops 필터링
  const filteredMyCrops = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return myCropOptions;
    return myCropOptions.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        (c.category ?? "").toLowerCase().includes(term) ||
        (c.varieties ?? []).some((v) => v.toLowerCase().includes(term))
    );
  }, [myCropOptions, searchTerm]);

  const form = useForm<InsertCrop>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: "",
      name: "",
      variety: "",
      status: "growing",
      farmId: defaultFarmId || undefined,
    },
  });

  // 선택된 내 작물 데이터
  const selectedCropData = useMemo(
    () => myCropOptions.find((c) => c.id === selectedCrop),
    [myCropOptions, selectedCrop]
  );

  // Supabase registration 작물 선택 핸들러 - 선택 상태만 변경 (저장은 저장하기 버튼에서)
  const handleRegistrationCropSelect = (regCrop: CropSearchResult) => {
    setSelectedRegistrationCrop(prev => prev?.id === regCrop.id ? null : regCrop);
    setSelectedCrop(""); // myCrop 선택 해제
    setShowDirectRegister(false);
  };

  useEffect(() => {
    if (crop) {
      form.reset({
        category: crop.category,
        name: crop.name,
        variety: crop.variety,
        status: crop.status || "growing",
        farmId: crop.farmId || undefined,
      });
      setSelectedCrop(crop.id);
      setSelectedRegistrationCrop(null);
      setShowDirectRegister(false);
    } else {
      form.reset({ category: "", name: "", variety: "", status: "growing", farmId: defaultFarmId || undefined });
      setSelectedCrop("");
      setSelectedRegistrationCrop(null);
      setSearchTerm("");
      setShowDirectRegister(false);
    }
  }, [crop, form]);

  // 대표 작물 선택 시 자동 채우기 (신규 등록 상황에서만)
  useEffect(() => {
    if (selectedCropData && !crop) {
      form.setValue("category", selectedCropData.category ?? "");
      form.setValue("name", selectedCropData.name);
      form.setValue("variety", (selectedCropData.varieties ?? [""])[0] ?? "");
    }
  }, [selectedCropData, form, crop]);


  const createMutation = useCreateCrop();
  const updateMutation = useUpdateCrop();

  const onSubmit = (data: InsertCrop) => {
    if (crop) {
      updateMutation.mutate(
        { id: crop.id, data },
        {
          onSuccess: () => {
            onOpenChange(false);
          },
        }
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          onOpenChange(false);
        },
      });
    }
  };

  // 저장하기 버튼 핸들러 - 카탈로그 선택 vs 폼 입력 분기
  const handleSave = () => {
    if (selectedRegistrationCrop) {
      createMutation.mutate(
        {
          name: selectedRegistrationCrop.품목,
          category: selectedRegistrationCrop.대분류,
          variety: selectedRegistrationCrop.품종,
          status: "growing",
          farmId: defaultFarmId || undefined,
        },
        {
          onSuccess: () => {
            onOpenChange(false);
          },
        }
      );
    } else {
      form.handleSubmit(onSubmit)();
    }
  };

  const openNewCropModal = () => {
    const term = searchTerm.trim();
    if (term) form.setValue("name", term, { shouldDirty: true });
    setShowNewCropModal(true);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
              <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
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
              <label className="text-sm font-medium">
                {searchTerm.trim() !== "" ? "작물 선택" : "대표 작물 선택"}
              </label>

              {/* 검색어 있을 때 */}
              {searchTerm.trim() !== "" ? (
                isSearching ? (
                  <div className="p-2 text-center text-sm text-gray-500">작물을 검색 중입니다...</div>
                ) : searchResults.length === 0 && filteredMyCrops.length === 0 ? (
                  <div className="rounded-md border border-dashed p-4 text-center text-sm text-gray-600">
                    <p className="mb-3">"{searchTerm}"에 대한 검색 결과가 없습니다.</p>
                    <div className="space-y-2">
                      <Button type="button" onClick={() => setShowDirectRegister(true)} className="w-full">
                        새 작물 직접 등록하기
                      </Button>
                      <Button type="button" variant="outline" onClick={openNewCropModal} className="w-full">
                        작물 등록 요청하기
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {/* 내 작물 검색 결과 */}
                    {filteredMyCrops.length > 0 && (
                      <div>
                        <div className="text-xs text-gray-500 font-medium mb-2 px-1">⭐ 대표 작물</div>
                        <div className="grid grid-cols-2 gap-2">
                          {filteredMyCrops.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setSelectedCrop(selectedCrop === c.id ? "" : c.id);
                                setSelectedRegistrationCrop(null);
                              }}
                              className={`p-3 text-left border rounded-lg transition-colors ${
                                selectedCrop === c.id
                                  ? "border-green-500 bg-green-50 text-green-700"
                                  : "border-gray-200 hover:border-gray-300"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 space-y-1.5">
                                  <div className="font-semibold text-sm leading-snug truncate">⭐ {c.name}</div>
                                  <div className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium max-w-full truncate ${
                                    selectedCrop === c.id
                                      ? "border-green-300 text-green-700 bg-green-50"
                                      : "border-gray-200 text-gray-600 bg-gray-50"
                                  }`}>
                                    {c.varieties?.[0] ?? "품종 정보 없음"}
                                  </div>
                                </div>
                                {selectedCrop === c.id && <Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Supabase 검색 결과 */}
                    {searchResults.length > 0 && (
                      <div>
                        {filteredMyCrops.length > 0 && <div className="text-xs text-gray-500 font-medium mb-2 px-1">전체 작물</div>}
                        <div className="grid grid-cols-2 gap-2">
                          {searchResults.map((regCrop) => (
                            <button
                              key={regCrop.id}
                              type="button"
                              onClick={() => handleRegistrationCropSelect(regCrop)}
                              className={`p-3 text-left border rounded-lg transition-colors ${
                                selectedRegistrationCrop?.id === regCrop.id
                                  ? "border-green-500 bg-green-50 text-green-700"
                                  : "border-gray-200 hover:border-gray-300"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 space-y-1.5">
                                  <div className="font-semibold text-sm leading-snug truncate">{regCrop.품목}</div>
                                  <div className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium max-w-full truncate ${
                                    selectedRegistrationCrop?.id === regCrop.id
                                      ? "border-green-300 text-green-700 bg-green-50"
                                      : "border-gray-200 text-gray-600 bg-gray-50"
                                  }`}>
                                    {regCrop.품종}
                                  </div>
                                </div>
                                {selectedRegistrationCrop?.id === regCrop.id && <Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              ) : (
                /* 검색어 없을 때 - 브라우즈 */
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {/* 내 대표 작물 */}
                  {myCropOptions.length > 0 && (
                    <div>
                      <div className="text-xs text-gray-500 font-medium mb-2 px-1">⭐ 대표 작물</div>
                      <div className="grid grid-cols-2 gap-2">
                        {myCropOptions.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setSelectedCrop(selectedCrop === c.id ? "" : c.id);
                              setSelectedRegistrationCrop(null);
                            }}
                            className={`p-3 text-left border rounded-lg transition-colors ${
                              selectedCrop === c.id
                                ? "border-green-500 bg-green-50 text-green-700"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 space-y-1.5">
                                <div className="font-semibold text-sm leading-snug truncate">⭐ {c.name}</div>
                                <div className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium max-w-full truncate ${
                                  selectedCrop === c.id
                                    ? "border-green-300 text-green-700 bg-green-50"
                                    : "border-gray-200 text-gray-600 bg-gray-50"
                                }`}>
                                  {c.varieties?.[0] ?? "품종 정보 없음"}
                                </div>
                              </div>
                              {selectedCrop === c.id && <Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* 전체 작물 (Supabase) */}
                  <div>
                    <div className="text-xs text-gray-500 font-medium mb-2 px-1">
                      전체 작물
                      {isAllLoading && <span className="ml-1">불러오는 중...</span>}
                      {!isAllLoading && allCrops.length > 0 && <span className="ml-1">({allCrops.length}개)</span>}
                    </div>
                    {isAllLoading ? (
                      <div className="p-4 text-center text-sm text-gray-400">작물 목록을 불러오는 중...</div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {allCrops.map((regCrop) => (
                          <button
                            key={regCrop.id}
                            type="button"
                            onClick={() => handleRegistrationCropSelect(regCrop)}
                            className={`p-3 text-left border rounded-lg transition-colors ${
                              selectedRegistrationCrop?.id === regCrop.id
                                ? "border-green-500 bg-green-50 text-green-700"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 space-y-1.5">
                                <div className="font-semibold text-sm leading-snug truncate">{regCrop.품목}</div>
                                <div className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium max-w-full truncate ${
                                  selectedRegistrationCrop?.id === regCrop.id
                                    ? "border-green-300 text-green-700 bg-green-50"
                                    : "border-gray-200 text-gray-600 bg-gray-50"
                                }`}>
                                  {regCrop.품종}
                                </div>
                              </div>
                              {selectedRegistrationCrop?.id === regCrop.id && <Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 농장 선택 (옵션) */}
            {showFarmSelect && (
              <FormField
                control={form.control}
                name="farmId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>농장</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="등록할 농장을 선택하세요 (선택사항)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {farms.map((f: any) => (
                          <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* 직접 등록 모드 또는 대표 작물 선택 시 노출 */}
            {(showDirectRegister || selectedCropData) && (
              <>
                {/* 작물 분류 */}
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>작물 분류 *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="작물 분류를 선택해주세요" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="콩_완두">콩_완두</SelectItem>
                          <SelectItem value="콩_채두">콩_채두</SelectItem>
                          <SelectItem value="콩_잠두">콩_잠두</SelectItem>
                          <SelectItem value="콩_강두">콩_강두</SelectItem>
                          <SelectItem value="콩_대두">콩_대두</SelectItem>
                          <SelectItem value="음식꽃">음식꽃</SelectItem>
                          <SelectItem value="음식꽃(브라시카 라파)">음식꽃(브라시카 라파)</SelectItem>
                          <SelectItem value="배추(브라시카 라파)">배추(브라시카 라파)</SelectItem>
                          <SelectItem value="배추(브라시카올레라케어)=양배추">배추(브라시카올레라케어)=양배추</SelectItem>
                          <SelectItem value="배추(브라시카 올레라케어)">배추(브라시카 올레라케어)</SelectItem>
                          <SelectItem value="배추(브라시카 올레라케어)">배추(브라시카 올레라케어)</SelectItem>
                          <SelectItem value="뿌리쁘띠">뿌리쁘띠</SelectItem>
                          <SelectItem value="뿌리채소">뿌리채소</SelectItem>
                          <SelectItem value="미나리과 채소">미나리과 채소</SelectItem>
                          <SelectItem value="십자화과 잎채소">십자화과 잎채소</SelectItem>
                          <SelectItem value="십자화과 입채소">십자화과 입채소</SelectItem>
                          <SelectItem value="미나리과 허브">미나리과 허브</SelectItem>
                          <SelectItem value="호박(스쿼시_써머)">호박(스쿼시_써머)</SelectItem>
                          <SelectItem value="호박(스쿼시_윈터)">호박(스쿼시_윈터)</SelectItem>
                          <SelectItem value="토마토">토마토</SelectItem>
                          <SelectItem value="페퍼(고추)">페퍼(고추)</SelectItem>
                          <SelectItem value="오이">오이</SelectItem>
                          <SelectItem value="엽채류">엽채류</SelectItem>
                          <SelectItem value="식용꽃">식용꽃</SelectItem>
                          <SelectItem value="알리움">알리움</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 작물 이름 */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>작물 이름 *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="작물 이름을 입력해주세요" 
                          {...field} 
                          value={showDirectRegister ? searchTerm || field.value : field.value}
                          onChange={(e) => {
                            field.onChange(e);
                            if (showDirectRegister) {
                              setSearchTerm(e.target.value);
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 품종 */}
                <FormField
                  control={form.control}
                  name="variety"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>품종 *</FormLabel>
                      {showDirectRegister ? (
                        <FormControl>
                          <Input 
                            placeholder="품종을 입력해주세요" 
                            {...field} 
                          />
                        </FormControl>
                      ) : (
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="품종을 선택해주세요" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(selectedCropData?.varieties ?? []).map((variety) => (
                              <SelectItem key={variety} value={variety}>
                                {variety}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            
            <Button
              type="button"
              className="w-full"
              disabled={
                createMutation.isPending ||
                updateMutation.isPending ||
                (!crop && !selectedCrop && !showDirectRegister && !selectedRegistrationCrop)
              }
              onClick={handleSave}
            >
              {createMutation.isPending || updateMutation.isPending ? "저장 중..." : "저장하기"}
            </Button>

          </form>
        </Form>
      </DialogContent>
    </Dialog>
    {/* 등록 요청 모달 (대분류/품목/품종 + 모종/직파 + 생육기간) */}
    <NewCropModal open={showNewCropModal} onOpenChange={setShowNewCropModal} baseNameFromSearch={searchTerm} />
    </>
  );
}
// ----------------------------- NewCropModal -----------------------------------------

function NewCropModal({ open, onOpenChange, baseNameFromSearch }: { open: boolean; onOpenChange: (v: boolean) => void; baseNameFromSearch?: string; }) {
  const { toast } = useToast();

  // 등록 요청 전용 폼
  const requestForm = useForm<z.infer<typeof requestSchema>>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      majorCategory: undefined,
      name: baseNameFromSearch || undefined,
      variety: undefined,
      establishment: undefined,
      daysToMaturity: undefined,
      unknowns: { majorCategory: false, name: !baseNameFromSearch ? false : false, variety: false, establishment: false, daysToMaturity: false },
    },
  });

  const sendRequestMutation = useMutation({
    mutationFn: async (payload: z.infer<typeof requestSchema>) => {
      // 향후 DB 연결 시 동일 모달에서 이 로직만 교체하면 됩니다.
      // 예: return (await apiRequest("POST", "/api/crops/requests", payload)).json();
      return new Promise((res) => setTimeout(res, 400));
    },
    onSuccess: () => {
      toast({ title: "요청 전송", description: "작물 등록 요청이 전송되었습니다." });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "요청 실패", description: "요청 처리 중 오류가 발생했습니다.", variant: "destructive" });
    },
  });

  const handleSubmit = requestForm.handleSubmit((values) => {
    // unknown 체크가 된 항목은 명시적으로 undefined로 보냄
    const v = values;
    const payload = {
      majorCategory: v.unknowns.majorCategory ? undefined : v.majorCategory,
      name: v.unknowns.name ? undefined : v.name,
      variety: v.unknowns.variety ? undefined : v.variety,
      establishment: v.unknowns.establishment ? undefined : v.establishment,
      daysToMaturity: v.unknowns.daysToMaturity ? undefined : v.daysToMaturity,
      unknowns: v.unknowns,
    } as z.infer<typeof requestSchema>;
    sendRequestMutation.mutate(payload);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>작물 등록 요청</DialogTitle>
        </DialogHeader>

        <Form {...requestForm}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-gray-600">알고 있는 정보만 입력하고, 모르면 "모름"을 체크하세요.</p>

            {/* 대분류 */}
            <FormField control={requestForm.control} name="majorCategory" render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>대분류</FormLabel>
                <UnknownToggle checked={requestForm.watch("unknowns.majorCategory")} onChange={(b) => {
                  requestForm.setValue("unknowns.majorCategory", b);
                  if (b) field.onChange(undefined);
                }} />
              </div>
              <Select onValueChange={field.onChange} value={field.value || ""} disabled={requestForm.watch("unknowns.majorCategory")}> 
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={requestForm.watch("unknowns.majorCategory") ? "(모름)" : "예: 엽채류 / 과채류 / 근채류"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="엽채류">엽채류</SelectItem>
                  <SelectItem value="근채류">근채류</SelectItem>
                  <SelectItem value="과채류">과채류</SelectItem>
                  <SelectItem value="곡류">곡류</SelectItem>
                  <SelectItem value="두과">두과</SelectItem>
                  <SelectItem value="구근/인경">구근/인경</SelectItem>
                  <SelectItem value="허브/특용">허브/특용</SelectItem>
                  <SelectItem value="기타">기타</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          {/* 품목(작물명) */}
          <FormField control={requestForm.control} name="name" render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>품목 (작물명)</FormLabel>
                <UnknownToggle checked={requestForm.watch("unknowns.name")} onChange={(b) => {
                  requestForm.setValue("unknowns.name", b);
                  if (b) field.onChange(undefined);
                }} />
              </div>
              <FormControl>
                <Input placeholder={requestForm.watch("unknowns.name") ? "(모름)" : "예: 타이바질, 케일"} disabled={requestForm.watch("unknowns.name")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          {/* 품종 */}
          <FormField control={requestForm.control} name="variety" render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>품종</FormLabel>
                <UnknownToggle checked={requestForm.watch("unknowns.variety")} onChange={(b) => {
                  requestForm.setValue("unknowns.variety", b);
                  if (b) field.onChange(undefined);
                }} />
              </div>
              <FormControl>
                <Input placeholder={requestForm.watch("unknowns.variety") ? "(모름)" : "예: 골든스윗"} disabled={requestForm.watch("unknowns.variety")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          {/* 모종/직파 */}
          <FormField control={requestForm.control} name="establishment" render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>재배 방식</FormLabel>
                <UnknownToggle checked={requestForm.watch("unknowns.establishment")} onChange={(b) => {
                  requestForm.setValue("unknowns.establishment", b);
                  if (b) field.onChange(undefined);
                }} />
              </div>
              <Select onValueChange={field.onChange} value={field.value || ""} disabled={requestForm.watch("unknowns.establishment")}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={requestForm.watch("unknowns.establishment") ? "(모름)" : "모종(이식) / 직파"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="transplant">모종(이식)</SelectItem>
                  <SelectItem value="direct">직파</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          {/* 생육 기간 */}
          <FormField control={requestForm.control} name="daysToMaturity" render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>생육 기간(일)</FormLabel>
                <UnknownToggle checked={requestForm.watch("unknowns.daysToMaturity")} onChange={(b) => {
                  requestForm.setValue("unknowns.daysToMaturity", b);
                  if (b) field.onChange(undefined as unknown as number);
                }} />
              </div>
              <FormControl>
                <Input type="number" inputMode="numeric" placeholder={requestForm.watch("unknowns.daysToMaturity") ? "(모름)" : "예: 75"} disabled={requestForm.watch("unknowns.daysToMaturity")} value={field.value ?? ""} onChange={(e) => {
                  const val = e.target.value;
                  field.onChange(val === "" ? undefined : Number(val));
                }} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
              <Button type="submit" disabled={sendRequestMutation.isPending}>{sendRequestMutation.isPending ? "전송 중..." : "요청 보내기"}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function UnknownToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="inline-flex items-center gap-2 text-xs select-none cursor-pointer">
      <input type="checkbox" className="h-3.5 w-3.5" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      모름
    </label>
  );
}
