# UI/UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform NotMoodle from a stark monochromatic brutalist interface into a Warm Neo-Editorial Academic experience featuring ambient cloudy background gradients, elevated dashboard urgency cards, interactive timeline, streamlined course explorer, and polished secondary pages.

**Architecture:** Next.js 16 (App Router) + React 19 + Tailwind CSS v4 + NextThemes + Lucide React + Motion. Design tokens defined in CSS variables in `globals.css` with a fixed atmospheric cloudy gradient overlay in `layout.tsx`. High-frequency interactive components (Dashboard, Course page, Drawers) use clean client-side state for instantaneous filtering, drawer previews, and theme transitions.

**Tech Stack:** Next.js 16.2.12, React 19.2.4, Tailwind CSS v4, NextThemes, Lucide React, Motion.

## Global Constraints

- Preserve all existing Next.js App Router conventions and API route integrations.
- Maintain existing Supabase authentication and Moodle token synchronization logic.
- Ensure all color tokens support both Light mode and Dark mode with WCAG AA contrast compliance.
- Support `prefers-reduced-motion` for all new transitions and animations.
- Every task must be verified with `npm test` and `npm run build` or targeted component tests.

---

### Task 1: Design Tokens, CSS Variables & Atmospheric Cloudy Ambient Background

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`
- Test: `src/__tests__/sanity.test.ts`

**Interfaces:**
- Consumes: Tailwind CSS v4 `@theme`, `next-themes` classes.
- Produces: CSS color variables (`--background`, `--foreground`, `--card`, `--border`, `--urgency-overdue`, etc.) and `.ambient-cloud-bg` utility class.

- [ ] **Step 1: Check existing test suite passes**

Run: `npm test`
Expected: 1 passing test (`src/__tests__/sanity.test.ts`)

- [ ] **Step 2: Update `src/app/globals.css` with warm editorial palette and ambient cloud effects**

Modify `src/app/globals.css` to add the warm palette variables, status urgency variables, and cloudy gradient styling:

```css
@import url('https://api.fontshare.com/v2/css?f[]=clash-display@700,600,500&f[]=satoshi@700,500,400&display=swap');
@import "tailwindcss";
@plugin "@tailwindcss/typography";

:root {
  /* Warm Bone & Editorial Charcoal */
  --background: #f7f6f2;
  --foreground: #141414;
  --muted: #ebe8e1;
  --accent: #78716c;
  --border: rgba(20, 20, 20, 0.12);
  --card: #ffffff;
  --card-foreground: #141414;
  --secondary: #57534e;
  --tertiary: #a8a29e;

  /* Urgency & Academic Status Tokens */
  --urgency-overdue: #dc2626;
  --urgency-overdue-bg: rgba(220, 38, 38, 0.08);
  --urgency-overdue-border: rgba(220, 38, 38, 0.25);
  
  --urgency-today: #d97706;
  --urgency-today-bg: rgba(217, 119, 6, 0.08);
  --urgency-today-border: rgba(217, 119, 6, 0.25);

  --urgency-upcoming: #475569;
  --urgency-upcoming-bg: rgba(71, 85, 105, 0.06);
  --urgency-upcoming-border: rgba(71, 85, 105, 0.2);

  --status-success: #16a34a;
  --status-success-bg: rgba(22, 163, 74, 0.08);
}

.dark {
  /* Deep Obsidian & Editorial Warm White */
  --background: #0d0f12;
  --foreground: #f4f4f5;
  --muted: #222630;
  --accent: #94a3b8;
  --border: rgba(244, 244, 245, 0.12);
  --card: #15181e;
  --card-foreground: #f4f4f5;
  --secondary: #a1a1aa;
  --tertiary: #71717a;

  /* Urgency & Academic Status Tokens */
  --urgency-overdue: #ef4444;
  --urgency-overdue-bg: rgba(239, 68, 68, 0.12);
  --urgency-overdue-border: rgba(239, 68, 68, 0.35);

  --urgency-today: #f59e0b;
  --urgency-today-bg: rgba(245, 158, 11, 0.12);
  --urgency-today-border: rgba(245, 158, 11, 0.35);

  --urgency-upcoming: #94a3b8;
  --urgency-upcoming-bg: rgba(148, 163, 184, 0.1);
  --urgency-upcoming-border: rgba(148, 163, 184, 0.25);

  --status-success: #22c55e;
  --status-success-bg: rgba(34, 197, 94, 0.12);
}

@theme {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-muted: var(--muted);
  --color-accent: var(--accent);
  --color-border: var(--border);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-secondary: var(--secondary);
  --color-tertiary: var(--tertiary);
  --font-serif: 'Clash Display', sans-serif;
  --font-sans: 'Satoshi', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}

body {
  background-color: var(--background);
  color: var(--foreground);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
}

/* Atmospheric Cloudy Gradient Layer */
.cloudy-gradient {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.cloudy-gradient::before {
  content: '';
  position: absolute;
  top: -20%;
  left: -10%;
  width: 70vw;
  height: 70vw;
  max-width: 800px;
  max-height: 800px;
  border-radius: 9999px;
  background: radial-gradient(circle, rgba(254, 243, 199, 0.45) 0%, rgba(224, 242, 254, 0.25) 50%, transparent 70%);
  filter: blur(80px);
}

.cloudy-gradient::after {
  content: '';
  position: absolute;
  top: 15%;
  right: -10%;
  width: 60vw;
  height: 60vw;
  max-width: 700px;
  max-height: 700px;
  border-radius: 9999px;
  background: radial-gradient(circle, rgba(220, 252, 231, 0.35) 0%, rgba(254, 215, 170, 0.2) 50%, transparent 70%);
  filter: blur(90px);
}

.dark .cloudy-gradient::before {
  background: radial-gradient(circle, rgba(30, 27, 75, 0.5) 0%, rgba(14, 116, 144, 0.25) 50%, transparent 70%);
  filter: blur(100px);
}

.dark .cloudy-gradient::after {
  background: radial-gradient(circle, rgba(67, 56, 202, 0.3) 0%, rgba(15, 23, 42, 0.5) 50%, transparent 70%);
  filter: blur(110px);
}
```

- [ ] **Step 3: Add the fixed ambient cloudy gradient container into `src/app/layout.tsx`**

In `src/app/layout.tsx`, ensure `<div className="cloudy-gradient" aria-hidden="true" />` is rendered inside `ThemeProvider` right before the main container, so the subtle cloud layer is active across every route without interfering with clicks or scrolling.

- [ ] **Step 4: Verify build and test**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add src/app/globals.css src/app/layout.tsx
git commit -m "feat: add warm neo-editorial palette and atmospheric cloudy background"
```

---

### Task 2: Global Header & Navigation Shell Polish

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/components/NavigationDock.tsx`
- Create or Modify: `src/components/ThemeToggle.tsx`

**Interfaces:**
- Consumes: `useTheme()` from `next-themes`, `usePathname()` from `next/navigation`.
- Produces: Polished top header with quick theme toggle, and enhanced bottom floating dock with active route indicators and subtle spring physics.

- [ ] **Step 1: Create `src/components/ThemeToggle.tsx`**

Provide a sleek theme toggle button allowing users to switch between Light, Dark, and System with smooth iconography (`Sun`, `Moon`, `Laptop`).

```tsx
'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="w-8 h-8" />
  }

  const isDark = resolvedTheme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="w-9 h-9 rounded-full border border-border/20 flex items-center justify-center hover:bg-card transition-colors duration-200 cursor-pointer text-foreground/80 hover:text-foreground"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  )
}
```

- [ ] **Step 2: Update `src/app/layout.tsx` header**

In `src/app/layout.tsx`:
- Embed `<ThemeToggle />` next to `<NotificationBell />` in the top header.
- Apply subtle glassmorphism (`backdrop-blur-md bg-background/80 border-b border-border/10`).
- Refine brand logo and logout button styles with clean rounded pills.

- [ ] **Step 3: Update `src/components/NavigationDock.tsx`**

Highlight current active route (`/dashboard`, `/notifications`, `/settings`) using `usePathname()`:
- Add an active indicator pill / dot beneath active items.
- Maintain scroll auto-hide and drawer full-screen coordination.

- [ ] **Step 4: Verify build and test**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add src/components/ThemeToggle.tsx src/app/layout.tsx src/components/NavigationDock.tsx
git commit -m "feat: enhance header with ThemeToggle and polish navigation dock"
```

---

### Task 3: Dashboard Urgency Metric Cards & Interactive Filtering

**Files:**
- Modify: `src/app/dashboard/page.tsx`

**Interfaces:**
- Consumes: Moodle assignment & timeline events state.
- Produces: `activeFilter` state (`'all' | 'overdue' | 'today' | 'upcoming'`) with clicking on urgency cards toggling the filter in real-time.

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
   - Status badge: `"NEEDS ATTENTION"` with exclamation dot.
   - Click handler: toggles `activeFilter === 'overdue' ? 'all' : 'overdue'`.
   - Visual ring / outline when filter is active.
2. **Due Today Card:**
   - Soft amber tint (`bg-[var(--urgency-today-bg)]`), border `border-[var(--urgency-today-border)]`.
   - Large numeral in `Clash Display`.
   - Status badge: `"TACKLE TODAY"`.
   - Click handler: toggles `activeFilter === 'today' ? 'all' : 'today'`.
3. **Upcoming Card:**
   - Soft slate tint (`bg-[var(--urgency-upcoming-bg)]`), border `border-[var(--urgency-upcoming-border)]`.
   - Large numeral in `Clash Display`.
   - Status badge: `"ON SCHEDULE"`.
   - Click handler: toggles `activeFilter === 'upcoming' ? 'all' : 'upcoming'`.

- [ ] **Step 3: Verify build**

Run: `npm test`
Expected: PASS

- [ ] **Step 4: Commit changes**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat: add interactive urgency metric cards to dashboard"
```

---

### Task 4: Dashboard Timeline & Enrolled Course Cards Redesign

**Files:**
- Modify: `src/app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `events`, `allAssignments`, `courses`, `activeFilter`.
- Produces: Filtered deadline list with relative time countdowns and enriched course cards.

- [ ] **Step 1: Implement relative time helper and filtering in Timeline**

In `src/app/dashboard/page.tsx`:
- Create relative time format function `getRelativeTimeBadge(timestart: number)`:
  - Returns `{ text: "Due in 3h", isUrgent: true }`, `{ text: "Tomorrow 11:59 PM", isToday: true }`, `{ text: "In 4 days", isUpcoming: true }`.
- Filter `events` by `activeFilter` before rendering:
  - When `activeFilter !== 'all'`, render a filter chip with a "Clear filter (Show all)" button.

- [ ] **Step 2: Redesign Timeline item rows**

Each deadline item displays:
- Left: Clean date block with day number, month, and relative urgency tag pill.
- Center: Course tag with color indicator dot, assignment title in `Clash Display`, and brief excerpt.
- Right: "View Details" action button with smooth arrow transition on hover.
- Clicking any item triggers `setSelectedAssignment(assignmentData)`.
- Empty state: When no events match filter or calendar is empty, display a friendly editorial banner (*"No deadlines here — you're all set!"*).

- [ ] **Step 3: Redesign Enrolled Modules grid**

Each course card:
- Has an ambient top accent bar (derived from course ID for unique visual recognition: Slate Blue, Forest Sage, Rust, Dusty Plum).
- Displays course code tag (e.g. `CS201`) in `font-mono`.
- Displays course full name with clean clamp.
- Displays pending assignments count badge for that course.
- Hover lift effect with subtle card elevation.

- [ ] **Step 4: Verify build and test**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat: overhaul timeline and course module cards on dashboard"
```

---

### Task 5: Course Experience & Unified Resource Filtering

**Files:**
- Modify: `src/app/course/[id]/page.tsx`

**Interfaces:**
- Consumes: `getCourseContents`, `getAssignments`.
- Produces: Search bar with category filter pills (`All`, `Assignments`, `PDFs & Readings`, `Links & Folders`) and enhanced resource items.

- [ ] **Step 1: Add category filter state to course page**

In `src/app/course/[id]/page.tsx`:
- Add `activeCategory: 'all' | 'assignments' | 'resources' | 'links'` state.
- Add category filter pills UI below course hero.
- Categorize modules accurately by `modname`:
  - Assignments: `modname === 'assign'`
  - PDFs & Readings: `modname === 'resource' || modname === 'folder'`
  - Links & Others: `modname === 'url'` or others

- [ ] **Step 2: Enhance Course Hero banner**

- Back link: `← Back to Dashboard` with clean hover animation.
- Course title in `Clash Display`.
- Stats summary bar: Total items count, Active assignments count, and Search query match indicator.
- Search input with clear button (`X`) and keyboard hint (`Press / to search`).

- [ ] **Step 3: Redesign resource item rows**

Each resource item:
- File type badge (`PDF`, `DOCX`, `ASSIGNMENT`, `LINK`) with dedicated soft color pills.
- Section name badge (e.g. *"Week 4: Sorting Algorithms"*).
- Direct "Preview" button for resources (opening `FileViewer` in full screen drawer).
- Direct "View Details" button for assignments (opening `AssignmentDetails`).

- [ ] **Step 4: Verify build and test**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add src/app/course/[id]/page.tsx
git commit -m "feat: upgrade course explorer with unified search and category filters"
```

---

### Task 6: Interactive Drawers & Secondary Pages Polish

**Files:**
- Modify: `src/components/AssignmentDetails.tsx`
- Modify: `src/components/Drawer.tsx`
- Modify: `src/app/settings/page.tsx`
- Modify: `src/app/notifications/page.tsx`

**Interfaces:**
- Consumes: NextThemes, Supabase user & notifications API.
- Produces: Polished sliding drawer experiences, enhanced settings page with theme selector & calendar sync, and tabbed notifications overview.

- [ ] **Step 1: Polish `src/components/AssignmentDetails.tsx` and `src/components/Drawer.tsx`**

- In `AssignmentDetails.tsx`:
  - Add prominent status badge at top:
    - If submitted: Sage green pill *"Submitted for grading"*.
    - If not submitted: Urgent amber/red pill *"Pending submission — Due in X days"*.
  - Clean card wrappers for attachments with download icons.
  - Direct "Open in Moodle" primary action button.
- In `Drawer.tsx`:
  - Ensure backdrop blur has smooth transition and header has clear title and close icon with keyboard `Esc` listener.

- [ ] **Step 2: Polish `src/app/settings/page.tsx`**

- Add clean theme switcher with visual options: Light, Dark, System.
- Elevate Google Calendar Sync section with clear copy button, verification feedback, and 3-step setup guide.
- Elevate Moodle Connection card with connection status and last sync time.

- [ ] **Step 3: Polish `src/app/notifications/page.tsx`**

- Add filter tabs: `All`, `Unread`, `Deadlines`, `Grades`.
- Display clean notification rows with relative timestamps (*"5m ago"*, *"2h ago"*).
- Add friendly empty state with cloud background graphic when all notifications are clear.

- [ ] **Step 4: Verify build and test**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add src/components/AssignmentDetails.tsx src/components/Drawer.tsx src/app/settings/page.tsx src/app/notifications/page.tsx
git commit -m "feat: polish assignment drawer, settings page, and notifications inbox"
```

---

### Task 7: Full System Build & Visual Verification

**Files:**
- Modify: `src/__tests__/sanity.test.ts` (or add UI smoke tests)
- Verification on all routes.

**Interfaces:**
- Validates the entire application compiles cleanly with zero TypeScript errors or CSS regressions.

- [ ] **Step 1: Run complete test suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 2: Run production Next.js build**

Run: `npm run build`
Expected: Build succeeds with webpack bundling and zero type errors.

- [ ] **Step 3: Commit final polish and verification results**

```bash
git add .
git commit -m "chore: complete warm neo-editorial UI/UX redesign verification"
```
