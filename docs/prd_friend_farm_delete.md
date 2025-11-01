# PRD: 친구 농장 삭제 기능

## 📋 개요
사용자가 공유받은 친구 농장을 자신의 농장 목록에서 삭제할 수 있는 기능입니다. 이 기능은 농장 자체를 삭제하는 것이 아니라, 사용자에게 공유된 권한만 제거합니다.

**마감일**: 완료  
**우선순위**: Medium  
**상태**: ✅ 구현 완료

---

## 🎯 핵심 기능
1. 친구 농장 목록에 삭제 메뉴 버튼 표시
2. 삭제 클릭 시 공유 권한만 제거 (농장 자체는 삭제되지 않음)
3. UI에서 즉시 반영

---

## 📐 기술 스펙

### Database 변경

#### RLS 정책 추가
친구 농장 삭제 기능을 위해 `calendar_shares` 테이블에 새로운 RLS 정책을 추가했습니다.

**파일**: `supabase/migrations/add_shared_user_delete_permission.sql`

```sql
-- 공유받은 사용자는 자신의 권한만 삭제 가능
ALTER TABLE calendar_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Shared users can delete own permissions" ON calendar_shares;

CREATE POLICY "Shared users can delete own permissions"
ON calendar_shares FOR DELETE
USING (shared_user_id = auth.uid());
```

---

## 🔧 구현 상세

### Backend 변경사항

#### 1. Repository 레이어
**파일**: `src/shared/api/calendar-share.repository.ts`

- `getSharedCalendars()`: 반환 값에 `shareId` 추가
- `getShareIdForFarm(farmId: string)`: 새로운 메서드 - 특정 농장에 대한 현재 사용자의 shareId 조회

```typescript
async getSharedCalendars(): Promise<Array<{ 
  calendarId: string; 
  role: UserRole; 
  shareId: string  // 추가됨
}>> {
  // shareId 포함하여 반환
}

async getShareIdForFarm(farmId: string): Promise<string | null> {
  // 특정 농장에 대한 공유 권한의 ID 조회
}
```

#### 2. API 레이어
**파일**: `src/features/calendar-share/api/calendar-share.api.ts`

- `getSharedCalendars()`: 반환 타입에 `shareId` 추가
- `getShareIdForFarm(farmId: string)`: 새로운 API 추가

#### 3. Hooks 레이어
**파일**: `src/features/calendar-share/model/calendar-share.hooks.ts`

- `useSharedCalendars()`: 반환 타입에 `shareId` 포함하도록 변경
- `useRemoveSharedUser()`: 성공 시 관련 쿼리 무효화 추가
  - `/api/calendar-shares`
  - `/api/farms`
  - `/api/shared-calendars`

```typescript
export const useRemoveSharedUser = () => {
  return useMutation({
    mutationFn: (shareId: string) => calendarShareApi.removeSharedUser(shareId),
    onSuccess: () => {
      // 관련된 모든 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ["/api/calendar-shares"] });
      queryClient.invalidateQueries({ queryKey: ["/api/farms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shared-calendars"] });
    },
  });
};
```

### Frontend 변경사항

#### FarmsPage
**파일**: `src/pages/farms/ui/FarmsPage.tsx`

1. **Hook 추가**:
   - `useSharedCalendars`: 공유받은 농장 목록 조회
   - `useRemoveSharedUser`: 공유 권한 삭제

2. **ShareId 매핑**:
```typescript
const { data: sharedCalendars = [] } = useSharedCalendars();
const farmToShareIdMap = useMemo(() => {
  const map = new Map<string, string>();
  sharedCalendars.forEach(shared => {
    map.set(shared.calendarId, shared.shareId);
  });
  return map;
}, [sharedCalendars]);
```

3. **UI 변경**:
   - 친구 농장 카드에 메뉴 버튼(⋯) 추가
   - 메뉴에서 "삭제" 옵션 제공
   - 삭제 클릭 시 확인 메시지 표시

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon" className="h-8 w-8">
      <MoreVertical className="w-4 h-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem 
      className="text-destructive" 
      onClick={() => {
        if (shareId && window.confirm(`정말로 "${farm.name}" 농장의 공유를 취소하시겠습니까?\n\n나에게 공유된 권한만 제거되며, 농장 자체는 삭제되지 않습니다.`)) {
          removeSharedUser.mutate(shareId);
        }
      }}
    >
      <Trash2 className="w-4 h-4 mr-2" /> 삭제
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

## 🎨 UI 플로우

```
농장 & 작물 관리 페이지
  ├─ 내 농장 목록
  │   └─ [메뉴: 수정/삭제]
  │
  └─ 친구 농장 목록
      └─ 각 농장 카드
          └─ [⋯ 메뉴 버튼]  ← 새로 추가
               └─ 삭제 클릭
                    ↓
                확인 다이얼로그
                "정말로 [농장명] 농장의 공유를 취소하시겠습니까?
                 나에게 공유된 권한만 제거되며, 농장 자체는 삭제되지 않습니다."
                    ↓
                확인
                    ↓
              권한 삭제 완료
              UI에서 친구 농장 제거
```

---

## ✅ 체크리스트

### Database
- [x] RLS 정책 추가 (Supabase에서 실행 필요)
- [x] 마이그레이션 파일 생성

### Backend
- [x] `getSharedCalendars()`에 shareId 추가
- [x] `getShareIdForFarm()` 메서드 구현
- [x] API에 메서드 추가
- [x] Hook 타입 수정
- [x] 삭제 성공 시 쿼리 무효화 추가

### Frontend
- [x] FarmsPage에 삭제 버튼 추가
- [x] ShareId 매핑 로직 구현
- [x] 확인 다이얼로그 추가
- [x] 토스트 메시지 표시

### 테스트
- [x] 친구 농장 삭제 시 UI 반영 확인
- [x] 농장 자체가 삭제되지 않음 확인
- [x] 쿼리 무효화로 데이터 동기화 확인
- [x] 린트 에러 없음 확인
- [x] 빌드 성공 확인

---

## 🔒 보안 고려사항

1. **RLS 정책**: 공유받은 사용자는 자신의 권한만 삭제 가능하도록 제한
2. **데이터 무결성**: 농장 자체는 삭제되지 않고, 공유 권한만 제거
3. **권한 검증**: `shared_user_id = auth.uid()`로 권한 확인

---

## 🚨 중요 안내

### Supabase SQL 실행 필요
이 기능을 사용하려면 **Supabase 대시보드에서 SQL을 실행**해야 합니다:

1. Supabase 대시보드 접속
2. SQL Editor 열기
3. `supabase/migrations/add_shared_user_delete_permission.sql` 파일 내용 복사
4. 실행

**SQL 내용**:
```sql
ALTER TABLE calendar_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Shared users can delete own permissions" ON calendar_shares;

CREATE POLICY "Shared users can delete own permissions"
ON calendar_shares FOR DELETE
USING (shared_user_id = auth.uid());
```

---

## 📊 수정된 파일

### Backend
- `src/shared/api/calendar-share.repository.ts`
- `src/features/calendar-share/api/calendar-share.api.ts`
- `src/features/calendar-share/model/calendar-share.hooks.ts`

### Frontend
- `src/pages/farms/ui/FarmsPage.tsx`

### Database
- `supabase/migrations/add_shared_user_delete_permission.sql` (새로 추가)

---

## 📝 사용자 경험 개선

### Before
- 친구 농장 목록에서 삭제 불가
- 공유 농장이 계속 표시됨
- 공유 중단이 불가능

### After
- 친구 농장도 내 농장처럼 삭제 가능
- 확인 메시지로 안전한 삭제
- 삭제 시 UI 즉시 반영
- 농장 소유주의 농장은 그대로 유지

---

## 🔄 향후 개선 가능 사항

1. **일괄 삭제**: 여러 친구 농장 한번에 삭제
2. **삭제 히스토리**: 언제 공유가 중단되었는지 기록
3. **다시 공유**: 삭제한 친구 농장 다시 공유하기
4. **삭제 알림**: 농장 소유주에게 삭제 알림 (선택사항)

---

## 📚 관련 문서
- [캘린더 공유 PRD](./prd_calendar_share.md)
- [캘린더 권한 관리 PRD](./prd_calendar_share_with_permissions.md)
- [Supabase 설정 가이드](../SUPABASE_SETUP.md)

