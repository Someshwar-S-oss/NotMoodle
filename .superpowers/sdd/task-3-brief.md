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
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({ data: [] }),
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
