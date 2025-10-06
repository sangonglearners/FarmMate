import { useState } from "react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { useLocation } from "wouter";
import { ChevronLeft, ChevronDown, Check } from "lucide-react";

export default function RecommendationsInputPage() {
  const [, setLocation] = useLocation();
  const [startMonth, setStartMonth] = useState<number | null>(null);
  const [endMonth, setEndMonth] = useState<number | null>(null);
  const [selectedFarm, setSelectedFarm] = useState<string>("");
  const [irangCount, setIrangCount] = useState<string>("");
  const [startMonthOpen, setStartMonthOpen] = useState(false);
  const [endMonthOpen, setEndMonthOpen] = useState(false);

  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const handleSubmit = () => {
    // 임시로 콘솔 로그, 나중에 API 호출로 교체
    console.log({
      start_month: startMonth,
      end_month: endMonth,
      input_place: selectedFarm,
      input_irang: parseInt(irangCount)
    });
    
    // TODO: 로딩 화면 추가 및 API 호출
    // 임시로 바로 결과 페이지로 이동
    setLocation('/recommendations/result');
  };

  const isFormValid = startMonth && endMonth && selectedFarm && irangCount && parseInt(irangCount) > 0;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/")}
          className="mb-4"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          홈으로 돌아가기
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">작물 추천</h1>
        <p className="text-gray-600 text-sm mt-1">재배 조건을 입력해주세요</p>
      </div>

      <div className="space-y-4 max-w-2xl">
        {/* 재배 위치 선택 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">재배 위치</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={selectedFarm === "노지" ? "default" : "outline"}
                onClick={() => setSelectedFarm("노지")}
                className="h-20"
              >
                <div>
                  <div className="text-2xl mb-1">🌾</div>
                  <div className="text-sm">노지</div>
                </div>
              </Button>
              <Button
                variant={selectedFarm === "시설" ? "default" : "outline"}
                onClick={() => setSelectedFarm("시설")}
                className="h-20"
              >
                <div>
                  <div className="text-2xl mb-1">🏠</div>
                  <div className="text-sm">시설</div>
                </div>
              </Button>
            </div>
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
              <div>
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
                  <div className="mt-2 border border-gray-200 rounded-md max-h-60 overflow-y-auto absolute z-10 bg-white w-[calc(50%-1rem)]">
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
              <div>
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
                  <div className="mt-2 border border-gray-200 rounded-md max-h-60 overflow-y-auto absolute z-10 bg-white w-[calc(50%-1rem)]">
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

