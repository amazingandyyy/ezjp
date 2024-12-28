-- Add username column to profiles table
alter table profiles add column if not exists username text;

-- Add unique constraint to username
alter table profiles add constraint profiles_username_key unique (username);

-- Create index for username lookups
create index if not exists profiles_username_idx on profiles (username);

-- Update RLS policies to allow users to update their own profile
drop policy if exists "Users can update own profile" on profiles;

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id); 