# 🚀 FarmMate Supabase 설정 가이드

## 1. Supabase 데이터베이스 테이블 생성

### 1단계: Supabase 대시보드 접속
1. [supabase.com](https://supabase.com)에 로그인
2. 프로젝트 선택
3. 왼쪽 메뉴에서 **SQL Editor** 클릭

### 2단계: Tasks 테이블 생성
`supabase-tasks-table.sql` 파일의 내용을 복사해서 SQL Editor에 붙여넣고 실행하세요.

```sql
-- FarmMate Tasks 테이블 생성
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    task_type TEXT NOT NULL DEFAULT '기타',
    scheduled_date DATE NOT NULL,
    end_date DATE,
    farm_id TEXT,
    crop_id TEXT,
    row_number INTEGER,
    completed INTEGER DEFAULT 0,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 활성화 및 보안 정책 설정
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tasks" ON public.tasks
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own tasks" ON public.tasks
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own tasks" ON public.tasks
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own tasks" ON public.tasks
    FOR DELETE USING (auth.uid()::text = user_id);
```

## 2. 환경 변수 설정

### .env 파일 생성
프로젝트 루트에 `.env` 파일을 만들고 다음 내용을 추가하세요:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Supabase 키 찾기
1. Supabase 대시보드에서 **Settings** → **API** 클릭
2. **Project URL**을 `VITE_SUPABASE_URL`에 복사
3. **anon public**을 `VITE_SUPABASE_ANON_KEY`에 복사

## 3. 변경사항 요약

### ✅ 완료된 작업
1. **Supabase 데이터베이스 연결**: 로컬 스토리지 → Supabase 데이터베이스
2. **사용자별 데이터 분리**: RLS 정책으로 완전한 보안
3. **실시간 동기화**: 어떤 기기든 구글 계정으로 로그인하면 데이터 동기화
4. **작업 수정/삭제 기능**: 완전히 구현됨

### 🔒 보안 기능
- **RLS (Row Level Security)**: 사용자는 자신의 데이터만 접근 가능
- **인증 기반 접근**: 로그인된 사용자만 데이터 조작 가능
- **자동 사용자 ID 연결**: Supabase Auth와 자동 연동

### 📱 사용 방법
1. **작업 생성**: 캘린더에서 날짜 클릭 → 작업 추가
2. **작업 수정**: 캘린더에서 작업 클릭 → 수정 다이얼로그
3. **작업 삭제**: 수정 다이얼로그에서 삭제 버튼
4. **데이터 삭제**: 마이페이지 → 설정 → 데이터 삭제

## 4. 테스트 방법

### 사용자 분리 테스트
1. **류현욱님 계정**으로 로그인 → 작업 생성
2. 로그아웃 → **산공러너스님 계정**으로 로그인
3. 류현욱님의 작업이 보이지 않는지 확인 ✅
4. 산공러너스님 작업 생성
5. 다시 류현욱님 계정으로 로그인
6. 각자의 작업만 보이는지 확인 ✅

### 기기 간 동기화 테스트
1. 컴퓨터에서 작업 생성
2. 스마트폰에서 같은 구글 계정으로 로그인
3. 작업이 동기화되어 보이는지 확인 ✅

## 5. 문제 해결

### 작업이 보이지 않는 경우
1. 구글 계정으로 정상 로그인되었는지 확인
2. 브라우저 개발자 도구 → Console에서 오류 확인
3. Supabase 테이블이 정상 생성되었는지 확인

### 권한 오류가 발생하는 경우
1. RLS 정책이 정상 설정되었는지 확인
2. Supabase Auth가 활성화되었는지 확인

---

🎉 **축하합니다!** 이제 FarmMate가 완전한 클라우드 기반 농장 관리 시스템이 되었습니다!
