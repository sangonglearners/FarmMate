# PRD: 캘린더 공유 기능

## 📋 개요
구글 계정 기반 사용자 간 캘린더 공유 기능. 친구 요청/승인을 통해 상대방의 농장 캘린더를 읽기 전용으로 조회할 수 있습니다.

**마감일**: [촉박함]  
**우선순위**: MVP 필수 기능만 구현

---

## 🎯 핵심 기능
1. 친구 요청/승인/거절
2. 친구 목록 조회
3. 친구 캘린더 읽기 전용 조회

---

## 📐 기술 스펙

### Database 변경

#### 1. 기존 테이블 수정
```sql
-- Step 1: 기존 테이블에 user_id 추가
ALTER TABLE farms ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE crops ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE tasks ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Step 2: 기존 데이터에 현재 로그인한 유저 ID 자동 설정 (마이그레이션 시)
-- RLS 정책으로 처리 예정
```

#### 2. 새 테이블 생성
```sql
-- friendships 테이블
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(requester_id, addressee_id)
);

-- 인덱스
CREATE INDEX idx_friendships_requester ON friendships(requester_id);
CREATE INDEX idx_friendships_addressee ON friendships(addressee_id);
CREATE INDEX idx_friendships_status ON friendships(status);

-- user_profiles 테이블 (표시용 정보)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 3. RLS 정책 설정
```sql
-- farms 테이블 RLS
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own farms"
ON farms FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can view friends' farms"
ON farms FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM friendships
    WHERE status = 'accepted'
    AND ((requester_id = auth.uid() AND addressee_id = farms.user_id)
    OR (addressee_id = auth.uid() AND requester_id = farms.user_id))
  )
);

CREATE POLICY "Users can manage own farms"
ON farms FOR ALL
USING (user_id = auth.uid());

-- crops 테이블 RLS (동일 패턴)
ALTER TABLE crops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own crops"
ON crops FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can view friends' crops"
ON crops FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM friendships
    WHERE status = 'accepted'
    AND ((requester_id = auth.uid() AND addressee_id = crops.user_id)
    OR (addressee_id = auth.uid() AND requester_id = crops.user_id))
  )
);

CREATE POLICY "Users can manage own crops"
ON crops FOR ALL
USING (user_id = auth.uid());

-- tasks 테이블 RLS (동일 패턴)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tasks"
ON tasks FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can view friends' tasks"
ON tasks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM friendships
    WHERE status = 'accepted'
    AND ((requester_id = auth.uid() AND addressee_id = tasks.user_id)
    OR (addressee_id = auth.uid() AND requester_id = tasks.user_id))
  )
);

CREATE POLICY "Users can manage own tasks"
ON tasks FOR ALL
USING (user_id = auth.uid());

-- friendships 테이블 RLS
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own friendships"
ON friendships FOR SELECT
USING (requester_id = auth.uid() OR addressee_id = auth.uid());

CREATE POLICY "Users can create friendships"
ON friendships FOR INSERT
WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Users can update own friendships"
ON friendships FOR UPDATE
USING (requester_id = auth.uid() OR addressee_id = auth.uid());

-- user_profiles 테이블 RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles"
ON user_profiles FOR SELECT
USING (true);

CREATE POLICY "Users can update own profile"
ON user_profiles FOR ALL
USING (id = auth.uid());
```

---

## 🔧 구현 단계

### Phase 1: DB 설정 (1일)
**파일**: `supabase/migrations/add_calendar_sharing.sql`

- [ ] 기존 테이블에 user_id 컬럼 추가
- [ ] friendships, user_profiles 테이블 생성
- [ ] RLS 정책 설정
- [ ] 인덱스 생성
- [ ] 마이그레이션 실행 및 테스트

### Phase 2: Backend API (1일)
**디렉토리**: `FarmMate/src/shared/api/`

#### 2.1 친구 관계 API
**파일**: `friendship.repository.ts`
```typescript
// 필수 함수만
- searchUserByEmail(email: string)
- sendFriendRequest(addresseeId: string)
- acceptFriendRequest(friendshipId: string)
- rejectFriendRequest(friendshipId: string)
- getFriendsList()
- getPendingRequests()
```

#### 2.2 기존 API 수정
**파일**: `farm.repository.ts`, `crop.repository.ts`, `tasks.ts`
```typescript
// 각 API에 추가
- getFarmsByUserId(userId: string) // 친구 농장 조회
- getCropsByUserId(userId: string) // 친구 작물 조회
- getTasksByUserId(userId: string) // 친구 작업 조회
```

### Phase 3: Frontend - 친구 관리 (1일)
**디렉토리**: `FarmMate/src/features/friendship/`

#### 3.1 친구 리스트 페이지
**파일**: `FarmMate/src/pages/friends/ui/FriendsPage.tsx`
```
구조:
- 친구 검색 (이메일로)
- 받은 요청 목록 (pending)
- 친구 목록 (accepted)
- 각 친구 클릭 → 친구 농장 리스트
```

#### 3.2 컴포넌트
- `FriendSearchDialog.tsx` - 친구 검색/추가
- `FriendRequestCard.tsx` - 받은 요청 카드
- `FriendCard.tsx` - 친구 카드 (농장 목록 포함)

### Phase 4: Frontend - 친구 캘린더 조회 (0.5일)
**파일**: `FarmMate/src/pages/friends/ui/FriendCalendarPage.tsx`

- [ ] 기존 `FarmCalendarGrid` 컴포넌트 재사용
- [ ] Props에 `userId`, `readOnly` 추가
- [ ] URL 파라미터로 친구 ID 전달 (`/friends/:userId/calendar`)
- [ ] 읽기 전용 모드 UI 처리 (작업 추가 버튼 숨김)

### Phase 5: 네비게이션 통합 (0.5일)

#### 5.1 캘린더 탭에 버튼 추가
**파일**: `FarmMate/src/components/farm-calendar-grid.tsx`
```tsx
// 헤더 영역에 버튼 추가
<Button onClick={() => navigate('/friends')}>
  친구 캘린더 보기
</Button>
```

#### 5.2 라우팅 설정
**파일**: `FarmMate/src/app/routes.tsx`
```tsx
<Route path="/friends" component={FriendsPage} />
<Route path="/friends/:userId/calendar" component={FriendCalendarPage} />
```

---

## 🎨 UI 플로우

```
캘린더 탭
  └─ [친구 캘린더 보기] 버튼
       ↓
  친구 목록 페이지 (/friends)
  ├─ 친구 검색 (이메일)
  ├─ 받은 요청 (수락/거절)
  └─ 친구 목록
       └─ 친구 카드 클릭
            ↓
       친구 농장 목록 표시
            └─ 농장 선택
                 ↓
            친구 캘린더 페이지 (/friends/:userId/calendar)
            (읽기 전용)
```

---

## ✅ 체크리스트

### Database
- [ ] 마이그레이션 파일 작성
- [ ] Supabase에 마이그레이션 실행
- [ ] RLS 정책 테스트

### API
- [ ] friendship.repository.ts 구현
- [ ] 기존 API에 userId 파라미터 추가
- [ ] React Query hooks 작성

### Frontend
- [ ] FriendsPage 구현
- [ ] FriendCalendarPage 구현
- [ ] FarmCalendarGrid에 readOnly 모드 추가
- [ ] 라우팅 설정

### 테스트
- [ ] 친구 요청 → 승인 플로우
- [ ] 친구 캘린더 조회 권한 확인
- [ ] 읽기 전용 모드 동작 확인
- [ ] RLS 우회 불가능 확인

---

## 🚫 제외 항목 (v1에서)
- 알림 시스템 (푸시 알림)
- 실시간 업데이트 (Supabase Realtime)
- 친구 그룹 기능
- 메시지 기능
- 캘린더 권한 세분화 (읽기/쓰기)

---

## 📊 예상 일정

| Phase | 작업 | 소요 시간 |
|-------|------|-----------|
| 1 | DB 설정 | 1일 |
| 2 | Backend API | 1일 |
| 3 | 친구 관리 UI | 1일 |
| 4 | 친구 캘린더 조회 | 0.5일 |
| 5 | 통합 및 테스트 | 0.5일 |
| **합계** | | **4일** |

---

## 🔒 보안 고려사항
1. **RLS 정책 필수**: 모든 테이블에 RLS 적용
2. **이메일 검색 제한**: rate limiting 필요 시 추가
3. **읽기 전용 강제**: UI + Backend 양쪽에서 보장
4. **개인정보 최소화**: user_profiles에는 필수 정보만

---

## 📝 참고사항
- 기존 캘린더 UI/UX 100% 재사용
- Supabase Auth의 user ID 활용
- React Query로 캐싱 최적화
- 친구 관계는 양방향 (A-B 승인되면 B도 A 조회 가능)

