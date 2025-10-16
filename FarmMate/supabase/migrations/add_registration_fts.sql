-- Create generated tsvector column and GIN index for FTS on public.registration
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.registration
      ADD COLUMN IF NOT EXISTS fts tsvector GENERATED ALWAYS AS (
        to_tsvector('simple',
          coalesce("대분류", '') || ' ' ||
          coalesce("품목", '')   || ' ' ||
          coalesce("품종", '')   || ' ' ||
          coalesce("파종육묘구분", '')
        )
      ) STORED;
  EXCEPTION WHEN undefined_table THEN
    -- table not present in this environment; skip
    NULL;
  END;

  BEGIN
    CREATE INDEX IF NOT EXISTS registration_fts_idx
      ON public.registration USING gin (fts);
  EXCEPTION WHEN undefined_table THEN
    -- table not present; skip
    NULL;
  END;
END$$;

-- RPC: Full-text search over registration using prefix matching per token
-- Splits incoming query by spaces and applies :* (prefix) and AND-concatenates
CREATE OR REPLACE FUNCTION vegelab_search_registration(query text)
RETURNS TABLE (
  id text,
  "대분류" text,
  "품목" text,
  "품종" text,
  "파종육묘구분" text
) AS $$
  WITH tokens AS (
    SELECT regexp_split_to_array(trim(coalesce(query, '')), '\\s+') AS arr
  ), ts AS (
    SELECT array_to_string(
      (
        SELECT array_agg(CASE WHEN t <> '' THEN t || ':*' ELSE NULL END)
        FROM unnest((SELECT arr FROM tokens)) AS t
      ),
      ' & '
    ) AS tsquery
  )
  SELECT
    r.id::text,
    r."대분류",
    r."품목",
    r."품종",
    r."파종육묘구분"
  FROM public.registration r, ts
  WHERE (trim(coalesce(query, '')) <> '')
    AND (
      -- prefer using generated column when present
      (r.fts IS NOT NULL AND r.fts @@ to_tsquery('simple', ts.tsquery))
      OR
      (r.fts IS NULL AND to_tsvector('simple', coalesce(r."대분류", '') || ' ' || coalesce(r."품목", '') || ' ' || coalesce(r."품종", '') || ' ' || coalesce(r."파종육묘구분", '')) @@ to_tsquery('simple', ts.tsquery))
    )
  LIMIT 50;
$$ LANGUAGE sql STABLE;


