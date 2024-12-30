-- Drop the unique constraint on article_id and sentence_index
ALTER TABLE ai_tutor_sessions
DROP CONSTRAINT IF EXISTS ai_tutor_sessions_article_id_sentence_index_key; 