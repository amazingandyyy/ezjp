-- Create finished_articles table if it doesn't exist
create table if not exists public.finished_articles (
  id bigint primary key generated always as identity,
  user_id uuid references auth.users(id) on delete cascade not null,
  url text not null,
  title text,
  finished_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, url)
);

-- Enable RLS for finished_articles
alter table public.finished_articles enable row level security;

-- Update saved_articles table structure
alter table public.saved_articles
  drop column if exists title,
  drop column if exists date,
  drop column if exists image,
  add column if not exists article_id uuid references public.articles(id) on delete cascade,
  add column if not exists reading_progress jsonb default '{"current_sentence": 0, "total_sentences": 0}'::jsonb;

-- Update finished_articles table structure
alter table public.finished_articles
  drop column if exists title,
  add column if not exists article_id uuid references public.articles(id) on delete cascade;

-- Add indexes for better performance
create index if not exists saved_articles_article_id_idx on public.saved_articles (article_id);
create index if not exists finished_articles_article_id_idx on public.finished_articles (article_id);

-- Update RLS policies for saved_articles
drop policy if exists "Users can view their own saved articles" on saved_articles;
drop policy if exists "Users can insert their own saved articles" on saved_articles;
drop policy if exists "Users can delete their own saved articles" on saved_articles;

create policy "Users can view their own saved articles"
  on saved_articles for select
  using (auth.uid() = user_id);

create policy "Users can insert their own saved articles"
  on saved_articles for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own saved articles"
  on saved_articles for delete
  using (auth.uid() = user_id);

-- Update RLS policies for finished_articles
drop policy if exists "Users can view their own finished articles" on finished_articles;
drop policy if exists "Users can insert their own finished articles" on finished_articles;
drop policy if exists "Users can delete their own finished articles" on finished_articles;

create policy "Users can view their own finished articles"
  on finished_articles for select
  using (auth.uid() = user_id);

create policy "Users can insert their own finished articles"
  on finished_articles for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own finished articles"
  on finished_articles for delete
  using (auth.uid() = user_id); 