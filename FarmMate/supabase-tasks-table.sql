-- FarmMate Tasks 테이블 생성
-- Supabase 대시보드의 SQL Editor에서 실행하세요

-- 1. tasks 테이블 생성
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

-- 2. RLS (Row Level Security) 활성화
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 3. 사용자는 자신의 작업만 볼 수 있도록 정책 설정
CREATE POLICY "Users can view own tasks" ON public.tasks
    FOR SELECT USING (auth.uid()::text = user_id);

-- 4. 사용자는 자신의 작업만 생성할 수 있도록 정책 설정
CREATE POLICY "Users can insert own tasks" ON public.tasks
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- 5. 사용자는 자신의 작업만 수정할 수 있도록 정책 설정
CREATE POLICY "Users can update own tasks" ON public.tasks
    FOR UPDATE USING (auth.uid()::text = user_id);

-- 6. 사용자는 자신의 작업만 삭제할 수 있도록 정책 설정
CREATE POLICY "Users can delete own tasks" ON public.tasks
    FOR DELETE USING (auth.uid()::text = user_id);

-- 7. 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_date ON public.tasks(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_tasks_user_date ON public.tasks(user_id, scheduled_date);

-- 8. updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 완료! 이제 테이블이 생성되고 RLS 정책이 적용되었습니다.
