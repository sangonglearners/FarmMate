import {
  FLOG_MAIN_DEEP,
  FLOG_MAIN_LIGHT,
  REPORT_CANVAS_BG,
  REPORT_TRACK,
} from "./farm-report-theme";

/** 캔버스·요약 카드에 그릴 기록 태그(토스 소비태그 스타일) */
export type RecordBadgeVariant =
  | "dawn"
  | "night"
  | "memo"
  | "check"
  | "streak"
  | "planner"
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

/** 오늘 멘트 최대 2줄, 가운데 정렬 */
function drawTodayMessageBlock(
  ctx: CanvasRenderingContext2D,
  message: string,
  cx: number,
  yTop: number
): number {
  const maxChars = 22;
  const line1 = ellipsizeLine(message, maxChars);
  let line2: string | null = null;
  if (message.trim().length > maxChars) {
    line2 = ellipsizeLine(message.trim().slice(maxChars), maxChars);
  }
  const font =
    "500 13px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
  fillTextWithShadow(ctx, line1, cx, yTop, {
    font,
    fillStyle: "#3D4A3E",
    align: "center",
  });
  if (line2) {
    fillTextWithShadow(ctx, line2, cx, yTop + 17, {
      font,
      fillStyle: "#3D4A3E",
      align: "center",
    });
    return yTop + 17 + 20;
  }
  return yTop + 20;
}

function recordBadgeChipStyle(variant: RecordBadgeVariant): {
  bg: string;
  fg: string;
  stroke: string;
} {
  switch (variant) {
    case "dawn":
      return { bg: "#E3EBFF", fg: "#2F4FA8", stroke: "rgba(47,79,168,0.14)" };
    case "night":
      return { bg: "#EDE8F7", fg: "#5E35B1", stroke: "rgba(94,53,177,0.14)" };
    case "memo":
      return { bg: "#DCF5EA", fg: "#136C45", stroke: "rgba(19,108,69,0.14)" };
    case "check":
      return { bg: "#FFE7D9", fg: "#C2410C", stroke: "rgba(194,65,12,0.14)" };
    case "streak":
      return { bg: "#FEF3C7", fg: "#B45309", stroke: "rgba(180,83,9,0.16)" };
    case "planner":
      return { bg: "#E8EDF2", fg: "#37474F", stroke: "rgba(55,71,79,0.12)" };
    default:
      return { bg: "#F1F3F4", fg: "#495057", stroke: "rgba(0,0,0,0.06)" };
  }
}

function mascotAuraFill(metrics: TodayReportCardMetrics): string {
  const first = metrics.recordBadges?.[0];
  if (first) {
    switch (first.variant) {
      case "dawn":
        return "rgba(227, 235, 255, 0.94)";
      case "night":
        return "rgba(237, 232, 247, 0.94)";
      case "memo":
        return "rgba(220, 245, 234, 0.88)";
      case "check":
        return "rgba(255, 231, 217, 0.92)";
      case "streak":
        return "rgba(254, 243, 199, 0.92)";
      case "planner":
        return "rgba(232, 237, 242, 0.94)";
      default:
        break;
    }
  }
  const p = metrics.completionPercent;
  if (p >= 70) return "rgba(220, 243, 208, 0.9)";
  if (p >= 30) return "rgba(236, 245, 228, 0.92)";
  return "rgba(241, 245, 249, 0.96)";
}

function mascotMoodCaption(metrics: TodayReportCardMetrics): string {
  const first = metrics.recordBadges?.[0];
  if (first) {
    switch (first.id) {
      case "dawn":
        return "새벽마다 남기는 기록";
      case "night":
        return "늦은 밤까지 챙기는 농장";
      case "memo":
        return "메모로 꼼꼼하게 남기는 하루";
      case "check":
        return "할 일을 꼭 챙기는 하루";
      case "streak":
        return "꾸준함이 쌓이는 패턴";
      case "planner":
        return "바쁜 하루도 차근차근";
      case "grow":
        return "기록이 조금씩 자라나는 중이에요";
      default:
        break;
    }
  }
  if (metrics.plannedCount === 0) return "오늘의 첫 기록을 시작해 보세요";
  if (metrics.completionPercent >= 70) return "오늘 농장 케어, 정말 잘했어요";
  if (metrics.completionPercent >= 30) return "조금씩 쌓이는 멋진 습관";
  return "내일은 한 걸음 더 함께해요";
}

/** 배지 연동 멘트 블록(강조) + 첫 배지 라벨 */
function drawEmphasizedBadgeMentBlock(
  ctx: CanvasRenderingContext2D,
  metrics: TodayReportCardMetrics,
  innerL: number,
  innerW: number,
  yTop: number
): number {
  const cx = innerL + innerW / 2;
  const ment = mascotMoodCaption(metrics);
  const maxChars = 20;
  const line1 = ellipsizeLine(ment, maxChars);
  let line2: string | null = null;
  if (ment.trim().length > maxChars) {
    line2 = ellipsizeLine(ment.trim().slice(maxChars), maxChars);
  }
  const first = metrics.recordBadges?.[0];
  const padY = 14;
  const line1Baseline = padY + 14;
  const secondLineExtra = line2 ? 19 : 0;
  const afterMentGap = first ? 10 : 8;
  const badgeBaselineExtra = first ? 14 : 0;
  const blockH = line1Baseline + secondLineExtra + afterMentGap + badgeBaselineExtra + padY;

  fillRoundRect(ctx, innerL, yTop, innerW, blockH, 16, "rgba(243, 245, 224, 0.72)");

  const fontMent =
    "800 15px system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif";
  fillTextWithShadow(ctx, line1, cx, yTop + line1Baseline, {
    font: fontMent,
    fillStyle: FLOG_MAIN_DEEP,
    align: "center",
  });
  if (line2) {
    fillTextWithShadow(ctx, line2, cx, yTop + line1Baseline + 19, {
      font: fontMent,
      fillStyle: FLOG_MAIN_DEEP,
      align: "center",
    });
  }
  if (first) {
    const { fg } = recordBadgeChipStyle(first.variant);
    const badgeY = yTop + line1Baseline + secondLineExtra + afterMentGap + 10;
    fillTextWithShadow(ctx, first.label, cx, badgeY, {
      font: "800 11px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
      fillStyle: fg,
      align: "center",
    });
  }
  return yTop + blockH + 10;
}

function drawRecordTagsCentered(
  ctx: CanvasRenderingContext2D,
  metrics: TodayReportCardMetrics,
  innerL: number,
  innerR: number,
  startY: number
): number {
  const cx = (innerL + innerR) / 2;
  const innerW = innerR - innerL;
  const badges = (metrics.recordBadges ?? []).slice(0, 3);
  const chipH = 26;
  const chipR = 13;
  const chipGap = 7;
  const fontChip =
    "800 10.5px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
  const chipY = startY + 4;
  if (badges.length === 0) {
    const panelTop = startY - 2;
    const panelH = 48;
    fillRoundRect(ctx, innerL, panelTop, innerW, panelH, 14, "rgba(243, 245, 224, 0.55)");
    fillTextWithShadow(ctx, "기록이 쌓일수록 나만의 태그가 열려요", cx, startY + 22, {
      font: "500 11px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
      fillStyle: "#7A8B7C",
      align: "center",
    });
    return panelTop + panelH + 6;
  }
  ctx.font = fontChip;
  const widths = badges.map((b) => Math.ceil(ctx.measureText(b.label).width) + 20);
  const totalW = widths.reduce((a, b) => a + b, 0) + (badges.length - 1) * chipGap;
  let x = cx - totalW / 2;
  badges.forEach((b, i) => {
    const w = widths[i];
    const { bg, fg, stroke } = recordBadgeChipStyle(b.variant);
    fillRoundRect(ctx, x, chipY, w, chipH, chipR, bg);
    strokeRoundRect(ctx, x, chipY, w, chipH, chipR, stroke, 0.75);
    fillTextWithShadow(ctx, b.label, x + w / 2, chipY + 16, {
      font: fontChip,
      fillStyle: fg,
      align: "center",
    });
    x += w + chipGap;
  });
  return chipY + chipH + 10;
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
  const cardH = 604;
  const cardR = 22;
  const pad = 24;
  const innerL = cardX + pad;
  const innerR = cardX + cardW - pad;
  const innerW = innerR - innerL;
  const cx = CANVAS_W / 2;

  fillRoundRect(ctx, cardX + 1, cardY + 3, cardW, cardH, cardR, "rgba(90, 122, 71, 0.08)");
  fillRoundRect(ctx, cardX, cardY, cardW, cardH, cardR, "#FFFFFF");
  strokeRoundRect(ctx, cardX, cardY, cardW, cardH, cardR, "rgba(124, 163, 99, 0.2)", 1);

  const headerBandTop = cardY + 26;
  const headerBandH = 128;
  fillRoundRect(ctx, innerL, headerBandTop, innerW, headerBandH, 14, "rgba(243, 245, 224, 0.5)");
  strokeRoundRect(ctx, innerL, headerBandTop, innerW, headerBandH, 14, "rgba(124, 163, 99, 0.12)", 1);

  let y = headerBandTop + 20;
  fillTextWithShadow(ctx, "농장 레포트", cx, y, {
    font: "800 24px system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif",
    fillStyle: "#1A1F1A",
    align: "center",
  });
  y += 28;
  fillTextWithShadow(ctx, metrics.dateLabel, cx, y, {
    font: "600 14px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
    fillStyle: "#5A6B5C",
    align: "center",
  });
  y += 22;
  y = drawTodayMessageBlock(ctx, metrics.todayMessage, cx, y);

  y = headerBandTop + headerBandH + 16;

  const pct = Math.max(0, Math.min(100, metrics.completionPercent));
  const progressLabel =
    metrics.plannedCount === 0
      ? "오늘 예정된 할 일이 없어요"
      : `오늘 ${metrics.completedCount}/${metrics.plannedCount} 완료 · ${metrics.completionPercent}%`;
  fillTextWithShadow(ctx, progressLabel, innerL, y, {
    font: "600 12px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
    fillStyle: "#3D4A3E",
  });
  y += 18;
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
  y += barH + 12;

  const mascotPanelTop = y;
  const auraR = 86;
  const mascotPanelH = auraR * 2 + 22;
  fillRoundRect(ctx, innerL, mascotPanelTop, innerW, mascotPanelH, 16, "rgba(248, 250, 246, 0.95)");
  strokeRoundRect(ctx, innerL, mascotPanelTop, innerW, mascotPanelH, 16, "rgba(124, 163, 99, 0.1)", 1);

  const auraCy = mascotPanelTop + 12 + auraR;
  ctx.beginPath();
  ctx.arc(cx, auraCy, auraR, 0, Math.PI * 2);
  ctx.fillStyle = mascotAuraFill(metrics);
  ctx.fill();

  const mascot = await loadMascotImage(metrics);
  const frogW = 208;
  const frogH = (frogW * mascot.height) / mascot.width;
  const frogX = cx - frogW / 2;
  const frogY = auraCy - frogH / 2;
  ctx.drawImage(mascot, frogX, frogY, frogW, frogH);

  y = mascotPanelTop + mascotPanelH + 8;
  y = drawEmphasizedBadgeMentBlock(ctx, metrics, innerL, innerW, y);
  y = drawRecordTagsCentered(ctx, metrics, innerL, innerR, y);

  fillTextWithShadow(ctx, "주요 농작업 활동", innerL, y, {
    font: "800 11px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
    fillStyle: "#8A9A8C",
  });
  y += 16;
  const rowGap = 5;
  if (metrics.plannedCount === 0) {
    fillTextWithShadow(ctx, "· 첫 기록을 시작해보세요", innerL + 2, y + 12, {
      font: "600 12.5px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
      fillStyle: "#4A5A4C",
    });
  } else {
    metrics.topFarmWorkLabels.slice(0, 3).forEach((line) => {
      const safe = ellipsizeLine(line, 34);
      fillTextWithShadow(ctx, `· ${safe}`, innerL + 2, y + 12, {
        font: "600 12.5px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
        fillStyle: "#2A332B",
      });
      y += 12 + rowGap + 4;
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
