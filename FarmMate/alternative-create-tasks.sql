-- 대안: 기존 테이블을 유지하고 새 테이블 생성
-- Supabase 대시보드의 SQL Editor에서 실행하세요

-- 1. 기존 tasks 테이블 이름 변경 (백업용)
ALTER TABLE public.tasks RENAME TO tasks_old;

-- 2. 새로운 tasks 테이블 생성 (우리 API에 맞는 구조)
CREATE TABLE public.tasks (
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

-- 3. RLS 활성화 및 정책 설정
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tasks" ON public.tasks
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own tasks" ON public.tasks
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own tasks" ON public.tasks
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own tasks" ON public.tasks
    FOR DELETE USING (auth.uid()::text = user_id);

-- 4. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_date ON public.tasks(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_tasks_user_date ON public.tasks(user_id, scheduled_date);

-- 5. updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. 기존 데이터 마이그레이션 (필요시)
-- INSERT INTO public.tasks (id, user_id, title, description, task_type, scheduled_date, end_date, created_at, updated_at)
-- SELECT 
--     id,
--     user_id::text,
--     title,
--     title as description,  -- title을 description으로 복사
--     '기타' as task_type,
--     COALESCE(end_date, CURRENT_DATE) as scheduled_date,
--     end_date,
--     created_at,
--     updated_at
-- FROM public.tasks_old;

-- 완료! 이제 새로운 tasks 테이블이 생성되었습니다.
