-- Add reading goal columns to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS daily_article_goal integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS daily_reading_time_goal integer DEFAULT 5; -- in minutes

-- Update RLS policies to ensure they cover the new fields
DROP POLICY IF EXISTS "Users can update their own profile fields" ON profiles;

CREATE POLICY "Users can update their own profile fields"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id); 