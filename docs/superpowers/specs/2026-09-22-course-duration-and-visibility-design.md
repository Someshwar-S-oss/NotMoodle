# Design Document: All-Course Fetching and Admin Course Visibility

## 1. Problem Statement
The university updated semester course durations and end dates in Moodle, causing the previous date-based `in_progress` filter (`now >= startdate && (enddate == 0 || now <= enddate)`) to incorrectly exclude courses. 

To resolve this, NotMoodle must:
1. Fetch all enrolled courses (including past/completed ones) without arbitrary date filtering.
2. Provide an administrative interface in `/admin` where superusers can toggle visibility (`Visible` or `Hidden`) for each course.
3. On the student dashboard, automatically move hidden courses into a collapsible "Past / Inactive Courses" section and exclude their deadlines from the active urgency timeline.

---

## 2. Architecture & Data Flow

```
+-------------------------------------------------------------+
|                     Student Browser                         |
|  1. Fetches all enrolled courses from Moodle (no date cut)  |
|  2. Silently posts courses to /api/courses/catalog          |
|  3. Fetches visibility rules from course_visibility table    |
|  4. Partitions courses: Active Grid vs. Collapsed Past      |
|  5. Filters out hidden course deadlines from urgency alerts  |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                      Supabase DB                            |
|  Table: public.course_visibility                            |
|  - course_id BIGINT PRIMARY KEY                             |
|  - fullname TEXT, shortname TEXT                            |
|  - is_hidden BOOLEAN NOT NULL DEFAULT FALSE                 |
|  - updated_at TIMESTAMP, updated_by UUID                    |
+------------------------------^------------------------------+
                               |
+------------------------------+------------------------------+
|                     Admin Console (/admin)                  |
|  - New "Course Management" tab with search & status filters |
|  - View consolidated discovered course catalog              |
|  - Toggle visibility (Show / Hide) with optimistic UI       |
|  - Telemetry audit logging (admin.course_visibility_toggle) |
+-------------------------------------------------------------+
```

---

## 3. Database Schema

Migration file: `supabase/migrations/20260922_course_visibility.sql`

```sql
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

-- Allow all authenticated users to read visibility status
CREATE POLICY "Allow authenticated users to read course visibility"
    ON public.course_visibility FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users to insert/upsert course metadata (preserving is_hidden)
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

---

## 4. API Endpoints & Moodle Client Changes

### 4.1 Moodle Client (`src/lib/moodle-client.ts`)
- In `getCurrentCourses(token: string, userid: number)`:
  - Remove the `startdate` / `enddate` filter logic:
    ```typescript
    // Removed:
    // const started = c.startdate === 0 || nowSec >= c.startdate
    // const notEnded = c.enddate === 0 || nowSec <= c.enddate
    // return started && notEnded
    ```
  - Map and return all courses returned by `core_enrol_get_users_courses`.

### 4.2 Server Route (`src/app/api/moodle/courses/route.ts`)
- Remove the date-based filtering block on `allCourses`, returning all enrolled courses with total count.

### 4.3 Catalog Sync Endpoint (`src/app/api/courses/catalog/route.ts`)
- **POST**:
  - Requires authenticated session.
  - Accepts payload: `{ courses: Array<{ id: number, fullname: string, shortname: string }> }`.
  - Upserts entries into `course_visibility`. If a course already exists, only `fullname`, `shortname`, and `updated_at` are refreshed; existing `is_hidden` values are untouched.
- **GET**:
  - Requires authenticated session.
  - Returns `{ courses: CourseVisibilityRecord[] }` ordered by `fullname ASC`.

### 4.4 Admin Toggle Endpoint (`src/app/api/admin/courses/toggle-visibility/route.ts`)
- Requires superuser authorization.
- Accepts `{ courseId: number, isHidden: boolean }`.
- Updates `course_visibility` row with `is_hidden = isHidden`, `updated_at = NOW()`, `updated_by = user.id`.
- Records an audit log entry via `recordAuditLog`:
  - `action: 'admin.course_visibility'`
  - `entity_type: 'course'`
  - `entity_id: String(courseId)`
  - `details: { courseId, isHidden }`

---

## 5. Admin Console Experience (`src/app/admin/page.tsx`)

1. **New Tab: Courses**:
   - Tab header: `Courses [count]` alongside `User Management` and `Audit Logs`.
2. **Metrics Bar**:
   - `Total Courses`: Count of all discovered courses.
   - `Visible`: Count of active visible courses.
   - `Hidden`: Count of archived/hidden courses.
3. **Search & Filter Controls**:
   - Search input for matching course title, shortname, or ID.
   - Status filter pills: `All`, `Visible`, `Hidden`.
4. **Course Item Card**:
   - Course code badge, ID, and full title.
   - Status indicator (`Visible` in emerald, `Hidden` in amber/rose).
   - Instant toggle action button:
     - "Hide Course" (EyeOff icon) when currently visible.
     - "Show Course" (Eye icon) when currently hidden.
   - Optimistic UI updates with rollback on network failure.

---

## 6. Student Dashboard Experience (`src/app/dashboard/page.tsx`)

1. **Course Partitioning**:
   - Fetch all courses from Moodle client.
   - Silently trigger `/api/courses/catalog` POST to auto-discover any new courses.
   - Fetch visibility rules from `course_visibility`.
   - Partition courses into `activeCourses` and `inactiveCourses`:
     - `activeCourses`: `courses.filter(c => !hiddenIds.has(c.id))`
     - `inactiveCourses`: `courses.filter(c => hiddenIds.has(c.id))`
2. **Main Course Grid**:
   - Renders `activeCourses` with deadline badge indicators.
3. **Past / Inactive Accordion**:
   - Renders below the active grid when `inactiveCourses.length > 0`.
   - Accordion title: `"Past / Inactive Courses ({count})"`.
   - Collapsed by default, expandable with one click.
   - Expanding shows the same interactive course cards.
4. **Timeline & Urgency Deadlines**:
   - Timeline events and urgency summary cards (Overdue, Today, Upcoming) filter out events where `hiddenIds.has(event.course.id)`.
   - Eliminates false alerts and stale assignments from previous semesters.

---

## 7. Verification & Testing

1. **Unit & Integration Tests**:
   - `src/__tests__/CourseVisibility.test.ts`: Verify catalog upsert preserves existing `is_hidden` state and date filter removal returns all courses.
   - `src/__tests__/AdminCourseManagement.test.tsx`: Verify tab switching, search filtering, and toggle interaction with optimistic UI and audit logging.
   - `src/__tests__/DashboardTimelineCourses.test.tsx`: Verify course partitioning (active vs. past accordion) and timeline deadline exclusion for hidden courses.
2. **End-to-End Build & Lint Check**:
   - Execute `npm test` and `npm run build` to ensure type-safety and regression-free integration.
