import { useEffect } from 'react';

export default function RecommendationsLoadingPage() {
  useEffect(() => {
    // 애니메이션을 위한 effect (필요시 사용)
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full text-center">
        {/* 로딩 애니메이션 */}
        <div className="mb-8">
          <div className="relative inline-flex">
            {/* 회전하는 원 */}
            <div className="w-24 h-24 rounded-full border-4 border-gray-200 border-t-primary animate-spin"></div>
            {/* 중앙 아이콘 */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl">🌱</span>
            </div>
          </div>
        </div>

        {/* 로딩 메시지 */}
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          작물 조합을 만들고 있습니다
        </h2>
        <p className="text-gray-600 text-sm">
          최적의 작물 조합을 찾고 있어요. 잠시만 기다려주세요...
        </p>

        {/* 진행 단계 표시 (선택사항) */}
        <div className="mt-8 space-y-2">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <span className="inline-block w-2 h-2 bg-primary rounded-full animate-pulse"></span>
            <span>재배 조건 분석 중</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
            <span className="inline-block w-2 h-2 bg-gray-300 rounded-full"></span>
            <span>작물 데이터 조회 중</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
            <span className="inline-block w-2 h-2 bg-gray-300 rounded-full"></span>
            <span>최적 조합 계산 중</span>
          </div>
        </div>
      </div>
    </div>
  );
}


