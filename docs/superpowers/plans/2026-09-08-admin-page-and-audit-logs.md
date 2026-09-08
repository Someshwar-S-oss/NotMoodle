# Admin Page UI/UX Redesign & Audit Logging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul the Admin Page with Warm Academic Editorial design tokens and build a full site-wide audit logging subsystem tracking user and admin actions.

**Architecture:** Create database migration for `audit_logs` table, server and client audit logging utilities, and an API endpoint `/api/admin/audit-logs`. Restructure `/admin` into a tabbed console with metrics overview, search and filtering for users and audit logs, and detail inspect drawers.

**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase (PostgreSQL + RLS), Tailwind CSS v4, Lucide Icons, Jest.

## Global Constraints
- Preserve all existing Next.js App Router conventions and API integrations.
- Maintain existing Supabase authentication and superuser access checks.
- Audit logging failures must be non-fatal: primary student actions (submissions, logins, views) must succeed even if audit write errors occur.
- Ensure all color tokens support both Light mode and Dark mode with WCAG AA contrast.
- Every task must be verified with `npm test` and `npm run build`.

---

### Task 1: Audit Logging Database Schema, Server/Client Utilities & API Endpoints

**Files:**
- Create: `supabase/migrations/20260908_audit_logs.sql`
- Create: `src/lib/audit-logger.ts`
- Create: `src/app/api/audit/route.ts`
- Create: `src/app/api/admin/audit-logs/route.ts`
- Modify: `src/app/api/moodle/connect/route.ts`
- Modify: `src/app/api/moodle/submit/route.ts`
- Modify: `src/app/api/calendar/feed/[userId]/route.ts`
- Test: `src/__tests__/AuditLogging.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export interface AuditLogEntry {
    id: string;
    user_id: string | null;
    user_email: string | null;
    action: string;
    entity_type: string;
    entity_id?: string | null;
    details?: Record<string, any>;
    ip_address?: string | null;
    user_agent?: string | null;
    created_at: string;
  }
  export async function logServerAuditEvent(...): Promise<void>;
  export async function recordClientAudit(...): Promise<void>;
  ```

- [ ] **Step 1: Write unit tests for audit logging utilities and endpoints**
In `src/__tests__/AuditLogging.test.ts`:
- Test `logServerAuditEvent` writing to `audit_logs` table with fallback error resilience.
- Test `POST /api/audit` handling client event payloads.
- Test `GET /api/admin/audit-logs` superuser authorization check and query parameters.

- [ ] **Step 2: Create Supabase migration file `supabase/migrations/20260908_audit_logs.sql`**
Define `audit_logs` table, indexes on `created_at` and `user_id`, and RLS policies.

- [ ] **Step 3: Implement `src/lib/audit-logger.ts`**
Provide `logServerAuditEvent` with IP / user-agent extraction and `recordClientAudit` for browser dispatch.

- [ ] **Step 4: Create API routes `src/app/api/audit/route.ts` and `src/app/api/admin/audit-logs/route.ts`**
Provide endpoints for client audit dispatch and superuser audit log queries with filtering.

- [ ] **Step 5: Instrument existing key routes with audit logging**
- In `src/app/api/moodle/connect/route.ts`: log `moodle.connect`.
- In `src/app/api/moodle/submit/route.ts`: log `assignment.submit`.
- In `src/app/api/calendar/feed/[userId]/route.ts`: log `calendar.export`.

- [ ] **Step 6: Run tests and verify build**
Run: `npm test src/__tests__/AuditLogging.test.ts` and `npm run build`
Expected: PASS

- [ ] **Step 7: Commit changes**
```bash
git add supabase/migrations/20260908_audit_logs.sql src/lib/audit-logger.ts src/app/api/audit/route.ts src/app/api/admin/audit-logs/route.ts src/app/api/moodle/connect/route.ts src/app/api/moodle/submit/route.ts src/app/api/calendar/feed/[userId]/route.ts src/__tests__/AuditLogging.test.ts
git commit -m "feat: add audit logging schema, utilities, and instrumented API routes"
```

---

### Task 2: Warm Academic Editorial Admin Console with Tabs & Audit Stream

**Files:**
- Modify: `src/app/admin/page.tsx`
- Modify: `src/app/course/[id]/page.tsx` (to instrument `resource.view` audit event on preview)
- Create: `src/__tests__/AdminPageAndAuditLogs.test.tsx`

**Interfaces:**
- Consumes: `logServerAuditEvent` or `recordClientAudit`, `/api/admin/audit-logs`
- Produces: Polished Admin console with overview metric cards, tabbed User Management with search & approvals, and live Audit Logs table/timeline.

- [ ] **Step 1: Write integration tests for Admin page**
In `src/__tests__/AdminPageAndAuditLogs.test.tsx`:
- Test unauthorized non-superusers redirected to `/dashboard`.
- Test metric overview cards display correct counts.
- Test tab switching between "User Management" and "Audit Logs".
- Test user search and approval/revocation state toggle.
- Test audit log search, category filter pills, and detail inspect modal.

- [ ] **Step 2: Instrument `resource.view` in `src/app/course/[id]/page.tsx`**
Call `recordClientAudit({ action: 'resource.view', entityType: 'course_resource', entityId: mod.id, details: { name: mod.name, courseId } })` when a student clicks to preview a file.

- [ ] **Step 3: Redesign `src/app/admin/page.tsx`**
- Replace brutalist container borders and hard box shadows with warm elevated cards (`rounded-2xl border border-border/40 bg-card shadow-sm`).
- Implement metric summary cards: Total Users, Approved Users, Pending Approvals, Total Activity.
- Implement segmented tabs: `User Management` and `Audit Logs`.
- Implement User Management list: Search, status filter (`All`, `Approved`, `Pending`), approve/revoke action button with audit logging of `admin.user_approval`.
- Implement Audit Logs timeline: Search, category filter (`All`, `Logins`, `Submissions`, `Resources`, `Moodle`, `Admin`), semantic badge pills, relative timestamps, and JSON details modal.

- [ ] **Step 4: Run full test suite and production build**
Run: `npm test` and `npm run build`
Expected: PASS (All test suites passing, zero TypeScript errors)

- [ ] **Step 5: Commit changes**
```bash
git add src/app/admin/page.tsx src/app/course/[id]/page.tsx src/__tests__/AdminPageAndAuditLogs.test.tsx
git commit -m "feat: redesign admin page with warm editorial tabs and audit log stream"
```
