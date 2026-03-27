export type TodayReportCardMetrics = {
  dateLabel: string; // 2026.03.25
  completedCount: number; // 3
  plannedCount: number; // 4
  streakDays: number; // 5
  completionPercent: number; // 0~100
  todayMessage: string; // 50% 이상/미만 분기 메시지
  primaryCropLabel: string; // 상추반
  primaryTaskType: "물주기" | "웃거름주기" | "혼합";
  primaryTaskLabel: string; // 물주기 / 웃거름주기 / 물주기·웃거름
  topCropLabels: string[];
  topTaskLabels: string[];
  weeklyDoneFlags: boolean[];
};

const CANVAS_W = 437;
// 한 화면에 들어갈 수 있도록 세로 길이 축소
const CANVAS_H = 560;

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

export async function generateTodayFarmReportCardPngBlob(
  metrics: TodayReportCardMetrics
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D 컨텍스트를 사용할 수 없습니다.");

  // 1) 배경/레이아웃
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = "#F5F8F3";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  const cardX = 16;
  const cardY = 18;
  const cardW = 405;
  const cardH = 524;
  roundRect(ctx, cardX, cardY, cardW, cardH, 24);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.strokeStyle = "rgba(124,163,99,0.26)";
  ctx.lineWidth = 1.5;
  roundRect(ctx, cardX, cardY, cardW, cardH, 26);
  ctx.stroke();

  // 2) 헤더
  fillTextWithShadow(ctx, "농장 레포트", CANVAS_W / 2, 58, {
    font: "800 30px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
    fillStyle: "#5D7D48",
    align: "center",
  });

  // 오늘 날짜 + 달성
  fillTextWithShadow(ctx, "오늘의 날짜", 36, 170, {
    font: "700 24px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
    fillStyle: "#111827",
  });
  fillTextWithShadow(ctx, metrics.dateLabel, 36, 206, {
    font: "500 20px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
    fillStyle: "#111827",
  });

  const progressText = `${metrics.completedCount}/${metrics.plannedCount}개 | ${metrics.completionPercent}%`;
  fillTextWithShadow(ctx, progressText, 256, 186, {
    font: "700 24px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
    fillStyle: "#111827",
  });
  roundRect(ctx, 250, 200, 144, 8, 4);
  ctx.fillStyle = "#D9D9D9";
  ctx.fill();
  roundRect(ctx, 250, 200, (144 * Math.max(0, Math.min(100, metrics.completionPercent))) / 100, 8, 4);
  ctx.fillStyle = "#7CA363";
  ctx.fill();

  // 주요 작물 / 주요 작업
  fillTextWithShadow(ctx, "주요 작물", 36, 292, {
    font: "700 24px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
    fillStyle: "#111827",
  });
  fillTextWithShadow(ctx, "주요 작업", 150, 292, {
    font: "700 24px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
    fillStyle: "#111827",
  });
  metrics.topCropLabels.slice(0, 3).forEach((crop, idx) => {
    fillTextWithShadow(ctx, `• ${crop}`, 36, 326 + idx * 30, {
      font: "500 18px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
      fillStyle: "#111827",
    });
  });
  metrics.topTaskLabels.slice(0, 3).forEach((task, idx) => {
    fillTextWithShadow(ctx, `• ${task}`, 150, 326 + idx * 30, {
      font: "500 18px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
      fillStyle: "#111827",
    });
  });

  // 우측 스탬프 영역: 기존 이미지 스탬프 유지
  const stampSrc =
    metrics.completionPercent >= 70
      ? "/today-report-stamp-good.png"
      : metrics.completionPercent >= 30
        ? "/today-report-stamp-mid.png"
        : "/today-report-stamp-bad.png";
  const stampImage = await loadPngImage(stampSrc);
  const stampW = 142;
  const stampH = (stampW * stampImage.height) / stampImage.width;
  const stampX = 264;
  const stampY = 244;
  const stampCx = stampX + stampW / 2;
  const stampCy = stampY + stampH / 2;
  ctx.save();
  // 스탬프 사각 흰 배경을 줄이기 위해 타원 영역만 노출
  ctx.beginPath();
  ctx.ellipse(stampCx, stampCy, stampW * 0.44, stampH * 0.48, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.globalAlpha = 0.95;
  ctx.drawImage(stampImage, stampX, stampY, stampW, stampH);
  ctx.restore();

  // 연속 기록(주간 표시)
  fillTextWithShadow(ctx, `연속 기록 🔥 ${metrics.streakDays}일`, 36, 420, {
    font: "800 22px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
    fillStyle: "#111827",
  });
  const weekLabels = ["일", "월", "화", "수", "목", "금", "토"];
  for (let i = 0; i < 7; i++) {
    const cx = 78 + i * 50;
    const cy = 474;
    fillTextWithShadow(ctx, weekLabels[i], cx, 446, {
      font: "500 14px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
      fillStyle: "#111827",
      align: "center",
    });
    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, Math.PI * 2);
    ctx.fillStyle = metrics.weeklyDoneFlags[i] ? "#7CA363" : "#ECECEC";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = metrics.weeklyDoneFlags[i] ? "#6F9258" : "#B7B7B7";
    ctx.stroke();
    if (metrics.weeklyDoneFlags[i]) {
      fillTextWithShadow(ctx, "✓", cx, cy + 7, {
        font: "700 20px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
        fillStyle: "#FFFFFF",
        align: "center",
      });
    }
    fillTextWithShadow(ctx, String(i + 1), cx, 508, {
      font: "500 14px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
      fillStyle: "#111827",
      align: "center",
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
  // public 경로(같은 오리진)라 보통 불필요하지만, 혹시 모를 상황을 대비
  img.crossOrigin = "anonymous";
  await img.decode();
  return img;
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
  ctx.fillStyle = "#F6FBF7";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // 카드 라운드 박스
  const cardX = 24;
  const cardY = 60;
  const cardW = 389;
  const cardH = 480;
  roundRect(ctx, cardX, cardY, cardW, cardH, 26);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.strokeStyle = "rgba(229,231,235,0.95)";
  ctx.lineWidth = 2;
  roundRect(ctx, cardX, cardY, cardW, cardH, 26);
  ctx.stroke();

  // 개구리(베이스)
  const frog = await loadPngImage("/today-report-frog.png");
  const frogW = 320;
  const frogH = (frogW * frog.height) / frog.width;
  const frogX = (CANVAS_W - frogW) / 2;
  const frogY = cardY + 180;
  ctx.drawImage(frog, frogX, frogY, frogW, frogH);

  // 도장 선택(투명하게 오버레이)
  const stampSrc =
    metrics.completionPercent >= 70
      ? "/today-report-stamp-good.png"
      : metrics.completionPercent >= 30
        ? "/today-report-stamp-mid.png"
        : "/today-report-stamp-bad.png";

  const stamp = await loadPngImage(stampSrc);
  const stampW = 270;
  const stampH = (stampW * stamp.height) / stamp.width;
  const stampX = (CANVAS_W - stampW) / 2;
  const stampY = frogY + 40; // 개구리 위로 겹치게

  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.drawImage(stamp, stampX, stampY, stampW, stampH);
  ctx.restore();

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

