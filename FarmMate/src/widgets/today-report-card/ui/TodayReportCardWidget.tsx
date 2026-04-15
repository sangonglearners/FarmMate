import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { useTasks } from "@/features/task-management";
import { useCrops } from "@/features/crop-management";
import { listTaskCompletionsByDate, listTaskCompletionsByDateRange } from "@/shared/api/task-completion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileImage, Sparkles } from "lucide-react";
import { computeTodayReportCardMetrics } from "../model/computeTodayReportCardMetrics";
import {
  generateTodayFarmReportCardPngBlob,
  type TodayReportCardMetrics,
} from "@/pages/stats/utils/report-card";
import { TodayReportCardDialog } from "./TodayReportCardDialog";
import { useRequireAuth } from "@/hooks/useRequireAuth";

function useTodayDateStr() {
  return useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);
}

export function TodayReportCardWidget() {
  const { user, ensureAuth } = useRequireAuth();
  const todayDateStr = useTodayDateStr();
  const streakStartDateStr = useMemo(() => {
    const [y, m, d] = todayDateStr.split("-").map((n) => Number(n));
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() - 13);
    const yy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
  }, [todayDateStr]);

  const { data: allTasks = [], isLoading: tasksLoading } = useTasks();
  const { data: crops = [] } = useCrops();

  const {
    data: taskCompletionsToday = [],
    isLoading: taskCompletionsTodayLoading,
  } = useQuery({
    queryKey: ["task-completion-by-date", todayDateStr],
    queryFn: () => listTaskCompletionsByDate(todayDateStr),
    enabled: !!user,
  });

  const {
    data: taskCompletionsRange = [],
    isLoading: taskCompletionsRangeLoading,
  } = useQuery({
    queryKey: ["task-completion-by-date-range", streakStartDateStr, todayDateStr],
    queryFn: () => listTaskCompletionsByDateRange(streakStartDateStr, todayDateStr),
    enabled: !!user,
  });

  const todayReportMetrics = useMemo((): TodayReportCardMetrics => {
    return computeTodayReportCardMetrics({
      allTasks,
      crops,
      todayDateStr,
      taskCompletionsToday,
      taskCompletionsRange,
    });
  }, [allTasks, crops, todayDateStr, taskCompletionsToday, taskCompletionsRange]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [reportGenerating, setReportGenerating] = useState(false);
  const [reportNeedsUpdate, setReportNeedsUpdate] = useState(true);

  const reportDataLoading =
    tasksLoading || taskCompletionsTodayLoading || taskCompletionsRangeLoading;
  const showReportGeneratingNotice =
    dialogOpen && (reportDataLoading || reportGenerating || !imageUrl);

  const generatePreview = async () => {
    if (reportGenerating) return;
    if (tasksLoading || taskCompletionsTodayLoading || taskCompletionsRangeLoading) return;

    setReportGenerating(true);
    try {
      const reportBlob = await generateTodayFarmReportCardPngBlob(todayReportMetrics);
      setImageBlob(reportBlob);
      setImageUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(reportBlob);
      });

      setReportNeedsUpdate(false);
    } catch (e) {
      console.error("[TodayReportCardWidget] generatePreview", e);
      setReportNeedsUpdate(false);
    } finally {
      setReportGenerating(false);
    }
  };

  useEffect(() => {
    const onUpdated = () => setReportNeedsUpdate(true);
    window.addEventListener("farmmate:today-report-card-updated", onUpdated);
    return () => window.removeEventListener("farmmate:today-report-card-updated", onUpdated);
  }, []);

  useEffect(() => {
    if (!reportNeedsUpdate) return;
    void generatePreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    reportNeedsUpdate,
    tasksLoading,
    taskCompletionsTodayLoading,
    taskCompletionsRangeLoading,
    todayReportMetrics,
  ]);

  const filename = `farm-report-${todayDateStr}.png`;

  const download = () => {
    const blob = imageBlob;
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const share = async () => {
    const blob = imageBlob;
    if (!blob) return;
    const file = new File([blob], filename, { type: "image/png" });

    try {
      const nav = navigator as Navigator & {
        canShare?: (data: ShareData) => boolean;
      };

      const canShareFiles = nav.canShare ? nav.canShare({ files: [file] }) : true;
      if (nav.share && canShareFiles) {
        await nav.share({
          title: "농장 레포트",
          text: "나의 오늘의 농장 레포트를 확인해 보세요.",
          files: [file],
        });
        return;
      }
    } catch {
      // 공유 실패 시 저장으로 폴백
    }

    download();
  };

  const previewAspect = "aspect-[437/632]";

  return (
    <Card className="h-full overflow-hidden border-primary/15 shadow-md shadow-primary/10">
      <CardContent className="flex h-full flex-col gap-3.5 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F3F5E0]/90">
            <FileImage className="h-5 w-5 text-primary" strokeWidth={1.75} aria-hidden />
          </div>
          <div className="min-w-0 flex-1 space-y-1 pt-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold tracking-tight text-foreground">농장 레포트</span>
              <Sparkles className="h-3.5 w-3.5 text-primary" strokeWidth={2} aria-hidden />
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {reportGenerating
                ? "오늘 카드를 그리는 중이에요…"
                : "오늘의 농장 기록을 한 장으로 담았어요."}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            className="shrink-0 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/15 hover:bg-primary/90"
            onClick={() => {
              if (!ensureAuth()) return;
              setDialogOpen(true);
            }}
          >
            보기
          </Button>
        </div>

        <button
          type="button"
          className={`group relative w-full ${previewAspect} overflow-hidden rounded-2xl bg-[#F3F5E0]/35 transition-[box-shadow,transform] duration-200 hover:bg-white hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] active:scale-[0.99]`}
          onClick={() => {
            if (!ensureAuth()) return;
            setDialogOpen(true);
          }}
          aria-label="오늘의 농장 리포트 카드 보기"
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="오늘의 농장 리포트 카드"
              className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-b from-gray-100/80 to-gray-50 animate-pulse">
              <div className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-medium text-gray-400 ring-1 ring-gray-200/60">
                미리보기 준비 중
              </div>
            </div>
          )}
        </button>

        <TodayReportCardDialog
          open={dialogOpen}
          onOpenChange={(next) => {
            setDialogOpen(next);
            if (next) setReportNeedsUpdate(true);
          }}
          imageUrl={imageUrl}
          imageBlobAvailable={!!imageBlob}
          showGeneratingNotice={showReportGeneratingNotice}
          onDownload={download}
          onShare={share}
        />
      </CardContent>
    </Card>
  );
}
