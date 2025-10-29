-- RLS 정책 테스트 쿼리
-- Supabase SQL Editor에서 실행하여 현재 정책 상태를 확인하세요

-- 1. 현재 활성화된 RLS 정책 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('farms', 'tasks_v1', 'crops')
ORDER BY tablename, policyname;

-- 2. calendar_shares 테이블 확인
SELECT 
  id,
  calendar_id,
  owner_id,
  shared_user_id,
  role,
  created_at
FROM calendar_shares
LIMIT 10;

-- 3. farms 테이블의 실제 데이터 타입 확인
SELECT 
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_name = 'farms'
AND column_name IN ('id', 'user_id');

-- 4. crops 테이블의 farm_id 타입 확인
SELECT 
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_name = 'crops'
AND column_name IN ('farm_id', 'user_id');

-- 5. tasks_v1 테이블의 farm_id 타입 확인
SELECT 
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_name = 'tasks_v1'
AND column_name IN ('farm_id', 'user_id');

