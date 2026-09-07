# Task 4 Report: Dashboard Timeline & Enrolled Course Cards Redesign

**Status:** Completed  
**Commit SHA:** `960a533e881efa8a69ab7492372de8ceb5db666f`  
**Date:** 2026-09-07  

---

## 1. Summary of Work Implemented

### A. Relative Time Countdown Badge Helper
- Implemented `getRelativeTimeBadge(timestart: number)` in `src/lib/dashboard-utils.ts`:
  - Accurately calculates time differences against current time.
  - "Overdue" (`variant: "overdue"`) for past deadlines with red urgency styling.
  - "Due in Xm" / "Due in Xh" for immediate same-day deadlines.
  - "Today HH:MM AM/PM" for later same-day deadlines.
  - "Tomorrow" for next-day deadlines.
  - "In X days" for 2–7 days away (`variant: "upcoming"`).
  - "In X weeks" for > 7 days away (`variant: "upcoming"`).

### B. Polished Timeline Rows & Drawer Preview
- **Date column**: Large day numeral in Clash Display, month and year uppercase tracking, formatted time in monospace, and relative urgency countdown badge pill.
- **Content column**: Course name with accent dot, assignment name in Clash Display with subtle hover translation, and description excerpt.
- **Action column**: "View Details" action pill with sliding arrow on hover.
- **Direct Assignment Drawer Trigger**: Clicking a timeline row or "View Details" checks if the event corresponds to a matching assignment in `allAssignments` (matching `instance` or positive `id`). If matched, it immediately opens the `AssignmentDetails` slide-over drawer via `setSelectedAssignment(matchingAssignment)`. If no assignment matches, gracefully routes to `/course/${event.course.id}`.
- **Editorial Empty State**: When zero deadlines match the active filter or overall schedule, an editorial empty card with comforting copy (*"No deadlines here — you're all set!"*), check circle icon, and a "Show all deadlines" button is presented.

### C. Redesigned Enrolled Modules Grid
- **Top Accent Ribbon**: Derived deterministic color bar on each course card's top edge using Slate Blue (`#4f46e5`), Sage (`#059669`), Terracotta (`#ea580c`), Plum (`#9333ea`), or Amber (`#d97706`).
- **Course Code Badge**: Monospace editorial badge extracted cleanly from `course.shortname` or `course.fullname` (e.g. `CS 101`, `MATH 202`).
- **Course Title**: Clash Display, font-medium, clamped to 2 lines.
- **Pending Deadlines Badge**: Dynamically counts pending/upcoming deadlines for each course from current active events (e.g., `"2 deadlines pending"` or `"All clear"` with check icon).
- **Hover Transitions**: Smooth card lift transition (`hover:-translate-y-1 hover:shadow-md transition-all duration-300`) and animated arrow.

---

## 2. Verification & Test Summary

- **Unit/Integration Tests**:
  - `src/__tests__/DashboardTimelineCourses.test.tsx` created with 11 tests covering:
    - Relative time countdown formatting for overdue, today, tomorrow, upcoming days, and upcoming weeks.
    - Course code extraction and deterministic accent color hashing.
    - Timeline row rendering with badges and dates.
    - Assignment details slide-over drawer opening on row click.
    - Enrolled modules rendering course codes, top accents, and deadline pending badges.
    - Editorial empty state display when no events match.
  - `src/__tests__/DashboardUrgencyCards.test.tsx` updated to query card headings cleanly.
- **Test Results**:
  - `npx jest`: **5 passed, 5 total suites, 28 passed, 28 total tests**.
- **Build Verification**:
  - `npm run build`: **Passed cleanly with 0 errors** (TypeScript validation passed, static pages optimized).

---

## 3. Files Changed
- `src/app/dashboard/page.tsx`
- `src/lib/dashboard-utils.ts`
- `src/__tests__/DashboardTimelineCourses.test.tsx`
- `src/__tests__/DashboardUrgencyCards.test.tsx`
