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
- [ ] `/recommendations` 페이지 컴포넌트 생성
- [ ] 입력 폼 UI (재배 위치, 범위, 시기 선택)
- [ ] 로딩 상태 및 결과 리스트 UI
- [ ] 홈 화면 배너에서 추천 페이지로 라우팅 연결

## Phase 4: 데이터 연동 및 완성
- [ ] 추천 결과를 데이터베이스에 저장
- [ ] 추천된 작물을 플래너에 추가하는 기능
- [ ] 기본적인 예외 처리 (네트워크 오류, 빈 결과 등)
- [ ] 전체 플로우 테스트

## 기술 스택
- **Backend**: Supabase Edge Functions (Deno)
- **Frontend**: React + TypeScript + React Query
- **Database**: Supabase PostgreSQL
