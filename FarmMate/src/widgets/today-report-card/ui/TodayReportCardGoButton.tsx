import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { TodayReportCardDialog } from "./TodayReportCardDialog";
import { useTasks } from "@/features/task-management";
import { useCrops } from "@/features/crop-management";
import { useOwnFarms, useSharedFarms } from "@/features/farm-management/model/farm.hooks";
import { useSharedCalendars } from "@/features/calendar-share";
import { useRequireAuth } from "@/hooks/useRequireAuth";
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
  /** 지정 시 `buttonLabel` 대신 트리거 버튼 내용으로 렌더합니다. */
  children?: ReactNode;
}

export function TodayReportCardGoButton({
  buttonLabel = "오늘의 농장 리포트 보러가기",
  buttonClassName,
  children,
}: TodayReportCardGoButtonProps = {}) {
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
  const [reportGenerating, setReportGenerating] = useState(false);
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

  const reportDataLoading =
    tasksLoading || taskCompletionsTodayLoading || taskCompletionsRangeLoading;
  const showReportGeneratingNotice =
    dialogOpen && (reportDataLoading || reportGenerating || !imageUrl);

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
      const reportBlob = await generateTodayFarmReportCardPngBlob(todayReportMetrics);
      setImageBlob(reportBlob);
      setImageUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(reportBlob);
      });

      setReportNeedsUpdate(false);
    } catch (e) {
      console.error("[TodayReportCardGoButton] generatePreview", e);
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

  const downloadReportCard = () => {
    const blob = imageBlob;
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const filename = `farm-report-${todayDateStr}.png`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const shareReportCard = async () => {
    const blob = imageBlob;
    if (!blob) return;

    const filename = `farm-report-${todayDateStr}.png`;
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

    downloadReportCard();
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className={buttonClassName ?? "w-full justify-between bg-white"}
        onClick={() => {
          if (!ensureAuth()) return;
          setDialogOpen(true);
          setReportNeedsUpdate(true);
        }}
      >
        {children ?? buttonLabel}
      </Button>

      <TodayReportCardDialog
        open={dialogOpen}
        onOpenChange={(next) => {
          setDialogOpen(next);
          if (!next) setReportNeedsUpdate(false);
        }}
        imageUrl={imageUrl}
        imageBlobAvailable={!!imageBlob}
        showGeneratingNotice={showReportGeneratingNotice}
        onDownload={downloadReportCard}
        onShare={shareReportCard}
      />
    </>
  );
}

