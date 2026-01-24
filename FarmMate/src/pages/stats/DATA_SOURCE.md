# 통계 페이지 데이터 소스 구분

## 📊 가데이터 (Dummy Data)

### 1. 수출액 트렌드 차트 데이터
- **위치**: `StatsPage.tsx` 31-40줄
- **함수**: `generateRevenueData()`
- **설명**: 
  - `Math.random()`을 사용하여 더미 수출액 데이터 생성
  - 필터 변경 시마다 랜덤 값으로 재생성됨
  - 실제 데이터베이스와 연결되지 않음

### 2. 수출액 KPI 값
- **위치**: `StatsPage.tsx` 62-79줄
- **변수**: 
  - `averageRevenue`: Trend 차트 데이터의 평균값 (가데이터 기반)
  - `previousPeriodAverage`: 이전 기간 평균값 (가데이터 기반)
  - `revenueChange`: 증감률 (가데이터 기반)
- **설명**: `revenueData`를 기반으로 계산되므로 모두 가데이터

---

## ✅ 실제 데이터 (Real Data)

### 1. 작업(Tasks) 데이터
- **위치**: `StatsPage.tsx` 47줄
- **Hook**: `useTasks()` from `@features/task-management`
- **데이터 소스**: Supabase `tasks` 테이블
- **사용처**:
  - 작업 완료율 계산 (82-92줄)
  - 작물 구성 계산 (95-125줄)
  - 이랑별 작업 상태 계산 (130-192줄)

### 2. 농장(Farms) 데이터
- **위치**: `StatsPage.tsx` 48줄
- **Hook**: `useFarms()` from `@features/farm-management/model/farm.hooks`
- **데이터 소스**: Supabase `farms` 테이블
- **사용처**:
  - 이랑별 작업 상태 계산 (130-192줄)
  - 농장별 그룹화 및 표시

### 3. 작물(Crops) 데이터
- **위치**: `StatsPage.tsx` 49줄
- **Hook**: `useCrops()` from `@features/crop-management`
- **데이터 소스**: Supabase `crops` 테이블
- **사용처**:
  - 작물 구성 계산 (95-125줄)

### 4. 작업 완료율 (Task Completion Rate)
- **위치**: `StatsPage.tsx` 82-92줄
- **계산 방식**: `(완료된 필수 작업 수 / 계획된 필수 작업 수) × 100`
- **필수 작업**: 파종, 수확, 육묘
- **데이터 소스**: 실제 `tasks` 데이터

### 5. 작물 구성 (Crop Mix)
- **위치**: `StatsPage.tsx` 95-125줄
- **계산 방식**: 
  - 각 작업의 `cropId`와 `rowNumber`를 기준으로 작물별 고유 이랑 수 계산
  - `(작물별 이랑 수 / 전체 이랑 수) × 100`
- **데이터 소스**: 실제 `tasks`와 `crops` 데이터

### 6. 이랑별 작업 상태 (Block Health)
- **위치**: `StatsPage.tsx` 130-192줄
- **계산 방식**:
  - 농장별, 이랑별로 작업 그룹화
  - 지연된 작업 존재 → "조치 필요" (빨간색)
  - 예정 작업 존재 + 미완료 → "주의" (노란색)
  - 그 외 → "정상" (녹색)
- **데이터 소스**: 실제 `farms`와 `tasks` 데이터

---

## 🔄 데이터 연결 요약

| 컴포넌트/지표 | 데이터 소스 | 상태 |
|-------------|------------|------|
| 수출액 트렌드 차트 | 가데이터 (`generateRevenueData`) | ❌ 더미 |
| 수출액 KPI | 가데이터 (차트 평균값) | ❌ 더미 |
| 작업 완료율 | 실제 데이터 (`useTasks`) | ✅ 실제 |
| 작물 구성 | 실제 데이터 (`useTasks`, `useCrops`) | ✅ 실제 |
| 이랑별 작업 상태 | 실제 데이터 (`useFarms`, `useTasks`) | ✅ 실제 |

---

## 📝 향후 개선 사항

수출액 데이터를 실제 데이터로 연결하려면:
1. Supabase에 수출액 관련 테이블 생성
2. 수출액 데이터를 저장하는 API 구현
3. `generateRevenueData()` 함수를 실제 데이터 조회로 교체
4. 필터(일간/주간/월간/연간)에 따라 실제 데이터를 필터링하여 조회
