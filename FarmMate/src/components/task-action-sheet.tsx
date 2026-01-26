import { FileText, DollarSign } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import type { Task } from "@shared/schema";

interface TaskActionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  onEditTask: () => void;
  onWriteLedger: () => void;
}

export default function TaskActionSheet({
  open,
  onOpenChange,
  task,
  onEditTask,
  onWriteLedger,
}: TaskActionSheetProps) {
  const handleEditTask = () => {
    onOpenChange(false);
    onEditTask();
  };

  const handleWriteLedger = () => {
    onOpenChange(false);
    onWriteLedger();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="text-center">작업 선택</SheetTitle>
        </SheetHeader>
        <div className="space-y-3 mt-6 pb-4">
          <Button
            variant="outline"
            className="w-full justify-start h-14 text-left"
            onClick={handleEditTask}
          >
            <FileText className="w-5 h-5 mr-3" />
            <div className="flex flex-col items-start">
              <span className="font-medium">일지 내용 수정</span>
              <span className="text-xs text-gray-500">농작업 정보를 수정합니다</span>
            </div>
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start h-14 text-left"
            onClick={handleWriteLedger}
          >
            <DollarSign className="w-5 h-5 mr-3" />
            <div className="flex flex-col items-start">
              <span className="font-medium">장부 내역 작성</span>
              <span className="text-xs text-gray-500">매출 및 비용을 기록합니다</span>
            </div>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
