-- 작업 완료 상태를 날짜별로 개별 관리하는 테이블 생성
-- Supabase 대시보드의 SQL Editor에서 실행하세요

-- 1. task_completions 테이블 생성
CREATE TABLE public.task_completions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    completion_date DATE NOT NULL,
    completed INTEGER DEFAULT 0,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 복합 유니크 제약조건: 같은 작업, 같은 사용자, 같은 날짜는 하나만 존재
    UNIQUE(task_id, user_id, completion_date)
);

-- 2. RLS 활성화 및 정책 설정
ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own task completions" ON public.task_completions
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own task completions" ON public.task_completions
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own task completions" ON public.task_completions
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own task completions" ON public.task_completions
    FOR DELETE USING (auth.uid()::text = user_id);

-- 3. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_task_completions_task_id ON public.task_completions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_user_id ON public.task_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_completion_date ON public.task_completions(completion_date);
CREATE INDEX IF NOT EXISTS idx_task_completions_user_date ON public.task_completions(user_id, completion_date);

-- 4. updated_at 자동 업데이트 트리거
CREATE TRIGGER update_task_completions_updated_at BEFORE UPDATE ON public.task_completions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. 테이블 생성 완료 확인
SELECT 'task_completions 테이블이 성공적으로 생성되었습니다.' as message;