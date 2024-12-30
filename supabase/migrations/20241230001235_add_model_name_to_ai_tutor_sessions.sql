-- Add model_name column to ai_tutor_sessions table
ALTER TABLE ai_tutor_sessions
ADD COLUMN model_name TEXT NOT NULL DEFAULT 'gpt-3.5-turbo-1106'; 