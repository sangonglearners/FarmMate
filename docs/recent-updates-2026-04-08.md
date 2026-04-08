# 최근 수정 내역 (2026-04-08)

현재 브랜치(`hyeonuk`)는 로컬 작업 트리 기준 추가 변경사항이 없는 상태입니다.
아래는 최근 반영된 커밋 기준 수정 내역 정리입니다.

## 1) 농장&작물 - 내 작물 관리 UI 정리
- 커밋: `bcd806c9`
- 날짜: 2026-04-08
- 내용: '내 작물 관리' 화면의 볼드체 제거 및 아이콘 수정
- 변경 파일:
  - `FarmMate/src/components/add-task-dialog-improved.tsx`
  - `FarmMate/src/pages/farms/ui/FarmsPage.tsx`

## 2) 농장&작물 - 외부 진입 경로 대분류 제거
- 커밋: `db9285fb`
- 날짜: 2026-04-08
- 내용: 외부 '내 작물 관리' 진입 경로에서도 대분류 제거 반영
- 변경 파일:
  - `FarmMate/src/pages/farm-crop-management/ui/FarmCropManagementPage.tsx`
  - `FarmMate/src/pages/farms/ui/FarmsPage.tsx`

## 3) 농장&작물 - 대분류 삭제
- 커밋: `14b36989`
- 날짜: 2026-04-08
- 내용: 작물 추가 다이얼로그에서 대분류 삭제
- 변경 파일:
  - `FarmMate/src/features/crop-management/ui/AddCropDialog.tsx`

## 4) 농장&작물 - 대표 작물 오류 및 기타 수정
- 커밋: `c47850ca`
- 날짜: 2026-04-08
- 내용: 대표 작물 관련 오류 해결 및 연관 화면/다이얼로그 수정
- 변경 파일:
  - `FarmMate/src/components/ui/confirm-dialog.tsx`
  - `FarmMate/src/features/crop-management/ui/AddCropDialog.tsx`
  - `FarmMate/src/pages/farm-crop-management/ui/FarmCropManagementPage.tsx`

## 5) AI 인사이트 - 프롬프트 수정 및 배포
- 커밋: `48e5f426`
- 날짜: 2026-04-07
- 내용: 인사이트 생성 프롬프트 수정 후 Edge Function 재배포
- 변경 파일:
  - `FarmMate/supabase/functions/generate-insights/index.ts`
