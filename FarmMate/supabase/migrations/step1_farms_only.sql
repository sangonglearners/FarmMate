-- Step 1: Only create farms policies (for testing)

ALTER TABLE farms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own farms" ON farms;
DROP POLICY IF EXISTS "Users can view shared farms" ON farms;
DROP POLICY IF EXISTS "Users can insert own farms" ON farms;
DROP POLICY IF EXISTS "Users can update own farms" ON farms;
DROP POLICY IF EXISTS "Users can delete own farms" ON farms;

CREATE POLICY "Users can view own farms"
ON farms FOR SELECT
USING (auth.uid()::text = user_id);

-- Try with both approaches:
CREATE POLICY "Users can view shared farms"
ON farms FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM calendar_shares cs
    WHERE cs.calendar_id::text = farms.id
    AND cs.shared_user_id::text = auth.uid()::text
  )
);



