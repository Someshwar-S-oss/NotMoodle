# Task 2: Warm Academic Editorial Admin Console with Tabs & Audit Stream

## Files
- Modify: `src/app/admin/page.tsx`
- Modify: `src/app/course/[id]/page.tsx` (instrument `resource.view` audit event)
- Create: `src/__tests__/AdminPageAndAuditLogs.test.tsx`

## Requirements
1. **Instrument `resource.view` in Course Page (`src/app/course/[id]/page.tsx`)**:
   - Import `recordClientAudit from "@/lib/audit-logger"`.
   - In `handleClick` when a student clicks on a file module (`isFile`), call `recordClientAudit({ action: "resource.view", entityType: "course_resource", entityId: String(mod.id), details: { name: mod.name, courseId } })`.

2. **Admin Console Redesign (`src/app/admin/page.tsx`)**:
   - Replace brutalist square containers, 2px borders, and hard drop shadows (`shadow-[4px_4px_0px_var(--color-foreground)]`) with Warm Academic Editorial styling (`rounded-2xl border border-border/40 bg-card shadow-sm hover:shadow-md`).
   - **Hero Header & Metric Cards**:
     - Clash Display title `Admin Console`.
     - 4 metric overview cards:
       - **Total Users** (total profiles count)
       - **Approved Accounts** (profiles where `is_approved === true`)
       - **Pending Approvals** (profiles where `is_approved === false`, amber tint badge)
       - **Total Events** (total audit events count from API)
   - **Segmented Tabs**:
     - `User Management` (with users count badge)
     - `Audit Logs` (with live events count badge)
   - **User Management Tab**:
     - Search input (filtering user names and emails in real-time) with clear `X` button.
     - Status filter tabs: `All`, `Approved`, `Pending`.
     - User cards:
       - User name, email badge, Joined date, Superuser badge if applicable.
       - Approval toggle button:
         - "Approve Access" (green badge/button) or "Revoke Access" (subtle destructive hover) with optimistic UI update and loading state.
         - Log `admin.user_approval` audit event via `recordClientAudit` when toggled.
     - Friendly empty state when no users match search/filter.
   - **Audit Logs Tab**:
     - Search input (search user email or entity ID) with clear `X` button.
     - Action category filter pills: `All`, `Logins`, `Submissions`, `Resources`, `Moodle`, `Admin`.
     - Real-time audit log rows:
       - User avatar/initials, user email, IP address / user agent hints.
       - Semantic action badge with soft color coding (Green for `assignment.submit`, Amber for `moodle.connect`, Blue for `resource.view`, Purple for `admin.user_approval`, Slate for others).
       - Relative timestamp (`"2m ago"`, `"1h ago"`).
       - Expandable JSON details modal/dialog to view `details` payload cleanly formatted.
     - Friendly empty state when no logs match.

3. **Minor Hardening (from Task 1 review)**:
   - In `/api/admin/audit-logs/route.ts`: sanitize commas from `search` query parameter before passing to PostgREST `.or(...)` filter.

4. **Integration Tests (`src/__tests__/AdminPageAndAuditLogs.test.tsx`)**:
   - Test unauthorized non-superusers are redirected to `/dashboard`.
   - Test metric overview cards display correct values.
   - Test switching tabs between "User Management" and "Audit Logs".
   - Test user search and approval/revocation state toggle.
   - Test audit log search, category filter pills, and detail inspect modal.

5. **Verification**:
   - Run `npx jest src/__tests__/AdminPageAndAuditLogs.test.tsx` and full suite `npm test`.
   - Run `npm run build`.
   - Commit with message: `feat: redesign admin page with warm editorial tabs and audit log stream`.
