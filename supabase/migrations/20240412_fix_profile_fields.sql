-- Set default for japanese_level
ALTER TABLE public.profiles
  ALTER COLUMN japanese_level SET DEFAULT 'N5';

-- Update existing records
UPDATE profiles 
SET japanese_level = 'N5' 
WHERE japanese_level = 'beginner';

UPDATE profiles 
SET japanese_level = 'N4' 
WHERE japanese_level = 'intermediate';

UPDATE profiles 
SET japanese_level = 'N3' 
WHERE japanese_level = 'advanced'; 