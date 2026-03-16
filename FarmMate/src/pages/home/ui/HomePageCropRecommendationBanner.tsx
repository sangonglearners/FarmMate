import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { useLocation } from "wouter";

/**
 * HomePage 상단에서 사용하던 "작물 추천" 배너 UI를 보관하기 위한 컴포넌트입니다.
 * 현재 화면에서는 사용하지 않지만, 향후 기능을 다시 사용할 때 쉽게 복원할 수 있도록 별도 파일로 분리했습니다.
 */
export function HomePageCropRecommendationBanner() {
  const [, setLocation] = useLocation();

  return (
    <Card className="overflow-hidden h-full flex border">
      <CardContent className="p-3 md:p-5 flex-1 flex items-center justify-center">
        <div className="w-full text-left md:text-center">
          <p className="text-xs md:text-sm text-gray-600 mb-1">이번 시즌에는</p>
          <h2 className="text-xs md:text-base font-semibold text-gray-900 leading-tight mb-3">
            무엇을, 언제, 어디에 심지?
          </h2>
          <Button
            size="sm"
            className="w-full md:w-4/7 text-xs md:text-sm"
            onClick={() => setLocation("/recommendations/input")}
          >
            작물 추천 받으러가기
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

