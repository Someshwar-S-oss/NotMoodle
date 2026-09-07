### Task 3: Dashboard Urgency Metric Cards & Interactive Filtering

**Files:**
- Modify: `src/app/dashboard/page.tsx`
- Test: `src/__tests__/sanity.test.ts` (and component tests if applicable)

**Interfaces:**
- Consumes: Moodle assignment & timeline events state (`events`, `allAssignments`, `courses`).
- Produces: `activeFilter` state (`'all' | 'overdue' | 'today' | 'upcoming'`) with clicking on urgency cards toggling the filter in real-time, dynamic greeting status subtitle, and filter state reflected in the timeline section.

**Global Constraints:**
- Preserve all existing Next.js App Router conventions and API route integrations.
- Maintain existing Supabase authentication and Moodle token synchronization logic.
- Ensure all color tokens support both Light mode and Dark mode with WCAG AA contrast compliance.
- Support `prefers-reduced-motion` for all new transitions and animations.
- Every task must be verified with `npm test` and `npm run build` or targeted component tests.

- [ ] **Step 1: Add filter state and update greeting section**
In `src/app/dashboard/page.tsx`:
- Add `activeFilter: 'all' | 'overdue' | 'today' | 'upcoming'` state.
- Enhance the greeting header with a contextual subtitle:
  - If `overdue.length > 0`: *"Action required: You have [N] overdue items."*
  - Else if `today.length > 0`: *"Focus mode: [N] deadlines scheduled today."*
  - Else: *"Clear horizon: You're all caught up on submissions."*

- [ ] **Step 2: Replace solid black cards with elevated warm editorial urgency cards**
Replace the 3 heavy black boxes with:
1. **Overdue Card:**
   - Soft red tint (`bg-[var(--urgency-overdue-bg)]`), border `border-[var(--urgency-overdue-border)]`.
   - Large numeral in `Clash Display`.
   - Status badge: `"NEEDS ATTENTION"` with exclamation indicator.
   - Click handler: toggles `activeFilter === 'overdue' ? 'all' : 'overdue'`.
   - Visual ring / outline when filter is active (`ring-2 ring-[var(--urgency-overdue)]`).
2. **Due Today Card:**
   - Soft amber tint (`bg-[var(--urgency-today-bg)]`), border `border-[var(--urgency-today-border)]`.
   - Large numeral in `Clash Display`.
   - Status badge: `"TACKLE TODAY"`.
   - Click handler: toggles `activeFilter === 'today' ? 'all' : 'today'`.
   - Visual ring / outline when filter is active (`ring-2 ring-[var(--urgency-today)]`).
3. **Upcoming Card:**
   - Soft slate tint (`bg-[var(--urgency-upcoming-bg)]`), border `border-[var(--urgency-upcoming-border)]`.
   - Large numeral in `Clash Display`.
   - Status badge: `"ON SCHEDULE"`.
   - Click handler: toggles `activeFilter === 'upcoming' ? 'all' : 'upcoming'`.
   - Visual ring / outline when filter is active (`ring-2 ring-[var(--urgency-upcoming)]`).

- [ ] **Step 3: Connect `activeFilter` to Timeline events rendering**
In `src/app/dashboard/page.tsx`:
- Render filtered events based on `activeFilter`:
  - If `'overdue'`, show events in the overdue bucket.
  - If `'today'`, show events in the today bucket.
  - If `'upcoming'`, show events in the upcoming bucket.
  - If `'all'`, show all sorted events.
- If `activeFilter !== 'all'`, show an active filter indicator chip with a "Clear filter (Show all)" button so the student always knows their view is filtered and can easily reset it.

- [ ] **Step 4: Verify build and test**
Run: `npm test` and `npm run build`
Expected: PASS

- [ ] **Step 5: Commit changes**
```bash
git add src/app/dashboard/page.tsx
git commit -m "feat: add interactive urgency metric cards to dashboard"
```
