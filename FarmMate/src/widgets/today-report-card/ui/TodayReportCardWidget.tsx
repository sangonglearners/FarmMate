import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/contexts/AuthContext";
import { useTasks } from "@/features/task-management";
import { useCrops } from "@/features/crop-management";
import { listTaskCompletionsByDate, listTaskCompletionsByDateRange } from "@/shared/api/task-completion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { computeTodayReportCardMetrics } from "../model/computeTodayReportCardMetrics";
import {
  generateTodayFarmReportCardPngBlob,
  type TodayReportCardMetrics,
} from "@/pages/stats/utils/report-card";
import { TodayReportCardDialog } from "./TodayReportCardDialog";

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
  const { user } = useAuth();
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

  // 모델: 오늘의 카드 메트릭
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
    } finally {
      setReportGenerating(false);
    }
  };

  // "기록 완료" 이벤트 → 홈에서도 갱신
  useEffect(() => {
    const onUpdated = () => setReportNeedsUpdate(true);
    window.addEventListener("farmmate:today-report-card-updated", onUpdated);
    return () => window.removeEventListener("farmmate:today-report-card-updated", onUpdated);
  }, []);

  // 초기 1회 + 필요 시 갱신
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

  const previewAspect = "aspect-[437/560]";

  return (
    <Card className="h-full">
      <CardContent className="p-4 h-full flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="space-y-0.5">
            <div className="text-sm font-semibold text-gray-900">농장 레포트</div>
            <div className="text-xs text-gray-500">
              {reportGenerating ? "카드를 생성하는 중..." : "나의 오늘의 농장 레포트를 확인해 보세요"}
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            className="rounded-xl bg-[#7CA363] text-white hover:bg-[#6F9258]"
            onClick={() => setDialogOpen(true)}
          >
            보기
          </Button>
        </div>

        <button
          type="button"
          className={`w-full ${previewAspect} rounded-xl border border-gray-100 bg-gray-50 overflow-hidden`}
          onClick={() => setDialogOpen(true)}
          aria-label="오늘의 농장 리포트 카드 보기"
        >
          {imageUrl ? (
            <img src={imageUrl} alt="오늘의 농장 리포트 카드" className="w-full h-full object-contain" />
          ) : (
            <div className="w-full h-full animate-pulse bg-gray-100" />
          )}
        </button>

        <TodayReportCardDialog
          open={dialogOpen}
          onOpenChange={(next) => {
            setDialogOpen(next);
            // 열릴 때 최신 이미지가 없으면 먼저 생성
            if (next) setReportNeedsUpdate(true);
          }}
          imageUrl={imageUrl}
          imageBlobAvailable={!!imageBlob}
          onDownload={download}
          onShare={share}
        />
      </CardContent>
    </Card>
  );
}

