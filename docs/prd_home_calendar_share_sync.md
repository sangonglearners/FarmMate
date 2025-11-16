# PRD: 홈 페이지 공유 캘린더 동기화 및 일정 분리 표시

## 1. 개요

### 1.1 배경
현재 FarmMate 애플리케이션에서 다른 사용자로부터 농장을 공유받으면 캘린더 탭과 홈 탭 모두에서 해당 농장의 일정을 확인할 수 있습니다. 그러나 공유 권한이 제거되었을 때 캘린더 탭에서는 즉시 사라지지만, 홈 탭의 "이번 주 플래너"와 "오늘의 일정"에는 여전히 표시되는 문제가 있습니다.

### 1.2 문제점
1. **공유 권한 동기화 문제**: 공유 권한이 사라졌을 때 캘린더 탭에서는 사라지지만 홈 탭에는 여전히 표시됨
2. **일정 구분 부족**: 홈 탭의 "오늘의 일정"에서 내 농장의 일정과 친구 농장의 일정이 혼재되어 표시되어 구분이 어려움

### 1.3 목표
1. 공유 권한이 제거되면 홈 탭의 모든 섹션에서도 즉시 해당 농장의 일정이 사라지도록 수정
2. 홈 탭의 "오늘의 일정"을 "내 농장의 일정"과 "공유받은 농장의 일정"으로 분리하여 표시

## 2. 요구사항

### 2.1 기능 요구사항

#### 2.1.1 공유 권한 동기화
- **FR-1**: 공유 권한이 제거된 농장의 작업은 홈 탭의 모든 섹션에서 즉시 제거되어야 함
  - 이번 주 플래너 (2주 보기)
  - 한 달 플래너 (전체 보기)
  - 오늘의 일정
- **FR-2**: 공유 권한 상태 확인 로직을 통합하여 캘린더 탭과 홈 탭에서 동일한 필터링 로직 사용
- **FR-3**: 존재하지 않는 farmId를 가진 작업은 표시하지 않음

#### 2.1.2 일정 분리 표시
- **FR-4**: "오늘의 일정" 섹션을 두 개의 서브섹션으로 분리
  - **내 농장의 일정**: 사용자가 소유한 농장의 일정만 표시
  - **공유받은 농장의 일정**: 다른 사용자로부터 공유받은 농장의 일정만 표시
- **FR-5**: 각 서브섹션에 해당하는 일정이 없을 경우 적절한 안내 메시지 표시
- **FR-6**: 공유받은 농장의 일정에는 농장 소유자 정보 표시 (선택사항)

### 2.2 비기능 요구사항
- **NFR-1**: 기존 UI/UX 디자인 패턴 유지
- **NFR-2**: 성능 저하 없이 필터링 수행 (추가 API 호출 최소화)
- **NFR-3**: 코드 중복 최소화 (공통 유틸리티 함수 활용)

## 3. 기술 설계

### 3.1 현재 구조 분석

#### 3.1.1 홈 페이지 (`HomePage.tsx`)
```typescript
// 현재 구조
- useSharedCalendars(): 공유받은 농장 목록 조회
- viewerAndCommenterFarmIdSet: viewer/commenter 권한 농장만 제외
- plannerTasks: 플래너에 표시할 작업 (viewer/commenter 제외)
- selectedDateTasks: 선택된 날짜의 작업 (viewer/commenter 제외)
```

**문제점**:
- `viewerAndCommenterFarmIdSet`은 viewer/commenter 권한만 제외하고, editor 권한은 포함
- ToDo 리스트에는 viewer/commenter를 제외하는 것이 맞지만, 공유가 완전히 해제된 농장은 별도로 처리되지 않음
- 모든 농장의 일정이 하나로 표시됨

#### 3.1.2 Task API (`tasks.ts`)
```typescript
taskApi.getTasks():
1. 자신의 작업 조회 (user_id 필터)
2. 공유받은 작업 조회 (calendar_shares 테이블 조인)
3. 두 결과 병합 및 중복 제거
```

### 3.2 해결 방안

#### 3.2.1 공유 권한 동기화
1. **유효한 농장 ID 목록 생성**
   - `useFarms()` 또는 `useOwnFarms()` + `useSharedFarms()`를 사용하여 현재 접근 가능한 모든 농장 ID 수집
   - 작업의 `farmId`가 이 목록에 없으면 필터링

2. **필터링 로직 통합**
   ```typescript
   // 유틸리티 함수 생성
   const getValidFarmIds = (ownFarms, sharedFarms) => {
     return new Set([
       ...ownFarms.map(f => f.id),
       ...sharedFarms.map(f => f.id)
     ]);
   };
   
   const filterTasksByValidFarms = (tasks, validFarmIds) => {
     return tasks.filter(task => 
       !task.farmId || validFarmIds.has(task.farmId)
     );
   };
   ```

#### 3.2.2 일정 분리 표시
1. **작업 분류 로직**
   ```typescript
   const categorizeTasksByOwnership = (tasks, ownFarmIds, sharedFarmIds) => {
     const ownTasks = tasks.filter(task => 
       !task.farmId || ownFarmIds.has(task.farmId)
     );
     const sharedTasks = tasks.filter(task => 
       task.farmId && sharedFarmIds.has(task.farmId)
     );
     return { ownTasks, sharedTasks };
   };
   ```

2. **UI 구조 변경**
   ```tsx
   {/* 내 농장의 일정 */}
   <div className="mb-6">
     <h3 className="text-sm font-semibold mb-2">내 농장</h3>
     {ownTasks.length > 0 ? (
       <TodoList tasks={ownTasks} ... />
     ) : (
       <p className="text-gray-500 text-sm">일정이 없습니다.</p>
     )}
   </div>
   
   {/* 공유받은 농장의 일정 */}
   {sharedTasks.length > 0 && (
     <div>
       <h3 className="text-sm font-semibold mb-2">공유받은 농장</h3>
       <TodoList tasks={sharedTasks} ... />
     </div>
   )}
   ```

### 3.3 파일 수정 목록

#### 3.3.1 수정할 파일
1. **`FarmMate/src/pages/home/ui/HomePage.tsx`**
   - 유효한 농장 ID 목록 생성 로직 추가
   - 작업 필터링 로직 수정
   - "오늘의 일정" UI를 두 섹션으로 분리

2. **`FarmMate/src/shared/utils/task-filters.ts`** (새로 생성)
   - 작업 필터링 관련 공통 유틸리티 함수

#### 3.3.2 영향받는 컴포넌트
- `HomePage.tsx`: 직접 수정
- `TodoList.tsx`: 변경 없음 (props 그대로 사용)
- `CalendarGrid.tsx`: 변경 없음 (이미 올바르게 동작)

## 4. 구현 계획

### 4.1 구현 단계

#### Phase 1: 공통 유틸리티 함수 생성
1. `task-filters.ts` 파일 생성
2. 공유 권한 필터링 유틸리티 함수 구현

#### Phase 2: HomePage 공유 권한 동기화
1. `useFarms()` 또는 `useOwnFarms()` + `useSharedFarms()` 추가
2. 유효한 농장 ID 목록 생성
3. 모든 작업 필터링 로직에 적용
   - plannerTasks
   - selectedDateTasks

#### Phase 3: 일정 분리 표시
1. 내 농장 ID와 공유받은 농장 ID 분리
2. selectedDateTasks를 ownTasks와 sharedTasks로 분류
3. UI를 두 섹션으로 분리하여 렌더링

#### Phase 4: 테스트 및 검증
1. 공유 권한 제거 시 홈 탭에서 즉시 사라지는지 확인
2. 내 농장과 공유받은 농장의 일정이 올바르게 분리되는지 확인
3. 공유받은 농장이 없을 때 UI가 올바르게 표시되는지 확인

### 4.2 테스트 시나리오

#### 시나리오 1: 공유 권한 제거
1. 사용자 A가 사용자 B에게 농장을 공유
2. 사용자 B의 홈 탭에서 공유받은 농장의 일정 확인
3. 사용자 A가 공유 해제
4. 사용자 B의 홈 탭 새로고침 → 공유받은 일정이 사라져야 함

#### 시나리오 2: 일정 분리 표시
1. 사용자가 자신의 농장 일정과 공유받은 농장 일정을 모두 가지고 있음
2. 홈 탭의 "오늘의 일정"에서 두 섹션으로 분리되어 표시되는지 확인
3. 내 농장 섹션: 자신의 농장 일정만
4. 공유받은 농장 섹션: 공유받은 농장 일정만

#### 시나리오 3: 빈 일정 처리
1. 내 농장 일정만 있고 공유받은 일정이 없는 경우
2. 공유받은 일정만 있고 내 농장 일정이 없는 경우
3. 둘 다 없는 경우

## 5. UI/UX 가이드

### 5.1 디자인 원칙
- 기존 Card 컴포넌트 스타일 유지
- 섹션 구분을 위한 시각적 요소 추가 (헤더, 구분선 등)
- 반응형 디자인 유지

### 5.2 화면 레이아웃

```
┌─────────────────────────────────────┐
│  [날짜]의 일정              [+ 추가] │
├─────────────────────────────────────┤
│  내 농장                             │
│  ┌─────────────────────────────────┐│
│  │ 🌱 작업 1                       ││
│  │ 🌾 작업 2                       ││
│  └─────────────────────────────────┘│
│                                     │
│  공유받은 농장                        │
│  ┌─────────────────────────────────┐│
│  │ 🥕 작업 3 (친구 A의 농장)        ││
│  │ 🍅 작업 4 (친구 B의 농장)        ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

### 5.3 텍스트 가이드
- 섹션 제목: "내 농장", "공유받은 농장"
- 빈 상태 메시지: 
  - 내 농장: "내 농장에 예정된 작업이 없습니다."
  - 공유받은 농장: "공유받은 농장에 예정된 작업이 없습니다."
- 전체 빈 상태: 기존 메시지 유지

## 6. 성공 지표
- 공유 권한 제거 시 1초 이내에 홈 탭에서 사라짐
- 내 농장과 공유받은 농장의 일정이 명확히 구분됨
- 사용자 혼란도 감소 (사용자 피드백 기반)

## 7. 향후 개선 사항
- 공유받은 농장 섹션에 농장 소유자 아바타/이름 표시
- 농장별로 색상 구분하여 표시
- 공유받은 농장의 권한 레벨(viewer/commenter/editor) 표시
- 공유받은 농장 일정에 대한 상호작용 제한 UI 표시 (권한에 따라)

