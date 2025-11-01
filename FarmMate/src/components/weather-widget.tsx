import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Cloud, Wind, MapPin } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import {
  getWeatherDataByCoordinates,
  getCurrentLocation,
  getWeatherIcon,
  type WeatherData,
} from "@/shared/api/weather";

export function WeatherWidget() {
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number; name: string } | null>(null);
  const [locationError, setLocationError] = useState(false);

  // 사용자 위치 가져오기
  useEffect(() => {
    getCurrentLocation()
      .then((location) => {
        if (location) {
          setUserLocation(location);
        } else {
          setLocationError(true);
          // 위치를 가져올 수 없으면 기본값(서울) 사용
          setUserLocation({ lat: 37.5665, lon: 126.9780, name: '서울' });
        }
      })
      .catch(() => {
        setLocationError(true);
        setUserLocation({ lat: 37.5665, lon: 126.9780, name: '서울' });
      });
  }, []);

  const { data: weather, isLoading, error } = useQuery<WeatherData | null>({
    queryKey: ["weather", userLocation?.lat, userLocation?.lon],
    queryFn: () => {
      if (!userLocation) {
        return Promise.resolve(null);
      }
      return getWeatherDataByCoordinates(userLocation.lat, userLocation.lon, userLocation.name);
    },
    enabled: !!userLocation,
    staleTime: 10 * 60 * 1000, // 10분간 캐시
    refetchInterval: 30 * 60 * 1000, // 30분마다 자동 갱신
  });

  if (isLoading) {
    return (
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse" />
              <div className="space-y-2">
                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
            <div className="text-right">
              <div className="h-6 w-16 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !weather) {
    return (
      <Card className="mb-4 border-orange-200 bg-orange-50">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 text-orange-700">
            <Cloud className="w-5 h-5" />
            <span className="text-sm">날씨 정보를 불러올 수 없습니다</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const weatherIcon = getWeatherIcon(weather.skyCondition, weather.precipitationType);
  const currentTemp = parseInt(weather.temperature) || 0;
  const maxTemp = weather.maxTemperature ? parseInt(weather.maxTemperature) : null;
  const minTemp = weather.minTemperature ? parseInt(weather.minTemperature) : null;
  const windSpeed = parseFloat(weather.windSpeed) || 0;
  const humidity = parseInt(weather.humidity) || 0;
  const precipitation = parseFloat(weather.precipitation) || 0;

  return (
    <Card className="mb-4 border-gray-200 bg-white">
      <CardContent className="p-4">
        {/* 위치 정보 */}
        <div className="flex items-center space-x-1 mb-3 text-xs text-gray-600">
          <MapPin className="w-3.5 h-3.5" />
          <span className="font-medium">{weather.location}</span>
          {locationError && (
            <span className="text-gray-400 ml-2">(위치 권한 없음, 기본값 사용)</span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          {/* 왼쪽: 날씨 아이콘과 온도 정보 */}
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            {/* 날씨 아이콘 */}
            <div className="text-4xl flex-shrink-0">{weatherIcon}</div>
            
            {/* 온도 정보 */}
            <div className="flex flex-col min-w-0">
              {/* 현재 온도 */}
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {currentTemp}°
              </div>
              
              {/* 최고/최저 온도 */}
              <div className="flex items-center space-x-1.5 text-xs whitespace-nowrap">
                {maxTemp !== null && (
                  <span className="text-red-500 font-medium">최고 {maxTemp}°</span>
                )}
                {minTemp !== null && (
                  <span className="text-blue-500 font-medium">최저 {minTemp}°</span>
                )}
                {(maxTemp === null || minTemp === null) && (
                  <span className="text-gray-500">온도 정보 없음</span>
                )}
              </div>
            </div>
          </div>

          {/* 오른쪽: 습도, 바람, 강수량 */}
          <div className="flex items-center space-x-2 border-l border-gray-200 pl-2 flex-shrink-0">
            {/* 습도 */}
            <div className="flex flex-col items-center min-w-0">
              <span className="text-xs text-gray-600 mb-1 whitespace-nowrap">습도</span>
              <span className="text-xs font-semibold text-gray-900 whitespace-nowrap">{humidity}%</span>
            </div>

            {/* 구분선 */}
            <div className="w-px h-8 bg-gray-200 flex-shrink-0" />

            {/* 바람 */}
            <div className="flex flex-col items-center min-w-0">
              <div className="flex items-center space-x-1 mb-1">
                <Wind className="w-3 h-3 text-gray-600 flex-shrink-0" />
                <span className="text-xs text-gray-600 whitespace-nowrap">바람</span>
              </div>
              <span className="text-xs font-semibold text-gray-900 whitespace-nowrap">{windSpeed.toFixed(1)}m/s</span>
            </div>

            {/* 구분선 */}
            <div className="w-px h-8 bg-gray-200 flex-shrink-0" />

            {/* 강수량 */}
            <div className="flex flex-col items-center min-w-0">
              <span className="text-xs text-gray-600 mb-1 whitespace-nowrap">강수량</span>
              <span className="text-xs font-semibold text-gray-900 whitespace-nowrap">
                {precipitation > 0 ? `${precipitation.toFixed(1)}mm` : '0mm'}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

