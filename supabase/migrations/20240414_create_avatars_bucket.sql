-- Drop existing policies if they exist
drop policy if exists "Files are publicly accessible" on storage.objects;
drop policy if exists "Users can upload files" on storage.objects;
drop policy if exists "Users can update their own files" on storage.objects;
drop policy if exists "Users can delete their own files" on storage.objects;

-- Create user-contents bucket if it doesn't exist
do $$
begin
  insert into storage.buckets (id, name, public)
  values ('user-contents', 'user-contents', true)
  on conflict (id) do update
  set public = true;
end $$;

-- Enable RLS
alter table storage.objects enable row level security;

-- Allow public access to files
create policy "Files are publicly accessible"
on storage.objects for select
using ( bucket_id = 'user-contents' );

-- Allow authenticated users to upload files
create policy "Users can upload files"
on storage.objects for insert
with check (
  bucket_id = 'user-contents'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own files
create policy "Users can update their own files"
on storage.objects for update
using (
  bucket_id = 'user-contents'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own files
create policy "Users can delete their own files"
on storage.objects for delete
using (
  bucket_id = 'user-contents'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);