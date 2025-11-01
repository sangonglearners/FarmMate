-- Add RLS policy to allow shared users to delete their own shared permissions
-- This allows users to remove themselves from shared calendars

ALTER TABLE calendar_shares ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Shared users can delete own permissions" ON calendar_shares;

-- 공유받은 사용자는 자신의 권한만 삭제 가능
CREATE POLICY "Shared users can delete own permissions"
ON calendar_shares FOR DELETE
USING (shared_user_id = auth.uid());

