create table if not exists chat_messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  course_id text not null,
  role text check (role in ('user', 'assistant')) not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table chat_messages enable row level security;

-- Users can read their own messages
create policy "Users can read own chat messages"
  on chat_messages for select
  using ( auth.uid() = user_id );

-- Users can insert their own messages
create policy "Users can insert own chat messages"
  on chat_messages for insert
  with check ( auth.uid() = user_id );
