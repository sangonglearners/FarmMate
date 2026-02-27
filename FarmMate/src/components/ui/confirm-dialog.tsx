import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "destructive" | "default";
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title = "정말로 삭제하시겠습니까?",
  description,
  confirmText = "삭제",
  cancelText = "취소",
  variant = "destructive",
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[320px] rounded-2xl p-0 overflow-hidden">
        {/* 상단 아이콘 영역 */}
        <div className="flex flex-col items-center gap-3 px-6 pt-7 pb-4">
          <div
            className={cn(
              "flex items-center justify-center w-12 h-12 rounded-full",
              variant === "destructive"
                ? "bg-red-100 text-red-500"
                : "bg-amber-100 text-amber-500"
            )}
          >
            <TriangleAlert className="w-6 h-6" />
          </div>
          <AlertDialogHeader className="items-center text-center space-y-1 w-full">
            <AlertDialogTitle className="text-base font-semibold text-gray-900">
              {title}
            </AlertDialogTitle>
            {description && (
              <AlertDialogDescription className="text-sm text-gray-500 leading-relaxed text-center">
                {description}
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>
        </div>

        {/* 구분선 */}
        <div className="h-px bg-gray-100 mx-6" />

        {/* 버튼 영역 */}
        <AlertDialogFooter className="flex flex-row gap-2 px-6 py-4 sm:flex-row">
          <AlertDialogCancel className="flex-1 h-10 rounded-xl border-gray-200 text-gray-600 text-sm font-medium mt-0">
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={cn(
              "flex-1 h-10 rounded-xl text-sm font-medium",
              variant === "destructive"
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-primary hover:bg-primary/90 text-white"
            )}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
