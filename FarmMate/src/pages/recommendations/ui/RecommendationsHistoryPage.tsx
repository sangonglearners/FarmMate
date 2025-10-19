import { useState, useEffect } from "react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { useLocation } from "wouter";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "../../../shared/api/supabase";

interface RecommendationHistory {
  id: string;
  farm_name: string | null;
  farm_environment: string | null;
  rec_range: number | null;
  rec_period: string | null;
  expected_revenue: string;
  created_at: string;
}

export default function RecommendationsHistoryPage() {
  const [, setLocation] = useLocation();
  const [history, setHistory] = useState<RecommendationHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 페이지 로드 시 스크롤을 맨 위로
    window.scrollTo(0, 0);
    
    const fetchHistory = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('rec_result')
          .select('id, farm_name, farm_environment, rec_range, rec_period, expected_revenue, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        setHistory(data || []);
      } catch (error) {
        console.error('추천 기록 조회 오류:', error);
        setHistory([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `오늘 ${date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return `어제 ${date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays < 7) {
      return `${diffDays}일 전`;
    } else {
      return date.toLocaleDateString('ko-KR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  };

  const getEnvironmentEmoji = (environment: string | null) => {
    if (!environment) return '🌾';
    if (environment === '노지') return '🌾';
    if (environment === '시설') return '🏠';
    return '🏗️';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="mb-6 max-w-2xl mx-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/")}
          className="mb-4"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          홈으로 돌아가기
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">추천 기록</h1>
        <p className="text-gray-600 text-sm mt-1">저장한 작물 추천 결과를 확인하세요</p>
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
          <span className="text-amber-600 text-sm">⏰</span>
          <p className="text-amber-700 text-xs">
            저장된 추천 기록은 7일 후 자동으로 삭제됩니다.
          </p>
        </div>
      </div>

      <div className="space-y-3 max-w-2xl mx-auto">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-gray-200 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">기록을 불러오는 중...</p>
            </div>
          </div>
        ) : history.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                저장된 추천 기록이 없습니다
              </h3>
              <p className="text-gray-600 text-sm mb-6 max-w-[280px] mx-auto">
                작물 추천을 받고<br />
                마음에 드는 조합을 저장해보세요
              </p>
              <Button onClick={() => setLocation('/recommendations/input')}>
                작물 추천 받기
              </Button>
            </CardContent>
          </Card>
        ) : (
          history.map((item) => (
            <Card
              key={item.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setLocation(`/recommendations/history/${item.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* 날짜 */}
                    <p className="text-xs text-gray-500 mb-2">
                      {formatDate(item.created_at)}
                    </p>
                    
                    {/* 입력 조건 요약 */}
                    <div className="space-y-2">
                      {/* 재배 위치 */}
                      <div className="flex items-center gap-2">
                        <span className="text-base">{getEnvironmentEmoji(item.farm_environment)}</span>
                        <span className="text-xs text-gray-500">재배 위치:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {item.farm_name || '농장 정보 없음'}
                          {item.farm_environment && (
                            <span className="text-xs text-gray-500 ml-1">
                              ({item.farm_environment})
                            </span>
                          )}
                        </span>
                      </div>

                      {/* 재배 범위 */}
                      {item.rec_range && (
                        <div className="flex items-center gap-2">
                          <span className="text-base">📏</span>
                          <span className="text-xs text-gray-500">재배 범위:</span>
                          <span className="text-sm font-medium text-gray-900">
                            {item.rec_range}이랑
                          </span>
                        </div>
                      )}

                      {/* 재배 시기 */}
                      {item.rec_period && (
                        <div className="flex items-center gap-2">
                          <span className="text-base">📅</span>
                          <span className="text-xs text-gray-500">재배 시기:</span>
                          <span className="text-sm font-medium text-gray-900">
                            {item.rec_period}
                          </span>
                        </div>
                      )}

                      {/* 예상 매출액 */}
                      <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                        <span className="text-base">💰</span>
                        <span className="text-xs text-gray-500">예상 매출:</span>
                        <span className="text-sm font-bold text-gray-900">
                          {item.expected_revenue}원
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 화살표 아이콘 */}
                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 mt-8" />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* 새 추천 받기 버튼 */}
      {history.length > 0 && (
        <div className="mt-6 max-w-2xl mx-auto">
          <Button
            variant="outline"
            onClick={() => setLocation('/recommendations/input')}
            className="w-full h-12"
          >
            새 작물 추천 받기
          </Button>
        </div>
      )}
    </div>
  );
}

