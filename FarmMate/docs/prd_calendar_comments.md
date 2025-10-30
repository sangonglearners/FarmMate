# 캘린더 댓글 기능 PRD

## 개요
캘린더에 댓글을 달 수 있는 기능을 추가하여 사용자 간 소통을 활성화합니다.

## 구현 기간
2025년 1월 (예상)

## 목표
- 캘린더 사용자 간 실시간 소통 기능 제공
- 권한 기반 댓글 읽기/쓰기 제어
- 직관적인 UI/UX 제공

## 주요 기능

### 1. 댓글 표시
- 캘린더 그리드 메뉴바 우측에 댓글 버튼 배치
- Word와 유사한 사이드패널 형식으로 오른쪽에 표시
- 클릭 시 해당 캘린더의 모든 댓글 표시

### 2. 댓글 작성
- 댓글 작성자는 자신의 프로필(이메일, 이름)이 표시됨
- 댓글 내용, 작성자, 작성 시간 정보 표시
- 본인이 작성한 댓글만 삭제 가능

### 3. 권한 관리
댓글 읽기/쓰기 권한:
- **소유자(owner)**: 읽기/쓰기 가능
- **전체 허용자(editor)**: 읽기/쓰기 가능
- **댓글 허용자(commenter)**: 읽기/쓰기 가능
- **읽기 허용(viewer)**: 읽기/쓰기 불가

### 4. 실시간 업데이트
- 댓글 작성/삭제 시 즉시 반영
- React Query 캐시 업데이트로 자동 동기화

## 기술 스택

### 데이터베이스
- Supabase
- PostgreSQL
- RLS (Row Level Security)

### 프론트엔드
- React
- TypeScript
- React Query
- Radix UI (Sheet, Avatar)
- shadcn/ui

### API
- Repository 패턴
- React Query Hooks

## 데이터베이스 스키마

### calendar_comments 테이블
```sql
CREATE TABLE calendar_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id TEXT NOT NULL, -- farm_id를 calendar_id로 사용
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### RLS 정책
1. **댓글 읽기**: 소유자, editor, commenter
2. **댓글 작성**: 소유자, editor, commenter
3. **댓글 수정**: 본인이 작성한 댓글만
4. **댓글 삭제**: 본인이 작성한 댓글 또는 소유자

## 구현 파일

### 마이그레이션
- `supabase/migrations/create_calendar_comments_table.sql`

### Repository
- `src/shared/api/calendar-comment.repository.ts`

### API & Hooks
- `src/features/calendar-comments/api/calendar-comment.api.ts`
- `src/features/calendar-comments/model/calendar-comment.hooks.ts`

### UI 컴포넌트
- `src/features/calendar-comments/ui/CalendarCommentsPanel.tsx`

### 통합
- `src/components/farm-calendar-grid.tsx` (댓글 버튼 추가)

## 사용 방법

1. 캘린더 페이지에서 우측 상단의 댓글 버튼 클릭
2. 사이드패널에서 댓글 작성/조회
3. 본인 댓글 삭제 가능
4. 권한에 따라 읽기/쓰기 제한

## 보안 고려사항
- RLS 정책으로 데이터베이스 레벨 보안 강화
- 사용자 ID 확인으로 요청 무결성 보장
- 권한 체크로 UI 레벨 접근 제어

## 향후 개선사항
- 댓글 수정 기능 추가
- 댓글 알림 기능
- 댓글 검색 기능
- 댓글 좋아요 기능
- 파일 첨부 기능

