-- Add full_name column to profiles
alter table public.profiles
add column if not exists full_name text;

-- Update trigger function to insert full_name from raw_user_meta_data
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, is_approved, is_superuser)
  values (
    new.id, 
    new.email,
    new.raw_user_meta_data->>'full_name',
    false, 
    (new.email = 'eshwar@example.com') 
  );
  return new;
end;
$$;
