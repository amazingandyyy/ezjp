-- Create AI tutor sessions table
CREATE TABLE ai_tutor_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  article_id UUID REFERENCES articles(id) NOT NULL,
  sentence_index INTEGER NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE ai_tutor_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for the new table
CREATE POLICY "AI tutor costs are viewable by everyone" 
ON ai_tutor_sessions FOR SELECT 
USING (true);

-- Allow anyone to insert AI tutor sessions
CREATE POLICY "Anyone can insert AI tutor sessions" 
ON ai_tutor_sessions 
FOR INSERT 
WITH CHECK (true);
