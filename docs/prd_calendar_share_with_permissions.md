# PRD: 캘린더 공유 기능 (권한 기반)

## 📋 개요

### 목적
캘린더 단위로 다른 사용자와 공유하고, 사용자별로 서로 다른 권한 레벨을 부여할 수 있는 기능을 제공합니다.

### 배경
현재 시스템은 1:1 친구 관계를 통한 캘린더 조회만 가능합니다. 사용자들은 더 유연한 공유 시스템을 필요로 하며, 특히 협업 환경에서는 각 사용자의 역할에 따라 다른 권한이 필요합니다.

---

## 🎯 핵심 기능

### 1. 공유 대상
- **캘린더 전체 단위 공유**: 메뉴바의 "캘린더"를 단위로 공유
- 공유받은 사용자는 해당 캘린더의 모든 작업(이벤트)을 볼 수 있음

### 2. 권한 레벨
사용자별로 지정하는 세 가지 권한:

#### 2.1 전체 허용 (Editor)
- 캘린더의 작업(이벤트) 생성, 수정, 삭제 가능
- 원래 소유자와 거의 동일한 권한

#### 2.2 댓글 허용 (Commenter)
- 작업(이벤트) 상세에 댓글을 달 수 있음
- 작업 수정/삭제는 불가
- **현재 미구현**: UI에는 표시하되 비활성 상태

#### 2.3 읽기 허용 (Viewer)
- 캘린더와 작업을 보기만 가능
- 수정, 삭제, 댓글 모두 불가

### 3. 댓글 기능 (향후 구현)
피그마 스타일의 annotation 시스템:
- 각 작업(이벤트)에 댓글 달기
- 댓글 인디케이터로 댓글 존재 표시
- 인디케이터 클릭 시 오른쪽 패널/팝오버로 댓글 리스트 열림
- 댓글 작성, 읽기, 작성자/타임스탬프 표시
- **현재는 placeholder 필드만 준비** (`comment_count` 등)

---

## 📐 기술 스펙

### Database 변경사항

#### 1. 캘린더 공유 설정 테이블
```sql
-- calendar_shares 테이블
CREATE TABLE calendar_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  calendar_id UUID NOT NULL, -- 캘린더 ID (현재는 user_id로 구분)
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('editor', 'commenter', 'viewer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(calendar_id, shared_user_id)
);

-- 인덱스
CREATE INDEX idx_calendar_shares_calendar ON calendar_shares(calendar_id);
CREATE INDEX idx_calendar_shares_user ON calendar_shares(shared_user_id);
CREATE INDEX idx_calendar_shares_owner ON calendar_shares(owner_id);
```

#### 2. RLS 정책 설정
```sql
ALTER TABLE calendar_shares ENABLE ROW LEVEL SECURITY;

-- 소유자는 모든 공유 설정 조회 가능
CREATE POLICY "Owners can view calendar shares"
ON calendar_shares FOR SELECT
USING (owner_id = auth.uid());

-- 공유받은 사용자는 자신의 권한 정보 조회 가능
CREATE POLICY "Shared users can view own permissions"
ON calendar_shares FOR SELECT
USING (shared_user_id = auth.uid());

-- 소유자는 공유 설정 생성/수정/삭제 가능
CREATE POLICY "Owners can manage calendar shares"
ON calendar_shares FOR ALL
USING (owner_id = auth.uid());

-- shared_user_id는 소유자 자신은 불가 (자기 자신 공유 방지)
CREATE POLICY "Cannot share with self"
ON calendar_shares FOR INSERT
WITH CHECK (owner_id != shared_user_id);
```

#### 3. Tasks 테이블 권한 체크용 뷰 (선택사항)
```sql
-- 캘린더 권한을 포함한 tasks 뷰
CREATE VIEW tasks_with_permissions AS
SELECT 
  t.*,
  CASE 
    WHEN t.user_id = auth.uid() THEN 'owner'
    WHEN EXISTS (
      SELECT 1 FROM calendar_shares cs
      WHERE cs.calendar_id = t.user_id
      AND cs.shared_user_id = auth.uid()
      AND cs.role = 'editor'
    ) THEN 'editor'
    WHEN EXISTS (
      SELECT 1 FROM calendar_shares cs
      WHERE cs.calendar_id = t.user_id
      AND cs.shared_user_id = auth.uid()
      AND cs.role = 'commenter'
    ) THEN 'commenter'
    WHEN EXISTS (
      SELECT 1 FROM calendar_shares cs
      WHERE cs.calendar_id = t.user_id
      AND cs.shared_user_id = auth.uid()
      AND cs.role = 'viewer'
    ) THEN 'viewer'
    ELSE 'none'
  END as user_role
FROM tasks t;
```

#### 4. 댓글 기능을 위한 테이블 (향후)
```sql
-- task_comments 테이블 (향후 구현)
CREATE TABLE task_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_task_comments_task ON task_comments(task_id);
```

---

## 🎨 UI/UX 설계

### 1. 공유 버튼 위치
- **위치**: 캘린더 화면 우측 상단
- **스타일**: 노션의 "Share" 버튼과 유사
- **아이콘**: ShareIcon 또는 UsersIcon

### 2. 공유 다이얼로그 구성

#### 2.1 상단 영역
```
┌─────────────────────────────────────┐
│  공유 설정                    [X]   │
├─────────────────────────────────────┤
│  캘린더를 다른 사람과 공유하세요     │
│                                      │
│  [이메일 입력 필드] [초대] 버튼      │
└─────────────────────────────────────┘
```

#### 2.2 공유된 사용자 리스트
```
┌─────────────────────────────────────┐
│  공유된 사용자:                       │
├─────────────────────────────────────┤
│  user@example.com                   │
│  └─ [전체 허용 ▼]    [🗑️]           │
│                                      │
│  friend@example.com                  │
│  └─ [읽기 허용 ▼]    [🗑️]           │
└─────────────────────────────────────┘
```

#### 2.3 권한 드롭다운 옵션
- **전체 허용** (editor)
- **댓글 허용** (commenter) - 비활성 (준비 중)
- **읽기 허용** (viewer)

### 3. 사용자 검색 기능
- 이메일 입력 시 자동완성
- 시스템에 존재하는 사용자만 검색
- 검색 결과에 사용자 이름(또는 이메일) 표시

### 4. 권한별 캘린더 인터랙션

#### 4.1 전체 허용 (Editor)
- ✅ 드래그로 일정 이동
- ✅ 일정 수정 폼 열기
- ✅ 삭제 가능
- ✅ 새 일정 만들기 버튼 활성화

#### 4.2 댓글 허용 (Commenter) - 미구현
- ❌ 수정/삭제 버튼 비활성
- ✅ 일정 상세에서 "댓글 달기" 버튼만 활성화
- ❌ 일정 제목/시간 등 read-only

#### 4.3 읽기 허용 (Viewer)
- ✅ 일정 클릭 시 상세보기만 가능 (읽기 전용)
- ❌ 수정 관련 UI 숨김 또는 disabled
- ❌ 새 일정 만들기 버튼 숨김

---

## 🔧 구현 단계

### Phase 1: Database 설정 (0.5일)
**파일**: `supabase/migrations/add_calendar_shares.sql`

- [ ] `calendar_shares` 테이블 생성
- [ ] RLS 정책 설정
- [ ] 인덱스 생성
- [ ] 마이그레이션 실행 및 테스트

### Phase 2: Backend API (1일)
**파일**: `FarmMate/src/shared/api/calendar-share.repository.ts`

```typescript
// 필수 함수
- searchUserByEmail(email: string): Promise<User[]>
- shareCalendarWithUser(calendarId: string, userId: string, role: 'editor' | 'commenter' | 'viewer'): Promise<void>
- getSharedUsers(calendarId: string): Promise<SharedUser[]>
- updateUserPermission(shareId: string, role: 'editor' | 'commenter' | 'viewer'): Promise<void>
- removeSharedUser(shareId: string): Promise<void>
- getUserRoleForCalendar(calendarId: string): Promise<'owner' | 'editor' | 'commenter' | 'viewer' | null>
```

### Phase 3: 공유 다이얼로그 컴포넌트 (1일)
**파일**: `FarmMate/src/components/calendar-share-dialog.tsx`

- [ ] 이메일 입력 필드
- [ ] 사용자 검색 기능
- [ ] 공유된 사용자 리스트
- [ ] 권한 드롭다운 (3가지 옵션)
- [ ] 제거 버튼
- [ ] 실시간 업데이트 (노션 스타일)

### Phase 4: 캘린더에 공유 버튼 추가 (0.5일)
**파일**: `FarmMate/src/components/farm-calendar-grid.tsx`

- [ ] 우측 상단 Share 버튼 추가
- [ ] 공유 다이얼로그 모달 연동

### Phase 5: 권한 기반 UI 제어 (1일)
**파일**: `FarmMate/src/components/farm-calendar-grid.tsx`, `FarmMate/src/components/task-card.tsx`

- [ ] 현재 사용자의 권한 체크 로직
- [ ] Viewer: 수정/삭제 버튼 숨김
- [ ] Editor: 모든 버튼 활성화
- [ ] Commenter: UI 준비 (현재는 Viewer와 동일하게 처리)

### Phase 6: 댓글 placeholder 구조 (0.5일)
**파일**: `FarmMate/shared/schema.ts`, `FarmMate/src/entities/task/model/`

- [ ] Task 타입에 `comment_count` 필드 추가 (향후)
- [ ] 댓글 인디케이터 아이콘 자리 준비 (비활성)

---

## 🎨 UI 플로우

```
캘린더 화면
  └─ [공유] 버튼 클릭
       ↓
  공유 다이얼로그 열림
  ├─ 이메일 입력 → [초대] 버튼
  ├─ 사용자 자동완성 검색
  └─ 공유된 사용자 리스트 표시
       ├─ 권한 드롭다운 변경 (즉시 적용)
       └─ [🗑️] 제거 버튼

권한에 따른 캘린더 동작
  ├─ Editor: 모든 작업 가능 (생성/수정/삭제)
  ├─ Commenter: 댓글만 가능 (미구현, 현재 Viewer와 동일)
  └─ Viewer: 읽기 전용 (일정 추가 버튼 숨김)
```

---

## ✅ 체크리스트

### Database
- [ ] 마이그레이션 파일 작성
- [ ] Supabase에 마이그레이션 실행
- [ ] RLS 정책 테스트
- [ ] 인덱스 성능 확인

### API
- [ ] `calendar-share.repository.ts` 구현
- [ ] 사용자 검색 API
- [ ] 권한 CRUD API
- [ ] React Query hooks 작성

### Frontend
- [ ] `CalendarShareDialog.tsx` 컴포넌트 구현
- [ ] 이메일 입력 및 자동완성
- [ ] 권한 드롭다운
- [ ] 사용자 제거 기능
- [ ] `farm-calendar-grid.tsx`에 공유 버튼 추가
- [ ] 권한 기반 UI 제어 로직
- [ ] 댓글 placeholder 추가

### 테스트
- [ ] 캘린더 공유 생성 테스트
- [ ] 권한 변경 테스트
- [ ] 공유 해제 테스트
- [ ] Editor 권한 동작 확인
- [ ] Viewer 권한 동작 확인
- [ ] Commenter UI 확인 (비활성 상태)

---

## 📝 데이터 구조

### TypeScript 타입 정의

```typescript
// 캘린더 공유 설정
interface CalendarShare {
  id: string;
  calendarId: string;
  ownerId: string;
  sharedUserId: string;
  role: 'editor' | 'commenter' | 'viewer';
  createdAt: string;
  updatedAt: string;
}

// 공유된 사용자 (리스트 표시용)
interface SharedUser {
  shareId: string;
  userId: string;
  email: string;
  displayName?: string;
  role: 'editor' | 'commenter' | 'viewer';
}

// 사용자 검색 결과
interface SearchableUser {
  id: string;
  email: string;
  displayName?: string;
}

// 현재 사용자의 캘린더 권한
type UserRole = 'owner' | 'editor' | 'commenter' | 'viewer' | null;
```

---

## 🚫 제외 항목 (v1에서)

- 댓글 기능 실제 구현 (placeholder만)
- 권한 변경 알림 (이메일/푸시)
- 공유 링크 생성 (일반 공개 링크)
- 권한 변경 히스토리
- 개별 작업 단위 공유 (캘린더 전체만)
- 실시간 권한 업데이트 (Supabase Realtime)

---

## 📊 예상 일정

| Phase | 작업 | 소요 시간 |
|-------|------|-----------|
| 1 | Database 설정 | 0.5일 |
| 2 | Backend API | 1일 |
| 3 | 공유 다이얼로그 컴포넌트 | 1일 |
| 4 | 공유 버튼 추가 | 0.5일 |
| 5 | 권한 기반 UI 제어 | 1일 |
| 6 | 댓글 placeholder | 0.5일 |
| **합계** | | **4.5일** |

---

## 🔒 보안 고려사항

1. **RLS 정책 필수**: 모든 테이블에 RLS 적용
2. **권한 체크**: 프론트엔드 + 백엔드 양쪽에서 권한 검증
3. **자기 자신 공유 방지**: 소유자 자신을 공유 대상에서 제외
4. **개인정보 최소화**: 이메일/이름만 공유 리스트에 표시
5. **권한 변경 감사**: 향후 로그 기록 가능하도록 구조 설계

---

## 📝 참고사항

- 기존 캘린더 UI/UX는 최대한 유지하면서 권한만 추가
- 노션의 Share 기능을 참고하여 UX 설계
- Commenter 권한은 UI에 표시하되 기능은 미구현 (준비 중 툴팁)
- 댓글 기능은 향후 Phase 2로 예정
- Supabase Auth의 user ID 활용
- React Query로 캐싱 최적화

---

## 🎯 성공 지표

### 사용자 경험
- 캘린더를 다른 사용자와 쉽게 공유 가능
- 권한에 따른 명확한 UI 구분 (Editor/Viewer)
- 노션 수준의 직관적인 공유 플로우

### 기술적 안정성
- RLS 정책 100% 적용
- 권한 변경 즉시 반영
- 권한 오류 0건

### 향후 확장성
- 댓글 기능 추가 시 쉬운 연동 가능
- 권한 히스토리 추가 용이
- 개별 작업 공유로 확장 가능한 구조

