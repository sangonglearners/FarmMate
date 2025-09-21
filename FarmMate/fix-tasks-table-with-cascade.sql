-- 기존 뷰와 의존성을 고려한 안전한 tasks 테이블 수정
-- Supabase 대시보드의 SQL Editor에서 실행하세요

-- 1. 기존 데이터 확인
SELECT COUNT(*) as total_tasks FROM public.tasks;

-- 2. 기존 테이블 백업
CREATE TABLE IF NOT EXISTS tasks_backup AS 
SELECT *, NOW() as backup_created_at FROM public.tasks;

-- 3. 의존하는 뷰 확인
SELECT schemaname, viewname, definition 
FROM pg_views 
WHERE schemaname = 'public' AND viewname LIKE '%task%';

-- 4. 의존하는 뷰 삭제 (CASCADE 사용)
DROP VIEW IF EXISTS public.v_tasks_with_crop CASCADE;

-- 5. 불필요한 컬럼 삭제 (CASCADE로 의존 객체도 함께 삭제)
ALTER TABLE public.tasks DROP COLUMN IF EXISTS operation CASCADE;
ALTER TABLE public.tasks DROP COLUMN IF EXISTS crop_variety_id CASCADE;
ALTER TABLE public.tasks DROP COLUMN IF EXISTS environment CASCADE;
ALTER TABLE public.tasks DROP COLUMN IF EXISTS start_date CASCADE;
ALTER TABLE public.tasks DROP COLUMN IF EXISTS status CASCADE;
ALTER TABLE public.tasks DROP COLUMN IF EXISTS notes CASCADE;

-- 6. 필요한 컬럼 추가
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS task_type TEXT DEFAULT '기타';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS scheduled_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS crop_id TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS row_number INTEGER;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completed INTEGER DEFAULT 0;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- 7. 기존 데이터 마이그레이션
UPDATE public.tasks SET description = title WHERE description IS NULL AND title IS NOT NULL;
UPDATE public.tasks SET scheduled_date = end_date WHERE scheduled_date IS NULL AND end_date IS NOT NULL;

-- 8. NOT NULL 제약조건 추가
UPDATE public.tasks SET task_type = '기타' WHERE task_type IS NULL;
UPDATE public.tasks SET scheduled_date = CURRENT_DATE WHERE scheduled_date IS NULL;

ALTER TABLE public.tasks ALTER COLUMN task_type SET NOT NULL;
ALTER TABLE public.tasks ALTER COLUMN scheduled_date SET NOT NULL;

-- 9. RLS 정책 재생성
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제
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

-- 10. 인덱스 재생성
DROP INDEX IF EXISTS idx_tasks_user_id;
DROP INDEX IF EXISTS idx_tasks_scheduled_date;
DROP INDEX IF EXISTS idx_tasks_user_date;

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_date ON public.tasks(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_tasks_user_date ON public.tasks(user_id, scheduled_date);

-- 11. updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_tasks_updated_at ON public.tasks;
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 12. 수정 완료 확인
SELECT 
    '테이블 수정 완료' as status,
    COUNT(*) as total_tasks,
    COUNT(CASE WHEN task_type IS NOT NULL THEN 1 END) as tasks_with_type,
    COUNT(CASE WHEN scheduled_date IS NOT NULL THEN 1 END) as tasks_with_date
FROM public.tasks;

-- 13. 새로운 뷰 생성 (필요시)
-- CREATE VIEW public.v_tasks_with_crop AS
-- SELECT 
--     t.*,
--     c.name as crop_name,
--     f.name as farm_name
-- FROM public.tasks t
-- LEFT JOIN public.crops c ON t.crop_id = c.id
-- LEFT JOIN public.farms f ON t.farm_id = f.id;

-- 완료! 이제 작업 등록이 정상적으로 작동할 것입니다.
