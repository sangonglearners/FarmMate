import { useState, useEffect } from "react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { useLocation } from "wouter";
import { saveRecommendationResult, RecommendationResult } from "../../../shared/api/recommendation";

// Mock 데이터 (API 응답 형식)
const mockResult = {
  ok: true,
  result: {
    recommended_combinations: [
      [
        {
          name: "롱빈 (샤사케)",
          item: "롱빈",
          variety: "샤사케",
          score: 0.583,
          profit_score: 0.891,
          labor_score: 0.0,
          rarity_score: 1.0,
          수익성_사용: 69800,
          노동편의성: 2,
          품종희소성: 5
        },
        {
          name: "그린빈 (캐피타노)",
          item: "그린빈",
          variety: "캐피타노",
          score: 0.542,
          profit_score: 0.891,
          labor_score: 0.333,
          rarity_score: 0.667,
          수익성_사용: 69800,
          노동편의성: 3,
          품종희소성: 4
        },
        {
          name: "풋콩 (차마메)",
          item: "풋콩",
          variety: "차마메",
          score: 0.625,
          profit_score: 0.954,
          labor_score: 0.333,
          rarity_score: 0.667,
          수익성_사용: 596500,
          노동편의성: 3,
          품종희소성: 4
        }
      ],
      [
        {
          name: "롱빈 (퍼스트레이디)",
          item: "롱빈",
          variety: "퍼스트레이디",
          score: 0.528,
          profit_score: 0.891,
          labor_score: 0.0,
          rarity_score: 0.667,
          수익성_사용: 69800,
          노동편의성: 2,
          품종희소성: 4
        },
        {
          name: "그린빈 (칼리마)",
          item: "그린빈",
          variety: "칼리마",
          score: 0.487,
          profit_score: 0.891,
          labor_score: 0.333,
          rarity_score: 0.333,
          수익성_사용: 69800,
          노동편의성: 3,
          품종희소성: 3
        },
        {
          name: "풋콩 (차마메)",
          item: "풋콩",
          variety: "차마메",
          score: 0.625,
          profit_score: 0.954,
          labor_score: 0.333,
          rarity_score: 0.667,
          수익성_사용: 596500,
          노동편의성: 3,
          품종희소성: 4
        }
      ],
      [
        {
          name: "쉘빈 (드래곤빈)",
          item: "쉘빈",
          variety: "드래곤빈",
          score: 0.542,
          profit_score: 0.891,
          labor_score: 0.333,
          rarity_score: 0.667,
          수익성_사용: 69800,
          노동편의성: 3,
          품종희소성: 4
        },
        {
          name: "드라이빈 (비프빈)",
          item: "드라이빈",
          variety: "비프빈",
          score: 0.542,
          profit_score: 0.891,
          labor_score: 0.333,
          rarity_score: 0.667,
          수익성_사용: 69800,
          노동편의성: 3,
          품종희소성: 4
        },
        {
          name: "풋콩 (차마메)",
          item: "풋콩",
          variety: "차마메",
          score: 0.625,
          profit_score: 0.954,
          labor_score: 0.333,
          rarity_score: 0.667,
          수익성_사용: 596500,
          노동편의성: 3,
          품종희소성: 4
        }
      ]
    ],
    cards: [
      {
        title: "Gift box 1",
        crops: ["롱빈 (샤사케)", "그린빈 (캐피타노)", "풋콩 (차마메)"],
        indicators: {
          수익성: 2.7,
          노동편의성: 0.7,
          품종희소성: 2.3
        },
        expected_revenue: "1,398,000"
      },
      {
        title: "Gift box 2",
        crops: ["롱빈 (퍼스트레이디)", "그린빈 (칼리마)", "풋콩 (차마메)"],
        indicators: {
          수익성: 2.7,
          노동편의성: 0.7,
          품종희소성: 1.7
        },
        expected_revenue: "1,398,000"
      },
      {
        title: "Gift box 3",
        crops: ["쉘빈 (드래곤빈)", "드라이빈 (비프빈)", "풋콩 (차마메)"],
        indicators: {
          수익성: 2.7,
          노동편의성: 1.0,
          품종희소성: 2.0
        },
        expected_revenue: "1,398,000"
      }
    ],
    total_profit: 1398000
  }
};

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

export default function RecommendationsResultPage() {
  const [, setLocation] = useLocation();
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [farmInfo, setFarmInfo] = useState<{
    farm_id: string | null;
    farm_name: string | null;
    farm_environment: string | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 로컬 스토리지에서 결과 가져오기
    const storedData = localStorage.getItem('recommendation_result');
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData);
        // 새로운 형식 (result + farmInfo)
        if (parsedData.result && parsedData.farmInfo) {
          setResult(parsedData.result);
          setFarmInfo(parsedData.farmInfo);
        } else {
          // 이전 형식 (result만 있음)
          setResult(parsedData);
          setFarmInfo(null);
        }
      } catch (error) {
        console.error('결과 파싱 오류:', error);
        // Mock 데이터 사용
        setResult(mockResult.result);
        setFarmInfo(null);
      }
    } else {
      // Mock 데이터 사용
      setResult(mockResult.result);
      setFarmInfo(null);
    }
    setIsLoading(false);
  }, []);

  const handleSaveToPlan = async () => {
    if (selectedCard === null) {
      alert("작물 조합을 선택해주세요!");
      return;
    }
    
    if (!result) {
      alert("추천 결과를 찾을 수 없습니다.");
      return;
    }

    try {
      const card = result.cards[selectedCard];
      const combination = result.recommended_combinations[selectedCard];
      
      await saveRecommendationResult({
        farm_id: farmInfo?.farm_id || undefined,
        farm_name: farmInfo?.farm_name || undefined,
        farm_environment: farmInfo?.farm_environment || undefined,
        crop_names: card.crops,
        expected_revenue: card.expected_revenue,
        indicators: card.indicators,
        combination_detail: combination,
      });

      alert("추천 결과가 저장되었습니다!");
      // 로컬 스토리지 정리
      localStorage.removeItem('recommendation_result');
      setLocation("/");
    } catch (error) {
      console.error('저장 오류:', error);
      alert("저장 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
  };

  if (isLoading || !result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">결과를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  const { cards } = result;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">추천 결과</h1>
        <p className="text-gray-600 text-sm mt-1">원하는 작물 조합을 선택해주세요</p>
      </div>

      <div className="space-y-4 max-w-2xl">
        {/* Gift Box Cards */}
        {cards.map((card, index) => (
          <Card
            key={index}
            className={`cursor-pointer transition-all ${
              selectedCard === index
                ? "ring-2 ring-primary shadow-lg"
                : "hover:shadow-md"
            }`}
            onClick={() => setSelectedCard(index)}
          >
            <CardContent className="p-5">
              {/* 헤더: 조합 번호 + 라디오 버튼 */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="gift-box"
                    checked={selectedCard === index}
                    onChange={() => setSelectedCard(index)}
                    className="w-4 h-4 text-primary focus:ring-primary"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex items-center justify-center px-2.5 h-7 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                    Plan {['A', 'B', 'C'][index]}
                  </div>
                </div>
                
                {/* 예상 매출액 */}
                <div className="text-right">
                  <p className="text-xs text-gray-500">예상 매출액</p>
                  <p className="text-sm font-bold text-gray-900">
                    {card.expected_revenue}원
                  </p>
                </div>
              </div>
                
              {/* 작물 목록 */}
              <div className="space-y-1.5 mb-3.5">
                {card.crops.map((crop, cropIndex) => (
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
                <IndicatorBar label="💰 수익성" value={card.indicators.수익성} />
                <IndicatorBar label="⚙️ 편의성" value={card.indicators.노동편의성} />
                <IndicatorBar label="✨ 희소성" value={card.indicators.품종희소성} />
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Action Buttons */}
        <div className="flex flex-col space-y-3 pt-4">
          <Button
            onClick={handleSaveToPlan}
            disabled={selectedCard === null}
            className="w-full h-12 text-lg"
            size="lg"
          >
            추천 결과 저장하기
          </Button>
          <Button
            variant="outline"
            onClick={() => setLocation("/recommendations/input")}
            className="w-full h-12 text-lg"
            size="lg"
          >
            다시 추천받기
          </Button>
        </div>
      </div>
    </div>
  );
}

