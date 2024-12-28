-- Rename archived_news table to saved_articles
alter table if exists archived_news rename to saved_articles;

-- Drop existing policies
drop policy if exists "Users can view their own archived news" on saved_articles;
drop policy if exists "Users can insert their own archived news" on saved_articles;
drop policy if exists "Users can delete their own archived news" on saved_articles;

-- Create new policies
create policy "Users can view their own saved news"
  on saved_articles for select
  using (auth.uid() = user_id);

create policy "Users can insert their own saved news"
  on saved_articles for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own saved news"
  on saved_articles for delete
  using (auth.uid() = user_id); 