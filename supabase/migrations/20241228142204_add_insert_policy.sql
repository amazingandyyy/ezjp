-- Add insert policy for profiles table
create policy "Users can insert their own profile"
  on profiles for insert
  with check ( auth.uid() = id ); 