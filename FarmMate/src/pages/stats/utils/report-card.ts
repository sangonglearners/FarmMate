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

  // 1) 배경/레이아웃(시안의 항목만 참고, 사진 템플릿은 사용하지 않음)
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = "#F6FBF7";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // 은은한 배경 장식(라운드 도형)
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = "#DFF3E4";
  ctx.beginPath();
  ctx.arc(120, 110, 85, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#CFEAD9";
  ctx.beginPath();
  ctx.arc(330, 80, 60, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 카드 영역
  const cardX = 24;
  const cardY = 60;
  const cardW = 389;
  const cardH = 480;
  roundRect(ctx, cardX, cardY, cardW, cardH, 26);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();

  // 카드 테두리
  ctx.strokeStyle = "rgba(229,231,235,0.95)";
  ctx.lineWidth = 2;
  roundRect(ctx, cardX, cardY, cardW, cardH, 26);
  ctx.stroke();

  // 2) 텍스트 오버레이
  const padX = 38;

  // 오늘의 날짜
  fillTextWithShadow(ctx, "오늘의 날짜", padX, 92, {
    font: "700 18px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
    fillStyle: "#6B7280",
  });
  fillTextWithShadow(ctx, metrics.dateLabel, padX, 132, {
    font: "800 28px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
    fillStyle: "#111827",
  });

  // 농장 챙김 멘트(50% 기준)
  fillTextWithShadow(ctx, metrics.todayMessage, CANVAS_W / 2, 182, {
    font: "800 20px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
    fillStyle: "#0B0F17",
    align: "center",
  });

  // 총 계획 / 완료
  const statY = 240;
  const statH = 88;
  const statW = 176;
  const statGap = 18;
  const statX = 28;

  const stats = [
    { label: "총 계획", value: `${metrics.plannedCount}개`, color: "#0F3B2E" },
    { label: "총 완료", value: `${metrics.completedCount}건`, color: "#4CAF50" },
  ];

  stats.forEach((s, idx) => {
    const x = statX + idx * (statW + statGap);
    ctx.fillStyle = "rgba(255,255,255,0.82)";
    ctx.strokeStyle = "rgba(229,231,235,0.0)";
    roundRect(ctx, x, statY, statW, statH, 18);
    ctx.fill();
    ctx.stroke();

    fillTextWithShadow(ctx, s.label, x + statW / 2, statY + 28, {
      font: "700 14px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
      fillStyle: "#6B7280",
      align: "center",
    });
    fillTextWithShadow(ctx, s.value, x + statW / 2, statY + 62, {
      font: "800 22px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
      fillStyle: s.color,
      align: "center",
    });
  });

  // 주요 작물 / 작업
  const sectionY = 348;
  fillTextWithShadow(ctx, "주요 작물 / 작업", padX, sectionY, {
    font: "800 16px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
    fillStyle: "#0F3B2E",
  });

  fillTextWithShadow(ctx, metrics.primaryCropLabel, padX, sectionY + 32, {
    font: "800 22px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
    fillStyle: "#111827",
  });

  fillTextWithShadow(ctx, metrics.primaryTaskLabel, padX, sectionY + 62, {
    font: "700 18px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
    fillStyle: "#4B5563",
  });

  // 이미지(썸네일) 영역: 외부 이미지 대신 카드 일러스트를 직접 그립니다.
  // 이미지 우측에 여백이 생기도록 카드 오른쪽 끝보다 안쪽에 둡니다.
  const thumbX = 214;
  const thumbY = sectionY - 6;
  const thumbW = 160;
  const thumbH = 150;
  roundRect(ctx, thumbX, thumbY, thumbW, thumbH, 20);
  ctx.fillStyle = "#E8F5E9";
  ctx.fill();

  // 썸네일 테두리
  ctx.strokeStyle = "rgba(76,175,80,0.25)";
  ctx.lineWidth = 2;
  roundRect(ctx, thumbX, thumbY, thumbW, thumbH, 20);
  ctx.stroke();

  // 아이콘(주요 작물)
  const iconCx = thumbX + thumbW / 2;
  const iconCy = thumbY + 70;

  const cropBaseName = metrics.primaryCropLabel.endsWith("반")
    ? metrics.primaryCropLabel.slice(0, -1)
    : metrics.primaryCropLabel;

  const drawLeaf = () => {
    ctx.fillStyle = "#4CAF50";
    ctx.beginPath();
    ctx.moveTo(iconCx, iconCy - 38);
    ctx.bezierCurveTo(iconCx + 34, iconCy - 38, iconCx + 34, iconCy, iconCx, iconCy + 42);
    ctx.bezierCurveTo(iconCx - 34, iconCy, iconCx - 34, iconCy - 38, iconCx, iconCy - 38);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(76,175,80,0.35)";
    ctx.beginPath();
    ctx.arc(iconCx - 8, iconCy - 10, 14, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawCarrot = () => {
    ctx.fillStyle = "#F59E0B";
    ctx.beginPath();
    ctx.moveTo(iconCx, iconCy - 42);
    ctx.bezierCurveTo(iconCx + 36, iconCy - 20, iconCx + 36, iconCy + 10, iconCx, iconCy + 40);
    ctx.bezierCurveTo(iconCx - 36, iconCy + 10, iconCx - 36, iconCy - 20, iconCx, iconCy - 42);
    ctx.closePath();
    ctx.fill();
    // 손잡이/뿌리
    ctx.fillStyle = "#D97706";
    ctx.beginPath();
    ctx.moveTo(iconCx - 10, iconCy + 6);
    ctx.bezierCurveTo(iconCx + 16, iconCy + 6, iconCx + 16, iconCy + 28, iconCx - 10, iconCy + 28);
    ctx.closePath();
    ctx.fill();
    // 잎
    ctx.fillStyle = "#22C55E";
    ctx.beginPath();
    ctx.moveTo(iconCx - 16, iconCy - 46);
    ctx.bezierCurveTo(iconCx - 6, iconCy - 58, iconCx + 6, iconCy - 58, iconCx + 16, iconCy - 46);
    ctx.bezierCurveTo(iconCx + 4, iconCy - 40, iconCx - 4, iconCy - 40, iconCx - 16, iconCy - 46);
    ctx.closePath();
    ctx.fill();
  };

  const drawTomato = () => {
    ctx.fillStyle = "#EF4444";
    ctx.beginPath();
    ctx.arc(iconCx, iconCy - 5, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(239,68,68,0.35)";
    ctx.beginPath();
    ctx.arc(iconCx - 10, iconCy - 12, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#22C55E";
    ctx.beginPath();
    ctx.moveTo(iconCx - 14, iconCy - 40);
    ctx.bezierCurveTo(iconCx - 6, iconCy - 50, iconCx + 6, iconCy - 50, iconCx + 14, iconCy - 40);
    ctx.bezierCurveTo(iconCx + 4, iconCy - 38, iconCx - 4, iconCy - 38, iconCx - 14, iconCy - 40);
    ctx.closePath();
    ctx.fill();
  };

  if (cropBaseName.includes("당근")) {
    drawCarrot();
  } else if (cropBaseName.includes("토마토")) {
    drawTomato();
  } else if (cropBaseName.includes("상추") || cropBaseName.includes("배추") || cropBaseName.includes("치커리")) {
    drawLeaf();
  } else {
    // 기본(일반 작물) 아이콘
    drawLeaf();
  }

  // 연속 기록
  fillTextWithShadow(ctx, `연속 기록 ${metrics.streakDays}일`, padX, 520, {
    font: "800 22px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
    fillStyle: "#0F3B2E",
  });

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
    metrics.completionPercent >= 75
      ? "/today-report-stamp-good.png"
      : metrics.completionPercent >= 35
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

