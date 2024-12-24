-- Rename archived_news table to saved_news
alter table if exists archived_news rename to saved_news;

-- Drop existing policies
drop policy if exists "Users can view their own archived news" on saved_news;
drop policy if exists "Users can insert their own archived news" on saved_news;
drop policy if exists "Users can delete their own archived news" on saved_news;

-- Create new policies
create policy "Users can view their own saved news"
  on saved_news for select
  using (auth.uid() = user_id);

create policy "Users can insert their own saved news"
  on saved_news for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own saved news"
  on saved_news for delete
  using (auth.uid() = user_id); 