-- Create reading_stats table
create table if not exists reading_stats (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users on delete cascade not null,
  total_reading_time numeric default 0,
  total_articles_read integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id)
);

-- Enable RLS
alter table reading_stats enable row level security;

-- Create policies
create policy "Users can view their own reading stats"
  on reading_stats for select
  using (auth.uid() = user_id);

create policy "Users can update their own reading stats"
  on reading_stats for update
  using (auth.uid() = user_id);

create policy "Users can insert their own reading stats"
  on reading_stats for insert
  with check (auth.uid() = user_id);

-- Create function to handle new user signups
create or replace function handle_new_user_stats()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.reading_stats (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

-- Create trigger for new user signups
create trigger on_auth_user_created_stats
  after insert on auth.users
  for each row execute procedure handle_new_user_stats(); 