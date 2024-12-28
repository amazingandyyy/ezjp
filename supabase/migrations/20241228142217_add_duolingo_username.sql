-- Add duolingo_username column to profiles table
alter table public.profiles
  add column if not exists duolingo_username text;

-- Update RLS policies to ensure they cover the new field
drop policy if exists "Users can update their own profile fields" on profiles;

create policy "Users can update their own profile fields"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id); 