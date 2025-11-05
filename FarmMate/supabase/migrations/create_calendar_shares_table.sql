-- Create user_profiles table first (for email display)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view all profiles"
ON user_profiles FOR SELECT
USING (true);

CREATE POLICY "Users can update own profile"
ON user_profiles FOR ALL
USING (id = auth.uid());

-- Function to sync auth.users to user_profiles
CREATE OR REPLACE FUNCTION sync_user_profiles()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, display_name, created_at)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email), NOW())
  ON CONFLICT (id) DO UPDATE
  SET email = NEW.email,
      display_name = COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
      updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically sync users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_profiles();

-- Sync existing users to user_profiles
INSERT INTO user_profiles (id, email, display_name, created_at)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'display_name', email) as display_name,
  created_at
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Create calendar_shares table
CREATE TABLE IF NOT EXISTS calendar_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id UUID NOT NULL, -- 캘린더 ID (현재는 user_id로 구분)
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('editor', 'commenter', 'viewer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(calendar_id, shared_user_id)
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_calendar_shares_calendar ON calendar_shares(calendar_id);
CREATE INDEX IF NOT EXISTS idx_calendar_shares_user ON calendar_shares(shared_user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_shares_owner ON calendar_shares(owner_id);

-- Enable RLS
ALTER TABLE calendar_shares ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Owners can view calendar shares" ON calendar_shares;
DROP POLICY IF EXISTS "Shared users can view own permissions" ON calendar_shares;
DROP POLICY IF EXISTS "Owners can manage calendar shares" ON calendar_shares;
DROP POLICY IF EXISTS "Cannot share with self" ON calendar_shares;

-- RLS Policies

-- 소유자는 모든 공유 설정 조회 가능
CREATE POLICY "Owners can view calendar shares"
ON calendar_shares FOR SELECT
USING (owner_id = auth.uid());

-- 공유받은 사용자는 자신의 권한 정보 조회 가능
CREATE POLICY "Shared users can view own permissions"
ON calendar_shares FOR SELECT
USING (shared_user_id = auth.uid());

-- 소유자는 공유 설정 생성/수정/삭제 가능
CREATE POLICY "Owners can manage calendar shares"
ON calendar_shares FOR ALL
USING (owner_id = auth.uid());

-- 자기 자신을 공유 대상에서 제외
CREATE POLICY "Cannot share with self"
ON calendar_shares FOR INSERT
WITH CHECK (owner_id != shared_user_id);

-- 댓글 기능은 향후 구현 예정
-- tasks 테이블이 생성된 후에 아래 주석을 해제하여 실행하세요

/*
-- Add task_comments table for future comment feature
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for task_comments
CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id);

-- Enable RLS for task_comments
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_comments (commenters and editors can view, commenters and editors can create)
CREATE POLICY "Users can view comments on shared calendars"
ON task_comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tasks t
    LEFT JOIN calendar_shares cs ON cs.calendar_id = t.user_id
    WHERE t.id = task_comments.task_id
    AND (
      t.user_id = auth.uid() OR
      cs.shared_user_id = auth.uid()
    )
  )
);

CREATE POLICY "Commenters and editors can create comments"
ON task_comments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tasks t
    LEFT JOIN calendar_shares cs ON cs.calendar_id = t.user_id
    WHERE t.id = task_comments.task_id
    AND (
      (t.user_id = auth.uid() AND task_comments.user_id = auth.uid()) OR
      (cs.shared_user_id = auth.uid() AND cs.role IN ('editor', 'commenter') AND task_comments.user_id = auth.uid())
    )
  )
);
*/

