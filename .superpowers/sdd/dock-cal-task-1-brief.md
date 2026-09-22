# Task 1: Real-Time Calendar Sync Architecture (iCal RFC 5545, Settings Fix & Client Sync Utility)

## Files
- Create: `src/lib/sync-assignments.ts`
- Modify: `src/app/api/calendar/feed/[userId]/route.ts`
- Modify: `src/app/settings/page.tsx`
- Test: `src/__tests__/CalendarSync.test.ts`

## Constraints & Context
- Remember that Moodle firewalls block Vercel's IP addresses. All direct Moodle calls must happen client-side in the browser.
- The server route `/api/calendar/feed/[userId]` must remain lightweight, serving cached assignments from Supabase.
- Fix the broken manual sync button in Settings (which was previously calling `/api/moodle/sync` with `{ assignments: [] }`).

## Requirements
1. **Client Sync Utility (`src/lib/sync-assignments.ts`)**:
   - `export async function syncUserAssignments(token: string): Promise<{ success: boolean; count: number; error?: string }>`
   - Calls Moodle functions directly in browser:
     - `getSiteInfo(token)` to get userid.
     - `getCurrentCourses(token, userid)` to get enrolled courses.
     - `getAssignments(token, courseIds)` to get assignment items.
   - Pushes `{ assignments }` to `POST /api/moodle/sync`.
   - On success, updates `localStorage.setItem('moodle_last_sync_timestamp', Date.now().toString())` and returns `{ success: true, count: assignments.length }`.
   - Defensive error handling: returns `{ success: false, count: 0, error: err.message }` on network failure.

2. **Calendar Feed Route Enhancement (`src/app/api/calendar/feed/[userId]/route.ts`)**:
   - In `icsLines`:
     - Add `X-PUBLISHED-TTL:PT15M`
     - Add `REFRESH-INTERVAL;VALUE=DURATION:PT15M`
   - For each event:
     - Add `LAST-MODIFIED:${lastSync}`
     - Add `SEQUENCE:1`
     - Add `STATUS:CONFIRMED`
   - HTTP response headers:
     `'Content-Type': 'text/calendar; charset=utf-8'`
     `'Content-Disposition': 'attachment; filename="notmoodle-deadlines.ics"'`
     `'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate'`

3. **Settings Page Fix (`src/app/settings/page.tsx`)**:
   - Fix `handleManualResync`:
     - Retrieve stored token (from state or `GET /api/moodle/token`).
     - Call `syncUserAssignments(token)`.
     - Update `lastSync` state with current ISO date.
   - Add a one-click "Subscribe in Calendar" button using the `webcal://` URL scheme (e.g. `calendarUrl.replace(/^https?:\/\//i, 'webcal://')`) alongside the "Copy Feed URL" button.

4. **Unit Tests (`src/__tests__/CalendarSync.test.ts`)**:
   - Test `syncUserAssignments` queries Moodle functions and calls `/api/moodle/sync`.
   - Test `/api/calendar/feed/[userId]` includes `X-PUBLISHED-TTL:PT15M`, `REFRESH-INTERVAL`, `SEQUENCE:1`, and `LAST-MODIFIED`.
   - Test `Cache-Control: no-cache, no-store, max-age=0, must-revalidate` response header.

5. **Verification**:
   - Run `npx jest src/__tests__/CalendarSync.test.ts` and `npm test`.
   - Run `npm run build`.
   - Commit with message: `feat: overhaul calendar sync with client Moodle fetch and RFC 5545 iCal headers`.
