-- Create the storage bucket for course materials (used for preview and RAG)
insert into storage.buckets (id, name, public)
values ('course_files', 'course_files', true)
on conflict (id) do update set public = true;

-- Create the storage bucket for assignment submissions
insert into storage.buckets (id, name, public)
values ('submissions', 'submissions', false)
on conflict (id) do nothing;

-- ─── Policies for 'course_files' (Public reading, authenticated upload) ───

-- Allow anyone to read course files (required for Microsoft Office preview to work)
create policy "Public Access to course files"
  on storage.objects for select
  using ( bucket_id = 'course_files' );

-- Allow authenticated users to upload files to course_files
create policy "Auth Users can upload course files"
  on storage.objects for insert
  with check ( bucket_id = 'course_files' and auth.role() = 'authenticated' );

-- Allow authenticated users to update their own uploads (if needed)
create policy "Auth Users can update course files"
  on storage.objects for update
  using ( bucket_id = 'course_files' and auth.role() = 'authenticated' );


-- ─── Policies for 'submissions' (Private reading, authenticated upload) ───

-- Users can only read their own submissions
create policy "Users can read own submissions"
  on storage.objects for select
  using ( bucket_id = 'submissions' and auth.uid() = owner );

-- Users can upload their own submissions
create policy "Users can upload own submissions"
  on storage.objects for insert
  with check ( bucket_id = 'submissions' and auth.role() = 'authenticated' );

-- Users can delete their own submissions (we delete them after transfer to Moodle)
create policy "Users can delete own submissions"
  on storage.objects for delete
  using ( bucket_id = 'submissions' and auth.uid() = owner );
