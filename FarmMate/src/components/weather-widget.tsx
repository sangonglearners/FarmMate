import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Cloud, MapPin } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import {
  getWeatherDataByCoordinates,
  getCurrentLocation,
  getWeatherIcon,
  type WeatherData,
} from "@/shared/api/weather";

interface WeatherWidgetProps {
  className?: string;
}

export function WeatherWidget({ className }: WeatherWidgetProps = {}) {
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number; name: string } | null>(null);

  // 사용자 위치 가져오기 (GPS 기반)
  useEffect(() => {
    getCurrentLocation()
      .then((location) => {
        if (location) {
          setUserLocation(location);
        } else {
          // 위치를 가져올 수 없으면 기본값(서울) 사용
          setUserLocation({ lat: 37.5665, lon: 126.9780, name: '서울' });
        }
      })
      .catch(() => {
        // 위치를 가져올 수 없으면 기본값(서울) 사용
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
      <Card className={`${className || ''} h-full`}>
        <CardContent className="p-4 h-full flex items-center">
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
      <Card className={`${className || ''} h-full border-orange-200 bg-orange-50`}>
        <CardContent className="p-4 h-full flex items-center">
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
  const humidity = parseInt(weather.humidity) || 0;

  return (
    <Card className={`${className || ''} h-full border bg-white`}>
      <CardContent className="p-3 md:p-5 h-full flex flex-col justify-center gap-1 md:gap-2">
        {/* 위치 정보 */}
        <div className="flex items-center gap-1 text-xs md:text-sm text-gray-600">
          <MapPin className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
          <span className="font-medium truncate">{weather.location}</span>
        </div>

        {/* 모바일: 세로 / 데스크톱: 가로로 펼쳐서 공간 활용 */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between md:flex-1">
          {/* 아이콘 + 온도 */}
          <div className="flex items-center gap-2 md:gap-4">
            <span className="text-3xl md:text-6xl leading-none flex-shrink-0">{weatherIcon}</span>
            <span className="text-2xl md:text-5xl font-bold text-gray-900 leading-none">{currentTemp}°</span>
          </div>

          {/* 습도 + 최고/최저 - 데스크톱에서 오른쪽 정렬 */}
          <div className="flex flex-col md:items-end gap-0.5 md:gap-1.5 mt-1 md:mt-0">
            <div className="text-xs md:text-sm text-gray-600">습도 {humidity}%</div>
            <div className="flex gap-2 md:gap-3 text-xs md:text-sm flex-wrap">
              {maxTemp !== null && (
                <span className="text-red-500 font-medium">최고 {maxTemp}°</span>
              )}
              {minTemp !== null && (
                <span className="text-blue-500 font-medium">최저 {minTemp}°</span>
              )}
              {maxTemp === null && minTemp === null && (
                <span className="text-gray-400">온도 정보 없음</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

