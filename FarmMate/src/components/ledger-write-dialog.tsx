import { useState, useEffect } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Plus, Minus, X } from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import type { Task, Farm, Crop, InsertLedger, InsertExpenseItem } from "@shared/schema";
import { createLedger, updateLedger, getLedger, type LedgerWithExpenses } from "@/shared/api/ledgers";
import { z } from "zod";
import { useFarms } from "@/features/farm-management";
import { useCrops } from "@/features/crop-management";

// 숫자 포맷팅 헬퍼 함수
const formatNumber = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return "";
  return value.toLocaleString("ko-KR");
};

const parseNumber = (value: string): number | null => {
  const cleaned = value.replace(/,/g, "");
  const num = Number(cleaned);
  return isNaN(num) ? null : num;
};

// 비용 카테고리 목록
const EXPENSE_CATEGORIES = [
  "종자/묘목비",
  "비료/퇴비",
  "농약/방제비",
  "인건비(외부인력)",
  "자재비(비닐, 지주대 등)",
  "기계/유류비",
  "기타",
];

// 수확 단위 목록
const HARVEST_UNITS = ["kg", "g", "box", "포대", "근"];

// 품질 등급 목록
const QUALITY_GRADES = ["최상", "상", "중", "하"];

const expenseItemSchema = z.object({
  category: z.string().min(1, "카테고리를 선택해주세요"),
  customCategory: z.string().optional(),
  cost: z.number().min(0, "비용은 0 이상이어야 합니다"),
});

const formSchema = z.object({
  revenueAmount: z.number().min(0, "매출액은 0 이상이어야 합니다").optional().nullable(),
  harvestQuantity: z.number().min(0, "수확량은 0 이상이어야 합니다").optional().nullable(),
  harvestUnit: z.string().optional().nullable(),
  qualityGrade: z.string().optional().nullable(),
  salesChannel: z.string().optional().nullable(),
  expenseItems: z.array(expenseItemSchema).default([]),
});

type FormValues = z.infer<typeof formSchema>;

interface LedgerWriteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  ledger?: LedgerWithExpenses | null;
}

export default function LedgerWriteDialog({
  open,
  onOpenChange,
  task,
  ledger,
}: LedgerWriteDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { data: farms } = useFarms();
  const { data: crops } = useCrops();

  const [totalExpense, setTotalExpense] = useState(0);
  const [revenueAmount, setRevenueAmount] = useState<number | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      revenueAmount: null,
      harvestQuantity: null,
      harvestUnit: null,
      qualityGrade: null,
      salesChannel: null,
      expenseItems: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "expenseItems",
  });

  // 기존 장부 데이터 로드
  useEffect(() => {
    if (ledger && open) {
      form.reset({
        revenueAmount: ledger.revenueAmount || null,
        harvestQuantity: ledger.harvestQuantity || null,
        harvestUnit: ledger.harvestUnit || null,
        qualityGrade: ledger.qualityGrade || null,
        salesChannel: ledger.salesChannel || null,
      expenseItems: ledger.expenseItems.map(item => ({
        category: EXPENSE_CATEGORIES.includes(item.category) ? item.category : "기타",
        customCategory: EXPENSE_CATEGORIES.includes(item.category) ? undefined : item.category,
        cost: item.cost,
      })),
      });
      calculateTotalExpense(ledger.expenseItems.map(item => item.cost));
    } else if (task && open && !ledger) {
      // 새 장부 작성 시 초기화
      form.reset({
        revenueAmount: null,
        harvestQuantity: null,
        harvestUnit: null,
        qualityGrade: null,
        salesChannel: null,
        expenseItems: [],
      });
      setTotalExpense(0);
    }
  }, [ledger, task, open, form]);

  // 비용 합계 계산
  const calculateTotalExpense = (costs: number[]) => {
    const total = costs.reduce((sum, cost) => sum + cost, 0);
    setTotalExpense(total);
  };

  // 비용 항목 변경 시 합계 업데이트
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name?.startsWith("expenseItems")) {
        const costs = form.getValues("expenseItems").map(item => item?.cost || 0);
        calculateTotalExpense(costs);
      }
      if (name === "revenueAmount") {
        setRevenueAmount(value.revenueAmount);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);
  
  // 초기 revenueAmount 설정
  useEffect(() => {
    if (ledger && open) {
      setRevenueAmount(ledger.revenueAmount);
    } else if (task && open && !ledger) {
      setRevenueAmount(null);
    }
  }, [ledger, task, open]);

  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      if (!task) {
        throw new Error("작업 정보가 없습니다.");
      }

      const ledgerData: InsertLedger = {
        taskId: task.id,
        revenueAmount: data.revenueAmount || null,
        harvestQuantity: data.harvestQuantity || null,
        harvestUnit: data.harvestUnit || null,
        qualityGrade: data.qualityGrade || null,
        salesChannel: data.salesChannel || null,
      };

      const expenseItems: InsertExpenseItem[] = data.expenseItems.map(item => ({
        ledgerId: "", // 생성 시 자동 설정됨
        category: item.category === "기타" && item.customCategory ? item.customCategory : item.category,
        cost: item.cost,
      }));

      return createLedger(ledgerData, expenseItems);
    },
    onSuccess: () => {
      toast({
        title: "장부가 저장되었습니다",
        description: "장부 내역이 성공적으로 저장되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["ledgers"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      onOpenChange(false);
      // 마이페이지-장부 관리 리스트 페이지로 이동
      setLocation("/ledger-management");
    },
    onError: (error: any) => {
      toast({
        title: "저장 실패",
        description: error.message || "장부 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      if (!ledger) {
        throw new Error("장부 정보가 없습니다.");
      }

      const ledgerData: Partial<InsertLedger> = {
        revenueAmount: data.revenueAmount || null,
        harvestQuantity: data.harvestQuantity || null,
        harvestUnit: data.harvestUnit || null,
        qualityGrade: data.qualityGrade || null,
        salesChannel: data.salesChannel || null,
      };

      const expenseItems: InsertExpenseItem[] = data.expenseItems.map(item => ({
        ledgerId: ledger.id,
        category: item.category === "기타" && item.customCategory ? item.customCategory : item.category,
        cost: item.cost,
      }));

      return updateLedger(ledger.id, ledgerData, expenseItems);
    },
    onSuccess: () => {
      toast({
        title: "장부가 수정되었습니다",
        description: "장부 내역이 성공적으로 수정되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["ledgers"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "수정 실패",
        description: error.message || "장부 수정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    if (ledger) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const addExpenseItem = () => {
    append({ category: "", customCategory: undefined, cost: 0 });
  };

  const removeExpenseItem = (index: number) => {
    remove(index);
  };

  // 작업 정보 가져오기
  const farm = task && farms?.find(f => f.id === task.farmId);
  const crop = task && crops?.find(c => c.id === task.cropId);

  if (!task) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{ledger ? "장부 수정" : "장부 작성"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* 읽기 전용 영역 (Context Header) */}
            <div className="bg-gray-100 p-4 rounded-lg space-y-2">
              <div className="text-sm font-medium text-gray-700">작업 정보</div>
              <div className="text-xs text-gray-600 space-y-1">
                <div>날짜: {task.scheduledDate}</div>
                {task.rowNumber && <div>이랑 번호: {task.rowNumber}</div>}
                {farm && <div>농장명: {farm.name}</div>}
                {crop && (
                  <div>
                    작물명: {crop.category} {'>'} {crop.name} {'>'} {crop.variety}
                  </div>
                )}
                <div>작업 내용: {task.taskType}</div>
                {task.title && <div>제목: {task.title}</div>}
              </div>
            </div>

            {/* 매출 입력 영역 */}
            <div className="space-y-4">
              <div className="text-sm font-medium text-gray-700">매출 정보</div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="harvestQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>수확량</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                          inputMode="numeric"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="harvestUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>단위</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="선택" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {HARVEST_UNITS.map((unit) => (
                            <SelectItem key={unit} value={unit}>
                              {unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="qualityGrade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>품질 등급</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="선택" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {QUALITY_GRADES.map((grade) => (
                          <SelectItem key={grade} value={grade}>
                            {grade}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="salesChannel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>판매처</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="판매처를 입력하세요"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="revenueAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>총 매출액 (원)</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="0"
                        value={formatNumber(field.value)}
                        onChange={(e) => {
                          const num = parseNumber(e.target.value);
                          field.onChange(num);
                          setRevenueAmount(num);
                        }}
                        inputMode="numeric"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 비용 입력 영역 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-gray-700">비용 정보</div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addExpenseItem}
                  className="flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  비용 카테고리 추가
                </Button>
              </div>

              {fields.length === 0 && (
                <div className="text-sm text-gray-500 text-center py-4">
                  비용 항목이 없습니다. 위 버튼을 눌러 추가하세요.
                </div>
              )}

              {fields.map((field, index) => {
                const categoryValue = form.watch(`expenseItems.${index}.category`);
                const isCustomCategory = categoryValue === "기타";
                
                return (
                  <div key={field.id} className="space-y-2">
                    <div className="flex gap-2 items-end">
                      <FormField
                        control={form.control}
                        name={`expenseItems.${index}.category`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel>카테고리</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="선택" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {EXPENSE_CATEGORIES.map((category) => (
                                  <SelectItem key={category} value={category}>
                                    {category}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`expenseItems.${index}.cost`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel>금액 (원)</FormLabel>
                            <FormControl>
                              <Input
                                type="text"
                                placeholder="0"
                                value={formatNumber(field.value)}
                                onChange={(e) => {
                                  const num = parseNumber(e.target.value);
                                  field.onChange(num || 0);
                                }}
                                inputMode="numeric"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeExpenseItem(index)}
                        className="mb-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    {isCustomCategory && (
                      <FormField
                        control={form.control}
                        name={`expenseItems.${index}.customCategory`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>기타 카테고리명</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="카테고리명을 입력하세요"
                                {...field}
                                value={field.value ?? ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                );
              })}

              {(totalExpense > 0 || revenueAmount) && (
                <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                  {revenueAmount !== null && revenueAmount > 0 && (
                    <div className="text-sm font-medium text-gray-700">
                      총 매출: {formatNumber(revenueAmount)}원
                    </div>
                  )}
                  {totalExpense > 0 && (
                    <div className="text-sm font-medium text-gray-700">
                      총 비용: {formatNumber(totalExpense)}원
                    </div>
                  )}
                  {revenueAmount !== null && revenueAmount > 0 && totalExpense > 0 && (
                    <div className="text-base font-bold text-primary border-t pt-2 mt-2">
                      수익: {formatNumber(revenueAmount - totalExpense)}원
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 버튼 */}
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                취소
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "저장 중..."
                  : ledger
                  ? "수정 완료"
                  : "저장하기"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
