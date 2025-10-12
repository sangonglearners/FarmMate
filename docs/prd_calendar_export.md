# PRD: 캘린더 내보내기 기능

## 📋 개요
농장 작업 캘린더 데이터를 CSV 파일로 내보내어 외부에서 활용할 수 있도록 하는 기능입니다.

**마감일**: [촉박함]  
**우선순위**: MVP 필수 기능만 구현  
**예상 소요 시간**: 6시간

---

## ✅ 구현 체크리스트

### Phase 1: UI 구성 (2시간)
- [ ] `farm-calendar-grid.tsx`에 내보내기 버튼 추가
- [ ] `export-calendar-dialog.tsx` 컴포넌트 생성
  - [ ] 농장 선택 Select
  - [ ] 날짜 범위 DatePicker (시작/종료)
  - [ ] 이랑 범위 NumberInput (시작/종료)
  - [ ] 유효성 검사 (종료일 >= 시작일, 종료이랑 >= 시작이랑)
- [ ] 다이얼로그 상태 관리 (useState)

### Phase 2: CSV 생성 로직 (2시간)
- [ ] `csvExport.ts` 유틸 파일 생성
- [ ] CSV 컬럼 헤더 정의
- [ ] 데이터 필터링 함수 구현
  - [ ] 날짜 범위 필터링 (scheduledDate, endDate 고려)
  - [ ] 이랑 범위 필터링
  - [ ] 선택된 농장의 작업만
- [ ] 작업-작물 데이터 조인
- [ ] CSV 문자열 생성 (쉼표, 따옴표 이스케이프 처리)
- [ ] UTF-8 BOM 추가 (Excel 호환성)

### Phase 3: 다운로드 기능 (1시간)
- [ ] 파일 다운로드 함수 구현
- [ ] 파일명 생성 로직 (`{농장명}_{시작날짜}_{종료날짜}.csv`)
- [ ] 다이얼로그와 연결
- [ ] 다운로드 후 다이얼로그 닫기

### Phase 4: 테스트 및 버그 수정 (1시간)
- [ ] 월간 뷰에서 내보내기 테스트
- [ ] 연간 뷰에서 내보내기 테스트
- [ ] 날짜 범위 경계값 테스트
- [ ] 이랑 범위 경계값 테스트
- [ ] 한글 파일명 테스트 (Windows/Mac)
- [ ] CSV 파일을 Excel에서 열어 한글 깨짐 확인
- [ ] 빈 데이터 처리 (작업 없는 경우)

---

## 🎯 핵심 기능
1. 캘린더 화면에 내보내기 버튼 추가
2. 내보내기 다이얼로그에서 옵션 선택
3. CSV 파일 생성 및 다운로드

---

## 🎨 UI/UX 플로우

```
캘린더 페이지 (우측 상단)
  └─ [내보내기 📥] 버튼
       ↓
  내보내기 다이얼로그
  ├─ 농장 선택 (드롭다운)
  ├─ 뷰 모드 선택 (월간/연간)
  ├─ 날짜 범위 선택
  │   ├─ 시작 날짜 (DatePicker)
  │   └─ 종료 날짜 (DatePicker)
  ├─ 이랑 범위 선택
  │   ├─ 시작 이랑 (NumberInput)
  │   └─ 종료 이랑 (NumberInput)
  └─ [내보내기] 버튼
       ↓
  CSV 파일 다운로드
  (farmName_YYYYMMDD_YYYYMMDD.csv)
```

---

## 📐 기술 스펙

### 1. UI 컴포넌트

#### 1.1 내보내기 버튼 추가
**파일**: `FarmMate/src/components/farm-calendar-grid.tsx`

```tsx
// 570라인 근처, 컨트롤 섹션에 추가
<div className="flex items-center justify-between">
  {/* 기존 농장 선택 */}
  
  <div className="flex space-x-2">
    {/* 기존 월간/연간 버튼 */}
    
    {/* 내보내기 버튼 추가 */}
    <Button
      variant="outline"
      size="sm"
      onClick={() => setShowExportDialog(true)}
    >
      <Download className="w-4 h-4 mr-1" />
      내보내기
    </Button>
  </div>
</div>
```

#### 1.2 내보내기 다이얼로그
**파일**: `FarmMate/src/components/calendar/export-calendar-dialog.tsx` (신규 생성)

```tsx
interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  farms: FarmEntity[];
  defaultFarm?: FarmEntity;
}

// 다이얼로그 내 필드:
// - 농장 선택 (Select)
// - 날짜 범위 (DatePicker x 2)
// - 이랑 범위 (Input[type=number] x 2)
// - 내보내기 버튼
```

### 2. CSV 생성 로직

#### 2.1 CSV 포맷 정의
**파일**: `FarmMate/src/utils/csvExport.ts` (신규 생성)

```typescript
// CSV 컬럼 구조
const CSV_COLUMNS = [
  '농장명',
  '환경', // 노지/시설
  '이랑번호',
  '작물카테고리',
  '작물명',
  '품종',
  '작업명',
  '작업유형',
  '시작날짜',
  '종료날짜',
  '완료여부',
  '상세설명'
];

// 데이터 행 예시
// "우리농장","노지",1,"배추","무","그린","무_파종","파종","2024-10-01","2024-10-01","미완료","이랑: 1번"
```

#### 2.2 데이터 변환 함수

```typescript
export function generateCalendarCSV(
  farm: FarmEntity,
  tasks: Task[],
  crops: Crop[],
  options: {
    startDate: string;  // YYYY-MM-DD
    endDate: string;    // YYYY-MM-DD
    startRow: number;
    endRow: number;
  }
): string {
  // 1. 필터링: 날짜 범위, 이랑 범위에 맞는 작업만
  // 2. 작업별로 작물 정보 조인
  // 3. CSV 문자열 생성
  // 4. 반환
}
```

### 3. 파일 다운로드

```typescript
export function downloadCSV(content: string, filename: string) {
  const BOM = '\uFEFF'; // UTF-8 BOM (Excel 한글 깨짐 방지)
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
```

---

## 📊 CSV 데이터 예시

```csv
농장명,환경,이랑번호,작물카테고리,작물명,품종,작업명,작업유형,시작날짜,종료날짜,완료여부,상세설명
우리농장,노지,1,배추,무,그린,무_파종,파종,2024-10-01,2024-10-01,미완료,이랑: 1번
우리농장,노지,1,배추,무,그린,무_수확,수확,2024-11-01,2024-11-05,완료,이랑: 1번
우리농장,노지,2,뿌리채소,당근,오렌지,당근_정식,정식,2024-10-15,2024-10-15,미완료,이랑: 2번
```

---

## 🚫 제외 항목 (v1에서)
- 이미지 첨부 내보내기
- PDF 형식 지원
- 다른 포맷 (Excel, JSON) 지원
- 자동 예약 내보내기
- 클라우드 저장 연동
- 내보내기 이력 관리

---

## 🔒 보안 고려사항
1. **클라이언트 사이드 생성**: CSV는 브라우저에서 생성되므로 서버 부하 없음
2. **데이터 필터링**: 로그인한 사용자의 데이터만 접근 가능 (기존 RLS 정책 활용)
3. **파일명 검증**: 특수문자 필터링으로 파일 시스템 공격 방지

---

## 📝 참고사항
- CSV는 UTF-8 BOM을 포함하여 생성 (Excel 한글 깨짐 방지)
- 작업이 없는 이랑도 빈 행으로 표시하지 않음 (데이터만 출력)
- endDate가 있는 작업은 단일 행으로 표시 (기간 표시)
- 파일명에 특수문자 사용 시 안전한 문자로 치환

---

## 추가 개선 사항 (v2 이후 고려)
- 내보내기 템플릿 저장 기능
- 컬럼 선택 기능 (필요한 컬럼만 내보내기)
- 다중 농장 동시 내보내기
- Google Sheets 연동
- 자동 백업 기능

