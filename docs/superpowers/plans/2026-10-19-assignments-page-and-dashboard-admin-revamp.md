# Assignments Page, Dashboard Polish, and Admin Console Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dedicated `/assignments` page with an interactive left/right carousel/deck, remove the pulsing green header dot, fix the daily activity window layout and calculations, elevate the dashboard timeline into a connected vertical track, link urgency cards to `/assignments?filter=...`, revamp the `AssignmentDetails` modal, and modernize the `/admin` console.

**Architecture:** 
- Next.js 16 App Router client/server architecture with React 19.
- Dedicated client route `src/app/assignments/page.tsx` utilizing shared Moodle client caches and direct API fetches.
- Reusable `AssignmentDetails` drawer for dossier view with drag-and-drop file submission.
- Pure SVG gradient and responsive CSS for `AppleActivityCard` ensuring theme compliance without brittle container queries.
- Clean lowercase editorial typography using existing font tokens (`Anonymous Pro`, `Satoshi`).

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, Motion 12, Lucide React, Supabase SSR.

## Global Constraints
- Typography: Use lowercase editorial aesthetics (`font-sans` for headings and body, `font-mono` for codes/metadata, lowercase title stylings).
- Styling tokens: Strict use of `--background`, `--foreground`, `--card`, `--border`, `--muted`, `--secondary`, `--urgency-overdue`, `--urgency-today`, `--urgency-upcoming`, and `--status-success`.
- Preserve existing comments and docstrings unrelated to changed code.
- Every task must end with passing tests (`npm test -- <test-file>`).

---

### Task 1: Header Clean-Up (Remove Pulsing Green Dot)

**Files:**
- Modify: `src/app/layout.tsx:55-62`
- Test: `src/__tests__/HeaderLayout.test.tsx`

**Interfaces:**
- Consumes: `src/app/layout.tsx` root layout.
- Produces: Header without `.animate-pulse` or `bg-emerald-500` dot next to "not moodle".

- [ ] **Step 1: Write the failing test**
Create `src/__tests__/HeaderLayout.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import fs from 'fs'
import path from 'path'

describe('Root Layout Header', () => {
  it('does not contain a pulsing green dot in layout.tsx', () => {
    const layoutPath = path.join(process.cwd(), 'src/app/layout.tsx')
    const content = fs.readFileSync(layoutPath, 'utf8')
    expect(content).not.toContain('bg-emerald-500 ring-4 ring-emerald-500/20 animate-pulse')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test -- HeaderLayout`
Expected: FAIL because `layout.tsx` still contains the pulsing green dot.

- [ ] **Step 3: Remove pulsing green dot in `src/app/layout.tsx`**
In `src/app/layout.tsx`, replace:
```tsx
              <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2 group mr-4">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 animate-pulse" />
                <span className="text-xl md:text-2xl font-bold tracking-tight lowercase text-foreground group-hover:opacity-85 transition-opacity">
                  not moodle
                </span>
              </Link>
```
With:
```tsx
              <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2 group mr-4">
                <span className="text-xl md:text-2xl font-bold tracking-tight lowercase text-foreground group-hover:opacity-85 transition-opacity">
                  not moodle
                </span>
              </Link>
```

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test -- HeaderLayout`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/app/layout.tsx src/__tests__/HeaderLayout.test.tsx
git commit -m "fix: remove pulsing green dot from header logo"
```

---

### Task 2: Daily Activity Window Fix (`AppleActivityCard`)

**Files:**
- Modify: `src/components/kokonutui/apple-activity-card.tsx`
- Modify: `src/app/dashboard/page.tsx:428-469`
- Test: `src/__tests__/KokonutComponents.test.tsx`

**Interfaces:**
- Consumes: `ActivityData` interface (`label`, `color`, `colorEnd`, `size`, `current`, `target`, `unit`).
- Produces: `AppleActivityCard` with fixed calculations, accessible colors, and responsive layout.

- [ ] **Step 1: Write tests for Activity Card and calculations**
Update `src/__tests__/KokonutComponents.test.tsx` to add assertions for `AppleActivityCard`:
```tsx
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { AppleActivityCard, type ActivityData } from '@/components/kokonutui/apple-activity-card'

describe('AppleActivityCard', () => {
  const mockActivities: ActivityData[] = [
    { label: 'due today / overdue', color: '#f59e0b', colorEnd: '#fbbf24', size: 180, current: 2, target: 5, unit: 'tasks' },
    { label: 'completed submissions', color: '#10b981', colorEnd: '#34d399', size: 145, current: 8, target: 10, unit: 'done' },
    { label: 'active modules', color: '#6366f1', colorEnd: '#818cf8', size: 110, current: 4, target: 6, unit: 'courses' },
  ]

  it('renders activity labels and correct fractions', () => {
    render(<AppleActivityCard title="daily activity" activities={mockActivities} />)
    expect(screen.getByText(/daily activity/i)).toBeInTheDocument()
    expect(screen.getByText(/due today \/ overdue/i)).toBeInTheDocument()
    expect(screen.getByText(/completed submissions/i)).toBeInTheDocument()
    expect(screen.getByText(/active modules/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify initial state or failures**
Run: `npm test -- KokonutComponents`

- [ ] **Step 3: Update `AppleActivityCard` and `dashboard/page.tsx`**
In `src/components/kokonutui/apple-activity-card.tsx`:
1. Remove brittle relative color oklch syntax `[--ring-from:oklch(...)]`. Instead, directly assign `<stop offset="0%" stopColor={data.color} />` and `<stop offset="100%" stopColor={data.colorEnd} />` in the SVG `<defs>`.
2. Remove hardcoded `text-zinc-900 dark:text-white` and `text-zinc-500 dark:text-zinc-400`. Replace with `text-foreground` and `text-secondary`.
3. In `AppleActivityCard`, replace container query `@md:flex-row flex-col` with standard responsive flex: `flex flex-col sm:flex-row items-center gap-6 md:gap-8`.
4. In `src/app/dashboard/page.tsx`, fix `activityData`:
```tsx
  const activityData: ActivityData[] = useMemo(() => {
    const pendingTotal = today.length + overdue.length;
    const totalAssignments = Math.max(allAssignments.length, pendingTotal, 1);
    const completedCount = Math.max(0, allAssignments.length - pendingTotal);
    const totalCourses = Math.max(courses.length, 1);
    const activeCount = courses.filter((c) => !hiddenCourseIds.has(c.id)).length;

    return [
      {
        label: "pending deadlines",
        color: "#f59e0b",
        colorEnd: "#ef4444",
        size: 170,
        current: pendingTotal,
        target: totalAssignments,
        unit: "tasks",
      },
      {
        label: "completed submissions",
        color: "#10b981",
        colorEnd: "#34d399",
        size: 135,
        current: completedCount,
        target: totalAssignments,
        unit: "done",
      },
      {
        label: "active modules",
        color: "#6366f1",
        colorEnd: "#818cf8",
        size: 100,
        current: activeCount,
        target: totalCourses,
        unit: "courses",
      },
    ];
  }, [today.length, overdue.length, allAssignments.length, courses, hiddenCourseIds]);
```

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test -- KokonutComponents`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/components/kokonutui/apple-activity-card.tsx src/app/dashboard/page.tsx src/__tests__/KokonutComponents.test.tsx
git commit -m "fix: repair daily activity card layout, colors, and progress calculations"
```

---

### Task 3: Navigation Dock Update (Add Assignments Tab)

**Files:**
- Modify: `src/components/NavigationDock.tsx:80-140`
- Test: `src/__tests__/NavigationDock.test.tsx`

**Interfaces:**
- Consumes: Next.js `usePathname()`, `useRouter()`.
- Produces: Navigation item for `/assignments` with active route indicator.

- [ ] **Step 1: Update NavigationDock test**
Add a test in `src/__tests__/NavigationDock.test.tsx`:
```tsx
    it('renders Assignments dock item and marks active on /assignments', async () => {
      ;(usePathname as jest.Mock).mockReturnValue('/assignments')
      render(<NavigationDock />)
      expect(screen.getByText('Assignments')).toBeInTheDocument()
      const assignmentsBtn = screen.getByRole('button', { name: /assignments/i })
      expect(assignmentsBtn).toHaveAttribute('aria-current', 'page')
    })
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test -- NavigationDock`
Expected: FAIL ("Unable to find element with text: Assignments").

- [ ] **Step 3: Add Assignments item to `src/components/NavigationDock.tsx`**
Import `BookOpen` from `lucide-react`:
```tsx
import { Home, Settings, Bell, Shield, BookOpen } from 'lucide-react'
```
Add path check:
```tsx
const isAssignmentsActive = currentPath === '/assignments' || currentPath.startsWith('/assignments/')
```
Insert into `items` between Dashboard and Notifications:
```tsx
    {
      icon: (
        <div className="relative flex flex-col items-center justify-center">
          <BookOpen size={18} className={isAssignmentsActive ? 'text-foreground' : 'text-foreground/75'} />
          {isAssignmentsActive && (
            <span
              className="absolute -bottom-2.5 w-1.5 h-1.5 rounded-full bg-foreground transition-all duration-300 motion-reduce:transition-none"
              aria-hidden="true"
            />
          )}
        </div>
      ),
      label: 'Assignments',
      onClick: () => router.push('/assignments'),
      isActive: isAssignmentsActive,
    },
```

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test -- NavigationDock`
Expected: PASS (all 8 tests passing).

- [ ] **Step 5: Commit**
```bash
git add src/components/NavigationDock.tsx src/__tests__/NavigationDock.test.tsx
git commit -m "feat: add assignments tab to navigation dock"
```

---

### Task 4: Revamped Assignment Details Modal (`AssignmentDetails.tsx`)

**Files:**
- Modify: `src/components/AssignmentDetails.tsx`
- Test: `src/__tests__/AssignmentDetails.test.tsx`

**Interfaces:**
- Consumes: `assignment` object (`id`, `name`, `coursename`, `duedate`, `intro`, `introattachments`, `grade`, `cutoffdate`).
- Produces: Polished assignment dossier modal with countdown, direct Moodle actions, and drag-and-drop file submit.

- [ ] **Step 1: Write test for AssignmentDetails**
Create `src/__tests__/AssignmentDetails.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { AssignmentDetails } from '@/components/AssignmentDetails'

// Mock moodle-client
jest.mock('@/lib/moodle-client', () => ({
  getSubmissionStatus: jest.fn().mockResolvedValue({ submitted: false, status: 'new' }),
  uploadFileToDraft: jest.fn(),
  saveSubmission: jest.fn(),
}))

describe('AssignmentDetails', () => {
  const mockAssignment = {
    id: 101,
    name: 'Research Paper Submission',
    coursename: 'CS101 Intro to AI',
    duedate: Math.floor(Date.now() / 1000) + 86400,
    intro: '<p>Please write a 2-page summary.</p>',
    grade: 100,
    introattachments: [],
  }

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ token: 'mock-token' }),
    } as any)
  })

  it('renders assignment title, course, and status', async () => {
    render(<AssignmentDetails assignment={mockAssignment} />)
    expect(screen.getByText('Research Paper Submission')).toBeInTheDocument()
    expect(screen.getByText('CS101 Intro to AI')).toBeInTheDocument()
    expect(screen.getByText(/open in moodle/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it runs**
Run: `npm test -- AssignmentDetails`

- [ ] **Step 3: Modernize `src/components/AssignmentDetails.tsx`**
Refactor `AssignmentDetails.tsx`:
- Use clean lowercase headings with Satoshi font (e.g., `text-2xl md:text-3xl font-semibold tracking-tight text-foreground lowercase`).
- Format due date with relative countdown badge.
- Re-style file drop area with subtle dashed borders and active states.
- Clean up attachments cards with hover download effects.

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test -- AssignmentDetails`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/components/AssignmentDetails.tsx src/__tests__/AssignmentDetails.test.tsx
git commit -m "feat: revamp assignment details modal with editorial design"
```

---

### Task 5: Dedicated Assignments Page (`/assignments`) with Interactive Left/Right Carousel

**Files:**
- Create: `src/app/assignments/page.tsx`
- Test: `src/__tests__/AssignmentsPage.test.tsx`

**Interfaces:**
- Consumes: Moodle assignments and courses from local storage cache or direct API fetch; URL search param `?filter=overdue|today|upcoming|all`.
- Produces: Interactive assignments switcher with left (`<`) / right (`>`) arrow buttons, keyboard shortcuts, filter tabs, card overview, quick-jump strip, and drawer integration.

- [ ] **Step 1: Write tests for Assignments Page**
Create `src/__tests__/AssignmentsPage.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import AssignmentsPage from '@/app/assignments/page'

// Mock next/navigation
const mockPush = jest.fn()
let mockSearchParams = new URLSearchParams()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
}))

// Mock Supabase
jest.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }),
    },
  }),
}))

describe('AssignmentsPage', () => {
  beforeEach(() => {
    localStorage.setItem(
      'moodle_dashboard_cache',
      JSON.stringify({
        assignments: [
          { id: 1, name: 'Assignment Alpha', course: 10, coursename: 'AI 101', duedate: Math.floor(Date.now() / 1000) - 3600 },
          { id: 2, name: 'Assignment Beta', course: 20, coursename: 'Web 201', duedate: Math.floor(Date.now() / 1000) + 7200 },
        ],
        courses: [{ id: 10, shortname: 'AI 101', fullname: 'Artificial Intelligence' }],
        events: [],
        timestamp: Date.now(),
      })
    )
  })

  it('renders assignment carousel and supports left/right switching', async () => {
    render(<AssignmentsPage />)
    expect(await screen.findByText('Assignment Alpha')).toBeInTheDocument()
    const nextBtn = screen.getByRole('button', { name: /next assignment/i })
    fireEvent.click(nextBtn)
    expect(await screen.findByText('Assignment Beta')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test -- AssignmentsPage`
Expected: FAIL (Cannot find module `@/app/assignments/page`).

- [ ] **Step 3: Implement `src/app/assignments/page.tsx`**
Create `src/app/assignments/page.tsx`:
- Support URL query params `?filter=all|overdue|today|upcoming`.
- State for `currentIndex`, `activeFilter`, `selectedAssignment`.
- Left (`<`) / Right (`>`) navigation with circular bounds or clamping, plus `ArrowLeft` / `ArrowRight` keyboard listeners.
- Render carousel card with course accent, code, countdown badge, assignment title, intro, files, submission status, and "open dossier" button opening `Drawer` with `AssignmentDetails`.
- Render quick-jump thumbnail bar underneath for direct jump.

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test -- AssignmentsPage`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/app/assignments/page.tsx src/__tests__/AssignmentsPage.test.tsx
git commit -m "feat: implement dedicated assignments page with interactive carousel"
```

---

### Task 6: Dashboard Urgency Cards & Connected Timeline Revamp

**Files:**
- Modify: `src/app/dashboard/page.tsx:515-610` (Urgency cards)
- Modify: `src/app/dashboard/page.tsx:684-850` (Timeline)
- Test: `src/__tests__/DashboardUrgencyCards.test.tsx`
- Test: `src/__tests__/DashboardTimelineCourses.test.tsx`

**Interfaces:**
- Consumes: `overdue`, `today`, `upcoming` events.
- Produces: Clickable urgency cards routing to `/assignments?filter=...`, and a modern connected vertical timeline track.

- [ ] **Step 1: Write test for Urgency card navigation**
Update `src/__tests__/DashboardUrgencyCards.test.tsx` to assert that clicking Overdue, Due Today, and Upcoming cards navigates to `/assignments?filter=...`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import Home from '@/app/dashboard/page'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// ... verify fireEvent.click(overdueCard) calls mockPush('/assignments?filter=overdue')
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test -- DashboardUrgencyCards`

- [ ] **Step 3: Update `src/app/dashboard/page.tsx`**
1. Add `useRouter` import and hook.
2. In the Urgency Metric Cards section, wire click handlers to `router.push('/assignments?filter=overdue')`, `router.push('/assignments?filter=today')`, `router.push('/assignments?filter=upcoming')`.
3. In the Timeline section, restructure into a connected vertical track with a left rail, circular node pins color-coded by event urgency, course accent tags, and a "View Details" trigger that opens the `AssignmentDetails` drawer.

- [ ] **Step 4: Run tests to verify they pass**
Run: `npm test -- DashboardUrgencyCards`
Run: `npm test -- DashboardTimelineCourses`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/app/dashboard/page.tsx src/__tests__/DashboardUrgencyCards.test.tsx src/__tests__/DashboardTimelineCourses.test.tsx
git commit -m "feat: wire dashboard urgency cards to assignments route and upgrade timeline"
```

---

### Task 7: Admin Console Modernization (`src/app/admin/page.tsx`)

**Files:**
- Modify: `src/app/admin/page.tsx`
- Test: `src/__tests__/AdminPageAndAuditLogs.test.tsx`

**Interfaces:**
- Consumes: Supabase profiles, `/api/courses/catalog`, `/api/admin/audit-logs`.
- Produces: Modernized admin console with lowercase styling, refined stats cards, segmented tabs, user management, course catalog visibility, and audit inspector.

- [ ] **Step 1: Run existing AdminPage test to check baseline**
Run: `npm test -- AdminPageAndAuditLogs`

- [ ] **Step 2: Revamp `src/app/admin/page.tsx`**
1. Replace uppercase headers (`clash-title`) with lowercase `font-sans` styling (`admin console`, `live auditing & access control`).
2. Refresh the 4 metric summary cards with subtle borders, glowing accent pills, and clean typography.
3. Polish segmented tab bar (`Users`, `Courses`, `Audit Logs`) with animated pill indicators.
4. Refine User Management table:
   - Avatar chip with user initials.
   - Clean switch toggle for approval with optimistic update.
   - Superuser badge with Shield icon.
5. Refine Course Catalog:
   - Search bar and visibility filter.
   - Toggle visibility button with instant feedback.
6. Refine Audit Telemetry:
   - Event category pills.
   - Drawer/modal displaying formatted JSON inspection with copy-to-clipboard button.

- [ ] **Step 3: Run tests to verify they pass**
Run: `npm test -- AdminPageAndAuditLogs`
Expected: PASS.

- [ ] **Step 4: Commit**
```bash
git add src/app/admin/page.tsx src/__tests__/AdminPageAndAuditLogs.test.tsx
git commit -m "feat: revamp admin console with modern editorial interface"
```

---

### Task 8: Full Verification & Integration Test

- [ ] **Step 1: Run all test suites**
Run: `npm test`
Expected: All test suites PASS.

- [ ] **Step 2: Build verification**
Run: `npm run build`
Expected: Production build succeeds with 0 errors.

- [ ] **Step 3: Commit and finalize**
```bash
git status
```
