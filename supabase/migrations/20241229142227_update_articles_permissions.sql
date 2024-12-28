-- Update article permissions to allow public insert
DROP POLICY IF EXISTS "Articles are readable by everyone" ON articles;
DROP POLICY IF EXISTS "Authenticated users can insert articles" ON articles;
DROP POLICY IF EXISTS "Enable public insert access for articles" ON articles;

-- Recreate the public read policy (same as before)
CREATE POLICY "Articles are readable by everyone"
ON articles FOR SELECT
USING (true);

-- Replace authenticated insert with public insert for article scraping
CREATE POLICY "Enable public insert access for articles"
ON articles FOR INSERT
TO public
WITH CHECK (true); 