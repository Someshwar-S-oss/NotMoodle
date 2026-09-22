# All-Course Fetching and Admin Course Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fetch all university Moodle courses (including past durations) without date filtering, allow administrators to toggle course visibility from the admin panel, and partition courses on the student dashboard into active vs. collapsed past courses while filtering past deadlines from urgency alerts.

**Architecture:** Moodle client and API endpoints drop `startdate`/`enddate` comparisons to load all enrolled courses. A new `public.course_visibility` Supabase table stores catalog visibility state with RLS. Client dashboard auto-registers courses to `/api/courses/catalog` and queries visibility to separate active courses from past courses in a collapsible section, filtering their deadlines from the timeline feed. The admin console introduces a dedicated "Courses" tab with live search, visibility filters, and optimistic toggle actions with audit logging.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Supabase (PostgreSQL + RLS), Tailwind CSS, Lucide React, Jest + React Testing Library.

## Global Constraints

- Never use date bounds (`startdate`/`enddate`) to filter out courses in Moodle fetch calls.
- Preserving admin visibility overrides: non-admin catalog syncs must NEVER overwrite an existing `is_hidden` value.
- Non-admin users must still have access to past courses via the collapsible accordion section on the dashboard.
- Urgency counts (Overdue, Today, Upcoming) and timeline feed must exclude events belonging to hidden/past courses.
- All admin visibility toggles must be recorded in the audit log (`admin.course_visibility`).

---

### Task 1: Supabase Migration for Course Visibility

**Files:**
- Create: `supabase/migrations/20260922_course_visibility.sql`
- Test: `src/__tests__/CourseVisibilityMigration.test.ts`

**Interfaces:**
- Produces: `public.course_visibility` table schema definition with columns `course_id (BIGINT PRIMARY KEY)`, `fullname (TEXT)`, `shortname (TEXT)`, `is_hidden (BOOLEAN DEFAULT FALSE)`, `created_at (TIMESTAMPTZ)`, `updated_at (TIMESTAMPTZ)`, `updated_by (UUID REFERENCES auth.users)`.

- [ ] **Step 1: Write migration test asserting SQL schema statements**

```typescript
// src/__tests__/CourseVisibilityMigration.test.ts
import fs from 'fs'
import path from 'path'

describe('Course Visibility Migration', () => {
  it('defines public.course_visibility with required columns and RLS policies', () => {
    const migrationPath = path.join(process.cwd(), 'supabase/migrations/20260922_course_visibility.sql')
    expect(fs.existsSync(migrationPath)).toBe(true)

    const sql = fs.readFileSync(migrationPath, 'utf8')
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.course_visibility')
    expect(sql).toContain('course_id BIGINT PRIMARY KEY')
    expect(sql).toContain('is_hidden BOOLEAN NOT NULL DEFAULT FALSE')
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY')
    expect(sql).toContain('Allow authenticated users to read course visibility')
    expect(sql).toContain('Allow superusers to update course visibility')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/CourseVisibilityMigration.test.ts`
Expected: FAIL with "no such file or directory"

- [ ] **Step 3: Create the migration SQL file**

```sql
-- supabase/migrations/20260922_course_visibility.sql

CREATE TABLE IF NOT EXISTS public.course_visibility (
    course_id BIGINT PRIMARY KEY,
    fullname TEXT NOT NULL,
    shortname TEXT,
    is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.course_visibility ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view course visibility
CREATE POLICY "Allow authenticated users to read course visibility"
    ON public.course_visibility FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users to insert newly discovered courses
CREATE POLICY "Allow authenticated users to insert course metadata"
    ON public.course_visibility FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Only superusers can update course visibility status
CREATE POLICY "Allow superusers to update course visibility"
    ON public.course_visibility FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.is_superuser = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.is_superuser = true
        )
    );
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/__tests__/CourseVisibilityMigration.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260922_course_visibility.sql src/__tests__/CourseVisibilityMigration.test.ts
git commit -m "feat(db): add course_visibility migration with RLS policies"
```

---

### Task 2: Remove Date-Based Filtering from Moodle Client and API Route

**Files:**
- Modify: `src/lib/moodle-client.ts:112-133`
- Modify: `src/app/api/moodle/courses/route.ts:39-59`
- Test: `src/__tests__/MoodleAllCoursesFetch.test.ts`

**Interfaces:**
- Consumes: Moodle `core_enrol_get_users_courses`
- Produces: `getCurrentCourses(token: string, userid: number): Promise<MoodleCourse[]>` returning all enrolled courses regardless of `startdate` or `enddate`.

- [ ] **Step 1: Write failing test verifying past/expired courses are retained**

```typescript
// src/__tests__/MoodleAllCoursesFetch.test.ts
import { getCurrentCourses } from '../lib/moodle-client'

describe('getCurrentCourses without date filter', () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  it('returns both past expired courses and current courses', async () => {
    const mockMoodleCourses = [
      {
        id: 101,
        fullname: 'Expired Past Course',
        shortname: 'PAST101',
        startdate: 1600000000,
        enddate: 1610000000, // Long expired
        progress: 100,
        lastaccess: 1610000000,
        courseimage: null,
      },
      {
        id: 202,
        fullname: 'Active Current Course',
        shortname: 'CURR202',
        startdate: 1700000000,
        enddate: 0,
        progress: 45,
        lastaccess: 1705000000,
        courseimage: null,
      }
    ]

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockMoodleCourses,
    })

    const courses = await getCurrentCourses('test-token', 42)
    expect(courses).toHaveLength(2)
    expect(courses.map(c => c.id)).toEqual([101, 202])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/MoodleAllCoursesFetch.test.ts`
Expected: FAIL because `getCurrentCourses` currently filters out course `101`.

- [ ] **Step 3: Update `src/lib/moodle-client.ts` and `src/app/api/moodle/courses/route.ts`**

In `src/lib/moodle-client.ts`:
```typescript
/** All enrolled courses (including past durations) */
export async function getCurrentCourses(token: string, userid: number): Promise<MoodleCourse[]> {
  const all: any[] = await moodleGet(token, 'core_enrol_get_users_courses', { userid })
  if (!Array.isArray(all)) return []
  return all.map(c => ({
    id: c.id,
    fullname: c.fullname,
    shortname: c.shortname,
    progress: c.progress ?? null,
    lastaccess: c.lastaccess ?? null,
    startdate: c.startdate,
    enddate: c.enddate,
    courseimage: c.courseimage ?? null,
  }))
}
```

In `src/app/api/moodle/courses/route.ts`:
Replace lines 39-59 with:
```typescript
    // Return key fields for all enrolled courses (including past courses)
    const courses = allCourses.map((c: any) => ({
      id: c.id,
      fullname: c.fullname,
      shortname: c.shortname,
      progress: c.progress ?? null,
      lastaccess: c.lastaccess ?? null,
      startdate: c.startdate,
      enddate: c.enddate,
      courseimage: c.courseimage ?? null,
    }))

    return NextResponse.json({ courses, total: allCourses.length })
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/__tests__/MoodleAllCoursesFetch.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/moodle-client.ts src/app/api/moodle/courses/route.ts src/__tests__/MoodleAllCoursesFetch.test.ts
git commit -m "feat(courses): remove date filter to fetch all enrolled courses"
```

---

### Task 3: Backend Catalog Sync & Admin Toggle Endpoints

**Files:**
- Create: `src/app/api/courses/catalog/route.ts`
- Create: `src/app/api/admin/courses/toggle-visibility/route.ts`
- Test: `src/__tests__/CourseVisibilityApi.test.ts`

**Interfaces:**
- Produces:
  - `POST /api/courses/catalog`: accepts `{ courses: { id: number, fullname: string, shortname: string }[] }`, upserts into `course_visibility` without altering `is_hidden`.
  - `GET /api/courses/catalog`: returns `{ courses: Array<{ course_id: number, fullname: string, shortname: string, is_hidden: boolean }> }`.
  - `POST /api/admin/courses/toggle-visibility`: accepts `{ courseId: number, isHidden: boolean }`, updates `course_visibility.is_hidden`, records audit log `admin.course_visibility`.

- [ ] **Step 1: Write integration tests for catalog and toggle routes**

```typescript
// src/__tests__/CourseVisibilityApi.test.ts
import { GET as getCatalog, POST as postCatalog } from '../app/api/courses/catalog/route'
import { POST as toggleVisibility } from '../app/api/admin/courses/toggle-visibility/route'

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))
jest.mock('@/lib/audit-logger', () => ({
  recordAuditLog: jest.fn(),
}))

const { createClient } = require('@/utils/supabase/server')
const { recordAuditLog } = require('@/lib/audit-logger')

describe('Course Visibility APIs', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('GET /api/courses/catalog returns 401 if unauthenticated', async () => {
    createClient.mockResolvedValueOnce({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    })

    const res = await getCatalog()
    expect(res.status).toBe(401)
  })

  it('POST /api/courses/catalog ingests courses for authenticated user', async () => {
    const mockUpsert = jest.fn().mockResolvedValue({ error: null })
    createClient.mockResolvedValueOnce({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
      from: jest.fn().mockReturnValue({
        upsert: mockUpsert,
      }),
    })

    const req = new Request('http://localhost/api/courses/catalog', {
      method: 'POST',
      body: JSON.stringify({
        courses: [{ id: 101, fullname: 'Course 101', shortname: 'C101' }],
      }),
    })

    const res = await postCatalog(req)
    expect(res.status).toBe(200)
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          course_id: 101,
          fullname: 'Course 101',
          shortname: 'C101',
        }),
      ]),
      expect.objectContaining({ onConflict: 'course_id', ignoreDuplicates: false })
    )
  })

  it('POST /api/admin/courses/toggle-visibility forbids non-superusers', async () => {
    createClient.mockResolvedValueOnce({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'regular-user' } } }) },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: { is_superuser: false } }),
      }),
    })

    const req = new Request('http://localhost/api/admin/courses/toggle-visibility', {
      method: 'POST',
      body: JSON.stringify({ courseId: 101, isHidden: true }),
    })

    const res = await toggleVisibility(req)
    expect(res.status).toBe(403)
  })

  it('POST /api/admin/courses/toggle-visibility updates visibility and logs audit for superusers', async () => {
    const mockUpdate = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    })

    createClient.mockResolvedValueOnce({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'admin-1', email: 'admin@test.com' } } }) },
      from: jest.fn().mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: { is_superuser: true } }),
          }
        }
        return {
          update: mockUpdate,
        }
      }),
    })

    const req = new Request('http://localhost/api/admin/courses/toggle-visibility', {
      method: 'POST',
      body: JSON.stringify({ courseId: 101, isHidden: true }),
    })

    const res = await toggleVisibility(req)
    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ is_hidden: true, updated_by: 'admin-1' })
    )
    expect(recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'admin.course_visibility',
        entityType: 'course',
        entityId: '101',
      })
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/CourseVisibilityApi.test.ts`
Expected: FAIL with module not found for the routes

- [ ] **Step 3: Implement `/api/courses/catalog/route.ts`**

```typescript
// src/app/api/courses/catalog/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: courses, error } = await supabase
    .from('course_visibility')
    .select('course_id, fullname, shortname, is_hidden, updated_at')
    .order('fullname', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ courses: courses || [] })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const inputCourses = body.courses || []
    if (!Array.isArray(inputCourses) || inputCourses.length === 0) {
      return NextResponse.json({ success: true, count: 0 })
    }

    // Fetch existing records to avoid overwriting is_hidden
    const courseIds = inputCourses.map((c: any) => Number(c.id)).filter(id => !isNaN(id))
    const { data: existing } = await supabase
      .from('course_visibility')
      .select('course_id, is_hidden')
      .in('course_id', courseIds)

    const existingMap = new Map((existing || []).map(r => [r.course_id, r.is_hidden]))

    const rows = inputCourses.map((c: any) => ({
      course_id: Number(c.id),
      fullname: String(c.fullname || ''),
      shortname: c.shortname ? String(c.shortname) : '',
      is_hidden: existingMap.has(Number(c.id)) ? existingMap.get(Number(c.id)) : false,
      updated_at: new Date().toISOString(),
    }))

    const { error } = await supabase
      .from('course_visibility')
      .upsert(rows, { onConflict: 'course_id', ignoreDuplicates: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, count: rows.length })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Invalid request' }, { status: 400 })
  }
}
```

- [ ] **Step 4: Implement `/api/admin/courses/toggle-visibility/route.ts`**

```typescript
// src/app/api/admin/courses/toggle-visibility/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { recordAuditLog } from '@/lib/audit-logger'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_superuser')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.is_superuser) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { courseId, isHidden } = await req.json()
    if (typeof courseId !== 'number' || typeof isHidden !== 'boolean') {
      return NextResponse.json({ error: 'Invalid courseId or isHidden parameter' }, { status: 400 })
    }

    const { error } = await supabase
      .from('course_visibility')
      .update({
        is_hidden: isHidden,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq('course_id', courseId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await recordAuditLog({
      userId: user.id,
      userEmail: user.email ?? null,
      action: 'admin.course_visibility',
      entityType: 'course',
      entityId: String(courseId),
      details: {
        courseId,
        isHidden,
      },
    })

    return NextResponse.json({ success: true, courseId, isHidden })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to update visibility' }, { status: 500 })
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest src/__tests__/CourseVisibilityApi.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/app/api/courses/catalog/route.ts src/app/api/admin/courses/toggle-visibility/route.ts src/__tests__/CourseVisibilityApi.test.ts
git commit -m "feat(api): add course catalog sync and admin visibility toggle endpoints"
```

---

### Task 4: Admin Console Course Management Tab

**Files:**
- Modify: `src/app/admin/page.tsx`
- Test: `src/__tests__/AdminCourseManagement.test.tsx`

**Interfaces:**
- Consumes: `GET /api/courses/catalog`, `POST /api/admin/courses/toggle-visibility`
- Produces: `Courses` tab in `/admin` with search, status filters (All, Visible, Hidden), metric cards, and visibility toggle action with optimistic UI.

- [ ] **Step 1: Write UI test for Admin Courses tab**

```typescript
// src/__tests__/AdminCourseManagement.test.tsx
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AdminPage from '../app/admin/page'

jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(),
}))
jest.mock('@/lib/audit-logger', () => ({
  recordClientAudit: jest.fn(),
}))
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

const { createClient } = require('@/utils/supabase/client')

describe('AdminPage Course Management', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()

    createClient.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'admin-id', email: 'admin@test.com' } },
        }),
      },
      from: jest.fn().mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: { is_superuser: true } }),
          }
        }
        return {
          select: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [] }),
        }
      }),
    })
  })

  it('renders Courses tab and displays course items with visibility toggle', async () => {
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/courses/catalog')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            courses: [
              { course_id: 101, fullname: 'Machine Learning', shortname: 'CS401', is_hidden: false },
              { course_id: 102, fullname: 'Old Chemistry Lab', shortname: 'CH101', is_hidden: true },
            ],
          }),
        })
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ auditLogs: [], totalCount: 0 }),
      })
    })

    render(<AdminPage />)

    await waitFor(() => {
      expect(screen.getByText('Courses')).toBeInTheDocument()
    })

    // Click on Courses tab
    fireEvent.click(screen.getByRole('tab', { name: /courses/i }))

    expect(screen.getByText('Machine Learning')).toBeInTheDocument()
    expect(screen.getByText('Old Chemistry Lab')).toBeInTheDocument()
    expect(screen.getByText('Hide Course')).toBeInTheDocument()
    expect(screen.getByText('Show Course')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/AdminCourseManagement.test.tsx`
Expected: FAIL because Courses tab is not yet present in `AdminPage`

- [ ] **Step 3: Update `src/app/admin/page.tsx`**

1. Update `MainTab` type:
```typescript
type MainTab = 'users' | 'courses' | 'audit'
type CourseVisibilityFilter = 'all' | 'visible' | 'hidden'
```

2. Add Course interface and state:
```typescript
interface CourseCatalogItem {
  course_id: number
  fullname: string
  shortname: string | null
  is_hidden: boolean
  updated_at?: string
}

// Inside AdminPage component:
const [courses, setCourses] = useState<CourseCatalogItem[]>([])
const [courseSearch, setCourseSearch] = useState('')
const [courseFilter, setCourseFilter] = useState<CourseVisibilityFilter>('all')
const [updatingCourseId, setUpdatingCourseId] = useState<number | null>(null)
```

3. Add `fetchCourses`:
```typescript
const fetchCourses = async () => {
  try {
    const res = await fetch('/api/courses/catalog')
    if (res.ok) {
      const data = await res.json()
      setCourses(data.courses || [])
    }
  } catch (err) {
    console.error('Error fetching course catalog:', err)
  }
}
```
Include `fetchCourses()` in `checkAccessAndLoad()`:
```typescript
await Promise.all([fetchProfiles(), fetchCourses(), fetchAuditLogs()])
```

4. Add toggle course visibility handler:
```typescript
const toggleCourseVisibility = async (course: CourseCatalogItem) => {
  const newStatus = !course.is_hidden
  setUpdatingCourseId(course.course_id)

  // Optimistic update
  setCourses(prev =>
    prev.map(c => (c.course_id === course.course_id ? { ...c, is_hidden: newStatus } : c))
  )

  try {
    const res = await fetch('/api/admin/courses/toggle-visibility', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseId: course.course_id,
        isHidden: newStatus,
      }),
    })

    if (!res.ok) {
      // Rollback
      setCourses(prev =>
        prev.map(c => (c.course_id === course.course_id ? { ...c, is_hidden: course.is_hidden } : c))
      )
    } else {
      recordClientAudit({
        action: 'admin.course_visibility',
        entityType: 'course',
        entityId: String(course.course_id),
        details: {
          courseName: course.fullname,
          previousStatus: course.is_hidden,
          newStatus,
        },
      })
    }
  } catch {
    // Rollback
    setCourses(prev =>
      prev.map(c => (c.course_id === course.course_id ? { ...c, is_hidden: course.is_hidden } : c))
    )
  } finally {
    setUpdatingCourseId(null)
  }
}
```

5. Add tab button to navigation tabs:
```tsx
<button
  role="tab"
  aria-selected={activeTab === 'courses'}
  onClick={() => setActiveTab('courses')}
  className={`flex items-center gap-2 pb-3 px-1 text-sm font-semibold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
    activeTab === 'courses'
      ? 'border-foreground text-foreground'
      : 'border-transparent text-secondary hover:text-foreground'
  }`}
>
  <span>Courses</span>
  <span
    className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
      activeTab === 'courses'
        ? 'bg-foreground text-background font-bold'
        : 'bg-muted text-secondary'
    }`}
  >
    {courses.length}
  </span>
</button>
```

6. Render Course Management Tab body with search, filter pills, and rows showing title, code, status pill (`Visible` / `Hidden`), and toggle button ("Hide Course" / "Show Course").

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/__tests__/AdminCourseManagement.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/page.tsx src/__tests__/AdminCourseManagement.test.tsx
git commit -m "feat(admin): add course visibility management tab to admin console"
```

---

### Task 5: Student Dashboard Partitioning and Urgency Filtering

**Files:**
- Modify: `src/app/dashboard/page.tsx`
- Test: `src/__tests__/DashboardTimelineCourses.test.tsx`

**Interfaces:**
- Consumes: `GET /api/courses/catalog`, `POST /api/courses/catalog`, `getCurrentCourses()`
- Produces:
  - Partitioned courses: Active courses in main grid, past/inactive courses in collapsible accordion.
  - Urgency and timeline filtering: assignments and events from hidden courses are excluded.

- [ ] **Step 1: Write test for dashboard course partitioning and urgency suppression**

```typescript
// Update src/__tests__/DashboardTimelineCourses.test.tsx to assert:
// 1. Courses with is_hidden === true are partitioned into inactive/past accordion
// 2. Deadlines belonging to hidden courses are filtered out of urgency cards and timeline
```

- [ ] **Step 2: Run test to verify existing behavior vs new requirement**

Run: `npx jest src/__tests__/DashboardTimelineCourses.test.tsx`

- [ ] **Step 3: Modify `src/app/dashboard/page.tsx`**

1. In `loadData()`:
```typescript
// Fetch catalog visibility
let hiddenCourseIds = new Set<number>()
try {
  const catRes = await fetch('/api/courses/catalog')
  if (catRes.ok) {
    const catData = await catRes.json()
    const hiddenList = (catData.courses || []).filter((c: any) => c.is_hidden).map((c: any) => Number(c.course_id))
    hiddenCourseIds = new Set(hiddenList)
  }
} catch (e) {
  console.warn('Could not fetch course visibility rules', e)
}

// Background auto-discovery push
fetch('/api/courses/catalog', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ courses: currentCourses }),
}).catch(() => {})
```

2. Filter deadlines & events belonging to hidden courses:
```typescript
const visibleEvents = filteredEvents.filter(e => !hiddenCourseIds.has(e.course?.id))
```

3. Split courses into active and past:
```typescript
const activeCourses = useMemo(() => {
  return courses.filter(c => !hiddenCourseIds.has(c.id))
}, [courses, hiddenCourseIds])

const inactiveCourses = useMemo(() => {
  return courses.filter(c => hiddenCourseIds.has(c.id))
}, [courses, hiddenCourseIds])
```

4. Render active courses in the main grid, and if `inactiveCourses.length > 0`, render a collapsible Accordion:
```tsx
{inactiveCourses.length > 0 && (
  <div className="mt-8 rounded-2xl border border-border/40 bg-card/60 overflow-hidden">
    <button
      type="button"
      onClick={() => setShowPastCourses(!showPastCourses)}
      className="w-full flex items-center justify-between p-4 px-6 text-left hover:bg-muted/30 transition-colors cursor-pointer"
    >
      <div className="flex items-center gap-2">
        <span className="font-semibold text-sm clash-title uppercase tracking-wide text-foreground">
          Past / Inactive Courses
        </span>
        <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-muted text-secondary">
          {inactiveCourses.length}
        </span>
      </div>
      <ChevronDown className={`h-4 w-4 text-secondary transition-transform duration-200 ${showPastCourses ? 'rotate-180' : ''}`} />
    </button>
    {showPastCourses && (
      <div className="p-6 pt-2 border-t border-border/20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {inactiveCourses.map(course => (
          <CourseCard key={course.id} course={course} isPast />
        ))}
      </div>
    )}
  </div>
)}
```

- [ ] **Step 4: Run tests to verify it passes**

Run: `npx jest src/__tests__/DashboardTimelineCourses.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/page.tsx src/__tests__/DashboardTimelineCourses.test.tsx
git commit -m "feat(dashboard): partition active vs past courses and filter inactive deadlines"
```

---

### Task 6: Full Verification and Build Validation

**Files:**
- Test: all test suites

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: All test suites pass.

- [ ] **Step 2: Run Next.js production build check**

Run: `npm run build`
Expected: Production build succeeds with 0 errors.

- [ ] **Step 3: Commit any final test adjustments**

```bash
git commit --allow-empty -m "chore: verify all test suites and build passing"
```
