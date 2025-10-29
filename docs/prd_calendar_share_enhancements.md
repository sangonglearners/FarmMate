# PRD: 캘린더 공유 기능 개선 및 권한 제어 강화

## 📋 개요

### 목적
캘린더 공유 기능을 개선하여 농장과 작업 정보가 올바르게 공유되고, 사용자별 권한에 따라 적절한 기능 접근이 제어되도록 합니다.

### 배경
기존 캘린더 공유 기능에서 다음과 같은 개선이 필요했습니다:
- 캘린더 공유 시 해당 농장과 작업 정보가 공유 사용자에게 표시되어야 함
- 작물은 개인 정보이므로 공유되지 않아야 함
- 소유주는 공유받은 사용자가 등록한 작업도 자동으로 확인 가능해야 함
- 권한별 기능 접근 제어가 명확해야 함

---

## 🎯 핵심 기능

### 1. 농장 및 작업 정보 공유

#### 1.1 농장 공유
- 캘린더를 공유하면 해당 농장 정보가 공유 사용자에게 표시됨
- 공유받은 농장은 "친구 농장" 섹션에 표시됨
- 표시되는 정보:
  - 농장 이름
  - 농장 개수
  - 농장 면적 (㎡)
  - 이랑 개수
  - 작물 종류 수

#### 1.2 작업 정보 공유
- 공유받은 농장의 모든 작업이 공유 사용자에게 표시됨
- 소유주는 공유받은 사용자가 등록한 작업도 자동으로 확인 가능
- 작업 정보 포함:
  - 작업 제목
  - 작업 유형
  - 예정 일정
  - 완료 상태

### 2. 작물 정보 비공유
- 작물은 개인 정보이므로 절대 공유되지 않음
- 공유받은 사용자는 자신이 추가한 작물만 "내 작물 관리"에 표시됨
- 타인의 작물 정보는 절대 접근 불가

### 3. 권한별 기능 제어

#### 3.1 전체 권한 허용 (Editor)
- ✅ 작업 조회
- ✅ 작업 등록
- ✅ 작업 수정 (본인이 등록한 작업만)
- ✅ 작업 삭제 (본인이 등록한 작업만)
- ✅ 작업 완료 상태 변경 (본인이 등록한 작업만)
- ✅ Todo-List 표시

#### 3.2 댓글 허용 (Commenter)
- ✅ 작업 조회
- ❌ 작업 등록
- ❌ 작업 수정
- ❌ 작업 삭제
- ❌ 작업 완료 상태 변경
- ❌ Todo-List 표시 (현재 미구현 상태와 동일)

#### 3.3 읽기 허용 (Viewer)
- ✅ 작업 조회
- ❌ 작업 등록
- ❌ 작업 수정
- ❌ 작업 삭제
- ❌ 작업 완료 상태 변경
- ❌ Todo-List 표시
- 모든 편집 버튼 비활성화 및 툴팁 표시

### 4. 소유주 권한
- 소유주는 자신의 농장에서 등록된 모든 작업을 확인 가능
- 공유받은 사용자가 등록한 작업도 자동으로 표시됨
- 공유 설정 다이얼로그에서 소유주가 상단에 별도로 표시됨
- 소유주는 항상 "소유주" 배지로 표시됨

---

## 📐 기술 스펙

### Database 변경사항

#### 1. RLS 정책 개선
**파일**: `supabase/migrations/add_shared_calendar_rls_policies.sql`

##### 1.1 Farms 테이블
```sql
-- 소유주는 자신의 농장 조회 가능
CREATE POLICY "Users can view own farms"
ON farms FOR SELECT
USING (user_id::text = auth.uid()::text);

-- 공유받은 사용자는 공유받은 농장 조회 가능
CREATE POLICY "Users can view shared farms"
ON farms FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM calendar_shares cs
    WHERE cs.calendar_id::text = farms.id::text
    AND cs.shared_user_id::text = auth.uid()::text
  )
);
```

##### 1.2 Tasks_v1 테이블
```sql
-- 자신이 등록한 작업 조회
CREATE POLICY "Users can view own tasks v1"
ON tasks_v1 FOR SELECT
USING (user_id::text = auth.uid()::text);

-- 공유받은 농장의 모든 작업 조회
CREATE POLICY "Users can view shared tasks v1"
ON tasks_v1 FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM calendar_shares cs
    INNER JOIN farms f ON cs.calendar_id::text = f.id::text
    WHERE f.id::text = tasks_v1.farm_id::text
    AND cs.shared_user_id::text = auth.uid()::text
  )
);

-- 소유주는 자신의 농장의 모든 작업 조회 가능
CREATE POLICY "Users can view farm owner tasks v1"
ON tasks_v1 FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM farms f
    WHERE f.id::text = tasks_v1.farm_id::text
    AND f.user_id::text = auth.uid()::text
  )
);

-- 작업 등록: 소유주 또는 editor 권한만 가능
CREATE POLICY "Users can insert own tasks v1"
ON tasks_v1 FOR INSERT
WITH CHECK (
  user_id::text = auth.uid()::text
  AND (
    EXISTS (
      SELECT 1 FROM farms f
      WHERE f.id::text = tasks_v1.farm_id::text
      AND f.user_id::text = auth.uid()::text
    )
    OR EXISTS (
      SELECT 1 FROM calendar_shares cs
      INNER JOIN farms f ON cs.calendar_id::text = f.id::text
      WHERE f.id::text = tasks_v1.farm_id::text
      AND cs.shared_user_id::text = auth.uid()::text
      AND cs.role = 'editor'
    )
  )
);

-- 작업 수정: 소유주 또는 editor 권한이면서 본인이 등록한 작업만
CREATE POLICY "Users can update own tasks v1"
ON tasks_v1 FOR UPDATE
USING (
  user_id::text = auth.uid()::text
  AND (
    EXISTS (
      SELECT 1 FROM farms f
      WHERE f.id::text = tasks_v1.farm_id::text
      AND f.user_id::text = auth.uid()::text
    )
    OR EXISTS (
      SELECT 1 FROM calendar_shares cs
      INNER JOIN farms f ON cs.calendar_id::text = f.id::text
      WHERE f.id::text = tasks_v1.farm_id::text
      AND cs.shared_user_id::text = auth.uid()::text
      AND cs.role = 'editor'
    )
  )
);

-- 작업 삭제: 소유주 또는 editor 권한이면서 본인이 등록한 작업만
CREATE POLICY "Users can delete own tasks v1"
ON tasks_v1 FOR DELETE
USING (
  user_id::text = auth.uid()::text
  AND (
    EXISTS (
      SELECT 1 FROM farms f
      WHERE f.id::text = tasks_v1.farm_id::text
      AND f.user_id::text = auth.uid()::text
    )
    OR EXISTS (
      SELECT 1 FROM calendar_shares cs
      INNER JOIN farms f ON cs.calendar_id::text = f.id::text
      WHERE f.id::text = tasks_v1.farm_id::text
      AND cs.shared_user_id::text = auth.uid()::text
      AND cs.role = 'editor'
    )
  )
);
```

##### 1.3 Crops 테이블
```sql
-- 작물은 절대 공유되지 않음 - 본인의 작물만 조회 가능
CREATE POLICY "Users can view own crops"
ON crops FOR SELECT
USING (user_id::text = auth.uid()::text);
```

**중요**: `CREATE POLICY "Users can view shared crops"` 정책은 제거됨

#### 2. API 레벨 추가 필터링

**파일**: `src/shared/api/crop.repository.ts`

```typescript
async listByFarm(farmId?: string): Promise<CropEntity[]> {
  const userId = await this.withUserId()
  // 작물은 절대 공유되지 않음 - 본인의 작물만 조회
  let q = this.supabase
    .from('crops')
    .select('*')
    .eq('user_id', userId) // 명시적으로 본인의 작물만 필터링
  if (farmId) q = q.eq('farm_id', farmId)
  const { data, error } = await q.order('created_at', { ascending: false })
  // ...
}
```

### 3. 프론트엔드 권한 확인

#### 3.1 권한 확인 훅
**파일**: `src/features/calendar-share/model/calendar-share.hooks.ts`

```typescript
// 농장의 소유주 조회
export const useFarmOwner = (farmId: string) => {
  return useQuery<SharedUser | null>({
    queryKey: ["/api/farm-owner", farmId],
    queryFn: () => calendarShareApi.getFarmOwner(farmId),
    enabled: !!farmId,
  });
};

// 사용자의 농장별 권한 확인
export const useUserRoleForCalendar = (calendarId: string) => {
  return useQuery<UserRole>({
    queryKey: ["/api/user-role", calendarId],
    queryFn: () => calendarShareApi.getUserRoleForCalendar(calendarId),
    enabled: !!calendarId,
  });
};

// 여러 농장의 공유 여부 확인
export const useSharedFarmIds = (farmIds: string[]) => {
  return useQuery<Set<string>>({
    queryKey: ["/api/shared-farm-ids", farmIds.sort().join(",")],
    queryFn: () => calendarShareApi.getSharedFarmIds(farmIds),
    enabled: farmIds.length > 0,
  });
};

// 여러 농장의 소유주 정보 조회
export const useFarmOwners = (farmIds: string[]) => {
  return useQuery<Map<string, SharedUser>>({
    queryKey: ["/api/farm-owners", farmIds.sort().join(",")],
    queryFn: () => calendarShareApi.getFarmOwners(farmIds),
    enabled: farmIds.length > 0,
  });
};
```

#### 3.2 UI 권한 제어

##### Farm Calendar Grid
**파일**: `src/components/farm-calendar-grid.tsx`

```typescript
// 권한 확인
const { data: userRole } = useUserRoleForCalendar(selectedFarm?.id || "");
const canEditTask = selectedFarm 
  ? (selectedFarm.userId === user?.id || userRole === 'editor')
  : true;

// 작업 추가 버튼 비활성화
<Button 
  disabled={!canEditTask}
  title={!canEditTask ? "읽기 권한만 있어 작업을 추가할 수 없습니다" : ""}
>
  작업 추가
</Button>

// 작업 수정 버튼 비활성화
<Button 
  disabled={!canEditTask || task.userId !== user?.id}
  title={!canEditTask ? "읽기 권한만 있어 작업을 수정할 수 없습니다" : ...}
>
  수정
</Button>
```

##### Add Task Dialog
**파일**: `src/components/add-task-dialog-improved.tsx`

```typescript
// 권한 확인
const canEditTask = taskFarmId && farms 
  ? (() => {
      const farm = farms.find(f => f.id === taskFarmId);
      return farm ? (farm.userId === user?.id || userRole === 'editor') : true;
    })()
  : true;

// 삭제 버튼 비활성화
<Button
  disabled={deleteMutation.isPending || !canEditTask || task.userId !== user?.id}
  title={!canEditTask ? "읽기 권한만 있어 작업을 삭제할 수 없습니다" : ...}
>
  삭제
</Button>

// 수정 완료 버튼 비활성화
<Button
  disabled={... || (task && (!canEditTask || task.userId !== user?.id))}
  title={task && !canEditTask ? "읽기 권한만 있어 작업을 수정할 수 없습니다" : ...}
>
  수정 완료
</Button>
```

##### Todo List
**파일**: `src/components/todo-list.tsx`

```typescript
// 완료 체크박스 비활성화
const canEditTask = (task: TodoItem): boolean => {
  if (!task.farmId || !farms) return true;
  const farm = farms.find(f => f.id === task.farmId);
  if (!farm) return true;
  if (farm.userId === user?.id) return true;
  return false; // viewer는 완료 상태 변경 불가
};

<div 
  className={`... ${canEditTask(task) && task.userId === user?.id 
    ? "cursor-pointer" 
    : "cursor-not-allowed opacity-50"}`}
  onClick={(e) => {
    if (canEditTask(task) && task.userId === user?.id) {
      handleTaskToggle(task, e);
    }
  }}
>
```

---

## 🎨 UI/UX 개선사항

### 1. 공유 설정 다이얼로그
**파일**: `src/features/calendar-share/ui/CalendarShareDialog.tsx`

#### 1.1 소유주 표시
- 소유주는 별도의 노란색 카드로 상단에 표시
- 크라운 아이콘과 "소유주" 배지 표시
- 공유받은 사용자 리스트 위에 항상 표시

```tsx
{farmOwner && (
  <div className="border-2 border-amber-200 rounded-lg p-3 bg-amber-50/50">
    <Avatar className="ring-2 ring-amber-400">
      <AvatarFallback className="bg-amber-100 text-amber-700">
        <Crown className="w-4 h-4" />
      </AvatarFallback>
    </Avatar>
    <div>
      <p>{farmOwner.email}</p>
      {farmOwner.displayName && <p>{farmOwner.displayName}</p>}
    </div>
    <Badge className="bg-amber-50 text-amber-700 border-amber-300">
      소유주
    </Badge>
  </div>
)}
```

### 2. 농장 목록 페이지
**파일**: `src/pages/farms/ui/FarmsPage.tsx`

#### 2.1 내 농장 목록
- 공유되고 있는 농장은 파란색 배경으로 표시
- 파란색 아이콘으로 시각적 구분

```tsx
<Card className={isShared ? "border-blue-200 bg-blue-50/30" : ""}>
  <MapPin className={`w-4 h-4 ${isShared ? "text-blue-500" : "text-gray-500"}`} />
  <h3>{farm.name}</h3>
</Card>
```

#### 2.2 친구 농장 목록
- 공유받은 농장은 파란색 배경으로 표시
- 농장 이름 옆에 소유주 이름 표시

```tsx
<Card className="border-blue-200 bg-blue-50/30">
  <MapPin className="w-4 h-4 text-blue-500" />
  <h3 className="font-medium text-gray-900">{farm.name}</h3>
  <span className="text-xs text-gray-500">({ownerName})</span>
</Card>
```

---

## ✅ 구현 완료 사항

### Database
- [x] RLS 정책 수정 (farms, tasks_v1, crops)
- [x] 소유주 작업 조회 정책 추가
- [x] editor만 작업 등록 가능하도록 정책 수정
- [x] viewer/commenter는 작업 수정/삭제 불가하도록 정책 수정
- [x] 작물 공유 정책 제거

### API
- [x] `getFarmOwner` 함수 추가
- [x] `getSharedFarmIds` 함수 추가
- [x] `getFarmOwners` 함수 추가
- [x] `CropRepository.listByFarm`에 명시적 user_id 필터 추가

### Frontend 권한 확인
- [x] `useFarmOwner` 훅 추가
- [x] `useSharedFarmIds` 훅 추가
- [x] `useFarmOwners` 훅 추가
- [x] `useUserRoleForCalendar` 훅 활용

### UI 권한 제어
- [x] Farm Calendar Grid - 작업 추가/수정 버튼 비활성화
- [x] Add Task Dialog - 삭제/수정 버튼 비활성화
- [x] Edit Task Dialog - 수정 버튼 비활성화
- [x] Todo List - 완료 체크박스 비활성화
- [x] 모든 비활성 버튼에 툴팁 추가

### UI 개선
- [x] 공유 설정 다이얼로그 - 소유주 상단 표시
- [x] 농장 목록 - 공유된 농장 파란색 배경 표시
- [x] 친구 농장 - 소유주 이름 표시
- [x] 중복된 소유주 배지 제거

---

## 🔒 보안 고려사항

### 1. RLS 정책 이중 검증
- 데이터베이스 레벨: RLS 정책으로 기본 보안 보장
- API 레벨: Repository에서 명시적 필터링 추가
- 프론트엔드 레벨: UI에서 권한 확인 후 버튼 비활성화

### 2. 작물 정보 보호
- RLS 정책에서 공유 정책 제거
- API 레벨에서 명시적 user_id 필터링
- 프론트엔드에서 공유받은 작물 표시 제거

### 3. 타입 캐스팅
- UUID와 TEXT 타입 불일치 문제 해결
- 모든 RLS 정책에서 `::text` 캐스팅 적용

---

## 📝 주요 변경 파일

### Database
- `supabase/migrations/add_shared_calendar_rls_policies.sql`

### API
- `src/shared/api/crop.repository.ts`
- `src/shared/api/calendar-share.repository.ts`
- `src/features/calendar-share/api/calendar-share.api.ts`

### Hooks
- `src/features/calendar-share/model/calendar-share.hooks.ts`

### UI Components
- `src/components/farm-calendar-grid.tsx`
- `src/components/add-task-dialog-improved.tsx`
- `src/components/edit-task-dialog.tsx`
- `src/components/todo-list.tsx`
- `src/features/calendar-share/ui/CalendarShareDialog.tsx`
- `src/pages/farms/ui/FarmsPage.tsx`

---

## 🎯 성공 지표

### 기능 정확성
- ✅ 캘린더 공유 시 농장 정보가 올바르게 표시됨
- ✅ 작업 정보가 공유 사용자에게 표시됨
- ✅ 작물은 절대 공유되지 않음
- ✅ 소유주는 모든 작업을 확인 가능

### 권한 제어
- ✅ Viewer 권한은 작업 조회만 가능
- ✅ Editor 권한은 작업 등록/수정/삭제 가능 (본인 작업만)
- ✅ 모든 편집 버튼이 권한에 따라 적절히 비활성화됨
- ✅ 비활성 버튼에 명확한 툴팁 표시

### 사용자 경험
- ✅ 소유주가 공유 설정에서 명확히 구분됨
- ✅ 공유된 농장이 시각적으로 구분됨
- ✅ 소유주 이름이 친구 농장에 표시됨
- ✅ 권한 부족 시 명확한 안내 메시지 표시

---

## 📚 관련 문서

- `prd_calendar_share_with_permissions.md` - 기본 캘린더 공유 기능 PRD
- `supabase/migrations/add_shared_calendar_rls_policies.sql` - RLS 정책 구현

---

## 🔄 향후 개선 사항

### 1. Todo-List 권한 제어
- Editor 권한을 가진 농장의 작업만 Todo-List에 표시
- Viewer/Commenter 권한만 있는 경우 Todo-List 숨김
- **현재**: 사용자가 해당 기능 제거

### 2. Commenter 권한 기능
- 댓글 기능 구현
- Commenter 권한으로 댓글 작성 가능하도록 확장

### 3. 권한 변경 알림
- 권한 변경 시 알림 전송
- 이메일/푸시 알림 연동

### 4. 성능 최적화
- 여러 농장 권한 일괄 조회 최적화
- React Query 캐싱 전략 개선

