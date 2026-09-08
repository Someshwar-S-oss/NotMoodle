# Dock Modernization & Calendar Sync Overhaul - Design Specification

## 1. Overview & Context
This specification addresses two key user experience and functional areas:
1. **Dock Modernization**: Elevating the brutalist navigation dock into an elegant floating frosted glass pill matching the Warm Academic Editorial language (`rounded-full`, `backdrop-blur-xl`, subtle border, soft luminous active indicator, and superuser Admin shortcut).
2. **Real-Time Calendar Sync Architecture (iCal & Google Calendar)**: Resolving the issue where external calendar subscriptions only fetched data once and never updated, while strictly respecting **Vercel Hobby Tier serverless limits** (avoiding Moodle server IP blocks and serverless function timeouts/quotas).

## 2. Root Cause Analysis & Technical Constraints
- **Vercel IP Block on University Moodle**: Moodle server firewalls block Vercel serverless IP addresses. All direct Moodle API communication must originate from the client browser.
- **Vercel Hobby Function Limits**: 10-second function timeout and limited monthly invocations mean the calendar endpoint (`/api/calendar/feed/[userId]`) must strictly serve pre-cached assignments from Supabase rather than making outbound calls to Moodle.
- **The Sync Bugs**:
  - `src/app/settings/page.tsx`: The "Sync Now" button was posting `{ assignments: [] }` to `/api/moodle/sync`.
  - Assignment sync to Supabase only ran when viewing the `/dashboard` page.
  - The generated `.ics` feed lacked standard RFC 5545 recurrence/refresh headers (`X-PUBLISHED-TTL:PT15M`, `REFRESH-INTERVAL;VALUE=DURATION:PT15M`, `SEQUENCE`, `LAST-MODIFIED`), leading Google Calendar to permanently cache the first response.

## 3. Architecture & Subsystems

### 3.1 Real-Time Calendar Sync
1. **Shared Client-Side Sync Utility (`src/lib/sync-assignments.ts`)**:
   - `syncUserAssignments(token: string): Promise<{ count: number, error?: string }>`:
     - Fetches enrolled courses and assignments from Moodle in the browser (bypassing Vercel IP blocks).
     - Pushes `{ assignments }` to `POST /api/moodle/sync`.
     - Updates `localStorage.setItem('moodle_last_sync_timestamp', Date.now().toString())`.
2. **Settings Page Polish (`src/app/settings/page.tsx`)**:
   - Fix "Sync Now" button to invoke `syncUserAssignments`.
   - Add a one-click "Subscribe in Calendar" button (`webcal://...`) alongside "Copy Feed URL".
3. **App-Wide Throttled Sync**:
   - When authenticated users visit the application, run a throttled background sync (at most once every 15 minutes) to ensure `cached_assignments` in Supabase stays up-to-date even if they don't manually click sync.
4. **Enhanced Calendar Feed Route (`src/app/api/calendar/feed/[userId]/route.ts`)**:
   - Add iCal headers:
     ```
     X-PUBLISHED-TTL:PT15M
     REFRESH-INTERVAL;VALUE=DURATION:PT15M
     ```
   - For each event:
     - Add `LAST-MODIFIED:${lastSync}`
     - Add `SEQUENCE:1`
     - Add `STATUS:CONFIRMED`
     - Set `DESCRIPTION` with assignment course and submission direct link.
   - Serve with HTTP headers:
     `Cache-Control: no-cache, no-store, max-age=0, must-revalidate`
     `Content-Type: text/calendar; charset=utf-8`

### 3.2 Floating Frosted Pill Dock
1. **Dock Shell (`src/components/Dock.tsx` & `src/components/Dock.css`)**:
   - Transform container `.dock-panel`:
     - `rounded-full bg-card/80 backdrop-blur-xl border border-border/40 shadow-xl px-4 py-2 flex items-center`.
     - Eliminate brutalist `4px 4px 0px var(--border)` hard offset shadow and square corners.
   - Transform items `.dock-item`:
     - `rounded-full bg-background/50 border border-border/20 text-foreground hover:bg-muted/80`.
     - Active indicator: soft glowing dot or pill indicator.
   - Transform tooltips `.dock-label`:
     - `rounded-lg bg-foreground text-background text-xs font-mono px-3 py-1 shadow-md border border-border/20`.
2. **NavigationDock (`src/components/NavigationDock.tsx`)**:
   - Check if current user is a superuser via Supabase profile query.
   - If superuser, add **Admin** shortcut (`Shield` icon) routing to `/admin`.
   - Maintain route indicators for Dashboard, Notifications, Settings, and Admin.

## 4. Verification & Testing
- Unit & integration tests in `src/__tests__/CalendarSyncAndDock.test.tsx`:
  - Verify `syncUserAssignments` fetches and pushes assignments.
  - Verify `POST /api/moodle/sync` caches assignments properly.
  - Verify `/api/calendar/feed/[userId]` outputs valid iCal with `X-PUBLISHED-TTL`, `SEQUENCE`, and `LAST-MODIFIED`.
  - Verify `Dock` renders as rounded-full with active indicators and accessible toolbar role.
  - Verify `NavigationDock` displays Admin tab when user is a superuser.
- Run `npm test` and `npm run build` with zero errors.
