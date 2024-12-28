-- Create articles table
create table if not exists public.articles (
  id uuid primary key default uuid_generate_v4(),
  url text not null unique,
  source_domain text not null,
  title jsonb not null, -- Store structured title with ruby text
  content jsonb not null, -- Store structured content with ruby text
  publish_date timestamp with time zone,
  images jsonb[], -- Store array of image objects with src, alt, caption
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_fetched_at timestamp with time zone default timezone('utc'::text, now()) not null,
  fetch_count integer default 1 not null
);

-- Create index on url for faster lookups
create index if not exists articles_url_idx on public.articles (url);
create index if not exists articles_source_domain_idx on public.articles (source_domain);

-- Enable RLS
alter table public.articles enable row level security;

-- Create updated_at trigger
create trigger handle_updated_at
  before update on public.articles
  for each row
  execute function public.handle_updated_at();

-- Create function to extract domain from URL
create or replace function public.extract_domain(url text)
returns text
language plpgsql
immutable
as $$
declare
  domain text;
begin
  -- Extract domain using regex
  select substring(url from '(?:.*://)?(?:www\.)?([^/?#]+)')
  into domain;
  
  return domain;
end;
$$; 