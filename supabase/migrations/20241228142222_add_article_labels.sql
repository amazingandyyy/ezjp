-- Add labels array field to articles table
ALTER TABLE articles
ADD COLUMN labels text[] DEFAULT '{}';

-- Update RLS policies to include labels
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.articles;
CREATE POLICY "Enable read access for authenticated users"
ON public.articles
FOR SELECT
TO authenticated
USING (true);

-- Add index on labels for better performance
CREATE INDEX IF NOT EXISTS idx_articles_labels ON articles USING GIN (labels);

COMMENT ON COLUMN articles.labels IS 'Array of labels/categories for the article'; 