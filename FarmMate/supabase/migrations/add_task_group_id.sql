-- Add task_group_id column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_group_id VARCHAR;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_tasks_task_group_id ON tasks(task_group_id);

