-- Fix vegelab_search_registration RPC function column names
-- First drop the existing function
DROP FUNCTION IF EXISTS public.vegelab_search_registration(text);

-- Then create the new function with corrected column names
CREATE OR REPLACE FUNCTION public.vegelab_search_registration(query text)
RETURNS TABLE (
  "작물번호" bigint,
  "대분류" text,
  "품목" text,
  "품종" text,
  "파종육묘구분" text,
  "총재배기간" bigint,
  "육묘기간" bigint,
  "생육기간" bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r."작물번호",
    r."대분류",
    r."품목", 
    r."품종",
    r."파종 / 육묘 구분" as "파종육묘구분",
    r."총 재배기간 (파종 ~ 수확) (단위:일)" as "총재배기간",
    r."육묘기간 (파종 ~ 정식) (단위:일)" as "육묘기간",
    r."생육 기간 (밭을 사용하는 기간) (단위:일)" as "생육기간"
  FROM public.registration r
  WHERE 
    r."품목" ILIKE '%' || query || '%' OR
    r."품종" ILIKE '%' || query || '%' OR
    r."대분류" ILIKE '%' || query || '%'
  ORDER BY 
    CASE 
      WHEN r."품목" ILIKE query || '%' THEN 1
      WHEN r."품목" ILIKE '%' || query || '%' THEN 2
      ELSE 3
    END,
    r."품목",
    r."품종"
  LIMIT 50;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.vegelab_search_registration(text) TO authenticated;
