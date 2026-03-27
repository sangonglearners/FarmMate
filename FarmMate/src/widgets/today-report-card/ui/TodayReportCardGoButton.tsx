import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { TodayReportCardDialog } from "./TodayReportCardDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useTasks } from "@/features/task-management";
import { useCrops } from "@/features/crop-management";
import { useOwnFarms, useSharedFarms } from "@/features/farm-management/model/farm.hooks";
import { useSharedCalendars } from "@/features/calendar-share";
import {
  getValidFarmIds,
  getOwnFarmIds,
  filterTasksByValidFarms,
  excludeViewerAndCommenterTasks,
} from "@/shared/utils/task-filters";
import {
  listTaskCompletionsByDate,
  listTaskCompletionsByDateRange,
} from "@/shared/api/task-completion";
import { computeTodayReportCardMetrics } from "../model/computeTodayReportCardMetrics";
import {
  generateTodayFarmReportCardPngBlob,
  generateTodayFarmReportCardPngBlobBack,
  type TodayReportCardMetrics,
} from "@/pages/stats/utils/report-card";

function useTodayDateStr() {
  return useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);
}

interface TodayReportCardGoButtonProps {
  buttonLabel?: string;
  buttonClassName?: string;
}

export function TodayReportCardGoButton({
  buttonLabel = "오늘의 농장 리포트 보러가기",
  buttonClassName,
}: TodayReportCardGoButtonProps = {}) {
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
  const { data: ownFarms = [] } = useOwnFarms();
  const { data: sharedFarms = [] } = useSharedFarms();
  const { data: sharedCalendars = [] } = useSharedCalendars();

  // HomePage와 동일한 "Todo 리스트에서 제외되는 권한" 규칙을 적용합니다.
  const viewerAndCommenterFarmIdSet = useMemo(() => {
    return new Set(
      (sharedCalendars || [])
        .filter((c) => c.role === "viewer" || c.role === "commenter")
        .map((c) => c.calendarId)
    );
  }, [sharedCalendars]);

  const validFarmIds = useMemo(() => {
    const editorSharedFarmIdSet = new Set(
      (sharedCalendars || []).filter((c) => c.role === "editor").map((c) => c.calendarId)
    );
    const ownFarmIdsForSubtract = getOwnFarmIds(ownFarms);
    const editorSharedFarms = sharedFarms.filter(
      (f) => editorSharedFarmIdSet.has(f.id) && !ownFarmIdsForSubtract.has(f.id)
    );
    return getValidFarmIds(ownFarms, editorSharedFarms);
  }, [ownFarms, sharedFarms, sharedCalendars]);

  const permissionFilteredTasks = useMemo(() => {
    const byValidFarms = filterTasksByValidFarms(allTasks, validFarmIds);
    return excludeViewerAndCommenterTasks(byValidFarms, viewerAndCommenterFarmIdSet);
  }, [allTasks, validFarmIds, viewerAndCommenterFarmIdSet]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [backImageUrl, setBackImageUrl] = useState<string | null>(null);
  const [backImageBlob, setBackImageBlob] = useState<Blob | null>(null);
  const [reportGenerating, setReportGenerating] = useState(false);
  const [backGenerating, setBackGenerating] = useState(false);
  const [reportNeedsUpdate, setReportNeedsUpdate] = useState(true);

  const { data: taskCompletionsToday = [], isLoading: taskCompletionsTodayLoading } = useQuery({
    queryKey: ["task-completion-by-date", todayDateStr],
    queryFn: () => listTaskCompletionsByDate(todayDateStr),
    enabled: !!user && dialogOpen,
  });

  const { data: taskCompletionsRange = [], isLoading: taskCompletionsRangeLoading } = useQuery({
    queryKey: ["task-completion-by-date-range", streakStartDateStr, todayDateStr],
    queryFn: () => listTaskCompletionsByDateRange(streakStartDateStr, todayDateStr),
    enabled: !!user && dialogOpen,
  });

  const todayReportMetrics = useMemo((): TodayReportCardMetrics => {
    return computeTodayReportCardMetrics({
      allTasks: permissionFilteredTasks,
      crops,
      todayDateStr,
      taskCompletionsToday,
      taskCompletionsRange,
    });
  }, [permissionFilteredTasks, crops, todayDateStr, taskCompletionsToday, taskCompletionsRange]);

  useEffect(() => {
    const onUpdated = () => {
      setReportNeedsUpdate(true);
    };
    window.addEventListener("farmmate:today-report-card-updated", onUpdated);
    return () => window.removeEventListener("farmmate:today-report-card-updated", onUpdated);
  }, []);

  const generatePreview = async () => {
    if (reportGenerating) return;
    if (tasksLoading || taskCompletionsTodayLoading || taskCompletionsRangeLoading) return;
    if (!reportNeedsUpdate) return;

    setReportGenerating(true);
    try {
      // front
      const frontBlob = await generateTodayFarmReportCardPngBlob(todayReportMetrics);
      setImageBlob(frontBlob);
      setImageUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(frontBlob);
      });

      // back(플립 시 도장)
      setBackGenerating(true);
      const backBlob = await generateTodayFarmReportCardPngBlobBack(todayReportMetrics);
      setBackImageBlob(backBlob);
      setBackImageUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(backBlob);
      });
      setBackGenerating(false);

      setReportNeedsUpdate(false);
    } finally {
      setReportGenerating(false);
    }
  };

  useEffect(() => {
    if (!dialogOpen) return;
    void generatePreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dialogOpen,
    reportNeedsUpdate,
    todayReportMetrics,
    tasksLoading,
    taskCompletionsTodayLoading,
    taskCompletionsRangeLoading,
  ]);

  const downloadReportCard = (side: "front" | "back") => {
    const blob = side === "front" ? imageBlob : backImageBlob;
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const filename =
      side === "front"
        ? `farm-report-${todayDateStr}.png`
        : `farm-report-${todayDateStr}-stamp.png`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const shareReportCard = async (side: "front" | "back") => {
    const blob = side === "front" ? imageBlob : backImageBlob;
    if (!blob) return;

    const filename =
      side === "front"
        ? `farm-report-${todayDateStr}.png`
        : `farm-report-${todayDateStr}-stamp.png`;
    const file = new File([blob], filename, { type: "image/png" });

    try {
      const nav = navigator as Navigator & {
        canShare?: (data: ShareData) => boolean;
      };

      const canShareFiles = nav.canShare ? nav.canShare({ files: [file] }) : true;
      if (nav.share && canShareFiles) {
        await nav.share({
          title: "오늘의 농장 리포트 카드",
          text: "오늘의 농장 리포트 카드입니다.",
          files: [file],
        });
        return;
      }
    } catch {
      // 공유 실패 시 저장으로 폴백
    }

    downloadReportCard(side);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className={buttonClassName ?? "w-full justify-between bg-white"}
        onClick={() => {
          setDialogOpen(true);
          setReportNeedsUpdate(true);
        }}
      >
        {buttonLabel}
      </Button>

      <TodayReportCardDialog
        open={dialogOpen}
        onOpenChange={(next) => {
          setDialogOpen(next);
          if (!next) setReportNeedsUpdate(false);
        }}
        imageUrl={imageUrl}
        backImageUrl={backImageUrl}
        reportGenerating={reportGenerating}
        backImageGenerating={backGenerating}
        imageBlobAvailable={!!imageBlob}
        backImageBlobAvailable={!!backImageBlob}
        onDownload={downloadReportCard}
        onShare={shareReportCard}
        loadingText={`${format(new Date(todayDateStr), "yyyy.MM.dd")} 한 장 요약`}
      />
    </>
  );
}

