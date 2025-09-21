-- 기존 tasks 테이블을 우리 API에 맞게 수정
-- Supabase 대시보드의 SQL Editor에서 실행하세요

-- 1. 기존 테이블 백업 (선택사항)
-- CREATE TABLE tasks_backup AS SELECT * FROM tasks;

-- 2. 불필요한 컬럼 삭제
ALTER TABLE public.tasks DROP COLUMN IF EXISTS operation;
ALTER TABLE public.tasks DROP COLUMN IF EXISTS crop_variety_id;
ALTER TABLE public.tasks DROP COLUMN IF EXISTS environment;
ALTER TABLE public.tasks DROP COLUMN IF EXISTS start_date;
ALTER TABLE public.tasks DROP COLUMN IF EXISTS status;
ALTER TABLE public.tasks DROP COLUMN IF EXISTS notes;

-- 3. 필요한 컬럼 추가
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS task_type TEXT NOT NULL DEFAULT '기타';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS scheduled_date DATE NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS crop_id TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS row_number INTEGER;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completed INTEGER DEFAULT 0;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- 4. user_id 타입 변경 (uuid -> text)
-- 먼저 기존 데이터 백업
UPDATE public.tasks SET user_id = user_id::text WHERE user_id IS NOT NULL;

-- 5. farm_id 타입 변경 (uuid -> text)
-- 먼저 기존 데이터 백업
UPDATE public.tasks SET farm_id = farm_id::text WHERE farm_id IS NOT NULL;

-- 6. 기본값 설정
UPDATE public.tasks SET 
    task_type = '기타',
    scheduled_date = COALESCE(end_date, CURRENT_DATE),
    completed = 0
WHERE task_type IS NULL OR scheduled_date IS NULL;

-- 7. NOT NULL 제약조건 추가
ALTER TABLE public.tasks ALTER COLUMN task_type SET NOT NULL;
ALTER TABLE public.tasks ALTER COLUMN scheduled_date SET NOT NULL;

-- 8. RLS 정책 확인/재생성
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (있다면)
DROP POLICY IF EXISTS "Users can view own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;

-- 새 정책 생성
CREATE POLICY "Users can view own tasks" ON public.tasks
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own tasks" ON public.tasks
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own tasks" ON public.tasks
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own tasks" ON public.tasks
    FOR DELETE USING (auth.uid()::text = user_id);

-- 9. 인덱스 재생성
DROP INDEX IF EXISTS idx_tasks_user_id;
DROP INDEX IF EXISTS idx_tasks_scheduled_date;
DROP INDEX IF EXISTS idx_tasks_user_date;

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_date ON public.tasks(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_tasks_user_date ON public.tasks(user_id, scheduled_date);

-- 완료!
