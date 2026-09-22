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
