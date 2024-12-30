-- Add is_follow_up column to ai_tutor_sessions table
ALTER TABLE ai_tutor_sessions
ADD COLUMN is_follow_up BOOLEAN NOT NULL DEFAULT false; 