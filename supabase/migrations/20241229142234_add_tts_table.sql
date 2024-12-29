-- Create a new merged table for TTS data
CREATE TABLE tts_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voice_name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  article_id UUID REFERENCES articles(id) NOT NULL,
  sentence_index INTEGER NOT NULL,
  character_count INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(article_id, sentence_index)
);

-- Enable RLS
ALTER TABLE tts_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for the new table
CREATE POLICY "Voice costs are viewable by everyone" 
ON tts_sessions FOR SELECT 
USING (true);

-- Allow anyone to insert TTS sessions
CREATE POLICY "Anyone can insert TTS sessions" 
ON tts_sessions 
FOR INSERT 
WITH CHECK (true);

-- Allow anyone to update count
CREATE POLICY "Anyone can update count" 
ON tts_sessions 
FOR UPDATE
USING (true); 