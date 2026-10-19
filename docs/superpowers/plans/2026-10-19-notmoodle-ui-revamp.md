# NotMoodle Complete UI & UX Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Revamp the entire UI and UX of NotMoodle inspired by the Adidas Running and Brilliant apps with lowercase typography, zero-scroll courses-first dashboard hierarchy, edge-to-edge file viewer, modernized course pages, and seamless integration of 5 Kokonut UI components (Apple Activity Card, Toolbar, Action Search Bar, Loader, TypeWriter).

**Architecture:** 
- Establish standard `src/lib/utils.ts` utility for class merging (`clsx` + `tailwind-merge`).
- Scaffold Kokonut UI components in `src/components/kokonutui/`.
- Restructure `src/app/dashboard/page.tsx` into a user-centric layout: hero with `type-writer` greeting + `apple-activity-card` metrics, immediately followed by the `enrolled modules` course grid above the fold, and a collapsible/filterable deadline timeline beneath.
- Modernize `src/app/course/[id]/page.tsx` with Brilliant-inspired module cards, lowercase category filters, and clean spacing.
- Overhaul `src/components/FileViewer.tsx` and `src/components/Drawer.tsx` to eliminate wasted empty space and deliver an immersive reader experience.
- Deploy floating Kokonut `toolbar` and spotlight `action-search-bar` across the application.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS v4, Motion (`motion/react`), Lucide React, Jest + Testing Library.

## Global Constraints
- Preserve all existing functionality, API integrations, and Supabase auth workflows.
- Strictly adhere to lowercase/sentence-case copy, eliminating harsh uppercase tracking-widest text.
- Maintain full responsiveness across mobile, tablet, and desktop viewports.
- All 15 existing test suites (114 tests) must pass with zero regressions.
- Do not break Next.js App Router conventions (heeding Next.js rules in `AGENTS.md`).

---

### Task 1: Utility Foundations (`clsx`, `tailwind-merge`, and `cn`)

**Files:**
- Modify: `package.json`
- Create: `src/lib/utils.ts`
- Create: `src/__tests__/utils.test.ts`

**Interfaces:**
- Produces: `cn(...inputs: ClassValue[]): string` in `src/lib/utils.ts`

- [ ] **Step 1: Write test for `cn` utility**
```ts
// src/__tests__/utils.test.ts
import { cn } from '@/lib/utils'

describe('cn utility', () => {
  it('merges class names cleanly and handles conditional falsy values', () => {
    expect(cn('px-4', 'py-2', false && 'hidden', 'text-sm')).toBe('px-4 py-2 text-sm')
  })

  it('resolves tailwind conflicts via tailwind-merge', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
  })
})
```

- [ ] **Step 2: Run test to confirm it fails (missing dependencies/file)**
Run: `npx jest src/__tests__/utils.test.ts`
Expected: Cannot find module `@/lib/utils`

- [ ] **Step 3: Install `clsx` and `tailwind-merge`**
Run: `npm install clsx tailwind-merge`

- [ ] **Step 4: Create `src/lib/utils.ts`**
```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 5: Run test to verify it passes**
Run: `npx jest src/__tests__/utils.test.ts`
Expected: PASS

- [ ] **Step 6: Commit changes**
`git add package.json package-lock.json src/lib/utils.ts src/__tests__/utils.test.ts && git commit -m "feat: add cn helper with clsx and tailwind-merge"`

---

### Task 2: Install Kokonut UI Components

**Files:**
- Create: `src/components/kokonutui/apple-activity-card.tsx`
- Create: `src/components/kokonutui/toolbar.tsx`
- Create: `src/components/kokonutui/action-search-bar.tsx`
- Create: `src/components/kokonutui/loader.tsx`
- Create: `src/components/kokonutui/type-writer.tsx`
- Create: `src/__tests__/KokonutComponents.test.tsx`

**Interfaces:**
- Consumes: `cn` from `@/lib/utils`, `motion` from `motion/react`, `lucide-react`
- Produces:
  - `AppleActivityCard` (`ActivityData`, `AppleActivityCardProps`)
  - `Toolbar` (`ToolbarProps`, `DockTool`)
  - `ActionSearchBar` (`ActionSearchBarProps`, `CommandItem`)
  - `Loader` (`LoaderProps`)
  - `TypewriterTitle` (`TypewriterTitleProps`, `TypewriterSequence`)

- [ ] **Step 1: Write smoke tests for all 5 Kokonut UI components**
Verify rendering of:
- `AppleActivityCard`
- `Toolbar`
- `ActionSearchBar`
- `Loader`
- `TypewriterTitle`

- [ ] **Step 2: Run test to confirm it fails**
Run: `npx jest src/__tests__/KokonutComponents.test.tsx`
Expected: Module not found

- [ ] **Step 3: Add the 5 Kokonut UI components**
Create `src/components/kokonutui/apple-activity-card.tsx`, `src/components/kokonutui/toolbar.tsx`, `src/components/kokonutui/action-search-bar.tsx`, `src/components/kokonutui/loader.tsx`, and `src/components/kokonutui/type-writer.tsx` ensuring compatibility with React 19 and `motion/react`.

- [ ] **Step 4: Run test to verify all 5 components mount cleanly**
Run: `npx jest src/__tests__/KokonutComponents.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit changes**
`git add src/components/kokonutui src/__tests__/KokonutComponents.test.tsx && git commit -m "feat: add 5 Kokonut UI components"`

---

### Task 3: Global Header, Theme & Wordmark Revamp (Lowkey Lowercase Tone)

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/components/NavigationDock.tsx`

**Interfaces:**
- Consumes: `src/app/globals.css` theme variables
- Produces: Modern lowercase header with wordmark `not moodle` and refined responsive container padding.

- [ ] **Step 1: Update `src/app/layout.tsx`**
  - Switch wordmark from uppercase brutalist `THE NOTMOODLE` to relaxed lowercase `not moodle`.
  - Update nav links to lowercase (`platform`, `about`, `log in`, `sign up`).
  - Update font sizing and padding for modern mobile/desktop balance.

- [ ] **Step 2: Update `src/app/globals.css`**
  - Soften font-family headings from monospace harsh fonts to clean geometric sans (`Satoshi` / `Geist`).
  - Ensure dark and light mode color variables provide smooth card contrast and ring vibrancy.

- [ ] **Step 3: Run existing layout and navigation tests**
Run: `npx jest src/__tests__/NavigationDock.test.tsx src/__tests__/sanity.test.ts`
Expected: PASS

- [ ] **Step 4: Commit changes**
`git add src/app/layout.tsx src/app/globals.css && git commit -m "style: switch header and typography to lowkey lowercase aesthetic"`

---

### Task 4: Revamp Main Dashboard (Hero, Activity Rings, Courses First, Collapsible Timeline)

**Files:**
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/__tests__/DashboardUrgencyCards.test.tsx`
- Modify: `src/__tests__/DashboardTimelineCourses.test.tsx`

**Interfaces:**
- Consumes: `AppleActivityCard`, `TypewriterTitle`, `Loader`, `Folder`, `AssignmentDetails`, `Drawer`, `moodle-client`
- Produces: Courses-first layout, activity rings header, streamlined agenda list.

- [ ] **Step 1: Check existing dashboard tests to ensure selector compatibility**
Inspect test assertions in `DashboardUrgencyCards.test.tsx` and `DashboardTimelineCourses.test.tsx` (e.g. check for `course-code-badge`, buttons, course cards, filter interactions).

- [ ] **Step 2: Update `src/app/dashboard/page.tsx`**
  - **Loading State**: Replace spinning brutalist logo with Kokonut `Loader` (`size="lg"` with lowercase subtitle `"syncing your courses and deadlines..."`).
  - **Hero Greeting**:
    - Understated lowercase greeting: `hello, {userName}`.
    - Typewriter subtitle using `TypewriterTitle` with rotating status phrases.
  - **Vitality Rings**:
    - Insert `AppleActivityCard` with 3 dynamic rings:
      - Deadlines: `due today` & `overdue` count
      - Completed: `completed` submissions count
      - Progress: `courses on track`
  - **Enrolled Courses (Courses-First)**:
    - Move `enrolled modules` directly below the hero banner.
    - Render CourseCards in a clean, modern responsive grid with lowercase badge and title.
    - Keep `data-testid="course-code-badge"` and folder animation.
  - **Collapsible Deadline Agenda**:
    - Position timeline below the courses.
    - Streamlined list with lowercase filter tabs (`all`, `due today`, `upcoming`, `overdue`).
    - Expandable cards with relative time badges (`due in 2 hours`, `tomorrow`).
  - **Past Courses**:
    - Collapsible accordion at the bottom for inactive courses.

- [ ] **Step 3: Run dashboard test suites to verify full functionality**
Run: `npx jest src/__tests__/DashboardUrgencyCards.test.tsx src/__tests__/DashboardTimelineCourses.test.tsx`
Expected: PASS

- [ ] **Step 4: Commit changes**
`git add src/app/dashboard/page.tsx src/__tests__/DashboardUrgencyCards.test.tsx src/__tests__/DashboardTimelineCourses.test.tsx && git commit -m "feat: revamp main dashboard with courses-first layout and activity rings"`

---

### Task 5: Revamp Course Page & Curriculum View

**Files:**
- Modify: `src/app/course/[id]/page.tsx`
- Modify: `src/__tests__/CoursePage.test.tsx`

**Interfaces:**
- Consumes: `getCourseContents`, `getAssignments`, `FileViewer`, `AssignmentDetails`, `Drawer`
- Produces: Modern Brilliant-style course overview with tactile module cards and lowercase tags.

- [ ] **Step 1: Check `src/__tests__/CoursePage.test.tsx`**
Review existing tests to preserve all interactive behaviors (category filtering, search, modal openings).

- [ ] **Step 2: Redesign `src/app/course/[id]/page.tsx`**
  - Replace harsh brutalist header with clean lowercase course title & code pill.
  - Category filter pills in lowercase: `all items`, `assignments`, `documents & resources`, `links`.
  - Module cards:
    - Left indicator bar and modern icon pill.
    - Lowercase badges: `assignment`, `pdf / document`, `folder`, `link`.
    - Compact, elegant action button: `preview`, `view details`, `open`.
  - Kokonut `Loader` on section loading.

- [ ] **Step 3: Run `CoursePage.test.tsx`**
Run: `npx jest src/__tests__/CoursePage.test.tsx`
Expected: PASS

- [ ] **Step 4: Commit changes**
`git add src/app/course/[id]/page.tsx src/__tests__/CoursePage.test.tsx && git commit -m "feat: revamp course page with brilliant-style module hierarchy"`

---

### Task 6: Revamp File Viewer & Modal Drawer (Zero Wasted Space)

**Files:**
- Modify: `src/components/FileViewer.tsx`
- Modify: `src/components/Drawer.tsx`
- Modify: `src/__tests__/DrawersAndSecondaryPages.test.tsx`

**Interfaces:**
- Consumes: Supabase storage, Moodle token, Office Online preview
- Produces: Full-bleed document reader with zero empty margins and responsive toolbar.

- [ ] **Step 1: Review `DrawersAndSecondaryPages.test.tsx`**
Verify tests covering file download links, drawer open/close, and keyboard accessibility.

- [ ] **Step 2: Update `src/components/Drawer.tsx`**
  - Allow edge-to-edge / fluid modal layouts when viewing files (`w-full max-w-5xl md:max-w-6xl` or flexible body padding).
  - Modernized lowercase header with subtle close button.

- [ ] **Step 3: Update `src/components/FileViewer.tsx`**
  - Remove dead margins and shrink excess wrapper padding.
  - Full-height iframe canvas (`h-[78vh]`) utilizing edge-to-edge container space.
  - Clean top action bar: document name in lowercase, file type pill, direct download, and open in external tab.
  - Replace spinner with Kokonut `Loader` (`size="sm"`).

- [ ] **Step 4: Run Drawer and FileViewer tests**
Run: `npx jest src/__tests__/DrawersAndSecondaryPages.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit changes**
`git add src/components/FileViewer.tsx src/components/Drawer.tsx src/__tests__/DrawersAndSecondaryPages.test.tsx && git commit -m "feat: eliminate dead whitespace in file viewer with full-bleed reader"`

---

### Task 7: Integrate Kokonut Toolbar and Action Search Bar

**Files:**
- Create/Modify: `src/components/GlobalActionSearch.tsx`
- Modify: `src/components/NavigationDock.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/__tests__/NavigationDock.test.tsx`

**Interfaces:**
- Consumes: `Toolbar`, `ActionSearchBar`, courses & assignments search data
- Produces: Global keyboard shortcut (`⌘K` / `Ctrl+K`) action palette and floating dock navigation.

- [ ] **Step 1: Create `src/components/GlobalActionSearch.tsx`**
  - Integrates `ActionSearchBar` with courses catalog and assignment search API (`/api/moodle/search-data`).
  - Supports quick keyboard shortcut `⌘K` or click from header/toolbar.
  - Navigates immediately to `/course/:id` or opens assignment modal on select.

- [ ] **Step 2: Enhance Navigation with Kokonut Toolbar in `NavigationDock.tsx`**
  - Wrap navigation with smooth spring dock items: Dashboard, Search, Courses, Calendar Sync, Theme Toggle.
  - Ensure mobile dock adapts cleanly without blocking content.

- [ ] **Step 3: Run navigation dock tests**
Run: `npx jest src/__tests__/NavigationDock.test.tsx`
Expected: PASS

- [ ] **Step 4: Commit changes**
`git add src/components/GlobalActionSearch.tsx src/components/NavigationDock.tsx src/app/layout.tsx src/__tests__/NavigationDock.test.tsx && git commit -m "feat: integrate floating toolbar and global action search bar"`

---

### Task 8: Full Verification, Documentation & Jest Test Run

**Files:**
- Create: `docs/KOKONUT_COMPONENTS_GUIDE.md`
- Verify: All files in repository

- [ ] **Step 1: Run complete Jest test suite**
Run: `npm test`
Expected: 15 passed, 15 total, 100% passing tests.

- [ ] **Step 2: Run linter and build check**
Run: `npm run lint` and verify no TypeScript or Next.js errors.

- [ ] **Step 3: Create developer guide for Kokonut UI components**
Document exact usage instructions, prop definitions, and examples for:
- `apple-activity-card`
- `toolbar`
- `action-search-bar`
- `loader`
- `type-writer`

- [ ] **Step 4: Final commit**
`git add docs/KOKONUT_COMPONENTS_GUIDE.md && git commit -m "docs: add comprehensive Kokonut UI usage guide"`
