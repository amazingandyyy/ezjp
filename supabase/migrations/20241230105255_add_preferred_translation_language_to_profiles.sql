-- Add preferred_translation_language column to profiles table
ALTER TABLE profiles 
ADD COLUMN preferred_translation_language text DEFAULT 'en';

-- Add comment for the new column
COMMENT ON COLUMN profiles.preferred_translation_language IS 'The user''s preferred language for translations'; 