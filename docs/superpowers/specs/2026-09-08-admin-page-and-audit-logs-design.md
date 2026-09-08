# Admin Page UI/UX Redesign & Audit Logging System - Design Specification

## 1. Overview & Context
This specification outlines the comprehensive UI/UX overhaul of the NotMoodle Admin Console (`/admin`) and the implementation of a site-wide user Audit Logging subsystem. It replaces the harsh brutalist styling with the Warm Academic Editorial design system (matching Dashboard, Drawers, and Settings), organizes management into a tabbed console, and captures critical student and administrator activities (logins, submissions, token connections, resource views, calendar exports, and user approvals).

## 2. Architecture & Data Model

### 2.1 Supabase Schema (`supabase/migrations/20260908_audit_logs.sql`)
```sql
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete set null,
  user_email text,
  action text not null,          -- 'auth.login', 'moodle.connect', 'assignment.submit', 'resource.view', 'calendar.export', 'admin.user_approval'
  entity_type text not null,     -- 'assignment', 'course_resource', 'moodle_token', 'user_profile', 'calendar_feed'
  entity_id text,                -- ID or resource identifier
  details jsonb default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.audit_logs enable row level security;

create policy "Superusers can view audit logs"
  on audit_logs for select
  using ( (select is_superuser from profiles where id = auth.uid()) );

create policy "Authenticated users can insert audit logs"
  on audit_logs for insert
  with check ( auth.uid() = user_id or auth.uid() is not null or (select is_superuser from profiles where id = auth.uid()) );
```

### 2.2 Logging Infrastructure
- **Server Utility (`src/lib/audit-logger.ts`)**:
  - `logServerAuditEvent({ userId, userEmail, action, entityType, entityId, details, req })`
  - Safely logs events using Supabase server client.
- **Client Route & Helper (`/api/audit` & `recordClientAudit`)**:
  - Endpoint for logging client-side events (e.g. document preview views in Course Explorer).
- **Audit Points**:
  - `/api/moodle/connect`: Logs `moodle.connect`.
  - `/api/moodle/submit`: Logs `assignment.submit`.
  - `/api/calendar/feed/[userId]`: Logs `calendar.export`.
  - `/admin`: Logs `admin.user_approval` on approve/revoke toggle.
  - Course Page Resource View: Logs `resource.view` when a user opens a PDF or reading.
  - Auth Callback: Logs `auth.login`.

### 2.3 API Endpoint (`/api/admin/audit-logs`)
- `GET /api/admin/audit-logs`: Superuser-only route returning paginated/filtered audit logs with actor email, action, details, and timestamps.

## 3. Admin Page UI/UX Redesign (`src/app/admin/page.tsx`)

### 3.1 Layout & Visual System
- **Hero Header**: Clash Display typography, warm editorial background, and responsive metric summary strip:
  - Total Users
  - Approved Accounts
  - Pending Approvals
  - 24-Hour Audit Events
- **Segmented Tabs**:
  - `User Management` (with total count)
  - `Audit Logs` (with live count badge)
- **User Management Tab**:
  - Search bar (name/email) with clear button.
  - Status filter pills: `All`, `Approved`, `Pending`.
  - Soft elevated cards (`rounded-2xl border border-border/40 bg-card shadow-sm hover:shadow-md`).
  - Action buttons: "Approve Access" (green badge/button) or "Revoke Access" (subtle destructive hover) with optimistic state updates and loading spinners.
- **Audit Logs Tab**:
  - Search by user email or entity ID.
  - Action category filter pills: `All`, `Logins`, `Submissions`, `Resources`, `Moodle`, `Admin`.
  - Editorial timeline list showing user identity, action badge with semantic tints, entity reference, relative timestamp (`"5m ago"`), and expandable metadata inspect drawer/modal.

## 4. Verification & Testing
- `src/__tests__/AdminPageAndAuditLogs.test.tsx`:
  - Superuser access check and unauthorized redirect.
  - User list rendering, search filtering, and approval toggle.
  - Audit logs rendering, category filtering, and metadata inspection.
  - Audit logging API endpoints and helpers.
- Run `npm test` and `npm run build` with zero errors.
