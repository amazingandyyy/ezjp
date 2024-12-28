-- Add new columns to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS self_introduction text,
  ADD COLUMN IF NOT EXISTS japanese_level text CHECK (japanese_level IN ('N5', 'N4', 'N3', 'N2', 'N1', 'Native'));

-- Update RLS policies to allow users to update these fields
CREATE POLICY "Users can update their own profile fields"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id); 