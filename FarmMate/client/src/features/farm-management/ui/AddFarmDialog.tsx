import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { RadioGroup, RadioGroupItem } from "@shared/ui/radio-group";
import { Label } from "@shared/ui/label";
import { useToast } from "@shared/hooks/use-toast";
import { insertFarmSchema } from "@shared/types/schema";
import type { InsertFarm, Farm } from "@shared/types/schema";
import { apiRequest } from "@shared/api/client";
import { z } from "zod";

const formSchema = insertFarmSchema.extend({
  name: z.string().min(1, "농장 이름을 입력해주세요"),
});

interface AddFarmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  farm?: Farm | null;
}

export default function AddFarmDialog({ open, onOpenChange, farm }: AddFarmDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEnvModalOpen, setIsEnvModalOpen] = useState(false);
  const [customEnvironment, setCustomEnvironment] = useState("");

  const form = useForm<InsertFarm & { name: string }>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      environment: "노지",
      rowCount: undefined,
      area: undefined,
    },
  });

  useEffect(() => {
    if (farm) {
      form.reset({
        name: farm.name,
        environment: "노지",
        rowCount: farm.rowCount,
        area: farm.area,
      });
    } else {
      form.reset({
        name: "",
        environment: "",
        rowCount: undefined,
        area: undefined,
      });
    }
  }, [farm, form]);

  const createMutation = useMutation({
    mutationFn: async (data: InsertFarm & { name: string }) => {
      const response = await apiRequest("POST", "/api/farms", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/farms"] });
      toast({
        title: "농장 추가 완료",
        description: "새 농장이 성공적으로 추가되었습니다.",
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "추가 실패",
        description: "농장 추가 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: InsertFarm & { name: string }) => {
      const response = await apiRequest("PUT", `/api/farms/${farm!.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/farms"] });
      toast({
        title: "농장 수정 완료",
        description: "농장 정보가 성공적으로 수정되었습니다.",
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "수정 실패",
        description: "농장 수정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertFarm & { name: string }) => {
    if (farm) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {farm ? "농장 수정하기" : "농장을 선택해 주세요"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    농장 이름 <span className="text-red-500" aria-hidden="true">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="농장 이름을 입력해주세요" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="environment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    재배환경 <span className="text-red-500" aria-hidden="true">*</span>
                  </FormLabel>
                  <FormControl>
                  <RadioGroup
                    value={["노지", "시설", "기타"].includes(field.value) ? field.value : "노지"}
                    onValueChange={(val) => {
                        if (val === "기타") {
                          setCustomEnvironment("");
                          setIsEnvModalOpen(true);
                        } else {
                          field.onChange(val);
                        }
                      }}
                      className="flex space-x-6"
                    >
                      <div className="flex items-center space-x-2">
                      <RadioGroupItem value="노지" id="outdoor" />
                      <Label htmlFor="outdoor">노지</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="시설" id="greenhouse" />
                        <Label htmlFor="greenhouse">시설</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="기타" id="other" />
                        <Label htmlFor="other">기타 (직접 입력)</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rowCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    이랑개수 <span className="text-red-500" aria-hidden="true">*</span>
                  </FormLabel>
                  <FormControl>
                    <div className="flex items-center space-x-2"> 
                      <Input
                        type="number"
                        placeholder="숫자를 직접 입력해 주세요"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || "")}
                      />
                      <span className="text-gray-600 whitespace-nowrap">이랑</span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="area"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    이랑면적 <span className="text-red-500" aria-hidden="true">*</span>
                  </FormLabel>
                  <FormControl>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        placeholder="숫자를 직접 입력해 주세요"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || "")}
                      />
                      <span className="text-gray-600">m²</span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? "저장 중..." : "저장하기"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>

    {/* 재배환경 직접 입력 모달 */}
    <Dialog open={isEnvModalOpen} onOpenChange={setIsEnvModalOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>재배환경 직접 입력</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="env-other">재배환경명</Label>
          <Input
            id="env-other"
            placeholder="예: 수경재배, 스마트팜 등"
            value={customEnvironment}
            onChange={(e) => setCustomEnvironment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const trimmed = customEnvironment.trim();
                if (trimmed) {
                  // Update form value and close modal
                  (form.setValue as any)("environment", trimmed, { shouldValidate: true, shouldDirty: true });
                  setIsEnvModalOpen(false);
                }
              }
            }}
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            저장을 누르면 이 값이 재배환경으로 설정됩니다.
          </p>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsEnvModalOpen(false)}>취소</Button>
          <Button
            onClick={() => {
              const trimmed = customEnvironment.trim();
              if (!trimmed) return;
              (form.setValue as any)("environment", trimmed, { shouldValidate: true, shouldDirty: true });
              setIsEnvModalOpen(false);
            }}
            disabled={!customEnvironment.trim()}
          >
            저장
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
