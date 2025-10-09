-- rec_result 테이블에 농장 정보 컬럼 추가
ALTER TABLE public.rec_result 
  ADD COLUMN IF NOT EXISTS farm_name TEXT,
  ADD COLUMN IF NOT EXISTS farm_environment TEXT;

-- 코멘트 추가
COMMENT ON COLUMN public.rec_result.farm_name IS '추천 당시 농장 이름';
COMMENT ON COLUMN public.rec_result.farm_environment IS '추천 당시 재배 환경 (노지/시설/기타)';

