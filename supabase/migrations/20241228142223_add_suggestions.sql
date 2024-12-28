-- Create suggestions table
create table public.suggestions (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  status text not null default 'open' check (status in ('open', 'in_progress', 'completed', 'closed')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  votes_count integer default 0 not null
);

-- Create suggestion votes table
create table public.suggestion_votes (
  id uuid default uuid_generate_v4() primary key,
  suggestion_id uuid references public.suggestions(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (suggestion_id, user_id)
);

-- Enable RLS
alter table public.suggestions enable row level security;
alter table public.suggestion_votes enable row level security;

-- Create policies
create policy "Anyone can view suggestions"
  on public.suggestions for select
  using (true);

create policy "Authenticated users can create suggestions"
  on public.suggestions for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own suggestions"
  on public.suggestions for update
  to authenticated
  using (auth.uid() = user_id);

create policy "Anyone can view votes"
  on public.suggestion_votes for select
  using (true);

create policy "Authenticated users can vote"
  on public.suggestion_votes for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can remove their votes"
  on public.suggestion_votes for delete
  to authenticated
  using (auth.uid() = user_id);

-- Create function to update votes count
create or replace function public.update_suggestion_votes_count()
returns trigger as $$
begin
  if (TG_OP = 'INSERT') then
    update public.suggestions
    set votes_count = votes_count + 1
    where id = NEW.suggestion_id;
    return NEW;
  elsif (TG_OP = 'DELETE') then
    update public.suggestions
    set votes_count = votes_count - 1
    where id = OLD.suggestion_id;
    return OLD;
  end if;
  return null;
end;
$$ language plpgsql security definer;

-- Create trigger for votes count
create trigger update_suggestion_votes_count
  after insert or delete on public.suggestion_votes
  for each row execute function public.update_suggestion_votes_count(); 