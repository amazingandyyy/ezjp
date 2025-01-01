-- Create translations table
CREATE TABLE translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES articles(id) NOT NULL,
  sentence_index INTEGER NOT NULL,
  source_text TEXT NOT NULL,
  target_language TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(article_id, sentence_index, target_language)
);

-- Enable RLS
ALTER TABLE translations ENABLE ROW LEVEL SECURITY;

-- Create policies for the new table
CREATE POLICY "Translations are viewable by everyone" 
ON translations FOR SELECT 
USING (true);

-- Allow anyone to insert translations
CREATE POLICY "Anyone can insert translations" 
ON translations 
FOR INSERT 
WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX translations_article_id_idx ON translations(article_id);
CREATE INDEX translations_target_language_idx ON translations(target_language); 