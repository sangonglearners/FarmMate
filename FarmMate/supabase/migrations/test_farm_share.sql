-- Supabase에서 농장 공유가 작동하는지 테스트하는 쿼리
-- SQL Editor에서 실행하세요

-- 1. 현재 auth.user ID 확인
SELECT auth.uid() as current_user_id;

-- 2. calendar_shares 데이터 확인 (공유 정보가 있는지)
SELECT 
  cs.id,
  cs.calendar_id,
  cs.owner_id,
  cs.shared_user_id,
  cs.role,
  f.id as farm_id,
  f.name as farm_name,
  f.user_id as farm_owner_id
FROM calendar_shares cs
LEFT JOIN farms f ON cs.calendar_id::text = f.id::text
ORDER BY cs.created_at DESC
LIMIT 10;

-- 3. farms 테이블의 모든 농장 확인
SELECT 
  id,
  user_id,
  name,
  environment,
  area,
  row_count
FROM farms
ORDER BY created_at DESC
LIMIT 10;

-- 4. 현재 정책 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual as using_clause
FROM pg_policies
WHERE tablename = 'farms'
ORDER BY policyname;

-- 5. RLS가 활성화되어 있는지 확인
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'farms';

-- 6. 공유받은 농장 목록 테스트 (현재 사용자가 공유받은 농장)
SELECT 
  f.id,
  f.name,
  f.environment,
  f.area,
  f.row_count,
  f.user_id as owner_id
FROM farms f
WHERE EXISTS (
  SELECT 1 FROM calendar_shares cs
  WHERE cs.calendar_id::text = f.id::text
  AND cs.shared_user_id::text = auth.uid()::text
);


