// 기상청 날씨 API 호출 함수

/**
 * 기상청 API 기본 URL을 반환합니다
 * 개발 환경에서는 프록시를 사용하여 CORS 문제를 우회합니다
 */
function getApiBaseUrl(): string {
  // 개발 환경에서는 Vite 프록시 사용
  if (import.meta.env.DEV) {
    return `${window.location.origin}/api/weather`;
  }
  // 프로덕션 환경에서는 직접 호출 (또는 백엔드 프록시 필요)
  return 'http://apis.data.go.kr';
}

export interface WeatherData {
  temperature: string; // 현재 기온
  maxTemperature: string; // 최고 기온
  minTemperature: string; // 최저 기온
  humidity: string; // 습도
  windSpeed: string; // 풍속 (m/s)
  skyCondition: string; // 하늘상태
  precipitation: string; // 강수량
  precipitationType: string; // 강수형태
  location: string; // 지역명
  baseDate: string; // 발표일자
  baseTime: string; // 발표시각
}

// 지역별 좌표 (nx, ny)
const LOCATION_COORDINATES: Record<string, { nx: number; ny: number; name: string }> = {
  seoul: { nx: 60, ny: 127, name: '서울' },
  incheon: { nx: 55, ny: 124, name: '인천' },
  gyeonggi: { nx: 60, ny: 120, name: '경기도' },
  gangwon: { nx: 73, ny: 134, name: '강원도' },
  chungbuk: { nx: 69, ny: 107, name: '충청북도' },
  chungnam: { nx: 68, ny: 100, name: '충청남도' },
  jeonbuk: { nx: 63, ny: 89, name: '전라북도' },
  jeonnam: { nx: 51, ny: 67, name: '전라남도' },
  gyeongbuk: { nx: 89, ny: 91, name: '경상북도' },
  gyeongnam: { nx: 91, ny: 77, name: '경상남도' },
  jeju: { nx: 52, ny: 38, name: '제주도' },
};

// 기본 지역 설정 (서울)
const DEFAULT_LOCATION = 'seoul';

/**
 * 위도/경도를 기상청 격자 좌표(nx, ny)로 변환합니다
 * 기상청 격자 좌표 변환 공식 사용
 */
export function convertLatLonToGrid(lat: number, lon: number): { nx: number; ny: number } {
  const RE = 6371.00877; // 지구 반경(km)
  const GRID = 5.0; // 격자 간격(km)
  const SLAT1 = 30.0; // 투영 위도1(degree)
  const SLAT2 = 60.0; // 투영 위도2(degree)
  const OLON = 126.0; // 기준점 경도(degree)
  const OLAT = 38.0; // 기준점 위도(degree)
  const XO = 43; // 기준점 X좌표(GRID)
  const YO = 136; // 기준점 Y좌표(GRID)

  const DEGRAD = Math.PI / 180.0;
  const RADDEG = 180.0 / Math.PI;

  const re = RE / GRID;
  const slat1 = SLAT1 * DEGRAD;
  const slat2 = SLAT2 * DEGRAD;
  const olon = OLON * DEGRAD;
  const olat = OLAT * DEGRAD;

  let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = Math.pow(sf, sn) * Math.cos(slat1) / sn;
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = re * sf / Math.pow(ro, sn);

  let ra = Math.tan(Math.PI * 0.25 + (lat) * DEGRAD * 0.5);
  ra = re * sf / Math.pow(ra, sn);
  let theta = lon * DEGRAD - olon;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;

  const nx = Math.floor(ra * Math.sin(theta) + XO + 0.5);
  const ny = Math.floor(ro - ra * Math.cos(theta) + YO + 0.5);

  return { nx, ny };
}

/**
 * 위도/경도로 지역명을 추정합니다
 */
function getLocationNameFromCoordinates(lat: number, lon: number): string {
  // 위도/경도로 대략적인 지역 판단
  // 한국의 주요 지역 범위
  if (lat >= 37.4 && lat <= 37.7 && lon >= 126.7 && lon <= 127.2) {
    return '서울';
  } else if (lat >= 37.4 && lat <= 37.6 && lon >= 126.6 && lon <= 126.8) {
    return '인천';
  } else if (lat >= 33.0 && lat <= 33.5 && lon >= 126.0 && lon <= 127.0) {
    return '제주도';
  } else if (lat >= 35.0 && lat <= 38.0 && lon >= 126.0 && lon <= 129.0) {
    return '경기도';
  } else if (lat >= 37.0 && lat <= 38.8 && lon >= 127.0 && lon <= 129.0) {
    return '강원도';
  } else if (lat >= 36.0 && lat <= 37.5 && lon >= 127.0 && lon <= 129.0) {
    return '충청북도';
  } else if (lat >= 35.0 && lat <= 36.5 && lon >= 126.0 && lon <= 127.5) {
    return '충청남도';
  } else if (lat >= 35.0 && lat <= 36.5 && lon >= 126.0 && lon <= 127.5) {
    return '전라북도';
  } else if (lat >= 34.0 && lat <= 35.5 && lon >= 125.0 && lon <= 127.0) {
    return '전라남도';
  } else if (lat >= 35.5 && lat <= 37.0 && lon >= 128.0 && lon <= 130.0) {
    return '경상북도';
  } else if (lat >= 34.5 && lat <= 35.5 && lon >= 127.5 && lon <= 129.5) {
    return '경상남도';
  }
  
  // 기본값: 위도/경도 표시
  return `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
}

/**
 * 사용자의 현재 위치를 가져옵니다
 */
export async function getCurrentLocation(): Promise<{ lat: number; lon: number; name: string } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn('Geolocation을 지원하지 않는 브라우저입니다.');
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        const name = getLocationNameFromCoordinates(lat, lon);
        resolve({ lat, lon, name });
      },
      (error) => {
        console.warn('위치 정보를 가져올 수 없습니다:', error);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 600000, // 10분 캐시
      }
    );
  });
}

/**
 * 위도/경도로 날씨 정보를 가져옵니다
 */
export async function getWeatherDataByCoordinates(
  lat: number,
  lon: number,
  locationName?: string
): Promise<WeatherData | null> {
  try {
    const serviceKey = import.meta.env.VITE_KMA_SERVICE_KEY;
    
    if (!serviceKey) {
      console.warn('기상청 API 키가 설정되지 않았습니다.');
      const name = locationName || getLocationNameFromCoordinates(lat, lon);
      return getDummyWeatherDataForLocation(name, lat, lon);
    }

    const grid = convertLatLonToGrid(lat, lon);
    const locationNameStr = locationName || getLocationNameFromCoordinates(lat, lon);
    
    const now = new Date();
    const baseDate = now.toISOString().slice(0, 10).replace(/-/g, '');
    const baseTime = getBaseTime(now);
    
    // API URL (초단기실황)
    const apiBaseUrl = getApiBaseUrl();
    const url = new URL(`${apiBaseUrl}/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst`);
    url.searchParams.set('serviceKey', serviceKey);
    url.searchParams.set('pageNo', '1');
    url.searchParams.set('numOfRows', '10');
    url.searchParams.set('dataType', 'JSON');
    url.searchParams.set('base_date', baseDate);
    url.searchParams.set('base_time', baseTime);
    url.searchParams.set('nx', grid.nx.toString());
    url.searchParams.set('ny', grid.ny.toString());

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`날씨 API 호출 실패: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.response?.header?.resultCode !== '00') {
      throw new Error(`날씨 API 오류: ${data.response?.header?.resultMsg || '알 수 없는 오류'}`);
    }

    const items = data.response?.body?.items?.item || [];
    if (items.length === 0) {
      return getDummyWeatherDataForLocation(locationNameStr, lat, lon);
    }

    const temperature = items.find((item: any) => item.category === 'T1H')?.obsrValue || '0';
    const humidity = items.find((item: any) => item.category === 'REH')?.obsrValue || '0';
    const windSpeed = items.find((item: any) => item.category === 'WSD')?.obsrValue || '0';
    const skyCondition = items.find((item: any) => item.category === 'SKY')?.obsrValue || '1';
    const precipitation = items.find((item: any) => item.category === 'PCP')?.obsrValue || '0';
    const precipitationType = items.find((item: any) => item.category === 'PTY')?.obsrValue || '0';

    const forecastData = await getDailyTemperatureRangeForGrid(grid, baseDate, serviceKey);
    
    return {
      temperature,
      maxTemperature: forecastData.maxTemp,
      minTemperature: forecastData.minTemp,
      humidity,
      windSpeed,
      skyCondition,
      precipitation,
      precipitationType,
      location: locationNameStr,
      baseDate,
      baseTime,
    };
  } catch (error) {
    console.error('날씨 정보 가져오기 실패:', error);
    const name = locationName || getLocationNameFromCoordinates(lat, lon);
    return getDummyWeatherDataForLocation(name, lat, lon);
  }
}

/**
 * 단기예보 API용 base_time 계산
 * 기상청 단기예보는 02:00, 05:00, 08:00, 11:00, 14:00, 17:00, 20:00, 23:00에 발표
 */
function getForecastBaseTime(date: Date): string {
  const hour = date.getHours();
  
  // 발표 시각 배열
  const baseTimes = ['0200', '0500', '0800', '1100', '1400', '1700', '2000', '2300'];
  
  // 현재 시간보다 이전의 가장 최근 발표 시각 찾기
  let selectedTime = '2300'; // 기본값 (전날 23시)
  
  for (let i = baseTimes.length - 1; i >= 0; i--) {
    const baseHour = parseInt(baseTimes[i].substring(0, 2));
    if (hour >= baseHour + 1) { // API 발표 후 10분 정도 후부터 사용 가능
      selectedTime = baseTimes[i];
      break;
    }
  }
  
  return selectedTime;
}

/**
 * 좌표 기반 최고/최저 온도 가져오기
 * 최저기온은 02시 발표 데이터를 사용해야 확실하게 조회 가능
 */
async function getDailyTemperatureRangeForGrid(
  grid: { nx: number; ny: number },
  baseDate: string,
  serviceKey: string
): Promise<{ maxTemp: string; minTemp: string }> {
  try {
    // 최고기온 조회 (현재 시간 기준 발표)
    const now = new Date();
    const baseTime = getForecastBaseTime(now);
    
    console.log(`[날씨 API] 최고/최저 온도 조회 - baseDate: ${baseDate}, baseTime: ${baseTime}`);
    
    const apiBaseUrl = getApiBaseUrl();
    const url = new URL(`${apiBaseUrl}/1360000/VilageFcstInfoService_2.0/getVilageFcst`);
    url.searchParams.set('serviceKey', serviceKey);
    url.searchParams.set('pageNo', '1');
    url.searchParams.set('numOfRows', '300');
    url.searchParams.set('dataType', 'JSON');
    url.searchParams.set('base_date', baseDate);
    url.searchParams.set('base_time', baseTime);
    url.searchParams.set('nx', grid.nx.toString());
    url.searchParams.set('ny', grid.ny.toString());

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`날씨 예보 API 호출 실패: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.response?.header?.resultCode !== '00') {
      console.error(`[날씨 API] 응답 오류:`, data.response?.header?.resultMsg);
      throw new Error(`날씨 예보 API 오류: ${data.response?.header?.resultMsg}`);
    }

    const items = data.response?.body?.items?.item || [];
    console.log(`[날씨 API] 받은 데이터 개수: ${items.length}개`);
    
    // 오늘 날짜의 최고기온 찾기
    const maxTemp = items.find((item: any) => item.category === 'TMX' && item.fcstDate === baseDate)?.fcstValue || '';
    
    // 최저기온 찾기 - 오늘 데이터에서 먼저 시도
    let minTemp = items.find((item: any) => item.category === 'TMN' && item.fcstDate === baseDate)?.fcstValue || '';
    
    // 최저기온이 없으면 02시 발표 데이터로 재조회
    if (!minTemp) {
      console.log(`[날씨 API] 최저온도가 없어 02시 발표 데이터로 재조회합니다`);
      
      const url2 = new URL(`${apiBaseUrl}/1360000/VilageFcstInfoService_2.0/getVilageFcst`);
      url2.searchParams.set('serviceKey', serviceKey);
      url2.searchParams.set('pageNo', '1');
      url2.searchParams.set('numOfRows', '300');
      url2.searchParams.set('dataType', 'JSON');
      url2.searchParams.set('base_date', baseDate);
      url2.searchParams.set('base_time', '0200'); // 02시 발표
      url2.searchParams.set('nx', grid.nx.toString());
      url2.searchParams.set('ny', grid.ny.toString());

      const response2 = await fetch(url2.toString());
      
      if (response2.ok) {
        const data2 = await response2.json();
        if (data2.response?.header?.resultCode === '00') {
          const items2 = data2.response?.body?.items?.item || [];
          minTemp = items2.find((item: any) => item.category === 'TMN' && item.fcstDate === baseDate)?.fcstValue || '';
          console.log(`[날씨 API] 02시 발표에서 최저온도 찾음: ${minTemp}°C`);
        }
      }
    }
    
    console.log(`[날씨 API] 최종 결과 - 최고: ${maxTemp}°C, 최저: ${minTemp}°C`);
    
    return {
      maxTemp: maxTemp || '',
      minTemp: minTemp || '',
    };
  } catch (error) {
    console.error('[날씨 API] 최고/최저 온도 가져오기 실패:', error);
    return { maxTemp: '', minTemp: '' };
  }
}

/**
 * 좌표 기반 더미 데이터
 */
function getDummyWeatherDataForLocation(locationName: string, lat: number, lon: number): WeatherData {
  const now = new Date();
  const baseDate = now.toISOString().slice(0, 10).replace(/-/g, '');
  const baseTime = String(now.getHours()).padStart(2, '0') + '00';
  
  return {
    temperature: '12',
    maxTemperature: '16',
    minTemperature: '10',
    humidity: '70',
    windSpeed: '3',
    skyCondition: '1',
    precipitation: '0',
    precipitationType: '0',
    location: locationName,
    baseDate,
    baseTime,
  };
}

/**
 * 기상청 단기예보 API에서 현재 날씨 정보를 가져옵니다
 */
export async function getWeatherData(
  location: string = DEFAULT_LOCATION
): Promise<WeatherData | null> {
  try {
    // API 키는 환경 변수에서 가져옵니다
    const serviceKey = import.meta.env.VITE_KMA_SERVICE_KEY;
    
    if (!serviceKey) {
      console.warn('기상청 API 키가 설정되지 않았습니다. 환경 변수 VITE_KMA_SERVICE_KEY를 설정해주세요.');
      // API 키가 없어도 더미 데이터를 반환하여 UI는 표시되도록 합니다
      return getDummyWeatherData(location);
    }

    const coordinates = LOCATION_COORDINATES[location] || LOCATION_COORDINATES[DEFAULT_LOCATION];
    
    // 현재 날짜와 시간 계산
    const now = new Date();
    const baseDate = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const baseTime = getBaseTime(now); // HHmm 형식
    
    // API URL (초단기실황)
    const apiBaseUrl = getApiBaseUrl();
    const url = new URL(`${apiBaseUrl}/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst`);
    url.searchParams.set('serviceKey', serviceKey);
    url.searchParams.set('pageNo', '1');
    url.searchParams.set('numOfRows', '10');
    url.searchParams.set('dataType', 'JSON');
    url.searchParams.set('base_date', baseDate);
    url.searchParams.set('base_time', baseTime);
    url.searchParams.set('nx', coordinates.nx.toString());
    url.searchParams.set('ny', coordinates.ny.toString());

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`날씨 API 호출 실패: ${response.status}`);
    }

    const data = await response.json();
    
    // API 응답 구조 파싱
    if (data.response?.header?.resultCode !== '00') {
      throw new Error(`날씨 API 오류: ${data.response?.header?.resultMsg || '알 수 없는 오류'}`);
    }

    const items = data.response?.body?.items?.item || [];
    if (items.length === 0) {
      return getDummyWeatherData(location);
    }

    // 필요한 데이터 추출 (초단기실황)
    const temperature = items.find((item: any) => item.category === 'T1H')?.obsrValue || '0';
    const humidity = items.find((item: any) => item.category === 'REH')?.obsrValue || '0';
    const windSpeed = items.find((item: any) => item.category === 'WSD')?.obsrValue || '0';
    const skyCondition = items.find((item: any) => item.category === 'SKY')?.obsrValue || '1';
    const precipitation = items.find((item: any) => item.category === 'PCP')?.obsrValue || '0';
    const precipitationType = items.find((item: any) => item.category === 'PTY')?.obsrValue || '0';

    // 최고/최저 온도는 단기예보 API에서 가져와야 함
    const forecastData = await getDailyTemperatureRange(coordinates, baseDate, serviceKey);
    
    return {
      temperature,
      maxTemperature: forecastData.maxTemp,
      minTemperature: forecastData.minTemp,
      humidity,
      windSpeed,
      skyCondition,
      precipitation,
      precipitationType,
      location: coordinates.name,
      baseDate,
      baseTime,
    };
  } catch (error) {
    console.error('날씨 정보 가져오기 실패:', error);
    // 에러 발생 시에도 더미 데이터를 반환하여 UI는 표시되도록 합니다
    return getDummyWeatherData(location);
  }
}

/**
 * 단기예보 API에서 오늘과 내일 날씨를 가져옵니다
 */
export async function getForecastWeather(
  location: string = DEFAULT_LOCATION
): Promise<{ today: WeatherData | null; tomorrow: WeatherData | null }> {
  try {
    const serviceKey = import.meta.env.VITE_KMA_SERVICE_KEY;
    
    if (!serviceKey) {
      return { today: getDummyWeatherData(location), tomorrow: getDummyWeatherData(location) };
    }

    const coordinates = LOCATION_COORDINATES[location] || LOCATION_COORDINATES[DEFAULT_LOCATION];
    
    const now = new Date();
    const baseDate = now.toISOString().slice(0, 10).replace(/-/g, '');
    const baseTime = getForecastBaseTime(now); // 현재 시간에 맞는 발표시각 사용
    
    const apiBaseUrl = getApiBaseUrl();
    const url = new URL(`${apiBaseUrl}/1360000/VilageFcstInfoService_2.0/getVilageFcst`);
    url.searchParams.set('serviceKey', serviceKey);
    url.searchParams.set('pageNo', '1');
    url.searchParams.set('numOfRows', '300');
    url.searchParams.set('dataType', 'JSON');
    url.searchParams.set('base_date', baseDate);
    url.searchParams.set('base_time', baseTime);
    url.searchParams.set('nx', coordinates.nx.toString());
    url.searchParams.set('ny', coordinates.ny.toString());

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`날씨 예보 API 호출 실패: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.response?.header?.resultCode !== '00') {
      throw new Error(`날씨 예보 API 오류: ${data.response?.header?.resultMsg || '알 수 없는 오류'}`);
    }

    const items = data.response?.body?.items?.item || [];
    
    // 오늘과 내일 데이터 추출 및 처리
    const todayData = extractWeatherFromForecast(items, 0);
    const tomorrowData = extractWeatherFromForecast(items, 1);

    return {
      today: todayData || getDummyWeatherData(location),
      tomorrow: tomorrowData || getDummyWeatherData(location),
    };
  } catch (error) {
    console.error('날씨 예보 정보 가져오기 실패:', error);
    return {
      today: getDummyWeatherData(location),
      tomorrow: getDummyWeatherData(location),
    };
  }
}

/**
 * 예보 데이터에서 특정 일의 날씨를 추출합니다
 */
function extractWeatherFromForecast(items: any[], dayOffset: number): WeatherData | null {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + dayOffset);
  const targetDateStr = targetDate.toISOString().slice(0, 10).replace(/-/g, '');
  
  // 해당 날짜의 데이터만 필터링
  const dayItems = items.filter((item: any) => item.fcstDate === targetDateStr);
  
  if (dayItems.length === 0) return null;
  
  // 가장 최근 시간대의 데이터 사용
  const latestTime = Math.max(...dayItems.map((item: any) => parseInt(item.fcstTime || '0')));
  const latestItems = dayItems.filter((item: any) => parseInt(item.fcstTime || '0') === latestTime);
  
  const temperature = latestItems.find((item: any) => item.category === 'TMP')?.fcstValue || '0';
  const humidity = latestItems.find((item: any) => item.category === 'REH')?.fcstValue || '0';
  const windSpeed = latestItems.find((item: any) => item.category === 'WSD')?.fcstValue || '0';
  const skyCondition = latestItems.find((item: any) => item.category === 'SKY')?.fcstValue || '1';
  const precipitation = latestItems.find((item: any) => item.category === 'PCP')?.fcstValue || '0';
  const precipitationType = latestItems.find((item: any) => item.category === 'PTY')?.fcstValue || '0';
  
  // 최고/최저 온도는 별도로 찾아야 함
  const maxTemp = dayItems.find((item: any) => item.category === 'TMX')?.fcstValue || '';
  const minTemp = dayItems.find((item: any) => item.category === 'TMN')?.fcstValue || '';
  
  return {
    temperature,
    maxTemperature: maxTemp || temperature,
    minTemperature: minTemp || temperature,
    humidity,
    windSpeed,
    skyCondition,
    precipitation,
    precipitationType,
    location: '서울',
    baseDate: targetDateStr,
    baseTime: String(latestTime).padStart(4, '0'),
  };
}

/**
 * 단기예보 API에서 오늘의 최고/최저 온도를 가져옵니다
 */
async function getDailyTemperatureRange(
  coordinates: { nx: number; ny: number },
  baseDate: string,
  serviceKey: string
): Promise<{ maxTemp: string; minTemp: string }> {
  try {
    // 단기예보 API 호출 - 현재 시간에 맞는 발표시각 사용
    const now = new Date();
    const baseTime = getForecastBaseTime(now);
    
    const apiBaseUrl = getApiBaseUrl();
    const url = new URL(`${apiBaseUrl}/1360000/VilageFcstInfoService_2.0/getVilageFcst`);
    url.searchParams.set('serviceKey', serviceKey);
    url.searchParams.set('pageNo', '1');
    url.searchParams.set('numOfRows', '300');
    url.searchParams.set('dataType', 'JSON');
    url.searchParams.set('base_date', baseDate);
    url.searchParams.set('base_time', baseTime);
    url.searchParams.set('nx', coordinates.nx.toString());
    url.searchParams.set('ny', coordinates.ny.toString());

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`날씨 예보 API 호출 실패: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.response?.header?.resultCode !== '00') {
      throw new Error(`날씨 예보 API 오류`);
    }

    const items = data.response?.body?.items?.item || [];
    
    // 최고 기온 (TMX)
    const maxTemp = items.find((item: any) => item.category === 'TMX' && item.fcstDate === baseDate)?.fcstValue || '';
    // 최저 기온 (TMN) - 오늘 데이터에서 먼저 시도
    let minTemp = items.find((item: any) => item.category === 'TMN' && item.fcstDate === baseDate)?.fcstValue || '';
    
    // 최저기온이 없으면 02시 발표 데이터로 재조회
    if (!minTemp) {
      const apiBaseUrl = getApiBaseUrl();
      const url2 = new URL(`${apiBaseUrl}/1360000/VilageFcstInfoService_2.0/getVilageFcst`);
      url2.searchParams.set('serviceKey', serviceKey);
      url2.searchParams.set('pageNo', '1');
      url2.searchParams.set('numOfRows', '300');
      url2.searchParams.set('dataType', 'JSON');
      url2.searchParams.set('base_date', baseDate);
      url2.searchParams.set('base_time', '0200');
      url2.searchParams.set('nx', coordinates.nx.toString());
      url2.searchParams.set('ny', coordinates.ny.toString());

      const response2 = await fetch(url2.toString());
      
      if (response2.ok) {
        const data2 = await response2.json();
        if (data2.response?.header?.resultCode === '00') {
          const items2 = data2.response?.body?.items?.item || [];
          minTemp = items2.find((item: any) => item.category === 'TMN' && item.fcstDate === baseDate)?.fcstValue || '';
        }
      }
    }
    
    return {
      maxTemp: maxTemp || '',
      minTemp: minTemp || '',
    };
  } catch (error) {
    console.error('최고/최저 온도 가져오기 실패:', error);
    return { maxTemp: '', minTemp: '' };
  }
}

/**
 * API 호출 시각에 맞는 base_time을 반환합니다
 * 초단기실황은 매 시간 정각에 발표됩니다 (00, 30분 기준)
 */
function getBaseTime(date: Date): string {
  const hour = date.getHours();
  const minute = date.getMinutes();
  
  // 30분 이전이면 1시간 전 데이터 사용
  if (minute < 30) {
    const prevHour = hour === 0 ? 23 : hour - 1;
    return String(prevHour).padStart(2, '0') + '00';
  }
  
  // 30분 이후면 현재 시간 데이터 사용
  return String(hour).padStart(2, '0') + '00';
}

/**
 * API 키가 없거나 에러 발생 시 사용할 더미 데이터
 */
function getDummyWeatherData(location: string): WeatherData {
  const coordinates = LOCATION_COORDINATES[location] || LOCATION_COORDINATES[DEFAULT_LOCATION];
  const now = new Date();
  const baseDate = now.toISOString().slice(0, 10).replace(/-/g, '');
  const baseTime = String(now.getHours()).padStart(2, '0') + '00';
  
  return {
    temperature: '12',
    maxTemperature: '16',
    minTemperature: '10',
    humidity: '70',
    windSpeed: '3',
    skyCondition: '1',
    precipitation: '0',
    precipitationType: '0',
    location: coordinates.name,
    baseDate,
    baseTime,
  };
}

/**
 * 하늘 상태 코드를 텍스트로 변환
 */
export function getSkyConditionText(skyCode: string): string {
  const code = parseInt(skyCode);
  switch (code) {
    case 1: return '맑음';
    case 3: return '구름많음';
    case 4: return '흐림';
    default: return '맑음';
  }
}

/**
 * 강수 형태 코드를 텍스트로 변환
 */
export function getPrecipitationTypeText(ptyCode: string): string {
  const code = parseInt(ptyCode);
  switch (code) {
    case 0: return '없음';
    case 1: return '비';
    case 2: return '비/눈';
    case 3: return '눈';
    case 4: return '소나기';
    default: return '없음';
  }
}

/**
 * 날씨 아이콘을 반환
 */
export function getWeatherIcon(skyCode: string, ptyCode: string): string {
  const pty = parseInt(ptyCode);
  const sky = parseInt(skyCode);
  
  if (pty > 0) {
    if (pty === 1 || pty === 4) return '🌧️'; // 비, 소나기
    if (pty === 2) return '🌨️'; // 비/눈
    if (pty === 3) return '❄️'; // 눈
  }
  
  switch (sky) {
    case 1: return '☀️'; // 맑음
    case 3: return '⛅'; // 구름많음
    case 4: return '☁️'; // 흐림
    default: return '☀️';
  }
}

