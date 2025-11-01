-- Create calendar_comments table for comments on shared calendars
CREATE TABLE IF NOT EXISTS calendar_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id TEXT NOT NULL, -- farm_id를 calendar_id로 사용 (farms.id는 varchar 타입)
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key relationship to user_profiles
-- Supabase autogen은 이 FK를 인식하지 못하므로 명시적으로 추가
ALTER TABLE calendar_comments
DROP CONSTRAINT IF EXISTS calendar_comments_user_id_fkey;

-- 외래 키를 명시적으로 생성하여 Supabase가 자동 조인할 수 있도록 함
-- 하지만 user_profiles가 auth.users를 참조하므로 간접 관계
-- 대신 FK 생성을 건너뛰고 인라인 조회로 처리

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_calendar_comments_calendar ON calendar_comments(calendar_id);
CREATE INDEX IF NOT EXISTS idx_calendar_comments_user ON calendar_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_comments_created ON calendar_comments(created_at DESC);

-- Enable RLS
ALTER TABLE calendar_comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view comments on shared calendars" ON calendar_comments;
DROP POLICY IF EXISTS "Owners, editors and commenters can create comments" ON calendar_comments;
DROP POLICY IF EXISTS "Users can update own comments" ON calendar_comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON calendar_comments;

-- RLS Policies

-- 소유자, editor, commenter는 댓글을 볼 수 있음
CREATE POLICY "Users can view comments on shared calendars"
ON calendar_comments FOR SELECT
USING (
  -- 소유자인 경우
  EXISTS (
    SELECT 1 FROM farms f
    WHERE f.id::text = calendar_comments.calendar_id
    AND f.user_id::text = auth.uid()::text
  )
  OR
  -- editor 또는 commenter 권한이 있는 경우
  EXISTS (
    SELECT 1 FROM calendar_shares cs
    WHERE cs.calendar_id::text = calendar_comments.calendar_id
    AND cs.shared_user_id::text = auth.uid()::text
    AND cs.role IN ('editor', 'commenter')
  )
);

-- 소유자, editor, commenter는 댓글을 작성할 수 있음
CREATE POLICY "Owners, editors and commenters can create comments"
ON calendar_comments FOR INSERT
WITH CHECK (
  user_id = auth.uid() -- 본인이 작성한 댓글만 생성 가능
  AND (
    -- 소유자인 경우
    EXISTS (
      SELECT 1 FROM farms f
      WHERE f.id::text = calendar_comments.calendar_id
      AND f.user_id::text = auth.uid()::text
    )
    OR
    -- editor 또는 commenter 권한이 있는 경우
    EXISTS (
      SELECT 1 FROM calendar_shares cs
      WHERE cs.calendar_id::text = calendar_comments.calendar_id
      AND cs.shared_user_id::text = auth.uid()::text
      AND cs.role IN ('editor', 'commenter')
    )
  )
);

-- 본인이 작성한 댓글은 수정 가능
CREATE POLICY "Users can update own comments"
ON calendar_comments FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 소유자 또는 본인이 작성한 댓글은 삭제 가능
CREATE POLICY "Users can delete own comments"
ON calendar_comments FOR DELETE
USING (
  user_id = auth.uid()
  OR
  -- 소유자인 경우 모든 댓글 삭제 가능
  EXISTS (
    SELECT 1 FROM farms f
    WHERE f.id::text = calendar_comments.calendar_id
    AND f.user_id::text = auth.uid()::text
  )
);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_calendar_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_calendar_comments_updated_at
    BEFORE UPDATE ON calendar_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_calendar_comments_updated_at();

