### Task 4: Dashboard Timeline & Enrolled Course Cards Redesign

**Files:**
- Modify: `src/app/dashboard/page.tsx`
- Test: `src/__tests__/DashboardTimelineCourses.test.tsx` (and run `npm test`)

**Interfaces:**
- Consumes: `events`, `allAssignments`, `courses`, `activeFilter`, `setSelectedAssignment`.
- Produces: Polished timeline rows with human-friendly relative deadline countdowns (*"Due in 2h"*, *"Tomorrow 11:59 PM"*, *"In 3 days"*), direct assignment drawer opening, friendly empty state when deadlines cleared, and elevated Enrolled Course cards with dynamic pastel top accent ribbons, course codes (`CS204`), and pending assignment badges.

**Global Constraints:**
- Preserve all existing Next.js App Router conventions and API route integrations.
- Maintain existing Supabase authentication and Moodle token synchronization logic.
- Ensure all color tokens support both Light mode and Dark mode with WCAG AA contrast compliance.
- Support `prefers-reduced-motion` for all new transitions and animations.
- Every task must be verified with `npm test` and `npm run build` or targeted component tests.

- [ ] **Step 1: Implement human-friendly relative time countdown badge helper**
In `src/app/dashboard/page.tsx`:
- Create `getRelativeTimeBadge(timestart: number)`:
  - Computes difference from `Date.now()`.
  - Overdue (diff < 0): returns `{ label: "Overdue", variant: "overdue" }`.
  - Due within hours today: returns `{ label: "Due in Xh", variant: "today" }` or `{ label: "Due in Xm", variant: "today" }`.
  - Due later today: returns `{ label: "Today 11:59 PM", variant: "today" }`.
  - Due tomorrow: returns `{ label: "Tomorrow", variant: "today" }`.
  - Due in 2–7 days: returns `{ label: "In X days", variant: "upcoming" }`.
  - Due in > 7 days: returns `{ label: "In X weeks", variant: "upcoming" }`.
- Style badges with subtle pill styling matching `--urgency-overdue`, `--urgency-today`, `--urgency-upcoming`.

- [ ] **Step 2: Polish Timeline rows & Direct Drawer preview**
In `src/app/dashboard/page.tsx`:
- Timeline items:
  - Left column: Large date number in Clash Display, month/year metadata, and the relative urgency countdown pill badge.
  - Center column: Course name with indicator dot, assignment title in Clash Display, and description excerpt.
  - Right column: Clean "View Details" button or action arrow with smooth slide transition on hover.
  - Click behavior: If `event.instance` or `event.id` matches an assignment in `allAssignments`, clicking the row or "View Details" opens the `AssignmentDetails` slide-over `Drawer` (`setSelectedAssignment(...)`). If it is an external link or course event without an assignment, link gracefully to `/course/${event.course?.id}`.
- Empty states:
  - If `displayedEvents.length === 0`: Show friendly editorial empty card with comforting copy (*"No deadlines here — you're all caught up!"*) and a "Show all" button if filtered.

- [ ] **Step 3: Redesign Enrolled Modules Grid**
In `src/app/dashboard/page.tsx`:
- Enhance each enrolled course card:
  - **Top Accent Ribbon**: Derived deterministic pastel/accent color bar on the card's top edge based on course ID or index (e.g. Slate Blue `#4f46e5`, Sage `#059669`, Terracotta `#ea580c`, Plum `#9333ea`, Amber `#d97706`).
  - **Course Code Badge**: Extract short code (e.g. from `course.shortname` or regex on `course.fullname`) formatted as an editorial monospace badge (e.g. `CS 101`, `MATH 202`).
  - **Course Title**: Clash Display, font-medium, clamp 2 lines.
  - **Pending Deadlines Badge**: Count active/upcoming assignments for that course from `events` or `allAssignments` (e.g. `"2 deadlines pending"` or `"All clear"` with a check icon).
  - **Card Hover Elevation**: Gentle `hover:-translate-y-1 hover:shadow-md transition-all duration-300` and subtle arrow reveal.

- [ ] **Step 4: Add Unit/Integration Tests**
Create `src/__tests__/DashboardTimelineCourses.test.tsx` verifying:
- Relative time countdown formatting for overdue, today, and upcoming.
- Timeline row click triggers assignment drawer opening when matching assignment exists.
- Enrolled course card renders course code, top accent styling, and pending deadline badge count.
- Friendly empty state when zero events match.

- [ ] **Step 5: Verify build and test**
Run: `npm test` and `npm run build`
Expected: PASS

- [ ] **Step 6: Commit changes**
```bash
git add src/app/dashboard/page.tsx src/__tests__/DashboardTimelineCourses.test.tsx
git commit -m "feat: overhaul timeline and course module cards on dashboard"
```
