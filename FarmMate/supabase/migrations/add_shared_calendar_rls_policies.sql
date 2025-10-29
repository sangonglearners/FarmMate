-- Add RLS policies to allow shared users to view shared farms and tasks
-- Based on actual table schema:
-- farms.id: UUID
-- tasks_v1.farm_id: TEXT
-- crops.farm_id: UUID
-- calendar_shares.calendar_id: UUID

-- ============================================================================
-- FARMS TABLE
-- ============================================================================

ALTER TABLE farms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own farms" ON farms;
DROP POLICY IF EXISTS "Users can view shared farms" ON farms;
DROP POLICY IF EXISTS "Users can insert own farms" ON farms;
DROP POLICY IF EXISTS "Users can update own farms" ON farms;
DROP POLICY IF EXISTS "Users can delete own farms" ON farms;

-- Users can view their own farms
-- user_id를 TEXT로 캐스팅하여 비교 (UUID 타입도 TEXT로 변환 가능)
CREATE POLICY "Users can view own farms"
ON farms FOR SELECT
USING (user_id::text = auth.uid()::text);

-- Users can view farms shared with them
-- calendar_id는 UUID, farms.id는 TEXT이므로 캐스팅 필요
CREATE POLICY "Users can view shared farms"
ON farms FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM calendar_shares cs
    WHERE cs.calendar_id::text = farms.id::text
    AND cs.shared_user_id::text = auth.uid()::text
  )
);

CREATE POLICY "Users can insert own farms"
ON farms FOR INSERT
WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can update own farms"
ON farms FOR UPDATE
USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can delete own farms"
ON farms FOR DELETE
USING (user_id::text = auth.uid()::text);

-- ============================================================================
-- TASKS_V1 TABLE
-- tasks_v1.farm_id is TEXT, farms.id is UUID
-- ============================================================================

ALTER TABLE tasks_v1 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own tasks v1" ON tasks_v1;
DROP POLICY IF EXISTS "Users can view shared tasks v1" ON tasks_v1;
DROP POLICY IF EXISTS "Users can insert own tasks v1" ON tasks_v1;
DROP POLICY IF EXISTS "Users can update own tasks v1" ON tasks_v1;
DROP POLICY IF EXISTS "Users can delete own tasks v1" ON tasks_v1;

CREATE POLICY "Users can view own tasks v1"
ON tasks_v1 FOR SELECT
USING (user_id::text = auth.uid()::text);

-- tasks_v1.farm_id is TEXT, farms.id is TEXT (varchar)
-- Connect tasks through farms
CREATE POLICY "Users can view shared tasks v1"
ON tasks_v1 FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM calendar_shares cs
    INNER JOIN farms f ON cs.calendar_id::text = f.id::text
    WHERE f.id::text = tasks_v1.farm_id::text
    AND cs.shared_user_id::text = auth.uid()::text
  )
);

CREATE POLICY "Users can insert own tasks v1"
ON tasks_v1 FOR INSERT
WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can update own tasks v1"
ON tasks_v1 FOR UPDATE
USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can delete own tasks v1"
ON tasks_v1 FOR DELETE
USING (user_id::text = auth.uid()::text);

-- ============================================================================
-- CROPS TABLE
-- crops.farm_id is UUID
-- 작물은 공유되지 않음 - 사용자는 자신의 작물만 볼 수 있음
-- ============================================================================

ALTER TABLE crops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own crops" ON crops;
DROP POLICY IF EXISTS "Users can view shared crops" ON crops;
DROP POLICY IF EXISTS "Users can insert own crops" ON crops;
DROP POLICY IF EXISTS "Users can update own crops" ON crops;
DROP POLICY IF EXISTS "Users can delete own crops" ON crops;

CREATE POLICY "Users can view own crops"
ON crops FOR SELECT
USING (user_id::text = auth.uid()::text);

-- 작물은 공유되지 않으므로 공유 작물 조회 정책 제거
-- 사용자는 자신의 작물만 볼 수 있음

CREATE POLICY "Users can insert own crops"
ON crops FOR INSERT
WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can update own crops"
ON crops FOR UPDATE
USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can delete own crops"
ON crops FOR DELETE
USING (user_id::text = auth.uid()::text);
