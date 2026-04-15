import {
  FLOG_MAIN_DEEP,
  FLOG_MAIN_LIGHT,
  REPORT_CANVAS_BG,
  REPORT_TRACK,
} from "./farm-report-theme";

/** 캔버스·요약 카드에 그릴 기록 태그(토스 소비태그 스타일) */
export type RecordBadgeVariant =
  | "sprouting_farmer"
  | "steady_farmer"
  | "morning_farmer"
  | "night_farmer"
  | "finisher_farmer"
  | "story_farmer"
  | "busy_day_farmer"
  | "default";

export type RecordBadge = {
  id: string;
  label: string;
  variant: RecordBadgeVariant;
};

export type TodayReportCardMetrics = {
  dateLabel: string;
  completedCount: number;
  plannedCount: number;
  streakDays: number;
  completionPercent: number;
  todayMessage: string;
  primaryCropLabel: string;
  primaryTaskType: "물주기" | "웃거름주기" | "혼합";
  primaryTaskLabel: string;
  /** 오늘 할 일 기준 작물+작업 유형 조합 (예: 당근 물주기) */
  topFarmWorkLabels: string[];
  weeklyDoneFlags: boolean[];
  recordBadges: RecordBadge[];
};

const CANVAS_W = 437;
const CANVAS_H = 632;

/** 카드·메트릭에서 쓰는 주요 농작업 라벨 상한 */
export const REPORT_TOP_FARM_WORK_MAX = 3;

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function fillRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fillStyle: string | CanvasGradient | CanvasPattern
) {
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = fillStyle;
  ctx.fill();
}

function strokeRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  strokeStyle: string,
  lineWidth: number
) {
  roundRect(ctx, x, y, w, h, r);
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

function fillTextWithShadow(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  opts: {
    font: string;
    fillStyle: string;
    align?: CanvasTextAlign;
    shadow?: { blur: number; color: string; offsetX: number; offsetY: number };
  }
) {
  ctx.save();
  ctx.font = opts.font;
  ctx.fillStyle = opts.fillStyle;
  ctx.textAlign = opts.align ?? "left";
  if (opts.shadow) {
    ctx.shadowColor = opts.shadow.color;
    ctx.shadowBlur = opts.shadow.blur;
    ctx.shadowOffsetX = opts.shadow.offsetX;
    ctx.shadowOffsetY = opts.shadow.offsetY;
  }
  ctx.fillText(text, x, y);
  ctx.restore();
}

function ellipsizeLine(text: string, maxChars: number): string {
  const t = text.trim();
  if (t.length <= maxChars) return t;
  return `${t.slice(0, Math.max(1, maxChars - 1))}…`;
}

/** 연녹 헤더 박스 안 날짜+멘트 수직·수평 가운데 (measureText 기준) */
function measureHeaderStackMetrics(
  ctx: CanvasRenderingContext2D,
  dateLabel: string,
  dateFontPx: number,
  message: string,
  gapDateMent: number,
  mentFontSize: number,
  mentLineGap: number
): {
  totalHeight: number;
  stackTopOffset: number;
  dateBaselineFromTop: number;
  mentLine1BaselineFromTop: number;
  mentLine2BaselineFromTop: number | null;
} {
  const maxChars = 22;
  const line1 = ellipsizeLine(message, maxChars);
  let line2: string | null = null;
  if (message.trim().length > maxChars) {
    line2 = ellipsizeLine(message.trim().slice(maxChars), maxChars);
  }

  const fontDate = `800 ${dateFontPx}px system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif`;
  const fontMent = `500 ${mentFontSize}px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif`;

  ctx.font = fontDate;
  const dm = ctx.measureText(dateLabel);
  const dAsc = dm.actualBoundingBoxAscent ?? dateFontPx * 0.72;
  const dDesc = dm.actualBoundingBoxDescent ?? dateFontPx * 0.22;

  ctx.font = fontMent;
  const m1 = ctx.measureText(line1);
  const m1Asc = m1.actualBoundingBoxAscent ?? mentFontSize * 0.72;
  const m1Desc = m1.actualBoundingBoxDescent ?? mentFontSize * 0.22;

  let m2Desc = 0;
  if (line2) {
    const m2 = ctx.measureText(line2);
    m2Desc = m2.actualBoundingBoxDescent ?? mentFontSize * 0.22;
  }

  /** 날짜·멘트 baseline 간격은 기존과 동일(날짜 baseline → 멘트 1줄 baseline) */
  const dateBaselineFromTop = dAsc;
  const mentLine1BaselineFromTop = dAsc + gapDateMent;
  const mentLine2BaselineFromTop = line2 ? mentLine1BaselineFromTop + mentLineGap : null;

  const stackTop = Math.min(0, mentLine1BaselineFromTop - m1Asc);
  const mentBottom =
    line2 !== null
      ? (mentLine2BaselineFromTop as number) + m2Desc
      : mentLine1BaselineFromTop + m1Desc;
  const stackBottom = Math.max(dAsc + dDesc, mentBottom);
  const totalHeight = stackBottom - stackTop;

  return {
    totalHeight,
    stackTopOffset: stackTop,
    dateBaselineFromTop,
    mentLine1BaselineFromTop,
    mentLine2BaselineFromTop,
  };
}

/** 오늘 멘트 최대 2줄, 가운데 정렬 */
function drawTodayMessageBlock(
  ctx: CanvasRenderingContext2D,
  message: string,
  cx: number,
  yTop: number,
  opts?: { fontSize?: number; lineGap?: number }
): number {
  const fontSize = opts?.fontSize ?? 13;
  const lineGap = opts?.lineGap ?? 17;
  const maxChars = 22;
  const line1 = ellipsizeLine(message, maxChars);
  let line2: string | null = null;
  if (message.trim().length > maxChars) {
    line2 = ellipsizeLine(message.trim().slice(maxChars), maxChars);
  }
  const font = `500 ${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif`;
  fillTextWithShadow(ctx, line1, cx, yTop, {
    font,
    fillStyle: "#3D4A3E",
    align: "center",
  });
  if (line2) {
    fillTextWithShadow(ctx, line2, cx, yTop + lineGap, {
      font,
      fillStyle: "#3D4A3E",
      align: "center",
    });
    return yTop + lineGap + Math.round(fontSize * 1.35);
  }
  return yTop + Math.round(fontSize * 1.35);
}

function recordBadgeChipStyle(variant: RecordBadgeVariant): {
  bg: string;
  fg: string;
  stroke: string;
} {
  switch (variant) {
    case "morning_farmer":
      return { bg: "#E3EBFF", fg: "#2F4FA8", stroke: "rgba(47,79,168,0.14)" };
    case "night_farmer":
      return { bg: "#EDE8F7", fg: "#5E35B1", stroke: "rgba(94,53,177,0.14)" };
    case "story_farmer":
      return { bg: "#DCF5EA", fg: "#136C45", stroke: "rgba(19,108,69,0.14)" };
    case "finisher_farmer":
      return { bg: "#FFE7D9", fg: "#C2410C", stroke: "rgba(194,65,12,0.14)" };
    case "steady_farmer":
      return { bg: "#FEF3C7", fg: "#B45309", stroke: "rgba(180,83,9,0.16)" };
    case "busy_day_farmer":
      return { bg: "#E8EDF2", fg: "#37474F", stroke: "rgba(55,71,79,0.12)" };
    case "sprouting_farmer":
      return { bg: "#EAF8E5", fg: "#3F7B3A", stroke: "rgba(63,123,58,0.16)" };
    default:
      return { bg: "#F1F3F4", fg: "#495057", stroke: "rgba(0,0,0,0.06)" };
  }
}

/** 멘트 블록 첫 배지 pill — variant별 면·테두리 (버튼 느낌) */
function badgePillFaceStops(variant: RecordBadgeVariant): { hi: string; mid: string; lo: string } {
  switch (variant) {
    case "morning_farmer":
      return { hi: "#F8FAFF", mid: "#EEF3FF", lo: "#D4DFF5" };
    case "night_farmer":
      return { hi: "#FAF8FF", mid: "#F2EDFA", lo: "#DCD4ED" };
    case "story_farmer":
      return { hi: "#F6FDF9", mid: "#E8F7EF", lo: "#C8EAD9" };
    case "finisher_farmer":
      return { hi: "#FFFAF6", mid: "#FFF0E5", lo: "#F5D5C2" };
    case "steady_farmer":
      return { hi: "#FFFCF2", mid: "#FEF6DC", lo: "#F0E0B0" };
    case "busy_day_farmer":
      return { hi: "#F8FAFC", mid: "#ECEFF4", lo: "#D5DCE4" };
    case "sprouting_farmer":
      return { hi: "#FAFDF8", mid: "#F0F8EB", lo: "#DCEFCF" };
    default:
      return { hi: "#FBFDF8", mid: "#F3F5F0", lo: "#E4EBDC" };
  }
}

function badgePillShadowTint(variant: RecordBadgeVariant): string {
  switch (variant) {
    case "morning_farmer":
      return "rgba(35, 55, 120, 0.12)";
    case "night_farmer":
      return "rgba(60, 40, 110, 0.12)";
    case "story_farmer":
      return "rgba(15, 80, 50, 0.11)";
    case "finisher_farmer":
      return "rgba(120, 45, 15, 0.11)";
    case "steady_farmer":
      return "rgba(110, 70, 10, 0.11)";
    case "busy_day_farmer":
      return "rgba(45, 55, 65, 0.11)";
    case "sprouting_farmer":
      return "rgba(54, 93, 40, 0.11)";
    default:
      return "rgba(45, 75, 40, 0.1)";
  }
}

function badgePillOuterStrokeColor(variant: RecordBadgeVariant): string {
  switch (variant) {
    case "morning_farmer":
      return "rgba(47, 79, 168, 0.4)";
    case "night_farmer":
      return "rgba(94, 53, 177, 0.4)";
    case "story_farmer":
      return "rgba(19, 108, 69, 0.4)";
    case "finisher_farmer":
      return "rgba(194, 65, 12, 0.4)";
    case "steady_farmer":
      return "rgba(180, 83, 9, 0.42)";
    case "busy_day_farmer":
      return "rgba(55, 71, 79, 0.38)";
    case "sprouting_farmer":
      return "rgba(63, 123, 58, 0.42)";
    default:
      return "rgba(90, 122, 71, 0.42)";
  }
}

function drawEmphasizedBadgePill(
  ctx: CanvasRenderingContext2D,
  cx: number,
  pillY: number,
  label: string,
  variant: RecordBadgeVariant,
  compact: boolean
): void {
  const chipStyle = recordBadgeChipStyle(variant);
  const stops = badgePillFaceStops(variant);
  const pillH = compact ? 30 : 34;
  const badgePx = compact ? 14 : 15;
  const fontPill = `800 ${badgePx}px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif`;
  ctx.font = fontPill;
  const tw = Math.ceil(ctx.measureText(label).width);
  const pillPadX = compact ? 15 : 20;
  const pillW = Math.max(tw + pillPadX * 2, compact ? 100 : 108);
  const pillR = Math.min(Math.floor(pillH / 2), 20);
  const pillX = cx - pillW / 2;

  fillRoundRect(ctx, pillX + 0.5, pillY + 1.5, pillW, pillH, pillR, badgePillShadowTint(variant));
  const faceGrad = ctx.createLinearGradient(pillX, pillY, pillX, pillY + pillH);
  faceGrad.addColorStop(0, stops.hi);
  faceGrad.addColorStop(0.45, stops.mid);
  faceGrad.addColorStop(1, stops.lo);
  fillRoundRect(ctx, pillX, pillY, pillW, pillH, pillR, faceGrad);
  strokeRoundRect(ctx, pillX, pillY, pillW, pillH, pillR, badgePillOuterStrokeColor(variant), 1.25);
  strokeRoundRect(ctx, pillX + 0.5, pillY + 0.5, pillW - 1, pillH - 1, Math.max(4, pillR - 1), "rgba(255,255,255,0.62)", 0.75);

  const baselineY = pillY + pillH * 0.72;
  fillTextWithShadow(ctx, label, cx, baselineY, {
    font: fontPill,
    fillStyle: chipStyle.fg,
    align: "center",
  });
}

function mascotMoodCaption(metrics: TodayReportCardMetrics): string {
  const first = metrics.recordBadges?.[0];
  if (first) {
    switch (first.id) {
      case "sprouting_farmer":
        return "기록이 조금씩 자리 잡는 중이에요";
      case "steady_farmer":
        return "꾸준한 기록이 농장을 단단하게 만들고 있어요";
      case "morning_farmer":
        return "아침 시간에 기록하는 패턴이 보여요";
      case "night_farmer":
        return "늦은 시간에도 기록을 놓치지 않아요";
      case "finisher_farmer":
        return "오늘 할 일을 거의 마무리했어요";
      case "story_farmer":
        return "상황과 맥락을 자세히 남기고 있어요";
      case "busy_day_farmer":
        return "오늘은 챙길 일이 많은 하루예요";
      default:
        break;
    }
  }
  if (metrics.plannedCount === 0) return "오늘의 첫 기록을 시작해 보세요";
  if (metrics.completionPercent >= 70) return "오늘 농장 케어, 정말 잘했어요";
  if (metrics.completionPercent >= 30) return "조금씩 쌓이는 멋진 습관";
  return "내일은 한 걸음 더 함께해요";
}

type EmphasizedBadgeLayoutOpts = { compact?: boolean };

/** 배지 연동 멘트 블록(강조) + 첫 배지 라벨 */
function drawEmphasizedBadgeMentBlock(
  ctx: CanvasRenderingContext2D,
  metrics: TodayReportCardMetrics,
  innerL: number,
  innerW: number,
  yTop: number,
  layout?: EmphasizedBadgeLayoutOpts
): number {
  const compact = layout?.compact ?? false;
  const cx = innerL + innerW / 2;
  const ment = mascotMoodCaption(metrics);
  const maxChars = 20;
  const line1 = ellipsizeLine(ment, maxChars);
  let line2: string | null = null;
  if (ment.trim().length > maxChars) {
    line2 = ellipsizeLine(ment.trim().slice(maxChars), maxChars);
  }
  const first = metrics.recordBadges?.[0];
  const padY = compact ? 7 : 14;
  const line1Baseline = padY + (compact ? 11 : 14);
  const secondLineExtra = line2 ? (compact ? 15 : 19) : 0;
  const afterMentGap = first ? (compact ? 7 : 12) : compact ? 5 : 8;
  const emphasisPillH = compact ? 30 : 34;
  const badgeBaselineExtra = first ? emphasisPillH + (compact ? 4 : 6) : 0;
  const blockH = line1Baseline + secondLineExtra + afterMentGap + badgeBaselineExtra + padY;
  const cornerR = compact ? 12 : 16;
  const tail = compact ? 6 : 10;

  fillRoundRect(ctx, innerL, yTop, innerW, blockH, cornerR, "rgba(243, 245, 224, 0.72)");

  const mentPx = compact ? 13 : 15;
  const fontMent = `800 ${mentPx}px system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif`;
  const mentLineGap = compact ? 15 : 19;
  fillTextWithShadow(ctx, line1, cx, yTop + line1Baseline, {
    font: fontMent,
    fillStyle: FLOG_MAIN_DEEP,
    align: "center",
  });
  if (line2) {
    fillTextWithShadow(ctx, line2, cx, yTop + line1Baseline + mentLineGap, {
      font: fontMent,
      fillStyle: FLOG_MAIN_DEEP,
      align: "center",
    });
  }
  if (first) {
    const badgeRowTop = yTop + line1Baseline + secondLineExtra + afterMentGap;
    drawEmphasizedBadgePill(ctx, cx, badgeRowTop, first.label, first.variant, compact);
  }
  return yTop + blockH + tail;
}

function drawRecordTagsCentered(
  ctx: CanvasRenderingContext2D,
  metrics: TodayReportCardMetrics,
  innerL: number,
  innerR: number,
  startY: number,
  layout?: { compact?: boolean }
): number {
  const compact = layout?.compact ?? false;
  const cx = (innerL + innerR) / 2;
  const innerW = innerR - innerL;
  const badges = (metrics.recordBadges ?? []).slice(0, 3);
  /** 첫 배지는 멘트 블록에 이미 표시되므로 칩 줄에서 제외 (중복 방지) */
  const chipsBadges = badges.slice(1);
  const chipH = compact ? 26 : 32;
  const chipR = compact ? 13 : 16;
  const chipGap = compact ? 6 : 8;
  const chipFontPx = compact ? 10.5 : 12;
  const fontChip = `800 ${chipFontPx}px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif`;
  const chipY = startY + (compact ? 3 : 4);
  const chipTextDy = compact ? 17 : 21;
  const chipTail = compact ? 6 : 10;
  const padX = compact ? 22 : 28;
  if (badges.length === 0) {
    const panelTop = startY - 2;
    const panelH = compact ? 40 : 48;
    fillRoundRect(ctx, innerL, panelTop, innerW, panelH, 14, "rgba(243, 245, 224, 0.55)");
    fillTextWithShadow(ctx, "기록이 쌓일수록 나만의 태그가 열려요", cx, startY + (compact ? 18 : 22), {
      font: compact
        ? "500 10px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif"
        : "500 11px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
      fillStyle: "#7A8B7C",
      align: "center",
    });
    return panelTop + panelH + (compact ? 4 : 6);
  }
  if (chipsBadges.length === 0) {
    return startY + (compact ? 3 : 4);
  }
  ctx.font = fontChip;
  const widths = chipsBadges.map((b) => Math.ceil(ctx.measureText(b.label).width) + padX);
  const totalW = widths.reduce((a, b) => a + b, 0) + (chipsBadges.length - 1) * chipGap;
  let x = cx - totalW / 2;
  chipsBadges.forEach((b, i) => {
    const w = widths[i];
    const { bg, fg, stroke } = recordBadgeChipStyle(b.variant);
    fillRoundRect(ctx, x, chipY, w, chipH, chipR, bg);
    strokeRoundRect(ctx, x, chipY, w, chipH, chipR, stroke, 0.75);
    fillTextWithShadow(ctx, b.label, x + w / 2, chipY + chipTextDy, {
      font: fontChip,
      fillStyle: fg,
      align: "center",
    });
    x += w + chipGap;
  });
  return chipY + chipH + chipTail;
}

export async function generateTodayFarmReportCardPngBlob(
  metrics: TodayReportCardMetrics
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D 컨텍스트를 사용할 수 없습니다.");

  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = REPORT_CANVAS_BG;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  const cardX = 14;
  const cardY = 14;
  const cardW = 409;
  const cardH = 556;
  const cardR = 22;
  const pad = 24;
  const innerL = cardX + pad;
  const innerR = cardX + cardW - pad;
  const innerW = innerR - innerL;
  const cx = CANVAS_W / 2;

  fillRoundRect(ctx, cardX + 1, cardY + 3, cardW, cardH, cardR, "rgba(90, 122, 71, 0.08)");
  fillRoundRect(ctx, cardX, cardY, cardW, cardH, cardR, "#FFFFFF");
  strokeRoundRect(ctx, cardX, cardY, cardW, cardH, cardR, "rgba(124, 163, 99, 0.2)", 1);

  /** 날짜·멘트 연녹 박스: 고정 75px, 세로 가운데 정렬 */
  const headerBandTop = cardY + 20;
  const headerBandH = 75;
  const todayMentTwoLines = metrics.todayMessage.trim().length > 22;
  const dateFontPx = todayMentTwoLines ? 17 : 19;
  const gapDateMent = todayMentTwoLines ? 16 : 19;
  const mentFontSize = todayMentTwoLines ? 11 : 12;
  const mentLineGap = todayMentTwoLines ? 12 : 14;
  const headerStack = measureHeaderStackMetrics(
    ctx,
    metrics.dateLabel,
    dateFontPx,
    metrics.todayMessage,
    gapDateMent,
    mentFontSize,
    mentLineGap
  );
  const headerBandContentTop =
    headerBandTop + (headerBandH - headerStack.totalHeight) / 2;
  fillRoundRect(ctx, innerL, headerBandTop, innerW, headerBandH, 14, "rgba(243, 245, 224, 0.5)");
  strokeRoundRect(ctx, innerL, headerBandTop, innerW, headerBandH, 14, "rgba(124, 163, 99, 0.12)", 1);

  const dateBaselineY =
    headerBandContentTop +
    headerStack.dateBaselineFromTop -
    headerStack.stackTopOffset;
  fillTextWithShadow(ctx, metrics.dateLabel, cx, dateBaselineY, {
    font: `800 ${dateFontPx}px system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif`,
    fillStyle: "#1A1F1A",
    align: "center",
  });
  const mentBaselineY =
    headerBandContentTop +
    headerStack.mentLine1BaselineFromTop -
    headerStack.stackTopOffset;
  drawTodayMessageBlock(ctx, metrics.todayMessage, cx, mentBaselineY, {
    fontSize: mentFontSize,
    lineGap: mentLineGap,
  });

  /** 진행률: 헤더와 문구·바 묶음 (글 크기·아래 여백 조정) */
  const progressFontPx = 14;
  const progressGapAfterHeader = 22;
  let y = headerBandTop + headerBandH + progressGapAfterHeader;

  const pct = Math.max(0, Math.min(100, metrics.completionPercent));
  const progressLabel =
    metrics.plannedCount === 0
      ? "오늘 예정된 할 일이 없어요"
      : `오늘 ${metrics.completedCount}/${metrics.plannedCount} 완료 · ${metrics.completionPercent}%`;
  fillTextWithShadow(ctx, progressLabel, innerL, y, {
    font: `600 ${progressFontPx}px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif`,
    fillStyle: "#3D4A3E",
  });
  y += Math.round(progressFontPx * 1.02);
  const barW = innerR - innerL;
  const barH = 8;
  const barRi = 4;
  fillRoundRect(ctx, innerL, y, barW, barH, barRi, REPORT_TRACK);
  const fillW = (barW * pct) / 100;
  if (fillW > 0.5) {
    const g = ctx.createLinearGradient(innerL, 0, innerL + barW, 0);
    g.addColorStop(0, FLOG_MAIN_LIGHT);
    g.addColorStop(1, FLOG_MAIN_DEEP);
    fillRoundRect(ctx, innerL, y, fillW, barH, barRi, g);
  }
  const progressBarToMascotGap = 28;
  y += barH + progressBarToMascotGap;

  const mascotPanelTop = y;
  const mascotPanelH = 162;
  fillRoundRect(ctx, innerL, mascotPanelTop, innerW, mascotPanelH, 16, "rgba(248, 250, 246, 0.95)");
  strokeRoundRect(ctx, innerL, mascotPanelTop, innerW, mascotPanelH, 16, "rgba(124, 163, 99, 0.1)", 1);

  const mascotCy = mascotPanelTop + mascotPanelH / 2;
  const mascotFrogDownPx = 10;
  const mascot = await loadMascotImage(metrics);
  const frogW = 162;
  const frogH = (frogW * mascot.height) / mascot.width;
  const frogX = cx - frogW / 2;
  const frogY = mascotCy - frogH / 2 + mascotFrogDownPx;
  ctx.drawImage(mascot, frogX, frogY, frogW, frogH);

  y = mascotPanelTop + mascotPanelH + 8;
  y = drawEmphasizedBadgeMentBlock(ctx, metrics, innerL, innerW, y);
  y = drawRecordTagsCentered(ctx, metrics, innerL, innerR, y);
  y += 24;

  fillTextWithShadow(ctx, "주요 농작업", innerL, y, {
    font: "800 13px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
    fillStyle: "#8A9A8C",
  });
  y += 13;
  const rowGap = 4;
  const rowLead = 12;
  const rowTail = 4;
  if (metrics.plannedCount === 0) {
    fillTextWithShadow(ctx, "· 첫 기록을 시작해보세요", innerL + 2, y + rowLead, {
      font: "600 14px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
      fillStyle: "#4A5A4C",
    });
    y += rowLead + rowGap + rowTail;
  } else {
    metrics.topFarmWorkLabels.slice(0, REPORT_TOP_FARM_WORK_MAX).forEach((line) => {
      const safe = ellipsizeLine(line, 32);
      fillTextWithShadow(ctx, `· ${safe}`, innerL + 2, y + rowLead, {
        font: "600 14px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
        fillStyle: "#2A332B",
      });
      y += rowLead + rowGap + rowTail;
    });
  }

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (!b) reject(new Error("PNG 생성에 실패했습니다."));
        else resolve(b);
      },
      "image/png",
      1
    );
  });

  return blob;
}

async function loadPngImage(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = src;
  img.crossOrigin = "anonymous";
  await img.decode();
  return img;
}

/**
 * 태그별 개구리: `public/` 에 PNG를 두면 자동 반영
 */
function mascotSrcListForMetrics(metrics: TodayReportCardMetrics): string[] {
  const ordered: string[] = [];
  const add = (s: string) => {
    if (!ordered.includes(s)) ordered.push(s);
  };
  const b = metrics.recordBadges?.[0];
  if (b) {
    add(`/farm-report-mascot-${b.id}.png`);
    add(`/farm-report-mascot-${b.variant}.png`);
  }
  add("/farm-report-mascot.png");
  add("/today-report-frog.png");
  return ordered;
}

async function loadMascotImage(metrics: TodayReportCardMetrics): Promise<HTMLImageElement> {
  for (const src of mascotSrcListForMetrics(metrics)) {
    try {
      return await loadPngImage(src);
    } catch {
      /* 다음 경로 */
    }
  }
  throw new Error("마스코트 이미지를 불러올 수 없습니다.");
}

export async function generateTodayFarmReportCardPngBlobBack(
  metrics: TodayReportCardMetrics
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D 컨텍스트를 사용할 수 없습니다.");

  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = REPORT_CANVAS_BG;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  const cardX = 24;
  const cardY = 48;
  const cardW = 389;
  const cardH = 520;
  roundRect(ctx, cardX, cardY, cardW, cardH, 22);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  strokeRoundRect(ctx, cardX, cardY, cardW, cardH, 22, "rgba(124,163,99,0.16)", 1);

  const frog = await loadMascotImage(metrics);
  const frogW = 280;
  const frogH = (frogW * frog.height) / frog.width;
  const frogX = (CANVAS_W - frogW) / 2;
  const frogY = cardY + 120;
  ctx.drawImage(frog, frogX, frogY, frogW, frogH);

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (!b) reject(new Error("PNG 생성에 실패했습니다."));
        else resolve(b);
      },
      "image/png",
      1
    );
  });

  return blob;
}
