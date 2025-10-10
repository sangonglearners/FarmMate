# Registration 데이터 활용 PRD (Product Requirements Document)

## 📋 개요
FarmMate 어플리케이션에서 사용하는 작물 Registration 데이터의 구조, 활용 현황 및 개선 방향을 정의하는 문서입니다.

---

## 🎯 핵심 목표
- **체계적인 작물 데이터 관리** - 품목, 대분류, 품종, 생육기간 등 작물 정보 통합 관리
- **작물 검색 최적화** - 사용자가 원하는 작물을 빠르고 정확하게 찾을 수 있도록 지원
- **생육 정보 활용** - 작물별 생육기간 정보를 기반으로 농작업 일정 자동 생성
- **확장 가능한 데이터 구조** - 새로운 작물 정보를 쉽게 추가할 수 있는 유연한 구조

---

## 📊 데이터 구조

### Registration 데이터 스키마
```typescript
export interface RegistrationData {
  id: string;              // 고유 식별자
  품목: string;            // 작물 품목명 (예: 스냅피, 브로콜리니)
  대분류: string;          // 작물 대분류 (예: 콩_완두, 음식꽃)
  품종: string;            // 작물 품종 (예: 슈가앤, 스틱브로콜리니)
  파종육묘구분: string;    // 재배 방식 (파종 or 육묘)
  생육기간?: number;       // 파종부터 수확까지 일수 (선택적)
}
```

### 데이터 현황
- **총 작물 수**: 104개 품종
- **주요 카테고리**: 
  - 콩류 (완두, 채두, 잠두, 강두, 대두)
  - 음식꽃 (브로콜리니, 채화, 채심)
  - 배추류 (결구배추, 양배추, 콜라비, 케일)
  - 상추류 (결구상추, 로메인)
  - 뿌리채소 (당근, 래디쉬, 비트, 순무)
  - 미나리과 채소 (샐러리, 딜, 펜넬)
  - 십자화과 잎채소 (경수채, 겨자채, 루꼴라)
  - 호박류 (쥬키니, 버터넛스쿼시)
  - 기타 (토마토, 고추, 오이, 가지, 대파 등)
- **생육기간 범위**: 30일 ~ 120일

---

## 🔄 현재 활용 현황

### 1. 작물 검색 시스템 (완료 ✅)
- **위치**: `add-task-dialog-improved.tsx`
- **기능**: 
  - 작물명, 대분류, 품종으로 실시간 검색
  - 서버 검색 API를 통한 빠른 조회
  - 검색 결과를 카드 형태로 표시
- **검색 알고리즘**:
  ```typescript
  const results = registrationData.filter(crop => {
    const 품목매치 = crop.품목.toLowerCase().includes(term);
    const 대분류매치 = crop.대분류.toLowerCase().includes(term);
    const 품종매치 = crop.품종.toLowerCase().includes(term);
    return 품목매치 || 대분류매치 || 품종매치;
  });
  ```

### 2. 작물 등록 시스템 (완료 ✅)
- **위치**: `new-add-task-dialog.tsx`, `add-task-dialog-new.tsx`
- **기능**:
  - Registration 데이터를 기반으로 작물 선택
  - 작물 정보를 작업에 자동 연결
  - 커스텀 작물명 입력 지원
- **데이터 흐름**:
  1. 사용자가 작물 검색
  2. Registration 데이터에서 일치하는 작물 찾기
  3. 선택된 작물 정보를 작업 등록 폼에 적용

### 3. 작물 정보 표시 (완료 ✅)
- **위치**: 작업 등록, 수정 다이얼로그
- **기능**:
  - 작물의 품목, 대분류, 품종 정보 표시
  - "대분류 > 품목 > 품종" 형식으로 계층 구조 표시
  - 작물 정보 일관성 보장

---

## 🚀 제안된 개선사항

### 1. 생육기간 자동 설정 (제안됨 💡)
- **목표**: 농작업 계산기에서 작물별 생육기간 자동 적용
- **위치**: `work-calculator-dialog.tsx`
- **구현 방법**:
  ```typescript
  // 선택된 작물과 registration 데이터 매칭
  const matchedCrop = registrationData.find(reg => {
    const categoryMatch = reg.대분류.toLowerCase().includes(selectedCrop.category.toLowerCase());
    const nameMatch = reg.품목.toLowerCase().includes(selectedCrop.name.toLowerCase());
    const varietyMatch = reg.품종.toLowerCase().includes(selectedCrop.variety.toLowerCase());
    return categoryMatch && nameMatch && varietyMatch;
  });
  
  // 생육기간을 총 소요기간으로 설정
  const totalDuration = matchedCrop?.생육기간 || 70; // 기본값 70일
  ```
- **기대 효과**:
  - 사용자 입력 부담 감소
  - 정확한 재배 계획 수립 지원
  - Registration 데이터의 활용도 증가
- **우선순위**: Medium
- **예상 소요 시간**: 2-3시간

### 2. 파종/육묘 구분 활용 (예정 📋)
- **목표**: 작물의 파종육묘구분 정보를 활용하여 농작업 단계 자동 구성
- **구현 아이디어**:
  - 파종 작물: "파종 → 관리 → 수확" 단계
  - 육묘 작물: "육묘 → 정식 → 관리 → 수확" 단계
- **기대 효과**: 작물 특성에 맞는 정확한 작업 단계 제공

### 3. 작물 이미지 추가 (예정 📋)
- **목표**: Registration 데이터에 작물 대표 이미지 추가
- **구현 방법**:
  ```typescript
  export interface RegistrationData {
    id: string;
    품목: string;
    대분류: string;
    품종: string;
    파종육묘구분: string;
    생육기간?: number;
    이미지URL?: string;  // 신규 추가
  }
  ```
- **기대 효과**: 시각적으로 작물을 쉽게 식별 가능

### 4. 작물 추천 시스템 연동 (예정 📋)
- **목표**: 작물 추천 기능에서 Registration 데이터 활용
- **활용 방안**:
  - 생육기간 기반 재배 시기 추천
  - 파종/육묘 구분 기반 재배 난이도 평가
  - 대분류별 작물 다양성 제공
- **연동 PRD**: `prd_crop_recommendation.md`

### 5. 계절별 작물 필터링 (예정 📋)
- **목표**: 현재 계절에 재배 가능한 작물만 필터링
- **구현 아이디어**:
  - Registration 데이터에 재배 적기 정보 추가
  - 현재 날짜 기반 자동 필터링
  - "계절별 추천 작물" 섹션 제공

---

## 📈 데이터 관리 및 확장

### 데이터 추가 프로세스
1. **신규 작물 정보 수집** - 품목, 대분류, 품종, 생육기간 등
2. **데이터 검증** - 기존 데이터와 중복 확인, 형식 검증
3. **데이터 추가** - `registration.ts` 파일에 추가
4. **테스트** - 검색 기능, 작업 등록 기능에서 정상 동작 확인

### 데이터 품질 관리
- [x] **필수 필드 검증** - 모든 작물이 id, 품목, 대분류, 품종 정보 보유
- [x] **생육기간 정보 완성도** - 104개 작물 모두 생육기간 정보 보유
- [ ] **중복 데이터 확인** - 동일한 작물이 중복 등록되지 않도록 관리
- [ ] **데이터 정규화** - 품목명, 대분류 표기 방식 통일

### 향후 확장 계획
- [ ] **데이터베이스 이관** - 로컬 파일에서 Supabase 테이블로 이관
- [ ] **관리자 페이지** - 작물 데이터 CRUD 관리 UI 구축
- [ ] **사용자 커스텀 작물** - 사용자가 직접 작물 정보 추가 가능
- [ ] **작물 정보 상세화** - 재배 방법, 주의사항, 영양 정보 등 추가

---

## 🔧 기술 스택

### 현재 구현
- **데이터 저장**: TypeScript 파일 (`registration.ts`)
- **데이터 조회**: 로컬 배열 검색
- **검색 알고리즘**: 문자열 포함 검색 (case-insensitive)

### 향후 개선
- **데이터베이스**: Supabase PostgreSQL
- **검색 엔진**: Full-text search 또는 Elastic Search
- **캐싱**: React Query 캐싱 전략
- **API**: RESTful API 또는 GraphQL

---

## 📊 성과 지표

### 현재 지표
- [x] **작물 데이터 완성도**: 100% (104개 작물 모두 생육기간 정보 보유)
- [x] **검색 정확도**: 품목, 대분류, 품종 기반 다중 검색 지원
- [x] **데이터 활용도**: 작물 검색, 작업 등록에서 활용

### 목표 지표 (개선 후)
- [ ] **생육기간 자동 설정 적용률**: 80% 이상
- [ ] **사용자 만족도**: 작물 검색 및 선택 과정 만족도 4.5/5.0 이상
- [ ] **데이터 최신성**: 분기별 작물 정보 업데이트
- [ ] **검색 속도**: 평균 응답 시간 100ms 이하

---

## 🔗 관련 PRD 문서
- `prd-task-list.md` - 작업 등록 및 농작업 계산기 (생육기간 자동 설정 기능)
- `prd_crop_recommendation.md` - 작물 추천 기능 (Registration 데이터 활용 예정)
- `prd-farm-list.md` - 농장 관리 (작물-농장 연동)

---

## 📝 변경 이력
- **2025-10-10**: 초기 문서 작성
  - Registration 데이터 구조 정의
  - 현재 활용 현황 정리
  - 생육기간 자동 설정 기능 제안
  - 향후 확장 계획 수립

