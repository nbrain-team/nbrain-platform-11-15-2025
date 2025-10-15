-- Add chat_history column to projects table for storing draft conversations
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS chat_history JSONB DEFAULT NULL;

-- Add index on status for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
