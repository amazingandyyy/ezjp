-- Add new columns to profiles table
alter table public.profiles
  add column if not exists self_introduction text,
  add column if not exists japanese_level text check (japanese_level in ('N5', 'N4', 'N3', 'N2', 'N1', 'Native')),

-- Update RLS policies to allow users to update these fields
create policy "Users can update their own profile fields"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id); 