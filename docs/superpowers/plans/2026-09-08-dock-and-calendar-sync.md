# Dock Modernization & Calendar Sync Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul the Navigation Dock into an elevated frosted pill with superuser shortcut, and repair the iCal/Google Calendar synchronization architecture with real client-side sync and RFC 5545 compliance (respecting Vercel Hobby limits).

**Architecture:** Create client-side sync helper `src/lib/sync-assignments.ts` to fetch from Moodle in-browser and push to `/api/moodle/sync`. Enhance `/api/calendar/feed/[userId]` with `X-PUBLISHED-TTL`, `SEQUENCE`, and `LAST-MODIFIED`. Modernize `src/components/Dock.css` and `src/components/NavigationDock.tsx` into a warm frosted glass pill with superuser Admin shortcut.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, Motion, Lucide Icons, Jest.

## Global Constraints
- Strictly adhere to Vercel Hobby tier limitations: no long-running serverless functions and no server-side Moodle fetches (which are blocked by university firewall).
- Preserve existing route navigation and active indicator logic.
- Ensure all dock styles support `prefers-reduced-motion` and WCAG AA contrast in light and dark themes.
- Every task must be verified with `npm test` and `npm run build`.

---

### Task 1: Real-Time Calendar Sync Architecture (iCal RFC 5545, Settings Fix & Client Sync Utility)

**Files:**
- Create: `src/lib/sync-assignments.ts`
- Modify: `src/app/api/calendar/feed/[userId]/route.ts`
- Modify: `src/app/settings/page.tsx`
- Modify: `src/app/dashboard/page.tsx`
- Test: `src/__tests__/CalendarSync.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export async function syncUserAssignments(token: string): Promise<{ success: boolean; count: number; error?: string }>;
  ```

- [ ] **Step 1: Write unit tests for `syncUserAssignments` and Calendar Feed RFC 5545 output**
In `src/__tests__/CalendarSync.test.ts`:
- Test `syncUserAssignments` calls Moodle APIs and posts to `/api/moodle/sync`.
- Test `/api/calendar/feed/[userId]` outputs `X-PUBLISHED-TTL:PT15M`, `REFRESH-INTERVAL`, `SEQUENCE:1`, and `LAST-MODIFIED`.

- [ ] **Step 2: Create `src/lib/sync-assignments.ts`**
Implement `syncUserAssignments` leveraging `getCurrentCourses` and `getAssignments` from `@/lib/moodle-client`, and posting to `/api/moodle/sync`.

- [ ] **Step 3: Update `src/app/api/calendar/feed/[userId]/route.ts`**
Add RFC 5545 calendar subscription headers:
- `X-PUBLISHED-TTL:PT15M`
- `REFRESH-INTERVAL;VALUE=DURATION:PT15M`
- `SEQUENCE:1`
- `STATUS:CONFIRMED`
- `LAST-MODIFIED:${lastSync}`
- HTTP headers: `Cache-Control: no-cache, no-store, max-age=0, must-revalidate`.

- [ ] **Step 4: Update Settings Page (`src/app/settings/page.tsx`)**
- Fix `handleManualResync` to retrieve token and execute `syncUserAssignments(token)`.
- Add a direct "Subscribe in Calendar" button with `webcal://` link scheme alongside "Copy Feed URL".

- [ ] **Step 5: Run tests and verify build**
Run: `npm test src/__tests__/CalendarSync.test.ts` and `npm run build`
Expected: PASS

- [ ] **Step 6: Commit changes**
```bash
git add src/lib/sync-assignments.ts src/app/api/calendar/feed/[userId]/route.ts src/app/settings/page.tsx src/__tests__/CalendarSync.test.ts
git commit -m "feat: overhaul calendar sync with client Moodle fetch and RFC 5545 iCal headers"
```

---

### Task 2: Floating Frosted Pill Dock & Superuser Admin Shortcut

**Files:**
- Modify: `src/components/Dock.css`
- Modify: `src/components/NavigationDock.tsx`
- Modify: `src/__tests__/NavigationDock.test.tsx`

**Interfaces:**
- Produces: Elevated floating pill dock (`rounded-full`, frosted glass `bg-card/80 backdrop-blur-xl border border-border/40 shadow-xl`), smooth item magnification, active luminous indicators, and superuser Admin Console shortcut.

- [ ] **Step 1: Write unit tests for updated NavigationDock**
In `src/__tests__/NavigationDock.test.tsx`:
- Test dock renders as rounded-full pill with active indicators.
- Test superuser profile displays `Shield` icon navigating to `/admin`.
- Test non-superuser profile does not display `Shield` icon.

- [ ] **Step 2: Redesign Dock styling in `src/components/Dock.css`**
- Replace brutalist `.dock-panel` with:
  `border-radius: 9999px; background-color: var(--card); border: 1px solid var(--border); box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1); padding: 0.5rem 0.75rem;`
- Replace `.dock-item` with:
  `border-radius: 9999px; background-color: transparent; border: 1px solid transparent;`
- Soften `.dock-label` to `border-radius: 0.5rem; background-color: var(--foreground); color: var(--background); font-family: var(--font-geist-mono);`

- [ ] **Step 3: Update `src/components/NavigationDock.tsx`**
- Query Supabase profile for `is_superuser`.
- If superuser, add Admin item with `Shield` icon (`isSuperuser && { label: 'Admin', icon: <Shield />, onClick: () => router.push('/admin'), isActive: currentPath === '/admin' }`).
- Refine active indicator with soft luminous dot and `motion-reduce:transition-none`.

- [ ] **Step 4: Run full test suite and production build**
Run: `npm test` and `npm run build`
Expected: PASS (All test suites passing, zero TypeScript errors)

- [ ] **Step 5: Commit changes**
```bash
git add src/components/Dock.css src/components/NavigationDock.tsx src/__tests__/NavigationDock.test.tsx
git commit -m "feat: modernize navigation dock into floating frosted pill with admin shortcut"
```
