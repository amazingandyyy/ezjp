-- Check if this migration has already been applied
do $$
begin
  if exists (
    select 1
    from supabase_migrations.schema_migrations
    where version = '20240405'
  ) then
    raise notice 'Migration 20240405 has already been applied';
    return;
  end if;

  -- Drop any duplicate or conflicting policies
  drop policy if exists "Users can view their own saved news" on saved_articles;
  drop policy if exists "Users can insert their own saved news" on saved_articles;
  drop policy if exists "Users can delete their own saved news" on saved_articles;
  drop policy if exists "Users can view their own saved articles" on saved_articles;
  drop policy if exists "Users can insert their own saved articles" on saved_articles;
  drop policy if exists "Users can delete their own saved articles" on saved_articles;

  -- Ensure saved_articles has the correct structure
  alter table if exists public.saved_articles
    drop column if exists title,
    drop column if exists date,
    drop column if exists image,
    add column if not exists article_id uuid references public.articles(id) on delete cascade,
    add column if not exists reading_progress jsonb default '{"current_sentence": 0, "total_sentences": 0}'::jsonb;

  -- Create the correct policies
  create policy "Users can view their own saved articles"
    on saved_articles for select
    using (auth.uid() = user_id);

  create policy "Users can insert their own saved articles"
    on saved_articles for insert
    with check (auth.uid() = user_id);

  create policy "Users can delete their own saved articles"
    on saved_articles for delete
    using (auth.uid() = user_id);

  -- Ensure indexes exist
  drop index if exists saved_news_article_id_idx;
  create index if not exists saved_articles_article_id_idx on public.saved_articles (article_id);

  -- Ensure RLS is enabled
  alter table if exists public.saved_articles enable row level security;
end $$; 