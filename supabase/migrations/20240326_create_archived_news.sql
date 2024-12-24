-- Create archived news table
create table if not exists archived_news (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  url text not null,
  title text not null,
  date text not null,
  image text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Add a unique constraint to prevent duplicate archives
  unique(user_id, url)
);

-- Enable RLS
alter table archived_news enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Users can view their own archived news" on archived_news;
drop policy if exists "Users can insert their own archived news" on archived_news;
drop policy if exists "Users can delete their own archived news" on archived_news;

-- Create policies
create policy "Users can view their own archived news"
  on archived_news for select
  using (auth.uid() = user_id);

create policy "Users can insert their own archived news"
  on archived_news for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own archived news"
  on archived_news for delete
  using (auth.uid() = user_id); 