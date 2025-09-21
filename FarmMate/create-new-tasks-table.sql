-- 기존 tasks 테이블 대신 새로운 tasks_v2 테이블 생성
-- Supabase 대시보드의 SQL Editor에서 실행하세요

-- 1. 새로운 tasks_v2 테이블 생성
CREATE TABLE IF NOT EXISTS public.tasks_v2 (
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

-- 2. RLS 활성화
ALTER TABLE public.tasks_v2 ENABLE ROW LEVEL SECURITY;

-- 3. 보안 정책 설정
CREATE POLICY "Users can view own tasks v2" ON public.tasks_v2
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own tasks v2" ON public.tasks_v2
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own tasks v2" ON public.tasks_v2
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own tasks v2" ON public.tasks_v2
    FOR DELETE USING (auth.uid()::text = user_id);

-- 4. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_tasks_v2_user_id ON public.tasks_v2(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_v2_scheduled_date ON public.tasks_v2(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_tasks_v2_user_date ON public.tasks_v2(user_id, scheduled_date);

-- 5. updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tasks_v2_updated_at BEFORE UPDATE ON public.tasks_v2
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 완료! 이제 tasks_v2 테이블을 사용할 수 있습니다.
