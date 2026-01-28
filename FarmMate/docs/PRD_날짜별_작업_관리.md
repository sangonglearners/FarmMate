# PRD: 날짜별 작업(Task) 관리 개선

## 1. 개요

### 1.1 배경
현재 FarmMate에서 여러 날에 걸친 작업(예: 1월 21~23일 파종)을 등록하면:
- **캘린더**: 연속된 박스로 표시됨 ✅
- **To-do list**: 날짜별 개별 표시 및 완료 처리가 불가능 ❌

### 1.2 목표
- 여러 날에 걸친 작업을 **날짜별로 독립적**으로 관리
- 캘린더에서는 **연속 박스**로 시각적 표시
- To-do list에서는 **각 날짜별로 개별 완료** 처리 가능

### 1.3 예시 시나리오
사용자가 "1월 21~23일 파종" 작업을 등록하면:

| 화면 | 표시 방식 |
|------|-----------|
| **캘린더** | 21~23일에 걸친 하나의 연속 박스 |
| **To-do (1/21)** | "파종" 표시, 개별 완료 체크 가능 |
| **To-do (1/22)** | "파종" 표시, 개별 완료 체크 가능 (21일과 독립) |
| **To-do (1/23)** | "파종" 표시, 개별 완료 체크 가능 |

---

## 2. 현재 상태 분석

### 2.1 현재 데이터 구조
```
Task {
  id: string
  title: string
  taskType: string
  scheduledDate: string    // 시작일
  endDate?: string         // 종료일 (선택)
  completed: number        // 0 또는 1 (작업 전체)
  taskGroupId?: string     // 일괄 등록 그룹 ID
  ...
}
```

### 2.2 현재 문제점

1. **하나의 작업 = 하나의 레코드**
   - 21~23일 파종 → 1개의 task 레코드
   - `completed`가 1이면 전체 기간이 완료 처리됨

2. **To-do list 필터링 미흡**
   - `selectedDate`에 맞는 작업만 표시하는 로직 부재
   - 날짜 범위(`scheduledDate` ~ `endDate`) 내 포함 여부 체크 필요

3. **캘린더와 To-do의 역할 혼재**
   - 캘린더: 연속 작업을 하나로 표시 (시각적 개요)
   - To-do: 날짜별 개별 작업 관리 (실행 및 완료 추적)

---

## 3. 제안하는 해결책

### 3.1 핵심 변경: 날짜별 개별 Task 레코드 생성

**변경 전** (현재):
```
작업: "양파_파종" (1/21 ~ 1/23)
→ 1개의 Task 레코드
```

**변경 후**:
```
작업: "양파_파종" (1/21 ~ 1/23)
→ 3개의 Task 레코드:
  - Task 1: scheduledDate=1/21, taskGroupId="group-123"
  - Task 2: scheduledDate=1/22, taskGroupId="group-123"
  - Task 3: scheduledDate=1/23, taskGroupId="group-123"
```

### 3.2 taskGroupId 활용
- 같은 `taskGroupId`를 가진 작업들은 **하나의 연속 작업**임을 표시
- 캘린더에서 `taskGroupId`로 그룹화하여 연속 박스 렌더링
- To-do에서는 개별 레코드로 독립적 완료 처리

---

## 4. 상세 변경 사항

### 4.1 work-calculator-dialog.tsx 수정

**현재 로직**:
```typescript
// 작업 저장 시
const tasks: InsertTask[] = taskSchedules.map(schedule => ({
  title: `${cropName}_${schedule.taskType}`,
  scheduledDate: schedule.startDate,
  endDate: schedule.endDate,  // 종료일 저장
  taskGroupId: taskGroupId,
  ...
}));
```

**변경 로직**:
```typescript
// 작업 저장 시 - 날짜별로 개별 레코드 생성
const tasks: InsertTask[] = [];
taskSchedules.forEach(schedule => {
  // 시작일부터 종료일까지 각 날짜마다 Task 생성
  const startDate = new Date(schedule.startDate);
  const endDate = new Date(schedule.endDate);
  
  for (let date = startDate; date <= endDate; date.setDate(date.getDate() + 1)) {
    tasks.push({
      title: `${cropName}_${schedule.taskType}`,
      scheduledDate: format(date, "yyyy-MM-dd"),
      endDate: null,  // 개별 날짜이므로 endDate 불필요
      taskGroupId: taskGroupId,
      // 추가 필드: 원본 기간 정보 저장
      groupStartDate: schedule.startDate,
      groupEndDate: schedule.endDate,
      ...
    });
  }
});
```

### 4.2 calendar-grid.tsx 수정

**현재**: `getTaskGroups()`로 그룹화하여 연속 박스 표시 → **유지**

**추가 고려사항**:
- `taskGroupId`가 같은 작업들을 하나의 연속 박스로 표시
- 개별 날짜 레코드들의 `scheduledDate`로 시작일/종료일 계산

### 4.3 HomePage.tsx (To-do list) 수정

**현재 문제**:
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
  
  // 선택한 날짜와 일치하는 작업만 표시
  return task.scheduledDate === selectedDate;
});
```

### 4.4 TodoList.tsx 수정

**변경 없음** - 이미 개별 task의 `completed` 상태를 관리하고 있음

---

## 5. 데이터베이스 스키마

### 5.1 기존 tasks 테이블 (변경 없음)
```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY,
  title TEXT,
  task_type TEXT,
  scheduled_date DATE,
  end_date DATE,           -- 개별 날짜 레코드에서는 NULL
  completed INTEGER,       -- 0 또는 1
  task_group_id TEXT,      -- 같은 연속 작업 그룹
  group_start_date DATE,   -- (신규) 원본 시작일
  group_end_date DATE,     -- (신규) 원본 종료일
  ...
);
```

### 5.2 신규 필드 추가 (선택사항)
- `group_start_date`: 연속 작업의 원본 시작일
- `group_end_date`: 연속 작업의 원본 종료일
- 캘린더에서 연속 박스 렌더링 시 활용 가능

---

## 6. 구현 순서

### Phase 1: 데이터 저장 로직 수정
1. `work-calculator-dialog.tsx` 수정
   - 날짜별 개별 Task 레코드 생성
   - `taskGroupId`로 같은 작업 그룹 연결

### Phase 2: To-do list 표시 수정
2. `HomePage.tsx` 수정
   - `selectedDate`에 맞는 작업만 필터링

### Phase 3: 캘린더 연속 박스 유지/개선
3. `calendar-grid.tsx` 확인
   - `taskGroupId` 기반 그룹화가 정상 작동하는지 검증
   - 필요시 그룹화 로직 조정

### Phase 4: 기존 데이터 마이그레이션 (선택)
4. 기존에 `endDate`가 있는 작업들을 개별 레코드로 분리
   - 마이그레이션 스크립트 작성

---

## 7. 영향 범위

### 7.1 수정 대상 파일
| 파일 | 변경 내용 |
|------|-----------|
| `work-calculator-dialog.tsx` | 날짜별 개별 Task 생성 |
| `HomePage.tsx` | To-do 필터링 로직 추가 |
| `calendar-grid.tsx` | 그룹화 로직 검증/조정 |
| `add-task-dialog-improved.tsx` | (선택) 일반 작업 등록 시에도 동일 적용 |

### 7.2 영향받는 기능
- 농작업 계산기를 통한 일괄 작업 등록
- 홈 화면 To-do list
- 캘린더 탭 연속 박스 표시
- 통계 페이지 작업 완료율 (추후)

---

## 8. 검증 시나리오

### 테스트 케이스 1: 작업 등록
1. 농작업 계산기에서 "1/21~1/23 파종" 등록
2. **예상 결과**: 3개의 Task 레코드 생성 (같은 taskGroupId)

### 테스트 케이스 2: To-do 표시
1. 홈 화면에서 1/21 선택
2. **예상 결과**: "파종" 작업 1개 표시
3. 1/22 선택
4. **예상 결과**: "파종" 작업 1개 표시 (1/21과 별개)

### 테스트 케이스 3: 개별 완료 처리
1. 1/21의 "파종" 완료 체크
2. **예상 결과**: 1/21만 completed=1, 1/22와 1/23은 completed=0 유지

### 테스트 케이스 4: 캘린더 표시
1. 캘린더 탭에서 1월 확인
2. **예상 결과**: 21~23일에 걸친 하나의 연속 박스로 "파종" 표시

---

## 9. 리스크 및 고려사항

### 9.1 데이터 증가
- 3일 작업 → 3개 레코드 (기존 1개 대비 증가)
- 대부분의 농작업은 짧은 기간이므로 큰 영향 없음

### 9.2 기존 데이터 호환성
- 기존에 `endDate`로 저장된 작업은 마이그레이션 필요
- 또는 To-do 필터링에서 날짜 범위 체크 로직 추가로 하위 호환 유지

### 9.3 그룹 수정/삭제
- 연속 작업 중 일부만 수정/삭제 시 처리 방안 필요
- `taskGroupId`로 연결된 작업들 일괄 처리 옵션 제공

---

## 10. 승인

- [ ] 기획 검토 완료
- [ ] 개발 착수 승인
- [ ] QA 테스트 계획 수립
