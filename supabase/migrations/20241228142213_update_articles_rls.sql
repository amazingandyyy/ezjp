-- Update RLS policies for articles table
drop policy if exists "Articles are readable by everyone" on articles;
drop policy if exists "Authenticated users can insert articles" on articles;
drop policy if exists "Service role can update articles" on articles;
drop policy if exists "Authenticated users can update articles" on articles;

-- Anyone can read articles
create policy "Articles are readable by everyone"
  on articles for select
  using (true);

-- Authenticated users can insert articles
create policy "Authenticated users can insert articles"
  on articles for insert
  with check (auth.role() = 'authenticated');

-- Authenticated users can update articles
create policy "Authenticated users can update articles"
  on articles for update
  using (auth.role() = 'authenticated');

-- Create function to update article fetch count and last fetched time
create or replace function public.update_article_fetch_stats(article_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.articles
  set 
    fetch_count = fetch_count + 1,
    last_fetched_at = now()
  where id = article_id;
end;
$$;

-- Create migration helper function to populate article_id in saved_articles
create or replace function public.populate_saved_news_article_ids()
returns void
language plpgsql
security definer
as $$
begin
  update public.saved_articles sn
  set article_id = a.id
  from public.articles a
  where sn.url = a.url
  and sn.article_id is null;
end;
$$;

-- Create migration helper function to populate article_id in finished_articles
create or replace function public.populate_finished_articles_article_ids()
returns void
language plpgsql
security definer
as $$
begin
  update public.finished_articles fa
  set article_id = a.id
  from public.articles a
  where fa.url = a.url
  and fa.article_id is null;
end;
$$; 