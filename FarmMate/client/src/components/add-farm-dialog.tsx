import { useEffect } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { insertFarmSchema } from "@shared/schema";
import type { InsertFarm, Farm } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
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

  const form = useForm<InsertFarm & { name: string }>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      environment: "",
      rowCount: 0,
      area: 0,
    },
  });

  useEffect(() => {
    if (farm) {
      form.reset({
        name: farm.name,
        environment: farm.environment,
        rowCount: farm.rowCount,
        area: farm.area,
      });
    } else {
      form.reset({
        name: "",
        environment: "",
        rowCount: 0,
        area: 0,
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
                    재배 환경 <span className="text-red-500" aria-hidden="true">*</span>
                  </FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
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
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                      <span className="text-gray-600">이랑</span>
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
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
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
  );
}
