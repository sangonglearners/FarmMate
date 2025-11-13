# PRD: 캘린더 공유와 홈 탭 일정 동기화 개선

## 1. 개요

### 1.1 목적
공유 권한이 해제되었을 때 홈 탭의 "이번 주 플래너"와 "오늘의 일정"에서도 즉시 사라지도록 하여 데이터 일관성을 보장합니다.

### 1.2 배경
현재 다른 사용자의 농장을 공유받으면:
- ✅ 캘린더 탭에서 농장 토글을 통해 확인 가능
- ✅ 홈 탭의 "이번 주 플래너"에서 확인 가능
- ✅ 홈 탭의 "오늘의 일정"에서 확인 가능

**문제점**: 공유 권한이 사라졌을 때
- ✅ 캘린더 탭에서는 즉시 사라짐
- ❌ 홈 탭의 "이번 주 플래너"와 "오늘의 일정"에는 그대로 남아있음

**원인 분석**:
- 공유 해제 시 `useRemoveSharedUser` 훅에서 다음 쿼리들을 invalidate함:
  - `/api/calendar-shares`
  - `/api/farms`
  - `/api/shared-calendars`
- 하지만 홈 페이지에서 사용하는 `/api/farms/shared`와 `/api/farms/own` 쿼리는 invalidate되지 않음
- 결과적으로 홈 페이지에서는 캐시된 이전 데이터를 계속 사용

### 1.3 현재 상태
홈 페이지(`HomePage.tsx`)는 이미 다음 기능을 구현하고 있음:
- ✅ "내 농장"과 "공유받은 농장"을 분리하여 표시 (line 488-520)
- ✅ 유효한 농장 ID 필터링 (`validFarmIds`, `ownFarmIds`, `sharedFarmIds`)
- ✅ viewer/commenter 권한 작업 제외 필터링
- ✅ 작업을 소유권에 따라 분류하는 유틸리티 함수 (`categorizeTasksByOwnership`)

## 2. 요구사항

### 2.1 필수 요구사항
1. **공유 해제 시 즉시 반영**
   - 공유 권한이 해제되면 홈 탭의 모든 영역에서 즉시 사라져야 함
   - "이번 주 플래너"에서 해당 농장의 일정이 표시되지 않아야 함
   - "오늘의 일정"에서 해당 농장의 일정이 표시되지 않아야 함

2. **데이터 일관성 보장**
   - 캘린더 탭과 홈 탭이 동일한 데이터를 표시해야 함
   - 권한 변경 시 모든 화면이 동기화되어야 함

### 2.2 현재 기능 유지
1. "오늘의 일정" 섹션에서 "내 농장"과 "공유받은 농장"을 분리하여 표시하는 기능은 이미 구현되어 있으므로 유지
2. 기존 필터링 로직 유지

## 3. 기술 구현 사항

### 3.1 수정할 파일

#### 3.1.1 `FarmMate/src/features/calendar-share/model/calendar-share.hooks.ts`
- `useRemoveSharedUser` 훅 수정
- 공유 해제 시 invalidate할 쿼리 추가:
  - `/api/farms/shared` 추가
  - `/api/farms/own` 추가 (만약 필요하다면)

**Before**:
```typescript
export const useRemoveSharedUser = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (shareId: string) => calendarShareApi.removeSharedUser(shareId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar-shares"] });
      queryClient.invalidateQueries({ queryKey: ["/api/farms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shared-calendars"] });
      toast({
        title: "공유 해제 완료",
        description: "사용자 공유가 성공적으로 해제되었습니다.",
      });
    },
    // ...
  });
};
```

**After**:
```typescript
export const useRemoveSharedUser = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (shareId: string) => calendarShareApi.removeSharedUser(shareId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar-shares"] });
      queryClient.invalidateQueries({ queryKey: ["/api/farms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/farms/shared"] });
      queryClient.invalidateQueries({ queryKey: ["/api/farms/own"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shared-calendars"] });
      toast({
        title: "공유 해제 완료",
        description: "사용자 공유가 성공적으로 해제되었습니다.",
      });
    },
    // ...
  });
};
```

#### 3.1.2 권한 변경 시에도 동일하게 적용
- `useUpdateUserPermission` 훅에도 동일한 invalidation 로직 추가
- 권한이 viewer/commenter로 변경되었을 때도 홈 화면에서 즉시 반영되도록

### 3.2 추가 고려사항

#### 3.2.1 공유 추가 시에도 invalidation
- `useShareCalendarWithUser` 훅에서도 동일한 쿼리들을 invalidate해야 함
- 새로운 농장이 공유되었을 때 홈 화면에 즉시 표시되도록

## 4. 테스트 시나리오

### 4.1 공유 해제 테스트
1. 사용자 A가 사용자 B에게 농장을 공유
2. 사용자 B가 홈 탭에서 공유받은 농장의 일정 확인
   - "이번 주 플래너"에 표시됨
   - "오늘의 일정"의 "공유받은 농장" 섹션에 표시됨
3. 사용자 A가 공유를 해제
4. **예상 결과**: 사용자 B의 홈 탭에서 즉시 사라짐
   - "이번 주 플래너"에서 제거됨
   - "오늘의 일정"의 "공유받은 농장" 섹션에서 제거됨

### 4.2 권한 변경 테스트
1. 사용자 A가 사용자 B에게 editor 권한으로 농장 공유
2. 사용자 B가 홈 탭에서 일정 확인 (표시됨)
3. 사용자 A가 권한을 viewer로 변경
4. **예상 결과**: 사용자 B의 홈 탭 "이번 주 플래너"와 "오늘의 일정"에서 즉시 사라짐 (viewer는 편집 불가이므로 제외)

### 4.3 공유 추가 테스트
1. 사용자 A가 사용자 B에게 새로운 농장 공유
2. **예상 결과**: 사용자 B의 홈 탭에 즉시 표시됨
   - "이번 주 플래너"에 표시
   - 해당 농장의 일정이 "공유받은 농장" 섹션에 표시

## 5. 성공 지표
- ✅ 공유 해제 시 홈 탭에서 즉시 사라짐
- ✅ 권한 변경 시 홈 탭에 즉시 반영됨
- ✅ 공유 추가 시 홈 탭에 즉시 표시됨
- ✅ 캘린더 탭과 홈 탭의 데이터 일관성 유지

## 6. 구현 순서
1. `calendar-share.hooks.ts` 수정
   - `useRemoveSharedUser`에 쿼리 invalidation 추가
   - `useUpdateUserPermission`에 쿼리 invalidation 추가
   - `useShareCalendarWithUser`에 쿼리 invalidation 추가
2. 테스트 수행
3. 문서 업데이트

## 7. 완료 조건
- [ ] 공유 해제 시 `/api/farms/shared`, `/api/farms/own` 쿼리가 invalidate됨
- [ ] 권한 변경 시 동일한 쿼리들이 invalidate됨
- [ ] 공유 추가 시 동일한 쿼리들이 invalidate됨
- [ ] 모든 테스트 시나리오 통과
- [ ] 캘린더 탭과 홈 탭의 데이터 일관성 확인

