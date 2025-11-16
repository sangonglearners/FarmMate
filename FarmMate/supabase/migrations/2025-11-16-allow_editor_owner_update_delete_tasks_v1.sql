-- Allow farm owners and editor-role shared users to update/delete tasks_v1
-- Safe to re-run: drops old policies then recreates with broader rules

ALTER TABLE tasks_v1 ENABLE ROW LEVEL SECURITY;

-- Drop existing restrictive policies if present
DROP POLICY IF EXISTS "Users can update own tasks v1" ON tasks_v1;
DROP POLICY IF EXISTS "Users can delete own tasks v1" ON tasks_v1;

-- Update policy: author OR farm owner OR editor of the farm
CREATE POLICY "Users can update tasks v1 as author/owner/editor"
ON tasks_v1 FOR UPDATE
USING (
  user_id::text = auth.uid()::text
  OR EXISTS (
    SELECT 1
    FROM farms f
    WHERE f.id::text = tasks_v1.farm_id::text
      AND f.user_id::text = auth.uid()::text
  )
  OR EXISTS (
    SELECT 1
    FROM calendar_shares cs
    INNER JOIN farms f ON cs.calendar_id::text = f.id::text
    WHERE f.id::text = tasks_v1.farm_id::text
      AND cs.shared_user_id::text = auth.uid()::text
      AND cs.role = 'editor'
  )
);

-- Delete policy: author OR farm owner OR editor of the farm
CREATE POLICY "Users can delete tasks v1 as author/owner/editor"
ON tasks_v1 FOR DELETE
USING (
  user_id::text = auth.uid()::text
  OR EXISTS (
    SELECT 1
    FROM farms f
    WHERE f.id::text = tasks_v1.farm_id::text
      AND f.user_id::text = auth.uid()::text
  )
  OR EXISTS (
    SELECT 1
    FROM calendar_shares cs
    INNER JOIN farms f ON cs.calendar_id::text = f.id::text
    WHERE f.id::text = tasks_v1.farm_id::text
      AND cs.shared_user_id::text = auth.uid()::text
      AND cs.role = 'editor'
  )
);


