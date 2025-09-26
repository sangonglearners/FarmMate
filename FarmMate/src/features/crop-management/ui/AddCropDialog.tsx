import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient /*, useQuery*/ } from "@tanstack/react-query";
import { useForm, UseFormReturn } from "react-hook-form";
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
import { useCreateCrop, useUpdateCrop } from "../model/crop.hooks";
import { useFarms } from "@features/farm-management";
import { z } from "zod";
import { Search, Check } from "lucide-react";

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

// 사전 정의된 대표 작물 목록을 사용한다.

export type CropOption = {
  id: string;
  majorCategory: string;
  name: string;
  category: string | null | undefined;
  varieties: string[] | undefined;
};


// 컴포넌트 외부에 상수로 정의
const TEMP_CROPS = [
  { id: "cabbage", majorCategory: "배추", name: "양배추", category: "배추", varieties: ["그린", "퍼플", "레드"] },
  { id: "carrot", majorCategory: "당근", name: "당근", category: "뿌리채소", varieties: ["오렌지", "퍼플", "화이트"] },
  { id: "bean-snap-pea", majorCategory: "콩_완두", name: "스냅피", category: null, varieties: ["슈가앤", "슈가레이스", "스시나인", "구르메", "슈가스냅"] },
  { id: "bean-snow-pea", majorCategory: "콩_완두", name: "스노우피", category: null, varieties: ["니무라(그린)", "노를리(그린)", "골든스윗"] },
  { id: "bean-green-bean", majorCategory: "콩_채두", name: "그린빈", category: null, varieties: ["칼리마", "캐피타노"] },
  { id: "bean-shell-bean", majorCategory: "콩_채두", name: "쉘빈", category: "드래곤빈", varieties: [] },
  { id: "bean-broad-bean", majorCategory: "콩_잠두", name: "풋잠두", category: null, varieties: ["소라마메", "브로드빈"] },
];

export default function AddCropDialog({ open, onOpenChange, crop, defaultFarmId, showFarmSelect }: AddCropDialogProps) {
  console.log('🚀 AddCropDialog 렌더링됨! open:', open, 'crop:', crop);
  console.log('🌱 사전 정의된 작물 목록:', TEMP_CROPS.length, '개');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: farms = [] } = showFarmSelect ? useFarms() : { data: [] as any[] } as any;

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
      farmId: defaultFarmId || undefined,
    },
  });

  const selectedCropData = TEMP_CROPS.find((c) => c.id === selectedCrop);

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
    } else {
      form.reset({ category: "", name: "", variety: "", status: "growing", farmId: defaultFarmId || undefined });
      setSelectedCrop("");
      setSearchTerm("");
    }
  }, [crop, form]);

  // 대표 작물 선택 시 자동 채우기 (신규 등록 상황에서만)
  useEffect(() => {
    if (selectedCropData && !crop) {
      form.setValue("category", selectedCropData.category);
      form.setValue("name", selectedCropData.name);
      form.setValue("variety", selectedCropData.varieties[0] || "");
    }
  }, [selectedCropData, form, crop]);

  // 검색 필터 - 단순화
  const term = searchTerm.trim().toLowerCase();
  console.log('🔍 검색어:', `"${term}"`);
  
  const filteredCrops = !term ? TEMP_CROPS : TEMP_CROPS.filter((c) => {
    const match = c.name.toLowerCase().includes(term) ||
                  c.category.toLowerCase().includes(term) ||
                  c.majorCategory.toLowerCase().includes(term) ||
                  c.varieties.some((v) => v.toLowerCase().includes(term));
    
    if (match) {
      console.log('🔍 매치된 작물:', c.name);
    }
    
    return match;
  });
  
  console.log('🔍 필터링 결과:', filteredCrops.length, '개 작물');

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

  const openNewCropModal = () => {
    const term = searchTerm.trim();
    if (term) form.setValue("name", term, { shouldDirty: true });
    setShowNewCropModal(true);
  };

  console.log('🎯 렌더링 시점 - filteredCrops 길이:', filteredCrops.length);
  console.log('🎯 렌더링 시점 - searchTerm:', `"${searchTerm}"`);

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

              {/* 결과 없음 상태 */}
              {searchTerm.trim() !== "" && filteredCrops.length === 0 ? (
                <div className="rounded-md border border-dashed p-4 text-center text-sm text-gray-600">
                  <p className="mb-3">"{searchTerm}"에 대한 검색 결과가 없습니다.</p>
                  <Button type="button" onClick={openNewCropModal}>
                    작물 등록 요청하기
                  </Button>
                </div>
              ) : (
                // 결과 리스트
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
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
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          {/* 대분류 */}
                          <div className="inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] text-gray-700">
                            {c.majorCategory}
                          </div>
                          {/* 품목(이름) */}
                          <div className="font-medium text-sm">{c.name}</div>
                          {/* 대표 품종 1개만 표시 */}
                          <div className="text-[11px] text-gray-600">
                            {c.varieties.length > 0 ? c.varieties[0] : "품종 정보 없음"}
                          </div>
                        </div>
                        {selectedCrop === c.id && (
                          <Check className="h-4 w-4 text-green-600 shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
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
            
            <Button
              type="submit"
              className={`w-full ${
                (searchTerm.trim() !== "" && filteredCrops.length === 0) 
                  ? "bg-gray-200 text-gray-500 hover:bg-gray-200" // 연한 회색
                  : ""
              }`}
              disabled={
                createMutation.isPending || 
                updateMutation.isPending || 
                (searchTerm.trim() !== "" && filteredCrops.length === 0) ||
                (!crop && !selectedCrop)
              }
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
