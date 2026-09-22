### Task 4: Admin Console Course Management Tab

**Files:**
- Modify: `src/app/admin/page.tsx`
- Test: `src/__tests__/AdminCourseManagement.test.tsx`

**Interfaces:**
- Consumes: `GET /api/courses/catalog`, `POST /api/admin/courses/toggle-visibility`
- Produces: `Courses` tab in `/admin` with search, status filters (All, Visible, Hidden), metric cards, and visibility toggle action with optimistic UI.

- [x] **Step 1: Write UI test for Admin Courses tab**

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

- [x] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/AdminCourseManagement.test.tsx`
Expected: FAIL because Courses tab is not yet present in `AdminPage`

- [x] **Step 3: Update `src/app/admin/page.tsx`**

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

- [x] **Step 4: Run test to verify it passes**

Run: `npx jest src/__tests__/AdminCourseManagement.test.tsx`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add src/app/admin/page.tsx src/__tests__/AdminCourseManagement.test.tsx
git commit -m "feat(admin): add course visibility management tab to admin console"
```
