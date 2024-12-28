-- Create finished_articles table
create table if not exists public.finished_articles (
  id bigint primary key generated always as identity,
  user_id uuid references auth.users(id) on delete cascade not null,
  url text not null,
  title text not null,
  finished_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, url)
);

-- Create RLS policies
alter table public.finished_articles enable row level security;

-- Allow users to view their own finished articles
create policy "Users can view their own finished articles"
  on public.finished_articles
  for select
  using (auth.uid() = user_id);

-- Allow users to insert their own finished articles
create policy "Users can insert their own finished articles"
  on public.finished_articles
  for insert
  with check (auth.uid() = user_id);

-- Allow users to delete their own finished articles
create policy "Users can delete their own finished articles"
  on public.finished_articles
  for delete
  using (auth.uid() = user_id);

-- Create updated_at trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger for updated_at
create trigger handle_updated_at
  before update on public.finished_articles
  for each row
  execute procedure public.handle_updated_at(); 