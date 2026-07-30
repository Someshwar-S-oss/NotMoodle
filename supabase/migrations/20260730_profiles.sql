create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  is_approved boolean default false,
  is_superuser boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on row level security
alter table public.profiles enable row level security;

-- Policies
create policy "Public profiles are viewable by superusers or self."
  on profiles for select
  using ( auth.uid() = id or (select is_superuser from profiles where id = auth.uid()) );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

create policy "Superusers can update any profile."
  on profiles for update
  using ( (select is_superuser from profiles where id = auth.uid()) );

-- Trigger to create a profile when a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, is_approved, is_superuser)
  values (
    new.id, 
    new.email, 
    false, 
    -- if it is a specific email, make them superuser (this is an example, but superusers can be set manually)
    (new.email = 'eshwar@example.com') 
  );
  return new;
end;
$$;

-- Trigger the function every time a user is created
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
