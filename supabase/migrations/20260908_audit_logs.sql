-- Audit Logging Migration
-- Create audit_logs table
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.audit_logs enable row level security;

-- Superusers can view audit logs
create policy "Superusers can view audit logs"
  on public.audit_logs for select
  using ( public.is_admin() );

-- Authenticated users or server-side clients can insert audit logs
create policy "Anyone can insert audit logs"
  on public.audit_logs for insert
  with check ( true );

-- Indexes for performant filtering and sorting
create index if not exists idx_audit_logs_created_at on public.audit_logs (created_at desc);
create index if not exists idx_audit_logs_user_id on public.audit_logs (user_id);
create index if not exists idx_audit_logs_action on public.audit_logs (action);
