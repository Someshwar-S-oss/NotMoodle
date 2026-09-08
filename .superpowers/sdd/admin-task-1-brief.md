# Task 1: Audit Logging Database Schema, Server/Client Utilities & API Endpoints

## Files
- Create: `supabase/migrations/20260908_audit_logs.sql`
- Create: `src/lib/audit-logger.ts`
- Create: `src/app/api/audit/route.ts`
- Create: `src/app/api/admin/audit-logs/route.ts`
- Modify: `src/app/api/moodle/connect/route.ts`
- Modify: `src/app/api/moodle/submit/route.ts`
- Modify: `src/app/api/calendar/feed/[userId]/route.ts`
- Test: `src/__tests__/AuditLogging.test.ts`

## Requirements
1. **Database Schema (`supabase/migrations/20260908_audit_logs.sql`)**:
   - Create `public.audit_logs` table with columns:
     - `id` (uuid primary key default `gen_random_uuid()`)
     - `user_id` (uuid nullable references `auth.users(id) on delete set null`)
     - `user_email` (text)
     - `action` (text not null, e.g. `'auth.login'`, `'moodle.connect'`, `'assignment.submit'`, `'resource.view'`, `'calendar.export'`, `'admin.user_approval'`)
     - `entity_type` (text not null, e.g. `'assignment'`, `'course_resource'`, `'moodle_token'`, `'user_profile'`, `'calendar_feed'`)
     - `entity_id` (text nullable)
     - `details` (jsonb default `'{}'::jsonb`)
     - `ip_address` (text nullable)
     - `user_agent` (text nullable)
     - `created_at` (timestamptz default `timezone('utc'::text, now())` not null)
   - Enable RLS on `public.audit_logs`.
   - RLS policy allowing superusers to select audit logs.
   - RLS policy allowing users / server to insert audit logs.
   - Create index on `created_at` desc and `user_id`.

2. **Audit Logger Utility (`src/lib/audit-logger.ts`)**:
   - `export interface AuditLogParams { userId?: string | null; userEmail?: string | null; action: string; entityType: string; entityId?: string | null; details?: Record<string, any>; req?: Request; }`
   - `export async function logServerAuditEvent(params: AuditLogParams): Promise<void>`
     - Safely extracts IP address (`x-forwarded-for`, `x-real-ip`) and `user-agent` from `req` if provided.
     - Inserts into `audit_logs` using Supabase server client (or service role client if available).
     - Must be wrapped in try/catch — errors must be logged with `console.error` and NOT throw, so primary user actions are never interrupted.
   - `export async function recordClientAudit(params: Omit<AuditLogParams, 'req'>): Promise<void>`
     - Dispatches a `POST` request to `/api/audit` with `{ action, entityType, entityId, details }`.
     - Fails silently on network errors.

3. **API Endpoints**:
   - `src/app/api/audit/route.ts`:
     - `POST` handler for client-side events. Checks user session via `createClient()`. Calls `logServerAuditEvent` with user info and body parameters. Returns `{ success: true }`.
   - `src/app/api/admin/audit-logs/route.ts`:
     - `GET` handler. Checks user session and verifies `is_superuser` from `profiles`. If not superuser, returns 403 Forbidden.
     - Supports query params: `limit` (default 50), `offset` (default 0), `action` (filter by action prefix or name), `search` (filter by email or entity_id).
     - Returns `{ auditLogs: [...], totalCount: number }`.

4. **Instrumentation in Existing API Routes**:
   - In `src/app/api/moodle/connect/route.ts`: Call `logServerAuditEvent({ userId: user.id, userEmail: user.email, action: 'moodle.connect', entityType: 'moodle_token', entityId: user.id, req: request })` after successful upsert.
   - In `src/app/api/moodle/submit/route.ts`: Call `logServerAuditEvent({ userId: user.id, userEmail: user.email, action: 'assignment.submit', entityType: 'assignment', entityId: assignmentId, details: { filename, assignmentId }, req: request })` after submission.
   - In `src/app/api/calendar/feed/[userId]/route.ts`: Call `logServerAuditEvent({ userId, action: 'calendar.export', entityType: 'calendar_feed', entityId: userId, req: request })` on calendar fetch.

5. **Unit Tests (`src/__tests__/AuditLogging.test.ts`)**:
   - Test `logServerAuditEvent` inserts audit log and handles errors gracefully without throwing.
   - Test `/api/audit` endpoint rejects unauthenticated requests or logs correctly.
   - Test `/api/admin/audit-logs` enforces superuser check and returns logs.

6. **Verification**:
   - Run `npx jest src/__tests__/AuditLogging.test.ts` and `npm test`.
   - Run `npm run build`.
   - Commit with message: `feat: add audit logging schema, utilities, and instrumented API routes`.
