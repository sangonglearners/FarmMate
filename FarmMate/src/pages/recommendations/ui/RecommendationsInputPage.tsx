import { useState, useEffect } from "react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { useLocation } from "wouter";
import { ChevronLeft, ChevronDown, Check } from "lucide-react";
import { getRecommendations } from "../../../shared/api/recommendation";
import { supabase } from "../../../shared/api/supabase";

interface Farm {
  id: string;
  name: string;
  environment: string;
}

export default function RecommendationsInputPage() {
  const [, setLocation] = useLocation();
  const [startMonth, setStartMonth] = useState<number | null>(null);
  const [endMonth, setEndMonth] = useState<number | null>(null);
  const [selectedFarm, setSelectedFarm] = useState<string>("");
  const [selectedFarmId, setSelectedFarmId] = useState<string>("");
  const [irangCount, setIrangCount] = useState<string>("");
  const [startMonthOpen, setStartMonthOpen] = useState(false);
  const [endMonthOpen, setEndMonthOpen] = useState(false);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [isLoadingFarms, setIsLoadingFarms] = useState(true);

  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  // 농장 정보 불러오기
  useEffect(() => {
    const fetchFarms = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoadingFarms(false);
          return;
        }

        const { data, error } = await supabase
          .from('farms')
          .select('id, name, environment')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        setFarms(data || []);
      } catch (error) {
        console.error('농장 정보 조회 오류:', error);
        setFarms([]);
      } finally {
        setIsLoadingFarms(false);
      }
    };

    fetchFarms();
  }, []);

  // 환경에 맞는 이모지 반환
  const getEnvironmentEmoji = (environment: string) => {
    if (environment === '노지') return '🌾';
    if (environment === '시설') return '🏠';
    return '🏗️'; // 기타 (보온시설, 해가림시설 등)
  };

  const handleSubmit = async () => {
    if (!startMonth || !endMonth || !selectedFarm || !irangCount) {
      return;
    }

    // 로딩 페이지로 이동
    setLocation('/recommendations/loading');

    try {
      // API 호출
      const response = await getRecommendations({
        start_month: startMonth,
        end_month: endMonth,
        input_place: selectedFarm,
        input_irang: parseInt(irangCount)
      });

      // 선택한 농장 정보 찾기
      const selectedFarmInfo = farms.find(f => f.id === selectedFarmId);

      // 결과와 농장 정보를 로컬 스토리지에 임시 저장
      const dataToStore = {
        result: response.result,
        farmInfo: selectedFarmInfo ? {
          farm_id: selectedFarmInfo.id,
          farm_name: selectedFarmInfo.name,
          farm_environment: selectedFarmInfo.environment
        } : {
          farm_id: null,
          farm_name: null,
          farm_environment: selectedFarm // 노지/시설
        },
        inputConditions: {
          rec_range: parseInt(irangCount),
          rec_period: `${startMonth}월 ~ ${endMonth}월`
        }
      };
      localStorage.setItem('recommendation_result', JSON.stringify(dataToStore));

      // 결과 페이지로 이동
      setLocation('/recommendations/result');
    } catch (error) {
      console.error('추천 API 호출 실패:', error);
      alert('작물 추천 중 오류가 발생했습니다. 다시 시도해주세요.');
      setLocation('/recommendations/input');
    }
  };

  const isFormValid = startMonth && endMonth && selectedFarm && irangCount && parseInt(irangCount) > 0;

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-72">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/")}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            홈으로 돌아가기
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/recommendations/history")}
          >
            추천 기록 보기
          </Button>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 text-center">작물 추천</h1>
        <p className="text-gray-600 text-sm mt-1 text-center">재배 조건을 입력해주세요</p>
      </div>

      <div className="space-y-4 max-w-2xl">
        {/* 재배 위치 선택 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">재배 위치</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingFarms ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-primary rounded-full animate-spin"></div>
              </div>
            ) : farms.length > 0 ? (
              // 농장 정보가 있는 경우
              <div className="grid grid-cols-2 gap-3">
                {farms.map((farm) => (
                  <Button
                    key={farm.id}
                    variant={selectedFarmId === farm.id ? "default" : "outline"}
                    onClick={() => {
                      setSelectedFarmId(farm.id);
                      setSelectedFarm(farm.environment);
                    }}
                    className="h-20"
                  >
                    <div>
                      <div className="text-2xl mb-1">{getEnvironmentEmoji(farm.environment)}</div>
                      <div className="text-sm">{farm.name}</div>
                      <div className="text-xs text-gray-500">({farm.environment})</div>
                    </div>
                  </Button>
                ))}
              </div>
            ) : (
              // 농장 정보가 없는 경우 - 기본 노지/시설 선택
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={selectedFarm === "노지" ? "default" : "outline"}
                  onClick={() => {
                    setSelectedFarm("노지");
                    setSelectedFarmId("");
                  }}
                  className="h-20"
                >
                  <div>
                    <div className="text-2xl mb-1">🌾</div>
                    <div className="text-sm">노지</div>
                  </div>
                </Button>
                <Button
                  variant={selectedFarm === "시설" ? "default" : "outline"}
                  onClick={() => {
                    setSelectedFarm("시설");
                    setSelectedFarmId("");
                  }}
                  className="h-20"
                >
                  <div>
                    <div className="text-2xl mb-1">🏠</div>
                    <div className="text-sm">시설</div>
                  </div>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 재배 범위 입력 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">재배 범위</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="1"
                value={irangCount}
                onChange={(e) => setIrangCount(e.target.value)}
                placeholder="숫자 입력"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <span className="text-gray-600">이랑</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              💡 3개 품종 기준 9-30개 권장 (품종당 3-10개씩)
            </p>
          </CardContent>
        </Card>

        {/* 재배 시기 선택 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">재배 시기</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {/* 시작 시기 */}
              <div className="relative">
                <label className="text-sm text-gray-600 mb-2 block">시작 월</label>
                <button
                  onClick={() => setStartMonthOpen(!startMonthOpen)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <span className={startMonth ? "text-gray-900" : "text-gray-500"}>
                    {startMonth ? `${startMonth}월` : "선택"}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 transition-transform ${
                      startMonthOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {startMonthOpen && (
                  <div className="absolute mt-2 left-0 right-0 border border-gray-200 rounded-md max-h-60 overflow-y-auto z-20 bg-white shadow-lg">
                    {months.map((month) => (
                      <button
                        key={`start-${month}`}
                        onClick={() => {
                          setStartMonth(month);
                          setStartMonthOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                          startMonth === month ? "bg-primary/5" : ""
                        }`}
                      >
                        <span className="text-sm">{month}월</span>
                        {startMonth === month && (
                          <Check className="w-4 h-4 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 종료 시기 */}
              <div className="relative">
                <label className="text-sm text-gray-600 mb-2 block">종료 월</label>
                <button
                  onClick={() => setEndMonthOpen(!endMonthOpen)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <span className={endMonth ? "text-gray-900" : "text-gray-500"}>
                    {endMonth ? `${endMonth}월` : "선택"}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 transition-transform ${
                      endMonthOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {endMonthOpen && (
                  <div className="absolute mt-2 left-0 right-0 border border-gray-200 rounded-md max-h-60 overflow-y-auto z-20 bg-white shadow-lg">
                    {months.map((month) => (
                      <button
                        key={`end-${month}`}
                        onClick={() => {
                          setEndMonth(month);
                          setEndMonthOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                          endMonth === month ? "bg-primary/5" : ""
                        }`}
                      >
                        <span className="text-sm">{month}월</span>
                        {endMonth === month && (
                          <Check className="w-4 h-4 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 제출 버튼 */}
        <Button
          onClick={handleSubmit}
          disabled={!isFormValid}
          className="w-full h-12 text-lg"
          size="lg"
        >
          작물 추천 받기
        </Button>
      </div>
    </div>
  );
}

