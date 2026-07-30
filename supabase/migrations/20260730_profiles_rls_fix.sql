-- Drop the old flawed policies
drop policy if exists "Public profiles are viewable by superusers or self." on public.profiles;
drop policy if exists "Users can update own profile." on public.profiles;
drop policy if exists "Superusers can update any profile." on public.profiles;

-- Create a security definer function to check superuser status without triggering infinite recursion in RLS
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce((select is_superuser from profiles where id = auth.uid()), false);
$$;

-- Create updated, secure policies
create policy "Users can view their own profile."
  on profiles for select
  using ( auth.uid() = id );

create policy "Superusers can view all profiles."
  on profiles for select
  using ( public.is_admin() );

create policy "Superusers can update any profile."
  on profiles for update
  using ( public.is_admin() );

-- Note: We removed the policy that allowed users to update their own profile.
-- This strictly prevents users from elevating their own permissions or approving themselves.
