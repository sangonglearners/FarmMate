# 📄 Supabase Edge Function 개발 및 배포 계획

| 항목 | 내용 |
|------|------|
| **기능 이름** | 작물 추천 Supabase Edge Function 개발 및 통합 |
| **개요** | 기존 함수를 배포하고 프론트엔드에서 호출할 수 있도록 통합하는 빠른 개발 프로세스 |
| **우선순위** | High |

## Phase 1: 함수 배포 및 테스트
- [x] 함수 생성 완료 (`supabase functions new recommend`)
- [x] 기존 작물 추천 로직을 `index.ts`에 적용
- [x] docker desktop 설치 및 로컬 테스트
- [X] `supabase functions deploy recommend` 명령어로 배포
- [X] Supabase>edge function>test에서 배포된 함수 테스트

## Phase 2: 프론트엔드 API 연동
- [ ] `@shared/api/recommendation.ts` 파일 생성
- [ ] Supabase Edge Function 호출 함수 구현
- [ ] React Query로 데이터 페칭 설정
- [ ] 기본 에러 처리 추가

## Phase 3: 작물 추천 UI 개발

### 3.1 입력 페이지 (`/recommendations/input`)
- [ ] 입력 폼 구현
  - [ ] **재배 위치 선택**: farms 테이블에서 사용자 농장 목록 조회 → `environment` 값 사용
  - [ ] **재배 범위 입력**: 이랑 수 입력 (숫자, 최소값 1)
  - [ ] **재배 시기 선택**: 시작/종료 월 토글 버튼 (1~12월)
- [ ] "작물 추천" 버튼 → API 호출

### 3.2 로딩 화면
- [ ] 로딩 스피너 + "작물 조합을 만들고 있습니다" 메시지
- [ ] 완료 시 결과 페이지로 자동 전환

### 3.3 추천 결과 페이지 (`/recommendations/result`)
- [ ] Gift box 카드 3개 (리스트 뷰)
  - 카드 헤더: "Gift box 1/2/3"
  - 작물명 3개 (품목 + 품종)
  - 예상 매출액 (천 단위 구분)
  - 지표 시각화 (0~3): 진행 바 + 숫자 표기
    - 수익성, 노동편의성, 품종희소성
- [ ] 카드 선택 (라디오 버튼, 하나만 선택)
- [ ] "플래너에 이등하기" 버튼 → `rec_result` 테이블에 저장
- [ ] "다시 추천받기" 버튼

## Phase 4: 데이터 연동 및 완성

### 4.1 `rec_result` 테이블 생성 및 저장
- [ ] 테이블 스키마 생성
```sql
CREATE TABLE rec_result (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  farm_id UUID REFERENCES farms(id),
  crop_names TEXT[],              -- 3개 작물명 배열
  expected_revenue TEXT,          -- 예상 매출액
  indicators JSONB,               -- {수익성, 노동편의성, 품종희소성}
  combination_detail JSONB,       -- 전체 조합 상세 정보 (recommended_combinations[idx])
  created_at TIMESTAMP DEFAULT NOW()
);
```
- [ ] 선택한 조합 저장 함수 구현
  - 사용자 ID, 농장 ID 자동 연동
  - 선택한 카드의 정보를 테이블에 저장

### 4.2 에러 처리
- [ ] API 호출 실패: 에러 메시지 + 재시도 버튼
- [ ] 추천 결과 없음: "조건에 맞는 작물이 없습니다" 메시지
- [ ] 농장 정보 없음: 농장 등록 안내

## 기술 스택
- **Backend**: Supabase Edge Functions (Deno)
- **Frontend**: React + TypeScript + React Query
- **Database**: Supabase PostgreSQL

---

## API 명세

### Edge Function 엔드포인트
- **URL**: `https://lioumnvavuntfysxqady.supabase.co/functions/v1/recommend`
- **Method**: POST
- **Content-Type**: `application/json`

### 요청 형식
```json
{
  "start_month": 3,        // 재배 시작 월 (1~12)
  "end_month": 6,          // 재배 종료 월 (1~12)
  "input_place": "노지",   // 재배 위치 ("노지" | "시설")
  "input_irang": 20        // 이랑 수 (양수)
}
```

### 응답 형식
```json
{
  "ok": true,
  "result": {
    "recommended_combinations": [
      // 3개의 조합, 각 조합당 3개의 작물
      [
        {
          "name": "롱빈 (샤사케)",           // 표시용 이름
          "item": "롱빈",                     // 품목명
          "variety": "샤사케",                // 품종명
          "score": 0.583,                    // 최종 점수 (0~1)
          "profit_score": 0.891,             // 수익성 점수 (0~1, 스케일링 후)
          "labor_score": 0.0,                // 노동편의성 점수 (0~1, 스케일링 후)
          "rarity_score": 1.0,               // 품종희소성 점수 (0~1, 스케일링 후)
          "수익성_사용": 69800,               // 실제 수익성 값 (원, 스케일링 전)
          "노동편의성": 2,                    // 원본 노동편의성 (2~5)
          "품종희소성": 5                     // 원본 품종희소성 (2~5)
        }
        // ... 2개 더
      ]
      // ... 최대 3개의 조합
    ],
    "cards": [
      // UI 카드 표시용 데이터
      {
        "title": "Gift box 1",
        "crops": ["롱빈 (샤사케)", "그린빈 (캐피타노)", "풋콩 (차마메)"],
        "indicators": {
          "수익성": 2.1,        // 3개 작물의 profit_score 합계 (0~3)
          "노동편의성": 1.0,     // 3개 작물의 labor_score 합계 (0~3)
          "품종희소성": 2.3      // 3개 작물의 rarity_score 합계 (0~3)
        },
        "expected_revenue": "1,398,000"  // 예상 수익 (문자열, 천 단위 구분)
      }
      // ... 최대 3개의 카드
    ],
    "total_profit": 1398000,  // 1순위 조합의 총 예상 수익 (숫자)
    "recommended_crops": []   // 모든 추천 작물을 flat한 배열
  }
}
```

### 에러 응답
```json
{
  "ok": true,
  "result": {
    "recommended_combinations": [],
    "total_profit": 0,
    "cards": [],
    "error": "추천 가능한 작물이 3개 미만입니다. 재배 시기를 조정해주세요."
  }
}
```

---

## 개발 참고 정보

### Phase 2 API 호출 함수
```typescript
// @shared/api/recommendation.ts
export async function getRecommendations(params: {
  start_month: number;
  end_month: number;
  input_place: string;
  input_irang: number;
}) {
  const response = await fetch(
    'https://lioumnvavuntfysxqady.supabase.co/functions/v1/recommend',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    }
  );
  return response.json();
}
```

### farms 테이블 구조
```typescript
{
  id: string;
  user_id: string;
  name: string;
  environment: "노지" | "시설";  // input_place로 사용
  row_count: number;
  area: string;
  created_at: string;
  updated_at: string;
}
```

### rec_result 테이블 스키마
```sql
CREATE TABLE rec_result (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  farm_id UUID REFERENCES farms(id),
  crop_names TEXT[],              -- 3개 작물명 배열
  expected_revenue TEXT,          -- 예상 매출액
  indicators JSONB,               -- {수익성: 2.1, 노동편의성: 1.0, 품종희소성: 2.3}
  combination_detail JSONB,       -- recommended_combinations[선택한 인덱스]
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 지표 시각화 구현 (진행 바 + 숫자)
```tsx
<div className="indicator">
  <span>수익성</span>
  <div className="progress-bar">
    <div className="fill" style={{ width: `${(value / 3) * 100}%` }} />
  </div>
  <span className="value">{value}/3.0</span>
</div>
```
