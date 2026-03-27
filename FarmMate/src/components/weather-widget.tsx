import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Cloud, MapPin } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import {
  getWeatherDataByCoordinates,
  getWeatherCacheByCoords,
  getAnyWeatherCache,
  convertLatLonToGrid,
  getCurrentLocation,
  getWeatherIcon,
  type WeatherData,
} from "@/shared/api/weather";

interface WeatherWidgetProps {
  className?: string;
  compact?: boolean;
}

export function WeatherWidget({ className, compact = false }: WeatherWidgetProps = {}) {
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number; name: string } | null>(null);
  const [isLocationLoading, setIsLocationLoading] = useState(true);

  // 마운트 직후 좌표 없이도 즉시 읽을 수 있는 캐시 (GPS 대기 불필요)
  const preloadedCache = useMemo(() => getAnyWeatherCache(), []);

  // 사용자 위치 가져오기 (GPS 기반)
  useEffect(() => {
    getCurrentLocation()
      .then((location) => {
        setUserLocation(location ?? { lat: 37.5665, lon: 126.9780, name: '서울' });
      })
      .catch(() => {
        setUserLocation({ lat: 37.5665, lon: 126.9780, name: '서울' });
      })
      .finally(() => setIsLocationLoading(false));
  }, []);

  // 위치 확정 후 좌표로 검증된 캐시 (위치가 바뀌었을 때 무효화용)
  const coordinateValidatedCache = useMemo<WeatherData | undefined>(() => {
    if (!userLocation) return undefined;
    const grid = convertLatLonToGrid(userLocation.lat, userLocation.lon);
    return getWeatherCacheByCoords(grid.nx, grid.ny) ?? undefined;
  }, [userLocation]);

  const { data: weather, isLoading, isError } = useQuery<WeatherData | null>({
    queryKey: ["weather", userLocation?.lat, userLocation?.lon],
    queryFn: () => {
      if (!userLocation) return Promise.resolve(null);
      return getWeatherDataByCoordinates(userLocation.lat, userLocation.lon, userLocation.name);
    },
    enabled: !!userLocation,
    staleTime: 30 * 60 * 1000,
    refetchInterval: 30 * 60 * 1000,
    initialData: coordinateValidatedCache,
  });

  // TanStack Query 데이터 → 좌표 검증 캐시 → 즉시 읽은 캐시 순으로 표시
  const displayWeather = weather ?? preloadedCache;

  // 표시할 데이터가 없을 때만 스켈레톤
  const showSkeleton = (isLocationLoading || isLoading) && !displayWeather;
  // 로딩이 완전히 끝난 후 실제 에러가 발생했을 때만 에러 메시지
  const showError = !isLocationLoading && !isLoading && isError && !displayWeather;

  if (showSkeleton) {
    if (compact) {
      return (
        <Card className={`${className || ''}`}>
          <CardContent className="h-full px-3 py-2 flex items-center">
            <p className="text-sm text-gray-500 truncate">날씨 정보를 불러오는 중...</p>
          </CardContent>
        </Card>
      );
    }
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

  if (showError) {
    if (compact) {
      return (
        <Card className={`${className || ''}`}>
          <CardContent className="h-full px-3 py-2 flex items-center">
            <p className="text-sm text-orange-700 truncate">날씨 정보를 불러올 수 없습니다</p>
          </CardContent>
        </Card>
      );
    }
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

  if (!displayWeather) return null;

  const weatherIcon = getWeatherIcon(displayWeather.skyCondition, displayWeather.precipitationType);
  const currentTemp = parseInt(displayWeather.temperature) || 0;
  const maxTemp = displayWeather.maxTemperature ? parseInt(displayWeather.maxTemperature) : null;
  const minTemp = displayWeather.minTemperature ? parseInt(displayWeather.minTemperature) : null;
  const humidity = parseInt(displayWeather.humidity) || 0;

  if (compact) {
    return (
      <Card className={`${className || ''}`}>
        <CardContent className="h-full px-3 py-2 flex items-center">
          <p className="text-sm text-gray-800 truncate">
            <span className="font-medium">{displayWeather.location}</span>
            <span className="mx-1">{weatherIcon}</span>
            <span className="font-semibold">{currentTemp}°</span>
            <span className="mx-1 text-gray-400">|</span>
            <span>습도 {humidity}%</span>
            {maxTemp !== null && (
              <>
                <span className="mx-1 text-gray-400">|</span>
                <span className="text-red-500 font-medium">최고 {maxTemp}°</span>
              </>
            )}
            {minTemp !== null && (
              <>
                <span className="mx-1 text-gray-400">|</span>
                <span className="text-blue-500 font-medium">최저 {minTemp}°</span>
              </>
            )}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className || ''} h-full border bg-white`}>
      <CardContent className="p-3 md:p-5 h-full flex flex-col justify-center">

        {/* ── 모바일 레이아웃 ── */}
        <div className="flex flex-col gap-1 md:hidden">
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="font-medium truncate">{displayWeather.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-3xl leading-none">{weatherIcon}</span>
            <span className="text-2xl font-bold text-gray-900 leading-none">{currentTemp}°</span>
          </div>
          <div className="text-xs text-gray-600">습도 {humidity}%</div>
          <div className="flex flex-col text-xs leading-tight">
            {maxTemp !== null && <span className="text-red-500 font-medium">최고 {maxTemp}°</span>}
            {minTemp !== null && <span className="text-blue-500 font-medium">최저 {minTemp}°</span>}
            {maxTemp === null && minTemp === null && <span className="text-gray-400">온도 정보 없음</span>}
          </div>
        </div>

        {/* ── 데스크톱 레이아웃 ── */}
        <div className="hidden md:flex md:items-center md:justify-between md:h-full">
          {/* 왼쪽: 아이콘 + 큰 온도 */}
          <div className="flex items-center gap-4">
            <span className="text-6xl leading-none">{weatherIcon}</span>
            <div>
              <div className="text-5xl font-bold text-gray-900 leading-none">{currentTemp}°</div>
              <div className="text-sm text-gray-400 mt-1">현재 온도</div>
            </div>
          </div>
          {/* 오른쪽: 위치·습도·최고최저 */}
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-1 text-base text-gray-600">
              <MapPin className="w-4 h-4" />
              <span className="font-semibold">{displayWeather.location}</span>
            </div>
            <div className="text-sm text-gray-600">습도 {humidity}%</div>
            <div className="flex gap-3 text-sm">
              {maxTemp !== null && <span className="text-red-500 font-medium">최고 {maxTemp}°</span>}
              {minTemp !== null && <span className="text-blue-500 font-medium">최저 {minTemp}°</span>}
              {maxTemp === null && minTemp === null && <span className="text-gray-400">온도 정보 없음</span>}
            </div>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}

