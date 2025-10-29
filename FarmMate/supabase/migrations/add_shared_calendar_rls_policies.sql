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
CREATE POLICY "Users can view own farms"
ON farms FOR SELECT
USING (auth.uid()::text = user_id);

-- Users can view farms shared with them
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
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own farms"
ON farms FOR UPDATE
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own farms"
ON farms FOR DELETE
USING (auth.uid()::text = user_id);

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
USING (auth.uid()::text = user_id);

-- tasks_v1.farm_id is TEXT, farms.id is UUID, need to cast
-- Connect tasks through farms, same as crops
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
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own tasks v1"
ON tasks_v1 FOR UPDATE
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own tasks v1"
ON tasks_v1 FOR DELETE
USING (auth.uid()::text = user_id);

-- ============================================================================
-- CROPS TABLE
-- crops.farm_id is UUID
-- ============================================================================

ALTER TABLE crops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own crops" ON crops;
DROP POLICY IF EXISTS "Users can view shared crops" ON crops;
DROP POLICY IF EXISTS "Users can insert own crops" ON crops;
DROP POLICY IF EXISTS "Users can update own crops" ON crops;
DROP POLICY IF EXISTS "Users can delete own crops" ON crops;

CREATE POLICY "Users can view own crops"
ON crops FOR SELECT
USING (auth.uid()::text = user_id);

-- crops.farm_id is UUID, farms.id is UUID
CREATE POLICY "Users can view shared crops"
ON crops FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM calendar_shares cs
    INNER JOIN farms f ON cs.calendar_id::text = f.id::text
    WHERE f.id::text = crops.farm_id::text
    AND cs.shared_user_id::text = auth.uid()::text
  )
);

CREATE POLICY "Users can insert own crops"
ON crops FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own crops"
ON crops FOR UPDATE
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own crops"
ON crops FOR DELETE
USING (auth.uid()::text = user_id);
