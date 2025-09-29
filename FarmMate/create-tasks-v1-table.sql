-- 기존 tasks 테이블을 유지하고 새로운 tasks_v1 테이블 생성
-- Supabase 대시보드의 SQL Editor에서 실행하세요

-- 1. 새로운 tasks_v1 테이블 생성 (우리 API에 맞는 구조)
CREATE TABLE public.tasks_v1 (
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

-- 2. RLS 활성화 및 정책 설정
ALTER TABLE public.tasks_v1 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tasks v1" ON public.tasks_v1
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own tasks v1" ON public.tasks_v1
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own tasks v1" ON public.tasks_v1
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own tasks v1" ON public.tasks_v1
    FOR DELETE USING (auth.uid()::text = user_id);

-- 3. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_tasks_v1_user_id ON public.tasks_v1(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_v1_scheduled_date ON public.tasks_v1(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_tasks_v1_user_date ON public.tasks_v1(user_id, scheduled_date);

-- 4. updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tasks_v1_updated_at BEFORE UPDATE ON public.tasks_v1
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. 테이블 생성 완료 확인
SELECT 
    'tasks_v1 테이블 생성 완료' as status,
    COUNT(*) as total_tables
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'tasks_v1';

-- 완료! 이제 tasks_v1 테이블이 생성되었습니다.
-- 기존 tasks 테이블은 그대로 유지됩니다.
