-- ========================================
-- 추천 기록 자동 삭제 설정
-- 목적: 7일 이상 된 추천 기록을 매일 자동으로 삭제
-- ========================================

-- 1. pg_cron 확장 활성화 (이미 활성화되어 있을 수 있음)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. 오래된 추천 기록을 삭제하는 함수 생성
CREATE OR REPLACE FUNCTION delete_old_recommendations()
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 7일 이상 된 레코드 하드 삭제
  DELETE FROM public.rec_result
  WHERE created_at < NOW() - INTERVAL '7 days';
  
  -- 로그 출력 (선택사항)
  RAISE NOTICE 'Deleted old recommendation records older than 7 days';
END;
$$;

-- 3. 함수에 주석 추가
COMMENT ON FUNCTION delete_old_recommendations() IS '7일 이상 된 추천 기록을 자동으로 삭제하는 함수';

-- 4. cron 작업 등록 (매일 자정 UTC 시간 기준 실행)
SELECT cron.schedule(
  'delete-old-recommendations',     -- 작업 이름
  '0 0 * * *',                      -- cron 표현식: 매일 자정 (00:00 UTC)
  'SELECT delete_old_recommendations();'  -- 실행할 SQL
);

-- 5. cron 작업 확인용 코멘트
-- 등록된 cron 작업 확인: SELECT * FROM cron.job;
-- cron 작업 실행 이력 확인: SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
-- cron 작업 삭제 (필요시): SELECT cron.unschedule('delete-old-recommendations');

