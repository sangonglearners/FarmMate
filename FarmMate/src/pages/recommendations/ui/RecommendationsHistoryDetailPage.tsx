import { useState, useEffect } from "react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { useLocation, useRoute } from "wouter";
import { ChevronLeft } from "lucide-react";
import { supabase } from "../../../shared/api/supabase";

interface CropDetail {
  name: string;
  item: string;
  variety: string;
  profit_score: number;
  labor_score: number;
  rarity_score: number;
}

interface HistoryDetail {
  id: string;
  farm_name: string | null;
  farm_environment: string | null;
  rec_range: number | null;
  rec_period: string | null;
  crop_names: string[];
  expected_revenue: string;
  indicators: {
    수익성: number;
    노동편의성: number;
    품종희소성: number;
  };
  combination_detail: CropDetail[];
  created_at: string;
}

interface IndicatorBarProps {
  label: string;
  value: number;
  maxValue?: number;
}

function IndicatorBar({ label, value, maxValue = 3 }: IndicatorBarProps) {
  const percentage = (value / maxValue) * 100;
  
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-xs text-gray-700 w-[72px] flex-shrink-0">{label}</span>
      <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className="bg-primary h-full rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs font-medium text-gray-900 w-14 text-right flex-shrink-0">
        {value.toFixed(1)}/{maxValue.toFixed(1)}
      </span>
    </div>
  );
}

export default function RecommendationsHistoryDetailPage() {
  const [, params] = useRoute("/recommendations/history/:id");
  const [, setLocation] = useLocation();
  const [detail, setDetail] = useState<HistoryDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!params?.id) {
      setLocation('/recommendations/history');
      return;
    }

    const fetchDetail = async () => {
      try {
        const { data, error } = await supabase
          .from('rec_result')
          .select('*')
          .eq('id', params.id)
          .single();

        if (error) throw error;
        
        setDetail(data);
      } catch (error) {
        console.error('추천 결과 상세 조회 오류:', error);
        alert('추천 결과를 불러올 수 없습니다.');
        setLocation('/recommendations/history');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetail();
  }, [params]);

  const handleDelete = async () => {
    if (!confirm('이 추천 결과를 삭제하시겠습니까?')) {
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('rec_result')
        .delete()
        .eq('id', params?.id);

      if (error) throw error;

      alert('추천 결과가 삭제되었습니다.');
      setLocation('/recommendations/history');
    } catch (error) {
      console.error('삭제 오류:', error);
      alert('삭제 중 오류가 발생했습니다.');
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', { 
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEnvironmentEmoji = (environment: string | null) => {
    if (!environment) return '🌾';
    if (environment === '노지') return '🌾';
    if (environment === '시설') return '🏠';
    return '🏗️';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">결과를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!detail) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/recommendations/history")}
          className="mb-4"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          목록으로 돌아가기
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">저장된 추천 결과</h1>
        <p className="text-gray-600 text-sm mt-1">
          {formatDate(detail.created_at)}
        </p>
      </div>

      <div className="space-y-4 max-w-2xl">
        {/* 재배 조건 카드 */}
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">입력 조건</h3>
            <div className="space-y-2">
              {/* 재배 위치 */}
              <div className="flex items-center gap-2">
                <span className="text-lg">{getEnvironmentEmoji(detail.farm_environment)}</span>
                <span className="text-xs text-gray-500">재배 위치:</span>
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    {detail.farm_name || '농장 정보 없음'}
                  </span>
                  {detail.farm_environment && (
                    <span className="text-xs text-gray-500 ml-1">
                      ({detail.farm_environment})
                    </span>
                  )}
                </div>
              </div>

              {/* 재배 범위 */}
              {detail.rec_range && (
                <div className="flex items-center gap-2">
                  <span className="text-lg">📏</span>
                  <span className="text-xs text-gray-500">재배 범위:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {detail.rec_range}이랑
                  </span>
                </div>
              )}

              {/* 재배 시기 */}
              {detail.rec_period && (
                <div className="flex items-center gap-2">
                  <span className="text-lg">📅</span>
                  <span className="text-xs text-gray-500">재배 시기:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {detail.rec_period}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 선택한 작물 조합 카드 */}
        <Card className="ring-2 ring-primary shadow-lg">
          <CardContent className="p-5">
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center px-2.5 h-7 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                  저장된 조합
                </div>
              </div>
              
              {/* 예상 매출액 */}
              <div className="text-right">
                <p className="text-xs text-gray-500">예상 매출액</p>
                <p className="text-sm font-bold text-gray-900">
                  {detail.expected_revenue}원
                </p>
              </div>
            </div>
              
            {/* 작물 목록 */}
            <div className="space-y-1.5 mb-3.5">
              {detail.crop_names.map((crop, cropIndex) => (
                <div
                  key={cropIndex}
                  className="flex items-center gap-2 py-1 px-2.5 bg-green-50 rounded-lg"
                >
                  <span className="text-sm">🌱</span>
                  <span className="text-xs font-medium text-green-700">
                    {crop}
                  </span>
                </div>
              ))}
            </div>

            {/* 지표 */}
            <div className="space-y-2 pt-3 border-t border-gray-100">
              <IndicatorBar label="💰 수익성" value={detail.indicators.수익성} />
              <IndicatorBar label="⚙️ 편의성" value={detail.indicators.노동편의성} />
              <IndicatorBar label="✨ 희소성" value={detail.indicators.품종희소성} />
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col space-y-3 pt-4">
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
            className="w-full h-12"
          >
            {isDeleting ? '삭제 중...' : '이 기록 삭제하기'}
          </Button>
          <Button
            variant="outline"
            onClick={() => setLocation("/recommendations/input")}
            className="w-full h-12"
          >
            새 추천 받기
          </Button>
        </div>
      </div>
    </div>
  );
}

