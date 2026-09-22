### Task 5: Student Dashboard Partitioning and Urgency Filtering

**Files:**
- Modify: `src/app/dashboard/page.tsx`
- Test: `src/__tests__/DashboardTimelineCourses.test.tsx`

**Interfaces:**
- Consumes: `GET /api/courses/catalog`, `POST /api/courses/catalog`, `getCurrentCourses()`
- Produces:
  - Partitioned courses: Active courses in main grid, past/inactive courses in collapsible accordion.
  - Urgency and timeline filtering: assignments and events from hidden courses are excluded from active urgency alerts and timeline feed.

- [ ] **Step 1: Write test for dashboard course partitioning and urgency suppression**

Update `src/__tests__/DashboardTimelineCourses.test.tsx` to assert:
1. Courses with `is_hidden === true` are partitioned into an inactive/past collapsible section.
2. Deadlines belonging to hidden courses are filtered out of urgency cards and timeline.
3. Silent background push to `/api/courses/catalog` is invoked with enrolled courses.

- [ ] **Step 2: Run test to verify existing behavior vs new requirement**

Run: `npx jest src/__tests__/DashboardTimelineCourses.test.tsx`
Expected: FAIL until implemented

- [ ] **Step 3: Modify `src/app/dashboard/page.tsx`**

1. In `loadData()`:
```typescript
// Fetch catalog visibility
let hiddenCourseIds = new Set<number>()
try {
  const catRes = await fetch('/api/courses/catalog')
  if (catRes.ok) {
    const catData = await catRes.json()
    const hiddenList = (catData.courses || [])
      .filter((c: any) => c.is_hidden)
      .map((c: any) => Number(c.course_id))
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

2. Store `hiddenIds` in state:
```typescript
const [hiddenCourseIds, setHiddenCourseIds] = useState<Set<number>>(new Set())
const [showPastCourses, setShowPastCourses] = useState(false)
```

3. Filter deadlines & events belonging to hidden courses:
```typescript
// Exclude hidden course events from the active timeline
const visibleEvents = filteredEvents.filter(e => !hiddenCourseIds.has(e.course?.id))
setEvents(visibleEvents)
```

4. Split courses into active and past:
```typescript
const activeCourses = useMemo(() => {
  return courses.filter(c => !hiddenCourseIds.has(c.id))
}, [courses, hiddenCourseIds])

const inactiveCourses = useMemo(() => {
  return courses.filter(c => hiddenCourseIds.has(c.id))
}, [courses, hiddenCourseIds])
```

5. Render active courses in the main grid, and if `inactiveCourses.length > 0`, render a collapsible Accordion below it:
```tsx
{inactiveCourses.length > 0 && (
  <div className="mt-8 rounded-2xl border border-border/40 bg-card/60 overflow-hidden shadow-xs">
    <button
      type="button"
      onClick={() => setShowPastCourses(!showPastCourses)}
      aria-expanded={showPastCourses}
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
      <div className="p-6 pt-2 border-t border-border/20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in duration-200">
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
