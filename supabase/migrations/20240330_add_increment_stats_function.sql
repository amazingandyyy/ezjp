-- Create function to increment reading stats
create or replace function increment_reading_stats(
  p_user_id uuid,
  p_reading_time numeric
)
returns void
language plpgsql
security definer
as $$
begin
  update reading_stats
  set 
    total_reading_time = total_reading_time + p_reading_time,
    total_articles_read = total_articles_read + 1,
    updated_at = now()
  where user_id = p_user_id;

  -- If no row was updated, insert a new one
  if not found then
    insert into reading_stats (user_id, total_reading_time, total_articles_read)
    values (p_user_id, p_reading_time, 1);
  end if;
end;
$$; 