# PRD: 캘린더 공유 기능 개선 및 권한 제어 강화

## 📑 목차

1. [개요](#-개요)
2. [핵심 기능](#-핵심-기능)
3. [기술 스펙](#-기술-스펙)
4. [UI/UX 개선사항](#-uiux-개선사항)
5. [구현 완료 사항](#-구현-완료-사항)
6. [보안 고려사항](#-보안-고려사항)
7. [주요 변경 파일](#-주요-변경-파일)
8. [성공 지표](#-성공-지표)
9. [관련 문서](#-관련-문서)
10. [향후 개선 사항](#-향후-개선-사항)

---

## 📋 개요

### 목적
캘린더 공유 기능을 개선하여 농장과 작업 정보가 올바르게 공유되고, 사용자별 권한에 따라 적절한 기능 접근이 제어되도록 합니다.

### 배경
기존 캘린더 공유 기능에서 다음과 같은 개선이 필요했습니다:
- 캘린더 공유 시 해당 농장과 작업 정보가 공유 사용자에게 표시되어야 함
- 작물은 개인 정보이므로 공유되지 않아야 함
- 소유주는 공유받은 사용자가 등록한 작업도 자동으로 확인 가능해야 함
- 권한별 기능 접근 제어가 명확해야 함

### 사용자 역할 정의
- **소유주 (Owner)**: 농장을 생성한 사용자, 모든 권한 보유
- **에디터 (Editor)**: 작업 등록/수정/삭제 권한 보유 (본인 작업만)
- **댓글러 (Commenter)**: 작업 조회 및 댓글 작성 권한 (현재 미구현)
- **뷰어 (Viewer)**: 작업 조회만 가능

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

#### 3.1 권한 매트릭스

| 기능 | 소유주 | Editor | Commenter | Viewer |
|------|--------|--------|-----------|--------|
| **농장 정보 조회** | ✅ | ✅ | ✅ | ✅ |
| **작업 조회** | ✅ 모든 작업 | ✅ 모든 작업 | ✅ 모든 작업 | ✅ 모든 작업 |
| **작업 등록** | ✅ | ✅ | ❌ | ❌ |
| **작업 수정** | ✅ 모든 작업 | ✅ 본인 작업만 | ❌ | ❌ |
| **작업 삭제** | ✅ 모든 작업 | ✅ 본인 작업만 | ❌ | ❌ |
| **작업 완료 상태 변경** | ✅ 모든 작업 | ✅ 본인 작업만 | ❌ | ❌ |
| **Todo-List 표시** | ✅ | ✅ | ❌ (미구현) | ❌ |
| **작물 정보 조회** | ✅ 본인 작물만 | ✅ 본인 작물만 | ✅ 본인 작물만 | ✅ 본인 작물만 |
| **댓글 작성** | ✅ | ✅ | ✅ (미구현) | ❌ |

#### 3.2 권한별 상세 설명

##### 3.2.1 소유주 (Owner)
- 농장을 생성한 사용자
- 해당 농장의 모든 작업에 대해 제한 없이 조회/등록/수정/삭제 가능
- 공유받은 사용자가 등록한 작업도 자동으로 확인 가능
- 공유 설정 관리 권한
- "소유주" 배지로 시각적 표시

##### 3.2.2 에디터 (Editor)
- 작업 조회: 공유받은 농장의 모든 작업 조회 가능
- 작업 등록: 새 작업 등록 가능
- 작업 수정/삭제: **본인이 등록한 작업만** 수정/삭제 가능
- 작업 완료 상태 변경: **본인이 등록한 작업만** 완료 상태 변경 가능
- Todo-List: Editor 권한이 있는 농장의 작업 표시

##### 3.2.3 댓글러 (Commenter)
- 작업 조회: 공유받은 농장의 모든 작업 조회 가능
- 작업 등록/수정/삭제: 불가능
- 댓글 작성: 기능 미구현 (향후 구현 예정)
- Todo-List: 표시되지 않음

##### 3.2.4 뷰어 (Viewer)
- 작업 조회: 공유받은 농장의 모든 작업 조회만 가능
- 모든 편집 기능: 비활성화
- 버튼 비활성화 시 툴팁으로 권한 부족 안내 표시
- Todo-List: 표시되지 않음

### 4. 소유주 권한 및 특별 기능

#### 4.1 소유주의 권한
- 자신의 농장에서 등록된 모든 작업을 확인 가능
- 공유받은 사용자가 등록한 작업도 자동으로 표시 및 관리 가능
- 타인이 등록한 작업도 수정/삭제 가능 (모든 작업에 대한 완전한 제어권)

#### 4.2 소유주 UI 표시
- 공유 설정 다이얼로그에서 소유주가 상단에 별도로 표시
- 노란색 카드와 크라운 아이콘으로 구분
- "소유주" 배지로 항상 명확히 표시
- 공유받은 사용자 리스트 위에 항상 표시

---

## 📐 기술 스펙

### 개요
이 기능은 3계층 보안 구조를 통해 데이터 보호와 권한 제어를 구현합니다:
1. **Database 레벨**: RLS (Row Level Security) 정책으로 기본 보안 보장
2. **API 레벨**: Repository에서 명시적 필터링 추가
3. **Frontend 레벨**: UI에서 권한 확인 후 기능 제어

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

### Database 레벨

#### RLS 정책 개선
- [x] Farms 테이블: 소유주 및 공유받은 사용자 조회 정책
- [x] Tasks_v1 테이블: 작업 조회 정책 (소유주, 공유받은 사용자, 본인 작업)
- [x] Tasks_v1 테이블: 작업 등록 정책 (소유주 또는 Editor 권한만)
- [x] Tasks_v1 테이블: 작업 수정 정책 (소유주 또는 Editor 권한 + 본인 작업만)
- [x] Tasks_v1 테이블: 작업 삭제 정책 (소유주 또는 Editor 권한 + 본인 작업만)
- [x] Crops 테이블: 작물 공유 정책 제거 (본인 작물만 조회 가능)

#### 데이터 보호
- [x] 작물 정보 절대 공유 방지
- [x] UUID/TEXT 타입 캐스팅으로 쿼리 호환성 확보

### API 레벨

#### Repository 함수 추가
- [x] `getFarmOwner`: 농장 소유주 조회
- [x] `getSharedFarmIds`: 여러 농장의 공유 여부 확인
- [x] `getFarmOwners`: 여러 농장의 소유주 정보 일괄 조회
- [x] `CropRepository.listByFarm`: 명시적 user_id 필터링 추가

### Frontend 권한 확인

#### Custom Hooks 구현
- [x] `useFarmOwner`: 농장 소유주 조회 훅
- [x] `useSharedFarmIds`: 여러 농장 공유 여부 확인 훅
- [x] `useFarmOwners`: 여러 농장 소유주 정보 조회 훅
- [x] `useUserRoleForCalendar`: 사용자의 농장별 권한 확인 훅

### UI 권한 제어

#### 컴포넌트별 권한 제어 구현
- [x] **Farm Calendar Grid**: 작업 추가/수정 버튼 비활성화
- [x] **Add Task Dialog**: 삭제/수정 버튼 비활성화
- [x] **Edit Task Dialog**: 수정 버튼 비활성화
- [x] **Todo List**: 완료 체크박스 비활성화
- [x] **모든 비활성 버튼**: 권한 부족 안내 툴팁 추가

### UI/UX 개선

#### 시각적 개선
- [x] 공유 설정 다이얼로그: 소유주 상단 노란색 카드 표시
- [x] 공유 설정 다이얼로그: 크라운 아이콘 및 "소유주" 배지 표시
- [x] 농장 목록: 공유된 농장 파란색 배경으로 시각적 구분
- [x] 친구 농장 목록: 소유주 이름 표시
- [x] 중복된 소유주 배지 제거

#### 사용자 경험 개선
- [x] 권한 부족 시 명확한 툴팁 메시지 표시
- [x] 버튼 비활성화로 실수 방지
- [x] 시각적 구분으로 공유 상태 명확히 인지

---

## 🔒 보안 고려사항

### 다층 보안 구조

#### 1. 데이터베이스 레벨 보안 (RLS 정책)
- **목적**: 데이터베이스 레벨에서 접근 제어
- **구현**: Supabase RLS 정책으로 모든 테이블 보호
- **효과**: API를 우회해도 데이터 접근 불가
- **정책 범위**:
  - Farms: 소유주 및 공유받은 사용자만 조회 가능
  - Tasks_v1: 권한별 SELECT/INSERT/UPDATE/DELETE 제어
  - Crops: 본인 작물만 조회 가능 (공유 정책 없음)

#### 2. API 레벨 보안 (Repository 필터링)
- **목적**: 데이터베이스 정책을 보완하는 추가 검증
- **구현**: Repository에서 명시적 user_id 필터링
- **효과**: 이중 검증으로 보안 강화
- **특히 중요**: 작물 정보는 RLS와 API 모두에서 필터링

#### 3. 프론트엔드 레벨 보안 (UI 권한 제어)
- **목적**: 사용자 경험 개선 및 실수 방지
- **구현**: 권한 확인 후 버튼 비활성화
- **효과**: 권한 없는 기능에 대한 접근 시도 방지
- **주의**: 이는 보안의 일부일 뿐, 데이터베이스 정책에 의존하지 않음

### 작물 정보 보호 전략

#### 데이터 공유 방지
- **RLS 정책**: 공유 정책 제거 (`CREATE POLICY "Users can view shared crops"` 삭제)
- **API 필터링**: `CropRepository.listByFarm`에서 항상 `user_id` 필터링
- **UI 제거**: 공유받은 작물 표시 기능 제거

#### 개인정보 보호
- 작물은 개인 정보로 간주되어 절대 공유되지 않음
- 소유주도 타인의 작물 정보에 접근 불가
- 오직 작물을 등록한 사용자만 접근 가능

### 타입 캐스팅 및 쿼리 호환성

#### 문제 해결
- UUID와 TEXT 타입 불일치로 인한 RLS 정책 실패 방지
- 모든 RLS 정책에서 `::text` 캐스팅 적용
- `auth.uid()`와 컬럼 값 비교 시 타입 일치 보장

#### 보안 영향
- 타입 불일치는 보안 취약점을 만들 수 있음
- 모든 정책에서 일관된 타입 캐스팅으로 안전성 확보

---

## 📝 주요 변경 파일

### Database
| 파일 | 설명 |
|------|------|
| `supabase/migrations/add_shared_calendar_rls_policies.sql` | RLS 정책 개선 (farms, tasks_v1, crops) |

### API Layer
| 파일 | 변경 내용 |
|------|----------|
| `src/shared/api/crop.repository.ts` | `listByFarm`에 명시적 user_id 필터링 추가 |
| `src/shared/api/calendar-share.repository.ts` | 소유주 조회, 공유 여부 확인 함수 추가 |
| `src/features/calendar-share/api/calendar-share.api.ts` | API 엔드포인트 추가 (`getFarmOwner`, `getSharedFarmIds` 등) |

### Frontend Hooks
| 파일 | 추가된 Hook |
|------|-------------|
| `src/features/calendar-share/model/calendar-share.hooks.ts` | `useFarmOwner`, `useSharedFarmIds`, `useFarmOwners`, `useUserRoleForCalendar` |

### UI Components
| 파일 | 주요 변경 사항 |
|------|---------------|
| `src/components/farm-calendar-grid.tsx` | 권한 확인 및 작업 추가/수정 버튼 비활성화 |
| `src/components/add-task-dialog-improved.tsx` | 권한 확인 및 삭제/수정 버튼 비활성화 |
| `src/components/edit-task-dialog.tsx` | 권한 확인 및 수정 버튼 비활성화 |
| `src/components/todo-list.tsx` | 권한 확인 및 완료 체크박스 비활성화 |
| `src/features/calendar-share/ui/CalendarShareDialog.tsx` | 소유주 상단 표시, 시각적 구분 개선 |
| `src/pages/farms/ui/FarmsPage.tsx` | 공유된 농장 시각적 구분, 친구 농장 소유주 표시 |

---

## 🎯 성공 지표

### 기능 정확성

#### 데이터 공유
- ✅ 캘린더 공유 시 농장 정보가 올바르게 표시됨
- ✅ 작업 정보가 공유 사용자에게 표시됨
- ✅ 소유주는 모든 작업을 확인 가능 (자신이 등록한 작업 + 공유받은 사용자가 등록한 작업)
- ✅ 작물은 절대 공유되지 않음 (개인 정보 보호)

#### 데이터 비공유
- ✅ 작물 정보는 소유주와 등록자만 접근 가능
- ✅ 공유받은 사용자는 타인의 작물 정보를 절대 확인할 수 없음

### 권한 제어 정확성

#### Viewer 권한
- ✅ 작업 조회만 가능
- ✅ 모든 편집 버튼이 비활성화됨
- ✅ 비활성 버튼에 명확한 툴팁 표시 ("읽기 권한만 있어 작업을 추가할 수 없습니다")
- ✅ Todo-List 표시 안 됨

#### Editor 권한
- ✅ 작업 조회: 공유받은 농장의 모든 작업 조회 가능
- ✅ 작업 등록: 새 작업 등록 가능
- ✅ 작업 수정: 본인이 등록한 작업만 수정 가능
- ✅ 작업 삭제: 본인이 등록한 작업만 삭제 가능
- ✅ 작업 완료 상태 변경: 본인이 등록한 작업만 가능
- ✅ Todo-List: Editor 권한이 있는 농장의 작업만 표시

#### 소유주 권한
- ✅ 모든 작업에 대한 완전한 제어권
- ✅ 공유받은 사용자가 등록한 작업도 수정/삭제 가능

### 사용자 경험

#### 시각적 구분
- ✅ 소유주가 공유 설정에서 명확히 구분됨 (노란색 카드, 크라운 아이콘)
- ✅ 공유된 농장이 시각적으로 구분됨 (파란색 배경)
- ✅ 친구 농장에 소유주 이름 표시

#### 사용자 안내
- ✅ 권한 부족 시 명확한 안내 메시지 표시 (툴팁)
- ✅ 버튼 비활성화로 실수 방지
- ✅ 권한별 기능 제한이 직관적으로 이해됨

---

## 📚 관련 문서

- `prd_calendar_share_with_permissions.md` - 기본 캘린더 공유 기능 PRD
- `supabase/migrations/add_shared_calendar_rls_policies.sql` - RLS 정책 구현

---

## 🔄 향후 개선 사항

### 우선순위 높음

#### 1. Commenter 권한 기능 구현
**목표**: 댓글 기능을 통해 협업 커뮤니케이션 활성화

**구현 내용**:
- 작업별 댓글 기능 추가
- Commenter 권한으로 댓글 작성 가능하도록 확장
- 댓글 알림 시스템 구축

**예상 효과**:
- 공유받은 사용자 간 소통 개선
- 작업에 대한 피드백 및 질문 가능

#### 2. 권한 변경 알림 시스템
**목표**: 권한 변경 시 사용자에게 즉시 알림

**구현 내용**:
- 권한 변경 시 실시간 알림 전송
- 이메일 알림 연동
- 푸시 알림 연동 (향후 모바일 앱 지원 시)

**예상 효과**:
- 사용자 경험 개선
- 권한 변경에 대한 투명성 향상

### 우선순위 중간

#### 3. Todo-List 권한 제어 개선
**현재 상태**: 사용자가 해당 기능 제거 요청

**향후 개선 방향** (필요시):
- Editor 권한을 가진 농장의 작업만 Todo-List에 표시
- Viewer/Commenter 권한만 있는 경우 Todo-List 숨김
- 권한별 Todo-List 필터링 기능

#### 4. 성능 최적화
**목표**: 대량의 데이터와 공유 관계 처리 최적화

**구현 내용**:
- 여러 농장 권한 일괄 조회 최적화
- React Query 캐싱 전략 개선
- 데이터베이스 쿼리 최적화

**예상 효과**:
- 페이지 로딩 속도 개선
- 사용자 경험 향상

### 우선순위 낮음

#### 5. 고급 권한 설정
- 작업별 세부 권한 설정 (예: 특정 작업만 공유)
- 권한 만료일 설정
- 임시 권한 부여 기능

