-- rec_result 테이블에 입력 조건 컬럼 추가
ALTER TABLE public.rec_result 
  ADD COLUMN IF NOT EXISTS rec_range INTEGER,
  ADD COLUMN IF NOT EXISTS rec_period TEXT;

-- 코멘트 추가
COMMENT ON COLUMN public.rec_result.rec_range IS '재배 범위 (이랑 수)';
COMMENT ON COLUMN public.rec_result.rec_period IS '재배 시기 (예: "3월 ~ 6월")';




