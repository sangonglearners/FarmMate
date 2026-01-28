# PRD: 날짜별 작업(Task) 관리 개선 v2

## 1. 개요

### 1.1 배경
현재 FarmMate에서 여러 날에 걸친 작업을 등록하면:
- **캘린더**: 연속된 박스로 잘 표시됨 ✅
- **To-do list**: 날짜별 개별 표시 및 **개별 완료 처리가 불가능** ❌

### 1.2 목표
- 캘린더에서 **연속 박스 표시 유지**
- To-do list에서 **날짜별 개별 표시 및 완료 처리** 가능
- **일괄등록**(농작업 계산기)과 **개별등록** 모두 동일하게 적용

### 1.3 예시 시나리오
사용자가 "1월 27~29일 파종" 작업을 등록하면:

| 화면 | 현재 동작 | 목표 동작 |
|------|-----------|-----------|
| **캘린더** | 27~29일 연속 박스 ✅ | 유지 |
| **To-do (1/27 선택)** | "파종" 1개 표시, 완료 시 전체 완료 | "파종" 표시, **27일만 개별 완료** |
| **To-do (1/28 선택)** | "파종" 1개 표시 (27일과 동일) | "파종" 표시, **28일만 개별 완료** |
| **To-do (1/29 선택)** | "파종" 1개 표시 (27일과 동일) | "파종" 표시, **29일만 개별 완료** |

---

## 2. 현재 시스템 분석

### 2.1 작업 등록 방식
| 등록 방식 | 파일 | 설명 |
|-----------|------|------|
| **일괄등록** | `work-calculator-dialog.tsx` | 농작업 계산기로 파종→육묘→수확 등 여러 작업을 한 번에 등록 |
| **개별등록** | `add-task-dialog-improved.tsx` | 단일 작업을 날짜 범위로 등록 |

### 2.2 현재 데이터 구조
```typescript
Task {
  id: string
  title: string                    // "양파_파종"
  taskType: string                 // "파종"
  scheduledDate: string            // "2026-01-27" (시작일)
  endDate: string | null           // "2026-01-29" (종료일)
  completed: number                // 0 또는 1 (작업 전체)
  taskGroupId: string | null       // 일괄등록 시 그룹 ID
  farmId: string
  cropId: string
  rowNumber: number | null
  userId: string
}
```

### 2.3 현재 화면별 동작

#### 캘린더 (`calendar-grid.tsx`, `calendar.utils.ts`)
- `getTaskGroups()` 함수가 `taskGroupId`로 작업들을 그룹화
- 그룹 내 모든 작업의 날짜 범위를 계산하여 **연속 박스**로 표시
- **현재 잘 작동함** ✅

#### To-do list (`HomePage.tsx`, `todo-list.tsx`)
- `groupTasksByGroupId()` 함수가 `taskGroupId`로 그룹화
- 그룹 내 각 작업(파종, 육묘 등)을 개별 표시
- **문제**: 날짜 범위 작업은 날짜별로 분리되지 않음
- **문제**: `completed` 필드가 작업 전체에 적용되어 날짜별 완료 불가

#### 완료 상태 관리 (`todo-list.tsx`)
- localStorage에 `task_completions_${selectedDate}` 키로 저장
- task.id 기준으로 완료 상태 관리
- DB의 `completed` 필드와 동기화

### 2.4 문제점 요약

1. **데이터 구조**: 날짜 범위 작업이 1개의 레코드로 저장됨
   - 1/27~29 파종 → 1개 Task (scheduledDate=1/27, endDate=1/29)

2. **To-do 표시**: selectedDate 기준 필터링이 없음
   - 현재: 모든 작업 표시 (taskType="재배" 제외)
   - 문제: 어떤 날짜를 선택해도 같은 작업이 표시됨

3. **완료 처리**: task.id 기준으로만 관리
   - 1/27에 완료하면 1/28, 1/29도 완료 표시됨

---

## 3. 해결 방안

### 3.1 핵심 변경: 날짜별 개별 Task 레코드 생성

**변경 전** (현재):
```
"양파_파종" (1/27 ~ 1/29)
→ 1개의 Task 레코드
  - scheduledDate: "2026-01-27"
  - endDate: "2026-01-29"
```

**변경 후**:
```
"양파_파종" (1/27 ~ 1/29)
→ 3개의 Task 레코드 (같은 taskGroupId로 연결)
  - Task 1: scheduledDate="2026-01-27", taskGroupId="group-abc"
  - Task 2: scheduledDate="2026-01-28", taskGroupId="group-abc"
  - Task 3: scheduledDate="2026-01-29", taskGroupId="group-abc"
```

### 3.2 각 화면별 동작

| 화면 | 사용 기준 | 동작 |
|------|-----------|------|
| **캘린더** | `taskGroupId` | 같은 그룹의 작업들 → 연속 박스 표시 |
| **To-do** | `scheduledDate === selectedDate` | 선택한 날짜의 작업만 표시 |
| **완료 처리** | 개별 Task의 `completed` | 각 날짜 독립적으로 완료 |

### 3.3 기존 데이터 호환성

기존에 `endDate`로 저장된 데이터도 정상 작동하도록:
- To-do 필터링에서 날짜 범위 체크 로직 유지
- 새로 등록하는 작업만 날짜별 개별 레코드로 생성

---

## 4. 상세 변경 사항

### 4.1 일괄등록 수정 (`work-calculator-dialog.tsx`)

**현재 `handleSave` 로직**:
```typescript
taskSchedules.map(schedule => ({
  title: `${cropName}_${schedule.taskType}`,
  scheduledDate: schedule.startDate,
  endDate: schedule.endDate,  // 종료일 저장
  taskGroupId: taskGroupId,
}));
// → 작업 타입별로 1개씩 생성 (파종 1개, 육묘 1개, 수확 1개)
```

**변경 `handleSave` 로직**:
```typescript
taskSchedules.forEach(schedule => {
  // 시작일부터 종료일까지 각 날짜마다 Task 생성
  const dates = eachDayOfInterval({ 
    start: new Date(schedule.startDate), 
    end: new Date(schedule.endDate) 
  });
  
  dates.forEach(date => {
    tasks.push({
      title: `${cropName}_${schedule.taskType}`,
      scheduledDate: format(date, "yyyy-MM-dd"),
      endDate: null,  // 개별 날짜이므로 불필요
      taskGroupId: taskGroupId,  // 같은 그룹으로 연결
    });
  });
});
// → 날짜별로 개별 생성 (1/27 파종, 1/28 파종, 1/29 파종)
```

### 4.2 개별등록 수정 (`add-task-dialog-improved.tsx`)

개별등록 모드에서 날짜 범위 지정 시에도 동일한 로직 적용:
- `scheduledDate`와 `endDate`가 다르면 날짜별 개별 레코드 생성
- 같은 `taskGroupId`로 연결

### 4.3 To-do 필터링 수정 (`HomePage.tsx`)

**현재 `selectedDateTasksRaw` 로직**:
```typescript
const selectedDateTasksRaw = tasks.filter(task => {
  if (task.taskType === "재배") return false;
  return true;  // 날짜 필터링 없음!
});
```

**변경 로직**:
```typescript
const selectedDateTasksRaw = tasks.filter(task => {
  if (task.taskType === "재배") return false;
  
  // 1. 새 구조: scheduledDate가 선택한 날짜와 일치
  if (task.scheduledDate === selectedDate) {
    return true;
  }
  
  // 2. 기존 데이터 호환: endDate가 있으면 날짜 범위 체크
  if (task.endDate && task.endDate !== task.scheduledDate) {
    return isDateInRange(selectedDate, task.scheduledDate, task.endDate);
  }
  
  return false;
});
```

### 4.4 캘린더 (`calendar.utils.ts`)

**변경 없음** - 현재 `getTaskGroups()` 함수가 이미 `taskGroupId`로 그룹화하여 연속 박스 표시

```typescript
// 이미 구현된 로직:
// 1. taskGroupId로 작업들을 그룹화
// 2. 그룹 내 모든 작업의 scheduledDate를 수집
// 3. 최소 날짜 ~ 최대 날짜로 연속 박스 렌더링
```

---

## 5. 영향 범위

### 5.1 수정 대상 파일

| 파일 | 변경 내용 | 우선순위 |
|------|-----------|----------|
| `work-calculator-dialog.tsx` | 날짜별 개별 Task 생성 로직 | P1 |
| `add-task-dialog-improved.tsx` | 날짜별 개별 Task 생성 로직 | P1 |
| `HomePage.tsx` | To-do 필터링에 selectedDate 체크 추가 | P1 |
| `calendar.utils.ts` | 검증만 (변경 불필요) | P2 |

### 5.2 영향받는 기능

- 농작업 계산기 일괄 등록
- 개별 작업 등록 (날짜 범위 지정 시)
- 홈 화면 To-do list
- 캘린더 연속 박스 표시 (유지됨)
- 작업 완료 처리

### 5.3 영향받지 않는 기능

- 캘린더 탭 전체
- 통계 탭
- 장부 관리
- 농장/작물 관리

---

## 6. 구현 계획

### Phase 1: 일괄등록 수정
1. `work-calculator-dialog.tsx` 수정
   - `handleSave` 함수에서 날짜별 개별 Task 생성
   - `eachDayOfInterval` 함수 사용
2. 테스트: 농작업 계산기로 작업 등록 후 DB 확인

### Phase 2: 개별등록 수정  
3. `add-task-dialog-improved.tsx` 수정
   - 개별등록 모드에서 날짜 범위 지정 시 동일 로직 적용
4. 테스트: 개별 작업 등록 후 DB 확인

### Phase 3: To-do 필터링 수정
5. `HomePage.tsx` 수정
   - `selectedDateTasksRaw` 필터링에 날짜 체크 추가
   - 기존 데이터 호환성 유지
6. 테스트: 
   - 새 작업: 각 날짜에 해당 작업만 표시되는지
   - 기존 작업: 날짜 범위 내 작업 표시되는지

### Phase 4: 통합 테스트
7. 캘린더 연속 박스 표시 확인
8. To-do 날짜별 표시 확인
9. 개별 완료 처리 확인
10. 기존 데이터 정상 작동 확인

---

## 7. 테스트 시나리오

### 7.1 새 작업 등록 테스트

| 단계 | 동작 | 예상 결과 |
|------|------|-----------|
| 1 | 농작업 계산기에서 "1/27~1/29 파종" 등록 | DB에 3개 Task 생성 (같은 taskGroupId) |
| 2 | 캘린더에서 확인 | 1/27~29에 연속 박스 표시 |
| 3 | To-do에서 1/27 선택 | "파종" 1개 표시 |
| 4 | To-do에서 1/28 선택 | "파종" 1개 표시 (1/27과 별개) |
| 5 | 1/27의 "파종" 완료 체크 | 1/27만 completed=1 |
| 6 | To-do에서 1/28 선택 | "파종" 미완료 상태로 표시 |

### 7.2 기존 데이터 호환성 테스트

| 단계 | 동작 | 예상 결과 |
|------|------|-----------|
| 1 | 기존 endDate 있는 작업 확인 | To-do에서 날짜 범위 내 표시 |
| 2 | 캘린더에서 확인 | 연속 박스로 정상 표시 |

---

## 8. 리스크 및 대응

### 8.1 데이터 증가
- **리스크**: 3일 작업 → 3개 레코드 (기존 1개 대비 증가)
- **대응**: 대부분의 농작업은 짧은 기간이므로 큰 영향 없음

### 8.2 기존 데이터
- **리스크**: 이미 저장된 endDate 기반 데이터
- **대응**: To-do 필터링에서 날짜 범위 체크 로직 유지하여 하위 호환

### 8.3 그룹 수정/삭제
- **리스크**: 연속 작업 중 일부만 수정/삭제 시
- **대응**: taskGroupId로 연결된 작업들 일괄 처리 옵션 (기존 BatchTaskEditDialog 활용)

---

## 9. 체크리스트

### 구현 전
- [ ] 현재 DB에 저장된 작업 데이터 구조 확인
- [ ] 개발 서버에서 테스트 환경 준비

### 구현 중
- [ ] Phase 1: 일괄등록 수정 완료
- [ ] Phase 2: 개별등록 수정 완료
- [ ] Phase 3: To-do 필터링 수정 완료
- [ ] 각 Phase 완료 후 개별 테스트

### 구현 후
- [ ] 통합 테스트 완료
- [ ] 캘린더 연속 박스 정상 표시 확인
- [ ] To-do 날짜별 표시 확인
- [ ] 기존 데이터 호환성 확인
- [ ] 코드 리뷰

---

## 10. 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| v1 | 2026-01-28 | 초안 작성 |
| v2 | 2026-01-28 | 개별등록 파일 추가, 기존 데이터 호환성 전략 보강, 테스트 시나리오 상세화 |
