/**
 * 빈 화면·플레이스홀더용: 도넛에 마우스를 올렸을 때 뜨는 안내 창을 예시로 보여 줍니다.
 */
export type PieHoverPreviewVariant = "revenue" | "cropMix";

const DONUT_REVENUE =
  "conic-gradient(#4CAF50 0deg 140deg, #2196F3 140deg 260deg, #FF9800 260deg 330deg, #e5e7eb 330deg 360deg)";
const DONUT_CROP =
  "conic-gradient(#166534 0deg 140deg, #0d9488 140deg 260deg, #ca8a04 260deg 330deg, #e5e7eb 330deg 360deg)";

const mask = {
  mask: "radial-gradient(farthest-side, transparent 56%, #000 57%)",
  WebkitMask: "radial-gradient(farthest-side, transparent 56%, #000 57%)",
} as const;

interface PieHoverPreviewProps {
  variant: PieHoverPreviewVariant;
  className?: string;
}

export function PieHoverPreview({ variant, className = "" }: PieHoverPreviewProps) {
  const donutBg = variant === "revenue" ? DONUT_REVENUE : DONUT_CROP;

  return (
    <div className={`flex flex-col items-center gap-1.5 ${className}`}>
      <div className="relative h-36 w-[10.5rem] shrink-0">
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white border border-gray-200 rounded-lg shadow-lg p-2.5 w-[118px] sm:w-[128px] pointer-events-none"
          aria-hidden
        >
          {variant === "revenue" ? (
            <>
              <p className="text-xs font-medium text-gray-900">토마토</p>
              <p className="text-xs text-gray-600">₩320,000</p>
              <p className="text-xs text-gray-600">전체의 40%</p>
            </>
          ) : (
            <>
              <p className="text-xs font-medium text-gray-900">결구배추</p>
              <p className="text-xs text-gray-600">이랑 15개</p>
              <p className="text-xs text-gray-600">전체의 35%</p>
            </>
          )}
        </div>
        <div
          className="absolute right-0 top-1/2 -translate-y-1/2 h-36 w-36 rounded-full shadow-sm"
          style={{
            background: donutBg,
            ...mask,
          }}
          aria-hidden
        />
      </div>
      <span className="text-[10px] text-gray-500 text-center leading-tight px-1">
        원 조각에 마우스를 올리면 안내 창이 떠요
      </span>
    </div>
  );
}
