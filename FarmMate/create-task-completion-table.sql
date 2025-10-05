-- 날짜별 작업 완료 상태를 관리하는 테이블 생성
-- Supabase 대시보드의 SQL Editor에서 실행하세요

-- 1. task_completion_dates 테이블 생성
CREATE TABLE public.task_completion_dates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES public.tasks_v1(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    completion_date DATE NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 작업 ID와 날짜의 조합은 유일해야 함
    UNIQUE(task_id, completion_date)
);

-- 2. RLS 활성화 및 정책 설정
ALTER TABLE public.task_completion_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own task completions" ON public.task_completion_dates
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own task completions" ON public.task_completion_dates
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own task completions" ON public.task_completion_dates
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own task completions" ON public.task_completion_dates
    FOR DELETE USING (auth.uid()::text = user_id);

-- 3. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_task_completion_dates_task_id ON public.task_completion_dates(task_id);
CREATE INDEX IF NOT EXISTS idx_task_completion_dates_user_id ON public.task_completion_dates(user_id);
CREATE INDEX IF NOT EXISTS idx_task_completion_dates_completion_date ON public.task_completion_dates(completion_date);
CREATE INDEX IF NOT EXISTS idx_task_completion_dates_user_date ON public.task_completion_dates(user_id, completion_date);

-- 4. updated_at 자동 업데이트 트리거
CREATE TRIGGER update_task_completion_dates_updated_at BEFORE UPDATE ON public.task_completion_dates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. 테이블 생성 완료 확인
SELECT 'task_completion_dates table created successfully' as status;
